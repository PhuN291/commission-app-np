# B5 Batch 1 Screen Specs

Status: WIP draft 1
Ngày: 2026-05-01
Phụ thuộc: B1 FINAL vòng 14, B2.1-B2.4, B3, B4 v2, ADR-001

Mục đích: Spec chi tiết 4 screen mới HIGH priority cho dev implement. Mỗi screen reference rules từ B4 thay vì repeat.

Convention:
- Mỗi screen có ID format `MS-X` (Missing Screen X từ B3) hoặc `S-X` (existing screen update)
- `R-X-Y`: rule reference từ B4
- Mobile-first design (B1 NFR: mobile only cho Sale/BS, web optional cho admin)
- Component reference: NP design system (`Screen`, `Card`, `Row`, `NPButton`, `Sheet`, `Badge`, etc.)

---

## Screen 1: MS-2 Onboarding (Đặt mục tiêu HH tháng)

### 1.1 Mục đích

Bắt buộc NV (Sale, BS) đặt mục tiêu HH cho tháng hiện tại trước khi vào app sử dụng. Tạo commitment cá nhân và baseline để so sánh actual vs target.

### 1.2 Actor + Permission

- **Access**: NV ĐD-Sale (Lan, Hằng, Trang) + BS (Minh, Hằng-D, Vinh)
- **NOT access**: TC (Hà), KT (Diễm), CEO (Nguyên) - không có target HH cá nhân
- Permission rule: chỉ user có HH role được populate vào OrderRoleAssignment mới qua onboarding

### 1.3 Trigger (khi nào hiện)

3 trigger:
1. **Login lần đầu**: User mới login (chưa có monthly_target nào)
2. **Đầu mỗi tháng**: Ngày 1 mỗi tháng, lần login đầu tiên trong tháng → mở onboarding modal
3. **Quay lại sau nghỉ lâu**: User offboarded → reactivated → onboarding lại

App detect bằng:
- Check `User.monthly_target` cho cycle hiện tại = NULL → trigger
- Modal blocking, không skip được (B1 section 10 chốt)

### 1.4 Layout

Mobile-first full screen modal, không có bottom nav, không header (focus task).

```
┌─────────────────────────────┐
│ [Back] (disabled, không skip) │
│                             │
│      Tháng 05/2026          │
│  Đặt mục tiêu HH cho mình   │
│                             │
│ ┌─────────────────────────┐ │
│ │ 💡 Gợi ý: 110% tháng    │ │
│ │   trước = 7,920,000đ    │ │
│ │   (TB 3 tháng: 7.2tr)   │ │
│ └─────────────────────────┘ │
│                             │
│ Mục tiêu HH (VND)           │
│ ┌─────────────────────────┐ │
│ │  7,920,000              │ │
│ └─────────────────────────┘ │
│                             │
│ Mục tiêu số đơn (optional)  │
│ ┌─────────────────────────┐ │
│ │  20                     │ │
│ └─────────────────────────┘ │
│                             │
│ [Bắt đầu tháng] (primary)   │
└─────────────────────────────┘
```

### 1.5 Components

- `Screen` wrapper (no tabBar, no header back button enabled)
- `Card` cho hero suggestion
- `Input` (number) với format VND (12,345 VND)
- `Input` (number) cho số đơn
- `NPButton` primary "Bắt đầu tháng"

### 1.6 States + Interactions

| State | Trigger | Result |
|---|---|---|
| Initial | Modal mở | Show gợi ý default, input pre-filled |
| Editing | User typing | Live validate (number, > 0) |
| Submitting | User tap "Bắt đầu tháng" | API call, button loading state |
| Success | API 200 | Modal close, redirect dashboard |
| Error | API failed | Toast error, allow retry |

Validation:
- Mục tiêu HH: required, integer > 0, max = 1,000,000,000đ (sanity check)
- Mục tiêu số đơn: optional, integer >= 0

### 1.7 Data binding

```
Entity: User
Field updated:
  - monthly_target_hh (bigint)
  - monthly_target_orders (int, nullable)
  - target_set_at (timestamp)
  - target_cycle_id (FK to SalaryCycle)
```

