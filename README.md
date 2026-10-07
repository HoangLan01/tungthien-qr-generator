# Tùng Thiện QR Generator

## Mục tiêu

**Tùng Thiện QR Generator** là một công cụ web nhỏ để tạo mã QR miễn phí cho người dùng cuối, không quảng cáo, không yêu cầu đăng nhập và không lưu trữ đường link mà người dùng nhập.

Luồng sử dụng cốt lõi:

> Nhập đường link → Nhấn **Tạo mã QR** → Xem mã QR → Nhấn **Tải xuống**

Phiên bản MVP chỉ tập trung vào URL `http://` và `https://`, ưu tiên trải nghiệm đơn giản trên điện thoại.

## Kiến trúc được khuyến nghị

- Frontend: HTML + CSS + JavaScript thuần.
- Backend: Node.js 20+ + Express.
- QR engine: QRCode Monkey API thông qua RapidAPI.
- Backend đóng vai trò proxy để không làm lộ RapidAPI key.
- Triển khai production: static frontend trên Vercel; VPS chỉ phục vụ API `/api/qr` và `/health`.
- HTTPS bắt buộc cho cả frontend và API khi đưa lên môi trường thật.

## Bộ tài liệu

Các tài liệu bên dưới nằm trong thư mục `implementation/`.

1. `00-PROJECT-PLAN.md` — kế hoạch tổng thể.
2. `01-REQUIREMENTS.md` — yêu cầu chức năng và phi chức năng.
3. `02-TECHNICAL-ARCHITECTURE.md` — kiến trúc kỹ thuật.
4. `03-API-CONTRACT.md` — hợp đồng API nội bộ và cách tích hợp QRCode Monkey.
5. `PHASE-01-FOUNDATION.md` — khởi tạo dự án và nền tảng.
6. `PHASE-02-UI-UX.md` — xây dựng giao diện.
7. `PHASE-03-QR-API-INTEGRATION.md` — tích hợp QRCode Monkey.
8. `PHASE-04-PREVIEW-DOWNLOAD.md` — preview, download và xử lý lỗi.
9. `PHASE-05-SECURITY-PRIVACY.md` — bảo mật, quyền riêng tư, chống lạm dụng.
10. `PHASE-06-TEST-DEPLOY.md` — kiểm thử, triển khai và vận hành.
11. `PHASE-07-V1-1-ENHANCEMENTS.md` — tính năng mở rộng sau MVP.
12. `CHECKLIST.md` — checklist nghiệm thu.

## Chạy local

Yêu cầu: Node.js 20+ và npm. Đã kiểm tra trên Node.js 22.14.0, npm 11.7.0.

Chạy trong **PowerShell tại thư mục dự án**:

```powershell
npm ci
if (-not (Test-Path -LiteralPath .env)) {
    Copy-Item -LiteralPath .env.example -Destination .env
}
npm run dev
```

Mở `http://localhost:3000`. Dùng `Ctrl+C` để dừng server.
Nếu cổng đang bận, sửa `PORT` trong `.env` hoặc chạy `$env:PORT='3100'` trước khi khởi động.
Biến môi trường của process được ưu tiên hơn `.env`.

Bản hiện tại chạy được khi chưa có `.env` hoặc API key. Các biến QR/quota trong
`.env.example` được dùng để cấu hình provider ở server. `PORT` vẫn có thể dùng riêng khi
chưa tích hợp RapidAPI.
Không đưa API key vào frontend hoặc commit `.env`.

## Bật tạo QR thật — Phase 03

Sau khi đăng ký API trên RapidAPI, mở snippet request **hiện hành** của “Custom QR Code with Logo”
và sao chép chính xác base URL cùng `X-RapidAPI-Host` vào `.env`. Chỉ điền các biến server sau:

```env
RAPIDAPI_KEY=your-rapidapi-key
QRCODE_MONKEY_API_BASE=https://base-url-from-current-rapidapi-snippet
QRCODE_MONKEY_API_HOST=host-from-current-rapidapi-snippet
```

Không ghi key vào `public/`, HTML, JavaScript client hoặc bất kỳ tài liệu Git nào.
Khởi động lại server sau khi sửa `.env`.

## Bảo mật và quota — Phase 05

`POST /api/qr` được giới hạn mặc định **20 request mỗi IP trong 60 giây** để bảo vệ
quota provider. Có thể điều chỉnh trên server trong `.env`:

```env
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=20
```

Khi vượt giới hạn, endpoint trả `429 / RATE_LIMITED` và browser hiển thị thông báo thử lại.
Không đặt các biến này hoặc API key trong frontend. Ứng dụng không bật `trust proxy` mặc định;
việc cấu hình client IP sau Nginx/Caddy thuộc kiểm tra triển khai Phase 06.

## Tùy chọn nâng cao — V1.1

Mở **Tùy chọn nâng cao** trên form để chọn PNG/SVG, preset 500/1000/1500/2000 px
và hai màu QR/nền. Nền phải sáng hơn mã, với contrast tối thiểu 4.5:1; backend kiểm tra
lại các giá trị này trước khi gọi provider. Các màu gợi ý chỉ là điểm bắt đầu: QR vẫn phải
được quét thật trước khi sử dụng trong tài liệu hoặc in ấn.

Nút **Sao chép ảnh** chỉ xuất hiện cho PNG khi browser hỗ trợ Clipboard API trên HTTPS.
Manifest/PWA có service worker không dùng Cache Storage, do đó không cache response QR hoặc
Blob URL người dùng. Upload logo, local QR fallback và template có logo chưa được triển khai.

Để kiểm tra endpoint backend bằng **PowerShell**, khi server đang chạy:

```powershell
$requestBody = @{ url = 'https://example.com'; format = 'png' } | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:3000/api/qr -Method Post `
    -ContentType 'application/json' -Body $requestBody -OutFile .\tung-thien-qr.png
```

Lệnh trên chỉ dùng sau khi đã có cấu hình RapidAPI hợp lệ. Endpoint trả binary
`image/png` hoặc `image/svg+xml`, đặt `Cache-Control: no-store`, và không fetch URL
được mã hóa. Frontend hiện yêu cầu PNG từ API origin công khai cấu hình khi build Vercel,
hiển thị preview qua Blob URL và tạo link tải tạm; không có API key trong browser.

Các lệnh khác:

```powershell
npm start
npm test
npm run check
```

`npm start` chạy server thông thường; `npm run dev` dùng Node watch để tự khởi động lại
khi mã server thay đổi. Sau khi sửa `.env`, cần khởi động lại server thủ công.
Kiểm thử dùng Node test runner, Supertest và jsdom (chỉ dành cho test DOM, không đưa vào frontend).

Trong **cửa sổ PowerShell thứ hai**, khi server đang chạy:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/health
```

Kết quả mong đợi: `status = ok`.

## Trạng thái triển khai

- Phase 01: có Express server, Helmet, giới hạn JSON 16 KB,
  `/health`, 404 và middleware xử lý lỗi tập trung.
- Phase 02: trang chính đã có form URL, validation tiếng Việt, trạng thái loading/lỗi,
  vùng kết quả, nút Tải PNG/Tạo mã khác và CSS responsive.
- Phase 03: backend validate URL/format, gửi preset QR cố định tới `POST /qr/custom`
  qua RapidAPI, timeout, kiểm tra MIME binary và map lỗi provider về API contract.
  Endpoint cần ba biến provider trong `.env`; khi thiếu hoặc sai cấu hình trả
  `503 / QR_SERVICE_UNAVAILABLE` mà không gọi upstream.
