# B5 Batch 5 Screen Specs (Cleanup + Reference)

Status: WIP draft 1
Ngày: 2026-05-01
Phụ thuộc: B1 vòng 16, B2.1-B2.4, B3, B4 v3, B5.1-5.4

Mục đích: Spec 5 screen còn lại + 1 component reference doc. Đây là batch cuối B5.

5 screens + 1 doc:
- **MS-1** Tạo đơn thành công (success page sau order-create)
- **MS-3** Thông báo (notification list)
- **MS-4** Bàn giao công việc (NV pending_offboarding)
- **MS-8** Notification Log audit (TC + CEO)
- **MS-11** Pay slip preview NV
- **UI-COMPONENTS-REFERENCE.md** (component reference cho dev, tách từ np-playground)

---

## Screen 1: MS-1 Tạo đơn thành công

### 1.1 Mục đích

Confirmation page sau khi NV/TC submit order-create thành công. Visual feedback + summary đơn vừa tạo + next action.

### 1.2 Actor + Permission

- **Access**: NV (Sale, ĐD-Sale), TC (người tạo đơn)
- Tự redirect về screen này sau khi order-create submit OK

### 1.3 Trigger

Sau khi POST /api/orders/create returns 200 với order_id.

### 1.4 Layout

```
┌─────────────────────────┐
│        ✅                │
│   Tạo đơn thành công    │
│                         │
│  Đơn O-2026-05-001       │
│  Khám tổng quát + XN    │
│  Tổng: 1,000,000đ       │
│                         │
│ ─── Phân công ─────     │
│ Sale: Lan (M2)          │
│ TC: Hà                  │
│ BS: chờ iHOS sync      │
│                         │
│ ─── Lịch khám ────       │
│ Hẹn: 03/05/2026 09:00   │
│                         │
│ ─── Reminder ────       │
│ ✓ Zalo OA T-24h         │
│ ✓ Zalo OA T-2h          │
│ ✓ Push notify NV T+15p  │
│                         │
│ [Xem chi tiết đơn]      │
│ [Tạo đơn khác]          │
│ [Về dashboard]          │
└─────────────────────────┘
```

### 1.5 Components

- `Card` hero với icon + tiêu đề
- `Section` repeat: Phân công, Lịch khám, Reminder
- `Row` cho mỗi assignment + reminder
- 3 `NPButton`: 1 primary "Xem chi tiết đơn" + 2 ghost

### 1.6 States + Interactions

| State | Action | Result |
|---|---|---|
| Initial | Auto redirect sau submit OK | Show success |
| Tap "Xem chi tiết đơn" | Navigate to order-detail | |
| Tap "Tạo đơn khác" | Navigate to order-create (form trống) | |
| Tap "Về dashboard" | Navigate to dashboard | |
| Auto redirect timeout | Sau 60 giây không action | Auto về dashboard |

### 1.7 Data binding

```
GET /api/orders/{id}
Response: { order, items, role_assignments, scheduled_reminders }
```

### 1.8 Edge cases

| Case | Handling |
|---|---|
| BS chưa được populate (chờ iHOS sync) | Show "Chờ iHOS sync khi BS bắt đầu khám" |
| TC NULL (shift không có TC) | Show "TC: chưa có" với note |
| Đơn vượt cap 10% | Hiển thị warning icon (cho Diễm/CEO sau review) |
| Notification scheduled fail | Show warning "1/4 reminder schedule fail, đã log" |

### 1.9 Cross-reference B4

- R-3-1: Populate role at CONFIRMED
- R-8-1: Reminder schedule

### 1.10 Open question

- Q-MS1-A: Auto redirect timeout (60s default) có OK không? Đề xuất 60s.

---

## Screen 2: MS-3 Thông báo

### 2.1 Mục đích

NV xem list push notification, mark read, deep link to relevant screen.

### 2.2 Actor + Permission

- **Access**: Tất cả role (NV, BS, TC, KT, CEO)
- Filter notification theo recipient_user_id

### 2.3 Trigger

Tap badge/icon thông báo trong header. Hoặc tap push notification từ OS.

### 2.4 Layout