API endpoint:
```
POST /api/onboarding/set-target
Body: {
  monthly_target_hh: number,
  monthly_target_orders: number | null,
  cycle_id: string
}
Response: { success: boolean }
```

Logic suggestion:
```
suggestion_hh = max(
  prev_month.actual_hh × 1.1,
  avg_3_months.actual_hh
)

if user.history < 3 months:
  suggestion_hh = team_avg.actual_hh
```

### 1.8 Validation rules

- monthly_target_hh > 0
- monthly_target_hh <= 1,000,000,000đ (giới hạn sanity)
- Không cho phép skip
- Không cho phép submit nếu input invalid

### 1.9 Edge cases

| Case | Handling |
|---|---|
| NV mới hoàn toàn (chưa có lịch sử) | Suggestion = team_avg hoặc 0 (không có team data) |
| NV nghỉ thai sản 6 tháng quay lại | Treat as new + show banner "Chào mừng quay lại" |
| User accidentally close app giữa onboarding | Reopen → modal hiện lại (chưa save) |
| Network down khi submit | Toast retry, giữ input |
| User cố ý đặt mục tiêu rất thấp (1k) | Allow, không block. CEO xem sau qua dashboard |
| Tháng cycle override (vd test): | Admin có thể reset target qua admin-staff (defer phase 2) |

### 1.10 Cross-reference B4 rules

- R-9-1: Permission (chỉ NV có HH)
- R-11-1: Cycle theo created_at, monthly target gắn với cycle

### 1.11 Open questions

- Q-MS2-A: Quick tour (B1 G2 chưa chốt) có gắn với onboarding không? Defer phase 2.
- Q-MS2-B: NV có thể edit target giữa tháng không? Đề xuất KHÔNG (commitment cứng).
- Q-MS2-C: TC (Hà) có target HH không? B4 R-1-2 nói TC có HH (2%). Có cần onboarding không? Đề xuất CÓ, nhưng giao diện đơn giản (TC HH ít hơn NV).

[CHỜ ANH CHỐT Q-MS2-C]: TC có onboarding không?

---

## Screen 2: MS-9 Tạo Adjustment (KT trưởng)

### 2.1 Mục đích

Cho KT trưởng (Diễm) tạo manual adjustment HH cho NV. Workflow đơn nguồn (R-6-1): Diễm tạo → CEO duyệt.

### 2.2 Actor + Permission

- **Access**: KT trưởng (Diễm) only
- **NOT access**: NV, BS, TC, CEO (CEO duyệt qua MS-10, không tạo trực tiếp)
- Note: B4 R-6-8 cho phép adjustment cho mọi user kể cả Diễm và Nguyên (vd CEO thưởng Diễm cuối năm). Trong case CEO muốn thưởng Diễm: CEO nói tay với Diễm, Diễm tự nhập (audit log ghi created_by=Diễm, beneficiary=Diễm, reason="CEO chỉ định").

### 2.3 Trigger

Diễm access từ:
- Tab "Adjustment" trong screen Hoa Hồng (admin-commission-approval)
- Hoặc deep link từ chi tiết đơn (vd Diễm xem đơn O-130, bấm "Tạo adjustment cho đơn này")

### 2.4 Layout

Sheet modal trượt từ dưới lên (mobile pattern).

```
┌─────────────────────────────┐
│ × Tạo điều chỉnh HH         │
├─────────────────────────────┤
│                             │
│ Người nhận                  │
│ ┌─────────────────────────┐ │
│ │ 🔍 Chọn nhân viên     ▼ │ │
│ └─────────────────────────┘ │
│                             │
│ Loại                        │
│ [Thưởng] [Phạt]             │
│                             │
│ Mô tả chi tiết              │
│ ┌─────────────────────────┐ │
│ │ Tư vấn sai gói khách    │ │
│ │ KH-1234 đơn O-099...    │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ Số tiền (VND)               │
│ ┌─────────────────────────┐ │
│ │ -200,000                │ │
│ └─────────────────────────┘ │
│                             │
│ Áp dụng kì lương            │
│ ┌─────────────────────────┐ │
│ │ Tháng 05/2026         ▼ │ │
│ └─────────────────────────┘ │
│                             │
│ ─── Tác động dự kiến ───    │
│ Lan kì 05/2026:             │
│   HH hiện tại: 620,000đ     │
│   Sau điều chỉnh: 420,000đ  │
│   (-200,000đ)               │
│                             │
│ [Gửi CEO duyệt] (primary)   │
└─────────────────────────────┘
```

