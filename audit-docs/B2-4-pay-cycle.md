# B2.4 Kì Lương Ngày 5 Chi Tiết

Status: WIP draft 1
Ngày: 2026-04-28
Phụ thuộc: B1 FINAL vòng 13, B2.1 personas, B2.2 BPMN v3, B2.3 edge cases v2

Mục đích: Dựng timeline kì lương ngày 5 hàng tháng cho 2 actor chính (Diễm KT trưởng, CEO Nguyên). Cover pre-payday, payday execution, post-payday clawback. Plus edge cases.

Convention: tham chiếu B1 vòng 13 chuẩn, không repeat.

---

## 1. Tổng quan kì lương

### 1.1 Cycle definition

- **1 kì** = 1 tháng dương lịch
- **Đơn thuộc kì nào**: theo `Order.created_at` (đã chốt B1)
- **Deadline chốt lương**: ngày 5 tháng kế tiếp (configurable trong Settings)
- **Pay channel**: Bank transfer + pay slip Zalo/email

### 1.2 Actors và trách nhiệm

| Actor | Vai trò | Touchpoint |
|---|---|---|
| Diễm | KT trưởng tạo + KT thường thực thi (Case A: 1 người) | App HH, Misa, internet banking |
| CEO Nguyên | Duyệt CR + adjustment, final approval | App HH (mobile only) |
| Sale/TC/BS (Lan, Hằng, Trang, Hà, Minh, Hằng-D, Vinh) | Receive pay slip, có thể khiếu nại | App HH (xem) + Zalo (nhận pay slip) |

### 1.3 Đơn vị HH chia trong kì lương

Theo chốt vòng 13:
- **Có HH**: Sale, TC, BS (3 role)
- **KHÔNG có HH per đơn**: KT (Diễm), CEO (Nguyên)
- Diễm + Nguyên có thể nhận adjustment (vd CEO thưởng Diễm cuối năm), nhưng không phải HH theo đơn

### 1.4 Stages CR trong kì lương

```
TAM_TINH → CHO_DUYET → DUOC_DUYET → vào pay slip
                    ↘ TU_CHOI → KHIEU_NAI → revert hoặc giữ
```

Chỉ CR ở `DUOC_DUYET` mới vào pay slip kì lương.

---

## 2. Timeline pre-payday (T-10 đến T-1)

T = ngày 5 (payday).

### 2.1 T-10 đến T-5 (cuối tháng trước, ví dụ 25/3 đến 30/3)

Diễm:
- Hằng ngày mở app HH 1-2 lần
- Check filter "Đơn vượt cap 10%" (nếu có), note đơn cần CEO review
- Check CR đang ở CHO_DUYET, batch duyệt theo đơn
- Adjustment manual nếu có (vd thưởng đột xuất cho NV làm tốt)

CEO:
- Mobile dashboard daily check
- Approve adjustment requests Diễm đã tạo
- Receive Zalo report from TC Hà (báo cáo ngày)

### 2.2 T-5 đến T-1 (1/4 đến 4/4)

Đây là phase critical. Đa số CR phải xong trước payday.

Diễm:
- Sáng 1/4: Mở app, screen "Báo cáo HH tháng March"
  - Tổng số đơn March: 600 (giả định 20 đơn/ngày × 30 ngày)
  - Số CR CHO_DUYET: ~1.500 (mỗi đơn ~2-3 CR average với Sale + TC + BS)
  - Số CR DUOC_DUYET đã: 1.200 (từ daily review)
  - Còn lại: 300 CR cần review trong 4 ngày
- Day 1/4 đến 4/4: Diễm dành 2-3 giờ/ngày review batch
- Filter các edge case:
  - "Đơn vượt cap 10%": review riêng, gửi CEO
  - "Đơn có refund 1 phần": verify clawback delta
  - "Đơn cross-month" (tạo cuối March, COMPLETED đầu April): hold (vào kì sau)

CEO:
- Daily approve adjustment Diễm push lên
- Approve auto rule fire (vd thưởng target tháng)

### 2.3 Adjustment timing

Manual adjustment: Diễm có thể tạo bất kì lúc nào trong tháng.
Auto rule fire: vào cuối tháng (vd 31/3 23:59 fire rule "thưởng đạt target tháng").

Workflow auto rule:
```
31/3 23:59: Cron fire AutoRule "thưởng target tháng"
  - Query NV nào đạt target % vượt > 100%
  - Tạo AdjustmentRequest cho mỗi NV với status=AUTO_PENDING
  - salary_cycle_id = March

1/4: CEO mở app, thấy queue "AUTO_PENDING adjustments"
  - Bulk review (1 màn list NV + số bonus)
  - Bulk approve hoặc per-record reject
  - Approve → APPROVED → vào pay slip March

5/4: Pay slip March include auto bonus
```

