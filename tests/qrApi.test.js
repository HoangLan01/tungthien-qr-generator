import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getQrApiEndpoint } from '../public/qr-api.js';
import { QrGenerationError } from '../src/services/localQr.service.js';

function createService({ result, error } = {}) {
  const calls = [];
  return {
    calls,
    service: {
      async generate(payload) {
        calls.push(payload);
        if (error) throw error;
        return result ?? { body: Buffer.from([0x89, 0x50, 0x4e, 0x47]), contentType: 'image/png' };
      },
    },
  };
}

test('POST /api/qr defaults to PNG and returns binary with no-store', async () => {
  const { service, calls } = createService();
  const response = await request(createApp({ qrService: service }))
    .post('/api/qr')
    .send({ url: '  https://example.com/path?a=1&b=2  ' })
    .expect(200)
    .expect('Content-Type', /image\/png/)
    .expect('Cache-Control', 'no-store');

  assert.deepEqual(calls, [{
    url: 'https://example.com/path?a=1&b=2',
    format: 'png',
    size: undefined,
    bodyColor: '#000000',
    bgColor: '#FFFFFF',
  }]);
  assert.deepEqual(response.body, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
});

test('POST /api/qr supports SVG when the provider returns SVG', async () => {
  const { service, calls } = createService({
    result: { body: Buffer.from('<svg/>'), contentType: 'image/svg+xml' },
  });
  const response = await request(createApp({ qrService: service }))
    .post('/api/qr')
    .send({ url: 'https://example.com', format: 'svg' })
    .expect(200)
    .expect('Content-Type', /image\/svg\+xml/)
    .expect('Cache-Control', 'no-store');

  assert.deepEqual(calls, [{
    url: 'https://example.com',
    format: 'svg',
    size: undefined,
    bodyColor: '#000000',
    bgColor: '#FFFFFF',
  }]);
  assert.match(response.body.toString(), /<svg\/>/);
});

test('invalid URL and format do not call the provider', async () => {
  const { service, calls } = createService();
  const app = createApp({ qrService: service });

  for (const [payload, status, code] of [
    [{ url: 'javascript:alert(1)' }, 400, 'INVALID_URL'],
    [{ url: 'file:///tmp/a' }, 400, 'INVALID_URL'],
    [{ url: 'https://example.com', format: 'pdf' }, 400, 'INVALID_FORMAT'],
    [{ url: 'https://example.com', size: 750 }, 400, 'INVALID_SIZE'],
    [{ url: 'https://example.com', bodyColor: '#808080', bgColor: '#ffffff' }, 400, 'LOW_COLOR_CONTRAST'],
    [{ url: `https://example.com/${'a'.repeat(4096)}` }, 413, 'INPUT_TOO_LONG'],
  ]) {
    const response = await request(app).post('/api/qr').send(payload).expect(status);
    assert.equal(response.body.error.code, code);
  }
  assert.deepEqual(calls, []);
});

test('only accepts a JSON request body', async () => {
  const { service, calls } = createService();
  const response = await request(createApp({ qrService: service }))
    .post('/api/qr')
    .set('Content-Type', 'text/plain')
    .send('{"url":"https://example.com"}')
    .expect(415)
    .expect('Cache-Control', 'no-store');

  assert.equal(response.body.error.code, 'UNSUPPORTED_MEDIA_TYPE');
  assert.deepEqual(calls, []);
});

test('maps local generation failures without leaking internal details', async () => {
  const cases = [
    [new QrGenerationError('QR_GENERATION_ERROR', 500), 500, 'QR_GENERATION_ERROR'],
  ];

  for (const [error, status, code] of cases) {
    error.message = 'internal QR detail';
    const { service } = createService({ error });
    const response = await request(createApp({ qrService: service }))
      .post('/api/qr')
      .send({ url: 'https://example.com' })
      .expect(status)
      .expect('Cache-Control', 'no-store');
    assert.equal(response.body.error.code, code);
    assert.doesNotMatch(response.text, /internal QR detail/);
  }
});

test('limits only QR creation requests and does not reflect URL data at 429', async () => {
  const { service, calls } = createService();
  const app = createApp({
    qrService: service,
    rateLimitConfig: { windowMs: 60_000, max: 2 },
  });
  const payload = { url: 'https://example.com/private-value-do-not-reflect' };

  await request(app).post('/api/qr').send(payload).expect(200);
  await request(app).post('/api/qr').send(payload).expect(200);
  const limited = await request(app).post('/api/qr').send(payload)
    .expect(429)
    .expect('Cache-Control', 'no-store');

  assert.equal(limited.body.error.code, 'RATE_LIMITED');
  assert.match(limited.headers.ratelimit, /"qr-generation"/);
  assert.doesNotMatch(limited.text, /private-value-do-not-reflect/);
  assert.equal(calls.length, 2);
  await request(app).get('/health').expect(200, { status: 'ok' });
});

test('VPS backend-only mode allows only the configured Vercel origin', async () => {
  const { service, calls } = createService();
  const allowedOrigin = 'https://qr-generator.vercel.app';
  const app = createApp({
    qrService: service,
    serveStatic: false,
    corsAllowedOrigins: new Set([allowedOrigin]),
    trustProxy: 'loopback',
  });

  await request(app).get('/').expect(404);
  await request(app).get('/health').expect(200, { status: 'ok' });
  const preflight = await request(app).options('/api/qr')
    .set('Origin', allowedOrigin)
    .set('Access-Control-Request-Method', 'POST')
    .expect(204)
    .expect('Access-Control-Allow-Origin', allowedOrigin);
  assert.equal(preflight.headers['access-control-allow-methods'], 'POST');
  assert.equal(preflight.headers['access-control-allow-headers'], 'Content-Type');

  await request(app).post('/api/qr')
    .set('Origin', allowedOrigin)
    .send({ url: 'https://example.com' })
    .expect(200)
    .expect('Access-Control-Allow-Origin', allowedOrigin);
  const rejected = await request(app).post('/api/qr')
    .set('Origin', 'https://untrusted.example')
    .send({ url: 'https://example.com/private-url' })
    .expect(403)
    .expect('Cache-Control', 'no-store');
  assert.equal(rejected.body.error.code, 'CORS_FORBIDDEN');
  assert.doesNotMatch(rejected.text, /private-url/);
  assert.equal(calls.length, 1);
  assert.equal(app.get('trust proxy'), 'loopback');
});

test('uses a configured HTTPS VPS origin for browser QR requests', () => {
  assert.equal(getQrApiEndpoint(), '/api/qr');
  assert.equal(getQrApiEndpoint('https://api.example.vn'), 'https://api.example.vn/api/qr');
  assert.equal(getQrApiEndpoint('https://api.example.vn/'), 'https://api.example.vn/api/qr');
  for (const value of ['http://api.example.vn', 'https://api.example.vn/path', 'https://user@api.example.vn', 'not-a-url']) {
    assert.throws(() => getQrApiEndpoint(value), { code: 'INTERNAL_ERROR' });
  }
});
