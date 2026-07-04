# B2.3 Edge Case Scenarios

Status: WIP draft 1
Ngày: 2026-04-28
Phụ thuộc: B1 FINAL vòng 12, B2.1 personas, B2.2 BPMN v2, ADR-001 shift architecture J

Mục đích: Dựng 13 kịch bản edge case end-to-end + 1 section technical edge cases. Mỗi kịch bản có số liệu cụ thể để verify business rule và state machine.

Convention:
- `[CHỜ ISOFT]`, `[CHỜ ANH CHỐT]`, `[GIẢ ĐỊNH]`: xem PENDING-ITEMS.md
- `[FINDING-X]`: vấn đề phát sinh khi dựng kịch bản, cần resolve

---

## 0. Setup chung cho mọi scenario

### 0.1 Nhân vật

| ID | Vai | Ranking | %HH role |
|---|---|---|---|
| Lan | ĐD-Sale | M2 (mid) | Sale 3% (1 role duy nhất) |
| Hằng | ĐD-Sale | M1 (junior) | Sale 2% (1 role duy nhất) |
| Trang | ĐD-Sale | M0 (mới) | Sale 1% (1 role duy nhất) |
| Hà | Trưởng ca | (TC không có ranking) | TC 2% |
| Diễm | Kế toán + KT trưởng | - | **Không HH** (lương cứng) |
| Nguyên | CEO | - | **Không HH** (ăn lợi nhuận) |
| Minh | BS nội | Level 2 | BS 5% |
| Hằng-D | BS phụ khoa | Level 1 | BS 3% |
| Vinh | BS xét nghiệm | Level 2 | BS 5% |

%HH là [GIẢ ĐỊNH GĐ-6]. Số thật anh chốt sau.

**Chốt vòng 13 (28/04/2026)**: KT và CEO KHÔNG có HH theo đơn. OrderRoleAssignment chỉ populate Sale + TC tại CONFIRMED. BS thêm khi exam_started.

### 0.2 Công thức HH (làm rõ từ vòng 12)

**Chốt vòng 13 (28/04/2026)**: F-1 RESOLVED. Formula B1 vòng 9 là chuẩn, không tách:

```
total_paid = total_listed - insurance_amount - voucher_amount
   (BH và voucher đều trừ khỏi total_paid)

net_profit = total_paid - total_cost
   (cost của các item completed, item skipped không tính)

HH per row = max(net_profit, 0) × %HH(role, ranking_snapshot)
   (nếu net_profit âm → HH = 0, không có clawback)

Tổng chi HH đơn = Σ HH các row active của Sale + TC + BS
   (KT và CEO không có row, không tính HH)
```

Voucher trừ khỏi base HH như BH. NV không bị penalty trực tiếp do NP áp voucher, nhưng HH chia ra ít hơn theo doanh thu thực.

### 0.3 Cap 10% (App không enforce)

Mọi scenario sau hiển thị `tổng HH / hh_net_profit` để check vượt cap.

---

## 1. Scenario: Huỷ đơn trước khám

### 1A. Huỷ trước xác nhận (DRAFT → CANCELLED)

Bối cảnh: Khách K-101 đặt website lúc 14h. Lan nhận lead, chưa kịp gọi xác nhận thì khách Zalo "huỷ luôn".

Tiền điều kiện: Order O-101 ở DRAFT. Chưa có OrderRoleAssignment, chưa có CR.

Timeline:
- T0: Lan bấm "Huỷ đơn" trong app HH
- T0+1s: Order DRAFT → CANCELLED. Cancel any scheduled reminder.
- Không có CR sinh ra (vì chưa CONFIRMED).

Số liệu HH: 0 cho mọi role.

Touchpoint: 1 click "Huỷ" của Lan.

Risk/Open Q: Có cần ghi audit log lý do huỷ không? Đề xuất Có (để CEO review xem có pattern khách hủy nhiều không).

### 1B. Huỷ sau xác nhận (CONFIRMED → CANCELLED)

Bối cảnh: Khách K-102 đã xác nhận lịch khám 1tr (khám tổng quát + xét nghiệm máu). 1 ngày trước hẹn, khách báo huỷ vì có việc đột xuất.

Tiền điều kiện: Order O-102 CONFIRMED. OrderRoleAssignment có 2 row: Sale=Lan, TC=Hà. 2 CR TAM_TINH. (KT và CEO không có row vì không HH.)

Timeline:
- T-1d (khoảng 24h trước hẹn): Khách Zalo huỷ
- Lan vào app, mở đơn, bấm "Huỷ + lý do = khách bận"
- Order CONFIRMED → CANCELLED
- 4 CR TAM_TINH → CANCEL
- Cancel scheduled reminders (T-2h, T+15p, T+30p)
- Audit log

Số liệu HH: 0 cho mọi role.

Touchpoint: Lan 1 click huỷ + nhập lý do.

Risk/Open Q:
- Có cần policy đếm số lần khách huỷ không? Khách huỷ > 3 lần/năm có nên block?
- Defer business policy, không phải scope dev.

---

## 2. Scenario: No-show

