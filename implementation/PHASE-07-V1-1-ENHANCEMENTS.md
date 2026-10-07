# Phase 07 — V1.1 Enhancements

Phase này chỉ thực hiện sau khi MVP ổn định.

## 1. Chọn định dạng

UI đơn giản:

```text
PNG
SVG
```

SVG phù hợp khi cần in lớn hoặc đưa vào thiết kế.

## 2. Chọn kích thước

Preset:

```text
500 px
1000 px
1500 px
2000 px
```

Default vẫn giữ 1000px.

## 3. Tùy chỉnh màu

Chỉ nên cho:

- QR color;
- background color.

Cần kiểm tra contrast để tránh tạo QR khó quét.

## 4. Logo

QRCode Monkey API có hỗ trợ logo.

Nếu thêm upload logo:

```text
browser
  ↓
backend
  ↓
/qr/uploadImage
  ↓
receive file id
  ↓
/qr/custom with config.logo
```

Phải thêm:

- file size limit;
- MIME whitelist;
- image validation;
- timeout;
- cleanup/privacy policy.

Không cần tính năng này trong MVP.

## 5. Copy QR

Nếu browser hỗ trợ Clipboard API, có thể thêm:

```text
Sao chép ảnh
```

Đây là enhancement, không thay cho nút download.

## 6. PWA

Có thể bổ sung manifest để tool mở như app.

Không cache response QR chứa nội dung người dùng.

## 7. Dark mode

Có thể thêm UI dark mode, nhưng QR preview vẫn nên giữ vùng background trắng mặc định để đảm bảo khả năng quét.

## 8. Local fallback

Nếu sau này cần giảm phụ thuộc quota RapidAPI, có thể nghiên cứu cơ chế fallback tạo QR local/server bằng thư viện mã nguồn mở.

Nếu yêu cầu sản phẩm vẫn là “sử dụng QRCode Monkey”, fallback chỉ nên kích hoạt khi upstream không khả dụng và phải được xem là kiến trúc dự phòng, không thay đổi provider chính.

## 9. QR templates

Có thể cung cấp preset:

```text
Cơ bản
Bo tròn
Màu nhận diện
Có logo
```

Mỗi preset cần test scan trước khi phát hành.

## Nguyên tắc

Không biến Tùng Thiện QR Generator thành một trang cấu hình phức tạp.

Nếu một tính năng làm người dùng phổ thông phải suy nghĩ nhiều trước khi tạo QR, nên đặt nó trong khu vực “Tùy chọn nâng cao” và đóng mặc định.
