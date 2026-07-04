# Audit kiến trúc toàn app

Ngày: 11/06/2026. Soi sâu bốn mặt song song trên codebase thật: nhất quán dữ liệu, ranh giới
và trạng thái và đa nguồn, bảo mật và phân quyền, nợ kỹ thuật. Đây là audit, không sửa code.

---

## Kết luận một câu

App đang di trú dở dang từ đồ giả trong bộ nhớ sang database thật. Schema database đã đủ và
một nửa code đã dùng thật, nhưng nửa còn lại vẫn chạy đồ giả song song. Hai nửa chưa gặp
nhau, nên cùng một con số lại hiện khác nhau tùy màn anh mở. Đây chính xác là cái thiếu mà
anh cảm thấy: không phải thiếu tính năng, mà là làm hai lần cùng một thứ và chưa khâu lại.

Cái này nguy hiểm hơn thiếu tính năng, vì nó cho ra số sai trong khi trông vẫn chạy.

---

## Bằng chứng: cùng một thứ, hai số

| Thứ | Nửa thật (database) | Nửa giả (bộ nhớ) | Hậu quả |
|---|---|---|---|
| Hoa hồng | engine tính trên lãi ròng, %HH theo hạng. Màn thu nhập, trang chủ, xếp hạng đọc cái này | màn duyệt của kế toán, màn chi tiết đơn, thông báo đọc đồ giả 3/2/5% trên tổng giá | Kế toán duyệt một số, lương chi một số khác. Sai tiền trực tiếp |
| Tái khám | worklist mới theo từng lượt trong database | hồ sơ khách và thông báo đọc hệ cũ theo khách trong bộ nhớ | Gọi xong ở màn này, màn kia vẫn báo chưa gọi |
| Dịch vụ trong đơn | engine đọc đơn hàng con thật trong database | màn chi tiết đơn hiện 1 đến 3 dịch vụ bịa | Giá vốn và hoa hồng tính trên tập dữ liệu khác cái đang hiển thị |
| Thưởng phạt, truy thu | bảng có sẵn nhưng chưa ai ghi | sinh bịa theo chẵn lẻ mã nhân viên, cộng thẳng vào lương | Lương thật cộng số bịa |
| Xếp hạng nhân viên | tính thật theo kỳ | trang chủ admin đọc bảng người ảo cũ | Hai bảng xếp hạng khác nhau |

Và mọi đồ giả trong bộ nhớ mất sạch khi restart server. Kế toán chốt lương xong, deploy một
phát là trạng thái duyệt bay hết, hoa hồng sinh lại ngẫu nhiên.

---

## Danh sách nợ theo nhóm

### Nhóm 1, tiền tính sai do hai nguồn (mức Cao, gấp nhất)
- Hoa hồng hai nguồn, màn duyệt của kế toán và màn chi tiết đơn và thông báo còn đọc đồ giả.
- Thưởng phạt và truy thu là số bịa cộng vào lương.
- Dịch vụ trong đơn ở màn chi tiết là bịa, khác cái engine tính.
- Tất cả mất khi restart.
Gốc chung: phần đọc đã chuyển sang database, phần ghi và duyệt và hiển thị chi tiết còn nằm
trên đồ giả. Hai nửa không gặp nhau.

### Nhóm 2, bảo mật (mức Cao)
- Mã OTP 123456 vẫn vào được nếu server không đặt đúng cờ production, và API còn trả thẳng mã
  ra cho client.
- Nhiều cửa không cần đăng nhập: danh sách khách kèm số điện thoại và dịch vụ y tế, chi tiết
  khách, tạo và sửa đơn, tìm kiếm toàn cục, danh sách nhân viên. Đây là lộ dữ liệu y tế ra
  ngoài.
- Phiên đăng nhập không hết hạn, lộ là dùng được mãi.
- Nhân viên nghỉ việc vẫn dùng được phiên cũ.
- Cửa ghi kết quả gọi tái khám không kiểm quyền sở hữu, một nhân viên ghi đè lên lượt của
  người khác. Cửa đọc thì có lọc, cửa ghi thì không, lệch nhau.
- Nhật ký server in cả dữ liệu khách và mã đăng nhập ra log.