### 2.5 Components

- `Sheet` modal full-height
- `SearchField` cho người nhận (search NV by name/phone)
- `Chips` cho loại (Thưởng/Phạt) - segmented control
- `Textarea` cho mô tả chi tiết (required, freetext, không có dropdown reason code)
- `Input` (number) cho số tiền với prefix +/-
- `Select` cho kì lương (default = current cycle, có thể chọn cycle tương lai)
- **`Card` preview tác động** (read-only): show HH hiện tại của beneficiary trong cycle áp dụng + HH sau adjustment + delta
- `NPButton` primary "Gửi CEO duyệt"

### 2.6 States + Interactions

| State | Action | Result |
|---|---|---|
| Initial | Sheet mở | Form trống |
| Editing | Diễm nhập | Live validate |
| Submitting | Tap "Gửi CEO duyệt" | API call, button loading |
| Success | API 200 | Sheet close, toast "Đã gửi", refresh queue |
| Error | API failed | Toast error |

Validation:
- Beneficiary user: required
- Loại: required
- Reason: required (cả code và text)
- Amount: required, integer != 0, sign tự động theo loại (Thưởng = +, Phạt = -)
- Salary cycle: required, không cho chọn cycle đã LOCKED

### 2.7 Data binding

```
Entity: AdjustmentRequest
Fields:
  - id (auto)
  - beneficiary_user_id (FK User)
  - type ('thưởng' | 'phạt')
  - reason_text (text, required, freetext)
  - amount (bigint, signed: thưởng = positive, phạt = negative)
  - salary_cycle_id (FK SalaryCycle)
  - status ('PENDING')
  - source ('manual')
  - created_by_user_id = Diễm
  - created_at = now()

Note: bỏ field `reason_code` (đã chốt 01/05: không dùng dropdown,
      chỉ freetext).
```

API:
```
POST /api/adjustments/create
Body: {
  beneficiary_user_id, type, reason_text,
  amount, salary_cycle_id
}
Response: { id, status: 'PENDING' }

GET /api/adjustments/preview-impact
Query: { beneficiary_user_id, salary_cycle_id, amount }
Response: {
  current_hh: number,
  after_adjustment: number,
  delta: number
}
```

Logic preview:
```
current_hh = sum(CR DUOC_DUYET) + sum(adjustments APPROVED)
   của beneficiary trong cycle
after_adjustment = current_hh + amount
```

Side effect: push notify CEO (Nguyên) về adjustment mới.

### 2.8 Validation rules

- Diễm không thể tạo adjustment cho user `pending_offboarding` (block, hint "User đang nghỉ việc")
- Adjustment cho cycle đã LOCKED: block với error
- Adjustment > 5,000,000đ: warning "Số tiền lớn, anh chắc chưa?" (không block)

### 2.9 Edge cases

| Case | Handling |
|---|---|
| Diễm muốn tạo cho NV nghỉ việc | Block (use offboarding pay flow ngoài) |
| Adjustment cycle tương lai (vd tháng 06 khi đang tháng 05) | Allow, sẽ tự apply khi cycle 06 mở |
| Reason "Custom": text required dài hơn (min 20 chars) | Validate |
| User network drop khi submit | Retry, không tạo duplicate (idempotency key) |
| Diễm muốn edit sau submit (chưa CEO duyệt) | Cancel + re-create (không support edit ở PENDING state) |
| CEO chưa duyệt khi cycle close (sau payday) | Adjustment hold sang cycle kế tiếp |

### 2.10 Cross-reference B4 rules

- R-6-1: Workflow đơn nguồn
- R-6-3, R-6-4: Edit window 30 ngày + clawback (xem MS-9 sub-flow Edit)
- R-6-5: Không limit amount, mọi cái phải duyệt
- R-6-6: Alert > 3 adjustment/NV/tháng
- R-6-8: Adjustment cho mọi user kể cả KT/CEO
- R-9-1: Permission (Diễm only)
- R-10-2: Audit log

