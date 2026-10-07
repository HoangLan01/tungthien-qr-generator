# API Contract — Tùng Thiện QR Generator

## 1. Internal endpoint

### `POST /api/qr`

Tạo một QR code từ URL.

### Request

```http
Content-Type: application/json
```

```json
{
  "url": "https://example.com",
  "format": "png",
  "size": 1000,
  "bodyColor": "#000000",
  "bgColor": "#FFFFFF"
}
```

### Fields

| Field | Type | Required | Rule |
|---|---|---|---|
| `url` | string | yes | `http` hoặc `https`, tối đa 4096 ký tự |
| `format` | string | no | `png` hoặc `svg`, default `png` |
| `size` | number | no | `500`, `1000`, `1500` hoặc `2000`; thiếu thì dùng server default 1000 |
| `bodyColor` | string | no | Màu mã QR hex `#RRGGBB`, default `#000000` |
| `bgColor` | string | no | Màu nền hex `#RRGGBB`, default `#FFFFFF` |

Client chỉ được chọn format, size và hai màu V1.1. Backend không nhận toàn bộ `config`
QRCode Monkey, yêu cầu nền sáng hơn mã và contrast tối thiểu 4.5:1 trước khi tạo payload.

## 2. Success response

### PNG

```http
HTTP/1.1 200 OK
Content-Type: image/png
Cache-Control: no-store
```

### SVG

```http
HTTP/1.1 200 OK
Content-Type: image/svg+xml
Cache-Control: no-store
```

Response body là binary/file content.

## 3. Error format

```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "Invalid URL."
  }
}
```

### Error codes

| HTTP | Code | Ý nghĩa |
|---|---|---|
| 400 | `INVALID_URL` | URL không hợp lệ |
| 400 | `INVALID_FORMAT` | Format không được hỗ trợ |
| 400 | `INVALID_SIZE` | Kích thước không thuộc preset hỗ trợ |
| 400 | `INVALID_COLOR` | Màu không đúng hex `#RRGGBB` |
| 400 | `LOW_COLOR_CONTRAST` | Màu QR/nền không đủ tương phản để tạo an toàn |
| 413 | `INPUT_TOO_LONG` | URL quá dài |
| 429 | `RATE_LIMITED` | Quá nhiều request |
| 502 | `QR_PROVIDER_ERROR` | Upstream trả lỗi |
| 503 | `QR_SERVICE_UNAVAILABLE` | Upstream không sẵn sàng |
| 504 | `QR_PROVIDER_TIMEOUT` | Upstream timeout |
| 500 | `INTERNAL_ERROR` | Lỗi nội bộ |

## 4. QRCode Monkey upstream

Tài liệu chính thức mô tả:

```text
POST /qr/custom
```

Body:

```json
{
  "data": "https://example.com",
  "config": {},
  "size": 1000,
  "download": false,
  "file": "png"
}
```

Các format API hỗ trợ theo tài liệu:

```text
png
svg
pdf
eps
```

MVP chỉ expose `png` và có thể thêm `svg`.

## 5. Preset MVP và V1.1

```json
{
  "body": "square",
  "bodyColor": "#000000",
  "bgColor": "#FFFFFF"
}
```

Lý do:

- độ tương phản cao;
- dễ quét;
- trung tính;
- phù hợp tài liệu in;
- không phụ thuộc logo.

V1.1 cho phép bốn size preset `500`, `1000`, `1500`, `2000` px và PNG/SVG.
Template màu ở frontend chỉ điền hai trường màu sau khi client/backend validation pass;
không thay đổi shape, logo hoặc error-correction mặc định của provider.

## 6. RapidAPI

QRCode Monkey API chính thức được cung cấp thông qua RapidAPI.

Server request cần sử dụng các header do RapidAPI yêu cầu, thông thường gồm API key và API host. Giá trị chính xác của host nên lấy từ snippet hiện hành của API listing khi triển khai.

Ví dụ cấu hình:

```env
RAPIDAPI_KEY=...
QRCODE_MONKEY_API_BASE=https://...
QRCODE_MONKEY_API_HOST=...
```

Không commit file `.env`.

`.gitignore`:

```gitignore
.env
.env.*
!.env.example
```

## 7. CORS

Nếu frontend và backend cùng origin:

```text
https://example.vn
https://example.vn/api/qr
```

thì không cần mở CORS rộng.

Nếu tách origin, chỉ whitelist domain frontend. Không dùng:

```http
Access-Control-Allow-Origin: *
```

một cách mặc định cho production API.

## 8. Content-Disposition

MVP có thể download phía client bằng Blob URL nên response không bắt buộc phải có `Content-Disposition`.

Nếu muốn backend hỗ trợ download trực tiếp:

```http
Content-Disposition: attachment; filename="tung-thien-qr.png"
```

có thể bổ sung endpoint hoặc query riêng về sau.