```
┌─────────────────────────┐
│ ← Thông báo             │
├─────────────────────────┤
│ [Tất cả 12] [Chưa đọc 5]│
│ [Khẩn cấp 1]            │
├─────────────────────────┤
│                         │
│ 🔴 Khẩn cấp - 2 phút    │
│ ┌─────────────────────┐ │
│ │ ⚠️ Khách K-105 chưa │ │
│ │ đến (T+15p)         │ │
│ │ Đơn O-105 - Gọi nhắc│ │
│ │ [Mở đơn]            │ │
│ └─────────────────────┘ │
│                         │
│ Chưa đọc - hôm nay      │
│ ┌─────────────────────┐ │
│ │ 💰 Adjustment được   │ │
│ │ duyệt: +200,000đ     │ │
│ │ "Thưởng target tháng"│ │
│ │ 1 giờ trước          │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 📋 Đơn O-100 hoàn    │ │
│ │ thành. HH dự kiến    │ │
│ │ 24,000đ              │ │
│ │ 2 giờ trước          │ │
│ └─────────────────────┘ │
│                         │
│ [Đánh dấu đã đọc tất cả]│
└─────────────────────────┘
```

### 2.5 Components

- `Chips` filter (Tất cả / Chưa đọc / Khẩn cấp)
- `Section` group by time (Hôm nay / Hôm qua / Tuần này / Trước đó)
- `Row` per notification với:
  - Icon theo type (đơn mới / khiếu nại / recall / adjustment / penalty / award)
  - Title + message
  - Timestamp relative
  - Tap để mở deep link (đơn chi tiết, HH, settings, etc.)
- `NPButton` ghost "Đánh dấu đã đọc tất cả"

### 2.6 Notification types

| Type | Trigger | Recipient | Deep link |
|---|---|---|---|
| order_created | Đơn mới được tạo, NV là Sale | NV | order-detail |
| order_completed | Đơn complete, có HH dự kiến | NV (mọi role có) | order-detail |
| order_no_show_alert | T+15p khách chưa đến | NV (Sale) | order-detail |
| commission_approved | CR DUOC_DUYET | NV | income |
| commission_rejected | CR TU_CHOI | NV | order-detail (khiếu nại) |
| adjustment_approved | Adjustment APPROVED | beneficiary | income |
| customer_recall | Khách đến ngày recall | NV chăm gốc | customer-detail |
| handover_required | NV mark sắp nghỉ | NV nhận handover | MS-4 |
| khieu_nai_review | NV khiếu nại | KT | order-detail |

### 2.7 Data binding

```
Entity: Notification (mới)
Fields:
  - id, recipient_user_id, type, 
  - title, message, deep_link_url,
  - urgency (normal/urgent/critical),
  - read_at (nullable), 
  - created_at

API:
GET /api/notifications?filter=all|unread|urgent
POST /api/notifications/{id}/mark-read
POST /api/notifications/mark-all-read
```

### 2.8 States + Interactions

| State | Action | Result |
|---|---|---|
| Initial | Load list | Fetch theo filter |
| Tap notification | Mark as read + navigate deep link | |
| Tap "Đánh dấu đã đọc tất cả" | Bulk update read_at | |
| Realtime push | New notification arrives | Add to list, badge update |

### 2.9 Edge cases

| Case | Handling |
|---|---|
| Notification target screen đã bị remove (vd đơn đã cancelled) | Show graceful error, không 404 |
| User offline khi push notify | Queue notify, deliver khi online |
| > 100 notification | Pagination 50/page |
| Old notifications (> 90 days) | Auto purge per R-10-1 |

### 2.10 Cross-reference B4

- R-8-* Reminder + recall + notification
- R-10-1 Push notification log retention 90 ngày

### 2.11 Open question

- Q-MS3-A: Realtime push (WebSocket) hay poll mỗi N giây? Đề xuất WebSocket nếu dev có infrastructure, fallback poll 30s.

---

## Screen 3: MS-4 Bàn giao công việc

### 3.1 Mục đích

NV được mark `pending_offboarding` xem list đơn pending, chọn NV nhận + bàn giao.

### 3.2 Actor + Permission

- **Access**: NV có User.status = 'pending_offboarding'
- **Block**: NV active không thấy screen này

### 3.3 Trigger

Banner "Bàn giao công việc" trên dashboard NV pending_offboarding. Tap → mở MS-4.

### 3.4 Layout

```
┌─────────────────────────┐
│ ← Bàn giao công việc    │
├─────────────────────────┤
│                         │
│ Bạn đang chuẩn bị nghỉ  │
│ Ngày nghỉ: 15/05/2026   │
│                         │
│ Vui lòng bàn giao 5 đơn │
│ pending dưới đây trước  │
│ ngày nghỉ.              │
│                         │
│ ─── Đơn pending ────    │
│                         │
│ ┌─────────────────────┐ │
│ │ O-2026-05-005       │ │
│ │ Khám tổng quát      │ │
│ │ KH: Nguyễn Văn A    │ │
│ │ Hẹn: 06/05 09:00    │ │
│ │ Trạng thái: CONFIRMED│ │
│ │                     │ │
│ │ Bàn giao cho:       │ │
│ │ [Chọn NV ▼]         │ │
│ │ [Bàn giao]          │ │
│ └─────────────────────┘ │
│                         │
│ ... (4 đơn khác)        │
│                         │
│ ─── Đã bàn giao (2) ── │
│ ✓ O-2026-05-001 → Hằng  │
│ ✓ O-2026-05-002 → Trang │
└─────────────────────────┘
```

