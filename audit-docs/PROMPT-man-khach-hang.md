# Prompt cho Claude Code: sửa màn Khách hàng và bệnh nhân

Nguồn yêu cầu: ClickUp 86eyhfr7r. Bối cảnh và quyết định đã chốt nằm ở
`audit-docs/PLAN-task-BA-man-khach-hang.md`, đọc trước khi làm.

## Nguyên tắc chung

- Không đụng phần tính hoa hồng.
- Giữ giọng chữ ngắn, trung tính, không xưng bạn.
- Không dùng dấu gạch dài trong mọi chuỗi hiển thị.
- Xong mỗi phần chạy `npm run check` phải sạch.

---

## Phần 1: Sắp lại màn chi tiết khách (client/src/pages/customer-detail.tsx)

Thứ tự khối hiện tại: Tổng chi tiêu và Số đơn, nút hành động, Thông tin liên hệ, Lịch tái khám, Lịch
sử tương tác, Đơn hàng liên quan.

Đổi thành: Tổng chi tiêu và Số đơn, nút hành động, Lịch tái khám, Thông tin liên hệ, Lịch sử tương
tác, Đơn hàng liên quan.

Lý do: cảnh báo trễ tái khám là việc cần xử lý ngay, không nên nằm dưới thông tin liên hệ tĩnh.

Đồng thời thu gọn khối Thông tin liên hệ. Mặc định chỉ hiện số điện thoại. Email và địa chỉ ẩn đi,
có nút mở rộng để xem đầy đủ.

## Phần 2: Dòng gọi gần nhất

Trong thẻ lượt tái khám, dòng hiện tại dạng "Gọi gần nhất: Chưa bắt máy · 14:29 06/07".

Sửa thành dạng dễ đọc hơn: "Chưa bắt máy · 06/07 lúc 14:29". Đưa ngày lên trước giờ.

## Phần 3: Tạo đơn từ màn khách tự chọn sẵn khách

Hiện `client/src/pages/order-create.tsx` chỉ đọc `serviceId` và `packageIdx` từ đường dẫn.

Thêm đọc tham số `customerId`. Khi có tham số này thì tự chọn sẵn khách đó vào đơn, không bắt người
dùng tìm lại.

Sửa nút Tạo đơn ở màn chi tiết khách để truyền `customerId` của khách đang xem.

## Phần 4: Điều hướng nhanh từ màn Tái khám cần gọi

File `client/src/pages/recall-worklist.tsx`. Hiện bấm vào thẻ chỉ mở hộp ghi kết quả gọi.

Thêm đường dẫn sang trang chi tiết khách khi bấm vào tên bệnh nhân. Giữ nguyên hành vi cũ khi bấm nút
Gọi hoặc phần còn lại của thẻ, chỉ tên bệnh nhân mới điều hướng.

## Phần 5: Tổng chi tiêu và số đơn tính trong 12 tháng gần nhất

File `server/routes.ts`, khoảng dòng 1113 tới 1138, chỗ tính `totalSpent` và `orderCount` trong
endpoint `GET /api/customers/:id`.

Hiện đang cộng dồn toàn bộ lịch sử. Đổi thành chỉ tính đơn trong 12 tháng gần nhất tính từ hôm nay.

Ở giao diện, đổi nhãn cho rõ: "Tổng chi tiêu" thành "Chi tiêu 12 tháng", "Số đơn hàng" thành "Đơn 12
tháng". Không để chữ Tổng nữa vì dễ hiểu nhầm là toàn bộ lịch sử.

## Phần 6: Đánh dấu khách VIP

Thêm cột `is_vip` kiểu boolean, mặc định false, vào bảng `customers` trong `shared/schema.ts`.

Thêm endpoint cập nhật trạng thái VIP cho một khách.

Ở màn chi tiết khách, thêm nút bật tắt VIP. Khi khách là VIP thì hiện một nhãn VIP cạnh tên khách.
Nhãn này cũng hiện ở danh sách khách hàng.

