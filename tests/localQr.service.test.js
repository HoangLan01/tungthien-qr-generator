import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLocalQrService, QrGenerationError } from '../src/services/localQr.service.js';

test('generates a locally encoded PNG without a network client or provider key', async () => {
  const service = createLocalQrService();
  const result = await service.generate({
    url: 'https://example.com/path?a=1&b=2',
    format: 'png',
    size: 1000,
    bodyColor: '#000000',
    bgColor: '#FFFFFF',
  });
  assert.equal(result.contentType, 'image/png');
  assert.deepEqual(result.body.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.ok(result.body.length > 100);
});

test('generates SVG with size and color options locally', async () => {
  const service = createLocalQrService();
  const result = await service.generate({
    url: 'https://example.com',
    format: 'svg',
    size: 2000,
    bodyColor: '#0B3D91',
    bgColor: '#FFFFFF',
  });
  assert.equal(result.contentType, 'image/svg+xml');
  assert.match(result.body.toString(), /<svg/);
  assert.match(result.body.toString(), /#0B3D91/i);
});

test('does not expose generator failures or accept unsupported formats', async () => {
  const invalid = createLocalQrService();
  await assert.rejects(invalid.generate({ url: 'https://example.com', format: 'pdf' }),
    (error) => error instanceof QrGenerationError && error.code === 'INVALID_FORMAT' && error.status === 400);

  const broken = createLocalQrService({
    generator: { toBuffer: async () => { throw new Error('internal-generator-detail'); } },
  });
  await assert.rejects(broken.generate({ url: 'https://example.com' }),
    (error) => error instanceof QrGenerationError && error.code === 'QR_GENERATION_ERROR' && error.status === 500
      && !error.message.includes('internal-generator-detail'));
});