Bối cảnh: Đơn O-103 = khám tổng quát 600k, BH 0, voucher 0. Khách K-103 hẹn 9h. 9:15 chưa đến, không bắt máy 3 cuộc Lan gọi.

Tiền điều kiện: Order CONFIRMED. 2 CR TAM_TINH (Sale Lan + TC Hà).

Timeline:
- T0 9:00: Giờ hẹn
- T0+15p (9:15): App HH push notify Lan "Khách K-103 chưa đến, gọi nhắc". NotificationLog `manual_call` scheduled.
- 9:15-9:25: Lan gọi 3 lần, không bắt máy. Lan ghi note "không bắt máy" vào NotificationLog.
- T0+30p (9:30): Cron cron job auto:
  - Order CONFIRMED → NO_SHOW
  - 2 CR TAM_TINH → CANCEL
  - Cancel pending reminders

Số liệu HH: 0 cho mọi role.

Touchpoint: Lan 3 cuộc gọi + 1 note. Auto cron không cần ai bấm.

Risk/Open Q:
- Edge case: Khách đến lúc 9:35 (sau auto NO_SHOW). Lễ tân làm gì? Tạo đơn mới hay revert NO_SHOW?
- Đề xuất: Tạo đơn mới (đơn O-103 đã NO_SHOW, không revert). Đơn mới sinh từ iHOS với customer cũ. CR mới TAM_TINH.
- Cần verify trong B5 spec màn lễ tân.

---

## 3. Scenario: Refund toàn phần sau payday

Bối cảnh: Đơn O-104 = thủ thuật phụ khoa 2tr, BH 0, voucher 0. Khách trả 2tr. cost 1tr → hh_net_profit = 1tr.

Lan tạo đơn, BS Hằng-D thực hiện thủ thuật. Đơn COMPLETED ngày 25/3.

Số liệu HH gốc:

| Role | User | %HH | HH = 1tr × % |
|---|---|---|---|
| Sale | Lan (M2) | 3% | 30k |
| TC | Hà | 2% | 20k |
| BS | Hằng-D (L1) | 3% | 30k |
| Tổng | | 8% | 80k |

`Tổng / net_profit = 80k / 1tr = 8%` → KHÔNG vượt cap 10%.

Timeline pay cycle March:
- 25/3: Order COMPLETED, 3 CR CHO_DUYET
- 28/3: Diễm duyệt 3 CR → DUOC_DUYET
- 5/4: Pay slip March chi 80k cho 3 user (Lan, Hà, Hằng-D)

Timeline refund:
- 20/4 (T+15 sau payday): Khách báo "thủ thuật không hiệu quả, yêu cầu refund". NP đồng ý refund 100%.
- Lễ tân làm refund trong iHOS → iHOS webhook `order.refunded` (full)
- Order COMPLETED → REFUND_FULL
- 3 CR DUOC_DUYET → CLAWBACK_PENDING
- App HH tạo 3 CR delta âm:

| Role | User | Delta | salary_cycle_id |
|---|---|---|---|
| Sale | Lan | -30k | April |
| TC | Hà | -20k | April |
| BS | Hằng-D | -30k | April |

- 5/5: Pay slip April: lương cứng + HH April - 80k clawback (3 dòng riêng "Clawback đơn O-104")

Touchpoint:
- Lễ tân: thao tác trong iHOS (out of scope app HH)
- Diễm: review CR delta âm trên màn HH April, duyệt batch
- 5 user bị clawback: thấy dòng "Clawback đơn O-104" trên pay slip April

Risk/Open Q:
- Nếu user bị clawback nghỉ việc trước April: B1 đã chốt "đã ghi nhận, chi theo Luật Lao động VN trong 14 ngày". Clawback xử lý sao?
- Defer policy: NP đòi lại trực tiếp ngoài lương, không phải scope dev.

---

## 4. Scenario: Refund 1 phần

Bối cảnh: Đơn O-105 = 3 dịch vụ:
- A khám nội 500k (cost 200k), BS Minh
- B siêu âm 300k (cost 100k), BS Hằng-D
- C xét nghiệm máu 200k (cost 50k), BS Vinh

Total: total_listed = 1tr, total_cost = 350k, total_paid = 1tr, net_profit = 650k.

Số liệu HH gốc:

| Role | User | %HH | HH = 650k × % |
|---|---|---|---|
| Sale | Lan (M2) | 3% | 19.5k |
| TC | Hà | 2% | 13k |
| BS | Minh (L2) | 5% | 32.5k |
| BS | Hằng-D (L1) | 3% | 19.5k |
| BS | Vinh (L2) | 5% | 32.5k |
| Tổng | | 18% | 117k |

`Tổng / net_profit = 117k / 650k = 18%` → vượt cap 10% (3 BS multi).

Đã DUOC_DUYET, đã chi pay slip March.

Timeline refund:
- 15/4 (T+10 sau payday): Khách phàn nàn "siêu âm sai chỉ định". NP refund dịch vụ B (300k).
- iHOS webhook `order.refunded` (partial, item_id=B, refund_amount=300k)
- Order → REFUND_PARTIAL
- App HH:
  - OrderItem B: refunded=true, refund_amount=300k
  - new total_paid = 1tr - 300k = 700k
  - new total_cost = 350k - 100k = 250k (loại cost B)
  - new net_profit = 700k - 250k = 450k

