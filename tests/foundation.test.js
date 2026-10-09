import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import express from 'express';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  readCorsAllowedOrigins,
  readPort,
  readQrDefaultSize,
  readQrAccessLog,
  readRateLimitConfig,
  readServeStatic,
  readTrustProxy,
} from '../src/config.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

test('serves Vietnamese page and frontend assets with security headers', async () => {
  const app = createApp();
  const response = await request(app).get('/').expect(200).expect('Content-Type', /html/);
  assert.match(response.text, /Tùng Thiện QR Generator/);
  assert.match(response.text, /Tạo mã QR miễn phí, nhanh chóng, không quảng cáo\./);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-powered-by'], undefined);
  const csp = response.headers['content-security-policy'];
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /connect-src 'self'/);
  assert.match(csp, /img-src 'self' blob:/);
  assert.doesNotMatch(csp, /https:/);
  assert.equal(response.headers['referrer-policy'], 'no-referrer');
  await request(app).get('/styles.css').expect(200).expect('Content-Type', /css/);
  await request(app).get('/app.js').expect(200).expect('Content-Type', /javascript/);
  await request(app).get('/qr-api.js').expect(200).expect('Content-Type', /javascript/);
  await request(app).get('/qr-form.js').expect(200).expect('Content-Type', /javascript/);
  await request(app).get('/manifest.webmanifest').expect(200).expect('Content-Type', /json/);
  await request(app).get('/sw.js').expect(200).expect('Content-Type', /javascript/);
  await request(app).get('/assets/logo.png').expect(200).expect('Content-Type', /png/);
});

test('PWA metadata is valid and its service worker does not cache QR or API data', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  const worker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.match(manifest.icons[0].src, /assets\/logo\.png/);
  assert.doesNotMatch(worker, /caches\.|respondWith|\/api\/qr/);
});

test('health works without provider configuration', async () => {
  await request(createApp()).get('/health').expect(200, { status: 'ok' });
});

test('local QR generation works without provider configuration and returns no-store', async () => {
  const response = await request(createApp()).post('/api/qr')
    .send({ url: 'https://example.com' }).expect(200).expect('Cache-Control', 'no-store');
  assert.match(response.headers['content-type'], /image\/png/);
  assert.deepEqual(response.body.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
});

test('unknown routes and private project files are not exposed', async () => {
  const app = createApp();
  for (const path of ['/missing', '/.env', '/.env.example', '/package.json', '/src/server.js']) {
    const response = await request(app).get(path).expect(404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  }
});

test('malformed JSON does not leak input or parser details', async () => {
  const response = await request(createApp()).post('/api/qr')
    .set('Content-Type', 'application/json').send('{"private-value":')
    .expect(400).expect('Cache-Control', 'no-store');
  assert.equal(response.body.error.code, 'INVALID_JSON');
  assert.doesNotMatch(response.text, /private-value|SyntaxError|stack/);
});

test('JSON larger than 16kb is rejected', async () => {
  const response = await request(createApp()).post('/api/qr')
    .send({ url: 'x'.repeat(17 * 1024) }).expect(413);
  assert.equal(response.body.error.code, 'INPUT_TOO_LONG');
});

test('unexpected errors return a generic response', async () => {
  const app = express();
  app.get('/failure', () => { throw new Error('secret-provider-key'); });
  app.use(errorHandler);
  const response = await request(app).get('/failure').expect(500);
  assert.equal(response.body.error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(response.text, /secret-provider-key|stack/);
});

test('HTTPS headers apply in production while local HTTP stays usable', async () => {
  const local = await request(createApp({ isProduction: false })).get('/');
  const production = await request(createApp({ isProduction: true })).get('/');
  assert.doesNotMatch(local.headers['content-security-policy'], /upgrade-insecure-requests/);
  assert.equal(local.headers['strict-transport-security'], undefined);
  assert.match(production.headers['content-security-policy'], /upgrade-insecure-requests/);
  assert.ok(production.headers['strict-transport-security']);
});

test('PORT uses a default and rejects invalid values without echoing them', () => {
  assert.equal(readPort(''), 3000);
  assert.equal(readPort('3100'), 3100);
  for (const value of ['0', '65536', '-1', '3.5', 'secret-value']) {
    assert.throws(() => readPort(value), { message: 'PORT must be an integer from 1 to 65535.' });
  }
  assert.equal(readQrDefaultSize(''), 1000);
  assert.equal(readQrDefaultSize('2000'), 2000);
  assert.throws(() => readQrDefaultSize('750'), { message: 'Invalid default QR size configuration.' });
});

test('rate limit uses a safe default and rejects invalid environment configuration', () => {
  assert.deepEqual(readRateLimitConfig({}), { windowMs: 60_000, max: 20 });
  assert.deepEqual(readRateLimitConfig({ RATE_LIMIT_WINDOW_MS: '120000', RATE_LIMIT_MAX: '25' }), {
    windowMs: 120_000,
    max: 25,
  });
  for (const env of [
    { RATE_LIMIT_WINDOW_MS: '999' },
    { RATE_LIMIT_MAX: '0' },
    { RATE_LIMIT_MAX: 'twenty' },
  ]) {
    assert.throws(() => readRateLimitConfig(env), { message: 'Invalid rate limit configuration.' });
  }
  assert.equal(createApp().get('trust proxy'), false);
});

test('deployment configuration accepts exact CORS origins and safe VPS-only options', () => {
  assert.deepEqual([...readCorsAllowedOrigins({
    CORS_ALLOWED_ORIGINS: 'https://qr.example.vn, https://qr-generator.vercel.app/',
  })], ['https://qr.example.vn', 'https://qr-generator.vercel.app']);
  assert.deepEqual([...readCorsAllowedOrigins({})], []);
  for (const env of [
    { CORS_ALLOWED_ORIGINS: '*' },
    { CORS_ALLOWED_ORIGINS: 'https://qr.example.vn/path' },
    { CORS_ALLOWED_ORIGINS: 'https://qr.example.vn,https://qr.example.vn/' },
  ]) {
    assert.throws(() => readCorsAllowedOrigins(env), { message: 'Invalid CORS configuration.' });
  }
  assert.equal(readServeStatic(''), true);
  assert.equal(readServeStatic('false'), false);
  assert.throws(() => readServeStatic('0'), { message: 'Invalid static serving configuration.' });
  assert.equal(readTrustProxy(''), false);
  assert.equal(readTrustProxy('loopback'), 'loopback');
  assert.throws(() => readTrustProxy('true'), { message: 'Invalid trusted proxy configuration.' });
  assert.equal(readQrAccessLog(''), false);
  assert.equal(readQrAccessLog('true'), true);
  assert.throws(() => readQrAccessLog('1'), { message: 'Invalid QR access log configuration.' });
});