### 2.11 Sub-flow: Edit adjustment APPROVED (within 30 days)

Trigger: Diễm xem adjustment APPROVED trong queue, bấm "Edit" (chỉ available trong 30 ngày sau payday).

UI same form như Tạo, nhưng pre-filled với data cũ. Submit → tạo CR delta (logic R-6-4).

Sau T+30: Edit button disabled, hint "Đã quá 30 ngày, không sửa được".

### 2.12 Open questions

- Q-MS9-A: Reason code list (predefined enum). Cần anh confirm danh sách reason: Tư vấn sai, Thưởng nỗ lực, Phạt complaint, Phạt đi muộn, Custom. Defer phase 2 cho rule phạt detail (B-12).
- Q-MS9-B: Diễm có cần "preview HH ảnh hưởng" trước khi submit không? Vd hiện trước "Lan: HH cũ 620k - 200k = 420k". Đề xuất CÓ, dễ verify.

---

## Screen 3: MS-10 Duyệt Adjustment (CEO)

### 3.1 Mục đích

CEO (Nguyên) review queue adjustment PENDING + AUTO_PENDING, bulk approve hoặc per-record reject.

### 3.2 Actor + Permission

- **Access**: CEO only
- **NOT access**: tất cả role khác

### 3.3 Trigger

CEO access từ:
- Push notification "Có 8 adjustment chờ duyệt"
- Badge trong dashboard CEO
- Direct URL `/ceo/adjustments`

Workflow B2.4 timeline ngày 5: CEO mở queue lúc 09:30 sau khi Diễm push.

### 3.4 Layout

Mobile-first list view với filter tab.

```
┌─────────────────────────────┐
│ ← Duyệt điều chỉnh HH       │
├─────────────────────────────┤
│ [Tất cả 8] [Manual 3]       │
│ [Auto 5] [Đã duyệt]         │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │ 👤 Lan (ĐD-Sale M2)     │ │
│ │ -200,000đ Phạt          │ │
│ │ "Tư vấn sai gói KH-1234"│ │
│ │ Tạo bởi Diễm - 04/05    │ │
│ │ Kì lương: 05/2026       │ │
│ │ [Duyệt] [Reject]        │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🤖 5 adjustments AUTO   │ │
│ │ "Thưởng đạt target tháng"│ │
│ │ Tổng: +1,200,000đ       │ │
│ │ Hiện thị danh sách    ▼ │ │
│ │ [Duyệt tất cả 5]        │ │
│ └─────────────────────────┘ │
│                             │
│ ...                         │
│                             │
├─────────────────────────────┤
│ [Duyệt tất cả AUTO_PENDING] │
└─────────────────────────────┘
```

### 3.5 Components

- `Chips` filter tab (Tất cả / Manual / Auto / Đã duyệt)
- `Card` cho mỗi adjustment
- `Avatar` + name
- `Badge` tone (success cho thưởng, critical cho phạt)
- 2 button: `NPButton` primary "Duyệt", `NPButton` ghost "Reject"
- Bulk approve sticky button bottom

### 3.6 States + Interactions

| State | Action | Result |
|---|---|---|
| Initial | Screen load | Fetch queue, display list |
| Approving (per-record) | Tap "Duyệt" | Confirm dialog (cho amount > 5tr), API call |
| Rejecting | Tap "Reject" | Modal nhập lý do reject, API call |
| Bulk approving | Tap "Duyệt tất cả AUTO" | Confirm dialog với tổng tiền, API call batch |
| Success | API 200 | Toast "Đã duyệt X", remove khỏi queue |
| Error | API failed | Toast error, retain in queue |

Bulk approve flow:
```
CEO tap "Duyệt tất cả AUTO_PENDING"
→ Confirm dialog: "Bạn duyệt 5 adjustment auto rule, tổng +1,200,000đ. Chắc chưa?"
→ CEO tap "Xác nhận"
→ API batch approve
→ All 5 → status APPROVED
→ Update queue, remove approved
```

Reject flow:
```
CEO tap "Reject"
→ Sheet mở: "Lý do reject"
→ CEO nhập textarea (required, min 10 chars)
→ Submit
→ Status REJECTED + notify Diễm
```

