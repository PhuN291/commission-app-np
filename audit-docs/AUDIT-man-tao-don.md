# Audit màn Tạo đơn

Xem trên app thật tại /orders/new, thao tác đủ luồng chọn khách và dịch vụ, đối chiếu code.

## Đánh giá chung

Màn đã gọn và dễ dùng hơn bản cũ. Bố cục một trang, các khối rõ ràng, không còn dạng nhiều bước. Có
đủ: chọn khách, chọn dịch vụ theo gói, lịch hẹn, ghi chú, mã giảm giá, bảng tiền, hoa hồng ước tính,
xuất hóa đơn công ty.

Ba vấn đề cần xử, một cái dính tiền nên xếp trước.

---

## Phần nghiệp vụ

### 1. Hoa hồng ước tính không khớp cách tính thật (CAO, dính tiền)

Con số "Hoa hồng ước tính +75.000đ" lấy từ số gắn cứng trong danh sách gói dịch vụ ở giao diện, nhân
số lượng rồi giảm theo tỉ lệ khuyến mãi.

Trong khi đó bộ tính hoa hồng thật ở máy chủ tính theo cách khác hẳn: lấy lãi ròng của đơn rồi nhân
phần trăm theo vai và bậc của từng người.

Hệ quả: nhân viên tạo đơn thấy 75.000đ, lát sau vào màn hoa hồng thấy số khác. Đây đúng loại lỗi
nhiều nguồn số liệu mà dự án đã tốn cả một đợt để dọn ở các màn khác.

Nặng hơn nữa: con số ước tính này còn được gửi lên máy chủ và lưu vào đơn, song song với con số do bộ
tính hoa hồng sinh ra. Hai số cùng tồn tại, không ai biết tin số nào.

Hướng xử: bỏ tính hoa hồng ở giao diện, gọi máy chủ để lấy số ước tính theo đúng công thức thật. Nếu
chưa làm ngay được thì đổi nhãn thành số tham khảo và ghi rõ chốt lại sau khi duyệt, để nhân viên
không hiểu nhầm là số cuối.

Lưu ý: việc này gắn với cờ đỏ cách tính hoa hồng đang chờ CEO chốt. Nên chốt cách tính trước rồi sửa
một lần.

### 2. Thiếu ô người phụ trách (CAO, đã chốt mà chưa làm)

Trong đặc tả nghiệp vụ đã chốt với CEO có ghi rõ: khi tạo đơn phải có ô chọn nhân viên phụ trách,
tách khỏi người tạo đơn, và được phép để trống với khách tự đến.

Màn hiện chưa có ô này. Đây là khoảng lệch đã ghi nhận từ trước, và bảng gap cũng ghi là làm được
ngay vì cơ sở dữ liệu đã có sẵn chỗ lưu.

Chưa có ô này thì lễ tân tạo đơn hộ sẽ bị tính hoa hồng cho lễ tân, sai người hưởng.

### 3. Thiếu nguồn khách (VỪA)

Báo giá có bán mục nguồn khách bắt buộc theo bảy kênh, thuộc phần quản lý đơn hàng. Màn hiện không
có.

Cần xác nhận với anh: bỏ hẳn hay để đợt sau. Nếu bỏ thì nên thống nhất lại với phòng khám vì nó nằm
trong hợp đồng.

### 4. Lịch hẹn không bắt buộc (cần xác nhận)

Nút tạo đơn sáng lên khi có khách và ít nhất một dịch vụ. Không chọn ngày giờ vẫn tạo được.

Có thể đúng với khách tự đến. Nhưng cần xác nhận: đơn không có lịch hẹn thì vào trạng thái nào, và
màn lịch hẹn có bỏ sót đơn đó không.

---

## Phần giao diện

### 1. Nút Tạo đơn che mất nội dung (VỪA, lỗi thật)

Nút dính đáy màn hình đè lên khối Thanh toán. Khi cuộn tới cuối, dòng tổng cộng và hoa hồng ước tính
bị khuất một phần, phải cuộn quá đà mới thấy đủ.

Cách sửa: thêm khoảng đệm dưới cùng bằng chiều cao nút, để cuộn hết là thấy trọn nội dung.

### 2. Thẻ mã giảm giá bị cắt ngang (THẤP)

Thẻ thứ ba bị cắt giữa chừng ở mép phải, chữ đứt đoạn. Đây là dải cuộn ngang nên cắt là bình thường,
nhưng cắt giữa chữ thì nhìn như lỗi.

Cách sửa: để lộ ít hơn hoặc thêm dấu hiệu vuốt ngang cho rõ ý.

### 3. Thứ tự khối chưa theo mạch suy nghĩ (THẤP)

Hiện là: Khách, Dịch vụ, Lịch hẹn, Ghi chú, Giảm giá, Thanh toán, Hóa đơn công ty.

Ghi chú chen giữa Lịch hẹn và Giảm giá làm đứt mạch tiền. Đề xuất gom phần tiền liền nhau: Khách,
Dịch vụ, Giảm giá, Thanh toán, Lịch hẹn, Ghi chú, Hóa đơn công ty.

### 4. Điểm làm tốt, nên giữ

Khối hoa hồng ước tính dùng nền xanh nhạt nổi lên giữa các dòng tiền khác. Đây là chỗ duy nhất trên
màn có màu nhấn, và nó đặt đúng chỗ vì hoa hồng là thứ nhân viên quan tâm nhất. Giữ nguyên cách này.

Chọn dịch vụ theo nhóm rồi mở ra chọn gói, kèm giá và hoa hồng ngay trên từng gói, rất rõ ràng.

---

## Thứ tự đề xuất

1. Sửa hoa hồng ước tính cho khớp cách tính thật. Chờ chốt công thức rồi làm một lần.
2. Thêm ô người phụ trách, việc này độc lập, làm được ngay.
3. Sửa nút che nội dung và thẻ voucher bị cắt, hai cái này nhẹ.
4. Xác nhận với anh về nguồn khách và lịch hẹn bắt buộc.
