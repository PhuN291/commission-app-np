# Khung nghiệm thu dự án NP Commission

Tài liệu xương sống để đi đến nghiệm thu. Mọi việc lẻ (sửa lỗi, audit vai, thiết kế, tích hợp) đều
quy về đây. Nhìn một chỗ là biết còn cách đích bao xa.

## Quy ước trạng thái

- ĐẠT: đã làm và đã kiểm trên code, tin được.
- CẦN NGHIỆM THU: đã code xong nhưng chưa chạy thử trọn luồng trên app theo vai.
- ĐANG LÀM: đang xử lý.
- CHƯA LÀM: chưa bắt đầu.
- CHỜ NGOÀI: phụ thuộc việc ngoài code (iHOS, CEO chốt số, Zalo OA).

## Cách dùng

Nghiệm thu theo từng vai, đi trọn luồng từ đầu đến cuối trên app thật (không soi file lẻ). Mỗi mục
không đạt thì ghi vào danh sách lỗi, sửa theo ưu tiên, rồi nghiệm thu lại tới khi sạch.

---

## Trục 1: Chức năng theo vai (luồng end-to-end)

### Sale (Điều dưỡng)

| Luồng | Tiêu chí đạt | Trạng thái |
|---|---|---|
| Đăng nhập | Nhập SĐT, nhận OTP qua Zalo, vào đúng vai. Khóa sau 3 lần sai | CẦN NGHIỆM THU (Zalo OA: CHỜ NGOÀI) |
| Trang chủ cá nhân | Thấy hoa hồng tạm tính, doanh số, đơn chốt, cần xử lý, thành tích của riêng mình | CẦN NGHIỆM THU |
| Tạo đơn | Chọn khách, dịch vụ, lịch hẹn, voucher, xuất hóa đơn công ty; đơn gắn đúng người tạo | CẦN NGHIỆM THU |
| Quản lý đơn của mình | Chỉ thấy đơn của mình, lọc theo trạng thái, xác nhận/nhắc lịch | CẦN NGHIỆM THU |
| Khách hàng của mình | Chỉ thấy khách mình phụ trách, xem lịch sử, tái khám | CẦN NGHIỆM THU |
| Hoa hồng cá nhân | Tổng hoa hồng, từng khoản theo đơn, điều chỉnh, truy thu khớp trang chủ | CẦN NGHIỆM THU |
| Xếp hạng | Thấy bậc của mình (M0..M3) và bảng xếp hạng | CẦN NGHIỆM THU |
| Thông báo | Nhận thông báo hoa hồng được duyệt/bị từ chối của mình | CẦN NGHIỆM THU |

### Bác sĩ

| Luồng | Tiêu chí đạt | Trạng thái |
|---|---|---|
| Đăng nhập, trang chủ, hoa hồng, xếp hạng (bậc L1..L3) | Như sale nhưng theo dữ liệu bác sĩ | CHỜ NGOÀI (iHOS chưa gán bác sĩ vào đơn) |
| Xem đơn và khách liên quan bác sĩ | Bác sĩ thấy đơn mình phụ trách | CHỜ NGOÀI (iHOS) |

### Trưởng ca (tc)

| Luồng | Tiêu chí đạt | Trạng thái |
|---|---|---|
| Xem toàn phòng khám | Thấy đơn, khách, hoa hồng toàn phòng khám | CẦN NGHIỆM THU |
| Hoa hồng của trưởng ca | Có hoa hồng, tính theo tỉ lệ (không bậc) đúng | CẦN XÁC NHẬN NGHIỆP VỤ + NGHIỆM THU |
| Nhân sự | Xem danh sách nhân sự (không sửa) | CẦN NGHIỆM THU (xác nhận quyền) |
| Báo cáo, xếp hạng, phân tích | Xem được | CẦN NGHIỆM THU |

### Kế toán (kt)

| Luồng | Tiêu chí đạt | Trạng thái |
|---|---|---|
| Duyệt hoa hồng | Duyệt từng khoản, cả đơn, cả kỳ; xử lý khiếu nại | CẦN NGHIỆM THU |
| Điều chỉnh và truy thu | Tạo, hủy, sửa điều chỉnh; truy thu đúng | CẦN NGHIỆM THU |
| Cấu hình hoa hồng | Xem và sửa tỉ lệ theo vai và bậc | CẦN NGHIỆM THU (số %: CHỜ NGOÀI CEO chốt) |
| Voucher, cài đặt hệ thống | Quản lý voucher, kỳ lương, thưởng mục tiêu | CẦN NGHIỆM THU |

### CEO