### Nhóm 3, trạng thái và cổng đa nguồn (mức Cao và Vừa)
- Trạng thái hoa hồng định nghĩa bảy bước nhưng engine chỉ từng đặt một bước, khái niệm tạm
  tính trước khi iHOS báo xong chưa được hiện thực.
- Trạng thái khám đang để app tự đặt, ngược với mô hình iHOS làm chủ đã chốt.
- Cổng nhận đơn chưa sẵn đa nguồn: chưa có ghép đơn, chưa thực thi chống trùng dù đã có cột,
  và đang đánh dấu khám xong ngay lúc tạo đơn nên chốt hoa hồng trên dữ liệu dự kiến.
- Có đường tạo đơn bỏ qua cổng chung, đặc biệt là seed, nên đơn seed thiếu dữ liệu phái sinh,
  buộc phải vá bằng đồ giả.

### Nhóm 4, nợ dọn (mức Vừa và Nhẹ)
- Bốn màn phân tích và chat AI là vỏ giả số bịa, thừa cho phòng khám 5 người.
- Giao diện chưa chặn theo vai, nhân viên gõ đúng địa chỉ vẫn vào được màn quản trị.
- Seed chạy mỗi lần khởi động, trộn cấu hình thật với dữ liệu demo, khó tách khi lên thật.
- Vài cột đã bỏ nhưng còn dùng để tính, ví dụ doanh thu cũ dùng cho xếp hạng.
- Một lỗi âm thầm, ô đếm đơn chờ xử lý luôn ra 0 vì đọc nhầm bộ nhớ cũ sau khi chuyển database.

---

## Thứ tự trả nợ đề xuất

Đợt 1, khâu tiền về một mối. Bỏ đồ giả hoa hồng, cho màn duyệt của kế toán và màn chi tiết
đơn và thông báo đọc ghi thẳng database. Nối thưởng phạt vào bảng thật. Đây là gấp nhất vì
đụng tiền lương.

Đợt 2, bịt bảo mật. Bỏ OTP 123456, chặn đăng nhập mọi cửa nhạy cảm, cho phiên hết hạn, kiểm
quyền sở hữu, ngừng in dữ liệu nhạy cảm ra log.

Đợt 3, dọn nhất quán. Gộp hệ tái khám về một, đơn hàng con thật ở màn chi tiết, xếp hạng từ
người thật, cắt màn thừa, dọn seed.

Đợt 4, đa nguồn. Tách cổng nhận đơn hai pha đặt chỗ và khám, thực thi chống trùng và mã ghép,
nối iHOS. Làm khi có trả lời từ iHOS.

---

## Ánh xạ vào bản đồ ba mươi việc

Những nợ này không phải mới đẻ ra. Chúng nằm trong các nhóm đã có trên bản đồ: nhóm tính hoa
hồng, nhóm bảo mật, nhóm dọn dữ liệu nhất quán. Audit chỉ làm chúng rõ và sâu hơn, và cho
thấy phần lớn việc là nối code vào bảng đã có sẵn, không phải thiết kế lại từ đầu.

---

## Phần đã chắc, đừng phá khi dọn

Luồng tạo đơn và engine tính hoa hồng, voucher, nhật ký khách, phần hoa hồng ở màn thu nhập
và trang chủ cá nhân, danh sách tái khám mới. Mấy phần này đã chạy database thật và đúng,
giữ nguyên khi dọn các phần giả.

---

## Một điều thành thật về cách mình đang làm

Cách mình chẻ nhỏ, làm phần đọc trước rồi phần ghi sau, hoặc thêm hệ mới rồi hẹn dọn hệ cũ
sau, chính nó tạo ra mấy giai đoạn hai hệ song song này. Bản thân cách làm tăng dần không
sai, nhưng nó đòi kỷ luật dọn. Từ giờ mỗi lần thêm một hệ mới, mình lên lịch bỏ hệ cũ ngay
trong cùng đợt, đừng để song song lâu, nếu không nợ chồng lên như đang thấy. Việc dựng màn
tái khám mới vừa rồi là một ví dụ đã góp thêm một cặp hệ song song, cần dọn nốt hệ cũ.
