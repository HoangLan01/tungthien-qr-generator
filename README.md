# Tùng Thiện QR Generator

Công cụ tạo mã QR tĩnh ngay trong trình duyệt. Ứng dụng không cần tài khoản, API, database hay backend/VPS; URL người dùng nhập không được gửi tới dịch vụ khác.

## Kiến trúc hiện tại

```text
Trình duyệt → frontend tĩnh trên Vercel
            → thư viện qrcode đã bundle trong app.js
            → Blob URL cục bộ để xem, tải hoặc sao chép ảnh
```

- HTML, CSS và JavaScript thuần.
- `qrcode` chạy trực tiếp trong trình duyệt, hỗ trợ PNG/SVG, kích thước và màu sắc.
- Preset mặc định `Tùng Thiện` có logo nhỏ 14%, error correction `H` và khung nhận diện; người dùng vẫn có thể chuyển về QR cơ bản.
- `esbuild` đóng gói mã nguồn và thư viện thành một file `dist-vercel/app.js` tự chứa.
- Không có `/api/qr`, CORS, API key, biến môi trường production hoặc máy chủ Node.js.
- CSP chỉ cho phép tài nguyên cùng origin; `blob:` chỉ dùng cho ảnh QR tạm thời và thao tác sao chép ảnh.

## Chạy local

Trong PowerShell tại thư mục dự án:

```powershell
npm ci
npm run dev
```

Mở `http://localhost:3000`. Lệnh này build site static vào `dist-vercel/` rồi chạy một static server nhỏ để kiểm tra local.

## Kiểm tra

```powershell
npm run check
npm test
npm run build:vercel
```

Build thành công chỉ tạo các static assets sau:

```text
dist-vercel/
  app.js
  index.html
  manifest.webmanifest
  styles.css
  sw.js
  assets/logo.png
```

## Deploy Vercel

Xem [deployment/README.md](deployment/README.md). Không cần khai báo `QR_API_BASE_URL` hay bất kỳ biến môi trường nào.

## Quyền riêng tư và giới hạn

- URL chỉ được xử lý trong tab trình duyệt hiện tại.
- Không có database, analytics, session replay hoặc access log.
- QR là QR tĩnh, không giới hạn lượt quét và không phụ thuộc server sau khi tải trang.
- Cần quét thử file PNG/SVG trên thiết bị thật trước khi dùng để in ấn hoặc phát hành.
- Logo được lấy từ asset nội bộ, được nhúng vào file tải xuống và không gửi tới dịch vụ bên ngoài.

Thư mục `implementation/` lưu lịch sử các giai đoạn phát triển cũ, trong đó có kiến trúc backend trước khi chuyển sang static-only; nó không còn là hướng dẫn triển khai hiện hành.
