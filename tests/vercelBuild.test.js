import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildVercelFrontend } from '../scripts/build-vercel.mjs';

test('builds a self-contained static Vercel site without backend configuration', async () => {
  const targetDirectory = await mkdtemp(join(tmpdir(), 'qr-generator-vercel-'));
  try {
    await buildVercelFrontend({ targetDirectory });
    const files = await readdir(targetDirectory);
    assert.deepEqual(files.sort(), [
      'app.js',
      'assets',
      'index.html',
      'manifest.webmanifest',
      'styles.css',
      'sw.js',
    ]);
    const [index, bundle] = await Promise.all([
      readFile(join(targetDirectory, 'index.html'), 'utf8'),
      readFile(join(targetDirectory, 'app.js'), 'utf8'),
    ]);
    assert.doesNotMatch(index, /runtime-config|QR_API_BASE_URL/);
    assert.doesNotMatch(bundle, /from\s*["']qrcode["']/);
    assert.ok(bundle.length > 10_000);
  } finally {
    await rm(targetDirectory, { recursive: true, force: true });
  }
});