Số liệu HH mới:

| Role | User | %HH | HH mới = 450k × % | Delta |
|---|---|---|---|---|
| Sale | Lan | 3% | 13.5k | -6k |
| TC | Hà | 2% | 9k | -4k |
| BS | Minh | 5% | 22.5k | -10k |
| BS | Hằng-D | 3% | 13.5k | -6k |
| BS | Vinh | 5% | 22.5k | -10k |
| Tổng | | | 81k | **-36k** |

April pay slip: 5 dòng clawback delta tổng -36k.

[FINDING-2]: BS Hằng-D bị clawback 6k dù dịch vụ của Hằng-D (B) là dịch vụ bị refund. BS Minh và BS Vinh cũng bị clawback dù dịch vụ A và C của họ vẫn ổn. Điều này đúng theo formula (base HH thay đổi → mọi role recompute), nhưng có thể gây dispute từ Minh/Vinh.

Resolution đề xuất:
- Option A (current): Recompute tất cả role (theo formula). Đơn giản, ai cũng share gain/pain.
- Option B: Chỉ recompute role liên quan dịch vụ refund (BS Hằng-D). Phức tạp hơn, cần track per-item attribution.
- Recommend Option A cho MVP. NV được giải thích "đơn ai cũng góp phần, refund ai cũng share".

Touchpoint: Diễm review CR delta, duyệt batch April.

Risk/Open Q:
- Khách refund 1 phần nhiều lần (refund B hôm nay, refund C tuần sau): tạo 2 lần delta? Đề xuất Có, mỗi lần refund tạo delta riêng.

---

## 5. Scenario: Voucher application

### 5A. Voucher đơn không có BH

Bối cảnh: Đơn O-106 = khám tổng quát 1tr. Voucher 100k (CEO tạo cho khách thân thiết). Khách trả 900k. cost 400k.

Số liệu (formula B1 vòng 9 chuẩn, voucher trừ):
- total_listed = 1tr
- insurance_amount = 0
- voucher_amount = 100k
- total_paid = 1tr - 0 - 100k = 900k
- net_profit = 900k - 400k = 500k

HH:

| Role | User | %HH | HH = 500k × % |
|---|---|---|---|
| Sale | Lan | 3% | 15k |
| TC | Hà | 2% | 10k |
| BS | Minh | 5% | 25k |
| Tổng | | 10% | 50k |

`Tổng HH / net_profit = 50k / 500k = 10%` → đúng cap.

Touchpoint: TC Hà tạo voucher trước khi đơn tạo. Khi NV chọn voucher trong iHOS (giả định), iHOS gửi `voucher_amount=100k` trong order payload.

### 5B. Voucher đơn có BH (edge case)

Bối cảnh: Đơn O-107 = thủ thuật 1tr. BH 700k (BHYT chi trả). Voucher 100k (TC tạo cho khách BH). Khách trả 200k. Cost 300k.

Số liệu (formula B1 vòng 9 chuẩn):
- total_listed = 1tr
- insurance_amount = 700k
- voucher_amount = 100k
- total_paid = 1tr - 700k - 100k = 200k
- net_profit = 200k - 300k = **-100k** (âm)
- HH = max(net_profit, 0) × %HH = **0** cho mọi role

Trường hợp này: NP đang LỖ trên đơn (200k thu - 300k cost = -100k). NV không có HH.

Edge case: NP cố tình bán dưới giá vốn (loss-leader marketing). Đây là chiến lược kinh doanh, không phải effort của NV. Không HH là hợp lý.

Risk/Open Q:
- TC tạo voucher cho người nhà mình: anti-abuse. CEO phải duyệt voucher trên 50k? Defer policy.
- Net_profit âm có nên alert CEO không? Đề xuất Có (filter "đơn lỗ" trong dashboard CEO).

---

## 6. Scenario: Handover NV nghỉ việc

Bối cảnh: ĐD-Sale Lan nghỉ việc cuối tháng 3. Có 5 đơn pending của Lan tại 1/3/2026:
- O-110 CONFIRMED, lịch khám 5/3 (chưa khám)
- O-111 IN_PROGRESS, đang khám
- O-112 COMPLETED, CR CHO_DUYET
- O-113 COMPLETED, CR DUOC_DUYET, đã pay slip Feb
- O-114 DRAFT, chưa xác nhận

Timeline:
- 25/2: CEO Nguyên mark Lan "sắp nghỉ", ngày nghỉ = 31/3
- 25/2: Lan thấy banner "Bàn giao công việc" trên trang chủ app HH
- 26/2: Lan vào màn bàn giao, list 5 đơn pending. Lan chọn Hằng nhận tất cả (giả định)
- App HH xử lý:

