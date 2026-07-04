# B4 Business Rules Consolidate

Status: WIP draft 1
Ngày: 2026-04-28
Phụ thuộc: B1 FINAL vòng 13, B2.1-B2.4 FINAL, ADR-001, PENDING-ITEMS
Source of truth: B1 + B2.1-B2.4 + ADR-001

Mục đích: Consolidate mọi business rule từ B1+B2 thành rule reference cho dev. Mỗi rule có ID `R-X-Y` để cross-reference từ B5 spec. Khi conflict: B1+B2 trump implementation hiện tại.

Convention:
- `R-X-Y`: rule ID. X = section, Y = số thứ tự.
- `[CHỜ ISOFT]`, `[CHỜ ANH CHỐT]`, `[GIẢ ĐỊNH]`: xem PENDING-ITEMS.md

---

## 1. Rules HH calculation

### R-1-1: Formula HH chuẩn

```
total_paid = total_listed - insurance_amount - voucher_amount
   (BH và voucher đều trừ khỏi total_paid)

total_cost = Σ OrderItem.cost × quantity (chỉ tính item.status = completed)
   (item skipped không cộng cost)

net_profit = total_paid - total_cost

HH per row = max(net_profit, 0) × %HH(role, ranking_snapshot)

Tổng chi HH đơn = Σ HH các row active của Sale + TC + BS
```

Source: B1 section 3.1 (vòng 9, confirmed vòng 13)

Note dev:
- net_profit có thể âm khi BH+voucher+cost > total_paid → max(0) ngăn HH âm
- Lưu cả `net_profit` và `total_paid` trong DB cho kế toán đối soát Misa

### R-1-2: HH chỉ áp cho 3 role

Role có HH per đơn: **Sale, TC, BS**.
Role KHÔNG có HH per đơn: **KT (Diễm), CEO (Nguyên)**.

Source: B1 vòng 13 Red flag #10.

Note dev:
- OrderRoleAssignment populate chỉ Sale + TC tại CONFIRMED, BS tại exam_started
- KHÔNG populate row KT hoặc CEO
- Diễm và Nguyên có thể nhận adjustment manual (vd CEO thưởng cuối năm), tách biệt với HH per đơn

### R-1-3: Snapshot ranking tại CR creation time

Khi tạo CR: lưu `ranking_snapshot_id`, `pct_at_time` của user tại thời điểm đó.

Khi NV được promote/demote ranking giữa kì: đơn cũ giữ %HH cũ, đơn mới ăn %HH mới.

Source: B1 section 3.2 (vòng 9), B2.3 Scenario 11.

Edge case: NV ranking change 15/3, đơn O-150 tạo 10/3 (M2 3%) vs O-151 tạo 20/3 (M3 4%). Cả 2 cùng kì March, mỗi đơn giữ snapshot riêng.

### R-1-4: BH commission base (out-of-pocket only)

HH chỉ tính trên phần khách trả ra túi (`total_paid`), KHÔNG tính phần BH chi trả.

Khi BH thanh toán sau 3-4 tháng: NP nhận tiền, ghi nhận doanh thu, KHÔNG sinh HH bổ sung.

Source: B1 section 4 vòng 13, VĐ-9 Option B.

Edge case BH reject: NP có thể đòi khách trả, refund, hoặc write-off. Policy NP, không phải dev concern. App HH track InsuranceClaim.status (paid/rejected/pending/partial).

### R-1-5: Voucher trừ khỏi base HH

Voucher TRỪ trực tiếp từ `total_paid` như mọi chi phí. NV không bị penalty trực tiếp, nhưng HH chia ra ít hơn theo doanh thu thực.

Source: B1 section 4 vòng 13 (REVERT chốt vòng 10 VĐ-8 Option A).

### R-1-6: Cost của item skipped không tính

Khi OrderItem.status = skipped: `cost` của item đó KHÔNG cộng vào `total_cost`. Revenue tương ứng cũng không tính (iHOS refund).

Source: B1 section 8 vòng 13.

### R-1-7: BS row per-doctor, không xoá khi item skipped

