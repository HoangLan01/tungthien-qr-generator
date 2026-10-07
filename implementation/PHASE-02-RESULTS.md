# Phase 02 — Kết quả triển khai UI/UX

Ngày kiểm tra: 07/10/2026.

## Đã triển khai

- Thay placeholder bằng card trắng, nền sáng, accent xanh; biểu tượng SVG nội bộ,
  tên sản phẩm, mô tả và footer ngắn. Không thêm font/CDN/analytics/quảng cáo.
- Form HTML thật dùng sự kiện submit, input `type="url"`, `inputmode="url"`, label,
  helper text và thông báo tiếng Việt; `novalidate` để dùng thông báo thống nhất.
- Trim URL trước khi chuyển cho adapter, kiểm tra HTTP/HTTPS và giới hạn 8–4096 ký tự.
  Không thay đổi URL đang nhập khi validation hoặc dịch vụ báo lỗi.
- Loading đổi nhãn nút, có spinner và thông báo chữ, chặn submit trùng, khóa sửa input
  trong lúc xử lý rồi khôi phục khi hoàn tất.
- Error dùng `role="alert"`; input không hợp lệ có `aria-invalid` và được focus.
- Success có `aria-live`, vùng ảnh với alt, URL dùng `textContent`, Tải PNG và Tạo mã khác.
  Vùng kết quả ban đầu ẩn; download không có href và bị vô hiệu hóa trước khi có kết quả.
- Sửa URL hoặc chọn Tạo mã khác sẽ ẩn kết quả cũ; Tạo mã khác focus/select input.
- Card tối đa 600px; mobile dùng padding ngoài 16px và một cột; input 52px,
  nút tối thiểu 50px; có focus ring và hỗ trợ reduced motion.
- Tách `public/qr-form.js` để kiểm thử hành vi UI; `public/app.js` khởi tạo form.

## Phạm vi giữ nguyên

- Không sửa backend, API contract, environment hoặc middleware bảo mật Phase 01.
- Chưa gọi QRCode Monkey hoặc `/api/qr` từ frontend. Adapter mặc định báo
  `QR_SERVICE_UNAVAILABLE` bằng thông báo tiếng Việt, không tạo QR giả.
- Adapter `generate(url)` là điểm kết nối cho Phase 03–04; trạng thái success hiện
  được kiểm tra bằng dữ liệu giả trong test, không có demo mode trong sản phẩm.
- Link tải được gắn khi adapter trả ảnh; fetch/binary, quản lý Blob URL, xác nhận ảnh tải,
  cuộn tới kết quả và fallback Safari iOS để lại cho phase preview/download.
- Không đánh dấu hoàn thành các hạng mục tạo/quét/tải QR thật trong checklist MVP.

## Kiểm tra đã chạy

Môi trường: Windows PowerShell, Node.js 22.14.0, npm 11.7.0.

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | 17/17 đạt (9 nền tảng + 8 UI/validation) |
| `npm run check` | Đạt, bao gồm hai module frontend mới |
| `npm audit` | 0 lỗ hổng tại thời điểm kiểm tra |
| `git diff --check` | Đạt; cảnh báo chuyển LF/CRLF không phải lỗi whitespace |
| HTTP qua Supertest | HTML, CSS, app.js và qr-form.js được phục vụ thành công |
| DOM/jsdom | Invalid không gọi adapter; loading chặn gửi trùng; lỗi giữ URL; success bật download; đổi URL ẩn ảnh cũ; tạo mã khác đưa focus về input |
| URL chứa HTML | Hiển thị như văn bản, không tạo phần tử DOM từ URL |

jsdom 26.1.0 được chọn vì tương thích Node.js đang dùng; chỉ là devDependency.
Không thêm dependency chạy ở browser. Test dùng ảnh giả không được tải hoặc quét.

## Chưa xác minh

Công cụ kiểm tra UI trả danh sách trình duyệt rỗng. Chưa kiểm tra trực quan và
không coi DOM test là bằng chứng hiển thị trên trình duyệt.

- [ ] 360px: không tràn ngang, bố cục và kích thước chữ phù hợp.
- [ ] Tablet/desktop: card và vùng kết quả cân đối.
- [ ] Enter thực tế để submit, Tab/Shift+Tab, focus ring và nút tải bằng bàn phím.
- [ ] Trình đọc màn hình thông báo loading/error/success đúng.
- [ ] Loading/success với API thật; ảnh preview và file tải xuống quét được.
- [ ] Chrome Android và Safari iPhone.

## Cách kiểm tra thủ công

Trong PowerShell tại thư mục dự án, chạy `npm run dev`, mở `http://localhost:3000`.

1. Kiểm tra ban đầu không có vùng kết quả/nút tải.
2. Submit rỗng: báo “Vui lòng nhập đường link.” và focus vào input.
3. Nhập `example.com` hoặc `javascript:alert(1)`: báo URL chưa hợp lệ.
4. Nhập `https://example.com`, nhấn Enter: hiện thông báo chưa thể tạo QR và giữ URL.
5. Dùng viewport 360px và bàn phím để kiểm tra bố cục, focus và khả năng thao tác.

Mã nguồn UI của Phase 02 đã triển khai; nghiệm thu trực quan còn chờ kiểm tra.
Chưa triển khai Phase 03, chưa commit/push.
