# Phase 04 — Kết quả Preview, Download và Error Handling

Ngày kiểm tra: 07/10/2026.

## Đã triển khai

- Thêm `public/qr-api.js`. Form gửi đúng một `POST /api/qr` cùng origin với JSON
  `{ "url", "format": "png" }`; dùng `credentials: "same-origin"` và `cache: "no-store"`.
  Không có RapidAPI key/header/provider URL trong request browser.
- Client chỉ chấp nhận success response `image/png`; sau đó đọc `response.blob()` và gọi
  `URL.createObjectURL()` để hiển thị ảnh preview. Response không đúng MIME báo lỗi
  provider thay vì render dữ liệu không phải ảnh.
- Link download trỏ tới cùng Blob URL như preview, filename là
  `tung-thien-qr-YYYYMMDD.png`, không có URL gốc.
- Thu hồi Blob URL khi người dùng bắt đầu URL mới, chọn **Tạo mã khác**, gửi lần tiếp theo,
  hoặc sự kiện `pagehide`. Vì vậy QR cũ không còn được download sau khi người dùng đã bỏ nó.
- Thêm `blob:` vào CSP `img-src`; đây là quyền tối thiểu cần để preview Blob URL không bị
  Helmet chặn. `script-src` và `connect-src` vẫn mặc định cùng origin.
- Map error code từ JSON backend sang thông báo tiếng Việt đang có; không hiện raw message,
  stack trace hay chi tiết network/upstream. Không auto retry để tránh tiêu quota.
- Sau success, màn hình nhỏ cuộn nhẹ tới phần QR; reduced motion dùng cuộn tức thời.
- Không thêm hướng dẫn Safari mặc định. Fallback “chạm và giữ ảnh để lưu” chỉ được cân nhắc
  nếu kiểm tra Safari iOS thật cho thấy download Blob không hoạt động.

## Kiểm tra đã chạy

Môi trường: Windows PowerShell, Node.js 22.14.0, npm 11.7.0.

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | 35/35 đạt |
| `npm run check` | Đạt, bao gồm `public/qr-api.js` |
| `npm audit` | 0 lỗ hổng tại thời điểm kiểm tra |
| `git diff --check` | Đạt; cảnh báo LF/CRLF cho README không phải lỗi whitespace |
| API client unit test | POST cùng origin, payload PNG, không header key, Blob URL, filename theo ngày |
| Error client unit test | JSON error, MIME không phải PNG, lỗi mạng và lỗi tạo Blob URL không lộ raw detail |
| Form DOM test | preview/download, loading, retry thủ công, focus, `textContent`, hủy Blob khi đổi/tạo lại/rời trang |
| CSP test | `img-src` cho phép `blob:` để preview hoạt động |

Test dùng `Response`/`Blob` mock và Blob URL giả. Không tạo ảnh QR thật hoặc tiêu quota RapidAPI.

## Chưa xác minh

- Không có RapidAPI key/config đã xác thực trong workspace, nên chưa có response PNG thật.
- Công cụ browser không có browser/tab kết nối trong phiên kiểm tra; chưa xác minh trực quan
  preview/download, scroll mobile hay CSP trên engine browser thực.
- Chưa mở/tải/quét file PNG thực bằng Chrome desktop, Chrome Android hoặc Safari iPhone.
- Safari iOS Blob download chưa được kiểm tra nên chưa thêm fallback/hướng dẫn lưu ảnh.
- Chưa xác minh memory profile qua nhiều lần tạo QR trên browser; test chỉ xác nhận mỗi
  object URL được yêu cầu revoke đúng lifecycle.

## Kiểm tra thủ công sau khi có cấu hình provider

1. Điền ba biến RapidAPI server trong `.env`, chạy `npm run dev`, mở `http://localhost:3000`.
2. Nhập `https://example.com`, tạo QR. Kiểm tra preview, tên link tải và file PNG tải xuống.
3. Quét preview và file vừa tải bằng ít nhất hai scanner/camera, xác nhận đúng URL.
4. Thay URL, tạo lại và kiểm tra preview/file thứ hai khác mã đầu.
5. Lặp trên Chrome desktop, Chrome Android và Safari iPhone; chỉ thêm hướng dẫn Safari nếu
   download Blob thật sự không hoạt động.
6. Trong DevTools Network, xác nhận browser chỉ gọi `/api/qr`, không chứa RapidAPI key.

Phase 04 đã hoàn thành phần implementation/test cục bộ. Verification QR thật, scan và
browser/device là bằng chứng tách biệt còn chờ môi trường có provider và thiết bị phù hợp.
Chưa triển khai Phase 05, chưa commit hoặc push.