Row BS thêm khi `order.exam_started` fire kèm doctor_id. Mỗi doctor 1 row, không phụ thuộc số dịch vụ. Row đã thêm thì giữ vĩnh viễn, dù item BS làm bị skip sau đó.

Source: B1 section 3.3 vòng 13.

Edge case (B2.3 Scenario 13): BS Hằng-D start item B, khách bỏ về, item B skipped. Row Hằng-D vẫn có. HH Hằng-D = net_profit × %HH (giảm proportional vì item skipped).

---

## 2. Rules state transitions

### R-2-1: Order state machine (8 states)

```
DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED
              ↓                       ↓
          CANCELLED                REFUND_FULL
              ↓                       ↓
          NO_SHOW                REFUND_PARTIAL
```

Source: B2.2 v3 Section 1.

State definitions: xem B2.2 Section 1.1.

### R-2-2: Order auto-transition NO_SHOW

T+30p sau giờ hẹn (`Order.scheduled_exam_at`), nếu chưa CHECKED_IN: auto chuyển NO_SHOW.

Source: B2.2 v3 Section 1.5.

Note dev: cron job mỗi 5 phút check Orders CONFIRMED đã quá giờ + 30p, mark NO_SHOW.

### R-2-3: CR state machine (7 states)

```
TAM_TINH → CHO_DUYET → DUOC_DUYET (vào pay slip)
        ↘                   ↓
        CANCEL          CLAWBACK_PENDING (refund/edit adjustment)
                            ↓
                      DUOC_DUYET (delta vào kì sau)

CHO_DUYET → TU_CHOI → KHIEU_NAI → CHO_DUYET hoặc giữ TU_CHOI
```

Source: B2.2 v3 Section 2.

### R-2-4: AdjustmentRequest state machine (6 states)

```
ManualCreate (Diễm tạo) → PENDING → CEO duyệt → APPROVED hoặc REJECTED
AutoFire (rule trigger) → AUTO_PENDING → CEO duyệt → APPROVED hoặc REJECTED
APPROVED → EDITED (Diễm edit trong 30 ngày, tạo CR clawback delta)
EDITED → LOCKED (sau 30 ngày)
APPROVED → LOCKED (sau 30 ngày)
```

Source: B2.2 v3 Section 3.

### R-2-5: OrderItem.status

```
planned → completed (item thực hiện xong)
planned → skipped (khách bỏ về, BS không thực hiện được, BN đổi ý, etc.)
```

Skipped reason enum: `customer_left`, `insurance_rejected`, `patient_changed_mind`, `service_not_executable`, `medical_contraindication`, `consent_refused`, `other`.

Source: B2.2 v3 Section 1.1, B2.3 discussion clarify enum.

### R-2-6: Reassign chỉ trước CONFIRMED

Sau CONFIRMED, đóng băng assignee. Reassign chỉ qua handover (NV nghỉ việc, B1 section 20).

Source: B1 section 8.

---

## 3. Rules role assignment

### R-3-1: Populate khi đơn CONFIRMED

Khi NV ấn "Đã xác nhận", system populate `OrderRoleAssignment` 2 row:

| Role | user_id | Lookup logic |
|---|---|---|
| Sale | NV ấn xác nhận hoặc người được TC assign | Người tạo đơn / assignee |
| TC | Lookup `ShiftHeadAssignment` active của shift match `Order.created_at` | Phương án J |

Snapshot ranking_id của Sale user.

Source: B1 section 3.3 vòng 13 + ADR-001.

Edge case: Shift không có TC active (Hà nghỉ, chưa tuyển thay): không tạo row TC. Đơn vẫn populate Sale row.

### R-3-2: Populate BS khi exam_started

Khi iHOS webhook `order.exam_started` fire kèm doctor_id: thêm row BS vào OrderRoleAssignment với `user_id = doctor_id`.

Mỗi doctor 1 row. 0 đến N row BS per đơn.

Source: B1 section 3.3 vòng 13.

Note dev:
- Lookup user trong DB qua `ihos_user_id`
- Nếu doctor_id không map được user trong app HH: log error, alert dev (case BS chưa onboard)

### R-3-3: KT và CEO không populate row

Source: B1 section 3.3 vòng 13.

