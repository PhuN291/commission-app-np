# B5 Batch 3 Screen Specs (Update Core Existing)

Status: WIP draft 1
Ngày: 2026-05-01
Phụ thuộc: B1 vòng 14, B4 v2, B5.1 v2, B5.2 v1

Mục đích: Spec update cho 3 screen core hiện có nhưng thiếu feature theo B1+B2+B4 source of truth.

3 screens trong batch:
- **S-Income** (income.tsx): Add adjustment + clawback + khiếu nại UI cho NV (F-3-10)
- **S-Order-Detail** (order-detail.tsx): Add khiếu nại CTA + OrderItem.status mark + refund display (F-3-4, F-3-5, F-3-6)
- **S-Admin-Commission-Approval**: Add Export tab + Khiếu nại review (F-3-13)

Plus: 1 note ngắn cho S-Orders filter (F-3-2).

---

## Screen 1: S-Income (Hoa hồng cá nhân - NV view)

### 1.1 Mục đích

NV (Sale, BS, TC) xem chi tiết HH cá nhân theo kì lương. Bao gồm HH gốc, adjustment, clawback, khiếu nại flow. Transparent về lý do mọi điều chỉnh.

### 1.2 Actor + Permission

- **Access**: Sale, BS, TC (chỉ thấy của mình)
- **NOT**: KT, CEO (xem qua admin-commission-approval, không phải view này)

### 1.3 Trigger

Tap menu "Hoa hồng" trong bottom nav.

### 1.4 Layout

Mobile scrollable với month selector + sections.

```
┌─────────────────────────┐
│ Hoa hồng - Lan          │
├─────────────────────────┤
│ Tháng 05/2026     [▼]   │
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │ Hoa hồng dự kiến    │ │
│ │ 640,000đ            │ │
│ │ Mục tiêu: 7,200,000 │ │
│ │ ████░░░░ 89%        │ │
│ └─────────────────────┘ │
│                         │
│ ─── HH gốc theo đơn ──  │
│                         │
│ ┌─────────────────────┐ │
│ │ Đơn O-001 (Khám TQ) │ │
│ │ Sale 3% × 500k      │ │
│ │ = 15,000đ ✅ duyệt  │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Đơn O-005 (Thủ thuật)│ │
│ │ Sale 3% × 800k      │ │
│ │ = 24,000đ ⏳ chờ duyệt│ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Đơn O-130 (Khám TQ) │ │
│ │ Sale 3% × 400k      │ │
│ │ = 12,000đ ❌ từ chối│ │
│ │ Lý do: "Khách phàn nàn"│ │
│ │ [Khiếu nại]         │ │
│ └─────────────────────┘ │
│                         │
│ Tổng HH gốc: 540,000đ   │
│                         │
│ ─── Điều chỉnh ────     │
│                         │
│ ┌─────────────────────┐ │
│ │ +200,000đ Thưởng    │ │
│ │ "Đạt target tháng"  │ │
│ │ Auto rule | 31/05   │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ -150,000đ Phạt      │ │
│ │ "Tư vấn sai gói     │ │
│ │ khách KH-1234"      │ │
│ │ Bởi Diễm | 03/05    │ │
│ └─────────────────────┘ │
│                         │
│ Tổng adjustment: +50k   │
│                         │
│ ─── Clawback kì trước ─ │
│                         │
│ ┌─────────────────────┐ │
│ │ -30,000đ            │ │
│ │ Đơn O-099 refund    │ │
│ │ Kì gốc: 04/2026     │ │
│ └─────────────────────┘ │
│                         │
│ Tổng clawback: -30k     │
│                         │
│ ───────────────         │
│ Net HH: 540 + 50 - 30   │
│       = 560,000đ        │
│                         │
└─────────────────────────┘
```

### 1.5 Components

- `Select` month picker (default current cycle)
- `Card` hero summary (HH total + KPI progress)
- `Section` repeated 3 lần: HH gốc, Adjustment, Clawback
- `Row` per CR/adjustment/clawback với:
  - Icon status (✅ duyệt / ⏳ chờ / ❌ từ chối)
  - Description + amount
  - Lý do (cho từ chối/adjustment)
  - CTA "Khiếu nại" (cho từ chối, trong 3 ngày window)

### 1.6 States + Interactions

| State | Action | Result |
|---|---|---|
| Initial | Load month current | Fetch HH detail, display |
| Switch month | Tap selector | Fetch other month data |
| Tap CR detail | Tap card | Sheet mở chi tiết đơn |
| Tap Khiếu nại | Tap CTA cho CR TU_CHOI | Sheet mở form khiếu nại |
| Submit khiếu nại | Submit form | API call, status update KHIEU_NAI |

