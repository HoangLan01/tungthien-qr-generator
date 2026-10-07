import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createQrCodeMonkeyService,
  getQrProviderConfig,
  QrServiceError,
} from '../src/services/qrCodeMonkey.service.js';

const providerConfig = {
  apiKey: 'test-key-not-for-production',
  apiHost: 'custom-qr-code-with-logo.p.rapidapi.com',
  endpoint: 'https://custom-qr-code-with-logo.p.rapidapi.com/qr/custom',
  size: 1000,
  timeoutMs: 1000,
};

function withConfig(overrides = {}) {
  return () => ({ ...providerConfig, ...overrides });
}

test('reads valid provider configuration without hard-coding a RapidAPI endpoint', () => {
  const config = getQrProviderConfig({
    RAPIDAPI_KEY: ' key ',
    QRCODE_MONKEY_API_HOST: ' provider.example ',
    QRCODE_MONKEY_API_BASE: 'https://provider.example/api',
    QR_DEFAULT_SIZE: '1500',
    QR_REQUEST_TIMEOUT_MS: '12000',
  });

  assert.deepEqual(config, {
    apiKey: 'key',
    apiHost: 'provider.example',
    endpoint: 'https://provider.example/api/qr/custom',
    size: 1500,
    timeoutMs: 12000,
  });
  assert.equal(getQrProviderConfig({ RAPIDAPI_KEY: 'key' }), null);
  assert.equal(getQrProviderConfig({
    RAPIDAPI_KEY: 'key',
    QRCODE_MONKEY_API_HOST: 'provider.example\r\nother',
    QRCODE_MONKEY_API_BASE: 'https://provider.example',
  }), null);
  assert.equal(getQrProviderConfig({
    RAPIDAPI_KEY: 'key',
    QRCODE_MONKEY_API_HOST: 'provider.example',
    QRCODE_MONKEY_API_BASE: 'http://provider.example',
  }), null);
});

test('sends the documented custom QR POST payload and returns PNG binary', async () => {
  let captured;
  const service = createQrCodeMonkeyService({
    getConfig: withConfig(),
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
    },
  });

  const result = await service.generate({ url: 'https://example.com', format: 'png' });
  assert.equal(captured.url, providerConfig.endpoint);
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.headers['X-RapidAPI-Key'], providerConfig.apiKey);
  assert.equal(captured.options.headers['X-RapidAPI-Host'], providerConfig.apiHost);
  assert.equal(captured.options.headers.Accept, 'image/png');
  assert.deepEqual(JSON.parse(captured.options.body), {
    data: 'https://example.com',
    config: { body: 'square', bodyColor: '#000000', bgColor: '#FFFFFF' },
    size: 1000,
    download: false,
    file: 'png',
  });
  assert.equal(result.contentType, 'image/png');
  assert.deepEqual(result.body, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
});

test('passes V1.1 format, size, and validated colors through to the provider payload', async () => {
  let captured;
  const service = createQrCodeMonkeyService({
    getConfig: withConfig(),
    fetchImpl: async (_url, options) => {
      captured = options;
      return new Response('<svg/>', { status: 200, headers: { 'content-type': 'image/svg+xml' } });
    },
  });

  const result = await service.generate({
    url: 'https://example.com',
    format: 'svg',
    size: 2000,
    bodyColor: '#0B3D91',
    bgColor: '#FFFFFF',
  });
  assert.equal(result.contentType, 'image/svg+xml');
  assert.deepEqual(JSON.parse(captured.body), {
    data: 'https://example.com',
    config: { body: 'square', bodyColor: '#0B3D91', bgColor: '#FFFFFF' },
    size: 2000,
    download: false,
    file: 'svg',
  });
});

test('accepts only the expected image content type for each format', async () => {
  const service = createQrCodeMonkeyService({
    getConfig: withConfig(),
    fetchImpl: async (_url, options) => new Response('<svg/>', {
      status: 200,
      headers: { 'content-type': options.headers.Accept === 'image/svg+xml' ? 'image/svg+xml; charset=utf-8' : 'text/html' },
    }),
  });

  const svg = await service.generate({ url: 'https://example.com', format: 'svg' });
  assert.equal(svg.contentType, 'image/svg+xml');
  await assert.rejects(
    service.generate({ url: 'https://example.com', format: 'png' }),
    (error) => error instanceof QrServiceError && error.code === 'QR_PROVIDER_ERROR' && error.status === 502,
  );
});

test('does not call upstream when configuration is absent or format is unsupported', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return new Response(); };
  const missingConfig = createQrCodeMonkeyService({ fetchImpl, getConfig: () => null });
  await assert.rejects(
    missingConfig.generate({ url: 'https://example.com' }),
    (error) => error.code === 'QR_SERVICE_UNAVAILABLE' && error.status === 503,
  );
  const unsupportedFormat = createQrCodeMonkeyService({ fetchImpl, getConfig: withConfig() });
  await assert.rejects(
    unsupportedFormat.generate({ url: 'https://example.com', format: 'pdf' }),
    (error) => error.code === 'INVALID_FORMAT' && error.status === 400,
  );
  assert.equal(calls, 0);
});

test('maps upstream status, network errors, and timeout without raw detail', async () => {
  for (const [upstreamStatus, code, status] of [
    [400, 'QR_PROVIDER_ERROR', 502],
    [500, 'QR_PROVIDER_ERROR', 502],
    [401, 'QR_SERVICE_UNAVAILABLE', 503],
    [403, 'QR_SERVICE_UNAVAILABLE', 503],
    [429, 'QR_SERVICE_UNAVAILABLE', 503],
  ]) {
    const service = createQrCodeMonkeyService({
      getConfig: withConfig(),
      fetchImpl: async () => new Response('provider-private-detail', { status: upstreamStatus }),
    });
    await assert.rejects(service.generate({ url: 'https://example.com' }),
      (error) => error instanceof QrServiceError && error.code === code && error.status === status);
  }

  const network = createQrCodeMonkeyService({
    getConfig: withConfig(),
    fetchImpl: async () => { throw new Error('provider-private-detail'); },
  });
  await assert.rejects(network.generate({ url: 'https://example.com' }),
    (error) => error.code === 'QR_SERVICE_UNAVAILABLE' && error.status === 503);

  const timeout = createQrCodeMonkeyService({
    getConfig: withConfig({ timeoutMs: 1 }),
    fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }),
  });
  await assert.rejects(timeout.generate({ url: 'https://example.com' }),
    (error) => error.code === 'QR_PROVIDER_TIMEOUT' && error.status === 504);
});