| Đơn | Trước | Sau bàn giao |
|---|---|---|
| O-110 CONFIRMED | row Sale=Lan active, CR TAM_TINH cho Lan | row Sale=Lan ended_at=26/2, row Sale=Hằng assigned_at=26/2 với ranking_snapshot=M1. CR Lan cancel, CR Hằng TAM_TINH mới. |
| O-111 IN_PROGRESS | row Sale=Lan active, CR TAM_TINH | Same as O-110 (handover trong khi đang IN_PROGRESS) |
| O-112 COMPLETED CHO_DUYET | row Sale=Lan, CR CHO_DUYET | **Giữ Sale=Lan** (B1 chốt: HH chi cho Lan, đã hoàn thành). CR CHO_DUYET → DUOC_DUYET → pay slip March cho Lan. |
| O-113 COMPLETED DUOC_DUYET đã chi | - | Không thay đổi, đã chi xong |
| O-114 DRAFT | Chưa có row | Lan có thể huỷ DRAFT hoặc bàn giao cho Hằng (chưa CONFIRMED → row chưa populate, đơn handover sang Hằng tự ấn xác nhận) |

Số liệu (đơn O-110, giả sử khám hoàn thành 10/3, net_profit = 500k):

Trước handover:
- Row Sale=Lan ranking_snapshot=M2 (3%)
- HH = 500k × 3% = 15k cho Lan

Sau handover (26/2 → khám 10/3):
- Row Sale=Lan ended_at=26/2 (HH cho Lan = 0 vì cancel CR)
- Row Sale=Hằng assigned_at=26/2 ranking_snapshot=M1 (2%)
- HH = 500k × 2% = 10k cho Hằng

[FINDING-4]: Hằng ở M1 (junior), %HH thấp hơn Lan M2. Đơn handover từ Lan → Hằng → tổng HH chi của NP giảm 5k. Đây là feature, không phải bug. Nhưng Hằng có cảm giác "đơn ngon nhưng %HH thấp". Cần training.

Risk/Open Q:
- O-111 đang IN_PROGRESS giữa chừng, có nên handover không? Có thể gây confuse (BS hỏi "ai là Sale của đơn này?"). Đề xuất Có, vì policy clean cho NV nghỉ.
- Nếu Lan đột ngột nghỉ không bàn giao (sa thải): Force handover của TC. Đã chốt B1 section 20.

Touchpoint:
- CEO Nguyên 1 click mark "sắp nghỉ"
- Lan vào màn bàn giao, chọn từng đơn + người nhận
- Hằng nhận notification, thấy đơn mới trong list

---

## 7. Scenario: BH delay 3-4 tháng

Bối cảnh: Đơn O-120 thủ thuật 2tr, BH 1.5tr (BHYT), khách trả 500k. cost 200k (giả định cost thấp vì BH cover phần lớn vật tư).

- total_listed = 2tr
- insurance_amount = 1.5tr
- voucher_amount = 0
- total_paid = 500k
- net_profit = 500k - 200k = 300k

HH:

| Role | User | %HH | HH = 300k × % |
|---|---|---|---|
| Sale | Hằng | 2% | 6k |
| TC | Hà | 2% | 6k |
| BS | Minh | 5% | 15k |
| Tổng | | 9% | 27k |

Timeline:
- 5/3: Đơn COMPLETED, CR CHO_DUYET
- 30/3: Diễm duyệt → DUOC_DUYET
- 5/4: Pay slip March chi 27k cho 3 user

3-4 tháng sau:
- 15/7 (130 ngày sau): BHYT chuyển 1.5tr về NP
- App HH **KHÔNG** sinh CR mới (B1 chốt: BH thanh toán không phát sinh HH thêm vì NV đã ăn HH trên out-of-pocket rồi, BH là tiền NP nhận sau cho doanh thu đã ghi nhận)
- Kế toán Diễm ghi nhận doanh thu trên Misa (out of scope app HH)

Edge case: BHYT từ chối thanh toán
- 20/7: BHYT báo "không cover dịch vụ này", từ chối thanh toán 1.5tr
- App HH xử lý sao? B1 chưa nói rõ.

[FINDING-5]: BH bị reject, NP có 2 lựa chọn:
- Option A: NP gánh 1.5tr (cost của out-of-pocket khách đã trả 500k cover). HH không thay đổi.
- Option B: Đòi khách trả thêm 1.5tr. Nếu khách trả: HH recompute với hh_base_revenue = 2tr (không trừ BH nữa). Tạo CR delta dương cho 5 user.
- Option C: NP write-off 1.5tr. HH không thay đổi.

Recommend defer policy: business decision của NP, không phải scope dev. Nhưng cần track BH status (PaymentStatus = paid/rejected/pending) trong InsuranceClaim.

Touchpoint: Diễm nhận thông báo từ BHYT, ghi vào Misa. App HH chỉ track InsuranceClaim status.

Risk/Open Q:
- InsuranceClaim entity đã có trong B1 section 15. Verify lifecycle khi ánh BH reject.

---

## 8. Scenario: Adjustment edit sau payday

Đã cover trong B2.2 Section 3.4. Tóm tắt:

- 3/3: Diễm tạo Adjustment X = -200k cho Lan, lý do "tư vấn sai gói khách KH-200"
- 4/3: CEO Nguyên duyệt → APPROVED
- 5/3: Pay slip March: Lan + lương + HH - 200k
- 20/3 (15 ngày sau payday, vẫn trong window 30 ngày): Diễm phát hiện sai số tiền, X phải là -300k
- Diễm edit X: 200k → 300k
- App HH:
  - Adjustment X status: APPROVED → EDITED
  - Tạo CR clawback delta = -300k - (-200k) = -100k, salary_cycle_id = April
