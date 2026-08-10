# Plan xử lý task BA: màn Đơn hàng

Nguồn: ClickUp 86eyjeqh4 "Thứ tự màn hình đơn hàng", thuộc task cha 86eyjekjw "Màn hình đơn hàng".
Ưu tiên cao, Hiển giao, Phú nhận.

## Kết luận trước khi làm

Task này tên là sắp xếp thứ tự màn hình, nhưng đọc kỹ thì chỉ khoảng một nửa là giao diện. Nửa còn
lại đụng vào cách tính hoa hồng và cấu trúc dữ liệu. Nếu giao thẳng cả task cho dev làm một lượt thì
rủi ro hỏng phần tính tiền.

Vì vậy chia làm ba nhóm và làm theo thứ tự: nhóm 1 làm ngay, nhóm 2 làm sau khi chốt, nhóm 3 phải
chốt nghiệp vụ trước khi động vào code.

## Nhóm 1: Giao diện thuần, làm ngay được

| Mục | Nội dung | Ghi chú kỹ thuật |
|---|---|---|
| Thứ tự khối | Sắp lại theo: Tổng đơn, Lịch hẹn, Khách hàng, Ghi chú, Dịch vụ, Người phụ trách, Bảng kê hoa hồng cuối | Hiện tại đang là: Tổng đơn, Phụ trách, Khách hàng, Dịch vụ, Bảng kê, Lịch hẹn, Lịch sử, Hóa đơn, Ghi chú. Chỉ là đổi thứ tự khối trong order-detail.tsx |
| Ghi chú sửa nhanh | Bấm thẳng vào ô là sửa, bỏ nút sửa riêng | Hiện có chế độ đọc rồi bấm nút mới sửa |
| Lịch hẹn gọn | Chỉ hiện một dòng như lúc tạo đơn | Cần xem ảnh mẫu để làm đúng |
| Khách hàng | Thêm gợi ý nhỏ "Bấm để xem chi tiết" | |
| Gộp tiền | Bỏ bớt, chỉ giữ một trong hai là Tạm tính hoặc Tổng cộng | Hiện có cả hai, dòng 537 và 549 |
| Đổi nhãn | "Tổng đơn" thành "Đã thanh toán", "Hoa hồng" thành "Tổng hoa hồng" | Nhãn đổi được ngay, nhưng con số đằng sau phải đúng nghĩa mới, xem nhóm 3 |

## Nhóm 2: Cần thêm backend, làm sau khi chốt nhóm 3

| Mục | Nội dung | Vì sao cần backend |
|---|---|---|
| Thêm dịch vụ vào đơn | Cho phép thêm dịch vụ sau khi đơn đã tạo | Chưa có API sửa danh sách dịch vụ của đơn. Thêm dịch vụ thì phải tính lại hoa hồng cả đơn |
| Yêu cầu bác sĩ | Thêm trường ghi bác sĩ khách yêu cầu | Cần thêm cột dữ liệu mới trên đơn |
| Đổi trạng thái từng dịch vụ | Nhân viên đổi được trạng thái từng dịch vụ trong đơn | Hiện không có API cho việc này. Code ghi rõ trạng thái dịch vụ chỉ đồng bộ từ HIS ở giai đoạn sau |

## Nhóm 3: Đụng nghiệp vụ hoa hồng, phải chốt trước khi code

Đây là phần quan trọng nhất. Bốn mục dưới đây thay đổi cách app tính tiền.

**1. Chỉ tính hoa hồng trên dịch vụ đã thanh toán**

Hiện tại app tính hoa hồng trên toàn đơn: lấy lãi ròng cả đơn rồi nhân phần trăm của từng vai. Không
tính theo từng dịch vụ. Yêu cầu mới đòi tính theo từng dịch vụ và chỉ tính dịch vụ đã thanh toán.
Đây là viết lại engine tính hoa hồng, không phải sửa giao diện.

Cần chốt: đổi hẳn sang tính theo từng dịch vụ, hay giữ tính theo đơn nhưng loại bỏ phần tiền của
dịch vụ chưa thanh toán khỏi cơ sở tính.

**2. Hoa hồng hiển thị theo từng dịch vụ**

Hiện mỗi khoản hoa hồng gắn với một người trên một đơn, không gắn với dịch vụ nào. Muốn hiện hoa hồng
theo từng dịch vụ thì phải đổi cấu trúc lưu, thêm liên kết tới dịch vụ.

**3. Ba trạng thái dịch vụ: chưa thực hiện, đã thanh toán, hoàn thành**

Hiện app dùng ba trạng thái khác: chưa làm, hoàn thành, bỏ qua. Bộ mới có thêm khái niệm thanh toán,
mà thanh toán lại do HIS quản. Cần chốt ai cập nhật trạng thái này và lấy tín hiệu thanh toán từ đâu.

**4. Người phụ trách chỉ còn sale điều dưỡng và điều dưỡng trưởng**