### R-3-4: Multi-attribution (1 doctor làm N dịch vụ)

1 BS làm N dịch vụ trong cùng đơn → 1 row OrderRoleAssignment (không phải N row). Row được thêm 1 lần khi `order.exam_started` đầu tiên fire cho doctor đó.

Source: B1 section 3.3 vòng 13. B2.3 Scenario 12 verify.

### R-3-5: Handover qua Order Role Assignment

NV nghỉ việc: row OrderRoleAssignment cũ mark `ended_at = now()`, thêm row mới cho người nhận với `assigned_at = now()`, snapshot ranking của người nhận.

Source: B1 section 3.5, B1 section 20.

Note dev:
- Đơn chưa COMPLETED: HH cancel của người cũ, tạo HH mới cho người nhận theo ranking mới
- Đơn đã COMPLETED nhưng CR chưa duyệt: GIỮ row cũ active, HH chi cho người cũ
- Đơn đã DUOC_DUYET: không thay đổi (đã ghi nhận)

### R-3-6: Force handover

TC có quyền "Force handover" khi NV đột ngột nghỉ/sa thải. Cùng logic R-3-5.

Source: B1 section 20.

---

## 4. Rules ranking + snapshot

### R-4-1: Ranking system

CEO tự define ranking (đặt tên, set %HH per role). Không hardcode đồng/bạc/vàng.

Source: B1 section 6.

### R-4-2: Reset cứng quý

Ranking reset cứng mỗi quý. Đơn trước reset giữ snapshot %HH cũ. Đơn sau reset ăn %HH mới.

Source: B1 section 6.

### R-4-3: G1 ngưỡng và công thức ranking

[CHỜ ANH CHỐT B-6]: ngưỡng và công thức lên hạng. Hiện chưa có, dùng [GIẢ ĐỊNH].

Source: B1 section 6, PENDING-ITEMS B-6.

### R-4-4: Promote/demote giữa quý

[CHỜ ANH CHỐT]: B1 chốt reset cứng quý nhưng cho phép CEO promote/demote giữa quý qua manual action không?

Đề xuất: Cho phép CEO promote giữa quý (linh hoạt cho NV tốt). Demote giữa quý hạn chế (tránh punish quá nhanh). Cần anh confirm.

Source: B2.3 Scenario 11 raise question.

---

## 5. Rules cap 10% (App không enforce)

### R-5-1: Cap default 10%

Setting `expected_total_pct_per_order` default 10%. CEO có thể đổi trong Settings.

Source: B1 section 3.6 vòng 13.

### R-5-2: App không enforce, warning là awareness signal

App KHÔNG tự cap HH khi vượt 10%. Chỉ hiển thị warning visual:
- Icon cảnh báo trên chi tiết đơn
- Filter "Đơn vượt cap 10%" trên màn duyệt HH
- Alert trong CEO dashboard

**Intent của warning (chốt 01/05/2026)**:

Warning là **awareness signal** cho CEO/TC để:
- Nhận biết đơn nào phức tạp (đa BS, etc.)
- **Ghi nhận pattern**: đơn nào thường vượt cap → review process upstream
- **Cải thiện process**: lần sau không assign 3 BS cho đơn đơn giản
- Training NV về assignment hợp lý

Warning **KHÔNG phải tool để retroactive cut HH** từ NV đã làm việc:
- Default: NV full HH theo formula (KHÔNG trừ tay)
- Cut HH retroactive dễ gây mất lòng, demotivate
- Chỉ tạo Adjustment giảm trong edge case suspected abuse với LÝ DO CỤ THỂ (vd 1 BS được assign vô lý cho đơn không cần expertise của họ), KHÔNG vì "vượt cap" chung chung

Source: B1 section 3.6 vòng 13. Reframe intent 01/05/2026.

### R-5-3: Trường hợp thường vượt cap

Đơn có 2+ BS (mỗi BS ăn full %HH). Vd 3 BS × 5% = 15% cộng Sale 3% + TC 2% = 20%.

Source: B2.3 Scenario 12.

---

## 6. Rules adjustment

### R-6-1: Workflow đơn nguồn

KT trưởng (Diễm) là **người duy nhất** tạo adjustment manual.
CEO (Nguyên) là **người duy nhất** duyệt.

