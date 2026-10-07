import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { initQrForm, validateInput, validateQrOptions } from '../public/qr-form.js';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

function setup(t, options = {}) {
  // No browser, resource loading, or image generation: this checks DOM behavior only.
  const dom = new JSDOM(html, { url: 'http://localhost/' });
  t.after(() => dom.window.close());
  const doc = dom.window.document;
  initQrForm(doc, options);
  return {
    doc,
    window: dom.window,
    get: (id) => doc.getElementById(id),
    submit: () => doc.getElementById('qr-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })),
    edit: (value) => {
      const input = doc.getElementById('url');
      input.value = value;
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    },
  };
}

test('URL validation trims input, preserves query/hash and rejects unsupported input', () => {
  const url = 'https://example.com/a?x=1&y=2#abc';
  assert.deepEqual(validateInput(`  ${url}  `), { url });
  assert.deepEqual(validateInput('http://example.com'), { url: 'http://example.com' });
  for (const value of ['', '  ', 'example.com', 'https:example.com', 'javascript:alert(1)', 'data:text/html,test', 'file:///a', 'ftp://example.com', `https://example.com/${'a'.repeat(4096)}`]) {
    assert.ok(validateInput(value).error, value);
  }
});

test('V1.1 client validation accepts safe presets and rejects low contrast colors', () => {
  assert.deepEqual(validateQrOptions({ format: 'svg', size: 2000, bodyColor: '#0b3d91', bgColor: '#ffffff' }), {
    options: { format: 'svg', size: 2000, bodyColor: '#0B3D91', bgColor: '#FFFFFF' },
  });
  assert.match(validateQrOptions({ format: 'png', size: 750, bodyColor: '#000000', bgColor: '#FFFFFF' }).error, /Kích thước/);
  assert.match(validateQrOptions({ format: 'png', size: 1000, bodyColor: '#808080', bgColor: '#FFFFFF' }).error, /tương phản/);
});

test('initial UI hides result and leaves controls ready', (t) => {
  const { get } = setup(t);
  assert.equal(get('qr-result').hidden, true);
  assert.equal(get('download-button').hasAttribute('href'), false);
  assert.equal(get('download-button').getAttribute('aria-disabled'), 'true');
  assert.equal(get('generate-button').disabled, false);
  assert.equal(get('url').readOnly, false);
});

test('invalid submit preserves input, focuses it, and never starts generation', (t) => {
  let calls = 0;
  const { get, submit, edit, doc } = setup(t, { generate: () => { calls += 1; } });
  edit('javascript:alert(1)');
  submit();
  assert.equal(calls, 0);
  assert.equal(get('url').value, 'javascript:alert(1)');
  assert.equal(doc.activeElement, get('url'));
  assert.equal(get('url').getAttribute('aria-invalid'), 'true');
  assert.match(get('url-error').textContent, /Đường link chưa hợp lệ/);
  edit('https://example.com');
  assert.equal(get('url-error').textContent, '');
  assert.equal(get('url').hasAttribute('aria-invalid'), false);
});

test('loading locks duplicate submits; successful result enables download UI', async (t) => {
  let complete;
  let calls = 0;
  const pending = new Promise((resolve) => { complete = resolve; });
  const { get, submit, edit } = setup(t, { generate: (url) => {
    calls += 1;
    assert.equal(url, 'https://example.com');
    return pending;
  }});
  edit('https://example.com');
  submit();
  submit();
  assert.equal(calls, 1);
  assert.equal(get('generate-button').disabled, true);
  assert.equal(get('url').readOnly, true);
  assert.equal(get('generate-label').textContent, 'Đang tạo mã QR…');
  assert.equal(get('qr-result').hidden, true);
  complete({ imageUrl: '/test-only-image.png', filename: 'test.png' });
  await setImmediate();
  assert.equal(get('generate-button').disabled, false);
  assert.equal(get('url').readOnly, false);
  assert.equal(get('qr-result').hidden, false);
  assert.equal(get('result-url').textContent, 'https://example.com');
  assert.equal(get('download-button').getAttribute('href'), '/test-only-image.png');
  assert.equal(get('download-button').getAttribute('aria-disabled'), 'false');
  assert.equal(get('download-button').download, 'test.png');
  edit('https://example.org');
  assert.equal(get('qr-result').hidden, true);
  assert.equal(get('download-button').hasAttribute('href'), false);
});

test('advanced selections are passed to generation and update the download label', async (t) => {
  let received;
  const { get, edit, submit } = setup(t, {
    generate: async (_url, options) => {
      received = options;
      return { imageUrl: '/test.svg', filename: 'test.svg', format: 'svg', contentType: 'image/svg+xml' };
    },
  });
  get('format').value = 'svg';
  get('size').value = '2000';
  get('body-color').value = '#0b3d91';
  get('background-color').value = '#ffffff';
  edit('https://example.com');
  submit();
  await setImmediate();
  assert.deepEqual(received, { format: 'svg', size: 2000, bodyColor: '#0B3D91', bgColor: '#FFFFFF' });
  assert.equal(get('download-label').textContent, 'Tải SVG');
  assert.equal(get('copy-button').hidden, true);
});

test('copy button appears only for supported PNG and reports success without raw details', async (t) => {
  let copied;
  const { get, edit, submit } = setup(t, {
    generate: async () => ({ imageUrl: 'blob:test', filename: 'test.png', format: 'png', contentType: 'image/png' }),
    canCopyImage: true,
    copyImage: async (output) => { copied = output; },
  });
  edit('https://example.com');
  submit();
  await setImmediate();
  assert.equal(get('copy-button').hidden, false);
  get('copy-button').click();
  await setImmediate();
  assert.equal(copied.imageUrl, 'blob:test');
  assert.equal(get('form-status').textContent, 'Đã sao chép ảnh QR.');
});

test('service error retains URL, restores controls, and does not expose raw error', async (t) => {
  const { get, edit, submit } = setup(t, { generate: async () => {
    throw Object.assign(new Error('private-provider-detail'), { code: 'QR_PROVIDER_TIMEOUT' });
  }});
  edit('https://example.com');
  submit();
  await setImmediate();
  assert.equal(get('url').value, 'https://example.com');
  assert.equal(get('generate-button').disabled, false);
  assert.equal(get('url').readOnly, false);
  assert.equal(get('qr-result').hidden, true);
  assert.match(get('url-error').textContent, /mất quá nhiều thời gian/);
  assert.doesNotMatch(get('url-error').textContent, /private-provider-detail/);
});

test('default adapter reports unavailable without showing a fake QR', async (t) => {
  const { get, edit, submit } = setup(t);
  edit('https://example.com');
  submit();
  await setImmediate();
  assert.match(get('url-error').textContent, /Chưa thể tạo mã QR/);
  assert.equal(get('qr-result').hidden, true);
  assert.equal(get('qr-preview').hasAttribute('src'), false);
});

test('result URL is rendered as text and create-another returns focus to input', async (t) => {
  const { get, edit, submit, doc } = setup(t, { generate: async () => ({ imageUrl: '/test-only-image.png' }) });
  const url = 'https://example.com/?q=<img/src=x/onerror=alert(1)>';
  edit(url);
  submit();
  await setImmediate();
  assert.equal(get('result-url').textContent, url);
  assert.equal(get('result-url').children.length, 0);
  get('another-button').click();
  assert.equal(doc.activeElement, get('url'));
  assert.equal(get('url').value, url);
  assert.equal(get('qr-result').hidden, true);
});

test('unknown service codes use the generic message', async (t) => {
  const { get, edit, submit } = setup(t, { generate: async () => { throw { code: 'toString' }; } });
  edit('https://example.com');
  submit();
  await setImmediate();
  assert.equal(get('url-error').textContent, 'Đã có lỗi xảy ra khi tạo mã QR.');
});

test('releases an object URL when input changes, create-another is used, or page closes', async (t) => {
  const revoked = [];
  let scrollCalls = 0;
  let imageCount = 0;
  const { get, edit, submit, window } = setup(t, {
    generate: async () => ({
      imageUrl: `blob:qr-${++imageCount}`,
      revokeOnDispose: true,
      filename: `tung-thien-qr-20261007-${imageCount}.png`,
    }),
    revokeObjectUrl: (url) => revoked.push(url),
    scrollToResult: () => { scrollCalls += 1; },
  });

  edit('https://example.com');
  submit();
  await setImmediate();
  assert.equal(get('qr-preview').src, 'blob:qr-1');
  assert.equal(scrollCalls, 1);
  edit('https://example.org');
  assert.deepEqual(revoked, ['blob:qr-1']);

  submit();
  await setImmediate();
  get('another-button').click();
  assert.deepEqual(revoked, ['blob:qr-1', 'blob:qr-2']);

  submit();
  await setImmediate();
  window.dispatchEvent(new window.Event('pagehide'));
  assert.deepEqual(revoked, ['blob:qr-1', 'blob:qr-2', 'blob:qr-3']);
});
