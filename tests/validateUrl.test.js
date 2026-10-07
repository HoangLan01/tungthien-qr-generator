import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_URL_LENGTH, validateUrl } from '../src/utils/validateUrl.js';

test('accepts trimmed HTTP and HTTPS URLs without contacting them', () => {
  const cases = [
    'https://example.com',
    'http://example.com',
    'https://example.com/path?a=1&b=2',
    'https://sub.example.com/path#abc',
    'https://www.google.com/search?q=qr',
  ];

  for (const url of cases) {
    assert.deepEqual(validateUrl(`  ${url}  `), { url });
  }
});

test('rejects empty, malformed and unsafe URL protocols', () => {
  for (const value of [
    undefined,
    null,
    {},
    '',
    '  ',
    'example.com',
    'https:example.com',
    'javascript:alert(1)',
    'data:text/html,test',
    'file:///tmp/a',
    'ftp://example.com',
    'https://',
  ]) {
    assert.deepEqual(validateUrl(value), { code: 'INVALID_URL' });
  }
});

test('enforces the 4096 character limit after trimming', () => {
  const url = `https://example.com/${'a'.repeat(MAX_URL_LENGTH)}`;
  assert.deepEqual(validateUrl(url), { code: 'INPUT_TOO_LONG' });
});