TC, NV, BS, KT thường KHÔNG tạo adjustment trực tiếp trong app. Họ trao đổi với Diễm ngoài app, Diễm nhập.

Source: B1 section 5 vòng 11.

### R-6-2: Auto rule fire

Auto rule fire → tạo AdjustmentRequest status = `AUTO_PENDING`. KHÔNG qua tay Diễm.

CEO duyệt batch: 1 màn list các auto adjustment, bulk approve hoặc per-record reject.

Source: B1 section 5 vòng 11.

### R-6-3: Edit window 30 ngày

Diễm có thể edit adjustment APPROVED trong **30 ngày sau payday**.

Sau 30 ngày: lock cứng, không sửa được.

Source: B1 section 5 vòng 11, B2.4 section 4.

### R-6-4: Edit creates clawback delta

Khi edit adjustment đã apply lương: bản gốc giữ history, tạo CommissionRecord delta = (số mới - số cũ) ở kì lương kế tiếp.

Bản gốc trong kì cũ KHÔNG sửa retroactive.

Source: B1 section 5 vòng 11, B2.4 section 4.

Note dev: schema `AdjustmentRequest.parent_adjustment_id` link bản gốc.

### R-6-5: Không limit amount

Adjustment không có limit amount, nhưng MỌI adjustment đều phải qua workflow tạo + duyệt.

Source: B1 section 5 vòng 11 (chốt SQ-2).

### R-6-6: Alert > 3 adjustment/NV/tháng

App alert CEO nếu 1 NV nhận > 3 adjustment trong tháng (signal abuse). Không block.

Source: B1 section 5 vòng 11.

### R-6-7: Transparent visibility cho NV

NV thấy dòng "Điều chỉnh +/-X VND" + lý do + người tạo + ngày trên màn HH cá nhân.

Source: B1 section 5 vòng 11 (chốt SQ-4).

### R-6-8: Adjustment cho mọi user (kể cả KT/CEO)

Adjustment manual có thể áp cho bất kì user, kể cả Diễm và Nguyên (vd CEO tự thưởng cuối năm).

Source: B1 section 3.3 vòng 13 note.

---

## 7. Rules auto rule engine

### R-7-1: MVP scope

MVP chỉ implement 1 auto rule: **Thưởng đạt target tháng**.

Phần phạt (đi muộn, complaint, vi phạm SOP, etc.) defer phase 2 sau session discuss riêng.

Source: B1 section 5 vòng 11 (chốt SQ-3), PENDING-ITEMS B-12.

### R-7-2: Rule "thưởng target tháng" (chốt vòng 16, A-1)

Parameters (CEO config trong Settings):
- `target_pct` (default 100%): NV phải đạt bao nhiêu % target để được thưởng
- `bonus_pct` (default 5%): % bonus theo % overshoot

Logic:
```
if NV.actual_hh >= NV.target × target_pct:
    overshoot_pct = (NV.actual_hh - NV.target × target_pct) / NV.target
    bonus = NV.actual_hh × bonus_pct × overshoot_pct
    create AdjustmentRequest(beneficiary=NV, type=thưởng, amount=bonus, source=auto_rule, status=AUTO_PENDING)
```

Vd: NV target 5tr HH, actual 6tr (vượt 20%), bonus_pct 5% → bonus = 6tr × 5% × 20% = 60.000đ.

Note: Dùng HH gốc làm base (không phải lương cứng) vì app HH KHÔNG quản lý lương cứng (Q-MS12-A chốt). Diễm gộp lương cứng + HH ngoài app.

Source: B1 section 5 vòng 11, vòng 16 (01/05) confirm formula HH gốc.

### R-7-3: Fire timing

Cron fire 23:59 ngày cuối tháng. Adjustment vào queue CEO duyệt batch ngày 1-5 tháng sau.

Source: B2.4 section 2.3.

### R-7-4: Rule framework cho phase 2

Schema AutoRule chứa:
- `trigger_type`: target_achievement / late_check_in / complaint / custom
- `parameters` (JSON): config theo trigger_type
- `active`: bool

Phase 2: thêm trigger_type mới khi anh chốt rule phạt.

