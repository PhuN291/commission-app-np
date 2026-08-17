# Tổng quan nghiệp vụ toàn dự án NP Commission

Tổng hợp từ: code app thật (22 màn, 18 bảng dữ liệu, các nhóm API), lịch sử ba đợt, buổi review vòng
đời đơn, và các tài liệu đã có. Mục đích: nhìn một chỗ thấy app gồm những luồng nghiệp vụ nào, mỗi
luồng đã chắc tới đâu, chỗ nào thiếu, chỗ nào dư. Đây là bản đồ để khoan sâu có trọng tâm.

Sau khi kiểm kê code, bức tranh 12 miền ban đầu là chưa đủ. App thật có khoảng 18 luồng, gom vào 5
nhóm. Bảy luồng trước đây em bỏ sót được đánh dấu MỚI bên dưới.

Độ chắc nghiệp vụ: CAO là đã rõ và chốt; VỪA là làm rồi nhưng chuẩn nghiệp vụ chưa xác nhận hết;
THẤP là còn nhiều câu hỏi, dễ có sạn.

## Nhóm A: Vận hành đơn và khách

| Luồng | App đang có | Độ chắc | Ghi chú |
|---|---|---|---|
| Đơn và vòng đời | Hai tầng trạng thái, gộp 8 trạng thái, có mốc xác nhận và hoàn thành | VỪA | Đã chốt phần 1, còn nghi 8 trạng thái |
| Hoàn tiền và truy thu | Hoàn toàn phần hoặc toàn bộ, kéo theo truy thu hoa hồng | THẤP (MỚI) | Là luồng riêng, không chỉ là một trạng thái |
| Hóa đơn công ty (VAT) | Lưu tên, mã số thuế, địa chỉ công ty trên đơn | VỪA (MỚI) | Tính năng nhỏ, bức tranh cũ chưa nêu |
| Dịch vụ, giá, giá vốn | Danh mục có giá, phần trăm, cần bác sĩ hay không, giá vốn | VỪA | Giá vốn đang để trống chờ CEO |
| Khách hàng và nhật ký chăm | Danh sách khách, người chăm gốc, nhật ký gọi nhắn | VỪA | Có CRM nhẹ (customer_events) |
| Tái khám | Worklist theo lượt, nhật ký từng cuộc gọi | VỪA | Nối số thật chờ HIS |

## Nhóm B: Tiền và hoa hồng (lõi)

| Luồng | App đang có | Độ chắc | Ghi chú |
|---|---|---|---|
| Tính hoa hồng | Engine sinh hoa hồng, cơ sở là lãi ròng | THẤP | Xem cờ đỏ bên dưới, cực quan trọng |
| Người hưởng và gán, bàn giao | Gán nhiều vai vào đơn, có mốc kết thúc khi bàn giao | VỪA | Bàn giao gắn nghỉ việc |
| Duyệt hoa hồng và khiếu nại | Duyệt từng khoản, nhân viên khiếu nại trong 3 ngày | VỪA (khiếu nại MỚI) | Luồng tranh chấp tiền, cũ chưa nêu |
| Thưởng phạt và truy thu | Cộng trừ tiền theo kỳ, truy thu khi hoàn đơn | VỪA (MỚI) | Bảng adjustments riêng |
| Thưởng tự động theo mục tiêu | Đạt mục tiêu phần trăm thì tự cộng thưởng | THẤP (MỚI) | Auto rule, cần chốt ngưỡng và mức |
| Kỳ lương và chốt sổ | Chu kỳ theo tháng, hạn chốt, cảnh báo vượt trần | VỪA (MỚI) | Quyết định khi nào khóa sổ trả lương |
| Bậc và thăng bậc | Bậc M cho sale, L cho bác sĩ | THẤP | Đang chạy dữ liệu giả, xem đồ dư |

## Nhóm C: Quản trị

| Luồng | App đang có | Độ chắc | Ghi chú |
|---|---|---|---|
| Nhân sự và nghỉ việc | Tạo sửa nhân sự, gán vai và bậc, đánh dấu nghỉ | VỪA | Đang audit, anh thấy nhiều sạn |
| Phân quyền theo vai | Chặn theo vai ở máy chủ và giao diện | VỪA | Audit chưa chạy |
| Voucher | Tạo mã giảm, điều kiện áp, giới hạn lượt | VỪA | |
| Cấu hình hệ thống | Tỉ lệ hoa hồng theo vai và bậc, kỳ lương, thưởng | VỪA | Số thật chờ CEO |

## Nhóm D: Minh bạch và giao tiếp

