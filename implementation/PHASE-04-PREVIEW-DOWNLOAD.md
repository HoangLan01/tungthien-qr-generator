# Phase 04 — Preview, Download và Error Handling

## Mục tiêu

Hoàn thiện trải nghiệm sau khi người dùng bấm “Tạo mã QR”.

## 1. Frontend API call

```text
submit form
   ↓
validate URL
   ↓
set loading=true
   ↓
fetch POST /api/qr
   ↓
response.ok ?
   ├─ no → parse error JSON
   └─ yes → response.blob()
                 ↓
          URL.createObjectURL()
                 ↓
             preview
```

## 2. Quản lý Blob URL

Khi tạo QR mới:

```js
if (previousObjectUrl) {
  URL.revokeObjectURL(previousObjectUrl);
}
```

Tránh giữ blob thừa trong memory.

## 3. Preview

Dùng:

```html
<img id="qr-preview" alt="Mã QR đã tạo">
```

Đặt kích thước hiển thị hợp lý, ví dụ tối đa khoảng 320px, nhưng ảnh source có thể là 1000px để tải/in.

## 4. Download

Frontend tạo link tạm:

```html
<a download="tung-thien-qr.png">
```

Filename có thể chứa ngày:

```text
tung-thien-qr-20261007.png
```

Không cần đưa URL gốc vào filename.

## 5. Tạo QR mới

Nút “Tạo mã khác”:

- focus lại input;
- có thể select URL hiện tại để người dùng paste URL mới;
- revoke object URL cũ khi kết quả mới được tạo.

Không nhất thiết reload trang.

## 6. Xử lý lỗi

Frontend map `error.code`:

```text
INVALID_URL
RATE_LIMITED
QR_PROVIDER_TIMEOUT
QR_PROVIDER_ERROR
QR_SERVICE_UNAVAILABLE
INTERNAL_ERROR
```

sang message tiếng Việt.

## 7. Retry UX

Không auto retry ở frontend vì có thể tiêu tốn quota.

Người dùng tự nhấn **Thử lại** hoặc **Tạo mã QR**.

## 8. iOS/Safari

Kiểm tra hành vi download Blob trên Safari iOS.

Nếu browser không download trực tiếp như mong muốn:

- vẫn hiển thị ảnh;
- nút có thể mở QR ở tab mới;
- hướng dẫn ngắn “Chạm và giữ ảnh để lưu” chỉ khi phát hiện cần thiết.

Không hiển thị hướng dẫn này mặc định cho mọi người dùng.

## 9. URL summary

Có thể hiển thị URL bên dưới QR nhưng:

- dùng `textContent`;
- có `overflow-wrap: anywhere`;
- không render bằng `innerHTML`.

## Acceptance criteria

- preview xuất hiện sau khi tạo;
- ảnh tải xuống đúng;
- tạo QR lần 2 không bị dùng lại blob cũ;
- error message không làm mất URL nhập;
- hoạt động trên Chrome desktop, Chrome Android và Safari iOS;
- không xuất hiện memory leak dễ thấy khi tạo nhiều QR liên tiếp.