Source: B1 section 15 vòng 11.

---

## 8. Rules reminder + recall + notification

### R-8-1: Reminder schedule khi đơn CONFIRMED

Khi đơn CONFIRMED, schedule 4 row NotificationLog:
- T-24h trước `scheduled_exam_at`: Zalo OA reminder (auto)
- T-2h: Zalo OA reminder (auto)
- T+15p sau giờ hẹn: push notify NV gọi (manual call)
- T+30p sau giờ hẹn: auto NO_SHOW (cron)

Source: B2.2 v3 Section 1.5.

### R-8-2: Cancel pending reminders

Khi đơn vào IN_PROGRESS / CANCELLED / NO_SHOW: cancel mọi reminder pending (status = cancelled).

Source: B2.2 v3 Section 1.5.

### R-8-3: Cron tick

Cron mỗi 5 phút check NotificationLog `scheduled_at <= now() AND status = scheduled` → trigger send.

Source: B2.2 v3 Section 1.5.

[CHỜ ANH CHỐT B-15]: cron 5 phút có acceptable không, hay cần realtime queue?

### R-8-4: Post-exam thanks

Khi đơn COMPLETED: schedule NotificationLog type = `post_exam_thanks` ngay (T+0). Zalo OA gửi cảm ơn + link feedback.

Source: B2.2 v3 Section 1.6.

### R-8-5: Recall theo y lệnh BS từ iHOS (chốt vòng 16, A-3)

App HH chỉ consume `recall_due_date` từ iHOS webhook. KHÔNG có Service default fallback.

Logic:
```
Khi Order COMPLETED:
  for each OrderItem:
    if iHOS webhook gửi recall_due_date trong payload:
      OrderItem.recall_due_date = recall_due_date_from_webhook
    else:
      OrderItem.recall_due_date = NULL

Customer.next_recall_due_at = MIN(OrderItem.recall_due_date)
   (chỉ tính items có recall_due_date NOT NULL)
   
if all items recall_due_date NULL:
  Customer.next_recall_due_at = NULL  # KH không có y lệnh tái khám
```

Khi đến `next_recall_due_at`: schedule NotificationLog type=`recall`, push notify NV chăm gốc.

Reasoning: Trong y khoa, recall theo y lệnh BS per case (ví dụ BS chỉ định "tái khám sau 7 ngày"). Không phải fixed theo loại dịch vụ. App HH consume từ iHOS, không cần BS nhập tay vào app HH.

Risk: Nếu iHOS không gửi recall_due_date, NP không có recall workflow trong app. Manual workaround: NV/Hà gọi follow-up tay (không qua trigger app).

Source: B2.2 v3 Section 1.6, vòng 16 simplification.

### R-8-6: NV chăm gốc rule

Khi tạo customer: `Customer.primary_assigned_user_id = NV tạo đơn đầu tiên`.

Khi recall fire: notify primary_assigned_user_id.

Khi KH quay lại tạo đơn mới: auto assign Sale role = primary_assigned_user_id.

Source: B1 section 8, B2.2 v3 Section 1.6.

### R-8-7: HH cho follow-up

KHÔNG ăn HH cho cuộc gọi follow-up hoặc recall. NV ăn HH khi đơn mới được tạo (KH quay lại).

Source: B2.2 v3 Section 1.6.

---

## 9. Rules permission per role

### R-9-1: Permission matrix

| Role | Xem đơn | Xem KH | Xem HH | Xem ranking/leaderboard | Duyệt CR | Reject CR | Tạo voucher | Tạo adjustment | Duyệt adjustment | Setting |
|---|---|---|---|---|---|---|---|---|---|---|
| NV (Sale/ĐD) | của mình | của mình | của mình | **chỉ của mình** | - | - | - | - | - | - |
| BS | của BS | - (qua iHOS) | của mình | **chỉ của mình** | - | - | - | - | - | - |
| TC | toàn PK | toàn PK | toàn PK | toàn PK | - | - | ✅ | - | - | xem |
| KT (Diễm) | toàn PK | toàn PK | toàn PK | toàn PK | ✅ | ✅ | - | ✅ | - | xem |
| CEO | toàn PK | toàn PK | toàn PK | toàn PK | - | - | ✅ | ✅ | ✅ | edit |