| Luồng | Tiêu chí đạt | Trạng thái |
|---|---|---|
| Trang chủ quản lý | Tổng hoa hồng phòng khám, doanh số, top nhân viên, cần xử lý toàn phòng | CẦN NGHIỆM THU |
| Phân tích tổng quan và lịch hẹn | Số thật, chỉ số đúng | CẦN NGHIỆM THU |
| Quản lý nhân sự | Tạo, sửa, gán vai, gán bậc, chỉ tiêu, đánh dấu nghỉ, gỡ thiết bị | ĐANG LÀM (audit vai) |
| Cấu hình hoa hồng, voucher, cài đặt | Toàn quyền | CẦN NGHIỆM THU |

## Trục 2: Tiền đúng (sống còn)

| Hạng mục | Tiêu chí đạt | Trạng thái |
|---|---|---|
| Hoa hồng về một nguồn | Trang chủ, thu nhập, xếp hạng cùng một con số | ĐẠT (đợt 1) |
| Lọc trạng thái hoa hồng | Chỉ cộng khoản hợp lệ, loại từ chối/hủy/truy thu chờ | ĐẠT (đợt 1) |
| Doanh thu thực thu | Bằng tiền niêm yết trừ bảo hiểm, voucher, hoàn tiền, chỉ đơn hoàn thành | ĐẠT (đợt phân tích) |
| Định dạng tiền | Thống nhất một kiểu trên mọi màn | CẦN NGHIỆM THU (đang chỉnh ở phần thiết kế) |
| Giá vốn và lợi nhuận | Có giá vốn để tính lợi nhuận thật | CHỜ NGOÀI (CEO cung cấp giá vốn) |

## Trục 3: Phân quyền theo vai (audit đang chạy)

| Bước | Nội dung | Trạng thái |
|---|---|---|
| B1 | Bản đồ vai và ma trận quyền kỳ vọng | ĐANG LÀM (chờ anh xác nhận ma trận) |
| B2 | Audit cổng chặn endpoint máy chủ | CHƯA LÀM |
| B3 | Audit lọc dữ liệu theo người | CHƯA LÀM |
| B4 | Audit giao diện theo vai | CHƯA LÀM |
| B5 | Audit màn nhân sự (chỗ nhiều sạn) | CHƯA LÀM |
| B6 | Audit bậc theo vai | CHƯA LÀM |
| B7 | Tổng hợp sạn và prompt sửa | CHƯA LÀM |

## Trục 4: Trải nghiệm và nội dung

| Hạng mục | Tiêu chí đạt | Trạng thái |
|---|---|---|
| Rà chữ toàn app | Hết viết tắt, tiếng Anh kỹ thuật, giọng máy | ĐẠT (đợt 3) |
| Thiết kế giao diện | Nhất quán, dễ dùng, đúng nhận diện | ĐANG LÀM (anh tự xử lý trên Claude Design) |
| Trạng thái rỗng, tải, lỗi | Mỗi màn có trạng thái rõ ràng | CẦN NGHIỆM THU |

## Trục 5: Sẵn sàng vận hành (go-live)

| Hạng mục | Tiêu chí đạt | Trạng thái |
|---|---|---|
| CEO chốt phần trăm hoa hồng và giá vốn | Có số chính thức để cấu hình | CHỜ NGOÀI |
| Đăng ký Zalo OA | OTP gửi được qua Zalo thật | CHỜ NGOÀI |
| Tích hợp iHOS | Đồng bộ đơn, gán bác sĩ, mã định danh | CHỜ NGOÀI (mở đợt 4) |
| Ngưỡng thăng bậc | Chốt số ngưỡng (đang để tạm) | CHỜ NGOÀI (CEO) |

---

## Đường tới nghiệm thu hoàn chỉnh (thứ tự đề xuất)

1. Chốt ma trận quyền (trục 3 bước 1) làm thước đo.
2. Chạy hết audit phân quyền (trục 3 bước 2 tới 7), sửa sạn. Đây là chỗ anh thấy nhiều sạn nhất.
3. Nghiệm thu chức năng theo từng vai (trục 1), bắt đầu từ vai có nhiều người dùng nhất là Sale, rồi
   Kế toán, Trưởng ca, CEO. Bác sĩ để cùng đợt iHOS.
4. Kiểm trục tiền (trục 2) xuyên suốt khi nghiệm thu từng vai.
5. Hoàn tất thiết kế (trục 4) song song, không chặn các trục kia.
6. Khi ba việc vận hành (trục 5) xong, ráp iHOS để mở đợt 4 và go-live.
