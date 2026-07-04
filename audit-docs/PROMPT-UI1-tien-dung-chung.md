# Đợt giao diện, mẩu 1: một hàm định dạng tiền dùng chung

Gốc của lỗi tiền loạn: app không có hàm định dạng tiền chung. Hiện có ít nhất ba bản fmtVND
(components/np/search-sheet.tsx:61, pages/order-create.tsx:43, pages/analytics-overview.tsx:66) và
sáu bản hàm rút gọn (analytics-overview, ranking, dashboard, customer-detail, customers,
order-create), mỗi bản khác ngưỡng, dấu thập phân, khoảng trắng, và ký hiệu (đ, ₫, VNĐ, hoặc không
có). Mẩu này gom về một chuẩn.

## Quy ước tiền (chốt)

Ký hiệu thống nhất: "đ" chữ thường, đặt ngay sau số, không có khoảng trắng. Bỏ hết "₫" và "VNĐ".
Lý do chọn "đ": hiển thị ổn định, quen thuộc; ký hiệu "₫" ở font hiện tại bị render nhỏ trông như
chữ "ẹ". Nếu sau này muốn đổi sang "₫" thì chỉ sửa một chỗ trong money.ts.

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: App đang có nhiều bản sao hàm định dạng tiền nằm rải ở từng màn, gây hiển thị tiền không
nhất quán (lẫn đ, ₫, VNĐ, tr, k, dấu chấm và dấu phẩy). Việc: tạo MỘT module tiền dùng chung và
thay toàn bộ các bản tự chế bằng nó. Chỉ đụng tầng client. KHÔNG đổi logic tính tiền, chỉ đổi cách
hiển thị.

Bước 1. Tạo file client/src/lib/money.ts export ba hàm, kèm comment quy ước:

  // Đơn vị thống nhất toàn app: "đ" chữ thường, ngay sau số, không khoảng trắng.
  // Dấu phân tách nghìn: dấu chấm. Dấu thập phân (bản rút gọn): dấu phẩy.

  formatMoney(n): bản đầy đủ. Nhóm nghìn bằng dấu chấm rồi thêm "đ".
    Ví dụ: 3671000 -> "3.671.000đ"; 0 -> "0đ"; -125000 -> "-125.000đ".
    Dùng cho: số tiền cần chính xác (KPI lớn, hero, tổng tiền đơn, chi tiết đơn, từng khoản hoa
    hồng, số tiền trong danh sách đơn).

  formatMoneyShort(n): bản rút gọn cho chỗ chật.
    n >= 1 tỷ  -> một chữ số thập phân phẩy, bỏ ",0", hậu tố "tỷ". Ví dụ 1200000000 -> "1,2tỷ".
    n >= 1 triệu -> hậu tố "tr". Theo đúng quy tắc của design-ref/tokens.js (NP.fmtShort): nếu
      n >= 10 triệu thì làm tròn số nguyên, không thập phân (ví dụ 12300000 -> "12tr"); nếu trong
      khoảng 1 đến dưới 10 triệu thì một chữ số thập phân dấu phẩy, bỏ ",0" (ví dụ 2600000 ->
      "2,6tr"; 5000000 -> "5tr").
    n >= 1 nghìn -> làm tròn, hậu tố "k". Ví dụ 365000 -> "365k"; 30000 -> "30k".
    n < 1000 (gồm 0) -> số + "đ". Ví dụ 0 -> "0đ"; 500 -> "500đ".
    Số âm: thêm dấu "-" phía trước.
    Lưu ý: ở mức tr/k/tỷ KHÔNG kèm "đ" (hậu tố đã hàm ý tiền); chỉ kèm "đ" ở mức dưới 1000.
    Dùng cho: chỗ hẹp (podium xếp hạng, top nhân viên ở trang chủ, dòng phụ hero, thẻ chỉ số nhỏ).

  formatAxis(n): nhãn trục biểu đồ, số nguyên rút gọn, không thập phân.
    Ví dụ 8000000 -> "8tr"; 500000 -> "500k"; 0 -> "0".

