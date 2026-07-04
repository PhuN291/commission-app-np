# Đợt 3 mẩu 5a: rà chữ ba màn hoa hồng

Đây là nhóm nặng nhất khi rà chữ: ba màn duyệt hoa hồng, thu nhập, chi tiết đơn. Lộ nhiều viết tắt
nội bộ, tiếng Anh kỹ thuật, mã hiệu tài liệu, và một tên riêng. Sửa theo bảng quy ước từ vựng
(audit-docs/QUY-UOC-TU-VUNG.md). CHỈ sửa chữ hiển thị, không đụng logic, tên biến, endpoint.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Ba màn sau lộ nhiều chữ giọng máy cho người dùng (chủ và nhân viên phòng khám):
client/src/pages/admin-commission-approval.tsx, client/src/pages/income.tsx,
client/src/pages/order-detail.tsx. Việc: viết lại chữ HIỂN THỊ cho tự nhiên theo bảng quy ước từ
vựng trong file audit-docs/QUY-UOC-TU-VUNG.md. CHỈ sửa chuỗi người dùng nhìn thấy (nhãn, nút, tiêu
đề, placeholder, toast, thông báo). KHÔNG đụng tên biến, tên hàm, comment, hằng enum, hay logic.

Đọc trước bảng quy ước: audit-docs/QUY-UOC-TU-VUNG.md, rồi áp cho cả ba file.

Áp toàn bộ bảng quy ước, đặc biệt các điểm sau trong ba màn này:
- "CR" trong chữ hiển thị (tiêu đề, nút, toast, mô tả) đổi thành "hoa hồng" hoặc "khoản hoa hồng".
  Ví dụ "Từ chối CR" thành "Từ chối hoa hồng"; "Đã duyệt CR" thành "Đã duyệt hoa hồng"; "{n} CR"
  thành "{n} khoản".
- Viết tắt: HH thành hoa hồng, KT thành kế toán, NV thành nhân viên, BS thành bác sĩ, "Mã KH" thành
  "mã khách hàng".
- Tiếng Anh: refund/REFUND thành hoàn tiền, reject thành từ chối, review thành xem lại,
  adjustment thành điều chỉnh, cycle thành kỳ hoặc tháng, export thành xuất file, revert thành khôi
  phục, bulk-all thành hàng loạt, Auto thành tự động.
- Bỏ hết mã hiệu tài liệu và ghi chú nội bộ lọt ra màn: "R-11-7", "MS-9", "MS-12", "Phase 2",
  "placeholder", "typed confirmation", "build". Câu nào chỉ là ghi chú kỹ thuật thì viết lại thành
  câu cho người dùng, hoặc bỏ.
- Bỏ tên riêng lọt ra UI: ở màn duyệt hoa hồng có câu lộ tên "Diễm" và quy tắc R-11-7 (đại ý kế toán
  quyết định một mình). Viết lại trung tính: "Kế toán là người quyết định cuối cùng cho khiếu nại này."
- Ở order-detail, gợi ý lý do từ chối đang ghi "không khớp iHOS": đổi thành "không khớp số liệu hệ thống"
  (bỏ tên iHOS ở chỗ nhân viên thường thấy).
- Chính tả "kì" thành "kỳ".

Sau khi sửa, tự rà lại cả ba file: không còn chuỗi HIỂN THỊ nào chứa CR, HH, KT, NV (viết tắt),
refund, reject, review, adjustment, cycle, export, revert, MS-, Phase 2, hay tên riêng. Các từ giữ
nguyên theo bảng: SĐT, VAT, VIP, OTP, Zalo, CEO, Excel.

KHÔNG LÀM:
- KHÔNG đổi tên biến, hàm, hằng enum, key, hay logic. Chỉ đổi chuỗi hiển thị.
- KHÔNG đụng máy chủ.
- KHÔNG đụng màn khác (các màn còn lại rà ở mẩu sau).

KHÔNG LÀM HỎNG:
- Chức năng giữ nguyên (duyệt, từ chối, khiếu nại, điều chỉnh vẫn chạy).
- Trình biên dịch sạch.

TEST (báo rõ):
1. npm run check (tsc) sạch.
2. Mở ba màn (đăng nhập vai phù hợp): đọc qua thấy chữ tự nhiên, không còn CR, refund, reject,
   review, MS-9, Phase 2, tên "Diễm".
3. Các nút và thao tác (duyệt, từ chối, khiếu nại) vẫn hoạt động.
4. Không console error.

TIÊU CHÍ HOÀN THÀNH: ba màn hoa hồng hết giọng máy, chữ tự nhiên theo bảng quy ước, chức năng và
biên dịch nguyên vẹn. Báo lại kết quả test.
```

---

Sau nhóm này còn hai nhóm rà chữ: nhóm bậc và nhân sự (xếp hạng, cấu hình hoa hồng, nhân viên, và
bảng tên bậc trong types.ts), rồi nhóm các màn nhẹ (trang chủ, đơn hàng, đăng nhập, voucher, chi
tiết dịch vụ). Anh chạy xong dán kết quả, em đọc chữ kiểm rồi mình làm nhóm tiếp.
