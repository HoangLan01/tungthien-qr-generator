import { rateLimit } from 'express-rate-limit';

/** Limits only QR generation to protect the paid/limited provider quota. */
export function createQrRateLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    identifier: 'qr-generation',
    handler: (_req, res) => {
      res.locals.errorCode = 'RATE_LIMITED';
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many QR requests.',
        },
      });
    },
  });
}
