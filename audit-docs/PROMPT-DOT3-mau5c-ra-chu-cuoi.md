# Đợt 3 mẩu 5c: rà chữ nhóm cuối

Nhóm cuối của việc rà chữ: vài màn nhẹ còn chỗ lẻ, các nhãn còn sót trong shared/types.ts (nhãn
thông báo, thông điệp lỗi, nhật ký thao tác), và một tên nhân viên mẫu trong seed. Sửa theo bảng
quy ước audit-docs/QUY-UOC-TU-VUNG.md. CHỈ sửa chữ hiển thị, giữ key và logic.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Mẩu cuối rà chữ hiển thị cho tự nhiên theo bảng quy ước audit-docs/QUY-UOC-TU-VUNG.md.
CHỈ sửa chuỗi người dùng nhìn thấy, KHÔNG đụng key enum, tên biến, hàm, logic.

Đọc bảng quy ước trước, rồi áp cho các chỗ sau.

1. Các màn nhẹ (client/src/pages):
   - dashboard.tsx: "NV active" -> "nhân viên đang làm"; "NV" -> "nhân viên"; nếu ô chỉ số "Đơn"
     có chú thích cụt thì viết rõ hơn (ví dụ "Đã chốt trên tổng đơn").
   - orders.tsx: "Chưa có đơn refund." -> "Chưa có đơn hoàn tiền."
   - order-create.tsx: "HH {tiền}" -> "Hoa hồng {tiền}".
   - login.tsx: "Liên hệ admin" -> "Liên hệ quản lý".
   - admin-vouchers.tsx và admin-voucher-detail.tsx: "mã code" / "Mã code" -> "mã".
   - service-detail.tsx: "HH:" -> "Hoa hồng:".

2. shared/types.ts — các bảng nhãn hiển thị còn sót (CHỈ đổi giá trị chuỗi, GIỮ key):
   - NOTIFICATION_LABEL: đổi viết tắt "HH" thành "hoa hồng" (ví dụ "HH bị từ chối" -> "Hoa hồng bị
     từ chối"; "HH được duyệt" -> "Hoa hồng được duyệt"). "CR" nếu có -> "hoa hồng".
   - AUDIT_ACTION_LABEL: các dòng cr.* và adjustment.* đổi "CR" -> "hoa hồng", "HH" -> "hoa hồng"
     (ví dụ "Duyệt CR" -> "Duyệt hoa hồng", "Từ chối CR" -> "Từ chối hoa hồng"). Giữ key.
   - Thông điệp kiểm tra dữ liệu (zod messages): "BS bắt buộc có iHOS User ID" -> "Bác sĩ bắt buộc
     có Mã iHOS"; "Ranking không hợp lệ với role" -> "Bậc không hợp lệ với vai trò".

3. server/seed.ts — tên nhân viên mẫu: đổi "BS Trần Minh" thành "Trần Minh" (bỏ tiền tố chức danh
   trong tên người; vai bác sĩ đã có ở cột vai trò). Nếu còn tên mẫu nào khác dính tiền tố chức
   danh trong tên thì bỏ tương tự.

Sau khi sửa, rà lại: các màn và nhãn trên không còn viết tắt CR/HH/NV, không còn "refund", "admin"
(nghĩa quản trị), "mã code", "iHOS User ID", "Ranking" trong chữ hiển thị. Giữ SĐT, VAT, VIP, OTP,
Zalo, CEO.

KHÔNG LÀM:
- KHÔNG đổi key enum, tên biến, hàm, logic. Chỉ đổi chuỗi hiển thị.
- KHÔNG đụng các phần đã rà ở mẩu trước.

KHÔNG LÀM HỎNG:
- Chức năng nguyên vẹn; thông báo, nhật ký, đăng nhập, voucher vẫn chạy.
- Trình biên dịch sạch.
- Đổi tên seed không làm vỡ chỗ nào tham chiếu theo tên (nếu có chỗ tìm theo tên "BS Trần Minh"
  thì cập nhật theo, nhưng thường tham chiếu theo id hoặc username nên an toàn).

TEST (báo rõ):
1. npm run check (tsc) sạch.
2. Mở trang chủ, đơn hàng, tạo đơn, đăng nhập, voucher, chi tiết dịch vụ: không còn viết tắt hay
   tiếng Anh kỹ thuật trong chữ hiển thị.
3. Màn Thông báo và nhật ký thao tác: nhãn đã đầy đủ "hoa hồng", không còn "CR/HH".
4. Màn Nhân sự: tên nhân viên mẫu hiển thị "Trần Minh", không còn "BS Trần Minh".
5. Không console error.

TIÊU CHÍ HOÀN THÀNH: hết các chỗ giọng máy còn lại trên toàn app; chức năng và biên dịch nguyên
vẹn. Báo lại kết quả test.
```

---

Xong nhóm này là khép mẩu rà chữ, cũng là khép đợt 3 (dọn nhất quán). Sau đó toàn bộ phần làm được
mà không cần iHOS đã xong; chỉ còn đợt đa nguồn và bác sĩ chờ tích hợp iHOS. Anh chạy xong dán kết
quả, em đọc chữ kiểm lần cuối.
