# Phase 06 — Test, Deploy và vận hành

## Mục tiêu

Nghiệm thu end-to-end và đưa tool lên HTTPS.

## 1. Unit tests

### URL validator

Valid:

```text
https://example.com
http://example.com
https://example.com/a?x=1&y=2
https://sub.example.com/path#abc
```

Invalid:

```text
example.com
javascript:alert(1)
data:text/html,test
file:///tmp/a
""
```

### Format

- `png` accepted;
- `svg` accepted nếu bật;
- giá trị khác bị reject.

## 2. API integration tests

Mock upstream để kiểm thử:

- success PNG;
- 401;
- 429;
- 500;
- timeout;
- invalid content type.

Không cần tiêu tốn request RapidAPI trong toàn bộ test suite.

## 3. End-to-end manual test

Flow:

```text
Open
→ paste URL
→ generate
→ preview
→ scan
→ download
→ open downloaded file
→ scan downloaded file
→ replace URL
→ generate again
```

## 4. Thiết bị/browser

Tối thiểu test:

- Chrome desktop;
- Edge desktop;
- Chrome Android;
- Safari iPhone.

Nếu có thể, test thêm Firefox.

## 5. QR scan verification

Không chỉ kiểm tra “ảnh hiện ra”.

Phải scan QR bằng ít nhất hai camera/scanner khác nhau.

Test:

- URL ngắn;
- URL dài;
- query string;
- dấu `&`, `?`, `#`;
- Unicode trong path/query nếu có.

## 6. Deployment topology

```text
Internet
   ↓
HTTPS / Reverse Proxy
   ↓
Node.js App
   ├─ static frontend
   └─ /api/qr
          ↓
      RapidAPI
          ↓
    QRCode Monkey
```

## 7. Docker option

Có thể đóng gói app vào Docker.

Container cần:

```text
PORT
RAPIDAPI_KEY
QRCODE_MONKEY_API_BASE
QRCODE_MONKEY_API_HOST
```

Không bake secret vào image.

## 8. Reverse proxy

Nginx/Caddy cần:

- HTTPS;
- proxy tới Node;
- preserve client IP nếu rate limit theo IP;
- giới hạn body size;
- timeout phù hợp.

Nếu dùng Cloudflare/CDN, đảm bảo `/api/qr` không bị cache.

## 9. Production configuration

```text
NODE_ENV=production
```

- không verbose error;
- không log body;
- key đọc từ secret/env;
- process restart policy;
- health check.

## 10. Monitoring nhẹ

Không cần hệ thống phức tạp.

Cần biết tối thiểu:

- uptime;
- số response 5xx;
- số response 429;
- upstream timeout;
- RapidAPI usage/quota.

Không cần lưu URL người dùng để monitoring.

## 11. Release smoke test

Sau deployment:

```text
GET /
GET /health
POST /api/qr
download QR
scan QR
```

Kiểm tra browser devtools để đảm bảo RapidAPI key không xuất hiện.

## Acceptance criteria

- HTTPS hoạt động;
- health endpoint hoạt động;
- generate thật hoạt động production;
- download hoạt động;
- QR scan đúng URL;
- key không lộ client-side;
- API route không bị CDN cache;
- process tự khởi động lại sau restart;
- lỗi upstream không làm crash app.
