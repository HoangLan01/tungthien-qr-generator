import { initQrForm } from './qr-form.js';
import { canCopyQrImage, copyQrImage, requestQr } from './qr-api.js';

function scrollToResult() {
  if (!window.matchMedia?.('(max-width: 480px)').matches) return;
  document.getElementById('qr-result').scrollIntoView({
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });
}

initQrForm(document, {
  generate: requestQr,
  revokeObjectUrl: URL.revokeObjectURL.bind(URL),
  scrollToResult,
  canCopyImage: canCopyQrImage(),
  copyImage: copyQrImage,
});

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
