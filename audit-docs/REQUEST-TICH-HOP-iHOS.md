# Yêu cầu tích hợp dữ liệu với iHOS

Bên gửi: 1PDM Agency, đơn vị xây dựng phần mềm tính hoa hồng cho Phòng khám Nguyên Phương.
Bên nhận: Nhà cung cấp hệ thống iHOS.
Ngày: 11/06/2026.

Đây là bản yêu cầu kỹ thuật. Chúng tôi nêu rõ những dữ liệu và sự kiện phần mềm cần nhận từ
iHOS để tính hoa hồng cho nhân viên phòng khám. Đề nghị phía iHOS xác nhận khả năng đáp ứng
từng mục bên dưới. Mục nào không đáp ứng được, đề nghị nêu rõ để chúng tôi chuẩn bị phương
án thay thế.

---

## 1. Bối cảnh ngắn

Phần mềm hoa hồng nhận thông tin ca khám thực tế từ iHOS để tính tiền cho nhân viên. iHOS là
nơi diễn ra việc khám và là nguồn dữ liệu thật về dịch vụ đã làm, người thực hiện, chi phí,
bảo hiểm. Phần mềm của chúng tôi chỉ nhận và xử lý, không ghi ngược vào iHOS.

---

## 2. Phương thức kết nối mong muốn

- Ưu tiên: iHOS chủ động đẩy sự kiện sang phần mềm của chúng tôi theo thời gian thực (webhook
  gọi tới một địa chỉ chúng tôi cung cấp).
- Kèm theo: một cổng cho phép phần mềm chúng tôi chủ động hỏi lại chi tiết một đơn (API truy
  vấn theo mã đơn), dùng để đối soát và lấy lại khi sự kiện bị sót.

Đề nghị iHOS xác nhận hỗ trợ webhook đẩy, API truy vấn, hay cả hai.

---

## 3. Các sự kiện cần nhận

| Sự kiện | Ý nghĩa | Mức cần |
|---|---|---|
| Tạo đơn | Khách có lịch hoặc bắt đầu một ca | Cần |
| Khách đến (check-in) | Khách tới phòng khám | Cần |
| Bắt đầu khám | Một bác sĩ bắt đầu thực hiện, kèm danh tính bác sĩ | Rất cần |
| Khám xong | Ca hoàn tất, chốt dịch vụ thực làm | Rất cần |
| Hoàn tiền | Hoàn toàn phần hoặc một phần, theo từng dịch vụ | Cần |
| Hủy đơn | Đơn bị hủy | Cần |
| Sửa đơn | Thêm hoặc bớt dịch vụ trong đơn | Cần |

---

## 4. Dữ liệu cần kèm theo mỗi sự kiện

Mức tối thiểu để tính được hoa hồng:

- Mã đơn của iHOS.
- Mã tham chiếu của chúng tôi, nếu có (xem mục 5).
- Khách: mã khách và số điện thoại.
- Danh sách dịch vụ trong đơn, mỗi dịch vụ gồm:
  - Mã và tên dịch vụ.
  - Giá bán.
  - Giá vốn.
  - Người thực hiện (mã nhân sự bên iHOS) và vai trò (bác sĩ, điều dưỡng, kỹ thuật viên).
  - Trạng thái: đã làm, hay bỏ dở.
- Tiền bảo hiểm chi trả cho đơn.
- Tiền voucher giảm giá nếu có.
- Số tiền khách thực trả ra túi.
- Với hoàn tiền: hoàn dịch vụ nào và số tiền hoàn của từng dịch vụ.
- Ngày hẹn tái khám do bác sĩ chỉ định, nếu có.
- Thời điểm xảy ra sự kiện.

Trong các trường trên, hai trường quan trọng nhất với chúng tôi là giá vốn từng dịch vụ và
người thực hiện từng dịch vụ. Nếu iHOS không gửi được một trong hai, đề nghị nêu rõ, vì
chúng tôi sẽ phải bù bằng nhập tay.

---

## 5. Cơ chế ghép đơn, mục quan trọng nhất

Một ca khám có thể được tạo trước ở phần mềm của chúng tôi (khi nhân viên lên đơn hoặc khách
đặt trên website), rồi mới tới iHOS khi khách đến khám. Chúng tôi cần ghép đúng ca ở iHOS với
đơn đã tạo bên mình, để không tính nhầm hay tính trùng.

Đề nghị phía iHOS cho biết hỗ trợ được cách nào sau đây:

1. Cách tốt nhất: chúng tôi gửi kèm một mã tham chiếu khi tạo đơn, iHOS lưu mã đó và trả lại
   nguyên vẹn trong mọi sự kiện gửi về của đơn đó.
2. Nếu không, đề nghị iHOS cho phép tra cứu một đơn theo số điện thoại khách cộng ngày khám,
   để chúng tôi tự ghép.
3. Nếu cả hai đều không, đề nghị nêu cách iHOS định danh một đơn để chúng tôi tìm phương án.

---

## 6. Độ tin cậy và bảo mật

- Khi gửi lại cùng một sự kiện nhiều lần, mỗi sự kiện có một mã riêng để chúng tôi nhận ra và
  không xử lý trùng. Đề nghị iHOS xác nhận có gửi kèm mã sự kiện duy nhất.
- Chính sách gửi lại khi thất bại: số lần thử lại và khoảng cách giữa các lần.
- Cách xác thực kết nối để đảm bảo dữ liệu đúng là từ iHOS, ví dụ khóa bí mật hoặc chữ ký.
- Cách lấy lại dữ liệu của một khoảng thời gian khi đường truyền gặp sự cố.

---

## 7. Đề nghị kèm theo

- Tài liệu kỹ thuật mô tả các sự kiện và dữ liệu.
- Một vài ví dụ dữ liệu mẫu thật của mỗi sự kiện.
- Một môi trường thử để hai bên ghép nối trước khi chạy thật.

---

## 8. Cách phản hồi mong muốn

Đề nghị phía iHOS đánh dấu từng mục ở trên theo ba mức: đáp ứng được, đáp ứng được một phần,
hoặc không đáp ứng được. Với mục đáp ứng một phần hoặc không, xin nêu lý do và gợi ý cách
thay thế nếu có. Chúng tôi sẽ dựa vào đó để chốt phần nào lấy tự động từ iHOS, phần nào bù
bằng nhập tay.

Trân trọng cảm ơn.