Quyền: mọi vai đang xem được khách đều bật tắt được, trừ khi có ràng buộc khác trong code hiện tại thì
giữ theo ràng buộc đó.

## Phần 7: Ghi chú bệnh nhân

Thêm vào bảng `customers`:

- `medical_note` kiểu text, cho phép rỗng.
- `medical_note_by` kiểu integer, id người nhập gần nhất.
- `medical_note_at` kiểu timestamp, thời điểm nhập gần nhất.

Thêm endpoint cập nhật ghi chú. Mỗi lần lưu thì ghi lại người nhập và thời điểm.

Ở màn chi tiết khách, thêm khối Ghi chú đặt ngay dưới phần thông tin khách, phía trên Lịch tái khám.
Ô nhập nhiều dòng, bấm vào là sửa được luôn, không cần nút sửa riêng. Dưới ô ghi chú hiện dòng nhỏ
ghi ai cập nhật gần nhất và lúc nào.

Gợi ý chữ trong ô khi trống: "Ghi chú về dị ứng thuốc, tiền sử bệnh, lưu ý khi chăm sóc".

Khi khách có ghi chú, hiện một dấu hiệu nhận biết ở đầu màn chi tiết khách để nhân viên nhìn là thấy
ngay có ghi chú quan trọng.

## Phần 8: Khung lịch sử khám bệnh, chưa nối API

Trong màn chi tiết khách, thêm một khối Lịch sử khám bệnh có nút để mở. Chưa gọi API vì HIS chưa
sẵn sàng.

Khi bấm nút, hiện trạng thái tạm: "Chưa nối hệ thống bệnh án". Dựng sẵn cấu trúc để sau này nối API
HIS vào là chạy, không phải làm lại giao diện.

## Sau khi chạy database

Cần chạy `npm run db:push` để tạo các cột mới. Ghi rõ trong báo cáo cuối là đã thêm cột nào.

## Phần 9: Đồng bộ chi tiêu ở màn danh sách khách

File `client/src/pages/customers.tsx`, khối `statsByPhone` khoảng dòng 98 tới 108.

Màn danh sách khách đang tự tính tổng chi tiêu ở phía giao diện, cộng dồn toàn bộ lịch sử. Nếu chỉ
sửa màn chi tiết sang 12 tháng thì hai màn sẽ hiện hai số khác nhau cho cùng một khách.

Sửa cho khớp: lọc đơn trong 12 tháng gần nhất trước khi cộng, dùng cùng cách tách ngày như phần 5 vì
ngày tạo đơn lưu dạng chữ. Đổi nhãn cột tiền ở danh sách cho rõ là số của 12 tháng.

## Phần 10: Xóa dữ liệu giả về nhãn khách

Sau khi VIP lấy từ database, file `client/src/lib/mock-crm.ts` không còn ai dùng. Cả file 133 dòng
hiện chỉ còn đúng một chỗ import là `CUSTOMER_TAGS` trong `customers.tsx`, các phần còn lại là code
chết.

Việc cần làm:

1. Bỏ import `CUSTOMER_TAGS` khỏi `customers.tsx`, thay bằng cột `isVip` từ database cho cả nhãn VIP,
   chip lọc VIP và số đếm.
2. Kiểm tra lại toàn bộ mã nguồn, xác nhận không còn chỗ nào import từ `mock-crm`.
3. Xóa file `client/src/lib/mock-crm.ts`.

Không tạo hệ nhãn mới. Các nhãn khác trong file đó như Tiềm năng, Khó tính, Cần tái khám vốn không
hiển thị ra giao diện, và cũng chưa có yêu cầu nghiệp vụ nào, nên bỏ hẳn.

Giữ nguyên hai chip lọc theo tái khám vì chúng đã tính từ dữ liệu thật.

## Báo cáo lại

Liệt kê file đã sửa, file đã xóa, cột database đã thêm, endpoint đã thêm, và xác nhận `npm run check`
sạch.
