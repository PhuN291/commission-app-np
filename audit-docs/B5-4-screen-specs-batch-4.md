# B5 Batch 4 Screen Specs (3 New + 1 Update)

Status: WIP draft 1
Ngày: 2026-05-01
Phụ thuộc: B1 vòng 14, B4 v2, B5.1-5.3, ADR-001

Mục đích: Spec 3 screen mới (Shift, Auto Rule, Customer Follow-up) + 1 update (Ranking conditional render).

4 entities trong batch:
- **MS-5 Cấu hình Shift** (standalone screen từ Settings section 4)
- **MS-6 Cấu hình Auto Rule** (standalone từ Settings section 6)
- **MS-7 Customer Follow-up Dashboard** (cho NV chăm khách)
- **S-Ranking** update conditional render theo role (F-3-25)

---

## Screen 1: MS-5 Cấu hình Shift (Architecture J)

### 1.1 Mục đích

CEO setup ca làm việc + gán Trưởng ca theo phương án J (extension hooks). Day-1 NP có 1 shift, future-ready cho multi-shift, day-of-week, multi-location.

### 1.2 Actor + Permission

- **Access**: CEO (edit), TC (view only)
- **Block**: NV, BS, KT

### 1.3 Trigger

CEO vào từ Settings → Section 4 "Ca làm việc". Hoặc deep link `/admin/shifts`.

### 1.4 Layout

```
┌─────────────────────────┐
│ ← Cấu hình ca làm việc  │
├─────────────────────────┤
│ Tab: [Active] [Archived]│
├─────────────────────────┤
│                         │
│ Shift active:           │
│ ┌─────────────────────┐ │
│ │ 🕐 Cả ngày          │ │
│ │ 08:00 - 19:00       │ │
│ │                     │ │
│ │ Trưởng ca:          │ │
│ │ 👤 Hà (từ 01/04)    │ │
│ │                     │ │
│ │ [Edit shift]        │ │
│ │ [Đổi TC]            │ │
│ │ [Lịch sử TC]        │ │
│ │ [Archive shift]     │ │
│ └─────────────────────┘ │
│                         │
│ [+ Thêm shift mới]      │
│                         │
│ ─── Advanced (J) ───    │
│ Priority + Condition:   │
│ Hiện chưa dùng.         │
│ [Bật advanced mode]     │
└─────────────────────────┘
```

Sub-screen "Edit shift":

```
┌─────────────────────────┐
│ × Edit shift            │
├─────────────────────────┤
│ Tên                     │
│ [Cả ngày               ]│
│                         │
│ Giờ bắt đầu             │
│ [08:00]                 │
│                         │
│ Giờ kết thúc            │
│ [19:00]                 │
│                         │
│ ⚠️ Ngày 1 NP có 1 shift │
│ duy nhất, đảm bảo cover │
│ toàn bộ giờ mở cửa.     │
│                         │
│ [Lưu]                   │
└─────────────────────────┘
```

Sub-screen "Đổi TC":

```
┌─────────────────────────┐
│ × Đổi Trưởng ca         │
├─────────────────────────┤
│ Shift: Cả ngày          │
│                         │
│ TC hiện tại: Hà         │
│ Hiệu lực từ: 01/04      │
│                         │
│ ─────────────           │
│                         │
│ TC mới                  │
│ [Chọn user role TC ▼]   │
│ Hoặc                    │
│ [Tạm thời không có TC]  │
│                         │
│ Hiệu lực từ ngày        │
│ [02/05/2026]            │
│                         │
│ Note (optional)         │
│ [Hà nghỉ thai sản, Lan  │
│ thay tạm]               │
│                         │
│ [Lưu] [Cancel]          │
│                         │
│ ⚠️ Đơn cũ giữ TC=Hà,    │
│ đơn mới (sau hiệu lực)  │
│ ăn TC=Lan.              │
└─────────────────────────┘
```

Sub-screen "Lịch sử TC":

