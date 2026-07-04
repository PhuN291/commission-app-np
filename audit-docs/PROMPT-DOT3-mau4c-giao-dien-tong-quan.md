# Đợt 3 mẩu 4c: giao diện màn Phân tích tổng quan đọc số thật

Phần máy chủ đã xong (endpoint GET /api/analytics/overview trả đủ số thật theo kỳ). Mẩu này dựng
lại giao diện màn để đọc endpoint đó, bỏ hết số cứng. Giữ đúng bố cục và phong cách hiện có. CHỈ
sửa client/src/pages/analytics-overview.tsx, không đụng máy chủ.

Endpoint trả về (kỳ hiện tại nếu không truyền cycle):
- kpis: { doanhThuThucThu, soDonHoanThanh, giaTriTbDon, tyLeChot }, mỗi cái có { value, changePct }
  (changePct có thể null khi kỳ trước bằng 0).
- doanhThuTheoNgay: [{ ngay, doanhThu, doanhThuKyTruoc }].
- doanhThuTheoDichVu: [{ serviceName, doanhThu, tyTrong }].
- dichVuBanChay: [{ serviceName, doanhThu, tyTrong }] (top 5). dichVuCham: [{ serviceName, doanhThu }].
- doanhThuTheoNhanVien: [{ userId, name, role, doanhThu, hoaHong }].
- doanhThuTheoNhom: [{ nhom, doanhThu }].
- khach: { moi, quayLai }.
- hoanTien: { tong, dichVu: [{ serviceName, hoanTien }] }.
- hoaHong: { tong, tyLeTrenDoanhThu }.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Màn Phân tích tổng quan (client/src/pages/analytics-overview.tsx) đang dùng số cứng bịa.
Máy chủ đã có endpoint GET /api/analytics/overview trả số thật theo kỳ (mặc định kỳ hiện tại). Việc:
dựng lại màn này đọc endpoint, bỏ hết số cứng, giữ đúng bố cục và phong cách hiện có. CHỈ sửa file
analytics-overview.tsx.

Làm:

1. Lấy dữ liệu: dùng useQuery + authFetch gọi GET /api/analytics/overview (như các màn khác trong app
   gọi API có token). Bỏ toàn bộ mảng số cứng trong file (kpiCards, revenueLineData, serviceRevenueData,
   topGrowingServices).

2. Quyền: màn này chỉ cho quản lý (ceo, tc, kt). Nếu vai khác thì chuyển về trang chủ, dùng đúng cách
   admin-settings.tsx đang chặn vai (đọc np_role, Redirect về "/").

3. Bố cục giữ như hiện tại, chỉ thay nguồn số:
   - Bốn ô chỉ số: Doanh thu thực thu (tiền), Số đơn hoàn thành (số), Giá trị trung bình mỗi đơn
     (tiền), Tỷ lệ chốt (phần trăm). Mỗi ô hiện phần trăm thay đổi so kỳ trước; nếu changePct là null
     thì ẩn phần đổi hoặc ghi "—" thay vì hiện số sai.
   - Biểu đồ đường Doanh thu theo thời gian: vẽ doanhThuTheoNgay, đường kỳ này (doanhThu) và đường
     kỳ trước (doanhThuKyTruoc). Trục ngang là ngày trong tháng.
   - Doanh thu theo dịch vụ: vẽ thanh từ doanhThuTheoDichVu (serviceName, doanhThu, tyTrong).
   - Thay khối "Top 5 dịch vụ tăng trưởng" cũ bằng: Dịch vụ bán chạy (dichVuBanChay). Có thể thêm
     một khối nhỏ Dịch vụ chậm (dichVuCham) liệt kê dịch vụ không phát sinh trong kỳ.

4. Thêm các khối mới bên dưới, dùng cùng kiểu thẻ và section sẵn có:
   - Doanh thu theo nhân viên: mỗi người hiện tên, doanh thu, và hoa hồng.
   - Doanh thu theo nhóm dịch vụ.
   - Khách: số khách mới và số khách quay lại trong kỳ.
   - Hoàn tiền: tổng tiền hoàn và các dịch vụ bị hoàn.
   - Hoa hồng: tổng hoa hồng và tỷ lệ trên doanh thu.

5. NHÃN cho rõ, tránh hiểu nhầm: ở khối Doanh thu theo dịch vụ và theo nhóm, ghi chú nhỏ rằng đây là
   doanh thu theo giá niêm yết của từng dịch vụ, nên tổng có thể khác ô Doanh thu thực thu (đã trừ
   bảo hiểm và voucher). Ô Tỷ lệ chốt ghi rõ là số đơn khám xong trên tổng đơn tạo trong kỳ.

6. Bộ lọc khoảng ngày hiện tại (DateRangeFilter) không khớp dữ liệu tính theo kỳ tháng. Bỏ bộ lọc đó,
   thay bằng hiển thị kỳ hiện tại (ví dụ "Tháng MM/YYYY"). Việc cho chọn kỳ tháng để sau.

KHÔNG LÀM:
- KHÔNG đụng máy chủ.
- KHÔNG đụng màn Phân tích lịch hẹn (làm ở mẩu sau).

KHÔNG LÀM HỎNG:
- Màn chịu được kỳ ít hoặc không có dữ liệu: hiện số 0 và trạng thái trống lịch sự, không trắng màn,
  không lỗi.
- Giữ phong cách, màu, thành phần dùng lại của app.
- Trình biên dịch sạch.

TEST (báo rõ, kèm ảnh chụp nếu được):
1. npm run check (tsc) sạch.
2. Đăng nhập CEO, mở màn Phân tích tổng quan: các ô chỉ số và biểu đồ hiện đúng số thật khớp endpoint
   (đối chiếu doanh thu thực thu, số đơn, top dịch vụ).
3. Đăng nhập nhân viên thường: bị chuyển về trang chủ, không vào được màn.
4. Không còn số cứng nào trong file; không console error.

TIÊU CHÍ HOÀN THÀNH: màn Phân tích tổng quan chạy hoàn toàn bằng số thật từ endpoint, đúng bố cục,
có nhãn phân biệt doanh thu niêm yết và doanh thu thực thu, chặn vai đúng, biên dịch sạch. Báo lại
kết quả test kèm ảnh màn.
```

---

Xong màn này, đợt 3 chỉ còn màn Phân tích lịch hẹn (cũng làm máy chủ rồi tới giao diện), và mẩu rà
chữ toàn app. Anh chạy xong dán kết quả, em đọc code kiểm.
