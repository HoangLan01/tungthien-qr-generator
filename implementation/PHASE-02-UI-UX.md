# Phase 02 — UI/UX

## Mục tiêu

Hoàn thiện giao diện mobile-first cho flow nhập URL → tạo QR → xem kết quả.

## 1. Bố cục

```text
┌────────────────────────────────┐
│          QR icon/logo          │
│    Tùng Thiện QR Generator     │
│ Tạo QR miễn phí, không quảng cáo│
│                                │
│  Đường link                    │
│  [ https://example.com       ] │
│                                │
│  [       Tạo mã QR           ] │
│                                │
│  Error / helper text           │
│                                │
│       QR result (hidden)       │
│          [ QR IMAGE ]          │
│                                │
│  [ Tải PNG ] [ Tạo mã khác ]  │
└────────────────────────────────┘
```

## 2. Trạng thái UI

### Idle

- input enabled;
- create button enabled;
- result hidden.

### Invalid

- input giữ nguyên giá trị;
- helper/error text xuất hiện;
- focus quay lại input nếu cần.

### Loading

Button đổi thành:

```text
Đang tạo mã QR…
```

- disable button;
- không cho submit request thứ hai;
- result cũ có thể ẩn hoặc giữ mờ tùy thiết kế.

### Success

- QR preview;
- download button;
- create another button;
- success area có `aria-live="polite"`.

### Error

- input không bị xóa;
- hiện message thân thiện;
- button được bật lại.

## 3. Responsive

### Mobile

- single column;
- container full width;
- padding khoảng 16px;
- button full width;
- QR preview không vượt quá viewport.

### Tablet/Desktop

- card width khoảng 520–640px;
- căn giữa;
- button có thể giữ full width để UI thống nhất.

## 4. Visual direction

Ưu tiên phong cách:

- nền sáng;
- card trắng;
- typography rõ;
- góc bo nhẹ;
- shadow nhẹ;
- màu accent dùng nhất quán;
- không trang trí quá mức.

Không dùng animation dài. Chỉ transition nhỏ cho focus/button/result.

## 5. Form behavior

Form HTML thật:

```html
<form id="qr-form">
```

Submit bằng Enter.

Input:

```html
<input
  id="url"
  name="url"
  type="url"
  inputmode="url"
  autocomplete="url"
  placeholder="https://example.com"
/>
```

Không chỉ dựa vào validation native; JavaScript vẫn validate để đưa message đồng nhất.

## 6. Accessibility

- `<label for="url">`.
- Error container dùng `role="alert"` khi có lỗi.
- Loading có text.
- Không truyền thông tin chỉ bằng màu.
- Focus ring không bị remove.
- QR image có `alt="Mã QR đã tạo"`.
- Nút download chỉ enabled khi có result.

## Acceptance criteria

- UI đẹp và gọn ở 360px;
- không horizontal scroll;
- keyboard submit được;
- error state rõ;
- loading state rõ;
- result section không hiển thị trước khi thành công;
- button tối thiểu đủ lớn để chạm trên mobile;
- không có quảng cáo hoặc thành phần marketing không cần thiết.