### 1.7 Khiếu nại sub-flow

```
Tap "Khiếu nại" trên CR TU_CHOI
→ Sheet mở:
  ┌────────────────────────┐
  │ Khiếu nại HH đơn O-130 │
  ├────────────────────────┤
  │ Lý do từ chối:         │
  │ "Khách phàn nàn"       │
  │                        │
  │ Nội dung khiếu nại:    │
  │ ┌────────────────────┐ │
  │ │ Em đã refund cho   │ │
  │ │ khách rồi, NP ko   │ │
  │ │ mất doanh thu...   │ │
  │ └────────────────────┘ │
  │                        │
  │ Đính kèm:              │
  │ [📷 Thêm screenshot]   │
  │                        │
  │ [Gửi khiếu nại]        │
  │                        │
  │ ⚠️ Chỉ khiếu nại 1 lần│
  │ ⚠️ Hết 3 ngày sau từ  │
  │   chối thì lock cứng  │
  └────────────────────────┘
→ Submit → CR status TU_CHOI → KHIEU_NAI
→ Notify Diễm có khiếu nại mới
```

### 1.8 Data binding

```
Entity: CommissionRecord (existing)
Fields (display):
  - id, order_id, role_id, beneficiary_user_id,
  - role_at_time, ranking_at_time, pct_at_time,
  - amount, stage, reject_reason

Entity: AdjustmentRequest (existing)
Fields (display):
  - type, amount, reason_text, source (manual/auto_rule),
  - approved_by_user_id, approved_at

Entity: ComplaintLog (mới)
Fields:
  - id, cr_id, beneficiary_user_id,
  - content (text), attachments (JSON list),
  - submitted_at, reviewed_at, reviewed_by_user_id,
  - resolution (revert/keep), resolution_note
```

API:
```
GET /api/income/{user_id}?cycle_id=X
Response: {
  total_estimated, target,
  cr_list: [...], adjustments: [...], clawbacks: [...],
  net_hh
}

POST /api/income/cr/{id}/complaint
Body: { content, attachments }
Response: { complaint_id }
```

### 1.9 Validation

- Khiếu nại content: required, min 20 chars
- Khiếu nại window: chỉ active khi `now() < CR.rejected_at + 3 days`
- Đính kèm: max 5 file, mỗi file < 5MB

### 1.10 Edge cases

| Case | Handling |
|---|---|
| Tháng chưa có đơn | Empty state "Chưa có HH tháng này" |
| Khiếu nại sau 3 ngày | Button disabled với hint "Đã quá hạn khiếu nại" |
| Khiếu nại đã submit, chờ Diễm review | Status badge "Đang xử lý khiếu nại" |
| Đa role per đơn (NV vừa Sale vừa role khác) | Hiện tách 2 row |
| Adjustment AUTO_PENDING (CEO chưa duyệt) | KHÔNG hiển thị (NV không thấy adjustment chưa approved) |
| Cycle locked + edit window passed | Read-only, không cho khiếu nại nữa |

### 1.11 Cross-reference B4 rules

- R-2-3: CR state machine (đặc biệt KHIEU_NAI flow)
- R-6-7: Transparent visibility cho NV
- R-9-1: Permission của mình
- R-11-7: Khiếu nại flow (Diễm decide alone)

### 1.12 Open questions

- Q-Income-A: NV thấy adjustment AUTO_PENDING chưa duyệt không? Đề xuất KHÔNG (chỉ hiện sau APPROVED).
- Q-Income-B: NV xem được tháng cũ (vd 6 tháng trước) không? Đề xuất CÓ, history vĩnh viễn.

---

## Screen 2: S-Order-Detail (Chi tiết đơn)

### 2.1 Mục đích

Xem chi tiết đơn (info, status, role assignment, items, payment, HH chi tiết). Add khiếu nại CTA, OrderItem.status mark, refund partial display.

### 2.2 Actor + Permission

- **Access**: Tất cả role (filter data theo permission)
- **NV (Sale)**: chỉ xem đơn của mình
- **BS**: chỉ xem đơn BS thực hiện
- **TC, KT, CEO**: toàn PK

### 2.3 Trigger

Tap đơn từ orders list, customer history, income, etc.

### 2.4 Layout (mobile scrollable)

