# Phase 05 — Kết quả Security, Privacy và chống lạm dụng

Ngày kiểm tra: 07/10/2026.

## Đã triển khai

- Áp dụng `express-rate-limit` riêng cho `POST /api/qr`: mặc định 20 request/IP/60 giây.
  `GET /health`, frontend static và những route khác không bị giới hạn bởi middleware này.
  Vượt limit trả JSON chuẩn `429 / RATE_LIMITED`, không phản chiếu URL request.
- Đọc `RATE_LIMIT_WINDOW_MS` và `RATE_LIMIT_MAX` từ environment. Mặc định an toàn là
  60.000 ms/20; không chấp nhận cấu hình không phải số, window dưới 1 giây hoặc max dưới 1.
  Server dừng khởi động với thông báo generic nếu cấu hình rate limit không hợp lệ.
- Không bật `trust proxy`; điều này tránh tin header client IP không đáng tin trên local/direct
  connection. Khi triển khai Nginx/Caddy ở Phase 06, cần cấu hình chính xác proxy tin cậy để
  rate limit nhận client IP thật, không bật proxy trust rộng rãi.
- CSP dùng các nguồn cần thiết: `default-src 'self'`, `connect-src 'self'`,
  `img-src 'self' blob:`, script/style cùng origin, không object. `blob:` chỉ phục vụ
  QR preview của Phase 04; không whitelist CDN/font/image ngoài.
- Helmet tiếp tục đặt các security headers. Test xác nhận `X-Content-Type-Options: nosniff`
  và `Referrer-Policy: no-referrer`; HSTS/HTTPS upgrade chỉ bật khi `NODE_ENV=production`.
- Giữ body JSON tối đa 16 KB, validate server-side HTTP/HTTPS, no-store cho `/api`,
  lỗi generic và không lộ upstream headers/key/stack trace/path.
- Không thêm database, analytics, session replay, cookie banner hoặc access logger.
  Mã nguồn không log raw URL; URL chỉ được chuyển nhất thời trong trường `data` khi server
  cần gọi QR provider, không được server fetch như một tài nguyên.

Tham khảo cấu hình scoped middleware/rate-limit và lưu ý reverse proxy từ
[express-rate-limit](https://github.com/express-rate-limit/express-rate-limit/blob/main/docs/quickstart/usage.mdx).
CSP được cấu hình theo [Helmet documentation](https://github.com/helmetjs/helmet/blob/main/README.md).

## Kiểm tra đã chạy

Môi trường: Windows PowerShell, Node.js 22.14.0, npm 11.7.0.

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | 37/37 đạt |
| `npm run check` | Đạt, gồm middleware rate limit mới |
| `npm audit` | 0 lỗ hổng tại thời điểm kiểm tra |
| `git diff --check` | Đạt; cảnh báo LF/CRLF cho README không phải lỗi whitespace |
| Rate-limit integration | 2 request thành công với limit test 2, request thứ ba 429/RATE_LIMITED, service chỉ gọi 2 lần |
| Scope integration | `/health` vẫn 200 sau khi route QR đạt limit |
| Privacy/error integration | 429 không chứa URL thử nghiệm hoặc raw detail; response API có `Cache-Control: no-store` |
| CSP/header test | `default-src`, `connect-src`, `img-src blob:`, `nosniff`, `no-referrer` đều có |
| Live local smoke test | Server chạy với `RATE_LIMIT_MAX=2`; response tuần tự 503, 503, 429; CSP/header đúng và URL không phản chiếu |

Server smoke test được dừng sau khi hoàn tất. Không gọi RapidAPI, không có key và không tiêu quota.

## Chưa xác minh

- Không có RapidAPI key/config trong workspace, chưa kiểm tra giới hạn cùng QR creation thật.
- Rate limiter hiện dùng MemoryStore của process; chưa kiểm tra nhiều process/container hoặc shared store.
- Chưa triển khai HTTPS, Nginx/Caddy hoặc cấu hình trusted proxy/client IP production.
- Không có browser/device kết nối để xác nhận CSP/preview/tải download trên Chrome, Android,
  Safari iOS; browser/device proof vẫn thuộc Phase 06.
- Chưa quét QR thật hoặc kiểm tra quota/subscription provider.

Phase 05 hoàn thành implementation và kiểm thử cục bộ. Không có thay đổi deployment,
không commit hoặc push. Phase tiếp theo theo kế hoạch là Phase 06 — test, deploy và vận hành.