### 2.4 Cross-month đơn (theo Scenario 10 B2.3)

Đơn tạo 30/3 lúc 18h, lịch khám 1/4 lúc 9h:
- Đơn thuộc kì March (theo created_at)
- 1/4 11h: Đơn COMPLETED → CR CHO_DUYET
- 1/4 đến 4/4: Diễm duyệt → DUOC_DUYET → pay slip March

Đơn tạo 30/3 lúc 18h, lịch khám 6/4 (sau payday):
- 5/4: Đơn vẫn ở CONFIRMED, CR vẫn TAM_TINH
- 5/4 pay slip March KHÔNG include đơn này
- 6/4 đơn COMPLETED → CR CHO_DUYET với salary_cycle_id = March (theo created_at)
- Diễm duyệt → DUOC_DUYET nhưng kì March đã chốt
- Hệ thống: CR này vào pay slip April với note "Kì gốc March, chốt muộn"

UI: Pay slip có cột "Kì gốc" để hiển thị clear (đã note F-6 trong B2.3).

---

## 3. Timeline payday (Day 5) chi tiết theo giờ

Ví dụ: Ngày 5/4/2026 (kì lương March 2026).

### 3.1 Sáng (08:00 - 12:00)

| Giờ | Diễm hoạt động | CEO hoạt động | App HH state |
|---|---|---|---|
| 08:00 | Đến văn phòng, mở app HH + Misa | (chưa active) | Diễm check dashboard kì March: 1.500 CR, 1.480 DUOC_DUYET, 20 còn CHO_DUYET |
| 08:30 | Final batch review 20 CR còn lại | | Diễm duyệt 18, reject 2 (lý do cụ thể) |
| 09:00 | Reject 2 → NV nhận notification | | 2 CR chuyển TU_CHOI |
| 09:15 | Tạo adjustment manual cuối kì (vd "thưởng dịp 30/4 cho 3 NV làm tốt") | | 3 AdjustmentRequest PENDING |
| 09:30 | Push CEO approve | CEO mở app, thấy queue PENDING | |
| 09:45 | | CEO review 3 adjustment + auto rule fired (5 NV target) | 3 + 5 = 8 adjustment trong queue |
| 10:00 | | CEO bulk approve 8 adjustment | 8 APPROVED |
| 10:30 | Verify auto rule fired đúng (5 NV target) | | All approved |
| 11:00 | Filter "Đơn vượt cap 10%" review riêng (15 đơn vượt) | | Diễm note để gửi CEO |
| 11:30 | Gửi CEO list 15 đơn vượt cap qua Zalo | CEO review + adjust nếu cần | CEO tạo 2 adjustment thêm "giảm HH BS đơn O-XYZ vì đa BS không cần thiết" |
| 12:00 | Nghỉ trưa | Nghỉ trưa | |

### 3.2 Chiều (13:00 - 18:00)

| Giờ | Diễm | CEO | App HH state |
|---|---|---|---|
| 13:00 | Mở app, check final state | | All adjustments approved, all CR DUOC_DUYET |
| 13:15 | Bấm "Export Excel kì March" | | App HH tạo 4 file: |
| | | | 1. Bảng lương HH theo kì (1 dòng/NV) |
| | | | 2. Bảng kê chi tiết (từng CR) |
| | | | 3. Danh sách clawback (refund kì trước) |
| | | | 4. File chuyển khoản (NV, STK, bank, số tiền) |
| 13:30 | Mở Misa, đối soát doanh thu March | | Diễm verify tổng HH dự chi vs % doanh thu |
| 14:30 | Phát hiện 1 đơn refund không trừ HH | | Diễm tạo adjustment manual để fix |
| 14:45 | Push CEO duyệt nhanh | CEO approve | 1 adjustment APPROVED |
| 15:00 | Re-export Excel với adjustment mới | | File chuyển khoản update |
| 15:30 | Gửi pay slip preview cho CEO duyệt cuối | CEO review qua Zalo | |
| 16:00 | CEO duyệt → Diễm chuyển khoản ngân hàng | (CEO confirm) | |
| 16:30 | Diễm upload file chuyển khoản vào internet banking | | (out of scope app HH) |
| 17:00 | Bank xác nhận transfer thành công | | Diễm confirm trong app: "Đã chi lương kì March" |
| 17:15 | App HH lock kì March (no more edit trừ trong window 30 ngày) | | |
| 17:30 | Diễm gửi pay slip cá nhân qua Zalo cho từng NV | | Pay slip = PDF với template chuẩn |
| 18:00 | Done | | NV nhận Zalo + pay slip |