- Phase 04: frontend gọi `/api/qr` ở API origin đã cấu hình để lấy PNG binary, tạo Blob URL cho
  preview/tải xuống, đặt filename theo ngày và thu hồi Blob URL khi thay hoặc rời trang.
  URL hợp lệ vẫn sẽ báo lỗi thân thiện khi thiếu/sai cấu hình provider.
- Phase 05: rate limit chỉ cho `POST /api/qr`, giới hạn body 16 KB, CSP cùng origin
  (cho phép `blob:` riêng cho preview), Helmet headers và response API `no-store`.
  Không có database, analytics, session replay hoặc access logger chứa URL.
- Lỗi hạ tầng bổ sung: `NOT_FOUND` (404), `INVALID_JSON` (400),
  `UNSUPPORTED_MEDIA_TYPE` (415); lỗi body quá lớn dùng `INPUT_TOO_LONG` (413).
- Triển khai HTTPS, reverse proxy client IP, QR scan thật và browser/device matrix thuộc Phase 06.
- Phase 06: build frontend riêng cho Vercel, VPS API-only, CORS exact-origin, Nginx/systemd
  templates, build/smoke checks và runbook triển khai. Chưa deploy vì repository không có
  Vercel project, domain, VPS access hoặc RapidAPI secret.
- Phase 07: tùy chọn PNG/SVG, size, màu/preset tương phản, copy PNG có điều kiện, dark mode,
  manifest và service worker không cache QR. Upload logo/local fallback/template hình dạng chỉ
  thực hiện sau khi có scope upload và bằng chứng quét thực tế.

Kết quả kiểm tra và phần chưa xác minh:
[Báo cáo Phase 01](implementation/PHASE-01-RESULTS.md),
[Báo cáo Phase 02](implementation/PHASE-02-RESULTS.md),
[Báo cáo Phase 03](implementation/PHASE-03-RESULTS.md),
[Báo cáo Phase 04](implementation/PHASE-04-RESULTS.md),
[Báo cáo Phase 05](implementation/PHASE-05-RESULTS.md),
[Báo cáo Phase 06](implementation/PHASE-06-RESULTS.md),
[Báo cáo Phase 07](implementation/PHASE-07-RESULTS.md).

## Deploy Vercel + VPS

Runbook tách frontend Vercel và backend VPS: [deployment/README.md](deployment/README.md).
Vercel cần `QR_API_BASE_URL=https://api.example.vn` ở Production; VPS cần exact
`CORS_ALLOWED_ORIGINS=https://qr.example.vn`, `SERVE_STATIC=false` và
`TRUST_PROXY=loopback`. Không đặt RapidAPI key ở Vercel.

## Nguyên tắc sản phẩm

- Không quảng cáo.
- Không pop-up gây phiền.
- Không yêu cầu tài khoản.
- Không gắn tracking vào QR.
- Không lưu URL của người dùng vào database.
- Không để API key trong frontend.
- Giao diện ưu tiên mobile-first.
- Mã QR phải quét được trước khi coi là hoàn thành.

## Lưu ý về “miễn phí”

QRCode Monkey xác nhận QR được tạo là QR tĩnh, có thể dùng miễn phí và không giới hạn lượt quét. Tuy nhiên API chính thức được cung cấp qua RapidAPI, vì vậy chi phí/quota gọi API phụ thuộc gói RapidAPI đang áp dụng tại thời điểm triển khai.

Do đó, “miễn phí” trong sản phẩm này được hiểu là **người dùng cuối không phải trả phí và không xem quảng cáo**. Backend vẫn cần có cơ chế rate limit và theo dõi quota API để tránh phát sinh chi phí ngoài ý muốn.

## Tài liệu chính thức

- QRCode Monkey API: https://www.qrcode-monkey.com/qr-code-api-with-logo/
- QRCode Monkey: https://www.qrcode-monkey.com/
- RapidAPI listing: https://rapidapi.com/qrcode-monkey/api/custom-qr-code-with-logo
