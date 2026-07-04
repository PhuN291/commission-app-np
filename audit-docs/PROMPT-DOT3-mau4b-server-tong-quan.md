# Đợt 3 mẩu 4b: máy chủ cho Phân tích tổng quan, và bảng xếp hạng trang chủ người thật

Đây là phần máy chủ để màn Phân tích tổng quan chạy số thật. Mẩu này chỉ làm máy chủ, test bằng
gọi API. Giao diện màn dựng ở mẩu sau. Gộp luôn việc sửa bảng xếp hạng trang chủ về người thật,
vì cùng phải tính doanh số và hoa hồng theo nhân viên.

Quy ước số liệu đã chốt với anh:
- Bỏ chỉ số lợi nhuận (chờ giá vốn). Chỉ làm theo doanh thu.
- Khách quay lại: khách có từ hai đơn trở lên.
- Doanh thu thực thu của một đơn: giá niêm yết trừ bảo hiểm trừ voucher (giống cách engine tính
  tiền khách trả). Chỉ tính đơn đã khám xong.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Màn Phân tích tổng quan sắp dựng lại bằng số thật. Mẩu này làm phần máy chủ: một endpoint
trả toàn bộ số liệu tổng quan tính từ dữ liệu thật (orders, order_items, commission_records,
customers), và sửa bảng xếp hạng trên trang chủ quản lý sang người thật. CHỈ làm máy chủ.

Định nghĩa số liệu (theo đúng quy ước):
- Doanh thu thực thu một đơn = totalListed trừ insuranceAmount trừ voucherAmount. Chỉ tính đơn đã
  khám xong (visitStatus = completed). Nếu đơn có hoàn tiền thì trừ tiếp số đã hoàn.
- Kỳ: theo tháng dương lịch của ngày tạo đơn, dùng cùng cách tính cycle như engine và màn thu nhập.
- Khách quay lại: khách có từ hai đơn trở lên (đếm theo số điện thoại).

VIỆC 1 — Endpoint GET /api/analytics/overview
- Quyền: requireRole(["ceo","tc","kt"]) (quản lý xem; nhân viên thường không vào màn này).
- Tham số: ?cycle=YYYY-MM, mặc định kỳ hiện tại.
- Trả về một JSON gồm các phần sau, mỗi phần là số thật của kỳ:
  1. kpis: bốn chỉ số kèm phần trăm thay đổi so kỳ trước:
     - doanhThuThucThu: tổng doanh thu thực thu các đơn khám xong trong kỳ.
     - soDonHoanThanh: số đơn khám xong trong kỳ.
     - giaTriTbDon: doanhThuThucThu chia soDonHoanThanh (0 nếu không có đơn).
     - tyLeChot: số đơn khám xong chia tổng số đơn tạo trong kỳ, theo phần trăm.
  2. doanhThuTheoNgay: mảng theo từng ngày trong kỳ, mỗi ngày có doanh thu kỳ này và doanh thu
     cùng ngày của kỳ trước, để vẽ biểu đồ đường.
  3. doanhThuTheoDichVu: danh sách dịch vụ kèm tổng doanh thu và tỷ trọng phần trăm, sắp giảm dần.
     Lấy theo từng dòng dịch vụ trong đơn (order_items) của đơn khám xong.
  4. dichVuBanChay và dichVuCham: top dịch vụ nhiều doanh thu nhất và danh sách dịch vụ ít hoặc
     không phát sinh trong kỳ.
  5. doanhThuTheoNhanVien: mỗi nhân viên (người tạo đơn) có tổng doanh thu và tổng hoa hồng trong kỳ.
  6. doanhThuTheoNhom: tổng doanh thu theo nhóm dịch vụ (serviceCategory).
  7. khach: { moi, quayLai } trong số khách có đơn trong kỳ, bao nhiêu là khách mới (chỉ một đơn)
     và bao nhiêu là khách quay lại (từ hai đơn trở lên).
  8. hoanTien: tổng tiền hoàn trong kỳ và danh sách dịch vụ bị hoàn nhiều nhất.
  9. hoaHong: tổng hoa hồng gross của kỳ và tỷ lệ hoa hồng trên doanh thu thực thu.
- Tính toán đặt trong một file phục vụ riêng cho gọn (ví dụ server/analytics.ts), route chỉ gọi và
  trả. Dùng các hàm storage sẵn có; nếu cần thì thêm hàm đọc gọn (ví dụ lấy order_items theo nhiều
  đơn) vào storage, đừng truy vấn rải rác trong route.
- Tiền là số nguyên đồng.

VIỆC 2 — Bảng xếp hạng trang chủ quản lý người thật
- Trong getAdminDashboard (server/dashboard.ts), bỏ leaderboard lấy từ getAllStaffMembers (dữ liệu
  nhân viên ảo). Thay bằng danh sách người thật trong kỳ: mỗi nhân viên ăn hoa hồng (vai sale,
  doctor, tc) có name, role, revenue (doanh thu thực thu các đơn họ tạo trong kỳ), commission (tổng
  hoa hồng gross của họ trong kỳ), rank (xếp theo hoa hồng giảm dần). Giữ đúng hình dạng leaderboard
  mà client trang chủ đang đọc: mảng các phần tử { id, name, role, revenue, commission, rank }.
- Giữ nguyên phần còn lại của trang chủ.

KHÔNG LÀM:
- KHÔNG đụng giao diện màn Phân tích tổng quan (dựng ở mẩu sau). Mẩu này chỉ máy chủ.
- KHÔNG tính lợi nhuận hay giá vốn.
- KHÔNG đụng hoa hồng, tái khám, settings.

KHÔNG LÀM HỎNG:
- Trang chủ quản lý vẫn chạy, bảng xếp hạng vẫn hiển thị (giờ là người thật, đúng hình dạng cũ).
- Hoa hồng gross tính cùng bộ lọc đã thống nhất (loại từ chối, hủy, truy thu).
- Trình biên dịch sạch.

TEST (báo rõ):
1. npm run check (tsc) sạch.
2. Đăng nhập CEO, gọi GET /api/analytics/overview: trả đủ các phần trên với số thật khớp dữ liệu
   trong kỳ (đối chiếu vài số: doanh thu, số đơn, top dịch vụ).
3. Nhân viên thường gọi endpoint này bị chặn (403).
4. Trang chủ quản lý: bảng xếp hạng hiện người thật (không còn tên nhân viên ảo như Trần Hữu Đạt),
   số doanh thu và hoa hồng khớp dữ liệu thật.
5. Restart vẫn đúng.

TIÊU CHÍ HOÀN THÀNH: có endpoint trả số liệu tổng quan thật theo kỳ; bảng xếp hạng trang chủ là
người thật đúng hình dạng cũ; quyền đúng; biên dịch sạch. Báo lại các con số mẫu để đối chiếu.
```

---

Xong phần máy chủ và anh đối chiếu vài con số thấy khớp, em lên mẩu kế: dựng giao diện màn Phân
tích tổng quan đọc endpoint này, giữ đúng bố cục hiện có. Sau đó tới màn Phân tích lịch hẹn.
