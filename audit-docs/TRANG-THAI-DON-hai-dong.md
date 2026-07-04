# Trạng thái đơn: hai dòng app và iHOS, kèm trục thời gian

Ngày: 11/06/2026. Thuộc trục 1 và trục 5 trong bản kiểm kê tám trục.

Vấn đề gốc: một đơn có hai dòng trạng thái chạy ở hai nơi. Dòng đặt chỗ chạy bên app và
website. Dòng khám chạy bên iHOS. Nếu để chúng tự đi mà không định rõ ai làm chủ, hai bên sẽ
đá nhau. Tài liệu này định rõ.

---

## 1. Hai dòng trạng thái

### Dòng đặt chỗ, do app và website làm chủ
Đây là phần dự kiến, trước khi khách tới khám. Mình toàn quyền.

- Nháp: đang lên đơn, chưa xác nhận.
- Đã đặt: đã xác nhận lịch hẹn, chờ khách tới.
- Đóng đặt chỗ: kết thúc, theo một trong ba cách: khách đã tới và chuyển sang dòng khám, hoặc
  hủy đặt, hoặc hết hạn vì khách không tới.

### Dòng khám, do iHOS làm chủ
Đây là phần thật, mình chỉ nhận, không tự đổi.

- Chưa tới: chưa có ghi nhận khám.
- Đã tới: khách check-in tại phòng khám.
- Đang khám: bác sĩ bắt đầu thực hiện.
- Khám xong: hoàn tất, chốt dịch vụ thật.
- Hoàn tiền hoặc hủy khám: sau khi xong hoặc trong lúc khám.

### Trạng thái tổng mà app hiển thị
App gộp hai dòng thành một trạng thái đời thường cho người dùng thấy: mới tạo, đã đặt lịch
chờ khám, khách đã đến, đang khám, hoàn tất, đã hủy, hoàn tiền, quá hạn không khám.

---

## 2. Ai làm chủ chuyển nào

| Việc | Ai làm chủ | App xử lý sao |
|---|---|---|
| Tạo, sửa, hủy đặt chỗ | App và website | App tự làm, toàn quyền |
| Khách đến, khám, xong, hoàn, hủy ca | iHOS | App chỉ nhận tín hiệu, không tự đổi |
| Chốt hoa hồng | App | Chốt đúng lúc iHOS báo khám xong |

Nguyên tắc xử mâu thuẫn: khi dòng đặt chỗ và dòng khám nói khác nhau, tin iHOS cho mọi thứ
thuộc về ca khám thật. Ví dụ app còn nghĩ đang chờ mà iHOS đã báo xong, thì theo iHOS.

---

## 3. Điểm chốt hoa hồng

Hoa hồng chỉ tạm tính cho tới khi iHOS báo khám xong. Tại mốc khám xong, app lấy dịch vụ
thật, giá vốn thật, người làm thật từ iHOS, ghép với người bán từ dòng đặt chỗ, rồi chốt số.
Trước mốc đó mọi con số đều là dự kiến, không đưa vào lương.

---

## 4. Các tình huống lệch và cách xử

- Đặt chỗ rồi khách không tới khám. iHOS không bao giờ báo. Đơn treo ở trạng thái đã đặt chờ
  khám. Sau một số ngày tự chuyển quá hạn không khám, không sinh hoa hồng. [GIẢ ĐỊNH] số ngày
  treo, đề xuất 7 ngày kể từ ngày hẹn, cần xác nhận.
- Khách tự tới khám không đặt trước (walk-in). iHOS báo khám mà app không có dòng đặt chỗ nào
  để ghép. App tạo đơn mới vào thẳng dòng khám, không có người bán, áp chính sách đơn không
  owner là trưởng ca gán nhân viên.
- iHOS sửa lại ca sau khi đã xong, ví dụ đổi dịch vụ hay đổi bác sĩ. App nhận cập nhật và
  tính lại hoa hồng.
- Hủy. Cần phân biệt hủy đặt chỗ, do khách hủy lịch trước khi tới, app làm chủ. Khác với hủy
  ca khám, do iHOS báo, ví dụ tới nơi rồi không khám được. Hai cái dẫn tới cùng kết quả là
  không có hoa hồng, nhưng nguồn và thời điểm khác nhau, ghi nhận riêng để đối soát.
- Tín hiệu iHOS tới lộn xộn hoặc trùng. Xử theo thời gian sự kiện chứ không theo thứ tự nhận,
  và bỏ qua tín hiệu trùng. Phần này thuộc trục đồng bộ, đã thiết kế.

---

## 5. Ráp trục thời gian, và một điểm cần CEO chốt

Khi có đặt chỗ trước, trục thời gian lòi ra một câu chưa rõ: một đơn thuộc kỳ lương nào.

Tài liệu cũ tính theo ngày tạo đơn. Nhưng giờ khách có thể đặt trên web từ tháng này, mà
khám tháng sau. Nếu tính theo ngày đặt thì hoa hồng rơi vào kỳ tháng này, trong khi tới
tháng sau khám xong mới biết số thật, gây lệch giữa kỳ ghi nhận và lúc thật sự phát sinh.

Đề xuất của em: tính kỳ lương theo ngày khám xong, không theo ngày đặt. Vì khám xong mới là
lúc dịch vụ thật xảy ra và hoa hồng thật chốt. Đặt chỗ chỉ là dự kiến, chưa phát sinh tiền.
Cách này hợp với mô hình đa nguồn, đặt trước bao lâu cũng không sao, cứ khám xong tháng nào
thì tính lương tháng đó. [CHỜ CEO CHỐT] vì nó đổi cách xác định kỳ lương so với tài liệu cũ.

Hệ quả nếu chốt theo ngày khám xong: đơn đặt cuối tháng khám đầu tháng sau thì thuộc kỳ
tháng sau, gọn và rõ, không còn phải xử lý vắt tháng phức tạp như trước.

---

## 6. Giả định và chờ chốt

- [GIẢ ĐỊNH] đặt chỗ treo 7 ngày kể từ ngày hẹn thì tự đóng. Cần xác nhận.
- [CHỜ CEO CHỐT] kỳ lương tính theo ngày khám xong thay vì ngày tạo đơn.
- [CHỜ iHOS] iHOS báo được những mốc trạng thái nào, để app phản ánh đúng dòng khám.

---

## 7. Cập nhật bản kiểm kê

Sau tài liệu này, trục 1 trạng thái nâng từ mới phác lên gần đủ, chỉ còn chờ iHOS xác nhận
gửi được những mốc nào. Trục 5 thời gian nâng lên gần đủ, chỉ còn chờ CEO chốt cách tính kỳ
lương theo ngày khám xong.