Yêu cầu này bỏ bác sĩ ra khỏi danh sách người phụ trách. Nhưng theo thiết kế hiện tại và theo phần
nghiệp vụ đã chốt trước đó, bác sĩ có hưởng hoa hồng theo dịch vụ. Hai bên đang mâu thuẫn.

Cần chốt: bác sĩ có hưởng hoa hồng nữa không. Nếu có thì hiển thị ở đâu, nếu không thì bỏ luôn khỏi
cơ chế.

## Đã chốt với anh Phú

- Hoa hồng đổi hẳn sang tính theo từng dịch vụ, không tính gộp cả đơn như hiện tại.
- Đồng ý đổi cấu trúc lưu để mỗi khoản hoa hồng gắn được với một dịch vụ.
- Trạng thái dịch vụ lấy từ HIS, HIS bắn tín hiệu sang.
- Bác sĩ tạm không đụng. Giữ nguyên danh sách người hưởng và giữ nguyên khối Người phụ trách trên
  màn hình cho tới khi chốt.

## Còn treo, phải chốt trước khi viết lại engine

Nhóm chặn, không trả lời thì không code được:

1. Cơ sở tính trên mỗi dịch vụ là gì. Lãi ròng của dịch vụ đó, tức giá bán trừ giá vốn, hay doanh thu
   của dịch vụ đó. Đây chính là cờ đỏ cũ, giờ vẫn treo.
2. Bảo hiểm và voucher đang trừ ở cấp đơn, không gắn với dịch vụ nào. Khi tính theo từng dịch vụ thì
   chia hai khoản đó ra sao. Chia đều, chia theo tỷ trọng giá, hay gán vào đúng dịch vụ được bảo hiểm.
3. Hoa hồng tạm tính lúc mới tạo đơn tính thế nào. Trước đây đã chốt có đơn là lên tạm tính ngay. Nhưng
   lúc đó chưa dịch vụ nào thanh toán, nếu chỉ tính dịch vụ đã thanh toán thì tạm tính bằng không. Cần
   chốt: tạm tính vẫn tính trên toàn bộ dịch vụ dự kiến, chỉ khi chuyển chờ duyệt và chính thức mới lọc
   theo đã thanh toán.
4. HIS bắn tín hiệu thanh toán ở mức nào, theo từng dịch vụ hay cả đơn. Nếu HIS chỉ báo được cả đơn đã
   thanh toán thì yêu cầu tính theo từng dịch vụ không chạy được. Cần hỏi anh Bình bên HIS trước khi
   code. Đây là rủi ro phụ thuộc bên ngoài.
5. Phần trăm hoa hồng lấy theo vai và bậc như hiện tại, hay theo từng dịch vụ. Danh mục dịch vụ có cột
   mô tả khoảng hoa hồng nên dễ hiểu nhầm.

Nhóm cần làm rõ, chưa chặn ngay:

6. Trạng thái hoàn thành khác đã thanh toán ra sao. Thứ tự đang là chưa thực hiện, đã thanh toán, hoàn
   thành. Vậy khách trả tiền trước rồi mới làm dịch vụ. Nếu làm xong mà chưa trả tiền thì trạng thái
   nào.
7. Giá vốn từng dịch vụ vẫn chưa có. Nếu chốt tính trên lãi ròng thì không có giá vốn là không tính
   được. Vẫn chờ CEO.
8. Hoàn tiền một dịch vụ trong đơn thì hoa hồng dịch vụ đó xử lý sao.
9. Trưởng ca đã chốt hưởng trên tổng lãi ròng phòng khám. Khi đổi sang tính theo từng dịch vụ thì cộng
   dồn cho trưởng ca thế nào.

## Chỗ cần anh xem lại ảnh trong task

Task có đính kèm ảnh mà em không mở được. Hai ảnh cần anh xem và mô tả lại:

- Ảnh "Chuẩn hóa trạng thái đơn hàng": có thể định nghĩa lại bộ tám trạng thái đơn hiện tại. Nếu đúng
  thì đây là mục nặng, phải đưa vào nhóm 3.
- Ảnh mẫu khối Lịch hẹn một dòng và khối Tổng đơn.

## Thứ tự đề xuất

1. Anh xem lại ảnh trong task, xác nhận mục chuẩn hóa trạng thái đơn có đụng bộ tám trạng thái không.
2. Chốt bốn điểm nghiệp vụ ở nhóm 3 với Hiển và CEO. Gộp luôn với cờ đỏ cách tính hoa hồng đang chờ,
   vì cùng một chỗ.
3. Làm nhóm 1 song song, không phụ thuộc gì.
4. Chốt xong nghiệp vụ mới làm nhóm 2 và nhóm 3.

## Lưu ý khi phản hồi Hiển

Nên nói rõ với Hiển rằng task này trộn giao diện với nghiệp vụ, và đề nghị tách phần nghiệp vụ ra
thành task riêng để chốt trước. Đây cũng là dịp để chốt luôn cách tính hoa hồng đang treo. Nếu làm
lẫn lộn thì dev sẽ vừa sửa giao diện vừa phá engine tính tiền.