### 3.3 Pay slip content

Pay slip cá nhân (vd Lan ĐD-Sale M2) có:

```
PAY SLIP THÁNG 03/2026
NV: Nguyễn Thị Lan
Vai: ĐD-Sale | Ranking: M2

LƯƠNG CỨNG:                        8.000.000đ

HOA HỒNG (theo đơn):
  Role Sale    (3% × net_profit)
    Đơn O-001  net 500k × 3% = 15k
    Đơn O-005  net 800k × 3% = 24k
    ...
    Tổng Sale: 540.000đ
  
  Role ĐD      (1% × net_profit)
    Đơn O-007  net 200k × 1% = 2k
    ...
    Tổng ĐD:   80.000đ
  
HH gốc:                              620.000đ

ĐIỀU CHỈNH:
  + 200.000đ "Thưởng đạt target tháng" (auto rule)
  - 150.000đ "Tư vấn sai gói khách KH-200" (Diễm tạo, CEO duyệt)
Tổng adjustment:                       50.000đ

CLAWBACK kì trước:
  Đơn O-099 refund 1 phần:           -30.000đ
Tổng clawback:                       -30.000đ

NET HH = 620k + 50k - 30k =           640.000đ

THUẾ TNCN:                           (kế toán xử lý ngoài)

LƯƠNG THỰC NHẬN:                   8.640.000đ
```

CEO không có pay slip (ăn lợi nhuận, không lương app HH).
Diễm không có dòng HH (lương cứng + adjustment nếu có).

---

## 4. Post-payday (T+1 đến T+30)

### 4.1 Edit window 30 ngày

Theo chốt VĐ-4: Diễm có thể edit/xoá adjustment đã APPROVED trong 30 ngày sau payday.

Vd:
- 5/4 payday March: pay slip chi 640k cho Lan
- 20/4 (T+15): Diễm phát hiện adjustment "Tư vấn sai gói" sai số, edit từ -150k → -300k
- App HH:
  - Adjustment status APPROVED → EDITED
  - Tạo CR delta = -300k - (-150k) = -150k
  - salary_cycle_id của delta = April
- 5/5 payday April: Lan pay slip có dòng "Điều chỉnh kì March: -150k"

### 4.2 Clawback flow (refund 1 phần / toàn phần)

Đơn đã DUOC_DUYET, đã chi pay slip March. Sau payday refund:
- 15/4: Khách refund đơn O-104
- App HH tạo CR delta âm cho mọi role active
- salary_cycle_id của delta = April
- 5/5 pay slip April: dòng clawback per role

### 4.3 Lock cứng sau T+30

Ngày 5/5 (30 ngày sau payday March 5):
- Adjustment kì March chuyển EDITED → LOCKED (không sửa được)
- CR DUOC_DUYET kì March lock vĩnh viễn (không revert)
- Khiếu nại CR còn KHIEU_NAI sau ngày này: Diễm review final, không thể revert sau đó

---

## 5. Khiếu nại flow trong kì lương

Theo Scenario 9 B2.3:

```
T-2 (3/4): Diễm reject CR Sale của Lan đơn O-130, lý do "Khách phàn nàn"
T-1 (4/4): Lan khiếu nại trong app, đính kèm screenshot
T  (5/4): Diễm review khiếu nại
   Option A: Diễm giữ reject → CR TU_CHOI vĩnh viễn
   Option B: Diễm revert → CR CHO_DUYET → DUOC_DUYET → vào pay slip ngay
T+30 (5/5): TU_CHOI vĩnh viễn lock, không khiếu nại lại được
```

Edge case: Diễm reject vào 4/4, Lan khiếu nại 5/4 lúc 14h khi Diễm đã chuẩn bị xong file Excel.
- App HH alert Diễm: "Có khiếu nại mới về đơn O-130"
- Diễm review nhanh, decision trong 1-2 giờ
- Nếu revert: re-export Excel với CR mới
- Nếu giữ reject: pay slip Lan KHÔNG có HH O-130

Đơn này có thể delay payday vài giờ. Acceptable nếu trong cùng ngày 5.

---

## 6. Edge cases payday

### 6.1 Diễm nghỉ sát ngày 5

B1 chốt: không có backup approver (Option A). Hệ quả:
- Pay slip delay đến khi Diễm quay lại
- NV nhận notification "Lương kì March delay do KT vắng"
- CEO có thể tạm ứng cho NV nếu cần (out of scope app HH)

### 6.2 CEO nghỉ sát ngày 5

