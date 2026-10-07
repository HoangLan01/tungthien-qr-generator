# Phase 07 — Kết quả V1.1 Enhancements

Ngày kiểm tra: 07/10/2026.

## Đã triển khai

- Đặt format, kích thước, màu QR/nền vào `<details>` **Tùy chọn nâng cao** đóng mặc định;
  flow cơ bản vẫn chỉ là URL → Tạo mã QR → tải.
- Hỗ trợ PNG và SVG. PNG dùng để preview/copy; SVG nhận MIME đúng, preview được và tải với
  filename `.svg`.
- Chỉ nhận size preset 500, 1000, 1500, 2000 px. Default là 1000 px.
- Có ba màu gợi ý: đen-trắng, xanh dương, xanh lá; người dùng có thể đổi hai color picker.
  Client và backend cùng kiểm tra hex `#RRGGBB`, nền sáng hơn mã và contrast tối thiểu 4.5:1.
  Backend là nguồn kiểm tra cuối, nên request thủ công không thể bypass limit/contrast.
- Payload QRCode Monkey nhận `file`, `size`, `config.bodyColor`, `config.bgColor` sau validation;
  client không truyền shape/logo/error-correction/config tùy ý.
- Nút **Sao chép ảnh** chỉ hiện khi browser có Clipboard API trong HTTPS secure context và output
  là PNG. Lỗi capability/permission chỉ hướng dẫn tải xuống, không lộ detail nội bộ.
- Bổ sung dark mode theo system preference, nhưng khung preview QR luôn trắng.
- Thêm manifest, SVG icon và service worker. Service worker không gọi Cache Storage và không
  `respondWith`, do đó không cache QR/API response/Blob URL.
- Cập nhật [API contract](03-API-CONTRACT.md) cho fields/mã lỗi V1.1.

Clipboard image cần secure context và browser có thể yêu cầu user activation/permission;
đó là lý do nút chỉ có điều kiện. Tham khảo [MDN Clipboard.write](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write)
và [ClipboardItem](https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem).

## Kiểm tra đã chạy

Môi trường: Windows PowerShell, Node.js 22.14.0, npm 11.7.0.

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | 52/52 đạt |
| `npm run check` | Đạt, gồm validator V1.1 và service worker |
| `npm audit` | 0 lỗ hổng tại thời điểm kiểm tra |
| `git diff --check` | Đạt; cảnh báo LF/CRLF tài liệu không phải lỗi whitespace |
| Server validation | format, size, hex, contrast, MIME, response binary và no-store |
| Client/DOM | PNG/SVG request/filename, option payload, preview/download, copy conditional, Blob revoke |
| PWA privacy | manifest JSON đúng, worker không dùng Cache Storage/API cache |
| Vercel build | Có manifest, icon, worker và runtime config trong output frontend |

Build/test dùng mock provider và mock Clipboard API, không gọi RapidAPI hoặc tạo/quét ảnh QR thật.

## Không triển khai trong Phase 07 này

- Upload logo: cần multipart endpoint, size/MIME/image validation, timeout, cleanup và privacy
  policy riêng; chưa mở surface upload ở client/backend.
- Local QR fallback: không thay provider QRCode Monkey khi upstream lỗi.
- Template shape/logo: các hình dạng QR phải có bằng chứng scan trước khi public.
- SVG copy: support Clipboard cho SVG khác nhau giữa browser nên chỉ copy PNG.

## Chưa xác minh

- Chưa có browser/device kết nối để kiểm tra visual dark mode, details, PWA install prompt hoặc
  copy ảnh trên browser thật.
- Chưa có RapidAPI key/provider response nên chưa quét PNG/SVG cho từng size/màu.
- Chưa kiểm tra Chrome desktop/Edge/Chrome Android/Safari iPhone, đặc biệt Clipboard/PWA/SVG.
- Phase 06 production deployment, HTTPS, DNS/VPS, QR scan và device matrix vẫn chưa có live
  evidence. Dù user đã yêu cầu implementation V1.1, không nên go-live template màu mới trước
  khi scan trên thiết bị thật.

V1.1 implementation đã hoàn thành trong source. Không commit hoặc push thay đổi.