```
┌─────────────────────────┐
│ ← O-130 / Khám TQ       │
├─────────────────────────┤
│                         │
│ Trạng thái              │
│ ████──── COMPLETED      │
│ Timeline:               │
│ • CONFIRMED   01/05 14h │
│ • IN_PROGRESS 02/05 9h  │
│ • COMPLETED   02/05 11h │
│                         │
│ ─── Khách hàng ───      │
│ Nguyễn Văn A            │
│ 0901234567              │
│                         │
│ ─── Dịch vụ ───         │
│ ┌─────────────────────┐ │
│ │ A. Khám tổng quát   │ │
│ │ 500,000đ ✅ completed│ │
│ │ BS: Minh            │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ B. Siêu âm bụng     │ │
│ │ 300,000đ ⏭️ skipped │ │
│ │ Lý do: Khách bỏ về  │ │
│ │ [Mark completed]    │ │
│ │ [Edit reason]       │ │
│ └─────────────────────┘ │
│                         │
│ ─── Tài chính ───       │
│ Niêm yết:    1,000,000  │
│ BH:            -200,000 │
│ Voucher:        -50,000 │
│ Khách trả:     750,000  │
│ Cost:          -300,000 │
│ net_profit:    450,000  │
│                         │
│ ─── Hoa hồng ───        │
│ ┌─────────────────────┐ │
│ │ Sale: Lan (M2 3%)   │ │
│ │ HH = 13,500đ ✅ duyệt│ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ TC: Hà (2%)         │ │
│ │ HH = 9,000đ ✅ duyệt│ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ BS: Minh (L2 5%)    │ │
│ │ HH = 22,500đ ✅ duyệt│ │
│ └─────────────────────┘ │
│                         │
│ Tổng HH: 45,000đ        │
│ % cap: 10% ✅ OK        │
│                         │
│ ─── Hành động ───       │
│ [Khiếu nại HH] (NV)     │
│ [Reject CR] (KT)        │
│ [Hủy đơn] (NV/TC)       │
└─────────────────────────┘
```

### 2.5 Components

- `Timeline` cho status transitions với markers
- `Section` repeat: KH, Dịch vụ, Tài chính, HH, Action
- `Row` per item với status icon + lý do skipped
- `ActionButton` per OrderItem (mark completed, edit reason)
- `Card` per CR row với role + amount + status
- Action buttons gated theo role

### 2.6 OrderItem.status management (cho BS)

```
Trên item B status = skipped:
[Mark completed]: Đổi status từ skipped → completed
  (vd BS realize đã làm xong, lễ tân forgot to mark)
[Edit reason]: Edit skipped_reason
  (vd lễ tân chọn sai reason: customer_left → patient_changed_mind)

Permission: BS thực hiện item + Diễm + CEO có thể edit.
TC + NV (Sale): xem only.
```

### 2.7 Khiếu nại CTA

NV thấy CTA "Khiếu nại HH" trên CR của mình nếu:
- Status = TU_CHOI
- Trong 3 ngày sau rejected_at

CTA disable nếu:
- Status = DUOC_DUYET, CHO_DUYET, KHIEU_NAI, CANCEL
- Quá 3 ngày

### 2.8 Reject CR CTA (cho Diễm)

Diễm thấy "Reject" button trên CR status = CHO_DUYET. Tap → sheet nhập lý do → submit.

### 2.9 Data binding

```
Entity: Order (existing) + OrderItem + OrderRoleAssignment + CommissionRecord
Fields displayed: tất cả relevant fields

API:
GET /api/orders/{id}
Response: { order, items, role_assignments, crs }

PATCH /api/orders/{id}/items/{item_id}/status
Body: { status: 'completed' | 'skipped', skipped_reason?: string }

POST /api/orders/{id}/cr/{cr_id}/reject (Diễm)
Body: { reason }

POST /api/orders/{id}/cr/{cr_id}/complaint (NV)
Body: { content, attachments }
```

### 2.10 Edge cases

| Case | Handling |
|---|---|
| BS edit OrderItem.status đã COMPLETED + DUOC_DUYET | Block, hint "Đơn đã chốt lương" |
| BS edit reason sau 30 ngày (window pass) | Block |
| Đơn REFUND_PARTIAL: hiển thị item refunded | Strikethrough giá, tag "Refund 200k" |
| Đơn REFUND_FULL: tất cả CR cancel | Hiển thị toàn đơn với badge "Đã refund" |
| Multi-role per user (vd Lan vừa Sale vừa role khác) | Hiển thị tách 2 row |

### 2.11 Cross-reference B4 rules

