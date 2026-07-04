# Đợt 3 mẩu 3b: thu gọn màn Cài đặt và viết lại chữ cho tự nhiên

Hai việc trên đúng một màn client/src/pages/admin-settings.tsx. CHỈ đụng file này, không đụng
server và không đổi logic đọc ghi.

Việc 1: thu gọn. Màn đang bày mười nhóm, phần lớn chỉ để xem hoặc còn trống, gây rối. Chỉ giữ
bốn nhóm dùng được, ẩn sáu nhóm chưa làm gì.

Việc 2: viết lại chữ. Nhiều chỗ đang lộ mã hiệu nội bộ (R-9-1, B-12, R-5-1, MS-5) và thuật ngữ
kỹ thuật (Phase 2, Trigger, adjustment AUTO_PENDING, Cap warning, Deadline payday, Cycle). Người
dùng là chủ và nhân viên phòng khám, không hiểu mấy thứ đó. Viết lại bằng tiếng Việt tự nhiên.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Màn Cài đặt client/src/pages/admin-settings.tsx đang bày 10 nhóm, phần lớn là vỏ chỉ
để xem hoặc còn trống, và nhiều chữ lộ mã hiệu nội bộ cùng thuật ngữ kỹ thuật. Việc: thu gọn còn
4 nhóm dùng được và viết lại chữ cho tự nhiên. CHỈ sửa file admin-settings.tsx, KHÔNG đụng server,
KHÔNG đổi logic đọc ghi (giữ nguyên useQuery, useMutation, authFetch, các endpoint).

PHẦN A — Thu gọn còn 4 nhóm.
Trong phần render danh sách nhóm:
- GIỮ 4 nhóm: Matrix phần trăm hoa hồng (link), Voucher (link), Auto Rule, Kì lương.
- ẨN (bỏ render) 6 nhóm: Ranking, Vai trò (Role), Ca làm việc (Shift), Tái khám (Recall),
  Nhắc lịch (Reminder Zalo OA), Audit log (Retention).
- Đánh lại số badge của 4 nhóm còn lại theo thứ tự 1, 2, 3, 4.
- Nhóm Kì lương nay là mục cuối, thêm thuộc tính last cho nó (bỏ đường kẻ dưới như các mục cuối khác).
- Xóa luôn các hàm component không còn dùng sau khi ẩn: RankingSection, RoleSection, ShiftSection,
  RecallPlaceholder, ReminderPlaceholder, AuditRetentionSection. Dọn các import giờ không còn dùng
  (ví dụ icon Users, hoặc các thành phần chỉ mấy nhóm đó dùng). Để trình biên dịch báo nếu còn sót.

PHẦN B — Viết lại chữ. Thay đúng từng chuỗi sau (trái sang phải):

Tiêu đề và quyền:
- "10 nhóm cấu hình" -> "Cấu hình"
- "Bạn chỉ có quyền xem. Các thao tác chỉnh sửa được dành riêng cho CEO (R-9-1)."
  -> "Bạn đang ở chế độ xem. Chỉ CEO mới chỉnh sửa được."

Nhóm Matrix hoa hồng:
- title "Matrix %HH" -> "Phần trăm hoa hồng"
- subtitle "8 tier: Sale (M0-M3), TC, Bác sĩ (L1-L3)" -> "Mức hoa hồng theo vai và hạng"

Nhóm Voucher:
- subtitle "Mã giảm giá: kích hoạt, hết hạn, hết lượt" -> "Quản lý mã giảm giá"

Nhóm Auto Rule:
- tiêu đề nhóm "Auto Rule (HH)" -> "Thưởng theo mục tiêu"
- bỏ hẳn nút "+ Thêm rule mới (Phase 2, chờ B-12)"
- "Trigger: cuối tháng, auto sinh adjustment AUTO_PENDING khi đạt target."
  -> "Cuối tháng, nhân viên đạt mục tiêu sẽ được đề xuất thưởng tự động."
- nhãn "Target tháng" -> "Mục tiêu tháng"
- nhãn "Bonus revenue" -> "Thưởng trên doanh số"
- thông báo "Đã lưu Auto Rule" -> "Đã lưu"
- thông báo "Lỗi lưu Auto Rule" -> "Không lưu được, thử lại"
- nút "Lưu Auto Rule" -> "Lưu"
- lỗi "Target phải từ 0-200%" -> "Mục tiêu phải từ 0 đến 200%"
- lỗi "Bonus phải từ 0-50%" -> "Thưởng phải từ 0 đến 50%"

