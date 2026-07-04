# Quy ước từ vựng hiển thị cho người dùng

Áp cho mọi chữ người dùng nhìn thấy trên màn (nhãn, nút, tiêu đề, placeholder, thông báo, toast).
Không áp cho tên biến, tên hàm, comment trong code. Mục tiêu: bỏ giọng máy, mã nội bộ, thuật ngữ
kỹ thuật; viết tiếng Việt tự nhiên cho chủ và nhân viên phòng khám.

## Viết tắt nội bộ, phải viết đầy đủ
- CR  ->  khoản hoa hồng (hoặc "hoa hồng" tùy ngữ cảnh)
- HH  ->  hoa hồng
- KT  ->  kế toán
- NV  ->  nhân viên
- TC  ->  trưởng ca
- BS  ->  bác sĩ
- ĐD-Sale  ->  điều dưỡng
- Mã KH / KH-xxxx  ->  mã khách hàng (viết đủ chữ; ví dụ "Mã khách hàng: 0007")

## Tiếng Anh kỹ thuật, đổi sang tiếng Việt
- refund / REFUND  ->  hoàn tiền
- reject  ->  từ chối
- review  ->  xem lại
- active  ->  đang làm việc
- target  ->  mục tiêu (ở màn xếp hạng) / chỉ tiêu (ở quản lý nhân sự)
- cycle  ->  kỳ (hoặc tháng)
- export  ->  xuất file
- adjustment  ->  điều chỉnh
- revert  ->  khôi phục
- bulk-all / bulk  ->  hàng loạt (hoặc "toàn bộ")
- Auto  ->  tự động
- bind / unbind / force unbind  ->  gắn thiết bị / gỡ thiết bị
- session  ->  phiên đăng nhập
- Bound  ->  đăng nhập lúc
- logout  ->  đăng xuất
- pending  ->  chưa xong
- handover  ->  bàn giao
- audit  ->  lưu vết tra cứu (hoặc "để tra cứu")
- snapshot  ->  tại thời điểm tạo
- flat rate  ->  mức cố định
- tier  ->  bậc
- admin  ->  quản lý
- Mã code / mã code  ->  mã

## Cấp bậc, bỏ mã, dùng tên (anh đã chốt)
- Bỏ mã M0, M1, M2, M3, L1, L2, L3 khỏi chữ hiển thị.
- Điều dưỡng: Tập sự, Đồng, Bạc, Vàng.
- Bác sĩ: Sơ cấp, Trung cấp, Chuyên gia.
- Áp ở shared/types.ts (RANKING_LABEL) và mọi nơi đang hiện mã bậc thô.

## iHOS (tên hệ thống bệnh viện)
- Ở phần quản lý cấu hình nhân sự: giữ tên iHOS nhưng gọn, "iHOS User ID" -> "Mã iHOS".
- Ở chỗ nhân viên thường nhìn thấy (ví dụ gợi ý lý do từ chối "không khớp iHOS"): bỏ tên kỹ thuật,
  đổi thành "không khớp số liệu hệ thống".

## Mã hiệu tài liệu nội bộ và tên riêng, phải bỏ khỏi chữ hiển thị
- Bỏ hết: R-11-7, R-1-3, B2.3, MS-9, MS-12, "Phase 2", "placeholder", "typed confirmation".
- Bỏ tên riêng lọt ra UI (ví dụ "Diễm" trong màn duyệt hoa hồng), thay bằng vai trò ("kế toán").

## Giữ nguyên (đã quen thuộc với người Việt)
- SĐT, VAT, VIP, OTP, Zalo, CEO, Excel.
- Mã dịch vụ kiểu DV-001 (mã sản phẩm có chủ đích, người dùng tra cứu được).

## Chính tả
- "kì"  ->  "kỳ".
