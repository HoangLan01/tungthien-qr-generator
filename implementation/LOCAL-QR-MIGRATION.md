# Migration — local QR generator

Ngày thay đổi: 08/10/2026.

## Thay đổi kiến trúc

Ứng dụng không còn gọi QRCode Monkey/RapidAPI. `POST /api/qr` giờ tạo static QR ngay trong
Node.js bằng package [`qrcode`](https://github.com/soldair/node-qrcode), license MIT.

```text
Browser → VPS API → local qrcode library → PNG/SVG → Browser
```

## Không còn cần

- Tài khoản hoặc subscription RapidAPI.
- `RAPIDAPI_KEY`.
- `QRCODE_MONKEY_API_BASE` và `QRCODE_MONKEY_API_HOST`.
- QR provider quota, network timeout hoặc QR provider error mapping.

## Giữ nguyên

- URL validation, SSRF boundary, JSON body limit, rate limit, no-store, Helmet/CSP và CORS.
- PNG/SVG, preset size, color/contrast validation, Blob preview/download và Vercel + VPS deployment topology.
- Rate limit vẫn cần thiết để bảo vệ CPU/RAM VPS trước request abuse.

## Cấu hình hiện tại

```env
PORT=3000
QR_DEFAULT_SIZE=1000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=20
```

Local và VPS tạo QR thật ngay khi cài dependencies. `QR_DEFAULT_SIZE` chỉ nhận các preset
500, 1000, 1500, 2000.

## Xác minh

- Test suite tạo PNG có signature PNG và SVG có XML thật bằng local generator.
- Không có network client hoặc provider key trong service local.
- Chưa thay thế yêu cầu quét QR trên thiết bị thật trước go-live.

Các tài liệu phase cũ mô tả RapidAPI là lịch sử quyết định ban đầu; tài liệu này, README,
API contract và deployment runbook là hướng dẫn hiện hành.
