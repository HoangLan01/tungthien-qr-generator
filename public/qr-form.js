const messages = {
  INVALID_URL: 'Đường link chưa hợp lệ. Hãy nhập URL bắt đầu bằng http:// hoặc https://.',
  INPUT_TOO_LONG: 'Đường link quá dài. Vui lòng nhập tối đa 4096 ký tự.',
  QR_GENERATION_ERROR: 'Chưa thể tạo mã QR lúc này. Vui lòng thử lại.',
  INVALID_SIZE: 'Kích thước QR chưa được hỗ trợ.',
  INVALID_COLOR: 'Màu QR chưa hợp lệ.',
  INVALID_STYLE: 'Kiểu trình bày QR chưa hợp lệ.',
  LOW_COLOR_CONTRAST: 'Màu mã QR cần tối hơn và tương phản rõ với màu nền.',
  INTERNAL_ERROR: 'Đã có lỗi xảy ra khi tạo mã QR.',
};

export function validateInput(value) {
  const url = value.trim();
  if (!url) return { error: 'Vui lòng nhập đường link.' };
  if (url.length > 4096) return { error: messages.INPUT_TOO_LONG };
  try {
    const parsed = new URL(url);
    if (url.length < 8 || !/^https?:\/\//i.test(url)
      || !['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      return { error: messages.INVALID_URL };
    }
  } catch {
    return { error: messages.INVALID_URL };
  }
  return { url };
}

const qrTemplates = {
  basic: { bodyColor: '#000000', bgColor: '#FFFFFF', includeLogo: false, frameStyle: 'none' },
  blue: { bodyColor: '#0B3D91', bgColor: '#FFFFFF', includeLogo: false, frameStyle: 'none' },
  green: { bodyColor: '#0A5C45', bgColor: '#FFFFFF', includeLogo: false, frameStyle: 'none' },
  branded: { bodyColor: '#0A5C45', bgColor: '#FFFFFF', includeLogo: true, frameStyle: 'label' },
};

function relativeLuminance(hex) {
  const [red, green, blue] = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

export function validateQrOptions({
  format,
  size,
  bodyColor,
  bgColor,
  includeLogo = false,
  frameStyle = 'none',
}) {
  if (!['png', 'svg'].includes(format)) return { error: messages.INVALID_FORMAT };
  if (!Number.isInteger(size) || ![500, 1000, 1500, 2000].includes(size)) {
    return { error: messages.INVALID_SIZE };
  }
  if (!/^#[0-9a-f]{6}$/i.test(bodyColor) || !/^#[0-9a-f]{6}$/i.test(bgColor)) {
    return { error: messages.INVALID_COLOR };
  }
  if (typeof includeLogo !== 'boolean' || !['none', 'label'].includes(frameStyle)) {
    return { error: messages.INVALID_STYLE };
  }
  const foreground = relativeLuminance(bodyColor);
  const background = relativeLuminance(bgColor);
  const contrast = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  if (background <= foreground || contrast < 4.5) return { error: messages.LOW_COLOR_CONTRAST };
  return {
    options: {
      format,
      size,
      bodyColor: bodyColor.toUpperCase(),
      bgColor: bgColor.toUpperCase(),
      includeLogo,
      frameStyle,
    },
  };
}

// Used only when this module is initialized without the browser QR adapter.
async function unavailable() {
  throw Object.assign(new Error('QR generator unavailable'), { code: 'QR_GENERATION_ERROR' });
}

export function initQrForm(document, {
  generate = unavailable,
  revokeObjectUrl = () => {},
  scrollToResult = () => {},
  copyImage,
  canCopyImage = false,
} = {}) {
  const form = document.querySelector('#qr-form');
  const input = document.querySelector('#url');
  const errorText = document.querySelector('#url-error');
  const status = document.querySelector('#form-status');
  const button = document.querySelector('#generate-button');
  const buttonLabel = document.querySelector('#generate-label');
  const spinner = button.querySelector('.spinner');
  const result = document.querySelector('#qr-result');
  const preview = document.querySelector('#qr-preview');
  const summary = document.querySelector('#result-url');
  const download = document.querySelector('#download-button');
  const another = document.querySelector('#another-button');
  const format = document.querySelector('#format');
  const size = document.querySelector('#size');
  const template = document.querySelector('#template');
  const bodyColor = document.querySelector('#body-color');
  const bgColor = document.querySelector('#background-color');
  const includeLogo = document.querySelector('#include-logo');
  const frameStyle = document.querySelector('#frame-style');
  const colorHelp = document.querySelector('#color-help');
  const copyButton = document.querySelector('#copy-button');
  const downloadLabel = document.querySelector('#download-label');
  const optionControls = [format, size, template, bodyColor, bgColor, includeLogo, frameStyle];
  let loading = false;
  let currentObjectUrl = null;
  let currentOutput = null;

  function revokeCurrentObjectUrl() {
    if (!currentObjectUrl) return;
    const objectUrl = currentObjectUrl;
    currentObjectUrl = null;
    revokeObjectUrl(objectUrl);
  }
  function hideResult() {
    revokeCurrentObjectUrl();
    result.hidden = true;
    preview.removeAttribute('src');
    summary.textContent = '';
    currentOutput = null;
    download.removeAttribute('href');
    download.setAttribute('aria-disabled', 'true');
    download.tabIndex = -1;
    downloadLabel.textContent = 'Tải PNG';
    copyButton.hidden = true;
    copyButton.disabled = true;
  }
  function clearError() {
    errorText.textContent = '';
    input.removeAttribute('aria-invalid');
  }
  function setLoading(value) {
    loading = value;
    button.disabled = value;
    input.readOnly = value;
    optionControls.forEach((control) => { control.disabled = value; });
    form.setAttribute('aria-busy', String(value));
    spinner.hidden = !value;
    buttonLabel.textContent = value ? 'Đang tạo mã QR…' : 'Tạo mã QR';
    status.textContent = value ? 'Đang tạo mã QR…' : '';
  }
  function readOptions() {
    return validateQrOptions({
      format: format.value,
      size: Number(size.value),
      bodyColor: bodyColor.value,
      bgColor: bgColor.value,
      includeLogo: includeLogo.checked,
      frameStyle: frameStyle.value,
    });
  }
  function updateColorHelp() {
    const validation = readOptions();
    colorHelp.textContent = validation.error || 'Chọn mã tối trên nền sáng để quét tốt hơn.';
    colorHelp.classList.toggle('error', Boolean(validation.error));
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (loading) return;
    clearError();
    hideResult();
    status.textContent = '';
    const validation = validateInput(input.value);
    if (validation.error) {
      errorText.textContent = validation.error;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    const optionValidation = readOptions();
    if (optionValidation.error) {
      errorText.textContent = optionValidation.error;
      format.focus();
      return;
    }
    setLoading(true);
    try {
      const output = await generate(validation.url, optionValidation.options);
      if (!output?.imageUrl) throw new Error('Missing image');
      preview.src = output.imageUrl;
      currentObjectUrl = output.revokeOnDispose ? output.imageUrl : null;
      currentOutput = output;
      summary.textContent = validation.url;
      download.href = output.imageUrl;
      download.download = output.filename || 'tung-thien-qr.png';
      download.setAttribute('aria-disabled', 'false');
      download.removeAttribute('tabindex');
      downloadLabel.textContent = `Tải ${output.format?.toUpperCase() || 'PNG'}`;
      copyButton.hidden = !(canCopyImage && output.contentType === 'image/png');
      copyButton.disabled = copyButton.hidden;
      result.hidden = false;
      scrollToResult();
    } catch (error) {
      errorText.textContent = Object.hasOwn(messages, error?.code) ? messages[error.code] : messages.INTERNAL_ERROR;
    } finally {
      setLoading(false);
    }
  });
  input.addEventListener('input', () => {
    if (loading) return;
    clearError();
    hideResult();
  });
  optionControls.forEach((control) => control.addEventListener('change', () => {
    if (loading) return;
    if (control === template && qrTemplates[template.value]) {
      const selectedTemplate = qrTemplates[template.value];
      bodyColor.value = selectedTemplate.bodyColor;
      bgColor.value = selectedTemplate.bgColor;
      includeLogo.checked = selectedTemplate.includeLogo;
      frameStyle.value = selectedTemplate.frameStyle;
    }
    if ([bodyColor, bgColor, includeLogo, frameStyle].includes(control)) template.value = 'custom';
    clearError();
    updateColorHelp();
    hideResult();
  }));
  another.addEventListener('click', () => {
    hideResult();
    clearError();
    input.focus();
    input.select();
  });
  download.addEventListener('keydown', (event) => {
    if (event.key === ' ' && download.getAttribute('aria-disabled') !== 'true') {
      event.preventDefault();
      download.click();
    }
  });
  copyButton.addEventListener('click', async () => {
    if (!currentOutput || copyButton.disabled || !copyImage) return;
    copyButton.disabled = true;
    status.textContent = 'Đang sao chép ảnh QR…';
    try {
      await copyImage(currentOutput);
      status.textContent = 'Đã sao chép ảnh QR.';
    } catch {
      status.textContent = 'Trình duyệt chưa thể sao chép ảnh. Hãy dùng nút tải xuống.';
    } finally {
      if (currentOutput && !copyButton.hidden) copyButton.disabled = false;
    }
  });
  document.defaultView?.addEventListener('pagehide', revokeCurrentObjectUrl);
  updateColorHelp();
  hideResult();
}
