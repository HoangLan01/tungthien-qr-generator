import { randomUUID } from 'node:crypto';

/** Emits privacy-safe operational events when explicitly enabled on the backend. */
export function createQrAccessLogger({
  enabled = false,
  log = console.info,
  idGenerator = randomUUID,
  now = () => Date.now(),
  timestamp = () => new Date().toISOString(),
} = {}) {
  if (!enabled) return (_req, _res, next) => next();

  return (req, res, next) => {
    if (req.method !== 'POST') return next();
    const requestId = idGenerator();
    const startedAt = now();
    res.set('X-Request-Id', requestId);
    res.once('finish', () => {
      log(JSON.stringify({
        event: 'qr_request',
        timestamp: timestamp(),
        requestId,
        status: res.statusCode,
        durationMs: Math.max(0, now() - startedAt),
        errorCode: res.locals.errorCode ?? null,
      }));
    });
    next();
  };
}
