const SUPPORTED_FORMATS = new Map([
  ['png', 'image/png'],
  ['svg', 'image/svg+xml'],
]);

export class QrServiceError extends Error {
  constructor(code, status) {
    super(code);
    this.name = 'QrServiceError';
    this.code = code;
    this.status = status;
  }
}

function readInteger(value, { fallback, min, max }) {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= min && parsed <= max ? parsed : null;
}

function normalizeApiBase(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const base = new URL(value.trim());
    if (base.protocol !== 'https:' || base.username || base.password || base.hash) return null;
    return new URL(base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`, base);
  } catch {
    return null;
  }
}

function readHeaderValue(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && !/[\r\n]/.test(normalized) ? normalized : null;
}

/** Reads provider configuration. Secrets remain in process environment only. */
export function getQrProviderConfig(env = process.env) {
  const apiKey = readHeaderValue(env.RAPIDAPI_KEY);
  const apiHost = readHeaderValue(env.QRCODE_MONKEY_API_HOST);
  const apiBase = normalizeApiBase(env.QRCODE_MONKEY_API_BASE);
  const size = readInteger(env.QR_DEFAULT_SIZE, { fallback: 1000, min: 100, max: 5000 });
  const timeoutMs = readInteger(env.QR_REQUEST_TIMEOUT_MS, { fallback: 10000, min: 1000, max: 60000 });

  if (!apiKey || !apiHost || !apiBase || !size || !timeoutMs) return null;

  return {
    apiKey,
    apiHost,
    endpoint: new URL('qr/custom', apiBase).toString(),
    size,
    timeoutMs,
  };
}

function contentTypeWithoutParameters(value) {
  return value?.split(';', 1)[0].trim().toLowerCase();
}

function mapUpstreamStatus(status) {
  if (status === 401 || status === 403 || status === 429) {
    return new QrServiceError('QR_SERVICE_UNAVAILABLE', 503);
  }
  return new QrServiceError('QR_PROVIDER_ERROR', 502);
}

/**
 * Creates a narrow provider client. fetchImpl/getConfig are injected only for tests.
 */
export function createQrCodeMonkeyService({
  fetchImpl = globalThis.fetch,
  getConfig = getQrProviderConfig,
} = {}) {
  return {
    async generate({
      url,
      format = 'png',
      size,
      bodyColor = '#000000',
      bgColor = '#FFFFFF',
    }) {
      const contentType = SUPPORTED_FORMATS.get(format);
      if (!contentType) throw new QrServiceError('INVALID_FORMAT', 400);

      const config = getConfig();
      if (!config) throw new QrServiceError('QR_SERVICE_UNAVAILABLE', 503);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        let response;
        try {
          response = await fetchImpl(config.endpoint, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              Accept: contentType,
              'Content-Type': 'application/json',
              'X-RapidAPI-Key': config.apiKey,
              'X-RapidAPI-Host': config.apiHost,
            },
            body: JSON.stringify({
              data: url,
              config: {
                body: 'square',
                bodyColor,
                bgColor,
              },
              size: size ?? config.size,
              download: false,
              file: format,
            }),
          });
        } catch (error) {
          if (controller.signal.aborted || error?.name === 'AbortError') {
            throw new QrServiceError('QR_PROVIDER_TIMEOUT', 504);
          }
          throw new QrServiceError('QR_SERVICE_UNAVAILABLE', 503);
        }

        if (!response.ok) throw mapUpstreamStatus(response.status);
        if (contentTypeWithoutParameters(response.headers.get('content-type')) !== contentType) {
          throw new QrServiceError('QR_PROVIDER_ERROR', 502);
        }

        return {
          body: Buffer.from(await response.arrayBuffer()),
          contentType,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
