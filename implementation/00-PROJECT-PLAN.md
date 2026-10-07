# Kế hoạch tổng thể — Tùng Thiện QR Generator

## 1. Tầm nhìn sản phẩm

Xây dựng một công cụ tạo QR cực kỳ đơn giản, sạch, nhanh và không quảng cáo. Người dùng chỉ cần dán một đường link, nhấn một nút và có ngay mã QR để tải xuống.

Sản phẩm không cố cạnh tranh với các QR editor phức tạp. Giá trị chính là:

- mở lên là dùng được;
- không phải đăng ký;
- không quảng cáo;
- không chuyển hướng qua trang trung gian;
- QR tĩnh, dùng trực tiếp cho website, tài liệu, poster và văn bản hành chính;
- giao diện thân thiện trên điện thoại.

## 2. Phạm vi MVP

### Trong phạm vi

- Nhập một URL.
- Kiểm tra URL hợp lệ.
- Tạo QR thông qua QRCode Monkey API.
- Preview QR ngay trên trang.
- Tải QR xuống máy.
- Mặc định xuất PNG chất lượng cao.
- Cho phép tạo lại QR với URL khác.
- Responsive cho mobile, tablet và desktop.
- Loading state, success state và error state.
- Backend proxy để bảo vệ RapidAPI key.
- Rate limit cơ bản.
- Không lưu dữ liệu người dùng.

### Ngoài phạm vi MVP

- Đăng nhập/tài khoản.
- Database.
- Lịch sử QR.
- Short link.
- Thống kê lượt quét.
- Dynamic QR.
- Thanh toán.
- Quảng cáo.
- Upload file để tạo QR.
- vCard, Wi-Fi, SMS, email.
- Logo tùy chỉnh và trình thiết kế QR nâng cao.

Các tính năng ngoài phạm vi có thể đưa vào phiên bản 1.1 hoặc 2.0.

## 3. User flow

```text
Trang chủ
   ↓
Nhập URL
   ↓
Frontend kiểm tra định dạng
   ↓
Nhấn “Tạo mã QR”
   ↓
POST /api/qr
   ↓
Backend kiểm tra dữ liệu + rate limit
   ↓
Backend gọi QRCode Monkey qua RapidAPI
   ↓
Nhận binary PNG/SVG
   ↓
Backend trả binary cho browser
   ↓
Frontend tạo Blob URL
   ↓
Hiển thị preview
   ↓
Người dùng nhấn “Tải xuống”
```

## 4. Định hướng giao diện

Trang chỉ nên có một khối nội dung chính.

### Header

- Logo/biểu tượng QR đơn giản.
- Tên: **Tùng Thiện QR Generator**.
- Dòng mô tả ngắn: “Tạo mã QR miễn phí, nhanh chóng, không quảng cáo.”

### Khu vực nhập

- Label: “Đường link”.
- Input có placeholder: `https://example.com`.
- Nút chính: **Tạo mã QR**.
- Có thể hỗ trợ Enter để tạo.

### Khu vực kết quả

Chỉ hiển thị sau khi tạo thành công:

- QR preview.
- URL đã tạo QR, hiển thị rút gọn nếu quá dài.
- Nút **Tải PNG**.
- Nút **Tạo mã khác**.

### Footer

Nội dung ngắn:

> Tùng Thiện QR Generator tạo mã QR tĩnh. Hệ thống không lưu đường link bạn nhập.

Không cần banner quảng cáo, cookie banner nếu không sử dụng cookie/analytics, popup hoặc nội dung marketing.

## 5. Tiêu chí UX

- Thao tác chính phải nhìn thấy ngay khi mở trang.
- Trên mobile không cần zoom.
- Input và button cao tối thiểu khoảng 44px.
- Trạng thái loading phải khóa nút tạo để tránh gửi nhiều request liên tiếp.
- Nếu URL sai, báo ngay bên dưới input.
- Không reset URL khi API lỗi.
- Sau khi tạo thành công nên tự cuộn nhẹ tới QR trên màn hình nhỏ.
- Có trạng thái focus rõ ràng cho bàn phím.
- Màu nền QR phải đủ tương phản với phần QR.

## 6. Công nghệ đề xuất

### Frontend

- HTML5.
- CSS3.
- Vanilla JavaScript ES2022+.

Không cần React/Vue cho MVP vì UI rất nhỏ.

### Backend

- Node.js 20+.
- Express.
- Native `fetch()` của Node.js.
- `express-rate-limit` hoặc middleware rate limit tương đương.
- `helmet` để thêm security headers cơ bản.

### Hạ tầng

Một process Node.js có thể phục vụ:

- `/` và static assets;
- `/api/qr`;
- `/health`.

Phía trước có thể đặt Nginx/Caddy/Cloudflare để xử lý HTTPS và reverse proxy.

## 7. Dữ liệu và quyền riêng tư

Không tạo database.

Backend không ghi URL request vào log.

Log chỉ nên chứa:

- timestamp;
- HTTP status;
- thời gian xử lý;
- request ID ngẫu nhiên;
- loại lỗi;
- không chứa raw URL.

Response QR sử dụng:

```http
Cache-Control: no-store
```

để hạn chế lưu dữ liệu URL/QR ngoài ý muốn.

## 8. Tích hợp QRCode Monkey

Endpoint chính theo tài liệu QRCode Monkey:

```text
/qr/custom
```

Phương thức ưu tiên:

```text
POST
```

Payload khởi đầu cho MVP:

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

QRCode Monkey trả về binary image.

RapidAPI key chỉ được lưu phía server bằng environment variable.

Không hard-code API key vào repository.

## 9. Rủi ro và cách xử lý

| Rủi ro | Hướng xử lý |
|---|---|
| Lộ RapidAPI key | Chỉ gọi API từ backend |
| Người dùng spam request | Rate limit theo IP |
| Hết quota API | Bắt lỗi 429, hiển thị thông báo thân thiện |
| API QRCode Monkey lỗi | Timeout + retry giới hạn hoặc trả lỗi rõ ràng |
| URL độc hại | Chỉ nhận `http:`/`https:`; không server-side fetch URL của người dùng |
| QR khó quét | Dùng nền trắng, QR tối màu, test trên thiết bị thật |
| Download không hoạt động trên iOS | Cho phép mở ảnh + download link/blob |
| Log chứa dữ liệu riêng tư | Không log request body/raw URL |
| API pricing thay đổi | Theo dõi RapidAPI subscription/quota |

## 10. Định nghĩa hoàn thành MVP

MVP được coi là hoàn thành khi:

- nhập được URL hợp lệ;
- URL không hợp lệ bị từ chối;
- API key không xuất hiện trong source frontend;
- QR tạo thành công từ QRCode Monkey;
- QR preview đúng;
- QR quét được bằng iOS và Android;
- tải được PNG;
- giao diện sử dụng tốt trên màn hình 360px;
- API lỗi được xử lý rõ ràng;
- có rate limit;
- không lưu URL;
- chạy được qua HTTPS;
- không có quảng cáo.

## 11. Lộ trình

Triển khai theo thứ tự các file phase:

```text
PHASE 01 → PHASE 02 → PHASE 03 → PHASE 04 → PHASE 05 → PHASE 06
                                                    ↓
                                          MVP production
                                                    ↓
                                               PHASE 07
```