```
┌─────────────────────────┐
│ ← Lịch sử TC - Cả ngày  │
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │ Hà                  │ │
│ │ 01/04/2026 → hiện   │ │
│ │ Set bởi: Nguyên     │ │
│ │ Note: -             │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ (Chưa có)           │ │
│ │ 01/01/2026 - 31/03  │ │
│ │ NP chưa hoạt động   │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### 1.5 Advanced mode (architecture J extension)

Khi NP có nhu cầu day-of-week hoặc multi-condition, CEO bật advanced:

```
┌─────────────────────────┐
│ Advanced ShiftHeadAssign│
├─────────────────────────┤
│ Priority + Condition:   │
│                         │
│ TC Hà (default, prio=0) │
│   condition: NULL       │
│                         │
│ TC Lan (prio=10)        │
│   condition (JSON):     │
│   {                     │
│     "day_of_week":      │
│     ["sat", "sun"]      │
│   }                     │
│   → Lan thay Hà cuối    │
│   tuần                  │
└─────────────────────────┘
```

Default off, advanced mode chỉ visible khi CEO bật. NP day-1 không cần.

### 1.6 Components

- `Tab` Active / Archived
- `Card` per shift
- `Button` "Edit", "Đổi TC", "Lịch sử TC", "Archive"
- `Sheet` modal cho Edit / Đổi TC
- `Time picker` cho giờ start/end
- `Select` cho TC user (filter theo role TC)
- `Textarea` cho note

### 1.7 Data binding

```
Entity: Shift (B1 section 15)
Fields:
  - id, name, start_time, end_time, archived_at
  - priority (default 0, advanced mode)
  - condition (JSON nullable, advanced mode)

Entity: ShiftHeadAssignment (B1 section 15)
Fields:
  - id, shift_id, head_user_id (nullable),
  - effective_from, effective_to (nullable, NULL = active),
  - set_by_user_id, note
  - priority, condition (advanced)
```

API:
```
GET /api/admin/shifts
POST /api/admin/shifts (CEO only)
Body: { name, start_time, end_time }

PATCH /api/admin/shifts/{id}
PATCH /api/admin/shifts/{id}/archive