- 5/4: Pay slip April: Lan + lương + HH - 100k (dòng "Điều chỉnh kì trước O-X")
- 4/4 (30 ngày sau payday March 5): X chuyển EDITED → LOCKED

Số liệu cumulative:
- Lan total adjustment 2 kì: -200k (March) + -100k (April) = -300k
- Match số đúng Diễm muốn.

Risk/Open Q:
- Diễm edit X nhiều lần trong 30 ngày: cumulative delta hay reset? Đề xuất cumulative (mỗi edit tạo delta mới).
- Edge case: Diễm edit X từ -200k → +500k (đổi từ phạt sang thưởng): delta = +500k - (-200k) = +700k. Check rule này có hợp lý không.

---

## 9. Scenario MỚI: CR reject + khiếu nại + revert flow

Bối cảnh: Đơn O-130 = khám tổng quát 800k, đã COMPLETED 28/3. Lan là Sale. Diễm review thấy khách đã phàn nàn về Lan trên Zalo (NP có ghi chú trong CRM). Diễm quyết định reject HH role Sale của Lan.

Tiền điều kiện:
- Order COMPLETED
- 3 CR CHO_DUYET (Sale Lan, TC Hà, BS Minh)
- net_profit = 400k
- HH Lan = 400k × 3% = 12k

Timeline:
- 1/4: Diễm mở app HH, review đơn O-130
- Diễm bấm "Reject HH role Sale", nhập lý do "Khách phàn nàn tư vấn sai, ghi nhận trong Zalo nhóm 28/3"
- CR Sale Lan: CHO_DUYET → TU_CHOI
- 2 CR còn lại (TC, BS) Diễm duyệt bình thường: CHO_DUYET → DUOC_DUYET
- Lan nhận notification "HH đơn O-130 bị từ chối, lý do: ..."

Khiếu nại window 3 ngày:
- 2/4: Lan khiếu nại trong app, đính kèm screenshot Zalo "Em đã refund cho khách rồi, NP không mất doanh thu"
- CR Sale Lan: TU_CHOI → KHIEU_NAI
- Diễm nhận notification

- 3/4: Diễm review khiếu nại
  - Option A: Diễm giữ reject. CR KHIEU_NAI → TU_CHOI. Lan không có cơ hội revert nữa.
  - Option B: Diễm revert. CR KHIEU_NAI → CHO_DUYET. Diễm duyệt lại → DUOC_DUYET.

Số liệu sau:
- Nếu Option A: 2 user (TC, BS) chi pay slip March. Lan KHÔNG có 12k.
- Nếu Option B: 3 user chi pay slip March. Lan có 12k.

Sau kì lương kế tiếp (5/5):
- TU_CHOI vĩnh viễn lock. Không revert được dù Lan tìm thêm bằng chứng.

Touchpoint:
- Diễm: bấm reject + nhập lý do (1 màn)
- Lan: bấm khiếu nại + đính kèm (1 màn)
- Diễm: review khiếu nại (1 màn)

Risk/Open Q:
- Reject role Sale của Lan nhưng giữ HH cho 2 role khác: có làm pay slip phức tạp không? Đề xuất pay slip vẫn liệt kê đơn O-130 với 2 role được duyệt + dòng note "Sale role rejected".
- Có nên cho NV khiếu nại nhiều lần không? Đề xuất: 1 lần khiếu nại / 1 reject. Sau khi Diễm review xong, không khiếu nại lại.

---

## 10. Scenario MỚI: Đơn cross-month (kì lương edge)

Bối cảnh: Đơn O-140 tạo 30/3 lúc 18h, lịch khám 1/4 lúc 9h. Khám hoàn thành 1/4 lúc 11h.

Tiền điều kiện: B1 chốt "đơn thuộc kì theo ngày tạo đơn" → đơn này thuộc kì March.

Timeline:
- 30/3 18h: Lan tạo đơn, bấm "Đã xác nhận". Order CONFIRMED. salary_cycle_id = March.
- 1/4 9h: Khách checkin → Order IN_PROGRESS
- 1/4 11h: Khám xong → Order COMPLETED. 3 CR CHO_DUYET (Sale, TC, BS).

Pay cycle March chốt deadline 5/4:
- Đến 5/4: Đơn O-140 đã COMPLETED và CR CHO_DUYET (kịp duyệt)
- Diễm duyệt → DUOC_DUYET → vào pay slip March 5/4

Edge case: Nếu khám delay sang sau 5/4:
- 1/4: Khách hẹn lại sang 6/4
- 5/4: Pay slip March chốt. Đơn O-140 vẫn ở CONFIRMED (chưa COMPLETED), CR vẫn ở TAM_TINH.
- Đơn O-140 thuộc kì March nhưng HH chưa CHO_DUYET → KHÔNG vào pay slip March.

