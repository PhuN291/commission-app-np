# Đợt 3 mẩu 4c2: sửa cách hiển thị tiền màn Phân tích tổng quan

Màn đang hiển thị tiền rút gọn làm tròn về triệu nguyên: 3.650.000 thành "4tr", 4.500.000 thành
"5tr", 7.300.000 thành "7tr". Trên màn phân tích để ra quyết định, làm tròn thô như vậy gây hiểu
sai. Sửa lại: bốn ô chỉ số chính hiện tiền đầy đủ; các chỗ còn lại rút gọn nhưng giữ một chữ số
thập phân. CHỈ sửa client/src/pages/analytics-overview.tsx, không đụng máy chủ.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Màn Phân tích tổng quan (client/src/pages/analytics-overview.tsx) đang hiển thị tiền bằng
hàm fmtShort làm tròn về triệu nguyên, gây sai lệch nhìn thấy (3.650.000 hiện "4tr", 4.500.000 hiện
"5tr"). Số gốc đúng, chỉ cách hiển thị có vấn đề. Việc: sửa cách hiển thị tiền. CHỈ sửa file này.

Làm:
1. Sửa hàm fmtShort: phần triệu và phần tỷ giữ một chữ số thập phân, dùng dấu phẩy thập phân kiểu
   Việt Nam. Ví dụ 7.300.000 thành "7,3tr"; 3.650.000 thành "3,7tr"; 4.500.000 thành "4,5tr";
   1.200.000.000 thành "1,2tỷ". Phần nghìn giữ như cũ.
2. Hai ô chỉ số tiền ở đầu màn là Doanh thu thực thu và Giá trị trung bình mỗi đơn: hiển thị số
   tiền ĐẦY ĐỦ có dấu phân cách nghìn (dùng hàm fmtVND đã có, ví dụ 7.300.000đ), thay cho rút gọn.
   Hai ô còn lại (Số đơn hoàn thành, Tỷ lệ chốt) không phải tiền, giữ nguyên.
3. Các chỗ hiển thị tiền còn lại trên màn (dịch vụ bán chạy, doanh thu theo dịch vụ, doanh thu theo
   nhóm, doanh thu và hoa hồng theo nhân viên, tổng hoa hồng, hoàn tiền theo dịch vụ) dùng fmtShort
   mới một chữ số thập phân.
4. Trục biểu đồ và phần hiện khi rê chuột giữ nguyên (phần rê chuột vốn đã hiện số đầy đủ).

KHÔNG LÀM:
- KHÔNG đụng máy chủ, không đụng màn khác.
- KHÔNG đổi con số hay logic, chỉ đổi cách hiển thị.

KHÔNG LÀM HỎNG:
- Số gốc không đổi.
- Trình biên dịch sạch.
- Bố cục và phong cách giữ nguyên.

TEST (báo rõ):
1. npm run check (tsc) sạch.
2. Mở màn Phân tích tổng quan: ô Doanh thu thực thu hiện đầy đủ (ví dụ 7.300.000đ, không phải 7tr);
   ô Giá trị trung bình mỗi đơn hiện đầy đủ; các danh sách hiện kiểu 4,5tr (một chữ số thập phân),
   không còn làm tròn thô về 5tr.
3. Không console error.

TIÊU CHÍ HOÀN THÀNH: tiền trên màn không còn làm tròn thô gây sai lệch; bốn ô chính rõ ràng; biên
dịch sạch. Báo lại kết quả test.
```

---

Xong cái này là khép màn Phân tích tổng quan. Tiếp theo em lên màn Phân tích lịch hẹn, cũng làm máy
chủ trước rồi tới giao diện. Anh chạy xong dán kết quả, em đọc code kiểm.