| Luồng | App đang có | Độ chắc | Ghi chú |
|---|---|---|---|
| Báo cáo và phân tích | Trang chủ, tổng quan, lịch hẹn | VỪA | Chỉ số nào CEO thật cần |
| Thông báo | Báo hoa hồng được duyệt hay từ chối | VỪA (MỚI) | |
| Nhật ký và truy vết | Ghi vết đổi trạng thái, thao tác, hành động khách | VỪA (MỚI) | Quan trọng cho nghiệm thu, ai làm gì khi nào |

## Nhóm E: Bên ngoài

| Luồng | App đang có | Độ chắc | Ghi chú |
|---|---|---|---|
| Tích hợp HIS và website | Cột nguồn đơn, mã định danh, chống nhận trùng đã để sẵn | THẤP | Chưa nối thật |
| Sẵn sàng vận hành | Chưa go-live | THẤP | Giá vốn, Zalo OA, HIS chờ ngoài |

## Cờ đỏ cần anh xác nhận sớm: hoa hồng tính trên lãi ròng

Code đang tính hoa hồng theo công thức này:

lãi ròng = (giá niêm yết trừ bảo hiểm trừ voucher) trừ giá vốn, rồi hoa hồng mỗi vai bằng lãi ròng
nhân phần trăm của vai.

Nguồn ba con số bị trừ, theo code hiện tại:

- Số tiền bảo hiểm trên đơn hiện luôn bằng 0. Không màn nào cho nhập, cổng tạo đơn không gán, dữ
  liệu mẫu để trống. Đây là ô cắm sẵn chờ HIS. Nhãn Có hỗ trợ hay Không hỗ trợ trên dịch vụ chỉ
  là chữ mô tả, không phải số tiền.
- Voucher có màn áp mã thật nên số voucher có thể khác 0. Chưa soi kỹ, kiểm riêng khi cần.
- Giá vốn từng dịch vụ đang để trống, nên tạm thời lãi ròng bằng doanh thu thực thu.

Hệ quả thực tế:

1. Hôm nay phép trừ bảo hiểm và giá vốn chưa tác động gì vì cả hai đang bằng 0. Cảnh báo bên dưới
   là về thiết kế, chưa xảy ra trên số thật.
2. Ngày nối HIS, số bảo hiểm từng đơn sẽ về và app sẽ tự trừ khỏi cơ sở tính hoa hồng. Khi đó
   nhân viên không ăn hoa hồng trên phần bảo hiểm. Nếu chưa chốt chính sách trước thì con số tự đổi
   mà không ai để ý.

Đây là chính sách lớn đang nằm sẵn trong code mà chưa ai chốt với anh. Nhiều phòng khám tính hoa
hồng trên doanh thu chứ không trên lãi ròng. Anh cần xác nhận: khi có số thật, hoa hồng tính trên
lãi ròng (như code) hay trên doanh thu. Phải làm rõ trước khi khoan sâu phần hoa hồng, và trước khi
HIS về.

## Đồ dư nên cân nhắc bỏ

- Bảng nhân sự cũ staff_members. Trang xếp hạng thật không đọc bảng này, nghi là đồ cũ còn sót. Cần
  xác nhận không còn chỗ nào dùng rồi bỏ.
- Các cột cũ trên nhân sự đã đánh dấu bỏ: doanh thu mục tiêu cũ, doanh thu hiện tại, tỉ lệ hoa hồng
  cũ. Còn để tạm cho vài màn cũ.
- Trang xếp hạng đang chạy dữ liệu giả: lấy doanh thu từ cột cũ và ba tháng lịch sử gắn cứng trong
  code. Chưa tính từ đơn thật. Đây không phải bỏ mà là phải nối số thật.

## Ba luồng rủi ro cao nhất, làm rõ trước

1. Tính hoa hồng. Trái tim app, độ chắc thấp, lại có cờ đỏ lãi ròng ở trên.
2. Vòng đời và trạng thái đơn. Tám trạng thái sinh từ hai tầng kỹ thuật, chưa chắc khớp luồng thật.
3. Bậc và thăng bậc. Ngưỡng để tạm, dữ liệu đang giả.

## Quyết định lớn chờ anh và CEO

- Hoa hồng tính trên lãi ròng hay doanh thu (cờ đỏ ở trên).
- Cơ sở và phần trăm cho từng vai và bậc.
- Ngưỡng thăng bậc, và mức thưởng tự động theo mục tiêu.
- Trưởng ca hưởng hoa hồng kiểu gì.
- Giá vốn từng dịch vụ.
- Khi nào khóa sổ kỳ lương để trả.
- HIS cấp những dữ liệu gì.

## Câu hỏi mở

- Bức tranh 18 luồng này đã đủ chưa, hay còn luồng thật ngoài app: chấm công, quỹ thưởng riêng, KPI
  khác, hợp đồng lương.
- Có luồng nào trong app đang thừa so với cách phòng khám thật vận hành không.