### 3.7 Data binding

```
Entity: AdjustmentRequest (existing từ MS-9)
Field updated:
  - status: PENDING/AUTO_PENDING → APPROVED/REJECTED
  - approved_by_user_id = CEO
  - approved_at = now()
  - reject_reason (text, nullable)
```

API:
```
POST /api/adjustments/{id}/approve
Response: { status: 'APPROVED' }

POST /api/adjustments/{id}/reject
Body: { reason: string }
Response: { status: 'REJECTED' }

POST /api/adjustments/bulk-approve
Body: { ids: [string] }
Response: { approved: number, failed: [{id, reason}] }
```

Side effect:
- Approved → trigger CR creation cho beneficiary trong cycle áp dụng
- Notify beneficiary: "Bạn nhận adjustment X VND, lý do Y"

### 3.8 Validation rules

- CEO không thể duyệt adjustment đã APPROVED/REJECTED
- Reject: reason text required, min 10 chars
- Bulk approve: chỉ áp cho status PENDING + AUTO_PENDING
- Confirm dialog cho amount > 5tr (single) hoặc total > 10tr (bulk)

### 3.9 Edge cases

| Case | Handling |
|---|---|
| CEO duyệt cho chính mình (Diễm tạo adj cho CEO) | Allow nhưng warning "Bạn đang duyệt cho chính mình" |
| Auto rule fire late (sau payday) | Vẫn duyệt được, CR vào cycle kế tiếp với note "Kì gốc N" |
| Cycle đã LOCKED | Block (cycle đã chốt, không thêm CR) |
| CEO offline trong session sắp duyệt | Local cache pending action, retry khi online |
| Adjustment khoản 50tr (rất lớn) | Strong warning, require typing "DUYỆT" để confirm |

### 3.10 Cross-reference B4 rules

- R-6-1: Workflow CEO duyệt
- R-6-2: Auto rule queue
- R-6-7: Transparent visibility cho NV
- R-9-1: Permission CEO only

### 3.11 Open questions

- Q-MS10-A: CEO có cần "edit amount before approve" không? Vd Diễm đề xuất -200k, CEO muốn chỉ -100k thay vì reject. Đề xuất KHÔNG (giữ workflow đơn giản: CEO duyệt y/n, muốn đổi thì reject + Diễm re-create). Cần anh confirm.
- Q-MS10-B: CEO duyệt qua mobile có UX OK không, hay cần web view cho bulk action? B1 chốt CEO mobile only. Nếu queue dài (50+ items) UX có thể stress.

[CHỜ ANH CHỐT Q-MS10-A]: CEO chỉ duyệt y/n, hay được edit amount?

---

## Screen 4: MS-12 Export Excel kì lương

### 4.1 Mục đích

KT trưởng (Diễm) trigger export 4 file Excel cuối kì lương. File dùng để chuyển khoản ngân hàng và gửi pay slip cho NV.

### 4.2 Actor + Permission

- **Access**: KT (Diễm) only
- **NOT access**: tất cả role khác

### 4.3 Trigger

Diễm access từ:
- Tab "Export" trong admin-commission-approval
- Hoặc CTA trên dashboard kế toán "Sẵn sàng export kì 04/2026"

### 4.4 Layout

Wizard-style đơn giản với validation gates.

```
┌─────────────────────────────┐
│ ← Export kì lương           │
├─────────────────────────────┤
│                             │
│ Chọn kì lương               │
│ ┌─────────────────────────┐ │
│ │ Tháng 04/2026         ▼ │ │
│ └─────────────────────────┘ │
│                             │
│ ─── Trạng thái kì ───       │
│                             │
│ ✅ Tổng đơn: 600            │
│ ✅ CR DUOC_DUYET: 1500/1500 │
│ ⚠️ CR còn CHO_DUYET: 0      │
│ ✅ Adjustment APPROVED: 8   │
│ ✅ Auto rule duyệt: 5       │
│ ✅ Khiếu nại đang xử: 0     │
│ ✅ Clawback delta: 5        │
│                             │
│ ─────────────────           │
│                             │
│ 4 file sẽ generate:         │
│ 📄 Bảng lương HH            │
│ 📄 Bảng kê chi tiết CR      │
│ 📄 Danh sách clawback       │
│ 📄 File chuyển khoản        │
│                             │
│ ☑️ Xác nhận khoá kì lương   │
│   (sau export không edit)   │
│                             │
│ [Export 4 file]             │
└─────────────────────────────┘
```

