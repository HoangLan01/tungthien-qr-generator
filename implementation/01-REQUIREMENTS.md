# Yêu cầu sản phẩm — Tùng Thiện QR Generator

## 1. Persona chính

Người dùng phổ thông cần tạo nhanh một mã QR từ đường link để:

- chèn vào văn bản;
- poster;
- bảng thông báo;
- tài liệu điện tử;
- bài đăng;
- standee;
- biểu mẫu;
- tài liệu in.

Người dùng không cần biết QR hoạt động như thế nào.

## 2. User stories

### US-01 — Nhập URL

Là người dùng, tôi muốn dán một đường link vào ô nhập để chuẩn bị tạo QR.

**Acceptance criteria**

- nhận URL có `https://` hoặc `http://`;
- tự trim khoảng trắng đầu/cuối;
- không chấp nhận input rỗng;
- không chấp nhận protocol khác `http:` và `https:`.

### US-02 — Tạo QR

Là người dùng, tôi muốn nhấn nút “Tạo mã QR” để nhận QR của đường link.

**Acceptance criteria**

- hiển thị loading;
- không gửi request trùng khi đang loading;
- thành công thì hiển thị preview;
- lỗi thì hiển thị thông báo dễ hiểu.

### US-03 — Tải QR

Là người dùng, tôi muốn tải QR về để sử dụng ngay.

**Acceptance criteria**

- file mặc định là PNG;
- tên file dễ hiểu, ví dụ `tung-thien-qr-20261007.png`;
- ảnh tải về giống preview;
- file quét được.

### US-04 — Tạo lại

Người dùng có thể thay URL và tạo QR mới mà không cần reload trang.

### US-05 — Mobile

Toàn bộ flow phải sử dụng được trên màn hình điện thoại nhỏ.

## 3. Yêu cầu chức năng

| ID | Yêu cầu | Mức |
|---|---|---|
| FR-01 | Nhập URL | Must |
| FR-02 | Validate URL | Must |
| FR-03 | Gọi backend tạo QR | Must |
| FR-04 | Backend gọi QRCode Monkey | Must |
| FR-05 | Preview QR | Must |
| FR-06 | Download PNG | Must |
| FR-07 | Loading/error state | Must |
| FR-08 | Rate limit | Must |
| FR-09 | Responsive | Must |
| FR-10 | SVG download | Should |
| FR-11 | Chọn kích thước | Could |
| FR-12 | Chọn màu QR | Could |
| FR-13 | Logo trong QR | Future |

## 4. Yêu cầu phi chức năng

### Hiệu năng

- Frontend nhẹ, hạn chế framework và asset lớn.
- Không dùng ảnh nền nặng.
- Chỉ request QR khi người dùng chủ động nhấn tạo.
- API request có timeout.

### Bảo mật

- RapidAPI key ở server.
- Validate input cả client và server.
- Không render URL bằng `innerHTML`.
- Chỉ nhận `http` và `https`.
- Có giới hạn độ dài URL.
- Security headers cơ bản.

### Privacy

- Không database.
- Không analytics mặc định.
- Không lưu raw URL.
- Không log request body.
- Không tracking scan.

### Accessibility

- Label gắn đúng với input.
- Button dùng `<button>`.
- Có `aria-live` cho thông báo.
- Contrast đủ.
- Keyboard navigation.
- Loading có text, không chỉ spinner.

## 5. Quy tắc validate URL

Recommended:

- trim whitespace;
- chiều dài từ 8 đến 4096 ký tự;
- parse bằng `new URL(value)`;
- protocol chỉ `http:` hoặc `https:`;
- hostname phải tồn tại.

Không cần kiểm tra URL thực sự online. Backend **không được fetch URL mà người dùng nhập**, vì đây là dữ liệu được encode vào QR chứ không phải tài nguyên cần tải.

## 6. Error messages

| Trường hợp | Message |
|---|---|
| Input rỗng | “Vui lòng nhập đường link.” |
| URL sai | “Đường link chưa hợp lệ. Hãy nhập URL bắt đầu bằng http:// hoặc https://.” |
| Đang tạo | “Đang tạo mã QR…” |
| API rate limit | “Hệ thống đang có nhiều lượt tạo QR. Vui lòng thử lại sau.” |
| Upstream unavailable | “Chưa thể tạo mã QR lúc này. Vui lòng thử lại.” |
| Timeout | “Yêu cầu tạo QR mất quá nhiều thời gian. Vui lòng thử lại.” |
| Unknown | “Đã có lỗi xảy ra khi tạo mã QR.” |

Không hiển thị API key, stack trace, raw upstream error hoặc thông tin nội bộ cho người dùng.