[FINDING-6]: Khi nào HH đơn cross-month vào pay slip nào?
- Option A (theo ngày tạo, B1 chốt): Đơn thuộc kì March. Nếu COMPLETED muộn (sau payday March), HH vào pay slip March kì sau (tháng April mới chi).
- Option B (theo ngày COMPLETED): Đơn thuộc kì April vì COMPLETED 6/4.
- Option C (theo ngày DUOC_DUYET): Đơn thuộc kì khi Diễm duyệt.

B1 chốt Option A. Hệ quả: Lan nhận HH đơn March CHẬM 1 tháng (vào pay slip April với note "kì March chốt muộn").

Số liệu (giả định): net_profit = 400k, Lan ăn 12k.
- 5/4: pay slip March chi cho Lan KHÔNG bao gồm 12k này
- 5/5: pay slip April chi cho Lan: lương cứng + HH April + 12k (note "đơn O-140 kì March")

Risk/Open Q:
- Lan có thể hiểu nhầm "tại sao tháng March có đơn này mà nay 5/5 mới được chi"? Cần UI rõ ràng + training NV.
- Đề xuất pay slip có cột "Kì gốc" để hiển thị đơn thuộc kì nào.

Touchpoint: Cron job ngày 5 hàng tháng pick up CR CHO_DUYET → DUOC_DUYET của các kì trước.

---

## 11. Scenario MỚI: Ranking change giữa kì

Bối cảnh: NV Lan đang ranking M2 (3% Sale). Quý 1 (Jan-Mar) Lan đạt target 110%, được CEO promote M3 (4% Sale) vào 15/3.

Đơn liên quan:
- O-150 tạo 10/3 (Lan ở M2): net_profit = 500k → HH = 500k × 3% = 15k
- O-151 tạo 20/3 (Lan ở M3): net_profit = 600k → HH = 600k × 4% = 24k

Timeline:
- 10/3: O-150 CONFIRMED, snapshot ranking = M2 cho row Sale Lan
- 15/3: CEO promote Lan → M3 trong Settings. Lan.ranking_id = M3 (current).
- 20/3: O-151 CONFIRMED, snapshot ranking = M3 cho row Sale Lan
- 25/3: O-150 COMPLETED → CR CHO_DUYET với pct_at_time = 3% (snapshot)
- 30/3: O-151 COMPLETED → CR CHO_DUYET với pct_at_time = 4%
- 5/4: Pay slip March:
  - O-150: HH 15k (theo M2 cũ)
  - O-151: HH 24k (theo M3 mới)
  - Total HH Lan March = 39k

Verification: Snapshot pattern hoạt động đúng. Đơn cũ giữ %HH cũ, đơn mới ăn %HH mới.

[FINDING-7]: Edge case ranking demote (M3 → M2 vì performance kém):
- Đơn O-152 tạo 5/4 (Lan ở M3): nếu CEO demote 15/4, đơn O-152 vẫn ăn M3 (snapshot).
- Đơn O-153 tạo 20/4 (Lan đã M2): ăn M2.
- Match logic snapshot. Không edge case.

Risk/Open Q:
- Ranking promote/demote có thông báo cho NV không? Đề xuất Có (notify rõ %HH mới).
- Quy tắc reset cứng quý của ranking (B1 chốt) có conflict với demote giữa quý không? Đề xuất defer.

---

## 12. Scenario MỚI: Đa BS trong 1 đơn vượt cap 10%

Đã cover số liệu trong Scenario 4 (3 BS = 21% net_profit). Mở rộng:

Bối cảnh: Đơn O-160 phức tạp:
- Khám nội (BS Minh L2): 500k cost 200k
- Khám phụ khoa (BS Hằng-D L1): 400k cost 150k
- Siêu âm (BS Vinh L2): 300k cost 100k
- Xét nghiệm máu (BS Vinh L2): 200k cost 50k

Total: total_listed = 1.4tr, total_cost = 500k, net_profit = 900k.

OrderRoleAssignment: 3 row BS active (Minh, Hằng-D, Vinh - mỗi BS 1 row, dù Vinh làm 2 dịch vụ) + Sale Lan + TC Hà.

Số liệu HH:

| Role | User | %HH | HH = 900k × % |
|---|---|---|---|
| Sale | Lan | 3% | 27k |
| TC | Hà | 2% | 18k |
| BS | Minh | 5% | 45k |
| BS | Hằng-D | 3% | 27k |
| BS | Vinh | 5% | 45k |
| Tổng | | 18% | 162k |

`Tổng / net_profit = 162k / 900k = 18%` → **vượt cap 10% gần gấp đôi**.

App HH:
- Hiển thị icon cảnh báo trên chi tiết đơn
- Filter "Đơn vượt trần 10%" của Diễm sẽ catch đơn này
- KHÔNG block duyệt (App không enforce)

CEO action:
- Review đơn này, quyết định:
  - Option A: Duyệt full 162k (đơn phức tạp đáng có nhiều người ăn HH)
  - Option B: Adjust giảm bớt HH 1 BS (vd Vinh làm 2 dịch vụ đơn giản, giảm xuống 3%)
  - Option C: Adjust giảm hằng số (cap thật 90k = 10%)

Touchpoint:
- Diễm: filter đơn vượt cap, gửi list cho CEO
- CEO: review, nói tay với Diễm
- Diễm: tạo Adjustment cho user cụ thể