### 3.5 Components

- `Card` info "Bạn đang chuẩn bị nghỉ"
- `Section` per đơn pending
- `Card` per đơn với:
  - Order info (ID, dịch vụ, KH, hẹn, status)
  - `Select` NV nhận
  - `NPButton` "Bàn giao"
- `Section` "Đã bàn giao" để track progress

### 3.6 States + Interactions

| State | Action | Result |
|---|---|---|
| Initial | Load đơn pending của NV | List |
| Select NV nhận | Tap dropdown | Show list NV cùng role active |
| Submit "Bàn giao" | Tap | Confirm dialog, API call, move card sang "Đã bàn giao" |
| All đơn đã bàn giao | List pending = 0 | Show banner "Hoàn tất, sẵn sàng nghỉ" |

### 3.7 Logic handover (B1 section 20, R-3-5)

```
Per đơn handover:
  1. UPDATE OrderRoleAssignment (role=Sale, user_id=current_NV) SET ended_at = now()
  2. INSERT OrderRoleAssignment (role=Sale, user_id=người_nhận, assigned_at=now(), ranking_snapshot=người_nhận.tier)
  3. Cancel CR cũ (status TAM_TINH → CANCEL nếu đơn chưa COMPLETED)
  4. Tạo CR mới TAM_TINH cho người nhận
  5. Notify người nhận
  6. Audit log
```

### 3.8 Data binding

```
GET /api/handover/pending-orders
Response: { orders: [...] }

POST /api/handover/{order_id}
Body: { receiver_user_id }
Response: { success, new_role_assignment_id }

GET /api/handover/eligible-receivers?role=Sale
Response: { users: [...] }  # NV cùng role active, exclude self
```

### 3.9 Validation

- Receiver: phải cùng role với current NV (vd Sale → Sale)
- Receiver: status = 'active' (không pending_offboarding)
- Receiver != self
- Đơn phải chưa COMPLETED (đơn đã COMPLETED giữ NV cũ - R-3-5)

### 3.10 Edge cases

| Case | Handling |
|---|---|
| NV pending_offboarding nhưng có đơn đã COMPLETED chưa duyệt | Hiện trong list "Đơn đã hoàn thành (HH cho bạn)" - không cần handover |
| Chưa bàn giao hết đến ngày nghỉ | Block deactivate user, alert CEO/TC |
| TC force handover (NV vắng đột ngột) | TC qua admin-staff bấm "Force handover", chọn receiver tay |
| Receiver từ chối nhận | KHÔNG có flow này - một khi click "Bàn giao", receiver auto nhận |

### 3.11 Cross-reference B4

- R-3-5: Handover qua OrderRoleAssignment
- R-3-6: Force handover (TC)

### 3.12 Open question

- Q-MS4-A: Receiver có nút "Decline" không? Đề xuất KHÔNG (NV đang nghỉ cần resolve dứt khoát).

---

## Screen 4: MS-8 Notification Log audit

### 4.1 Mục đích

TC + CEO xem audit log notification (reminder + manual call + post-exam thanks + recall) để monitor pattern, debug khi NV nói "chưa nhận thông báo".

### 4.2 Actor + Permission

- **Access**: TC, CEO (toàn PK)
- **Block**: NV, BS, KT (chỉ thấy notification của mình qua MS-3, không phải log audit)

### 4.3 Trigger

CEO/TC vào từ menu admin "Notification Log" hoặc dashboard.

### 4.4 Layout