### 4.5 Components

- `Select` cho cycle (default current)
- `Card` cho status preview với icon ✅ / ⚠️ / ❌
- `Checkbox` "Xác nhận khoá kì lương"
- `NPButton` primary "Export 4 file" (disabled nếu validation fail)
- `Sheet` cho download progress + result

### 4.6 States + Interactions

| State | Trigger | Result |
|---|---|---|
| Initial | Screen load | Fetch cycle status, show preview |
| Validation pending | Còn CR CHO_DUYET hoặc adjustment AUTO_PENDING | Button disabled, hint cảnh báo |
| Ready | All validations pass | Button enabled |
| Exporting | Tap "Export" | Loading sheet, generate 4 file |
| Success | Files generated | Show download links + email confirm |
| Error | Generation failed | Show error, allow retry |

Validation gates:
1. Mọi CR phải DUOC_DUYET (không còn CHO_DUYET, TU_CHOI, KHIEU_NAI active)
2. Mọi adjustment trong cycle phải APPROVED hoặc REJECTED (không còn PENDING)
3. Khiếu nại trong 3-day window đã resolved
4. Cycle status = "open" hoặc "ready"

Nếu validation fail: hiển thị link "Xem 5 CR còn CHO_DUYET" → navigate to admin-commission-approval với filter.

### 4.7 Data binding

```
Entity: PayrollExport (mới, schema bổ sung B2.4)
Fields:
  - id
  - salary_cycle_id (FK)
  - exported_at, exported_by_user_id (Diễm)
  - file_excel_path (có thể là 4 paths cho 4 file)
  - status (generating/completed/failed)
  - bank_transfer_status (pending/completed/failed, update sau)
  - bank_transfer_at (nullable)

Entity: SalaryCycle (existing, B2.4)
Field updated khi export thành công:
  - status: open → locked
  - locked_at = now()
```

API:
```
GET /api/payroll/cycle-status?cycle_id=X
Response: {
  cycle_id, total_orders, cr_approved, cr_pending,
  adjustments_approved, adjustments_pending,
  clawbacks, ready_to_export: bool
}

POST /api/payroll/export
Body: { cycle_id, confirm_lock: true }
Response: {
  export_id,
  file_paths: {
    salary_summary: string,
    cr_detail: string,
    clawback_list: string,
    bank_transfer: string
  }
}
```

### 4.8 Validation rules

- Cycle status phải là "open" hoặc "ready"
- Mọi CR DUOC_DUYET hoặc CANCEL/TU_CHOI cuối cùng (không còn CHO_DUYET active)
- Mọi adjustment APPROVED hoặc REJECTED
- Khiếu nại 3-day window passed hoặc resolved
- Diễm phải tick checkbox "Xác nhận khoá kì lương"

### 4.9 4 file Excel content

**File 1: Bảng lương HH theo kì** (1 dòng/NV)
Columns: NV, Role, Tổng HH gốc, Tổng adjustment +/-, Tổng clawback, Net HH

**File 2: Bảng kê chi tiết CR** (từng dòng CR)
Columns: NV, Đơn ID, Role, %HH, net_profit, HH amount, Status

**File 3: Danh sách clawback** (kì trước phát sinh trong kì hiện tại)
Columns: NV, Đơn ID gốc, Lý do clawback (refund/adjustment edit), Delta amount, Cycle áp dụng

**File 4: File chuyển khoản** (cho Diễm tham khảo)
Columns: NV, STK, Ngân hàng, **Số tiền Net HH** (chỉ HH, KHÔNG cộng lương cứng vì app không quản lý lương cứng), Nội dung "HH kì YYYY-MM"

Note: Format file là Excel generic (không lock theo bank cụ thể). Diễm tự đọc file rồi nhập tay vào internet banking, hoặc convert sang format bank của NP (defer phase 2 nếu cần auto-upload).

### 4.10 Edge cases

