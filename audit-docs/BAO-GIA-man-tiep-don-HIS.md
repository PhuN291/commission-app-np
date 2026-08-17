# Báo giá hạng mục màn tiếp đón và kết nối HIS

Hạng mục phát sinh ngoài hợp đồng app hoa hồng. Bản này gồm hai phần: phần trên gửi khách được, phần
dưới là ghi chú nội bộ chỉ anh Phú xem.

---

# PHẦN GỬI KHÁCH

## Bối cảnh

HIS hiện tại của phòng khám là giải pháp đóng gói của bên thứ ba, không cho tùy biến sâu và không tạo
được khách ở trạng thái đã đặt lịch nhưng chưa đến. Để xử lý, hai bên kỹ thuật thống nhất bổ sung một
màn tiếp đón. Nhân viên tiếp đón nhập thông tin khách khi khách tới, dữ liệu từ màn này được đẩy về cả
HIS để bác sĩ khám, và về app hoa hồng để ghi nhận khách đã đến.

## Phạm vi công việc

Phần A: Màn tiếp đón và kết nối app hoa hồng

- Thiết kế nghiệp vụ và giao diện màn tiếp đón cho nhân viên lễ tân.
- Xây dựng màn nhập thông tin khách khi tới.
- Kết nối dữ liệu về app hoa hồng để ghi nhận khách đã đến và cập nhật đơn.
- Kiểm thử trọn luồng phía app.

Phần B: Kết nối sang HIS

- Đẩy dữ liệu tiếp đón sang HIS qua API của HIS.
- Kiểm thử luồng đồng bộ hai chiều.

## Điều kiện thực hiện

Phần B phụ thuộc việc bên HIS cung cấp API và cho phép kết nối đẩy dữ liệu. Nếu HIS không hỗ trợ hoặc
giới hạn kỹ thuật, hai bên sẽ thống nhất phương án thay thế và điều chỉnh phạm vi tương ứng.

## Chi phí

| Hạng mục | Chi phí |
|---|---|
| Phần A: Màn tiếp đón và kết nối app hoa hồng | (điền sau khi anh chốt đơn giá) |
| Phần B: Kết nối sang HIS | (điền, ghi kèm chữ phụ thuộc API HIS) |
| Tổng | |

## Thời gian và thanh toán

- Thời gian dự kiến: khoảng 2 tới 3 tuần kể từ khi chốt, phần B tùy tiến độ bên HIS.
- Thanh toán: tạm ứng khi bắt đầu, phần còn lại khi nghiệm thu.

---

# PHẦN GHI CHÚ NỘI BỘ (không gửi khách)

## Khối lượng ước tính

| Phần việc | Ngày công |
|---|---|
| Thiết kế nghiệp vụ và màn (Hiển và team) | 1 tới 2 |
| Giao diện màn tiếp đón | 2 tới 3 |
| Phía app hoa hồng nhận dữ liệu (nhẹ, đã có nền ingest sẵn) | 1 tới 2 |
| Kết nối HIS (ẩn số, tùy API) | 3 tới 7 |
| Kiểm thử trọn luồng | 1 tới 2 |
| Tổng | 8 tới 16 |

Phần A gọn trong 5 tới 8 ngày, mình chủ động được. Phần B là ẩn số vì chưa có tài liệu API HIS.

## Con số đề xuất

Em tạm lấy đơn giá bán ra 1,5 triệu một ngày công để có điểm neo. Anh áp đơn giá thật của 1PDM vào
là ra số cuối.

- Phần A: 6 ngày, khoảng 10 tới 12 triệu.
- Phần B: 5 ngày, khoảng 8 tới 10 triệu, ghi kèm phụ thuộc API HIS.
- Tổng package: khoảng 18 tới 22 triệu.

Đây là mức để anh cân, chưa phải giá chốt. Tùy quan hệ với phòng khám và mặt bằng anh từng báo mà
kéo lên hoặc xuống.

## Ba điều nhớ khi chốt

- Giữ câu điều kiện phần B trong báo giá. Đây là lưới an toàn để không nuốt lời nếu API HIS không làm
  được.
- Lấy tạm ứng khi bắt đầu, đừng để trắng tay tới lúc nghiệm thu. Phần B rủi ro cao nên tạm ứng càng
  quan trọng.
- Chi phí Hiển cho phần thiết kế nghiệp vụ màn này nằm trong hợp đồng cố vấn đang deal, hay tính
  riêng, anh làm rõ để khỏi trả hai lần.
