# Kiến trúc kỹ thuật — Tùng Thiện QR Generator

## 1. Kiến trúc logic

```text
┌───────────────────────────┐
│          Browser          │
│ HTML + CSS + JavaScript   │
└─────────────┬─────────────┘
              │
              │ POST /api/qr
              ▼
┌───────────────────────────┐
│      Node.js / Express    │
│                           │
│  - validate URL           │
│  - rate limit             │
│  - protect API key        │
│  - call upstream API      │
│  - stream image response  │
└─────────────┬─────────────┘
              │
              │ HTTPS + RapidAPI headers
              ▼
┌───────────────────────────┐
│      QRCode Monkey API    │
│        /qr/custom         │
└───────────────────────────┘
```

## 2. Vì sao cần backend proxy

Không nên gọi RapidAPI trực tiếp từ browser vì:

- API key sẽ nằm trong source/devtools;
- bất kỳ ai cũng có thể lấy key;
- khó rate limit tập trung;
- khó kiểm soát quota;
- khó chuẩn hóa lỗi;
- khó thay nhà cung cấp sau này.

Backend proxy giúp frontend chỉ biết endpoint nội bộ:

```text
POST /api/qr
```

## 3. Cấu trúc source đề xuất

```text
tung-thien-qr-generator/
├─ public/
│  ├─ index.html
│  ├─ styles.css
│  ├─ app.js
│  ├─ favicon.svg
│  └─ assets/
├─ src/
│  ├─ server.js
│  ├─ routes/
│  │  └─ qr.routes.js
│  ├─ services/
│  │  └─ qrCodeMonkey.service.js
│  ├─ middleware/
│  │  ├─ rateLimit.js
│  │  └─ errorHandler.js
│  └─ utils/
│     └─ validateUrl.js
├─ tests/
│  ├─ validateUrl.test.js
│  └─ qrApi.test.js
├─ .env.example
├─ .gitignore
├─ package.json
├─ Dockerfile
└─ README.md
```

## 4. Environment variables

```env
PORT=3000

RAPIDAPI_KEY=
QRCODE_MONKEY_API_BASE=
QRCODE_MONKEY_API_HOST=

QR_DEFAULT_SIZE=1000
QR_REQUEST_TIMEOUT_MS=10000

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=20
```

`QRCODE_MONKEY_API_BASE` và `QRCODE_MONKEY_API_HOST` nên lấy từ snippet hiện hành trên RapidAPI khi bắt đầu tích hợp, thay vì đóng cứng giá trị vào source.

## 5. Request lifecycle

### Bước 1 — Browser

Frontend gửi:

```json
{
  "url": "https://example.com",
  "format": "png"
}
```

### Bước 2 — Backend validation

Backend:

- kiểm tra content type;
- kiểm tra `url`;
- kiểm tra scheme;
- kiểm tra độ dài;
- whitelist `png`/`svg`;
- rate limit.

### Bước 3 — Upstream payload

```json
{
  "data": "https://example.com",
  "config": {
    "body": "square",
    "bodyColor": "#000000",
    "bgColor": "#FFFFFF"
  },
  "size": 1000,
  "download": false,
  "file": "png"
}
```

### Bước 4 — Binary response

Backend trả:

```http
HTTP/1.1 200 OK
Content-Type: image/png
Cache-Control: no-store
X-Content-Type-Options: nosniff
```

Body là binary QR image.

### Bước 5 — Frontend

Frontend gọi:

```js
const blob = await response.blob();
const objectUrl = URL.createObjectURL(blob);
```

Sau đó:

- set `img.src = objectUrl`;
- lưu `objectUrl` để download;
- `URL.revokeObjectURL()` khi tạo QR mới hoặc unload.

## 6. Không cần database

MVP không có lý do kỹ thuật để lưu QR hoặc URL.

Điều này giúp:

- giảm rủi ro privacy;
- giảm code;
- giảm chi phí;
- không cần migration/backup;
- không cần quản lý dữ liệu cá nhân.

## 7. Rate limiting

Khuyến nghị ban đầu:

```text
20 request / IP / phút
```

Response:

```http
HTTP/1.1 429 Too Many Requests
```

Backend nên trả JSON chuẩn:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many QR requests."
  }
}
```

Frontend sẽ chuyển thành message thân thiện bằng tiếng Việt.

## 8. Timeout

Gọi QRCode Monkey bằng `AbortController`.

Nếu quá thời gian cấu hình:

- abort upstream;
- trả status 504 hoặc 503;
- frontend thông báo người dùng thử lại.

Không retry vô hạn. Nếu dùng retry, tối đa 1 lần và chỉ retry lỗi upstream tạm thời, không retry 4xx.

## 9. Logging

Không log:

```text
url=https://...
```

Nên log:

```text
requestId
method
route
status
durationMs
upstreamStatus
errorCode
```

Ví dụ:

```json
{
  "requestId": "a8f1...",
  "route": "/api/qr",
  "status": 200,
  "durationMs": 438
}
```

## 10. Health check

Endpoint:

```text
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

Không gọi QRCode Monkey trong health check thông thường để tránh tốn quota.
