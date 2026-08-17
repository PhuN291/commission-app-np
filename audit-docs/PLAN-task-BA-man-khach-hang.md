# Plan xử lý task BA: màn Khách hàng và bệnh nhân

Nguồn: ClickUp 86eyhfr7r "Màn hình Thông tin Khách hàng bệnh nhân", gồm 5 mục trong mô tả và 5
subtask.

## Nhận định

Task này nhẹ hơn task màn đơn hàng, không đụng cách tính tiền. Phần lớn làm được ngay. Chỉ hai chỗ
cần thêm dữ liệu mới, một chỗ chờ HIS, và một chỗ cần cân nhắc trước khi làm vì liên quan dữ liệu y
tế.

Thứ tự khối hiện tại trên màn chi tiết khách: Tổng chi tiêu, nút Tạo đơn, Thông tin liên hệ, Lịch
tái khám, Lịch sử tương tác, Đơn hàng liên quan. Đúng như Hiển nhận xét, thông tin liên hệ tĩnh nằm
trên phần tái khám cần xử lý gấp.

## Nhóm 1: Làm ngay, không phụ thuộc gì

| Mục | Nội dung | Ghi chú kỹ thuật |
|---|---|---|
| Ẩn thông tin liên hệ | Thu gọn khối liên hệ, thêm nút xem chi tiết | Hiện đang bày hết ra ngoài |
| Đảo thứ tự khối | Đưa Lịch tái khám lên trên, đẩy Thông tin liên hệ xuống | Cùng một lần sửa với mục trên. Cảnh báo trễ tái khám phải thấy ngay, không phải cuộn |
| Dòng gọi gần nhất | Hiện là "Gọi gần nhất: Chưa bắt máy · 14:29 06/07", viết cho rõ nghĩa hơn | Đã có ngày giờ nhưng đọc khó hiểu. Đề xuất tách rõ ai gọi, khi nào, kết quả gì, ví dụ "Chưa bắt máy · 06/07 lúc 14:29" |
| Tạo đơn từ khách | Bấm Tạo đơn ở màn khách thì tự chọn sẵn khách đó | Màn tạo đơn hiện chỉ nhận sẵn dịch vụ và gói qua đường dẫn, chưa nhận khách. Thêm là xong, nhẹ |
| Điều hướng nhanh từ màn Tái khám | Ở màn Tái khám cần gọi, bấm vào tên bệnh nhân là sang trang chi tiết khách, và xem nhanh được lịch sử tương tác | Đã xem ảnh, đúng là màn Tái khám cần gọi với các chip Tất cả, Quá hạn, Hôm nay, Sắp tới. Hiện bấm vào thẻ chỉ mở hộp ghi kết quả gọi, chưa sang được chi tiết khách |

## Nhóm 2: Cần thêm dữ liệu, làm sau khi chốt

| Mục | Nội dung | Cần gì |
|---|---|---|
| Tổng chi tiêu theo kỳ | Chỉ tính trong khoảng gần đây thay vì cộng dồn từ đầu. Áp cho cả hai ô Tổng chi tiêu và Số đơn hàng | Sửa cách tính ở máy chủ. Còn chờ anh chốt 6 hay 12 tháng. Nhãn đổi theo, ví dụ "Chi tiêu 12 tháng" |
| Đánh dấu khách VIP | Nút tick gán tay để đánh dấu khách VIP. Đã chốt: không tự động theo mức chi tiêu | Thêm cột đánh dấu VIP vào bảng khách hàng, thêm nút bật tắt ở màn chi tiết khách |
| Ghi chú bệnh nhân | Ô ghi chú gồm dị ứng thuốc, tiền sử bệnh, lịch sử bệnh án. Đã chốt: làm theo yêu cầu gốc, không tách hai loại | Thêm cột ghi chú vào bảng khách hàng. Nên lưu kèm ai nhập và thời điểm nhập để truy vết |

## Nhóm 3: Chờ HIS

Lịch sử khám bệnh trong chi tiết bệnh nhân. Hiển đã ghi rõ là chờ API HIS, và đề xuất cách làm là
thêm một nút, khi nào cần thì mới bấm để gọi sang HIS lấy dữ liệu. Cách này hợp lý vì không phải lưu
lại bệnh án trong app.

Việc làm được trước: dựng sẵn chỗ đặt nút và khung hiển thị, nối API khi HIS sẵn sàng.

## Đã chốt với anh Phú

- VIP: nút tick gán tay. Không tự động theo mức chi tiêu.
- Ghi chú bệnh nhân: làm theo yêu cầu gốc của Hiển, một ô ghi chú gồm cả dị ứng thuốc và tiền sử
  bệnh, nhân viên nhập tay trong app. Không tách hai loại như em từng đề xuất.
- Ghi nhận để về sau có dấu vết: đây là dữ liệu y tế do nhân viên tự nhập, không đồng bộ với HIS.
  Khi lưu nên kèm người nhập và thời điểm nhập, để truy vết khi cần.

- Tổng chi tiêu và số đơn hàng: tính trong 12 tháng gần nhất. Nhãn đổi thành "Chi tiêu 12 tháng" và
  "Đơn 12 tháng".

Đã chốt hết, không còn điểm treo. Prompt cho dev nằm ở `audit-docs/PROMPT-man-khach-hang.md`.

## Ghi chú từ ảnh trong task

Đã xem hết ảnh trên ClickUp. Ba điểm rõ thêm:

- Ảnh mục 1: khối cần thu gọn gồm số điện thoại, email, địa chỉ. Phía trên là Tổng chi tiêu và Số đơn
  hàng, cùng bốn nút Gọi, Nhắn, Email, Tạo đơn. Mũi tên trong ảnh chỉ ý đưa khối Lịch tái khám lên
  trên khối liên hệ.
- Ảnh mục 3: hai ô cần sửa là Tổng chi tiêu và Số đơn hàng. Yêu cầu chỉ tính trong 6 tháng hoặc 1 năm
  gần nhất.
- Ảnh subtask điều hướng: đúng là màn Tái khám cần gọi.

## Thứ tự đề xuất

1. Làm nhóm 1 trước, gộp thành một đợt sửa giao diện, không chờ ai.
2. Hỏi Hiển ba câu ở trên, chốt xong làm nhóm 2.
3. Lịch sử khám bệnh dựng sẵn khung, nối khi HIS xong.