- R-1-7: BS row per-doctor, không xoá khi item skipped
- R-2-1: Order state machine
- R-2-3: CR state machine
- R-2-5: OrderItem.status
- R-9-1: Permission per role
- R-11-7: Khiếu nại flow

### 2.12 Open questions

- Q-OD-A: BS có quyền edit reason của lễ tân nhập không? Đề xuất CÓ (BS biết case y tế chính xác hơn).
- Q-OD-B: NV thấy "%cap" của đơn (45k = 10%) hay ẩn? Đề xuất hiện cho transparent.

---

## Screen 3: S-Admin-Commission-Approval (Duyệt HH cho KT)

### 3.1 Mục đích

KT trưởng (Diễm) review + duyệt CR theo cycle, manage khiếu nại review, trigger Export Excel kì lương (link MS-12).

### 3.2 Actor + Permission

- **Access**: KT (Diễm) only
- **CEO** có thể view nhưng không action

### 3.3 Trigger

Tap menu "Duyệt HH" admin section.

### 3.4 Layout

Tab structure:

```
┌─────────────────────────┐
│ ← Duyệt Hoa hồng        │
├─────────────────────────┤
│ [Cycle 05/2026 ▼]       │
├─────────────────────────┤
│ [Duyệt CR] [Khiếu nại]  │
│ [Adjustment] [Export]   │
├─────────────────────────┤
│                         │
│ Tab "Duyệt CR" active:  │
│                         │
│ Filter:                 │
│ [Tất cả] [Chờ duyệt 20] │
│ [Vượt cap 15] [Refund 5]│
│                         │
│ ┌─────────────────────┐ │
│ │ Đơn O-005 / Lan     │ │
│ │ HH 24,000đ chờ duyệt│ │
│ │ [Xem] [Duyệt]       │ │
│ │ [Reject + lý do]    │ │
│ └─────────────────────┘ │
│ ...                     │
│                         │
│ Bulk actions:           │
│ [Duyệt tất cả CR đơn X] │
└─────────────────────────┘
```

Tab "Khiếu nại":

```
┌─────────────────────────┐
│ Khiếu nại đang chờ:     │
│                         │
│ ┌─────────────────────┐ │
│ │ Lan / Đơn O-130     │ │
│ │ Reject lý do "Khách │ │
│ │ phàn nàn"           │ │
│ │ Khiếu nại nội dung: │ │
│ │ "Em đã refund..."   │ │
│ │ [Đính kèm 1 ảnh]    │ │
│ │                     │ │
│ │ [Revert + duyệt]    │ │
│ │ [Giữ reject]        │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

Tab "Adjustment": link đến MS-9 (Tạo) + show queue PENDING (chờ CEO duyệt). Diễm xem status adjustment đã tạo.

Tab "Export": link đến MS-12 spec (đã có Batch 1).

### 3.5 Components

- `Select` cycle picker
- `TabBar` 4 tabs
- `Chips` filter (Tất cả / Chờ duyệt / Vượt cap / Refund)
- `Card` per CR / khiếu nại
- `NPButton` primary "Duyệt" / "Revert"
- `NPButton` ghost "Reject" / "Giữ reject"
- `Sheet` modal cho reject lý do

### 3.6 Bulk approve flow

Diễm xem đơn O-005 có 3 CR (Sale, TC, BS). Click đơn → expand → 3 CR.

Action options:
- Duyệt từng CR (granular)
- "Duyệt tất cả CR đơn này" (bulk per-order)
- "Reject 1 CR cụ thể" (vd reject Sale role nhưng giữ TC + BS)

### 3.7 Khiếu nại review flow

Diễm thấy danh sách khiếu nại trong tab. Per khiếu nại:
- Read content + attachment NV gửi
- Quyết định:
  - **Revert + duyệt**: CR KHIEU_NAI → CHO_DUYET → DUOC_DUYET. Notify NV.
  - **Giữ reject**: CR KHIEU_NAI → TU_CHOI vĩnh viễn. Notify NV với lý do bổ sung.

CEO KHÔNG involve trong flow này (R-11-7).

### 3.8 Filter "Vượt cap 10%"

Filter đơn có `tổng HH chi / net_profit > 10%`. Hiển thị để Diễm review xem có gì bất thường (B4 R-5-2: awareness signal, không cut HH retroactive).

Diễm review xong:
- Default: duyệt full
- Edge case: nếu thấy abuse rõ ràng → có thể tạo Adjustment giảm (qua MS-9)

### 3.9 Data binding

```
Entity: CommissionRecord, ComplaintLog (mới B5.3 Screen 1)