POST /api/admin/shifts/{shift_id}/head-assignment
Body: { head_user_id, effective_from, note }
GET /api/admin/shifts/{shift_id}/head-assignment-history
```

### 1.8 Validation

- Shift time: start < end
- Shift overlap: warning (không block) nếu shift mới overlap với shift active. CEO confirm.
- Effective_from cho TC change: >= today
- TC user phải có role = TC (validate user.role_id)

### 1.9 Edge cases

| Case | Handling |
|---|---|
| Đổi TC giữa kì lương | Đơn tạo trước hiệu lực giữ TC cũ, đơn mới ăn TC mới (snapshot) |
| Set TC = NULL (Hà nghỉ chưa tuyển) | Đơn mới không populate row TC. HH role TC = 0. CEO biết, có thể dùng Adjustment manual để bù |
| Archive shift đang có TC active | Prompt "Đơn mới sẽ không gán TC. OK?" |
| Multi-shift overlap (vd ca sáng + ca chiều có 1h overlap) | App lookup theo created_at, dùng condition + priority để decide |
| Edit shift time khi có đơn pending trong shift | Đơn cũ giữ shift_id cũ, không re-lookup |

### 1.10 Cross-reference B4 rules

- R-3-1: Populate TC theo ShiftHeadAssignment lookup
- R-9-1: Permission CEO + TC view
- R-10-2: Audit log

### 1.11 Open questions

- Q-Shift-A: Advanced mode (priority + condition) có nên hidden default không? Đề xuất CÓ, chỉ enable khi CEO request.
- Q-Shift-B: Archive shift = soft delete. Có nên hard delete khi không có đơn nào dùng shift_id? Đề xuất KHÔNG, archive only.

---

## Screen 2: MS-6 Cấu hình Auto Rule

### 2.1 Mục đích

CEO config auto rule engine. MVP: rule "Thưởng đạt target tháng". Phase 2: thêm rule phạt sau khi anh chốt B-12.

### 2.2 Actor + Permission

- **Access**: CEO only
- **Block**: tất cả role khác

### 2.3 Trigger

CEO vào từ Settings → Section 6 "Auto Rule".

### 2.4 Layout

```
┌─────────────────────────┐
│ ← Cấu hình Auto Rule    │
├─────────────────────────┤
│                         │
│ Active rules:           │
│ ┌─────────────────────┐ │
│ │ ✅ Thưởng target tháng│ │
│ │ Trigger: 23:59 cuối  │ │
│ │   tháng               │ │
│ │ Áp dụng: NV (Sale,   │ │
│ │   TC, BS)             │ │
│ │ Parameters:          │ │
│ │   - target_pct: 100% │ │
│ │   - bonus_pct: 5%    │ │
│ │ [Edit] [Disable]     │ │
│ └─────────────────────┘ │
│                         │
│ ─── Lịch sử fire ───    │
│ ┌─────────────────────┐ │
│ │ 30/04/2026 23:59    │ │
│ │ Fired: 5 NV          │ │
│ │ Total bonus: 1.2tr   │ │
│ │ [Xem chi tiết]       │ │
│ └─────────────────────┘ │
│                         │
│ ─── Phase 2 (defer) ──  │
│                         │
│ Rule phạt:              │
│ - Phạt đi muộn          │
│ - Phạt complaint        │
│ - Custom rule           │
│ [+ Thêm khi sẵn sàng]   │
│ (chờ chốt B-12)         │
│                         │
└─────────────────────────┘
```

Sub-screen "Edit rule":

```
┌─────────────────────────┐
│ × Edit Thưởng target    │
├─────────────────────────┤
│ Tên                     │
│ [Thưởng đạt target tháng]│
│                         │
│ Trigger time            │
│ [23:59 cuối tháng]      │
│                         │
│ Áp dụng cho role        │
│ ☑️ Sale                 │
│ ☑️ TC                   │
│ ☑️ BS                   │
│ ☐ KT (không HH)         │
│ ☐ CEO (không HH)        │
│                         │
│ Tham số:                │
│                         │
│ target_pct (%)          │
│ [100]                   │
│ Min % target để được    │
│ thưởng. 100% = đạt mục  │
│ tiêu, 110% = vượt 10%   │
│                         │
│ bonus_pct (%)           │
│ [5]                     │
│ % bonus theo lương cứng │
│ × overshoot             │
│                         │
│ Active                  │
│ ☑️ ON                   │
│                         │
│ ─── Preview ───         │
│ Vd: NV target 5tr,      │
│ actual 6tr (vượt 20%)   │
│ → bonus = lương × 5% × 20%│
│   = 1% lương cứng       │
│                         │
│ [Lưu]                   │
└─────────────────────────┘
```

### 2.5 Components

- `Card` per rule
- `Sheet` modal Edit
- `Input` (number) cho parameters
- `Checkbox` group cho roles
- `Toggle` Active
- `Card` preview (computed example)
- `History list` cho fire history

### 2.6 States + Interactions

| State | Action | Result |
|---|---|---|
| Initial | Load rules active | Display |
| Edit | Tap "Edit" | Sheet mở với params |
| Save | Tap "Lưu" | API, snapshot pattern (apply cho cycle sau) |
| Disable | Tap "Disable" | Confirm dialog, rule status = inactive |
| View history | Tap "Xem chi tiết" | Navigate to history detail |

### 2.7 Data binding

```
Entity: AutoRule (B1 section 15)
Fields:
  - id, name, type (thưởng/phạt),
  - trigger_type (target_achievement/late_check_in/complaint/custom),
  - parameters (JSON),
  - applies_to_roles (JSON list),
  - active (bool),
  - created_by, created_at,
  - updated_by, updated_at

Entity: AutoRuleFireHistory (mới)
Fields:
  - id, rule_id, fired_at, cycle_id,
  - affected_users_count, total_amount,
  - adjustment_request_ids (JSON list)
```

API:
```
GET /api/admin/auto-rules
PATCH /api/admin/auto-rules/{id}
Body: { parameters, applies_to_roles, active }

