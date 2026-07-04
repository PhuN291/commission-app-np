# Đợt 3 mẩu 4e: giao diện màn Phân tích lịch hẹn đọc số thật

Phần máy chủ đã xong (endpoint GET /api/analytics/appointments). Mẩu này dựng lại giao diện màn để
đọc endpoint đó, bỏ hết số cứng. Giữ bố cục và phong cách hiện có. BỎ khối "Tỉ lệ hoàn thành theo
bác sĩ" (bác sĩ chưa được gán, để đợt iHOS). CHỈ sửa client/src/pages/analytics-appointments.tsx.

Endpoint trả về (kỳ hiện tại nếu không truyền cycle):
- kpis: { tongLichHen, tyLeDenKham, tyLeKhongDen, tyLeTaiKham }, mỗi cái { value, changePct } (changePct
  có thể null).
- theoNgay: [{ ngay, tong, hoanThanh, khongDen }].
- theoKhungGio: [{ khung, so }] (vd khung "08-09").
- phanBoTrangThai: [{ code, ten, so }] (6 nhóm: Chờ xác nhận, Đã xác nhận, Đang khám, Hoàn thành,
  Không đến, Đã hủy).
- khongDen: { tyLe, xuHuong: [{ thang, tyLe }] } (6 kỳ).
- taiKham: { canGoi, daDatLai, tuChoi, chuaLienHe }.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Màn Phân tích lịch hẹn (client/src/pages/analytics-appointments.tsx) đang dùng số cứng bịa,
và có khối thống kê theo bác sĩ. Máy chủ đã có endpoint GET /api/analytics/appointments trả số thật
theo kỳ. Việc: dựng lại màn này đọc endpoint, bỏ hết số cứng, BỎ khối theo bác sĩ. Giữ bố cục và
phong cách hiện có. CHỈ sửa file analytics-appointments.tsx.

Làm:
1. Lấy dữ liệu: useQuery + authFetch gọi GET /api/analytics/appointments. Bỏ toàn bộ mảng số cứng
   trong file (kpiCards, dailyAppointmentsData, hourlyData, statusDistribution, noShowTrend,
   followUpStats, appointmentsByDoctor, các hằng noShowRate...).
2. Quyền: chỉ quản lý (ceo, tc, kt) xem; vai khác Redirect về "/", dùng đúng cách màn Phân tích tổng
   quan (analytics-overview.tsx) đang chặn vai.
3. Giữ bố cục, chỉ thay nguồn số:
   - Bốn ô chỉ số: Tổng lịch hẹn, Tỷ lệ đến khám, Tỷ lệ không đến (màu cảnh báo khi cao), Tỷ lệ tái
     khám. Mỗi ô hiện % thay đổi so kỳ trước; changePct null thì hiện "—".
   - Biểu đồ xu hướng theo ngày: từ theoNgay (tong, hoanThanh, khongDen).
   - Biểu đồ cột theo khung giờ: từ theoKhungGio.
   - Biểu đồ tròn phân bố trạng thái: từ phanBoTrangThai (ten, so).
   - Khối Phân tích không đến: đồng hồ tỷ lệ từ khongDen.tyLe, và biểu đồ xu hướng từ khongDen.xuHuong.
   - Khối Tái khám: dùng taiKham. Ánh xạ: Cần gọi = canGoi, Đã đặt lại = daDatLai, Chưa liên hệ =
     chuaLienHe, Từ chối = tuChoi.
4. BỎ HẲN khối "Tỉ lệ hoàn thành theo bác sĩ" (không có dữ liệu bác sĩ; để đợt iHOS).
5. Ghi chú nhỏ ở ô Tỷ lệ tái khám hoặc khối tái khám: tỷ lệ tái khám tính theo lượt đến hạn trong kỳ
   (khác tổng lịch hẹn tính theo đơn tạo trong kỳ), để khỏi hiểu nhầm hai con số.
6. Bỏ bộ lọc khoảng ngày (DateRangeFilter), thay bằng hiển thị kỳ hiện tại (vd "Tháng MM/YYYY"), như
   màn tổng quan.

KHÔNG LÀM:
- KHÔNG đụng máy chủ.
- KHÔNG dựng lại khối theo bác sĩ.
- KHÔNG đụng màn khác.

KHÔNG LÀM HỎNG:
- Màn chịu được kỳ ít hoặc không có dữ liệu: số 0, biểu đồ trống lịch sự, không trắng màn, không lỗi.
- Giữ phong cách, màu, thành phần dùng lại của app.
- Trình biên dịch sạch.

TEST (báo rõ, kèm ảnh nếu được):
1. npm run check (tsc) sạch.
2. Đăng nhập CEO, mở màn Phân tích lịch hẹn: các ô và biểu đồ hiện số thật khớp endpoint (đối chiếu
   tổng lịch hẹn, tỷ lệ đến và không đến, phân bố trạng thái, tái khám).
3. Không còn khối theo bác sĩ.
4. Đăng nhập nhân viên thường: bị chuyển về trang chủ.
5. Không còn số cứng; không console error.

TIÊU CHÍ HOÀN THÀNH: màn Phân tích lịch hẹn chạy hoàn toàn bằng số thật từ endpoint, không còn khối
bác sĩ, chặn vai đúng, biên dịch sạch. Báo lại kết quả test kèm ảnh.
```

---

Xong màn này là khép cụm phân tích. Đợt 3 chỉ còn mẩu rà chữ toàn app cho hết giọng máy là hết. Anh
chạy xong dán kết quả, em đọc code kiểm.