Source: B1 section 7, vòng 11 update workflow adjustment, vòng 13 KT/CEO không HH, vòng 14 (01/05/2026) update ranking visibility.

**Chốt 01/05/2026 (vòng 14)**:
- **BS xem KH**: ❌ trong app HH. BS xem thông tin KH qua iHOS (đã có quy trình y tế).
- **TC xem HH toàn PK**: ✅ thấy hết, drill-down từng NV để giám sát.
- **NV/BS xem ranking**: chỉ thấy của mình (vị trí + tier + progress lên tier kế). KHÔNG thấy leaderboard top 3 hay table người khác. Tránh demotivate NV M0 khi thấy NV M3 top.

### R-9-2: Architecture role mở

Phase 1 MVP: hardcode 5 role base (Sale, TC, BS, KT, CEO) với permission matrix R-9-1.

Phase 2 (chốt vòng 16, B-3): Permission role-based config Sapo-style:
- CEO tạo role mới qua Settings
- Set permission matrix per role (granular: per screen, per action)
- Assign user vào role (n-to-n: 1 user có thể nhiều role, 1 role nhiều user)
- Audit log mọi thay đổi role/permission

MVP không build full role-based engine, chỉ note để dev architecture đảm bảo schema permission extensible.

Source: B1 section 2 + section 12, vòng 16 mở rộng note phase 2.

### R-9-3: NV thấy lý do reject + adjustment

NV thấy dòng "Điều chỉnh ..." và "Reject HH lý do ..." trên màn HH cá nhân (transparent).

Source: B1 section 5 vòng 11 (SQ-4).

### R-9-4: Audit log privilege escalation

NV xem KH/HH của người khác (không cho phép): log đầy đủ vào AuditLog.

Source: B1 section 17.

---

## 10. Rules data retention + audit + compliance

### R-10-1: Data retention

| Loại | Giữ full | Sau đó |
|---|---|---|
| KH active (đơn trong 24 tháng) | Full | - |
| KH inactive > 24 tháng | Flag inactive | CEO review, option anonymize |
| Đơn đã đóng | 2 năm | Archive |
| HH + audit log HH | 5 năm | Archive (luật kế toán VN) |
| Audit log access | 1 năm | Xoá |
| Push notification log | 90 ngày | Xoá |
| Device binding log | 1 năm | Xoá |

Source: B1 section 17.

### R-10-2: Audit log scope

Log mọi thay đổi entity quan trọng: User, Ranking, %HH, Voucher, Order role assignment, CR state, Adjustment, Settings.

Schema AuditLog: `entity_type, entity_id, action, actor_id, before(JSON), after(JSON), timestamp`.

Source: B1 section 15.

### R-10-3: Compliance ND13

- Field `consent_at` + `consent_version` trong Customer
- Checkbox consent trên website đặt lịch (out of scope app HH)
- KH yêu cầu xoá: dev xoá thủ công (chưa self-service)
- KH yêu cầu xem data: làm việc riêng với NP

Source: B1 section 17.

### R-10-4: Money handling

- Tiền lưu bigint VND (không thập phân)
- %HH lưu decimal(5,2)
- Tính toán: decimal precision cao trong memory
- Làm tròn: half-up đến VND nguyên, chỉ làm tròn cuối cùng khi ghi CR.amount
- Hiển thị: "12,345 VND" với dấu phân cách nghìn
- HH gross only, thuế TNCN kế toán xử lý ngoài app

Source: B1 section 18.

---

## 11. Rules pay cycle

### R-11-1: Cycle definition

1 kì = 1 tháng dương lịch. Đơn thuộc kì theo `Order.created_at`.

Source: B1 section 5.

### R-11-2: Deadline payday

Ngày 5 tháng kế tiếp (configurable trong Settings).

Source: B1 section 5.

### R-11-3: Pre-payday workflow

T-10 đến T-1: Diễm review CR daily, batch duyệt theo đơn, tạo adjustment manual nếu cần, push CEO duyệt.

T+0 (last day of month) 23:59: Auto rule fire.

