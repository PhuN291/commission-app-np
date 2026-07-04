# Bản đồ lỗ hổng toàn app, xếp theo bốn đợt

Cập nhật: 18/06/2026. Đây là toàn bộ lỗ hổng em đã đọc code và nắm được, kèm thời điểm sửa.
Mục đích: anh nhìn một chỗ là biết em có miss gì không, và cái gì sửa khi nào.

Nguyên tắc: làm lần lượt từng đợt, xong mới sang đợt sau. Mỗi lần đụng một hệ mới thì dọn
hệ cũ ngay trong cùng đợt, không để song song.

Tiến độ: đợt 1 xong, đợt 2 xong, đang vào đợt 3.

---

## Đợt 1 · Khâu tiền — ĐÃ XONG

- Hoa hồng gom về một mối (database), bỏ bốn file đồ giả.
- Màn duyệt, chi tiết đơn, thông báo, thu nhập, trang chủ cùng đọc một nguồn.
- Thưởng phạt và truy thu là dữ liệu thật.
- Trang chủ, xếp hạng, màn thu nhập cùng một con số hoa hồng.
- Biên dịch sạch, các thao tác duyệt chạy trong giao dịch an toàn.

---

## Đợt 2 · Bảo mật — ĐÃ XONG

- Mọi cửa API phải đăng nhập mới vào, trừ hai cửa đăng nhập.
- Phiên hết hạn sau 24 giờ.
- Chặn tài khoản đã nghỉ hoặc bị khóa.
- Thu hồi phiên ngay khi cho nhân viên nghỉ.
- Nhân viên không sửa và không tạo đơn hộ người khác.
- OTP không lộ mã ra ngoài, mã đăng nhập tạm là 062026, có giới hạn số lần xin mã.
- Log không in token và dữ liệu khách.
- Đã bịt cửa cũ lộ thu nhập của Mai.

Còn tồn đã ghi nhận, chuyển sang đợt 3 hoặc khi có Zalo: lọc danh sách đơn và khách theo người;
chính sách người sắp nghỉ vẫn đăng nhập lại được; hoàn thiện chống dò OTP khi nối Zalo OA thật;
một đường dẫn API không tồn tại trả về trang giao diện thay vì báo lỗi gọn.

Lưu ý: mã 062026 chỉ là lối tạm. Cửa đăng nhập chỉ thực sự kín khi nối Zalo OA gửi OTP thật.

---

## Đợt 3 · Dọn nhất quán — ĐANG LÀM

Đợt này nhiều món nhưng phần lớn là dọn. Các món khá độc lập nên chia thành bốn mẩu, làm lần
lượt, test xong mẩu này mới sang mẩu sau.

Mẩu 1. Gộp hai hệ tái khám về một.
Hiện trang khách và chi tiết khách đọc hệ cũ trong bộ nhớ (mất khi restart), còn màn danh sách
gọi tái khám đọc hệ mới trong database. Hai bên không biết nhau. Gộp về một nguồn database duy
nhất, bỏ hệ cũ, và chỉ người chăm gốc mới thao tác lượt của khách mình.

Mẩu 2. Lọc danh sách đơn và khách theo người.
Nhân viên chỉ thấy đơn và khách của mình; trưởng ca, kế toán, CEO thấy hết. Đây là phần hoãn
từ đợt 2.

Mẩu 3. Dọn Settings.
Nối nhóm Auto Rule thưởng và nhóm Kì lương vào database cho hết mất khi restart. Thu gọn sáu
nhóm chỉ để xem hoặc còn trống, gắn nhãn rõ là để sau.

Mẩu 4. Dọn hiển thị.
Bỏ sáu màn giả (bốn màn phân tích, trợ lý AI, hiệu suất cá nhân). Thay tám nhân viên ảo trên
trang chủ admin bằng người thật. Lịch sử lên hạng tính từ đơn thật. Màn chi tiết đơn tách dòng
hủy và truy thu khỏi dòng chờ duyệt. Tách dữ liệu demo khỏi cấu hình trong seed. Dọn kho lưu
trữ trong bộ nhớ đã chết.

---

## Đợt 4 · Đa nguồn và bác sĩ — CHỜ iHOS

Làm khi iHOS trả lời kỹ thuật.

- Cổng nhận đơn hai pha: đặt chỗ và khám xong tách nhau, chốt hoa hồng theo lúc khám xong.
- Thực thi chống trùng đơn.
- Nối iHOS tự động.
- Nối website đặt lịch đồng bộ về app.
- Gán bác sĩ vào đơn hoặc từng dịch vụ, lấy từ iHOS. Khi đó bác sĩ mới có đơn, khách, và được
  tính hoa hồng. Hiện bác sĩ chưa được gán vào đâu nên tạm chưa hoạt động trong app, chấp nhận
  tới đợt này.
- Cần làm mịn một đơn xuống từng dịch vụ, vì một khách nhiều dịch vụ có thể nhiều bác sĩ khác nhau.

Câu hỏi phải gửi iHOS (soạn sau): iHOS trả thông tin bác sĩ thực hiện ở mức từng dịch vụ hay cả
ca, và bằng định danh gì để map về iHOS User ID của bác sĩ trong app.

---

## Phần Settings, mổ xẻ riêng (xử ở đợt 3 mẩu 3)

Màn cài đặt bày ra mười nhóm, nhưng phần lớn bấm không được. Đây là lý do thấy loạn.

| Nhóm | Tình trạng thật | Nên làm |
|---|---|---|
| 1. Matrix phần trăm hoa hồng | Thật, mở trang cấu hình riêng, lưu database | Giữ |
| 2. Ranking | Chỉ hiển thị, ngưỡng là tạm, nút sửa bị khóa | Giữ dạng xem, ghi rõ chờ chốt |
| 3. Vai trò | Năm vai cứng, nút thêm bị khóa | Thu gọn, để nhãn sau |
| 4. Ca làm việc | Một ca cứng, nút sửa bị khóa | Thu gọn, để nhãn sau |
| 5. Voucher | Thật, mở trang voucher riêng | Giữ |
| 6. Auto Rule thưởng | Sửa được, nhưng lưu trong bộ nhớ, mất khi restart | Nối database |
| 7. Kì lương | Sửa được, nhưng lưu trong bộ nhớ, mất khi restart | Nối database |
| 8. Tái khám | Chỗ trống, chờ iHOS | Để nhãn, gọn lại |
| 9. Nhắc lịch Zalo | Chỗ trống, chờ đăng ký Zalo OA | Để nhãn, gọn lại |
| 10. Lưu trữ nhật ký | Bảng tĩnh chỉ để đọc | Giữ dạng xem |

Hai vấn đề chính: nhóm 6 và 7 sửa được nhưng mất khi restart, nguy hiểm vì nhóm 6 dùng để tự
sinh thưởng cuối tháng; sáu nhóm còn lại bày ra nhưng không dùng được, gây rối. Cả hai xử ở mẩu 3.

---

## Việc của anh, chạy song song, không chặn code

- CEO chốt phần trăm hoa hồng thật và giá vốn dịch vụ.
- Đăng ký Zalo OA.
- Gửi yêu cầu tích hợp iHOS.