[FINDING-8]: Cap 10% gặp khó khi đơn thực sự cần nhiều người tham gia. CEO có thể adjust nhưng tốn thời gian. Có nên tạo Adjustment auto rule "cap excess" không?
- Đề xuất defer: MVP để CEO manual quyết. Sau 6 tháng có data, cân nhắc auto rule.

Risk/Open Q:
- Vinh làm 2 dịch vụ chỉ ăn HH cho 1 row BS (5% × 900k = 45k). Có công bằng không? B1 chốt: 1 BS = 1 row, không phân biệt làm bao nhiêu dịch vụ. Vinh chỉ ăn 1 lần %HH dù làm 2 dịch vụ.

---

## 13. Scenario MỚI: Khách bỏ về giữa khám

Bối cảnh: Đơn O-170 = 3 dịch vụ:
- A khám nội 500k cost 200k (BS Minh)
- B siêu âm 300k cost 100k (BS Hằng-D)
- C xét nghiệm 200k cost 50k (BS Vinh)

Total: 1tr, cost 350k, net_profit dự tính = 650k.

Timeline:
- 8h00: Khách checkin → IN_PROGRESS
- 8h05: BS Minh bắt đầu khám A → iHOS webhook `order.exam_started` cho BS Minh → App HH thêm row BS Minh vào OrderRoleAssignment
- 8h10: BS Minh khám A xong. OrderItem A status: planned → completed.
- 8h25: BS Hằng-D bắt đầu siêu âm B → iHOS webhook `order.exam_started` cho BS Hằng-D → App HH thêm row BS Hằng-D
- 8h30: Khách bị đau bụng đột ngột, xin phép về sớm.
- 8h35: Khách bỏ về. OrderItem B (đang dở) và C (chưa làm) → status = skipped, skipped_reason = customer_left.
- BS Vinh CHƯA bắt đầu C → KHÔNG có exam_started cho Vinh → KHÔNG có row Vinh
- BS sign-off đơn trong iHOS. iHOS webhook `order.completed`.
- App HH:
  - OrderItem A: completed
  - OrderItem B, C: skipped
  - Recompute total_paid: chỉ tính item completed = 500k
  - Recompute total_cost: chỉ cost của A = 200k
  - net_profit = 500k - 200k = 300k

OrderRoleAssignment active:
- Sale = Lan (add at CONFIRMED)
- TC = Hà (add at CONFIRMED)
- BS = Minh (add khi exam_started fire cho Minh)
- BS = Hằng-D (add khi exam_started fire cho Hằng-D, **giữ row dù item B skipped**)

Số liệu HH:

| Role | User | %HH | HH = 300k × % |
|---|---|---|---|
| Sale | Lan | 3% | 9k |
| TC | Hà | 2% | 6k |
| BS | Minh | 5% | 15k |
| BS | Hằng-D | 3% | 9k |
| Tổng | | 13% | 39k |

**Lưu ý quan trọng (chốt vòng 13)**: BS Hằng-D vẫn có row dù item B skipped. Logic per-doctor: row được thêm khi BS engage đơn (exam_started), không phải khi item completed. Hằng-D ăn full %HH × net_profit = 9k. Đây là "loss gián tiếp" cho Hằng-D vì net_profit thấp do item B skipped, nhưng Hằng-D không bị xóa khỏi danh sách hưởng HH.

Nếu sau này NP muốn penalty BS không hoàn thành dịch vụ: dùng manual Adjustment hoặc Auto Penalty rule (defer B-12).

Khách thanh toán: chỉ trả 500k (cho A đã hoàn thành). Lễ tân handle trong iHOS.

Touchpoint:
- BS Minh, Hằng-D: ghi nhận khách bỏ về trong iHOS
- BS Hằng-D: mark item B = skipped (lý do customer_left)
- Lễ tân: thu tiền 500k, refund 500k đã ứng (nếu có)

Risk/Open Q:
- Khách quay lại sau (vd 10h cùng ngày, đỡ đau): tạo đơn mới cho phần còn lại (B+C) hay revert đơn cũ? Đề xuất tạo đơn mới (đơn cũ đã COMPLETED).

---

## 14. Section: Technical Edge Cases

### 14.1 Webhook fail (iHOS gửi không tới App HH)

Scenario: Order COMPLETED ở iHOS 10h, webhook gửi App HH bị network down. App HH không nhận event.

Hậu quả:
- Order vẫn ở IN_PROGRESS trong App HH
- CR vẫn TAM_TINH
- Diễm không thấy đơn để duyệt
- Đến payday HH thiếu

Recovery:
- App HH có endpoint admin "Replay webhook" (B1 chốt)
- Diễm hoặc dev manually trigger replay với event_id của iHOS
- Hoặc: cron job đối soát mỗi đêm, query iHOS API order list, compare với app HH database, alert nếu inconsistency

Severity: HIGH (impact business). Cần monitoring + alert.

### 14.2 Webhook duplicate (iHOS gửi 2 lần)

Scenario: iHOS retry policy gửi event order.completed 2 lần (lần 1 timeout).