T+1 đến T+4 (1-4 tháng kế): Diễm + CEO finalize, CEO duyệt auto rule batch.

Source: B2.4 section 2.

### R-11-4: Payday execution

Day 5 timeline:
- 08:00-12:00: Diễm final batch review, push CEO approve outstanding
- 13:00: Export 4 file Excel (HH, bảng kê, clawback, chuyển khoản)
- 13:30: Đối soát Misa
- 16:00: Bank transfer
- 17:30: Send pay slip Zalo cá nhân

Source: B2.4 section 3.

### R-11-5: Cross-month đơn

Đơn tạo cuối tháng N, COMPLETED đầu tháng N+1:
- Đơn thuộc kì N (theo created_at)
- Nếu kịp CHO_DUYET → DUOC_DUYET trước payday N+1: vào pay slip kì N
- Nếu COMPLETED muộn (sau payday N+1): vào pay slip kì N+1 với note "Kì gốc N, chốt muộn"

Source: B2.4 section 2.4, B2.3 Scenario 10.

### R-11-6: Post-payday window 30 ngày

T+1 đến T+30:
- Diễm edit adjustment APPROVED → tạo CR delta
- Refund đơn → tạo CR clawback delta
- Khiếu nại CR → Diễm review, revert hoặc giữ

T+30: SalaryCycle status chuyển closed, lock cứng.

Source: B2.4 section 4.

### R-11-7: Khiếu nại flow

NV khiếu nại CR bị reject trong 3 ngày. Diễm review:
- Revert: CR → CHO_DUYET → DUOC_DUYET (vào pay slip ngay)
- Giữ reject: CR vĩnh viễn TU_CHOI

CEO **KHÔNG** involve trong khiếu nại flow. Diễm quyết định alone.

Source: B1 section 5, confirmed 28/04/2026.

### R-11-8: Single approver Diễm

Không có backup approver. Diễm nghỉ → pay slip delay đến khi quay lại.

Source: B1 section 5, Option A.

---

## 12. Edge cases + invariants

### R-12-1: net_profit âm → HH = 0

Nếu `net_profit < 0`: HH per row = 0 cho mọi role. Không có clawback (vì chưa chia HH).

Source: B2.3 Scenario 5B, B4 R-1-1.

### R-12-2: Order với all items skipped

Nếu mọi OrderItem.status = skipped: total_paid recompute = 0, total_cost = 0, net_profit = 0. HH = 0 cho mọi role. Order vẫn COMPLETED state.

Source: B2.3 Scenario 13, B4 R-1-1.

### R-12-3: Webhook fail recovery

iHOS webhook không tới App HH:
- App HH có endpoint admin "Replay webhook"
- Cron đối soát mỗi đêm với iHOS API order list, alert nếu inconsistency

Source: B2.3 Section 14.1.

### R-12-4: Webhook duplicate

Idempotency check: mỗi webhook có `event_id` duy nhất, lưu `idempotency_key`. Skip nếu đã processed.

Source: B1 section 11, B2.3 Section 14.2.

### R-12-5: Webhook out-of-order

Process events theo `event_timestamp`, không theo arrival order. Cho phép add row BS sau COMPLETED nếu late event valid.

Source: B2.3 Section 14.3.

### R-12-6: Concurrent edit conflict

Optimistic lock với `version` number trên Order. User save version cũ → reject với message clear, force reload.

Source: B1 section 16.

### R-12-7: Refund 1 phần ảnh hưởng tất cả role

Khi refund 1 dịch vụ: recompute net_profit, tạo CR delta proportional cho TẤT CẢ row OrderRoleAssignment active (kể cả role không liên quan dịch vụ refund).

Source: B2.3 Scenario 4 (chốt F-2 Option A).

### R-12-8: Khách bỏ về sau khi BS đã start

Row BS đã thêm khi exam_started. Item BS làm bị skip → row vẫn có. HH BS = net_profit × %HH (giảm proportional).

Source: B2.3 Scenario 13, B4 R-1-7.

### R-12-9: Customer no-show + reattempt

