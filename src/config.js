import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Resolve from the project directory, even when launched from another cwd.
dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
});

export function readPort(value = process.env.PORT) {
  if (value === undefined || value === '') return 3000;
  if (!/^\d+$/.test(value)) throw new Error('PORT must be an integer from 1 to 65535.');
  const port = Number(value);
  if (port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  return port;
}

export function readQrDefaultSize(value = process.env.QR_DEFAULT_SIZE) {
  if (value === undefined || value === '') return 1000;
  if (!/^(500|1000|1500|2000)$/.test(value)) {
    throw new Error('Invalid default QR size configuration.');
  }
  return Number(value);
}

function readInteger(value, { fallback, min, max }) {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= min && parsed <= max ? parsed : null;
}

export function readRateLimitConfig(env = process.env) {
  const windowMs = readInteger(env.RATE_LIMIT_WINDOW_MS, {
    fallback: 60_000,
    min: 1_000,
    max: 3_600_000,
  });
  const max = readInteger(env.RATE_LIMIT_MAX, {
    fallback: 20,
    min: 1,
    max: 10_000,
  });
  if (!windowMs || !max) {
    throw new Error('Invalid rate limit configuration.');
  }
  return { windowMs, max };
}

function normalizeOrigin(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)
      || !parsed.hostname || parsed.username || parsed.password
      || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function readCorsAllowedOrigins(env = process.env) {
  const configured = env.CORS_ALLOWED_ORIGINS ?? env.CORS_ALLOWED_ORIGIN ?? '';
  if (typeof configured !== 'string') throw new Error('Invalid CORS configuration.');

  const origins = configured.split(',').map((value) => value.trim()).filter(Boolean);
  const normalized = origins.map(normalizeOrigin);
  if (normalized.some((origin) => !origin) || new Set(normalized).size !== normalized.length) {
    throw new Error('Invalid CORS configuration.');
  }
  return new Set(normalized);
}

export function readServeStatic(value = process.env.SERVE_STATIC) {
  if (value === undefined || value === '') return true;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('Invalid static serving configuration.');
}

export function readTrustProxy(value = process.env.TRUST_PROXY) {
  if (value === undefined || value === '') return false;
  if (value === 'loopback') return 'loopback';
  throw new Error('Invalid trusted proxy configuration.');
}

export function readQrAccessLog(value = process.env.QR_ACCESS_LOG) {
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  throw new Error('Invalid QR access log configuration.');
}
