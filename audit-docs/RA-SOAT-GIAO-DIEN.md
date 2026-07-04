# Rà soát giao diện toàn app (NP Commission)

Nguồn: quét code toàn bộ 23 màn + xem trực tiếp trên Chrome 8 màn đại diện (trang chủ, đơn hàng,
tạo đơn, phân tích tổng quan, duyệt hoa hồng, nhân sự, xếp hạng, cài đặt). App là khung mobile cố
định 390px, nền tảng React + Tailwind + shadcn/ui + bộ component riêng np/.

## Kết luận ngắn

Nền tảng tốt: có bộ component dùng chung, có design token (màu, bo góc, spacing) trong index.css,
layout mobile sạch, có cả podium xếp hạng đẹp. Vấn đề không phải thiếu nền tảng mà là KHÔNG tuân
thủ nền tảng đó. Mỗi màn tự chế cỡ chữ, màu, khoảng cách, định dạng tiền theo ý riêng, dẫn tới giao
diện thiếu nhất quán và lộ vài chỗ giọng kỹ thuật.

## Vấn đề theo mức độ

### A. Định dạng tiền loạn (nặng nhất, thấy ở mọi màn)

Cùng một app nhưng tiền hiển thị 4 kiểu:
- "tr₫" ở trang chủ, xếp hạng (ví dụ "2.6 tr₫")
- "đ" ở phân tích ("7.300.000đ")
- "₫" ở đơn hàng, duyệt hoa hồng ("2.500.000₫")
- "k₫" ở xếp hạng ("4k₫")
Có chỗ có ký hiệu tiền, chỗ không: hero trang chủ ghi "53 tr₫" còn card ngay dưới ghi "53 tr".
Đây là lỗi nhất quán rõ nhất. Cần một hàm định dạng tiền duy nhất dùng chung toàn app.

### B. Màu nhấn không thống nhất

Nút và link đang dùng lẫn lộn: teal thương hiệu (nút Tạo đơn, Thêm), xanh dương (link "Thêm khách
hàng mới", "Xem tất cả"), đen (nút Thêm dịch vụ, chip đang chọn). Màu avatar cũng đổi theo màn:
podium xếp hạng vàng/bạc/đồng, danh sách bên dưới lại tím, màn nhân sự lại xám. Dẫn chứng code:
client/src/pages/order-create.tsx:143-147, ranking.tsx:426, np/badge.tsx:11-15 (hardcode mã màu hex
thay vì token).

### C. Avatar trùng và đổi màu

Chữ tắt tên trùng nhau khó phân biệt: "TM" cho cả Nguyễn Thị Mai và Trần Minh, "TT" cho cả Lê Thị
Tuyết và Hoàng Thị Trang. Cùng một người nhưng màu avatar khác nhau giữa các màn. Cần quy tắc sinh
màu ổn định theo tên và cách lấy chữ tắt ít trùng hơn.

### D. Lộ giọng kỹ thuật và chữ còn sót

- Màn Nhân sự hiển thị "iHOS✓ iHOS-12345" bằng font lập trình, trông như dòng debug. Cần gói lại
  thành nhãn gọn (ví dụ một badge "Đã nối iHOS" và dòng "Mã iHOS: 12345").
- Màn Cài đặt còn "Kì lương", sai chính tả, phải là "Kỳ lương" (sót khi rà chữ).
- "PK" viết tắt phòng khám còn ở trang chủ ("Tổng hoa hồng chi PK tháng", "Doanh số PK", "Cần xử lý
  PK").
- Mỗi thẻ chỉ số ở màn Phân tích có một dấu gạch "—" nhỏ góc phải (ý là xu hướng nhưng không có dữ
  liệu để so), trông như nút thừa khó hiểu.

### E. Lặp và dư thừa

- Màn Duyệt hoa hồng hiện chữ tháng ba lần: tiêu đề trên, tiêu đề lớn, và ô chọn tháng.
- Màn Nhân sự: đã có tab lọc "Đang làm việc" nhưng mỗi dòng vẫn gắn lại badge "Đang làm việc".
- Màn Cài đặt đánh số 1 đến 4 cho bốn mục, gây hiểu nhầm là các bước bắt buộc theo thứ tự.

### F. Nhất quán nền tảng (từ quét code, áp cho cả 23 màn)

- Cỡ chữ hardcode rải rác text-[11px]/[12px]/[13px]/[14px]/[15px]... thay vì một thang chữ thống
  nhất. Nhiều chỗ dùng style màu nội tuyến (dashboard.tsx:264,270).
- Khoảng cách tùy tiện gap-2.5/3/3.5, padding px-3 vs px-4 lẫn lộn.
- Trạng thái rỗng, đang tải, lỗi mỗi màn làm một kiểu, có màn chỉ có spinner trơ (orders.tsx:251),
  có màn không có giao diện lỗi.
- Thanh tab dưới hiện cả ở màn dạng biểu mẫu (tạo đơn), nên ẩn ở các luồng con.
- Phản hồi khi bấm (hover, nhấn, vô hiệu) còn ít và không đều.

### G. Điểm đang tốt, nên giữ

Khung mobile và header gọn, có bộ component np/ tái dùng được, podium xếp hạng bắt mắt, cấu trúc
chia mục trên các màn biểu mẫu rõ ràng. Hướng đi là siết kỷ luật trên nền có sẵn, không đập đi làm
lại.

## Đề xuất cách làm (hai giai đoạn)

Giai đoạn 1, chuẩn hóa nền tảng dùng chung (gốc rễ của phần lớn lỗi trên):
1. Một hàm định dạng tiền duy nhất, quy ước rõ khi nào hiển thị đầy đủ, khi nào rút gọn, dùng một
   ký hiệu tiền thống nhất. Thay toàn bộ chỗ tự chế.
2. Một thang chữ và một bảng màu nhấn chuẩn (màu chính teal thương hiệu, một màu link). Bỏ màu hex
   nội tuyến, ép dùng token.
3. Một quy tắc avatar (màu theo tên, chữ tắt ít trùng).
4. Một bộ trạng thái rỗng, đang tải, lỗi dùng chung.
5. Dọn các chỗ lộ kỹ thuật và chữ sót ở nhóm D.

Giai đoạn 2, áp nền tảng đã chuẩn vào từng nhóm màn và dọn lặp ở nhóm E, đi theo từng mẩu nhỏ như
cách đang làm, mỗi mẩu xong em kiểm rồi mới sang mẩu sau.

Cách làm vẫn giữ nguyên quy trình: em viết lệnh cho Claude Code thực thi, sau đó em mở app kiểm lại
trực tiếp và báo anh, không tự sửa code.
