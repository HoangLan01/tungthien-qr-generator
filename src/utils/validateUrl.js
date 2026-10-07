export const MIN_URL_LENGTH = 8;
export const MAX_URL_LENGTH = 4096;

/**
 * Validates text to be encoded, without resolving or fetching the user URL.
 * The returned normalized URL is only ever passed to the QR provider as data.
 */
export function validateUrl(value) {
  if (typeof value !== 'string') return { code: 'INVALID_URL' };

  const url = value.trim();
  if (url.length > MAX_URL_LENGTH) return { code: 'INPUT_TOO_LONG' };
  if (url.length < MIN_URL_LENGTH || !/^https?:\/\//i.test(url)) {
    return { code: 'INVALID_URL' };
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      return { code: 'INVALID_URL' };
    }
  } catch {
    return { code: 'INVALID_URL' };
  }

  return { url };
}
