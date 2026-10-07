function createClientError(code) {
  return Object.assign(new Error(code), { code });
}

function contentTypeWithoutParameters(value) {
  return value?.split(';', 1)[0].trim().toLowerCase();
}

async function readErrorCode(response) {
  try {
    const payload = await response.json();
    if (typeof payload?.error?.code === 'string') return payload.error.code;
  } catch {
    // The server response is intentionally not shown directly to the user.
  }
  return 'INTERNAL_ERROR';
}

export function createQrFilename(now = new Date(), format = 'png') {
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  return `tung-thien-qr-${date}.${format}`;
}

export function getQrApiEndpoint(apiBase = globalThis.__QR_API_BASE_URL__) {
  if (apiBase === undefined || apiBase === '') return '/api/qr';
  if (typeof apiBase !== 'string') throw createClientError('INTERNAL_ERROR');
  try {
    const parsed = new URL(apiBase);
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password
      || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error('Invalid API base URL');
    }
    return new URL('/api/qr', parsed.origin).toString();
  } catch {
    throw createClientError('INTERNAL_ERROR');
  }
}

/**
 * Requests a PNG from the same-origin backend. It never sends a provider key
 * and creates the object URL only after a successful, correctly typed response.
 */
export async function requestQr(url, {
  fetchImpl = globalThis.fetch,
  createObjectURL = globalThis.URL?.createObjectURL,
  apiBase = globalThis.__QR_API_BASE_URL__,
  format = 'png',
  size = 1000,
  bodyColor = '#000000',
  bgColor = '#FFFFFF',
  now = () => new Date(),
} = {}) {
  if (typeof createObjectURL !== 'function') throw createClientError('INTERNAL_ERROR');

  let response;
  try {
    response = await fetchImpl(getQrApiEndpoint(apiBase), {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: format === 'svg' ? 'image/svg+xml' : 'image/png',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, format, size, bodyColor, bgColor }),
    });
  } catch {
    throw createClientError('QR_SERVICE_UNAVAILABLE');
  }

  if (!response.ok) throw createClientError(await readErrorCode(response));
  const expectedContentType = format === 'svg' ? 'image/svg+xml' : 'image/png';
  if (contentTypeWithoutParameters(response.headers.get('content-type')) !== expectedContentType) {
    throw createClientError('QR_PROVIDER_ERROR');
  }

  let blob;
  try {
    blob = await response.blob();
  } catch {
    throw createClientError('QR_PROVIDER_ERROR');
  }

  try {
    return {
      imageUrl: createObjectURL(blob),
      filename: createQrFilename(now(), format),
      contentType: expectedContentType,
      format,
      revokeOnDispose: true,
    };
  } catch {
    throw createClientError('INTERNAL_ERROR');
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
