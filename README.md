# Tùng Thiện QR Generator

## Mục tiêu

**Tùng Thiện QR Generator** là một công cụ web nhỏ để tạo mã QR miễn phí cho người dùng cuối, không quảng cáo, không yêu cầu đăng nhập và không lưu trữ đường link mà người dùng nhập.

Luồng sử dụng cốt lõi:

> Nhập đường link → Nhấn **Tạo mã QR** → Xem mã QR → Nhấn **Tải xuống**

Phiên bản MVP chỉ tập trung vào URL `http://` và `https://`, ưu tiên trải nghiệm đơn giản trên điện thoại.

## Kiến trúc được khuyến nghị

- Frontend: HTML + CSS + JavaScript thuần.
- Backend: Node.js 20+ + Express.
- QR engine: QRCode Monkey API thông qua RapidAPI.
- Backend đóng vai trò proxy để không làm lộ RapidAPI key.
- Triển khai: một ứng dụng Node.js duy nhất, phục vụ cả static frontend và endpoint `/api/qr`.
- HTTPS bắt buộc khi đưa lên môi trường thật.

## Bộ tài liệu

1. `00-PROJECT-PLAN.md` — kế hoạch tổng thể.
2. `01-REQUIREMENTS.md` — yêu cầu chức năng và phi chức năng.
3. `02-TECHNICAL-ARCHITECTURE.md` — kiến trúc kỹ thuật.
4. `03-API-CONTRACT.md` — hợp đồng API nội bộ và cách tích hợp QRCode Monkey.
5. `PHASE-01-FOUNDATION.md` — khởi tạo dự án và nền tảng.
6. `PHASE-02-UI-UX.md` — xây dựng giao diện.
7. `PHASE-03-QR-API-INTEGRATION.md` — tích hợp QRCode Monkey.
8. `PHASE-04-PREVIEW-DOWNLOAD.md` — preview, download và xử lý lỗi.
9. `PHASE-05-SECURITY-PRIVACY.md` — bảo mật, quyền riêng tư, chống lạm dụng.
10. `PHASE-06-TEST-DEPLOY.md` — kiểm thử, triển khai và vận hành.
11. `PHASE-07-V1-1-ENHANCEMENTS.md` — tính năng mở rộng sau MVP.
12. `CHECKLIST.md` — checklist nghiệm thu.

## Nguyên tắc sản phẩm

- Không quảng cáo.
- Không pop-up gây phiền.
- Không yêu cầu tài khoản.
- Không gắn tracking vào QR.
- Không lưu URL của người dùng vào database.
- Không để API key trong frontend.
- Giao diện ưu tiên mobile-first.
- Mã QR phải quét được trước khi coi là hoàn thành.

## Lưu ý về “miễn phí”

QRCode Monkey xác nhận QR được tạo là QR tĩnh, có thể dùng miễn phí và không giới hạn lượt quét. Tuy nhiên API chính thức được cung cấp qua RapidAPI, vì vậy chi phí/quota gọi API phụ thuộc gói RapidAPI đang áp dụng tại thời điểm triển khai.

Do đó, “miễn phí” trong sản phẩm này được hiểu là **người dùng cuối không phải trả phí và không xem quảng cáo**. Backend vẫn cần có cơ chế rate limit và theo dõi quota API để tránh phát sinh chi phí ngoài ý muốn.

## Tài liệu chính thức

- QRCode Monkey API: https://www.qrcode-monkey.com/qr-code-api-with-logo/
- QRCode Monkey: https://www.qrcode-monkey.com/
- RapidAPI listing: https://rapidapi.com/qrcode-monkey/api/custom-qr-code-with-logo
