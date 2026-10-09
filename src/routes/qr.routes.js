import { Router } from 'express';
import { createLocalQrService, QrGenerationError } from '../services/localQr.service.js';
import { validateQrOptions } from '../utils/qrOptions.js';
import { validateUrl } from '../utils/validateUrl.js';

const errorMessages = {
  INVALID_URL: 'Invalid URL.',
  INPUT_TOO_LONG: 'Input is too long.',
  INVALID_FORMAT: 'Invalid format.',
  INVALID_SIZE: 'Invalid size.',
  INVALID_COLOR: 'Invalid color.',
  LOW_COLOR_CONTRAST: 'Insufficient color contrast.',
  QR_GENERATION_ERROR: 'QR generation error.',
  UNSUPPORTED_MEDIA_TYPE: 'Unsupported media type.',
};

function sendError(res, status, code) {
  res.locals.errorCode = code;
  res.status(status).json({
    error: { code, message: errorMessages[code] },
  });
}

export function createQrRouter({
  service = createLocalQrService(),
  rateLimiter,
} = {}) {
  const router = Router();

  router.post('/', rateLimiter, async (req, res, next) => {
    if (!req.is('application/json')) {
      return sendError(res, 415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    const validatedUrl = validateUrl(req.body?.url);
    if (validatedUrl.code) {
      return sendError(res, validatedUrl.code === 'INPUT_TOO_LONG' ? 413 : 400, validatedUrl.code);
    }

    const options = validateQrOptions({
      format: req.body?.format,
      size: req.body?.size,
      bodyColor: req.body?.bodyColor,
      bgColor: req.body?.bgColor,
    });
    if (options.code) return sendError(res, 400, options.code);

    try {
      const qr = await service.generate({ url: validatedUrl.url, ...options });
      res.type(qr.contentType).send(qr.body);
    } catch (error) {
      if (error instanceof QrGenerationError) {
        return sendError(res, error.status, error.code);
      }
      next(error);
    }
  });

  return router;
}
