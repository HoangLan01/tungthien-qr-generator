# Phase 03 — Kết quả tích hợp QRCode Monkey API

Ngày kiểm tra: 07/10/2026.

## Đã triển khai

- Thêm `src/utils/validateUrl.js`: trim, chỉ nhận string HTTP/HTTPS có hostname,
  giới hạn 8–4096 ký tự. Validator không resolve DNS và không fetch URL người dùng.
- Thêm `src/services/qrCodeMonkey.service.js`: tạo payload preset cố định, gọi
  `POST /qr/custom`, thêm `X-RapidAPI-Key`/`X-RapidAPI-Host` ở server, timeout với
  `AbortController`, kiểm tra HTTP status và MIME trước khi trả binary.
- `POST /api/qr` nay nhận JSON `{ "url", "format" }`; default là PNG, hỗ trợ PNG/SVG
  theo API contract. Client không thể truyền config, size hay header provider.
- Response thành công giữ `Cache-Control: no-store`, trả `image/png` hoặc
  `image/svg+xml`. Không thêm `Content-Disposition`; Phase 04 tải file qua Blob URL.
- Configuration chỉ đọc từ process environment: `RAPIDAPI_KEY`,
  `QRCODE_MONKEY_API_BASE`, `QRCODE_MONKEY_API_HOST`; base URL phải HTTPS.
  Thiếu/không hợp lệ bất kỳ biến nào thì không gọi upstream và trả 503.
- Bổ sung timeout 1–60 giây (default 10 giây), size 100–5000 px (default 1000 px).
  Giá trị cấu hình không hợp lệ cũng làm provider unavailable thay vì dùng giá trị mơ hồ.
- Map lỗi: HTTP 401/403/429 hoặc lỗi mạng thành `503 / QR_SERVICE_UNAVAILABLE`,
  HTTP lỗi/provider MIME sai thành `502 / QR_PROVIDER_ERROR`, timeout thành
  `504 / QR_PROVIDER_TIMEOUT`. API không trả body upstream, key, URL hay stack trace.
- API yêu cầu `Content-Type: application/json`; content type khác trả 415.
- Không thay đổi frontend fetch: Phase 04 mới nối form vào API, tạo Blob preview và tải PNG.

QRCode Monkey hiện mô tả `POST /qr/custom` nhận JSON, hỗ trợ PNG/SVG và trả binary image.
Payload implementation dùng `body: square`, QR đen `#000000` và nền trắng `#FFFFFF`,
phù hợp preset MVP và khuyến cáo nền sáng để quét ổn định.

Nguồn: [QRCode Monkey API documentation](https://www.qrcode-monkey.com/qr-code-api-with-logo/),
[RapidAPI endpoint](https://rapidapi.com/qrcode-monkey/api/custom-qr-code-with-logo/playground/apiendpoint_4ccd5783-5d09-4776-923b-86f6d23e6594).

## Kiểm tra đã chạy

Môi trường: Windows PowerShell, Node.js 22.14.0, npm 11.7.0.

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | 30/30 đạt |
| `npm run check` | Đạt, gồm service và URL validator mới |
| `npm audit` | 0 lỗ hổng tại thời điểm kiểm tra |
| `git diff --check` | Đạt; cảnh báo LF/CRLF cho README không phải lỗi whitespace |
| Service unit test | Payload POST, headers RapidAPI, binary PNG/SVG và MIME đúng |
| Error unit test | Missing config, format sai, HTTP 400/401/403/429/500, lỗi mạng, timeout |
| Route integration test | URL/format invalid không gọi service; default PNG, SVG, binary, no-store và lỗi không lộ key/detail |
| Live local smoke test (không có `.env`) | `/health` 200; URL hợp lệ 503, URL/format sai 400; response không phản chiếu URL private |

Mock upstream dùng `Response` trong Node test runner. Không có request RapidAPI nào được gửi
khi chạy test hoặc smoke test.

## Cấu hình và xác minh thật còn lại

Không có RapidAPI key hoặc snippet đã xác thực trong workspace, nên không thể chứng minh
base URL/host hiện hành bằng một request thật. Cần người có quyền RapidAPI làm một lần:

1. Trong RapidAPI, mở snippet hiện hành cho endpoint **POST Create Custom QR Code**.
2. Điền chính xác `RAPIDAPI_KEY`, `QRCODE_MONKEY_API_BASE` và `QRCODE_MONKEY_API_HOST` vào `.env`.
3. Restart `npm run dev`, chạy request PowerShell ở README với `https://example.com`.
4. Xác nhận HTTP 200, `Content-Type: image/png`, mở và quét ảnh; kiểm tra browser network
   chỉ gọi origin nội bộ `/api/qr`, không có key trong client.

Không gửi `.env` hoặc API key vào chat/Git. Verification trên RapidAPI có thể tiêu quota và
phụ thuộc subscription hiện tại, vì vậy không được thực hiện trong lần triển khai này.

## Chưa thuộc Phase 03

- Frontend `fetch('/api/qr')`, Blob URL, preview, download filename và Safari iOS: Phase 04.
- Rate limit request, logging request ID không chứa URL, CSP tinh chỉnh: Phase 05.
- QR scan trên iOS/Android, browser/device matrix và HTTPS deployment: Phase 06.
- Chưa commit hoặc push thay đổi.
