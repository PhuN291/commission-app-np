# Phiếu đích từng màn nhân viên (làm đẹp UI)

Nguyên tắc đã chốt: chỉ làm đẹp các khối app hiện có, bỏ mọi khối design-ref thừa (kể cả loại dùng
được dữ liệu sẵn). Không thêm màn, khối, trường, tính năng. Phong cách lấy theo design-ref đã áp
nền tảng (màu, thang chữ Inter, tiền "đ", spacing, bo góc, badge).

Mỗi màn ghi: GIỮ (làm đẹp theo phong cách mới) | BỎ (khối design-ref thừa, không áp) | TINH CHỈNH
(điểm visual nhỏ cần sửa thêm).

## 1. Trang chủ (/)

GIỮ: thẻ hoa hồng (đã làm nền đậm), hai thẻ Doanh số và Đã chốt, mục Cần xử lý, Thành tích tháng
(tiến trình lên hạng). Tất cả app đều có.
BỎ: không có khối thừa.
TINH CHỈNH: biểu tượng ngôi sao AI trên header chưa rõ chức năng, cân nhắc bỏ hoặc gắn nhãn (xem
lại ở nhóm chung header).

## 2. Đơn hàng (/orders)

GIỮ: thanh tìm kiếm, chip lọc theo trạng thái, danh sách đơn (mã, tên khách, dịch vụ, tổng tiền,
hoa hồng, badge trạng thái, ngày giờ). App đã có hết.
BỎ: không có khối thừa. Giữ bộ chip của app (Tất cả, Khách trễ, Chờ xác nhận...) vì app có "Khách
trễ" hữu ích mà design-ref không có.
TINH CHỈNH: không.

## 3. Tạo đơn (/orders/new)

GIỮ: dạng một trang hiện tại của app (chọn khách, lịch hẹn, dịch vụ, ghi chú, áp voucher, xuất hóa
đơn công ty, nút tiếp tục). 
BỎ: dạng nhiều bước có stepper của design-ref; chọn phương thức thanh toán (tiền mặt/chuyển khoản/
thẻ/chia đợt); giảm giá phần trăm tĩnh (app dùng voucher thật); ở màn tạo xong bỏ ba nút Gửi cho
khách/In hóa đơn/Nhắn lễ tân; bỏ hẳn khối "Hình thức khám" (Tại phòng khám / Lấy mẫu tại nhà) dù
schema có cột examType, vì giai đoạn này chỉ nâng cấp thiết kế, không thêm tính năng.
GIỮ THÊM (app thật có mà mockup thiếu): khối xuất hóa đơn công ty và áp mã voucher.
TINH CHỈNH: thống nhất màu nút phụ về phong cách mới (nút "Thêm dịch vụ", "Thêm khách hàng mới"
đang lẫn đen và xanh dương).

## 4. Chi tiết đơn (/orders/:id)

GIỮ: thông tin khách, dịch vụ, tiền, trạng thái, hoa hồng, lý do hoàn tiền nếu có.
BỎ: nút gọi và email trực tiếp (hành động chưa có).
TINH CHỈNH: không.

## 5. Dịch vụ (/services) và Chi tiết dịch vụ (/services/:id)

GIỮ: danh sách dịch vụ, mã dịch vụ, thời lượng, phần trăm hoa hồng, mô tả. App có hết.
BỎ: khối "Chuẩn bị trước khi khám" (nhịn ăn, mang kết quả cũ...) vì chưa có field.
TINH CHỈNH: không.

## 6. Khách hàng (/customers) và Chi tiết KH (/customers/:id)

GIỮ: tìm kiếm, danh sách khách (tên, sđt, địa chỉ, số đơn, tổng chi), avatar màu theo người (cải
thiện tốt), thông tin liên hệ, đơn liên quan.
BỎ: bộ tab phân loại VIP/Thường/Follow-up/Mới của design-ref (chưa có cột tag chuẩn); giữ bộ lọc
hiện có của app (theo tái khám). Bỏ "lần khám gần nhất" và khối ghi chú nội bộ (chưa có field).
TINH CHỈNH: tránh trùng chữ tắt avatar khi hai người cùng initials (ví dụ TM cho cả hai), phân biệt
bằng màu.

## 7. Hoa hồng (/income)

GIỮ: thẻ hero hoa hồng tạm tính, một thanh tiến trình KPI theo mục tiêu, danh sách khoản hoa hồng
theo đơn, phần điều chỉnh và truy thu (app có).
BỎ: hai thẻ Đã nhận và Chờ duyệt; khối bốn mốc thưởng KPI. Cả hai app chưa có.
TINH CHỈNH: không.

## 8. Xếp hạng (/ranking)

GIỮ: bục top ba, danh sách xếp hạng chi tiết, dropdown chọn tháng.
BỎ: chỉ số tăng giảm bậc (delta) cạnh mỗi người (chưa có lịch sử hạng).
TINH CHỈNH: đồng nhất màu avatar giữa bục và danh sách (đang khác nhau).

## 9. Thông báo (/notifications)

GIỮ: danh sách thông báo, nhóm Chưa đọc và Trước đó, nút Đã đọc tất cả.
BỎ: không có khối thừa.
TINH CHỈNH: không.

## 10. Tái khám (/recalls)

GIỮ: danh sách khách cần tái khám (app có, design-ref không vẽ riêng nên chỉ áp phong cách chung).
BỎ: không.
TINH CHỈNH: áp phong cách thẻ và badge mới cho đồng bộ.

## Nhóm chung toàn app (áp một lần)

Header: cân nhắc bỏ biểu tượng ngôi sao AI nếu chưa có chức năng. Đồng nhất màu nút phụ và link về
một màu nhấn. Avatar sinh màu theo tên để không trùng. Các điểm này đã một phần nằm trong nền tảng.
