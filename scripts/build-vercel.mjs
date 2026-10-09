import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));
const assetsDirectory = fileURLToPath(new URL('../assets/', import.meta.url));
const outputDirectory = fileURLToPath(new URL('../dist-vercel/', import.meta.url));

export function normalizePublicApiBase(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('QR_API_BASE_URL is required for a Vercel build.');
  }
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password
      || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error('Invalid QR_API_BASE_URL.');
    }
    return parsed.origin;
  } catch (error) {
    if (error.message === 'Invalid QR_API_BASE_URL.') throw error;
    throw new Error('Invalid QR_API_BASE_URL.');
  }
}

export async function buildVercelFrontend({
  apiBase = process.env.QR_API_BASE_URL,
  sourceDirectory = publicDirectory,
  targetDirectory = outputDirectory,
} = {}) {
  const normalizedApiBase = normalizePublicApiBase(apiBase);
  await rm(targetDirectory, { recursive: true, force: true });
  await mkdir(targetDirectory, { recursive: true });
  await cp(sourceDirectory, targetDirectory, { recursive: true });
  await cp(assetsDirectory, `${targetDirectory}/assets`, { recursive: true });
  await writeFile(`${targetDirectory}/runtime-config.js`,
    `globalThis.__QR_API_BASE_URL__ = ${JSON.stringify(normalizedApiBase)};\n`, 'utf8');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await buildVercelFrontend();
  console.info('Vercel frontend build completed.');
}
