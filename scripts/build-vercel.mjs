import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));
const assetsDirectory = fileURLToPath(new URL('../assets/', import.meta.url));
const outputDirectory = fileURLToPath(new URL('../dist-vercel/', import.meta.url));

export async function buildVercelFrontend({
  sourceDirectory = publicDirectory,
  targetDirectory = outputDirectory,
} = {}) {
  await rm(targetDirectory, { recursive: true, force: true });
  await mkdir(targetDirectory, { recursive: true });
  await Promise.all([
    'index.html',
    'manifest.webmanifest',
    'styles.css',
    'sw.js',
  ].map((filename) => cp(`${sourceDirectory}/${filename}`, `${targetDirectory}/${filename}`)));
  await cp(assetsDirectory, `${targetDirectory}/assets`, { recursive: true });
  await build({
    entryPoints: [`${sourceDirectory}/app.js`],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
    outfile: `${targetDirectory}/app.js`,
    legalComments: 'eof',
    minify: true,
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await buildVercelFrontend();
  console.info('Vercel frontend build completed.');
}
