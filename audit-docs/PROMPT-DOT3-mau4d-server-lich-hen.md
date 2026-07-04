# Đợt 3 mẩu 4d: máy chủ cho Phân tích lịch hẹn

Phần máy chủ để màn Phân tích lịch hẹn chạy số thật. Mẩu này chỉ làm máy chủ, test bằng gọi API.
Giao diện màn dựng ở mẩu sau.

Lưu ý quan trọng: màn cũ có khối "Tỉ lệ hoàn thành theo bác sĩ", nhưng bác sĩ chưa được gán vào đơn
(thuộc đợt iHOS). Vì vậy mẩu này KHÔNG làm phần theo bác sĩ, để dành đợt iHOS. Tương tự, các con số
phân tích tính theo kỳ tạo đơn (cùng cách tính kỳ như màn tổng quan), không theo ngày hẹn, để nhất
quán và vì ngày hẹn có thể trống.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Màn Phân tích lịch hẹn sắp dựng lại bằng số thật. Mẩu này làm máy chủ: một endpoint trả
số liệu lịch hẹn tính từ dữ liệu thật (orders với appointmentStatus, visitStatus, appointmentTime;
và dữ liệu tái khám). CHỈ làm máy chủ. KHÔNG làm phần theo bác sĩ (bác sĩ chưa được gán, để đợt iHOS).

Quy ước trạng thái (đã có trong shared/status.ts):
- appointmentStatus: pending, confirmed, reminded, arrived, no_show, cancelled, rescheduled.
- visitStatus: arrived, in_progress, completed, cancelled.
- Định nghĩa dùng cho thống kê:
  - Đến khám = đơn đã check-in: appointmentStatus = arrived HOẶC visitStatus khác null.
  - Hoàn thành = visitStatus = completed.
  - Không đến = appointmentStatus = no_show.
  - Hủy = appointmentStatus = cancelled HOẶC visitStatus = cancelled.
- Kỳ: theo tháng tạo đơn (orderCycle, cùng cách màn tổng quan).

VIỆC — Endpoint GET /api/analytics/appointments
- Quyền: requireRole(["ceo","tc","kt"]).
- Tham số ?cycle=YYYY-MM, mặc định kỳ hiện tại.
- Đặt tính toán trong server/analytics.ts (thêm hàm getAnalyticsAppointments), tái dùng helper
  orderCycle, dayOfOrder, daysInCycle, prevCycleOf, trendPct, round1 đã có. Route chỉ gọi và trả.
- Trả JSON gồm các phần, số thật của kỳ:
  1. kpis (kèm % thay đổi so kỳ trước):
     - tongLichHen: tổng số đơn tạo trong kỳ.
     - tyLeDenKham: số đơn đến khám chia tổng, phần trăm.
     - tyLeKhongDen: số đơn không đến chia tổng, phần trăm.
     - tyLeTaiKham: số lượt tái khám đã đặt lại chia tổng số lượt cần gọi, phần trăm
       (lấy từ dữ liệu tái khám: order_items có recallDueDate; đã đặt lại = recallStatus scheduled).
  2. theoNgay: mảng theo ngày trong kỳ, mỗi ngày có tong, hoanThanh, khongDen.
  3. theoKhungGio: đếm số đơn theo khung giờ hẹn, dựa appointmentTime (gom theo giờ, ví dụ 08-09).
     Bỏ qua đơn không có giờ hẹn.
  4. phanBoTrangThai: số đơn theo từng trạng thái gộp (dùng deriveOrderStatus đã có, hoặc nhóm hợp
     lý: chờ xác nhận, đã xác nhận, đang khám, hoàn thành, không đến, hủy), mỗi mục có tên và số.
  5. khongDen: { tyLe (phần trăm kỳ này), xuHuong: sáu kỳ gần nhất mỗi kỳ có tháng và tỷ lệ không đến }.
  6. taiKham: { canGoi, daDatLai, tuChoi, chuaLienHe } đếm theo lượt tái khám trong kỳ
     (canGoi = lượt còn pending; daDatLai = scheduled; tuChoi = refused; chuaLienHe = pending mà chưa
     có lần gọi nào trong nhật ký).
- Tiền không liên quan ở màn này; các số là đếm và tỷ lệ.

KHÔNG LÀM:
- KHÔNG làm phần theo bác sĩ (để đợt iHOS khi có gán bác sĩ).
- KHÔNG đụng giao diện (mẩu sau).
- KHÔNG đụng hoa hồng, settings, các phần khác.

KHÔNG LÀM HỎNG:
- Chịu được kỳ không có đơn (trả số 0, mảng rỗng, không lỗi).
- Trình biên dịch sạch.

TEST (báo rõ):
1. npm run check (tsc) sạch.
2. Đăng nhập CEO, gọi GET /api/analytics/appointments: trả đủ các phần, số khớp dữ liệu kỳ
   (đối chiếu tổng lịch hẹn, tỷ lệ đến và không đến, phân bố trạng thái).
3. Nhân viên thường gọi bị 403.
4. Kỳ không có đơn: không lỗi.

TIÊU CHÍ HOÀN THÀNH: có endpoint trả số liệu lịch hẹn thật theo kỳ (không gồm phần bác sĩ); quyền
đúng; biên dịch sạch. Báo lại vài con số mẫu để đối chiếu.
```

---

Xong phần máy chủ này, em lên mẩu cuối là dựng giao diện màn lịch hẹn (giữ bố cục, bỏ khối bác sĩ),
rồi tới mẩu rà chữ toàn app. Anh chạy hai lệnh đang có (sửa định dạng tiền, rồi máy chủ lịch hẹn),
dán kết quả, em đọc code kiểm từng cái.
