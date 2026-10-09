# Triển khai production — Vercel frontend + VPS API

Topology đã chuyển thành:

```text
Browser → https://qr.example.vn (Vercel static frontend)
        → https://api.example.vn/api/qr (VPS, Nginx → Node.js → local qrcode)
```

Vercel chỉ nhận frontend build và public API origin `QR_API_BASE_URL`. VPS tạo QR cục bộ,
nên không cần QR provider key. Không đưa `/etc/tung-thien-qr-api.env` hoặc `.env` vào Git/Vercel.

## Giá trị cần chọn trước

Thay các ví dụ trước khi chạy lệnh:

| Giá trị | Ví dụ | Dùng tại |
|---|---|---|
| Frontend origin | `https://qr.example.vn` | Vercel domain, `CORS_ALLOWED_ORIGINS` |
| API origin | `https://api.example.vn` | DNS VPS, Nginx, Vercel `QR_API_BASE_URL` |
| Code path VPS | `/var/www/tung-thien-qr-generator` | systemd |

Tạo DNS A/AAAA cho API origin trỏ về VPS. Dùng exact frontend origin, không dùng `*` hay
wildcard cho CORS. Nếu dùng domain `project.vercel.app` thay custom domain, điền chính xác
origin production đó vào `CORS_ALLOWED_ORIGINS`.

## VPS — Bash

Các lệnh sau chưa được chạy bởi repository. Chạy trên VPS Ubuntu/Debian sau khi source đã
được đưa lên bằng repository riêng của bạn.

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo useradd --system --home /var/www/tung-thien-qr-generator --shell /usr/sbin/nologin qrapp
sudo install -d -o qrapp -g qrapp /var/www/tung-thien-qr-generator
```

Đặt source đã kiểm tra vào `/var/www/tung-thien-qr-generator`, không có `.env`. Cài production
dependencies bằng user không đặc quyền:

```bash
cd /var/www/tung-thien-qr-generator
sudo -u qrapp npm ci --omit=dev
sudo -u qrapp npm test
```

Tạo secret environment file với quyền hạn chế. Sao chép mẫu
`deployment/tung-thien-qr-api.env.example`, sau đó thay toàn bộ placeholder:

```bash
sudo install -m 600 -o root -g qrapp /dev/null /etc/tung-thien-qr-api.env
sudoedit /etc/tung-thien-qr-api.env
```

Trong file này phải đặt `SERVE_STATIC=false`, `TRUST_PROXY=loopback`,
`QR_ACCESS_LOG=true`, exact `CORS_ALLOWED_ORIGINS` và `QR_DEFAULT_SIZE`. Kiểm tra Node binary
trước khi cài systemd; nếu kết quả không phải `/usr/bin/node`, sửa `ExecStart` trong service:

```bash
command -v node
```

Cài service và xác minh backend local trước:

```bash
sudo install -m 644 deployment/systemd/tung-thien-qr-api.service /etc/systemd/system/tung-thien-qr-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now tung-thien-qr-api
sudo systemctl status tung-thien-qr-api --no-pager
curl --fail http://127.0.0.1:3000/health
```

Tạo certificate qua HTTP bootstrap trước, rồi mới cài HTTPS config. Sao chép bootstrap
template, thay tất cả `api.example.vn`, kiểm tra cú pháp trước reload:

```bash
sudoedit /etc/nginx/sites-available/tung-thien-qr-api-bootstrap
sudo ln -s /etc/nginx/sites-available/tung-thien-qr-api-bootstrap /etc/nginx/sites-enabled/tung-thien-qr-api-bootstrap
sudo mkdir -p /var/www/certbot
sudo nginx -t
sudo systemctl reload nginx
```

Lấy certificate bằng webroot. Sau đó xóa bootstrap config, cài production template (có TLS
paths), kiểm tra và reload:

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d api.example.vn
sudo rm /etc/nginx/sites-enabled/tung-thien-qr-api-bootstrap
sudoedit /etc/nginx/sites-available/tung-thien-qr-api
sudo ln -s /etc/nginx/sites-available/tung-thien-qr-api /etc/nginx/sites-enabled/tung-thien-qr-api
sudo nginx -t
sudo systemctl reload nginx
curl --fail https://api.example.vn/health
```

Kiểm tra CORS preflight với frontend origin thật:

```bash
curl -i -X OPTIONS https://api.example.vn/api/qr \
  -H 'Origin: https://qr.example.vn' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type'
```

Kết quả mong đợi là `204`, `Access-Control-Allow-Origin` đúng origin và không có wildcard.
Endpoint QR tạo cục bộ, không tiêu quota API bên thứ ba. Vẫn cần giới hạn request để bảo vệ CPU VPS.

Theo dõi an toàn, không có URL/body:

```bash
sudo journalctl -u tung-thien-qr-api -f
```

Mỗi event `qr_request` chỉ có request ID, status, duration và error code. Dùng count status
429/5xx/`QR_GENERATION_ERROR` để theo dõi vận hành.

## Vercel — Dashboard

1. Tạo/import project từ repository, chọn **Other**. `vercel.ts` dùng `framework: null`
   cho preset này và chọn build command
   `npm run build:vercel` và output `dist-vercel`.
2. Trong **Settings → Environment Variables**, thêm biến production:

   ```text
   QR_API_BASE_URL=https://api.example.vn
   ```

   Đây là public API origin, không phải secret. Không cần thêm QR provider key vào Vercel.
3. Deploy production sau khi API HTTPS/CORS health check thành công.
4. Gắn frontend custom domain `qr.example.vn` (hoặc cập nhật exact `project.vercel.app`
   vào VPS `CORS_ALLOWED_ORIGINS`), sau đó redeploy frontend nếu origin/API URL đổi.

Vercel build cần `QR_API_BASE_URL` là HTTPS origin thuần, không path/query/user-info. Build sẽ
fail nếu biến trống/sai thay vì deploy frontend trỏ nhầm backend. Vercel static headers đặt CSP
chỉ cho phép connect tới origin đó, `blob:` cho QR preview, `no-referrer` và `nosniff`.

Preview deployments không tự có CORS quyền vào production API vì URL preview thay đổi. Giữ CORS
exact-origin; nếu cần Preview QR thật, dùng staging API riêng và set cả Vercel Preview variable
lẫn exact Preview origin tương ứng trên staging VPS.

Tài liệu Vercel: [Environment variables](https://vercel.com/docs/environment-variables),
[project configuration](https://vercel.com/docs/project-configuration/vercel-json),
[build configuration](https://vercel.com/docs/builds/configure-a-build).

## Release smoke test

Sau khi cả hai domain HTTPS hoạt động:

1. Mở frontend, tạo QR cho URL ngắn, URL query/hash và URL Unicode.
2. Preview phải xuất hiện, tải file PNG, mở file đã tải và quét mỗi ảnh bằng ít nhất hai scanner.
3. Thay URL, tạo QR mới và xác nhận preview/download đổi theo.
4. Test Chrome desktop, Edge desktop, Chrome Android và Safari iPhone.
5. Browser Network chỉ được thấy `https://api.example.vn/api/qr`; không có QR provider key.
6. Xác nhận API response QR có `Cache-Control: no-store`; thử vượt limit có kiểm soát để thấy
   `429 / RATE_LIMITED`.

Không coi deployment là hoàn tất chỉ vì build pass: HTTPS, QR thật, download và scan trên thiết
bị là bằng chứng bắt buộc còn lại.