Hậu quả nếu không idempotent:
- 2 CR CHO_DUYET cho cùng đơn (duplicate)
- Diễm duyệt → 2 record, double pay HH

Mitigation: B1 chốt "Mọi webhook có event_id duy nhất, lưu idempotency key". App HH check event_id, skip nếu đã processed.

Severity: HIGH (risk double pay). Idempotency check là bắt buộc.

### 14.3 Webhook out-of-order

Scenario: Network có jitter, App HH nhận order.completed (12:00 sent) trước order.exam_started (11:50 sent).

Hậu quả:
- App HH muốn add row BS vào OrderRoleAssignment (từ order.exam_started) nhưng đơn đã COMPLETED → state machine reject?

Mitigation:
- Option A: App HH dùng event timestamp để decide order, không phải arrival order. Process event theo timestamp order.
- Option B: State machine permissive: cho phép add row BS sau COMPLETED nếu timestamp event hợp lệ.
- Recommend Option B (đơn giản hơn). Add audit log "late event processed".

Severity: MEDIUM. Hiếm gặp với network ổn định.

### 14.4 Auto rule fire lifecycle

Scenario: Rule "thưởng đạt target tháng" fire vào 1/4 (sau khi pay slip March chốt 5/4). Rule fire chuẩn nhưng adjustment chưa được CEO duyệt → có ghi vào pay slip không?

Mitigation:
- Auto rule fire → AdjustmentRequest status = AUTO_PENDING
- AUTO_PENDING KHÔNG vào pay slip cho đến khi CEO duyệt → APPROVED
- Pay slip chỉ pick adjustment APPROVED

Verification: Nếu CEO không duyệt kịp 5/4, auto rule cho March vào pay slip nào?
- Đề xuất: pay slip kì kế (April) với note "rule March". Tương tự cross-month.

Severity: MEDIUM. Phụ thuộc CEO discipline duyệt timely.

### 14.5 Optimistic lock conflict

Scenario: Lan và Hà cùng edit đơn O-180 (vd update note). Lan save trước, Hà save sau.

Mitigation: B1 chốt "optimistic lock với version number trên Order". Hà save bị reject với error "đơn đã được update bởi user khác", phải reload và edit lại.

Severity: LOW. Hiếm gặp, có UX clear.

---

## 15. Findings tổng hợp (resolved 28/04/2026)

| ID | Finding | Severity | Status |
|---|---|---|---|
| F-1 | Formula HH | HIGH | **RESOLVED**: Giữ formula B1 vòng 9 chuẩn (`net_profit = total_paid - total_cost`, voucher trừ). REVERT chốt vòng 10 VĐ-8 Option A. |
| F-2 | Refund 1 phần recompute mọi role | MEDIUM | **RESOLVED**: Option A (recompute all). |
| F-3 | Cost share khi đơn có cả BH và voucher | MEDIUM | **RESOLVED**: Theo formula F-1, không phân bổ proportional. net_profit có thể âm → HH = 0. |
| F-4 | Handover ranking demote | LOW | OK feature, training NV. |
| F-5 | BH bị reject sau 3-4 tháng | MEDIUM | Defer policy decision của NP. App HH track InsuranceClaim status. |
| F-6 | Cross-month đơn HH vào pay slip kì sau với note kì gốc | MEDIUM | UI thêm cột "Kì gốc" ở pay slip. |
| F-7 | Ranking demote không edge case | - | OK. |
| F-8 | Đa BS đơn vượt cap 10% | MEDIUM | MVP manual. 6 tháng review auto rule. |
| ~~F-9~~ | ~~Khách bỏ về, BS đã start nhưng item skipped~~ | - | **REMOVED** (false dichotomy). Theo per-doctor model: row BS được add khi exam_started, không xoá dù item skipped sau. |
| **F-10** (mới) | KT và CEO bỏ HH theo đơn | - | **RESOLVED 28/04**: KT và CEO không có row OrderRoleAssignment, không tính HH per đơn. |

---

## 16. Bước tiếp theo

Sau khi anh review B2.3:
- B2.4: Kì lương ngày 5 chi tiết (timeline Diễm + CEO theo giờ)
- B3: Audit 23 screens (cross-check với scenarios B2.2 + B2.3)
- B4: Bảng business rules consolidate
- B5: Spec chi tiết từng screen
- B6: Plan thực thi

Trước khi sang B2.4, anh cần:
1. Resolve các Finding F-1, F-2, F-3 (impact công thức HH)
2. Confirm Option A cho F-9 (khách bỏ về giữa khám)
3. Defer F-5 (BH reject policy) nếu chưa quyết được

## 17. Lịch sử update

| Date | Update |
|---|---|
| 2026-04-28 v1 | Tạo file. 13 scenarios + 1 section technical edge cases. 9 findings critical/medium. |
| 2026-04-28 v2 | Resolve findings: F-1 chốt formula B1 vòng 9 (revert vòng 10 voucher Option A), F-2 recompute all, F-3 theo formula F-1, F-9 REMOVE false dichotomy, F-10 mới: KT và CEO không HH. Recalculate 8 scenarios với KT/CEO removed. Scenario 13 fix BS row per-doctor model. |