API:
GET /api/admin/commission/cr-list?cycle_id=X&filter=...
GET /api/admin/commission/complaints?cycle_id=X
POST /api/admin/commission/cr/{id}/approve (Diễm)
POST /api/admin/commission/cr/{id}/reject
Body: { reason }
POST /api/admin/commission/complaint/{id}/resolve
Body: { resolution: 'revert' | 'keep', note }
POST /api/admin/commission/cr/bulk-approve
Body: { order_id }  // approve tất cả CR của 1 đơn
```

### 3.10 Validation

- Reject reason: required, min 10 chars
- Khiếu nại resolution note: optional cho revert, required cho giữ reject
- Bulk approve: chỉ áp CR status CHO_DUYET

### 3.11 Edge cases

| Case | Handling |
|---|---|
| Đơn có CR mixed (vd 1 CR DUOC_DUYET, 2 CR CHO_DUYET) | Bulk approve chỉ áp CR CHO_DUYET |
| Khiếu nại expired (quá 3 ngày) | KHÔNG hiển thị trong queue (đã auto lock) |
| Diễm reject CR đã được khiếu nại revert lại | Allowed (cycle KHIEU_NAI → CHO_DUYET → CHO_DUYET → TU_CHOI lần 2) |
| NV khiếu nại lần 2 sau Diễm giữ reject | Block (1 khiếu nại / 1 reject) |
| Cycle chốt sát giờ payday: còn CR pending | Cảnh báo Diễm "Còn N CR chưa duyệt, không thể export" (block MS-12) |

### 3.12 Cross-reference B4 rules

- R-2-3: CR state machine
- R-5-2: Cap warning intent
- R-9-1: Permission KT only
- R-11-3, R-11-4: Pay cycle workflow
- R-11-7: Khiếu nại flow

### 3.13 Open questions

- Q-CA-A: Diễm thấy được "Tổng HH dự chi" toàn cycle realtime không? Đề xuất CÓ (số tóm gọn ở header).
- Q-CA-B: Diễm có thể bulk approve toàn cycle (tất cả đơn 1 click) không? Đề xuất KHÔNG (risk too high), chỉ bulk per-order.

---

## 4. Quick note: S-Orders filter update (F-3-2)

`orders.tsx` hiện có filter: all, pending, confirmed, no-show, rescheduled.

Cần update theo state machine 8 states (B4 R-2-1):
- Add: IN_PROGRESS, COMPLETED, REFUND_FULL, REFUND_PARTIAL, CANCELLED
- Remove: "rescheduled" (không có trong B4 state machine, có thể là dời lịch sub-action)

Update Filter chip: `[Tất cả] [DRAFT] [CONFIRMED] [IN_PROGRESS] [COMPLETED] [CANCELLED] [NO_SHOW] [REFUND_*]`

Cost dev: 1-2 ngày.

---

## 5. Open issues batch 3

| ID | Question | Severity |
|---|---|---|
| Q-Income-A | NV thấy adjustment AUTO_PENDING không | LOW (recommend NO) |
| Q-Income-B | NV xem tháng cũ (6 tháng trước) không | LOW (recommend YES) |
| Q-OD-A | BS edit reason lễ tân nhập | LOW (recommend YES) |
| Q-OD-B | NV thấy %cap đơn không | LOW (recommend YES) |
| Q-CA-A | Diễm thấy tổng HH cycle realtime | LOW (recommend YES) |
| Q-CA-B | Bulk approve toàn cycle | MEDIUM (recommend NO) |

Total: 6 questions, đa số LOW. Có thể defer khi dev start.

---

## 6. Cost dev estimate batch 3

| Screen | Cost ngày |
|---|---|
| S-Income (add adjustment + clawback + khiếu nại) | 4-5 |
| S-Order-Detail (add CTA + status mark + refund display) | 5-7 |
| S-Admin-Commission-Approval (add tab Khiếu nại + Export integration) | 6-8 |
| S-Orders filter update | 1-2 |
| **Total** | **16-22 ngày** |

---

## 7. Bước tiếp theo

Sau Batch 3:
- **Batch 4**: 3 screen mới (Shift config standalone, Auto Rule editor, Customer Follow-up Dashboard) + ranking conditional render (F-3-25)
- **Batch 5**: Cleanup (Tạo đơn thành công, Thông báo, Bàn giao, Component reference doc)

Còn 2 batch B5.

## 8. Lịch sử update

| Date | Update |
|---|---|
| 2026-05-01 v1 | Tạo file. Spec 3 screen update + 1 quick note. 6 open questions. Cost dev 16-22 ngày. |
