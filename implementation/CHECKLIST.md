# Checklist nghiệm thu — Tùng Thiện QR Generator

## Product

- [ ] Tên hiển thị đúng: Tùng Thiện QR Generator
- [ ] Có mô tả “miễn phí, không quảng cáo”
- [ ] Không login
- [ ] Không quảng cáo
- [ ] Không popup marketing

## URL input

- [ ] Nhận HTTPS
- [ ] Nhận HTTP
- [ ] Trim whitespace
- [ ] Reject empty
- [ ] Reject `javascript:`
- [ ] Reject `data:`
- [ ] Reject `file:`
- [ ] Reject URL quá dài
- [ ] Enter để submit

## QR generation

- [ ] Frontend gọi `/api/qr`
- [ ] Backend gọi QRCode Monkey
- [ ] RapidAPI key chỉ ở server
- [ ] API response là binary
- [ ] Content-Type đúng
- [ ] QR preview hiển thị đúng
- [ ] QR scan đúng URL

## Download

- [ ] Download PNG
- [ ] Filename hợp lý
- [ ] File mở được
- [ ] File tải về scan được
- [ ] Tạo QR lần hai hoạt động

## UX

- [ ] Loading state
- [ ] Button disabled khi loading
- [ ] Error state dễ hiểu
- [ ] Không xóa URL khi lỗi
- [ ] Mobile 360px không overflow
- [ ] Tap target đủ lớn
- [ ] Keyboard navigation
- [ ] Focus state

## Security

- [ ] `.env` trong `.gitignore`
- [ ] Helmet/security headers
- [ ] Rate limit `/api/qr`
- [ ] Request body limit
- [ ] Server-side validation
- [ ] Không log URL
- [ ] Không log API key
- [ ] Không trả stack trace production
- [ ] `Cache-Control: no-store` cho QR

## Privacy

- [ ] Không database
- [ ] Không lưu lịch sử QR
- [ ] Không analytics mặc định
- [ ] Không tracking scan
- [ ] Footer privacy statement đúng với implementation

## Error handling

- [ ] Invalid URL
- [ ] RapidAPI 401/403
- [ ] RapidAPI/quota 429
- [ ] Upstream 5xx
- [ ] Timeout
- [ ] Network error
- [ ] Unknown error

## Browser/device

- [ ] Chrome desktop
- [ ] Edge desktop
- [ ] Chrome Android
- [ ] Safari iPhone

## Deployment

- [ ] HTTPS
- [ ] `/health`
- [ ] Production env
- [ ] Auto restart
- [ ] API route không bị cache
- [ ] Secret không nằm trong image/source
- [ ] Smoke test sau deploy

## Go-live condition

Chỉ go-live khi các mục bắt buộc về QR generation, download, security và mobile đều pass.