Nhóm Kì lương:
- nhãn nhỏ "Cycle" -> "Chu kỳ trả lương"
- "Edit window 30 ngày · Lock window cứng (R-5-1)" -> "Sau khi chốt lương còn 30 ngày để chỉnh sửa."
- nhãn "Deadline payday (ngày trong tháng)" -> "Ngày chốt lương trong tháng"
- nhãn "Cap warning %HH per đơn" -> "Ngưỡng cảnh báo hoa hồng mỗi đơn"
- hint "0-100, chỉ cảnh báo, không cut HH" -> "0 đến 100, chỉ cảnh báo, không trừ hoa hồng"
- thông báo "Đã lưu Kì lương" -> "Đã lưu"
- thông báo "Lỗi lưu Kì lương" -> "Không lưu được, thử lại"
- nút "Lưu Kì lương" -> "Lưu"
- lỗi "Ngày deadline phải từ 1-28" -> "Ngày chốt phải từ 1 đến 28"
- lỗi "Cap warning phải từ 0-100%" -> "Ngưỡng cảnh báo phải từ 0 đến 100%"

Sau khi thay, tự rà lại toàn file admin-settings.tsx: nếu còn bất kỳ chuỗi nào hiển thị cho người
dùng mà chứa mã hiệu kiểu chữ-số (ví dụ R-9-1, B-12, MS-5), hoặc thuật ngữ Phase 2, webhook,
adjustment, placeholder, mock, thì viết lại cho tự nhiên hoặc bỏ, miễn không đụng tên biến và logic.

KHÔNG LÀM:
- KHÔNG đụng server, không đổi endpoint, không đổi logic useQuery/useMutation/authFetch.
- KHÔNG đụng các màn khác (sẽ rà chữ các màn khác ở mẩu riêng).
- KHÔNG đổi cách hoạt động của 4 nhóm giữ lại, chỉ đổi chữ và ẩn 6 nhóm kia.

KHÔNG LÀM HỎNG:
- Bốn nhóm giữ lại vẫn đọc và lưu được như cũ (Auto Rule và Kì lương vẫn sửa lưu vào database).
- Quyền giữ nguyên: CEO sửa, trưởng ca và kế toán chỉ xem.
- Trình biên dịch sạch.

TEST (báo rõ):
1. npm run check (tsc) sạch.
2. Đăng nhập CEO, mở Cài đặt: chỉ còn 4 nhóm (Phần trăm hoa hồng, Voucher, Thưởng theo mục tiêu,
   Kì lương). Không còn nhóm Ranking, Vai trò, Ca, Tái khám, Nhắc lịch, Audit log.
3. Chữ trong màn không còn mã hiệu (R-9-1, B-12, R-5-1) và không còn thuật ngữ Phase 2, Trigger,
   AUTO_PENDING, Cap warning, Deadline payday, Cycle. Đọc lên thấy tự nhiên như tiếng Việt thường.
4. Sửa và lưu Auto Rule, Kì lương vẫn hoạt động; restart vẫn còn.
5. Đăng nhập trưởng ca hoặc kế toán: xem được 4 nhóm, không sửa được.
6. grep trong admin-settings.tsx không còn "Phase 2", "R-9-1", "B-12", "AUTO_PENDING", "Cap warning",
   "Deadline payday".

TIÊU CHÍ HOÀN THÀNH: màn Cài đặt còn 4 nhóm dùng được, chữ tự nhiên không lộ mã hiệu hay thuật ngữ
kỹ thuật, bốn nhóm vẫn chạy như cũ, biên dịch sạch. Báo lại kết quả test.
```

---

Xong việc này là khép phần Settings. Anh chạy xong dán kết quả, em đọc lại chữ trong file để bắt
chỗ nào còn sót giọng máy móc. Còn chuyện "nhiều chỗ viết như AI" ở các màn khác, em đề xuất làm
một mẩu riêng rà chữ toàn app sau khi xong đợt 3, vì nó rải khắp nơi chứ không chỉ màn Cài đặt.
