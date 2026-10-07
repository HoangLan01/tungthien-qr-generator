# Phase 01 — Kết quả triển khai

Ngày kiểm tra: 07/10/2026.

## Đã hoàn thành

- Khởi tạo package và lockfile, `.gitignore`, `.env.example`, `public/`, `src/`, `tests/`.
- Trang placeholder tiếng Việt đúng tên và mô tả sản phẩm; CSS riêng, không tài nguyên ngoài.
- Express phục vụ duy nhất thư mục `public/` cho static assets.
- Tách `src/app.js` để kiểm thử app, `src/server.js` để load cấu hình và mở cổng.
- Đọc `.env` ở thư mục dự án, kiểm tra PORT; chạy được khi chưa có `.env`/API key.
- Helmet, JSON body limit 16 KB, 404 và error handler tập trung; không trả raw error/body/stack.
- `GET /health` trả `200` và `{ "status": "ok" }`, không gọi provider.
- `POST /api/qr` placeholder trả `503 / QR_SERVICE_UNAVAILABLE`; các response `/api` dùng `no-store`.
- Không thêm database, logger ghi URL hoặc API key.
- Hướng dẫn PowerShell và trạng thái thực tế trong README.

## Lựa chọn triển khai

- Dùng Node test runner + Supertest theo tùy chọn của Phase 01.
- Dùng `node --watch` thay `nodemon`. Bản nodemon được kiểm tra kéo theo cảnh báo
  audit mức high qua chokidar/braces; sau khi bỏ nodemon, audit còn 0 lỗ hổng.
- Node watch theo dõi mã server được import; sửa `.env` cần khởi động lại thủ công.
- Helmet bật nâng cấp HTTPS/HSTS ở production, tắt hai mục này khi chạy HTTP local.
- `express-rate-limit` đã được cài; middleware giới hạn request thuộc phase sau.
- Các biến QR/provider/rate limit trong `.env.example` được chuẩn bị cho phase sau.
- Mã lỗi hạ tầng ngoài contract QR: `NOT_FOUND`, `INVALID_JSON`, `UNSUPPORTED_MEDIA_TYPE`.

Tham khảo cách tổ chức middleware từ [Express](https://expressjs.com/en/guide/using-middleware/)
và bộ kiểm thử tích hợp từ [Node.js](https://nodejs.org/download/release/v22.17.0/docs/api/test.html).

## Kết quả xác minh

Môi trường: Windows PowerShell, Node.js 22.14.0, npm 11.7.0.

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | 9/9 đạt |
| `npm run check` | Đạt kiểm tra cú pháp các module server |
| `npm audit` | 0 lỗ hổng tại thời điểm kiểm tra |
| `git diff --check` | Đạt; Git chỉ nhắc chuyển LF sang CRLF cho README |
| `git check-ignore` | `.env`, `.env.local`, `node_modules` bị ignore; `.env.example` không bị ignore |
| `npm run dev` | Khởi động thành công tại cổng kiểm tra 3137, không có `.env`/API key |
| HTTP `/` và `/health` | 200; nội dung tiếng Việt UTF-8 đúng, health đúng JSON |
| HTTP `POST /api/qr` | 503 với mã placeholder đúng contract |
| HTTP `/.env` | 404 |
| `npm start` | Khởi động thành công tại cổng 3138, `/health` trả 200 |

Các test tự động bao gồm static HTML/CSS, security headers, health, QR placeholder,
404/private files, JSON lỗi, body quá lớn, lỗi nội bộ không lộ chi tiết và PORT.
Các server dùng để kiểm tra đã được dừng sau khi hoàn tất.

## Chưa xác minh và phạm vi còn lại

- Chưa kiểm tra trực quan bằng trình duyệt hoặc thiết bị thật; HTTP test không thay thế visual QA.
- Chưa tạo QR thật, quét QR hoặc kiểm tra download: thuộc Phase 03–04 và nghiệm thu Phase 06.
- Chưa áp dụng rate limit, triển khai HTTPS hoặc đưa lên VPS.
- Chưa triển khai Phase 02 hay các phase sau, chưa commit/push.

Phần mã nguồn nền tảng của Phase 01 đã hoàn thành. Bước kế tiếp theo kế hoạch là
Phase 02 — UI/UX khi người dùng yêu cầu.
