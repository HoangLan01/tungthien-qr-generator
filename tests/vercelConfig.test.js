import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = await readFile(new URL('../vercel.ts', import.meta.url), 'utf8');
const moduleUrl = `data:text/javascript,${encodeURIComponent(source)}`;
const { config } = await import(moduleUrl);

test('exports a Vercel config object with valid static header values', () => {
  assert.ok(config);
  assert.equal(config.framework, null);
  assert.equal(config.buildCommand, 'npm run build:vercel');
  assert.equal(config.outputDirectory, 'dist-vercel');
  assert.ok(Array.isArray(config.headers));
  for (const rule of config.headers) {
    assert.equal(typeof rule.source, 'string');
    assert.ok(Array.isArray(rule.headers));
    for (const header of rule.headers) {
      assert.equal(typeof header.key, 'string');
      assert.ok(header.key.length > 0);
      assert.equal(typeof header.value, 'string');
      assert.ok(header.value.length > 0);
    }
  }
});
