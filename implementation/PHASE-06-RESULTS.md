# Phase 06 — Kết quả Test, Deploy và vận hành

Ngày kiểm tra: 07/10/2026.

## Topology đã triển khai

```text
Browser
  ├─ HTTPS → Vercel: static frontend (dist-vercel/)
  └─ HTTPS → VPS API: Nginx → Node.js (/api/qr, /health) → RapidAPI
```

Vercel chỉ nhận frontend assets và `QR_API_BASE_URL` là HTTPS API origin công khai.
VPS giữ RapidAPI key trong environment file, tắt static serving (`SERVE_STATIC=false`),
giới hạn CORS theo exact frontend origin và dùng Nginx local proxy với `TRUST_PROXY=loopback`.

## Đã triển khai

- Tạo build Vercel `npm run build:vercel`. Script chỉ copy `public/` vào `dist-vercel/`,
  bắt buộc `QR_API_BASE_URL` là HTTPS origin không path/query/user-info và sinh
  `runtime-config.js` chứa duy nhất API origin công khai. `dist-vercel/` được Git ignore.
- Thêm `vercel.ts`: output static `dist-vercel`, security headers, CSP với `connect-src`
  giới hạn tới exact API origin, `blob:` cho QR preview, `no-referrer`, `nosniff`,
  `SAMEORIGIN` và Permissions Policy không dùng camera/geolocation/microphone.
- Frontend đọc runtime config trước module app và gọi API VPS trực tiếp. Không có RapidAPI key,
  provider host hoặc backend secret trong output Vercel.
- Thêm CORS backend exact-origin cho `/api/qr`, preflight `OPTIONS` chỉ cho POST/Content-Type;
  không dùng `Access-Control-Allow-Origin: *`. Origin không tin cậy trả 403 không lộ URL.
- Thêm `SERVE_STATIC=false` để VPS hoạt động API-only; `/health` vẫn hoạt động.
- Thêm `TRUST_PROXY=loopback` lựa chọn an toàn cho Nginx cùng host, để rate limit dùng client IP
  được Nginx truyền tiếp. Default vẫn `false`; không tin `X-Forwarded-For` khi không cấu hình.
- Thêm access log JSON tùy chọn `QR_ACCESS_LOG=true`, chỉ cho POST QR. Event chứa timestamp,
  request ID, status, duration, error code; không có URL, body, IP, key hoặc upstream body.
- Thêm Nginx HTTPS/API-only template, HTTP ACME bootstrap template, systemd service, VPS env mẫu
  và runbook [deployment/README.md](../deployment/README.md).

Vercel configuration và build dùng environment variables/build output theo tài liệu chính thức:
[Environment variables](https://vercel.com/docs/environment-variables),
[project configuration](https://vercel.com/docs/project-configuration/vercel-json),
[build configuration](https://vercel.com/docs/builds/configure-a-build).

## Kiểm tra đã chạy

Môi trường: Windows PowerShell, Node.js 22.14.0, npm 11.7.0.

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | 43/43 đạt |
| `npm run check` | Đạt syntax server, frontend, middleware, build script |
| `npm audit` | 0 lỗ hổng tại thời điểm kiểm tra |
| `git diff --check` | Đạt; cảnh báo LF/CRLF README không phải lỗi whitespace |
| Vercel build | Đạt với API origin mẫu HTTPS; `dist-vercel/` chỉ gồm 6 assets frontend |
| Build config validation | Từ chối API base trống, HTTP, path, query, user-info |
| Backend-only integration | Root 404, health 200, CORS preflight 204 cho origin allowlist, POST cross-origin đúng 503 khi chưa có provider config |
| CORS rejection | Origin ngoài allowlist 403, không header allow-origin, không phản chiếu URL |
| Safe operations log | X-Request-Id và JSON status/duration/error code; không URL/body/key |
| Existing API/unit coverage | Validator URL, format, timeout, upstream status/MIME, 16 KB body, no-store, CSP, rate limit và Blob lifecycle đều đạt |

Lệnh smoke local dùng service/config giả, không gọi RapidAPI, không tạo QR thật và đã đóng server sau kiểm tra.

## Chưa xác minh / chưa thực hiện

- Chưa deploy Vercel vì không có project/account kết nối, production domain hoặc public API domain.
- Chưa SSH/cài Nginx/systemd/Certbot trên VPS; templates và lệnh trong runbook chưa là bằng chứng
  runtime VPS.
- Chưa có RapidAPI key nên chưa tạo PNG production, tải file thật hay quét QR.
- Chưa kiểm tra HTTPS certificate, DNS, reverse proxy client IP, restart systemd hoặc Nginx syntax
  trên Linux thật.
- Chưa kiểm tra Chrome desktop/Edge/Chrome Android/Safari iPhone hoặc scanner camera thứ hai.
- Rate limit dùng MemoryStore theo Node process; nếu sau này chạy nhiều Node process/container,
  cần shared rate-limit store trước khi coi đây là quota control toàn hệ thống.
- Vercel Preview không được wildcard CORS vào production API. Dùng staging API riêng và exact
  Preview origin nếu cần test QR thật trong Preview.

## Điều kiện go-live

Chỉ coi MVP production hoàn thành khi [deployment/README.md](../deployment/README.md) đã được
thực hiện và xác minh: API/frontend HTTPS, health, generate PNG thật, preview, download,
quét ảnh preview và file tải bằng ít nhất hai scanner, browser/device matrix và browser network
không lộ key. Chưa commit hoặc push thay đổi.
