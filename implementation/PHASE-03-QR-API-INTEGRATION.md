# Phase 03 — QRCode Monkey API Integration

## Mục tiêu

Kết nối backend với QRCode Monkey qua RapidAPI một cách an toàn.

## 1. Tạo validator

`src/utils/validateUrl.js`

Quy tắc:

```text
string
trim
min length
max 4096
new URL()
protocol === http: hoặc https:
hostname tồn tại
```

Không resolve DNS và không fetch URL của người dùng.

## 2. Tạo service

`src/services/qrCodeMonkey.service.js`

Nhiệm vụ:

- nhận `url`, `format`, `size`;
- tạo payload QRCode Monkey;
- gửi POST `/qr/custom`;
- gắn RapidAPI headers;
- timeout;
- kiểm tra status;
- kiểm tra content type;
- trả về binary.

## 3. Upstream payload

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

## 4. Route `/api/qr`

Flow:

```text
validate body
   ↓
validate URL
   ↓
validate format
   ↓
call qrCodeMonkeyService
   ↓
set content-type
   ↓
Cache-Control: no-store
   ↓
send binary
```

## 5. Secret management

API key:

```env
RAPIDAPI_KEY=...
```

Tuyệt đối không:

- đưa key vào `public/app.js`;
- embed key vào HTML;
- commit key;
- gửi key về frontend;
- log key.

## 6. Upstream status mapping

| Upstream | Internal |
|---|---|
| 400 | 502 hoặc mapped validation nếu xác định được |
| 401/403 | 503 + log config error |
| 429 | 503/429 theo policy |
| 5xx | 502/503 |
| Timeout | 504 |

Nếu RapidAPI quota hết, log nội bộ nên đủ để admin phân biệt với lỗi QRCode Monkey.

## 7. API key verification

Khi triển khai, lấy request snippet trực tiếp từ RapidAPI listing hiện hành và điền:

```env
QRCODE_MONKEY_API_BASE=
QRCODE_MONKEY_API_HOST=
```

Mục đích là tránh phụ thuộc vào hostname được ghi trong tài liệu cũ hoặc snippet bên thứ ba.

## 8. Manual verification

Test các URL:

```text
https://example.com
https://example.com/path?a=1&b=2
https://example.com/#section
https://www.google.com/search?q=qr
```

Và invalid:

```text
javascript:alert(1)
file:///etc/passwd
data:text/html,...
example.com
""
```

## Acceptance criteria

- `/api/qr` tạo được QR thật từ QRCode Monkey;
- key không xuất hiện ở browser network headers;
- invalid URL không gọi upstream;
- upstream lỗi không lộ raw error;
- timeout hoạt động;
- binary response có content type đúng;
- PNG sinh ra quét được.