POST /api/admin/auto-rules/{id}/disable
GET /api/admin/auto-rules/{id}/fire-history
```

### 2.8 Validation

- target_pct: 0-200% (sanity)
- bonus_pct: 0-50% (sanity, > 50% rare)
- Roles: at least 1 selected
- Snapshot: edit chỉ áp cho cycle chưa fire

### 2.9 Edge cases

| Case | Handling |
|---|---|
| Edit rule giữa cycle (đã fire) | Cycle hiện tại đã apply, edit áp cycle sau |
| Disable rule sát ngày fire | Stop fire, audit log |
| Rule fire fail (vd CEO offline approve) | Adjustment AUTO_PENDING hold, fire lại không cần |
| Parameters invalid (negative) | Block save, hint validate |

### 2.10 Cross-reference B4 rules

- R-7-1, R-7-2: Auto rule MVP
- R-7-3: Fire timing 23:59 cuối tháng
- R-7-4: Framework cho phase 2
- R-9-1: Permission CEO only

### 2.11 Open questions

- Q-Auto-A: Bonus công thức (lương cứng × bonus_pct × overshoot) - app HH KHÔNG quản lý lương cứng (Q-MS12-A chốt). Cần đổi công thức.
  
  Đề xuất alternative: bonus = HH gốc × bonus_pct × overshoot. Vd HH gốc 6tr, vượt 20% → bonus = 6tr × 5% × 20% = 60k.

[CHỜ ANH CHỐT Q-Auto-A]: Công thức bonus dựa lương cứng (cần Diễm nhập) hay HH gốc (app tự tính)?

---

## Screen 3: MS-7 Customer Follow-up Dashboard

### 3.1 Mục đích

NV chăm khách (primary_assigned_user) xem list khách đến ngày recall, gọi mời tái khám. TC + CEO xem toàn PK để giám sát.

### 3.2 Actor + Permission

- **Access**:
  - NV (Sale, BS): chỉ KH primary_assigned của mình
  - TC, KT, CEO: toàn PK
- **Block**: KH (không phải user app HH)

### 3.3 Trigger

NV vào từ menu "Khách hàng" → tab "Cần follow-up" hoặc dashboard widget "Khách đến ngày recall".

### 3.4 Layout

```
┌─────────────────────────┐
│ ← Khách follow-up       │
├─────────────────────────┤
│ Filter:                 │
│ [Hôm nay 5] [Tuần này] │
│ [Quá hạn 2]             │
├─────────────────────────┤
│                         │
│ ⚠️ Quá hạn (2):         │
│                         │
│ ┌─────────────────────┐ │
│ │ 👤 Nguyễn Thị B     │ │
│ │ 0901234567          │ │
│ │                     │ │
│ │ Khám gần nhất:      │ │
│ │ Khám tổng quát      │ │
│ │ 15/04/2026          │ │
│ │ Recall due: 02/05    │ │
│ │ Quá hạn 1 ngày 🔴   │ │
│ │                     │ │
│ │ [Gọi mời]           │ │
│ │ [Đã gọi] [Skip]     │ │
│ └─────────────────────┘ │
│                         │
│ Hôm nay (5):            │
│                         │
│ ┌─────────────────────┐ │
│ │ 👤 Lê Văn C         │ │
│ │ Recall: Test thai    │ │
│ │ Due: 03/05 ✅ hôm nay│ │
│ │ [Gọi mời] [Đã gọi]  │ │
│ └─────────────────────┘ │
│                         │
│ ...                     │
└─────────────────────────┘
```

Tap "Gọi mời":

```
┌─────────────────────────┐
│ × Gọi khách             │
├─────────────────────────┤
│ Khách: Nguyễn Thị B     │
│ SĐT: 0901234567         │
│ Gói recall: Khám TQ     │
│ Lần khám trước: 15/04   │
│                         │
│ [📞 Gọi điện]           │
│ [💬 Nhắn Zalo]          │
│                         │
│ ─── Sau cuộc gọi ──     │
│                         │
│ Kết quả:                │
│ ◯ Đặt lịch tuần này     │
│ ◯ Đặt lịch tuần sau     │
│ ◯ Hẹn gọi lại           │
│ ◯ Khách từ chối         │
│ ◯ Không bắt máy         │
│                         │
│ Note (optional):        │
│ [Khách bận tuần này...] │
│                         │
│ [Lưu kết quả]           │
└─────────────────────────┘
```

### 3.5 Components

- `Chips` filter (Hôm nay / Tuần này / Quá hạn / Tất cả)
- `Card` per khách với highlight quá hạn (đỏ)
- `Avatar` + tên + SĐT
- `Section` recall info (gói, ngày due, lần khám trước)
- `NPButton` "Gọi mời" / "Đã gọi" / "Skip"
- `Sheet` modal "Gọi khách" với phone link, kết quả radio, note

### 3.6 Logic recall

```
Khi Order COMPLETED:
  Customer.last_completed_order_at = now()
  Customer.next_recall_due_at = now() + max(Service.recommended_recall_days)
  Customer.recall_status = 'pending'

