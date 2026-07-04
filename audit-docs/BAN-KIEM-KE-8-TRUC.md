# Bản kiểm kê tám trục: app đã chặt tới đâu

Ngày cập nhật: 11/06/2026.

Mục đích: đây là tấm gương để soi xem thiết kế app đã đầy đủ chưa, theo tám mặt của một đơn.
Không dựa vào trí nhớ. Mỗi trục ghi rõ đã làm tới đâu, còn hở chỗ nào, và chờ ai quyết. Khi
nào có tiến triển thì cập nhật bảng này. Anh mở ra là thấy ngay bức tranh, không cần hỏi.

Mức độ phủ ghi theo bốn nấc: Đủ, Một phần, Mới phác, Hở.

---

## Bảng tổng

| # | Trục | Mức phủ | Một dòng |
|---|---|---|---|
| 1 | Trạng thái đơn (app + iHOS) | Gần đủ | Đã vẽ hai dòng hợp nhất, chờ iHOS xác nhận mốc |
| 2 | Dữ liệu, nguồn sự thật | Đủ (chờ iHOS xác nhận) | Bảng chốt nguồn nào là thật đã có |
| 3 | Tiền, tính hoa hồng | Một phần | Công thức xong và đang code, refund và truy thu chưa code |
| 4 | Vai, ai ăn hoa hồng | Đủ | Sale, trưởng ca, bác sĩ, và đơn không owner đã chốt |
| 5 | Thời gian | Gần đủ | Đề xuất kỳ lương theo ngày khám xong, chờ CEO chốt |
| 6 | Đồng bộ nhiều nguồn | Đủ thiết kế (chờ iHOS) | Ghép, chống trùng, đối soát đã thiết kế |
| 7 | Quyền, ai thấy và làm gì | Hở | Có nền cũ nhưng chưa ráp vào bối cảnh đa nguồn |
| 8 | Pháp lý, tuân thủ | Mới nêu | Vừa soi, cần luật sư và phối hợp phòng khám |

Còn hai trục cần đào: quyền và pháp lý. Trạng thái và thời gian vừa nâng lên gần đủ.

---

## Chi tiết từng trục

### 1. Trạng thái đơn (app + iHOS) — Mới phác
- Đã có: mô hình hai dòng trạng thái. Dòng đặt chỗ do app và web làm chủ, dòng khám do iHOS
  làm chủ. Nguyên tắc ai làm chủ cái gì, và khi mâu thuẫn thì tin iHOS cho phần khám.
- Còn hở: chưa vẽ thành sơ đồ trạng thái hợp nhất rõ ràng. Chưa chốt đơn đặt chỗ treo bao
  lâu thì tự đóng. Cách iHOS báo trạng thái cụ thể còn phụ thuộc tài liệu của họ.
- Chờ ai: iHOS trả lời gửi được những trạng thái nào.

### 2. Dữ liệu, nguồn sự thật — Đủ, chờ iHOS xác nhận
- Đã có: bảng chốt từng dữ liệu tin nguồn nào. iHOS là thật cho khám, giá vốn, bảo hiểm, ai
  làm. Đặt chỗ là thật cho ai bán.
- Còn hở: phụ thuộc iHOS có gửi được giá vốn và người thực hiện không. Nếu không thì bù nhập
  tay.
- Chờ ai: iHOS.

### 3. Tiền, tính hoa hồng — Một phần
- Đã có: công thức tiền sau trừ chi phí nhân phần trăm theo hạng, đã code và chạy thật cho
  màn thu nhập và trang chủ.
- Còn hở: hoàn tiền, truy thu kỳ sau, điều chỉnh thưởng phạt, máy thưởng target, chưa code.
  Số hiện vẫn tạm vì chưa có giá vốn và phần trăm thật.
- Chờ ai: CEO khách hàng chốt phần trăm thật và giá vốn từng dịch vụ.

### 4. Vai, ai ăn hoa hồng — Đủ
- Đã có: người bán, trưởng ca, bác sĩ. Đơn không có người bán thì trưởng ca gán cho một nhân
  viên, nhân viên đó ăn hoa hồng bán theo đúng công thức chung, không phân biệt mức.
- Còn hở: giai đoạn đầu trưởng ca gán tay, sau này muốn tự động gán. Cần chừa đường mở trong
  code.
- Chờ ai: không, đã chốt hướng.

### 5. Thời gian — Một phần
- Đã có: một kỳ là một tháng theo ngày tạo đơn, chốt lương ngày 5, đơn vắt hai tháng xử lý
  theo tháng tạo.
- Còn hở: ráp phần đặt trước khám sau vào dòng trạng thái mới. Đơn đặt một tháng, khám tháng
  sau thì tính kỳ nào. Booking treo lâu xử lý ra sao.
- Chờ ai: làm rõ cùng với trục trạng thái.

### 6. Đồng bộ nhiều nguồn — Đủ thiết kế, chờ iHOS
- Đã có: cổng nhận đơn chung, cách ghép đơn ba nguồn, chống trùng bằng mã sự kiện, xử lý theo
  thời gian sự kiện, đối soát khi sót. Đã gửi yêu cầu tích hợp cho iHOS.
- Còn hở: cách ghép tốt nhất phụ thuộc iHOS có cho gắn mã chung không.
- Chờ ai: iHOS trả lời bản yêu cầu tích hợp.

### 7. Quyền, ai thấy và làm gì — Hở
- Đã có: bảng phân quyền cũ trong tài liệu B4, nhân viên xem của mình, trưởng ca và quản lý
  xem toàn phòng khám.
- Còn hở: chưa ráp vào bối cảnh đa nguồn. Ai thấy và xử đơn không owner trong hàng chờ. Quyền
  của trưởng ca khi gán đơn. Ai được sửa đơn đến từ web hay iHOS. Phần này chưa soi lại.
- Chờ ai: em đào tiếp, có thể cần CEO chốt vài điểm.

### 8. Pháp lý, tuân thủ — Mới nêu
- Đã có: đã soi sơ các luật đụng tới, gồm bảo vệ dữ liệu cá nhân, lao động, kế toán thuế, an
  toàn thông tin. Đã chỉ ra rủi ro lớn nhất là lỗ hổng bảo mật và việc ôm quá nhiều dữ liệu
  y tế.
- Còn hở: chưa có cơ chế khách đồng ý cho dùng dữ liệu, chưa có thỏa thuận xử lý dữ liệu giữa
  phòng khám, 1PDM, iHOS, chưa áp nguyên tắc chỉ lấy dữ liệu tối thiểu.
- Chờ ai: một luật sư Việt Nam rà, và phối hợp phòng khám cho phần đồng ý.

---

## Đề xuất đào tiếp

Theo thứ tự em nghĩ nên làm:
1. Trạng thái đơn: vẽ sơ đồ hai dòng hợp nhất cho rõ, vì nó kéo theo cả trục thời gian.
2. Quyền: soi lại cho bối cảnh đa nguồn, vì nó liên quan ai đụng được đơn không owner.
3. Pháp lý: gom thành một việc riêng để anh đưa luật sư, không để treo.

Các trục Đủ và Một phần còn lại thì phụ thuộc hai đầu vào lớn là iHOS trả lời và CEO chốt số,
mình đã đẩy ra ngoài, không chặn việc code phần một nguồn đang chạy.