CEO nghỉ → adjustment AUTO_PENDING không duyệt được.
- Adjustment auto rule fire chưa duyệt: hold
- Manual adjustment Diễm push: hold
- Pay slip vẫn chi được (CR DUOC_DUYET đã duyệt từ trước)
- Adjustment hold sang kì sau

### 6.3 Bank transfer fail

NV không có STK / sai STK / bank reject:
- Diễm ghi note trong app (NotificationLog hoặc AuditLog)
- Pay riêng cho NV này (chuyển khoản tay hoặc tiền mặt)
- App HH không track payment status, chỉ ghi nhận "đã chi"

### 6.4 NV nghỉ việc trong kì lương

Đã chốt B1 section 20: chi trong 14 ngày sau nghỉ theo Luật Lao động VN.
- App HH track NV.status = pending_offboarding hoặc offboarded
- Pay slip vẫn generate cho NV nghỉ
- Diễm chuyển khoản trong 14 ngày, không phụ thuộc payday cycle

### 6.5 HH calc sai (recovery)

Diễm phát hiện HH 1 đơn tính sai sau khi đã chi lương:
- Trong 30 ngày: edit qua manual adjustment
- Sau 30 ngày: chỉ có thể tạo adjustment manual cho kì hiện tại với reason "Sửa sai kì trước" (không tạo clawback automatic vì đã LOCKED)

### 6.6 Đơn còn IN_PROGRESS sát ngày 5

Đơn tạo 28/3, khám rời lịch nhiều lần, đến 4/4 vẫn IN_PROGRESS:
- 5/4: Đơn vẫn IN_PROGRESS, CR TAM_TINH
- Đơn thuộc kì March nhưng HH chưa CHO_DUYET → KHÔNG vào pay slip March
- Khi đơn COMPLETED (vd 10/4): CR CHO_DUYET với salary_cycle_id = March
- Diễm duyệt → vào pay slip April với note "Kì gốc March"

---

## 7. Schema bổ sung cho B2.4

Đa số schema đã có trong B1. Cần thêm hoặc clarify:

```
SalaryCycle (đã có B1, mở rộng):
   id, start_date, end_date, status (open/locked/closed),
   approved_by, approved_at, deadline_date,
   total_hh_paid, total_adjustment, total_clawback,
   locked_at (timestamp khi Diễm chốt),
   closed_at (timestamp T+30 lock cứng)
   
   Ghi chú: status open = đang mở (có thể edit CR/adjustment)
            status locked = đã chi lương, chỉ edit qua window 30 ngày
            status closed = sau T+30, lock cứng

PayrollExport (mới):
   id, salary_cycle_id, exported_at, exported_by,
   file_excel_path, file_pdf_path,
   bank_transfer_status (pending/completed/failed),
   bank_transfer_at
   
   Ghi chú: track export history, có thể re-export nếu adjustment
            phát sinh sát giờ.
```

---

## 8. Open questions / verifications

| ID | Question | Severity | Action |
|---|---|---|---|
| Q-2.4-A | Pay slip format chuẩn (PDF template) chưa có. Cần Diễm confirm content + layout | MEDIUM | Defer B5 spec |
| Q-2.4-B | Channel gửi pay slip: Zalo cá nhân hay email? Có batch upload Zalo OA không? | MEDIUM | Cần anh chốt |
| Q-2.4-C | Tax calc (TNCN) có trong app HH không? B1 nói "thuế kế toán xử lý riêng". App HH chỉ gross HH. | LOW | Đã rõ, không action |
| Q-2.4-D | Auto rule fire vào ngày nào cuối tháng? Đề xuất 23:59 ngày cuối tháng. Hay đợi đến 1/4 fire? | LOW | Defer phase implement |
| Q-2.4-E | Diễm có cần nút "Bulk approve all CR" để tăng tốc không? Hay duyệt batch theo đơn? | MEDIUM | Defer B5 spec |
| Q-2.4-F | NV có thể "đặt lịch" khiếu nại trước (vd NV biết sẽ khiếu nại đơn X, ấn pre-flag)? | LOW | YAGNI, defer phase 2 |

---

## 9. Bước tiếp theo

Sau B2.4:
- B3: Audit 23 screens hiện có (cross-check với B2.1-B2.4 workflow)
- B4: Consolidate business rules từ B1+B2 thành rule engine spec
- B5: Spec chi tiết từng screen (kèm pay slip template từ Q-2.4-A)
- B6: Plan thực thi

## 10. Lịch sử update

| Date | Update |
|---|---|
| 2026-04-28 v1 | Tạo file. Timeline pre-payday + payday + post-payday. 6 edge cases. Pay slip content example. 6 open questions defer. |
