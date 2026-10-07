function requestOrigin(req) {
  const host = req.get('host');
  if (!host) return null;
  try {
    return new URL(`${req.protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

function sendCorsForbidden(res) {
  res.locals.errorCode = 'CORS_FORBIDDEN';
  res.status(403).json({
    error: { code: 'CORS_FORBIDDEN', message: 'Origin is not allowed.' },
  });
}

/** Restricts the browser API surface to same-origin and explicitly configured frontends. */
export function createQrCors({ allowedOrigins = new Set() } = {}) {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (!origin) return next();

    const isSameOrigin = origin === requestOrigin(req);
    const isAllowedOrigin = allowedOrigins.has(origin);
    if (!isSameOrigin && !isAllowedOrigin) return sendCorsForbidden(res);

    if (isAllowedOrigin) {
      res.vary('Origin');
      res.set('Access-Control-Allow-Origin', origin);
    }

    if (req.method !== 'OPTIONS') return next();
    if (req.get('access-control-request-method') !== 'POST') return sendCorsForbidden(res);

    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '600');
    return res.status(204).end();
  };
}
