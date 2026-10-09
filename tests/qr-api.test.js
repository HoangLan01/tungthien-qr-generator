import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canCopyQrImage,
  copyQrImage,
  createQrFilename,
  requestQr,
} from '../public/qr-api.js';

test('formats stable, privacy-preserving download filenames', () => {
  const now = new Date('2026-10-07T12:00:00Z');
  assert.equal(createQrFilename(now), 'tung-thien-qr-20261007.png');
  assert.equal(createQrFilename(now, 'svg'), 'tung-thien-qr-20261007.svg');
});

test('generates PNG locally without making an API request', async () => {
  let capturedOptions;
  let capturedBlob;
  const encoder = {
    async toDataURL(url, options) {
      assert.equal(url, 'https://example.com/path?a=1&b=2');
      capturedOptions = options;
      return 'data:image/png;base64,iVBORw0KGgo=';
    },
  };

  const result = await requestQr('https://example.com/path?a=1&b=2', {
    encoder,
    createObjectURL(blob) {
      capturedBlob = blob;
      return 'blob:test-qr';
    },
    now: () => new Date('2026-10-07T12:00:00Z'),
  });

  assert.deepEqual(capturedOptions, {
    errorCorrectionLevel: 'M',
    margin: 4,
    width: 1000,
    color: { dark: '#000000', light: '#FFFFFF' },
    type: 'image/png',
  });
  assert.equal(capturedBlob.type, 'image/png');
  assert.deepEqual(
    new Uint8Array(await capturedBlob.arrayBuffer()),
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  assert.deepEqual(result, {
    imageUrl: 'blob:test-qr',
    filename: 'tung-thien-qr-20261007.png',
    contentType: 'image/png',
    format: 'png',
    revokeOnDispose: true,
  });
});

test('generates SVG locally with the selected size and colors', async () => {
  let capturedOptions;
  let capturedBlob;
  const result = await requestQr('https://example.com', {
    encoder: {
      async toString(_url, options) {
        capturedOptions = options;
        return '<svg xmlns="http://www.w3.org/2000/svg"/>';
      },
    },
    createObjectURL(blob) {
      capturedBlob = blob;
      return 'blob:test-svg';
    },
    format: 'svg',
    size: 2000,
    bodyColor: '#0B3D91',
    bgColor: '#FFFFFF',
    now: () => new Date('2026-10-07T12:00:00Z'),
  });

  assert.equal(capturedOptions.type, 'svg');
  assert.equal(capturedOptions.width, 2000);
  assert.deepEqual(capturedOptions.color, { dark: '#0B3D91', light: '#FFFFFF' });
  assert.equal(capturedBlob.type, 'image/svg+xml');
  assert.match(await capturedBlob.text(), /<svg/);
  assert.equal(result.filename, 'tung-thien-qr-20261007.svg');
  assert.equal(result.contentType, 'image/svg+xml');
});

test('the bundled QR engine produces a real PNG without a backend', async () => {
  let capturedBlob;
  const result = await requestQr('https://example.com', {
    size: 500,
    createObjectURL(blob) {
      capturedBlob = blob;
      return 'blob:real-qr';
    },
  });
  const signature = new Uint8Array(await capturedBlob.arrayBuffer()).slice(0, 8);
  assert.deepEqual(signature, new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(result.imageUrl, 'blob:real-qr');
});

test('copies PNG only when the secure Clipboard API is available', async () => {
  const copied = [];
  assert.equal(canCopyQrImage({
    isSecureContext: true,
    clipboard: { write: () => {} },
    ClipboardItemConstructor: class {},
  }), true);
  assert.equal(canCopyQrImage({
    isSecureContext: false,
    clipboard: { write: () => {} },
    ClipboardItemConstructor: class {},
  }), false);

  class ClipboardItemMock {
    constructor(data) { this.data = data; }
  }
  await copyQrImage({ imageUrl: 'blob:test', contentType: 'image/png' }, {
    fetchImpl: async () => new Response(new Uint8Array([1]), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }),
    clipboard: { write: async (items) => copied.push(items) },
    ClipboardItemConstructor: ClipboardItemMock,
  });
  assert.equal(copied.length, 1);
  assert.ok(copied[0][0].data['image/png']);
  await assert.rejects(
    copyQrImage({ imageUrl: 'blob:test', contentType: 'image/svg+xml' }),
    { code: 'COPY_UNAVAILABLE' },
  );
});

test('maps local encoder failures without exposing internal details', async () => {
  await assert.rejects(
    requestQr('https://example.com', {
      encoder: { toDataURL: async () => { throw new Error('private encoder diagnostic'); } },
      createObjectURL: () => 'blob:unused',
    }),
    (error) => error.code === 'QR_GENERATION_ERROR'
      && !error.message.includes('private encoder diagnostic'),
  );
  await assert.rejects(
    requestQr('https://example.com', { createObjectURL: null }),
    { code: 'INTERNAL_ERROR' },
  );
});
