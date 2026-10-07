# Phase 05 — Security, Privacy và chống lạm dụng

## Mục tiêu

Đưa MVP tới mức an toàn hợp lý cho một public web tool.

## 1. Bảo vệ RapidAPI key

Key chỉ tồn tại:

```text
server environment
```

Không tồn tại trong:

```text
HTML
CSS
client JS
Git
error response
logs
```

Nếu key từng bị commit, phải rotate key; xóa commit là chưa đủ.

## 2. Input validation

Client validation phục vụ UX.

Server validation mới là nguồn tin cậy.

Chỉ chấp nhận:

```text
http:
https:
```

Từ chối:

```text
javascript:
data:
file:
ftp:
```

## 3. SSRF

Backend **không fetch URL mà người dùng nhập**.

Nó chỉ gửi chuỗi URL đó thành trường `data` tới QRCode Monkey.

Điều này giúp tránh biến tool thành SSRF proxy.

## 4. Rate limit

Áp dụng riêng cho:

```text
POST /api/qr
```

Khuyến nghị baseline:

```text
20 requests / IP / 60 seconds
```

Có thể điều chỉnh theo quota RapidAPI thực tế.

## 5. Request body limit

Express:

```text
16kb
```

Một URL bình thường không cần body lớn.

## 6. Security headers

Dùng Helmet.

Xem xét CSP:

```text
default-src 'self'
img-src 'self' blob:
connect-src 'self'
```

Nếu có font/CDN ngoài thì whitelist rõ ràng.

## 7. Logging privacy

Không log raw URL.

Không bật access logger theo dạng ghi toàn request body.

Không dùng third-party session replay.

Không gắn Google Analytics mặc định nếu mục tiêu là công cụ privacy-first.

## 8. No-store

API response:

```http
Cache-Control: no-store
```

HTML có thể cache bình thường; QR response không cache tại proxy/CDN nếu chứa nội dung do người dùng tạo.

## 9. Error disclosure

Production không trả:

- stack trace;
- API response nguyên bản;
- RapidAPI headers;
- environment values;
- filesystem path.

## 10. Abuse considerations

Tool chỉ encode text thành QR nên rủi ro chính là quota abuse.

Không cần cố phân loại “URL tốt/xấu” bằng cách truy cập URL.

Có thể thêm captcha sau này chỉ khi thực sự bị abuse. Không nên đưa captcha vào MVP nếu chưa cần vì làm UX kém đi.

## 11. Privacy statement ngắn

Có thể đặt ở footer:

> Tùng Thiện QR Generator không lưu đường link bạn nhập và không theo dõi lượt quét của mã QR.

Chỉ dùng câu này nếu implementation thực sự tuân thủ.

## 12. Dependency security

Trước release:

```text
npm audit
```

Không cài package QR không cần thiết nếu QR vẫn được tạo qua QRCode Monkey.

## Acceptance criteria

- secret không lộ;
- rate limit hoạt động;
- request body có limit;
- server từ chối protocol không hợp lệ;
- raw URL không có trong log;
- QR response dùng `no-store`;
- security headers tồn tại;
- không có analytics/ads mặc định.