Đơn auto NO_SHOW lúc T+30p. Khách đến T+45p:
- Đơn O cũ vĩnh viễn NO_SHOW
- Lễ tân tạo Order MỚI cho khách trong iHOS
- Order mới có flow normal, populate role mới

Source: B2.3 Scenario 2.

### R-12-10: NV nghỉ việc trong kì lương

NV nghỉ giữa kì:
- Đơn mới tạo, chưa CONFIRMED: handover sang NV khác
- Đơn CONFIRMED, chưa COMPLETED: handover qua exception, HH cancel của người cũ, tính cho người nhận
- Đơn COMPLETED, CR chưa duyệt: GIỮ row cũ, HH chi cho NV cũ
- Đơn DUOC_DUYET: chi theo Luật Lao động VN trong 14 ngày

Source: B1 section 20, B2.3 Scenario 6.

---

## 13. Quick reference index

Cross-reference rule ↔ B1/B2 source:

| Rule ID | Source primary | Source secondary |
|---|---|---|
| R-1-* | B1 section 3, 4 | B2.3 scenarios |
| R-2-* | B2.2 v3 | B1 section 8 |
| R-3-* | B1 section 3.3, 3.5 | ADR-001, B2.3 |
| R-4-* | B1 section 6 | B2.3 Scenario 11 |
| R-5-* | B1 section 3.6 | B2.3 Scenario 12 |
| R-6-* | B1 section 5 vòng 11 | B2.4 section 4 |
| R-7-* | B1 section 5 vòng 11 | B2.4 section 2.3 |
| R-8-* | B2.2 v3 Section 1.5, 1.6 | B1 section 8 |
| R-9-* | B1 section 7, 12, 17 | - |
| R-10-* | B1 section 17, 18 | - |
| R-11-* | B1 section 5, B2.4 | - |
| R-12-* | B2.3 scenarios | B1 section 16 |

---

## 14. Open items cần resolve

Trước B5 spec, anh cần resolve các items sau (đã list trong PENDING-ITEMS):

| ID | Topic | Severity |
|---|---|---|
| I-1 đến I-4 | iHOS webhook contract | HIGH |
| B-6 | Ranking thresholds G1 | MEDIUM (block ranking screen spec) |
| B-7 | Onboarding tour G2 | LOW |
| B-12 | Phần phạt rules | MEDIUM (block AutoRule phase 2) |
| B-13 | Recall days per service | MEDIUM (block Customer Follow-up activate) |
| B-14 | Zalo OA setup | MEDIUM (block reminder + follow-up module) |
| B-15 | Cron infrastructure | LOW |
| R-4-4 | Ranking promote/demote giữa quý | LOW |

---

## 15. Bước tiếp theo

Sau B4:
- B5: Spec chi tiết từng screen (reference rules từ B4)
- B6: Plan thực thi (estimate dev, milestone, gating)

B5 prioritize 8 missing screens HIGH priority từ B3:
1. MS-2 Onboarding (đặt mục tiêu HH)
2. MS-5 Cấu hình Shift
3. MS-6 Cấu hình Auto Rule
4. MS-9 Tạo Adjustment (KT)
5. MS-10 Duyệt Adjustment (CEO)
6. MS-12 Export Excel kì lương
7. MS-3 Thông báo
8. MS-7 Customer Follow-up Dashboard
9. MS-1 Tạo đơn thành công

Plus update các screen có findings HIGH (F-3-7, F-3-13, F-3-16, F-3-19, F-3-24).

## 16. Lịch sử update

| Date | Update |
|---|---|
| 2026-04-28 v1 | Tạo file. Consolidate ~75 business rules từ B1+B2 thành 12 sections. Quick reference index + open items. |
| 2026-05-01 v2 | Reframe R-5-2 cap warning intent: awareness signal cho process improvement, KHÔNG phải tool cut HH retroactive. Default NV full HH per formula. Adjustment giảm chỉ khi suspected abuse với lý do cụ thể. |
| 2026-05-01 v3 | Vòng 16 resolve aggregated questions: R-7-2 bonus formula = HH gốc × bonus_pct × overshoot (A-1). R-8-5 recall chỉ từ iHOS webhook, bỏ Service default fallback (A-3). R-9-2 phase 2 permission Sapo-style note (B-3). |