Cron mỗi sáng 7h:
  query Customer WHERE next_recall_due_at <= now() AND recall_status = 'pending'
  → push notify primary_assigned_user "X khách đến ngày recall"

Khi NV "Đã gọi":
  Customer.recall_status = 'done' (cycle done)
  Tạo NotificationLog type=recall, sent_by_user_id=NV, note=kết quả
  Reset next_recall_due_at = NULL (chờ đơn mới để recompute)

Khi NV "Skip":
  Customer.recall_status = 'skipped'
  Lý do skip optional
```

### 3.7 Data binding

```
Entity: Customer (mở rộng từ B1)
Fields used: id, name, phone, primary_assigned_user_id,
  last_completed_order_at, next_recall_due_at, recall_status

Entity: NotificationLog (existing B1)
type = 'recall', channel = 'manual_call'

API:
GET /api/customers/follow-up?filter=today|week|overdue
Response: { customers: [...] }

POST /api/customers/{id}/follow-up-action
Body: { action: 'called' | 'skipped' | 'rescheduled', result, note }
```

### 3.8 Validation

- "Đã gọi": kết quả required (radio)
- Skip: lý do required nếu có
- NV chỉ action được KH primary_assigned của mình

### 3.9 Edge cases

| Case | Handling |
|---|---|
| KH primary_assigned đã offboarded | NV mới được auto-assign (CEO setup) hoặc TC reassign manual |
| KH có nhiều dịch vụ với recall_days khác nhau | next_recall_due_at = max (theo dịch vụ longest) |
| KH skip recall liên tiếp 3 lần | Auto archive (Customer.status = inactive), CEO review |
| KH đặt lịch sau cuộc gọi → đơn mới | Auto link primary_assigned_user, reset recall cycle |
| Cron miss 1 ngày (server down) | Retry next morning, recall_due_at quá hạn highlight đỏ |

### 3.10 Cross-reference B4 rules

- R-8-5: Recall theo Service
- R-8-6: NV chăm gốc rule
- R-8-7: HH cho follow-up (KHÔNG ăn HH cuộc gọi, ăn khi đơn mới)
- R-9-1: Permission per role

### 3.11 Open questions

- Q-Followup-A: Cron 7h sáng có phù hợp không? Hay đẩy notify ngay khi due time? Đề xuất 7h sáng để tránh ngắt giờ ngủ NV.
- Q-Followup-B: KH skip 3 lần auto archive: ngưỡng OK chưa? Đề xuất 3 lần liên tiếp.

---

## Screen 4: S-Ranking conditional render (F-3-25)

### 4.1 Mục đích

Update existing `ranking.tsx` để conditional render theo role: NV/BS chỉ thấy của mình, TC/KT/CEO thấy full leaderboard.

### 4.2 Actor + Permission (B4 R-9-1 vòng 14)

- **NV (Sale, ĐD-Sale)**: chỉ thấy của mình
- **BS**: chỉ thấy của mình
- **TC, KT, CEO**: toàn PK

### 4.3 Layout NV/BS view (Personal Rank)

```
┌─────────────────────────┐
│ ← Xếp hạng              │
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │ Bạn đang ở:         │ │
│ │                     │ │
│ │   🥈 M2 (Bạc)       │ │
│ │                     │ │
│ │ Vị trí trong tier:  │ │
│ │ Top 30% NV M2       │ │
│ │                     │ │
│ │ Doanh số tháng:     │ │
│ │ 18,500,000đ         │ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ ─── Tiến độ lên M3 ──   │
│                         │
│ Mục tiêu lên M3:        │
│ 50tr/tháng × 3 tháng    │
│ liên tiếp               │
│                         │
│ Tháng 03: 22tr ❌       │
│ Tháng 04: 28tr ❌       │
│ Tháng 05: 18.5tr (⏳)   │
│                         │
│ Còn 31.5tr để đạt target│
│ tháng này               │
│                         │
└─────────────────────────┘
```

NV/BS KHÔNG thấy:
- Top 3 podium
- Table leaderboard với tên người khác
- Doanh số người khác

### 4.4 Layout TC/KT/CEO view (Full Leaderboard - giữ implementation hiện tại)

Implementation hiện tại có:
- Podium top 3 với medal icons + tier badges
- Detailed ranking table với current user highlight
- Period filters

Giữ nguyên cho 3 role này. Không thay đổi.

### 4.5 Conditional render logic

```
if user.role in ['ĐD-Sale', 'BS']:
  render PersonalRankView