```
┌─────────────────────────┐
│ ← Notification Log      │
├─────────────────────────┤
│ Filter:                 │
│ [Type ▼] [Channel ▼]    │
│ [Status ▼] [User ▼]     │
│ Date: [01/05] - [05/05] │
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │ 03/05 08:00         │ │
│ │ reminder_24h        │ │
│ │ Channel: zalo_oa    │ │
│ │ KH: Nguyễn Văn A    │ │
│ │ Đơn: O-2026-05-005  │ │
│ │ Status: ✅ sent      │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 03/05 09:15         │ │
│ │ manual_call         │ │
│ │ NV: Lan             │ │
│ │ KH: Nguyễn Văn B    │ │
│ │ Note: "Không bắt máy│ │
│ │  3 lần"              │ │
│ │ Status: ✅ logged    │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 03/05 09:30         │ │
│ │ reminder_2h         │ │
│ │ Channel: zalo_oa    │ │
│ │ KH: Lê Thị C        │ │
│ │ Status: ❌ failed    │ │
│ │ Error: "Zalo API     │ │
│ │  timeout"            │ │
│ │ [Retry]              │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### 4.5 Components

- Filter row với 4 dropdown + date range
- `Card` per notification log entry
- Status badge (sent/scheduled/cancelled/failed)
- `NPButton` "Retry" cho failed
- Pagination 50/page

### 4.6 Filters available

- Type: reminder_24h, reminder_2h, manual_call, post_exam_thanks, recall
- Channel: zalo_oa, sms, manual_call
- Status: scheduled, sent, cancelled, failed
- User: NV liên quan (sent_by hoặc beneficiary)
- Date range

### 4.7 Data binding

```
Entity: NotificationLog (existing R-8)

GET /api/admin/notification-log?type=&channel=&status=&user=&date_from=&date_to=
Response: { logs: [...], total }

