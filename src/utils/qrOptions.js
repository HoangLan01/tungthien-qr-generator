export const SUPPORTED_FORMATS = new Set(['png', 'svg']);
export const SUPPORTED_SIZES = new Set([500, 1000, 1500, 2000]);
export const DEFAULT_BODY_COLOR = '#000000';
export const DEFAULT_BACKGROUND_COLOR = '#FFFFFF';

function normalizeHexColor(value) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) return null;
  return value.toUpperCase();
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) => (channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4));
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

export function validateQrOptions({ format, size, bodyColor, bgColor } = {}) {
  const normalizedFormat = format === undefined ? 'png' : format;
  if (!SUPPORTED_FORMATS.has(normalizedFormat)) return { code: 'INVALID_FORMAT' };

  const normalizedSize = size === undefined ? undefined : size;
  if (normalizedSize !== undefined && (!Number.isInteger(normalizedSize) || !SUPPORTED_SIZES.has(normalizedSize))) {
    return { code: 'INVALID_SIZE' };
  }

  const normalizedBodyColor = normalizeHexColor(bodyColor ?? DEFAULT_BODY_COLOR);
  const normalizedBackgroundColor = normalizeHexColor(bgColor ?? DEFAULT_BACKGROUND_COLOR);
  if (!normalizedBodyColor || !normalizedBackgroundColor) return { code: 'INVALID_COLOR' };

  const bodyLuminance = relativeLuminance(normalizedBodyColor);
  const backgroundLuminance = relativeLuminance(normalizedBackgroundColor);
  const contrast = (Math.max(bodyLuminance, backgroundLuminance) + 0.05)
    / (Math.min(bodyLuminance, backgroundLuminance) + 0.05);
  if (backgroundLuminance <= bodyLuminance || contrast < 4.5) return { code: 'LOW_COLOR_CONTRAST' };

  return {
    format: normalizedFormat,
    size: normalizedSize,
    bodyColor: normalizedBodyColor,
    bgColor: normalizedBackgroundColor,
  };
}