| Case | Handling |
|---|---|
| Cycle với 0 đơn | Vẫn cho export (NV nhận lương cứng only) |
| Re-export sau adjustment phát sinh sát giờ | Tạo PayrollExport mới, override file cũ. Audit log đầy đủ. |
| Network drop khi generating | Retry, không tạo duplicate export |
| File Excel quá lớn (> 5MB) | Split hoặc compress |
| NV không có STK | Highlight dòng trong file 4, Diễm handle ngoài |
| Cycle đã LOCKED (export rồi) | Show file cũ với tùy chọn "Re-export" (warning override) |

### 4.11 Cross-reference B4 rules

- R-11-3, R-11-4: Pay cycle workflow
- R-11-7: Khiếu nại flow phải resolve trước export
- R-9-1: Permission Diễm only
- R-12-7: Refund 1 phần ảnh hưởng tất cả role (clawback file 3)

### 4.12 Chốt 01/05/2026

- **Q-MS12-A**: App HH KHÔNG quản lý lương cứng. Chỉ HH. File 4 chuyển khoản chỉ Net HH.
- **Q-MS12-B**: KT trưởng (Diễm) tự lo pay slip distribution (Zalo cá nhân, email, in giấy - tùy Diễm). App HH KHÔNG gửi pay slip cho NV. App chỉ generate file Excel cho Diễm.
- **Q-MS12-C**: File 4 generic Excel, KT tự đọc và nhập tay vào bank app. Bank-specific format defer phase 2.

Implication:
- App HH **không cần** integrate Zalo OA cho pay slip (tiết kiệm cost dev)
- App HH **không cần** "Pay slip view" cho NV trong app (NV nhận từ Diễm ngoài app)
- Settings không cần "Email KT" cho gửi file (Diễm download trực tiếp từ app)

---

## 5. Open issues batch 1 (đã RESOLVED 01/05/2026)

| ID | Question | Chốt |
|---|---|---|
| Q-MS2-C | TC (Hà) có onboarding mục tiêu HH không | ✅ Có |
| Q-MS9-A | Reason code list | Moot (bỏ dropdown, freetext only) |
| Q-MS9-B | Diễm preview HH ảnh hưởng trước submit | ✅ Có (preview ngắn) |
| Q-MS10-A | CEO chỉ duyệt y/n, hay edit amount | ✅ Y/N only, không edit |
| Q-MS12-A | App HH manage lương cứng hay không | ✅ KHÔNG, chỉ HH |
| Q-MS12-B | Channel send pay slip | ✅ KT tự lo, app không gửi |
| Q-MS12-C | Bank format file 4 | ✅ Generic Excel, KT nhập tay |

Tên KT trưởng: **Diễm** (replace "Linh" toàn bộ docs ngày 01/05).

Batch 1 ready for dev. Cost dev estimate: 12-16 ngày → giảm còn **9-12 ngày** (bỏ Zalo OA pay slip integration, bỏ reason code dropdown).

---

## 6. Bước tiếp theo

Sau Batch 1, B5 còn 4 batches:

- **Batch 2**: Rewrite 3 screen existing có conflict B1 (Login OTP Zalo, Admin staff, Admin settings)
- **Batch 3**: Update 3 screen core (Duyệt HH, income, Order detail)
- **Batch 4**: Spec 3 screen mới (Shift config, Auto Rule, Customer Follow-up)
- **Batch 5**: Cleanup + finalize (Tạo đơn thành công, Thông báo, Component reference doc)

Estimate: 4 sessions còn lại cho B5.

## 7. Lịch sử update

| Date | Update |
|---|---|
| 2026-05-01 v1 | Tạo file. Spec 4 screen MS-2, MS-9, MS-10, MS-12. 7 open questions cần anh chốt. |
| 2026-05-01 v2 | Resolve 7 questions. (1) Tên KT trưởng: Linh → Diễm (replace toàn bộ docs). (2) MS-9: bỏ dropdown reason code, chỉ freetext. Add preview HH ảnh hưởng trước submit. (3) MS-12: app KHÔNG quản lý lương cứng, KHÔNG gửi pay slip (KT tự lo). File 4 generic Excel, KT nhập tay bank. Cost dev giảm 12-16 → 9-12 ngày. |
