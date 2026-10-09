import QRCode from 'qrcode';

function createClientError(code) {
  return Object.assign(new Error(code), { code });
}

export function createQrFilename(now = new Date(), format = 'png') {
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  return `tung-thien-qr-${date}.${format}`;
}

/**
 * Generates a QR image entirely in the browser. The encoded URL is never sent
 * to an API or another origin.
 */
export async function requestQr(url, {
  encoder = QRCode,
  createObjectURL = globalThis.URL?.createObjectURL,
  BlobConstructor = globalThis.Blob,
  format = 'png',
  size = 1000,
  bodyColor = '#000000',
  bgColor = '#FFFFFF',
  now = () => new Date(),
} = {}) {
  if (typeof createObjectURL !== 'function' || typeof BlobConstructor !== 'function') {
    throw createClientError('INTERNAL_ERROR');
  }

  const contentType = format === 'svg' ? 'image/svg+xml' : 'image/png';
  const options = {
    errorCorrectionLevel: 'M',
    margin: 4,
    width: size,
    color: { dark: bodyColor, light: bgColor },
  };

  try {
    let blob;
    if (format === 'svg') {
      const svg = await encoder.toString(url, { ...options, type: 'svg' });
      blob = new BlobConstructor([svg], { type: contentType });
    } else {
      const dataUrl = await encoder.toDataURL(url, { ...options, type: 'image/png' });
      const encoded = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/)?.[1];
      if (!encoded) throw new Error('Invalid PNG output');
      const binary = globalThis.atob(encoded);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      blob = new BlobConstructor([bytes], { type: contentType });
    }

    return {
      imageUrl: createObjectURL(blob),
      filename: createQrFilename(now(), format),
      contentType,
      format,
      revokeOnDispose: true,
    };
  } catch {
    throw createClientError('QR_GENERATION_ERROR');
  }
}

export function canCopyQrImage({
  clipboard = globalThis.navigator?.clipboard,
  ClipboardItemConstructor = globalThis.ClipboardItem,
  isSecureContext = globalThis.isSecureContext,
} = {}) {
  return Boolean(isSecureContext && clipboard?.write && ClipboardItemConstructor);
}

export async function copyQrImage({ imageUrl, contentType }, {
  fetchImpl = globalThis.fetch,
  clipboard = globalThis.navigator?.clipboard,
  ClipboardItemConstructor = globalThis.ClipboardItem,
} = {}) {
  if (contentType !== 'image/png' || !clipboard?.write || !ClipboardItemConstructor) {
    throw createClientError('COPY_UNAVAILABLE');
  }
  try {
    const response = await fetchImpl(imageUrl);
    if (!response.ok) throw new Error('Image unavailable');
    const blob = await response.blob();
    await clipboard.write([new ClipboardItemConstructor({ 'image/png': blob })]);
  } catch {
    throw createClientError('COPY_UNAVAILABLE');
  }
}
