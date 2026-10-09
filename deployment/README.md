# Triển khai production — chỉ Vercel static

Kiến trúc production:

```text
Browser → Vercel static site → tạo QR ngay trong trình duyệt
```

Không cần VPS, Nginx, systemd, DNS cho API, CORS, API key hay biến môi trường backend.

## Vercel Dashboard

1. Import repository vào Vercel.
2. Chọn Framework Preset **Other**.
3. Để Root Directory ở thư mục gốc repository.
4. Cấu hình nếu Vercel chưa tự đọc từ `vercel.ts`:
   - Build Command: `npm run build:vercel`
   - Output Directory: `dist-vercel`
5. Xóa biến `QR_API_BASE_URL` cũ khỏi Production, Preview và Development nếu đã tạo.
6. Deploy branch `main`.
7. Có thể gắn custom domain trực tiếp cho project; không cần thêm API subdomain.

`vercel.ts` đặt security headers và CSP cho toàn bộ static site. Build bundle thư viện `qrcode` vào `app.js`, do đó trình duyệt không tải mã từ CDN hoặc gọi API tạo QR.

## Kiểm tra sau deploy

1. Mở trang và tạo QR cho URL ngắn, URL có query/hash và URL Unicode.
2. Thử PNG và SVG ở các kích thước khác nhau.
3. Thử preset `Tùng Thiện — logo nhỏ`, cả có và không có khung nhận diện.
4. Tải file, mở file và quét bằng ít nhất hai ứng dụng hoặc thiết bị.
5. Trong DevTools → Network, xác nhận khi nhấn **Tạo mã QR** không xuất hiện request `/api/qr` hay request tới domain bên ngoài.
6. Kiểm tra nút sao chép PNG trên HTTPS ở trình duyệt có Clipboard API.

Không coi deployment hoàn tất chỉ vì build pass; khả năng tải xuống và quét QR thật vẫn là kiểm tra bắt buộc.
