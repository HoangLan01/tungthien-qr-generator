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

Client chỉ được chọn format, size và hai màu V1.1. Backend không nhận cấu hình generator
tùy ý; nó yêu cầu nền sáng hơn mã và contrast tối thiểu 4.5:1 trước khi tạo ảnh.

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
| 500 | `QR_GENERATION_ERROR` | Local QR generator không tạo được ảnh |
| 500 | `INTERNAL_ERROR` | Lỗi nội bộ |

## 4. Local QR generator

Server dùng package `qrcode` để encode URL ngay trong process Node.js. Generator trả
PNG buffer hoặc SVG string, sau đó route trả binary với content type chuẩn. URL không được
fetch và không được gửi sang QR API bên thứ ba.

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
Template màu ở frontend chỉ điền hai trường màu sau khi client/backend validation pass.
Generator dùng error-correction `M`, quiet-zone margin 4; logo và custom shape chưa hỗ trợ.

## 6. CORS

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

## 7. Content-Disposition

MVP có thể download phía client bằng Blob URL nên response không bắt buộc phải có `Content-Disposition`.

Nếu muốn backend hỗ trợ download trực tiếp:

```http
Content-Disposition: attachment; filename="tung-thien-qr.png"
```

có thể bổ sung endpoint hoặc query riêng về sau.