Bước 2. Thay toàn bộ các bản tự chế bằng ba hàm trên. Nguyên tắc giữ nguyên ngữ cảnh:
  - Chỗ ĐANG hiển thị đầy đủ (đang dùng Intl.NumberFormat, toLocaleString cho tiền, hoặc fmtVND nội
    bộ) -> dùng formatMoney. Bỏ phần ghép "đ"/"₫"/"VNĐ" thủ công ở nơi gọi vì formatMoney đã có "đ".
  - Chỗ ĐANG rút gọn (các hàm chia cho 1 triệu rồi thêm "tr", chia 1000 thêm "k") -> dùng
    formatMoneyShort. Bỏ phần ghép "đ"/"₫" ở nơi gọi.
  - Nhãn trục biểu đồ -> formatAxis.
  Quan trọng: KHÔNG tự ý đổi một chỗ đang đầy đủ thành rút gọn hay ngược lại. Chỉ thay hàm, giữ
  nguyên việc chỗ đó vốn đầy đủ hay rút gọn.

Các file đã biết có bản tự chế cần thay (rà thêm nếu còn sót):
  components/np/search-sheet.tsx; pages/order-create.tsx; pages/analytics-overview.tsx;
  pages/ranking.tsx; pages/dashboard.tsx; pages/customer-detail.tsx; pages/customers.tsx;
  pages/service-detail.tsx; pages/services.tsx; pages/admin-vouchers.tsx;
  pages/admin-voucher-detail.tsx; pages/notifications.tsx; pages/analytics-appointments.tsx;
  pages/order-detail.tsx; pages/admin-commission-approval.tsx; pages/income.tsx;
  pages/admin-commission-config.tsx; components/ui/chart.tsx (chỉ phần hiển thị tiền, không đụng
  chart khác).

Bước 3. Xử lý riêng hero trang chủ (pages/dashboard.tsx): hiện số tiền hero hiển thị kèm một span
chữ "VNĐ" tách rời (khoảng dòng 524) và dòng phụ dùng "₫". Bỏ span "VNĐ", cho hero dùng formatMoney
(đã có "đ") và dòng phụ dùng formatMoneyShort. Card "Doanh số" và hero phải cùng một kiểu hiển thị.

Bước 4. Xóa các hàm định dạng tiền cục bộ đã trở nên thừa sau khi thay (fmtVND, fmtShort, fmtAxis,
và các hàm rút gọn nội bộ ở từng file).

KHÔNG LÀM:
- KHÔNG đụng tầng server, KHÔNG đổi công thức tính tiền (chỉ đổi cách hiển thị).
- KHÔNG đổi chỗ đầy đủ thành rút gọn hay ngược lại.
- KHÔNG dùng "₫" hay "VNĐ" nữa; tất cả là "đ".

KHÔNG LÀM HỎNG:
- Mọi màn vẫn chạy; số tiền vẫn đúng giá trị, chỉ đổi cách viết.
- Trình biên dịch sạch (npm run check).

TEST (báo rõ):
1. npm run check sạch.
2. Mở và đọc tiền ở: trang chủ (hero, card, top nhân viên), đơn hàng (danh sách), tạo đơn, phân
   tích tổng quan (KPI + trục biểu đồ), duyệt hoa hồng, xếp hạng (podium + danh sách), chi tiết đơn.
   Xác nhận: chỉ còn ký hiệu "đ", không còn "₫" hay "VNĐ"; hero và card cùng kiểu; chỗ rút gọn dùng
   "tr/k/tỷ" thống nhất dấu phẩy thập phân.
3. Không còn bản sao hàm định dạng tiền nào ngoài money.ts (grep fmtVND, fmtShort còn lại chỉ trong
   money.ts hoặc đã xóa).
4. Không console error.

TIÊU CHÍ HOÀN THÀNH: toàn app dùng chung money.ts, tiền hiển thị nhất quán một ký hiệu "đ", chức
năng và biên dịch nguyên vẹn. Báo lại kết quả test.
```

---

Đây là mẩu nền tảng đầu của đợt giao diện. Sau mẩu này em sẽ mở app kiểm tiền trực tiếp trên các
màn rồi mới sang mẩu kế (thang chữ và bảng màu nhấn). Anh chạy xong dán kết quả, em kiểm.
