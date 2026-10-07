import express from 'express';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import {
  readCorsAllowedOrigins,
  readQrAccessLog,
  readRateLimitConfig,
  readServeStatic,
  readTrustProxy,
} from './config.js';
import { createQrCors } from './middleware/cors.js';
import { createQrAccessLogger } from './middleware/qrAccessLog.js';
import { createQrRateLimiter } from './middleware/rateLimit.js';
import { createQrRouter } from './routes/qr.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));

export function createApp({
  isProduction = process.env.NODE_ENV === 'production',
  qrService,
  rateLimitConfig = readRateLimitConfig(),
  corsAllowedOrigins = readCorsAllowedOrigins(),
  serveStatic = readServeStatic(),
  trustProxy = readTrustProxy(),
  qrAccessLogger = createQrAccessLogger({ enabled: readQrAccessLog() }),
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  app.use(helmet({
    // Keep HTTP localhost assets usable; retain HTTPS upgrades in production.
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    strictTransportSecurity: isProduction,
  }));
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/qr', qrAccessLogger);
  app.use('/api/qr', createQrCors({ allowedOrigins: corsAllowedOrigins }));
  app.use(express.json({ limit: '16kb' }));
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/qr', createQrRouter({
    service: qrService,
    rateLimiter: createQrRateLimiter(rateLimitConfig),
  }));
  if (serveStatic) app.use(express.static(publicDirectory));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
