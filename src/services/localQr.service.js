import QRCode from 'qrcode';
import { readQrDefaultSize } from '../config.js';

const FORMAT_CONTENT_TYPES = new Map([
  ['png', 'image/png'],
  ['svg', 'image/svg+xml'],
]);

export class QrGenerationError extends Error {
  constructor(code = 'QR_GENERATION_ERROR', status = 500) {
    super(code);
    this.name = 'QrGenerationError';
    this.code = code;
    this.status = status;
  }
}

/** Generates static QR files locally. No user URL is sent to an external QR provider. */
export function createLocalQrService({
  generator = QRCode,
  defaultSize = readQrDefaultSize(),
} = {}) {
  return {
    async generate({
      url,
      format = 'png',
      size,
      bodyColor = '#000000',
      bgColor = '#FFFFFF',
    }) {
      const contentType = FORMAT_CONTENT_TYPES.get(format);
      if (!contentType) throw new QrGenerationError('INVALID_FORMAT', 400);

      const options = {
        errorCorrectionLevel: 'M',
        margin: 4,
        width: size ?? defaultSize,
        color: { dark: bodyColor, light: bgColor },
      };

      try {
        const body = format === 'png'
          ? await generator.toBuffer(url, { ...options, type: 'png' })
          : Buffer.from(await generator.toString(url, { ...options, type: 'svg' }), 'utf8');
        return { body, contentType };
      } catch {
        throw new QrGenerationError();
      }
    },
  };
}
