# Đợt 3 mẩu 5b: rà chữ nhóm bậc và nhân sự

Nhóm này gồm tên bậc (trong shared/types.ts) và ba màn xếp hạng, cấu hình hoa hồng, nhân sự. Sửa
theo bảng quy ước audit-docs/QUY-UOC-TU-VUNG.md. CHỈ sửa chữ hiển thị, không đụng logic, tên biến,
key enum.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Tiếp tục rà chữ hiển thị cho tự nhiên theo bảng quy ước audit-docs/QUY-UOC-TU-VUNG.md.
Nhóm này gồm: shared/types.ts (bảng tên bậc), client/src/pages/ranking.tsx,
client/src/pages/admin-commission-config.tsx, client/src/pages/admin-staff.tsx. CHỈ sửa chuỗi người
dùng nhìn thấy. KHÔNG đụng key enum, tên biến, tên hàm, logic.

Đọc bảng quy ước trước, rồi áp.

1. shared/types.ts — bảng RANKING_LABEL (chuỗi hiển thị tên bậc):
   - Bỏ mã trong tên, dùng tên thuần Việt. Đổi GIÁ TRỊ chuỗi (không đổi key M0/M1/M2/M3/L1/L2/L3):
     M0 -> "Tập sự", M1 -> "Đồng", M2 -> "Bạc", M3 -> "Vàng",
     L1 -> "Sơ cấp", L2 -> "Trung cấp", L3 -> "Chuyên gia".
   - GIỮ NGUYÊN danh sách RANKINGS và các key (M0... L3) vì là mã định danh nội bộ; chỉ đổi nhãn.

2. ranking.tsx:
   - "tier" -> "bậc" ở mọi chữ hiển thị.
   - Chỗ đang hiện mã bậc thô (ví dụ {user.ranking} ra "M0", nextTier ra "L2"): đổi sang tên bậc
     bằng RANKING_LABEL.
   - "target" -> "mục tiêu". "Chưa có ranking" -> "Chưa xếp bậc". "HH" -> "hoa hồng".

3. admin-commission-config.tsx:
   - "snapshot" -> "tại thời điểm tạo" (câu giải thích đơn cũ giữ tỉ lệ lúc tạo).
   - Bỏ mã "R-1-3", "B2.3" khỏi chữ hiển thị.
   - "Sale (ĐD-Sale)" -> "Điều dưỡng". "flat rate" -> "mức cố định". Nhãn "Ranking" -> "Bậc".
   - Chỗ hiện mã bậc thô trong lỗi hoặc lịch sử -> tên bậc qua RANKING_LABEL.

4. admin-staff.tsx:
   - "Target HH/tháng" -> "Chỉ tiêu hoa hồng/tháng"; "Target đơn/tháng" -> "Chỉ tiêu đơn/tháng".
   - "bind / unbind / Force unbind" -> "gỡ thiết bị" (nút và tiêu đề); "Bound:" -> "Đăng nhập lúc:";
     "session" -> "phiên đăng nhập"; "logout" -> "đăng xuất".
   - "pending" -> "chưa xong"; "handover" -> "bàn giao"; "audit" -> "để tra cứu"; "xóa mềm" ->
     viết lại tự nhiên (ví dụ "chuyển sang Đã nghỉ, dữ liệu vẫn giữ lại để tra cứu").
   - "iHOS User ID" -> "Mã iHOS" (giữ tên iHOS ở đây vì là mã định danh từ hệ thống iHOS).
   - "BS" -> "bác sĩ"; "NV" -> "nhân viên"; "user" trong câu lỗi -> "người".

Sau khi sửa, tự rà lại bốn file: chữ hiển thị không còn "tier", mã bậc thô (M0/L1...) hiện trực
tiếp, "target", "bind/unbind/session/Bound/logout/pending/handover/snapshot/flat rate", mã "R-1-3"
"B2.3", hay viết tắt BS/NV/HH. Giữ key enum và tên biến nguyên vẹn.

KHÔNG LÀM:
- KHÔNG đổi key enum (M0..L3), tên biến, hàm, logic. Chỉ đổi chuỗi hiển thị và giá trị nhãn trong
  RANKING_LABEL.
- KHÔNG đụng máy chủ, không đụng màn khác.

KHÔNG LÀM HỎNG:
- Xếp hạng, cấu hình hoa hồng, quản lý nhân sự vẫn chạy đúng.
- Trình biên dịch sạch.

TEST (báo rõ):
1. npm run check (tsc) sạch.
2. Mở màn Xếp hạng: hiện tên bậc (Tập sự, Đồng... Sơ cấp, Trung cấp, Chuyên gia), không còn mã
   M0/L1 hay chữ "tier", "target".
3. Mở Cấu hình hoa hồng và Nhân sự: không còn snapshot, flat rate, R-1-3, Target, bind, session,
   Bound, logout, pending, handover; "Mã iHOS" hiển thị gọn.
4. Chức năng (promote, lưu tỉ lệ, gỡ thiết bị, đánh dấu nghỉ) vẫn chạy; không console error.

TIÊU CHÍ HOÀN THÀNH: nhóm bậc và nhân sự hết giọng máy, tên bậc thuần Việt, chức năng và biên dịch
nguyên vẹn. Báo lại kết quả test.
```

---

Sau nhóm này còn nhóm cuối là các màn nhẹ (trang chủ, đơn hàng, đăng nhập, voucher, chi tiết dịch
vụ, tạo đơn) với vài chỗ lẻ. Anh chạy xong dán kết quả, em đọc chữ kiểm.
