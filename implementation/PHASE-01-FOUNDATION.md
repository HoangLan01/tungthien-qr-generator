# Phase 01 — Foundation

## Mục tiêu

Tạo skeleton dự án chạy được, có frontend static, Express server, environment config và health endpoint.

## Công việc

### 1. Khởi tạo repository

Tên gợi ý:

```text
tung-thien-qr-generator
```

Tạo:

```text
package.json
.gitignore
.env.example
public/
src/
tests/
```

### 2. Dependencies

Production:

```text
express
helmet
express-rate-limit
dotenv
```

Development:

```text
nodemon
vitest
supertest
```

Có thể thay Vitest bằng Node test runner nếu muốn ít dependency hơn.

### 3. Express server

`src/server.js` cần:

- load environment;
- `helmet()`;
- `express.json({ limit: "16kb" })`;
- serve `/public`;
- route `/health`;
- placeholder `/api/qr`;
- 404 handler;
- centralized error handler.

### 4. Static frontend

`public/index.html` tối thiểu hiển thị:

```text
Tùng Thiện QR Generator
Tạo mã QR miễn phí, nhanh chóng, không quảng cáo.
```

### 5. Environment

Tạo `.env.example`:

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

### 6. Scripts

Gợi ý:

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "vitest run"
  }
}
```

## Acceptance criteria

- `npm run dev` chạy được;
- mở `/` thấy giao diện placeholder;
- `GET /health` trả `200`;
- `.env` không bị commit;
- ứng dụng khởi động được khi chưa tích hợp QRCode Monkey;
- cấu trúc code tách frontend/backend rõ ràng.

## Kết quả cuối phase

Một repo sạch, chạy local được và sẵn sàng để phát triển UI/API.
