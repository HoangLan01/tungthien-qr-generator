import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizePublicApiBase } from '../scripts/build-vercel.mjs';

test('Vercel build requires an HTTPS API origin and never accepts a provider secret', () => {
  assert.equal(normalizePublicApiBase('https://api.example.vn/'), 'https://api.example.vn');
  for (const value of ['', 'http://api.example.vn', 'https://api.example.vn/api', 'https://user@api.example.vn']) {
    assert.throws(() => normalizePublicApiBase(value), /QR_API_BASE_URL/);
  }
});
