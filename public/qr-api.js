import QRCode from 'qrcode';

const LOGO_URL = '/assets/logo.png';
const LOGO_RATIO = 0.14;
const LOGO_PLATE_RATIO = 0.18;
let cachedLogoDataUrl;

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

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return globalThis.btoa(binary);
}

async function loadLogoDataUrl({
  fetchImpl = globalThis.fetch,
  logoUrl = LOGO_URL,
} = {}) {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  if (typeof fetchImpl !== 'function') throw new Error('Logo loader unavailable');
  const response = await fetchImpl(logoUrl, { cache: 'force-cache', credentials: 'same-origin' });
  if (!response.ok) throw new Error('Logo unavailable');
  const blob = await response.blob();
  if (blob.type !== 'image/png') throw new Error('Unexpected logo type');
  const base64 = bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
  cachedLogoDataUrl = `data:image/png;base64,${base64}`;
  return cachedLogoDataUrl;
}

function readQrSvg(qrSvg) {
  const viewBox = qrSvg.match(/\bviewBox="([^"]+)"/)?.[1];
  const content = qrSvg.match(/^<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/)?.[1];
  if (!viewBox || !/^0 0 \d+(?:\.\d+)? \d+(?:\.\d+)?$/.test(viewBox) || !content) {
    throw new Error('Invalid QR SVG');
  }
  return { viewBox, content };
}

export function composeBrandedSvg(qrSvg, {
  size,
  includeLogo,
  frameStyle,
  logoDataUrl,
}) {
  const { viewBox, content } = readQrSvg(qrSvg);
  const hasFrame = frameStyle === 'label';
  if (!['none', 'label'].includes(frameStyle)) throw new Error('Invalid frame style');
  if (includeLogo && !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(logoDataUrl || '')) {
    throw new Error('Invalid logo data');
  }

  const qrLayout = hasFrame
    ? { x: 120, y: 125, size: 760 }
    : { x: 0, y: 0, size: 1000 };
  const logoSize = qrLayout.size * LOGO_RATIO;
  const plateSize = qrLayout.size * LOGO_PLATE_RATIO;
  const logoX = qrLayout.x + ((qrLayout.size - logoSize) / 2);
  const logoY = qrLayout.y + ((qrLayout.size - logoSize) / 2);
  const plateX = qrLayout.x + ((qrLayout.size - plateSize) / 2);
  const plateY = qrLayout.y + ((qrLayout.size - plateSize) / 2);

  const frame = hasFrame ? `
    <rect width="1000" height="1000" fill="#FFFDF7"/>
    <rect x="18" y="18" width="964" height="964" rx="48" fill="none" stroke="#0A5C45" stroke-width="12"/>
    <text x="500" y="78" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#0A5C45">QUÉT MÃ ĐỂ TRUY CẬP</text>
    <text x="500" y="952" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="#0A5C45">PHƯỜNG TÙNG THIỆN</text>` : '';
  const logo = includeLogo ? `
    <rect x="${plateX}" y="${plateY}" width="${plateSize}" height="${plateSize}" rx="${plateSize * 0.18}" fill="#FFFFFF"/>
    <image data-logo-ratio="${LOGO_RATIO}" href="${logoDataUrl}" x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1000 1000">
    ${frame}
    <svg x="${qrLayout.x}" y="${qrLayout.y}" width="${qrLayout.size}" height="${qrLayout.size}" viewBox="${viewBox}" shape-rendering="crispEdges">${content}</svg>${logo}
  </svg>`;
}

export async function rasterizeSvgToPng(svg, {
  size,
  BlobConstructor = globalThis.Blob,
  ImageConstructor = globalThis.Image,
  document = globalThis.document,
  urlApi = globalThis.URL,
} = {}) {
  if (!document?.createElement || typeof ImageConstructor !== 'function'
    || typeof urlApi?.createObjectURL !== 'function' || typeof urlApi?.revokeObjectURL !== 'function') {
    throw new Error('SVG rasterizer unavailable');
  }
  const sourceUrl = urlApi.createObjectURL(new BlobConstructor([svg], { type: 'image/svg+xml' }));
  try {
    const image = new ImageConstructor();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = sourceUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(image, 0, 0, size, size);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('PNG export failed'))), 'image/png');
    });
    return blob;
  } finally {
    urlApi.revokeObjectURL(sourceUrl);
  }
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
  includeLogo = false,
  frameStyle = 'none',
  getLogoDataUrl = loadLogoDataUrl,
  rasterizeSvg = rasterizeSvgToPng,
  now = () => new Date(),
} = {}) {
  if (typeof createObjectURL !== 'function' || typeof BlobConstructor !== 'function') {
    throw createClientError('INTERNAL_ERROR');
  }

  const contentType = format === 'svg' ? 'image/svg+xml' : 'image/png';
  const isDecorated = includeLogo || frameStyle !== 'none';
  const options = {
    errorCorrectionLevel: includeLogo ? 'H' : 'M',
    margin: 4,
    width: size,
    color: { dark: bodyColor, light: bgColor },
  };

  try {
    let blob;
    if (isDecorated) {
      const svg = await encoder.toString(url, { ...options, type: 'svg' });
      const logoDataUrl = includeLogo ? await getLogoDataUrl() : undefined;
      const decoratedSvg = composeBrandedSvg(svg, {
        size,
        includeLogo,
        frameStyle,
        logoDataUrl,
      });
      blob = format === 'svg'
        ? new BlobConstructor([decoratedSvg], { type: contentType })
        : await rasterizeSvg(decoratedSvg, { size, BlobConstructor });
    } else if (format === 'svg') {
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