else:  // TC, KT, CEO
  render FullLeaderboardView
```

Single screen, 2 different views theo role.

### 4.6 Components

**PersonalRankView**:
- `Card` hero với current rank + tier badge
- `Section` "Tiến độ lên tier kế"
- `Progress` cho từng tháng (mock G1 ngưỡng cho đến khi anh chốt)

**FullLeaderboardView** (existing):
- `Podium` component
- `Table` ranking
- `Filter` period

### 4.7 Data binding

```
GET /api/ranking?view=personal | full
Response personal: {
  current_rank, tier_position_pct,
  monthly_revenue, target_to_next_tier,
  history_months
}
Response full: {
  podium: [...],
  leaderboard: [...]
}

Backend filter response theo `req.user.role`
```

### 4.8 Edge cases

| Case | Handling |
|---|---|
| NV mới (M0, chưa có history) | Show "Chào mừng! Bạn ở tier M0. Tiến lên M1..." |
| NV đứng đầu M3 | Show "Bạn đang đứng đầu tier cao nhất" (không có "lên tier kế") |
| G1 thresholds chưa chốt (B-6) | Hardcode placeholder cho đến khi chốt |
| TC view leaderboard nhưng có trong leaderboard không (TC có HH 2%) | Hiện trong leaderboard chung |

### 4.9 Cross-reference B4 rules

- R-4-1, R-4-2: Ranking
- R-9-1: Permission update vòng 14
- R-4-3: G1 thresholds (chờ chốt)

### 4.10 Open questions

- Q-Rank-A: NV xem được "tier position pct" (vd top 30% NV M2) - cần data cross-NV. Có vi phạm "chỉ thấy của mình" không? Đề xuất CHỈ show statistic (pct) không show identity → OK transparent.
- Q-Rank-B: NV đứng đầu M3 không có tier kế → hiển thị gì? Đề xuất "Đỉnh cao! Hãy giữ phong độ".

---

## 5. Open issues batch 4

| ID | Question | Severity |
|---|---|---|
| Q-Shift-A | Advanced mode hidden default | LOW |
| Q-Shift-B | Hard delete vs archive shift | LOW |
| Q-Auto-A | Bonus formula dùng lương cứng hay HH gốc | **HIGH** |
| Q-Followup-A | Cron 7h sáng có OK | LOW |
| Q-Followup-B | Skip 3 lần auto archive | LOW |
| Q-Rank-A | NV xem tier position pct OK | LOW |
| Q-Rank-B | NV đứng đầu M3 hiển thị gì | LOW |

**Q-Auto-A là HIGH** vì ảnh hưởng schema: nếu dùng lương cứng → cần app HH biết lương cứng (conflict với Q-MS12-A đã chốt KHÔNG quản lý lương cứng).

→ Đề xuất chốt **bonus = HH gốc × bonus_pct × overshoot**. Đơn giản, app tự tính, không cần Diễm nhập lương cứng.

Vd: NV target 5tr HH, actual 6tr (vượt 20%) → bonus = 6tr × 5% × 20% = 60k.

---

## 6. Cost dev estimate batch 4

| Screen | Cost ngày |
|---|---|
| MS-5 Cấu hình Shift (architecture J + advanced mode placeholder) | 6-8 |
| MS-6 Cấu hình Auto Rule (MVP "thưởng target tháng") | 4-6 |
| MS-7 Customer Follow-up Dashboard | 5-7 |
| S-Ranking conditional render | 2-3 |
| **Total** | **17-24 ngày** |

---

## 7. Bước tiếp theo

Sau Batch 4:
- **Batch 5**: Cleanup
  - MS-1 Tạo đơn thành công (success page sau order-create)
  - MS-3 Thông báo (notification list)
  - MS-4 Bàn giao công việc (handover screen)
  - MS-8 Notification Log audit (TC + CEO)
  - MS-11 Pay slip preview cá nhân (NV view, lite)
  - Component reference doc (lấy từ np-playground)

Total ~15-20 ngày dev cho Batch 5.

## 8. Lịch sử update

| Date | Update |
|---|---|
| 2026-05-01 v1 | Tạo file. Spec 3 screen mới + 1 update. 7 questions (1 HIGH Q-Auto-A). Cost dev 17-24 ngày. |
