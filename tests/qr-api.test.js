import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canCopyQrImage,
  copyQrImage,
  createQrFilename,
  requestQr,
} from '../public/qr-api.js';

test('formats a stable, privacy-preserving PNG filename', () => {
  assert.equal(createQrFilename(new Date('2026-10-07T12:00:00Z')), 'tung-thien-qr-20261007.png');
  assert.equal(createQrFilename(new Date('2026-10-07T12:00:00Z'), 'svg'), 'tung-thien-qr-20261007.svg');
});

test('posts only the same-origin PNG request and creates a Blob URL', async () => {
  let captured;
  let capturedBlob;
  const result = await requestQr('https://example.com/path?a=1&b=2', {
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
    },
    createObjectURL: (blob) => {
      capturedBlob = blob;
      return 'blob:test-qr';
    },
    now: () => new Date('2026-10-07T12:00:00Z'),
  });

  assert.equal(captured.url, '/api/qr');
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.credentials, 'same-origin');
  assert.equal(captured.options.cache, 'no-store');
  assert.deepEqual(captured.options.headers, {
    Accept: 'image/png',
    'Content-Type': 'application/json',
  });
  assert.deepEqual(JSON.parse(captured.options.body), {
    url: 'https://example.com/path?a=1&b=2',
    format: 'png',
    size: 1000,
    bodyColor: '#000000',
    bgColor: '#FFFFFF',
  });
  assert.equal(capturedBlob.type, 'image/png');
  assert.equal(result.imageUrl, 'blob:test-qr');
  assert.equal(result.filename, 'tung-thien-qr-20261007.png');
  assert.equal(result.revokeOnDispose, true);
});

test('requests an SVG at a selected size and preserves its download format', async () => {
  let captured;
  const result = await requestQr('https://example.com', {
    fetchImpl: async (_url, options) => {
      captured = options;
      return new Response('<svg/>', { status: 200, headers: { 'content-type': 'image/svg+xml' } });
    },
    createObjectURL: () => 'blob:test-svg',
    format: 'svg',
    size: 2000,
    bodyColor: '#0B3D91',
    bgColor: '#FFFFFF',
    now: () => new Date('2026-10-07T12:00:00Z'),
  });
  assert.equal(captured.headers.Accept, 'image/svg+xml');
  assert.deepEqual(JSON.parse(captured.body), {
    url: 'https://example.com', format: 'svg', size: 2000, bodyColor: '#0B3D91', bgColor: '#FFFFFF',
  });
  assert.equal(result.filename, 'tung-thien-qr-20261007.svg');
  assert.equal(result.contentType, 'image/svg+xml');
});

test('copies PNG only when the secure Clipboard API is available', async () => {
  const copied = [];
  assert.equal(canCopyQrImage({
    isSecureContext: true,
    clipboard: { write: () => {} },
    ClipboardItemConstructor: class {},
  }), true);
  assert.equal(canCopyQrImage({ isSecureContext: false, clipboard: { write: () => {} }, ClipboardItemConstructor: class {} }), false);
  class ClipboardItemMock {
    constructor(data) { this.data = data; }
  }
  await copyQrImage({ imageUrl: 'blob:test', contentType: 'image/png' }, {
    fetchImpl: async () => new Response(new Uint8Array([1]), { status: 200, headers: { 'content-type': 'image/png' } }),
    clipboard: { write: async (items) => copied.push(items) },
    ClipboardItemConstructor: ClipboardItemMock,
  });
  assert.equal(copied.length, 1);
  assert.ok(copied[0][0].data['image/png']);
  await assert.rejects(copyQrImage({ imageUrl: 'blob:test', contentType: 'image/svg+xml' }), { code: 'COPY_UNAVAILABLE' });
});

test('maps API error codes without exposing their raw messages', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    error: { code: 'QR_GENERATION_ERROR', message: 'private generator diagnostic' },
  }), {
    status: 500,
    headers: { 'content-type': 'application/json' },
  });

  await assert.rejects(
    requestQr('https://example.com', { fetchImpl, createObjectURL: () => 'blob:unused' }),
    (error) => error.code === 'QR_GENERATION_ERROR' && !error.message.includes('private generator diagnostic'),
  );
});

test('rejects unexpected image types and network/object-URL failures', async () => {
  const jpegResponse = async () => new Response(new Uint8Array([1, 2]), {
    status: 200,
    headers: { 'content-type': 'image/jpeg' },
  });
  await assert.rejects(
    requestQr('https://example.com', { fetchImpl: jpegResponse, createObjectURL: () => 'blob:unused' }),
    (error) => error.code === 'QR_GENERATION_ERROR',
  );

  await assert.rejects(
    requestQr('https://example.com', {
      fetchImpl: async () => { throw new Error('network-private-detail'); },
      createObjectURL: () => 'blob:unused',
    }),
    (error) => error.code === 'QR_SERVICE_UNAVAILABLE' && !error.message.includes('network-private-detail'),
  );

  await assert.rejects(
    requestQr('https://example.com', {
      fetchImpl: async () => new Response('png', { status: 200, headers: { 'content-type': 'image/png' } }),
      createObjectURL: () => { throw new Error('object-url-private-detail'); },
    }),
    (error) => error.code === 'INTERNAL_ERROR' && !error.message.includes('object-url-private-detail'),
  );
});