POST /api/admin/notification-log/{id}/retry
Response: { new_status }
```

### 4.8 States + Interactions

| State | Action | Result |
|---|---|---|
| Initial | Load 7 days gần nhất | List |
| Apply filter | Submit filter | Reload |
| Tap log entry | Expand detail | Show full payload, error, retry button |
| Retry failed | Tap "Retry" | API call, status update |

### 4.9 Edge cases

| Case | Handling |
|---|---|
| Log > 90 ngày (đã purge per R-10-1) | KHÔNG hiện trong filter |
| Bulk retry failed (vd 50 fail liên tiếp Zalo down) | Có nút "Retry tất cả failed trong cycle" |
| Search log của user offboarded | Vẫn search được (data giữ 90 ngày) |

### 4.10 Cross-reference B4

- R-8-* Notification rules
- R-10-1 Retention 90 ngày

---

## Screen 5: MS-11 Pay slip preview NV

### 5.1 Mục đích

NV xem pay slip preview của kì hiện tại trên app HH (không cần đợi Diễm gửi tay). Giúp NV check số trước khi nhận lương thực tế.

### 5.2 Actor + Permission

- **Access**: NV (Sale, BS, TC) - chỉ pay slip của mình
- **Block**: KT, CEO (không có pay slip per đơn vì không HH)

### 5.3 Trigger

Tap "Pay slip kì này" từ income screen hoặc dashboard.

### 5.4 Layout

```
┌─────────────────────────┐
│ ← Pay slip - Lan (M2)   │
├─────────────────────────┤
│ Kì 05/2026 (đến 04/05)  │
├─────────────────────────┤
│                         │
│ HOA HỒNG (theo đơn):    │
│ ┌─────────────────────┐ │
│ │ Sale role 3%        │ │
│ │ 18 đơn, 540,000đ    │ │
│ │ [Xem chi tiết]      │ │
│ └─────────────────────┘ │
│                         │
│ HH gốc:        540,000đ │
│                         │
│ ĐIỀU CHỈNH:             │
│ ┌─────────────────────┐ │
│ │ +200k Thưởng target │ │
│ │ -150k Phạt tư vấn   │ │
│ └─────────────────────┘ │
│                         │
│ Tổng adjustment: +50,000│
│                         │
│ CLAWBACK kì trước:      │
│ ┌─────────────────────┐ │
│ │ -30k Đơn O-099      │ │
│ │ refund 1 phần       │ │
│ └─────────────────────┘ │
│                         │
│ Tổng clawback: -30,000  │
│                         │
│ ──────────────          │
│ NET HH:        560,000đ │
│ ──────────────          │
│                         │
│ Note: Pay slip này CHƯA  │
│ bao gồm lương cứng.     │
│ Lương cứng + HH chính   │
│ thức nhận từ KT trưởng. │
│                         │
│ Trạng thái:             │
│ ⏳ Đang trong kì         │
│ (Chốt 05/06 sau payday) │
└─────────────────────────┘
```

### 5.5 Components

- `Card` hero với tiêu đề + cycle
- `Section` repeat: HH gốc, Adjustment, Clawback
- `Row` per category với amount + count
- `Card` final NET HH
- `Note` về lương cứng (managed ngoài app)

### 5.6 States

| Cycle status | Display |
|---|---|
| open (đang trong kì) | "⏳ Đang trong kì, sẽ chốt ngày 5 tháng sau" |
| locked (đã export, đang chi) | "💸 Đã chốt, đang chi qua ngân hàng" |
| closed (sau T+30 lock) | "✅ Đã đóng kì" + read-only |

### 5.7 Data binding

```
GET /api/income/{user_id}/payslip?cycle_id=X
Response: {
  cycle, status,
  hh_breakdown: { roles: [...], total_hh: ... },
  adjustments: [...],
  clawbacks: [...],
  net_hh
}
```

Note: API không trả lương cứng vì app HH không quản lý.

### 5.8 Validation

- NV chỉ xem được pay slip của chính mình
- Cycle hiện tại + 12 cycle gần nhất xem được (per R-10-1, HH retention 5 năm nhưng UI default 12 tháng)

### 5.9 Edge cases

| Case | Handling |
|---|---|
| Cycle locked nhưng có adjustment edit (window 30 ngày) | Show warning "Có adjustment đang sửa, NET HH có thể thay đổi" |
| NV không có HH (vd KT, CEO) | Block screen, hint "Bạn không có HH theo đơn" |
| NV pending_offboarding | Vẫn xem được, có warning "Bạn đang nghỉ việc, NET HH cuối sẽ chi trong 14 ngày" |

### 5.10 Cross-reference B4

- R-1-1 Formula HH
- R-6-7 Transparent visibility cho NV
- R-10-1 Retention HH 5 năm

### 5.11 Open question

- Q-MS11-A: NV xem được history bao nhiêu cycle? Đề xuất 12 cycle gần nhất (default UI), older qua filter.

---

## 6. Component Reference Doc (UI-COMPONENTS-REFERENCE.md)

Tách từ `np-playground.tsx` (sẽ remove khỏi production app theo F-3-23 chốt).

Tôi sẽ tạo file `audit-docs/UI-COMPONENTS-REFERENCE.md` riêng (deliver cho dev khi dev start).

Content tóm gọn:

### 6.1 Typography scale
- text-np-display (32px)
- text-np-title (20px)
- text-np-heading (17px)
- text-np-subheading (13px)
- text-np-body (15px)
- text-np-body-bold (15px)
- text-np-sub (13px)
- text-np-caption (12px)

### 6.2 Color palette
- np-brand-ink (primary, teal/cyan)
- np-ink (text primary)
- np-text-sub (secondary)
- np-text-muted (tertiary)
- np-surface-pressed (interactive)
- np-border-strong (dividers)

### 6.3 Component patterns
- `Screen` wrapper (sticky header + bottom nav)
- `Card` container
- `Row` (leading + title + subtitle + trailing + meta)
- `NPButton` (primary, ghost, sizes)
- `Badge` (success, attention, critical tones)
- `Sheet` modal slide-up
- `AlertDialog` confirm
- `Chips` filter tabs
- `SearchField`
- `OrderStatusBadges` (specialized cho appointment + visit status)

### 6.4 Layout pattern
- Mobile-first
- Sticky header với title + back button
- Bottom tab navigation
- Sheet modal cho CRUD
- AlertDialog cho confirm destructive

Sẽ tạo file UI-COMPONENTS-REFERENCE.md đầy đủ hơn khi dev request handoff.

---

## 7. Open issues batch 5

Đa số LOW. Defer khi dev build.

| ID | Question | Severity |
|---|---|---|
| Q-MS1-A | Auto redirect timeout 60s | LOW |
| Q-MS3-A | WebSocket vs poll | MEDIUM (impact infrastructure) |
| Q-MS4-A | Receiver có nút Decline | LOW |
| Q-MS11-A | History 12 cycles default | LOW |

---

## 8. Cost dev estimate batch 5

| Screen | Cost ngày |
|---|---|
| MS-1 Tạo đơn thành công | 1-2 |
| MS-3 Thông báo (with realtime push or poll) | 4-6 |
| MS-4 Bàn giao công việc | 3-4 |
| MS-8 Notification Log audit | 2-3 |
| MS-11 Pay slip preview NV | 2-3 |
| Component reference doc (deliver dev) | 0 (no code) |
| **Total** | **12-18 ngày** |

---

## 9. Bước tiếp theo

**B5 hoàn tất**. Move B6 plan thực thi.

B6 sẽ aggregate:
- Tổng cost dev của tất cả 5 batches B5
- Risk register
- Milestone + gating
- Sprint plan
- Dependency graph (iHOS, Zalo OA, etc.)

Estimate B6: 1-2 sessions.

## 10. Lịch sử update

| Date | Update |
|---|---|
| 2026-05-01 v1 | Tạo file. Spec 5 screen cleanup + component reference. 4 questions LOW. Cost dev 12-18 ngày. |
