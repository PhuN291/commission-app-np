# B5 Batch 2 Screen Specs (Rewrite Existing)

Status: WIP draft 1
Ngày: 2026-05-01
Phụ thuộc: B1 FINAL vòng 14, B4 v2, B5.1 v2, ADR-001

Mục đích: Spec 3 screen existing có conflict với B1+B4 source of truth, cần REWRITE hoặc MAJOR REWORK.

3 screens trong batch:
- **S-Login**: Rewrite từ email/password → SĐT + OTP Zalo (F-3-24)
- **S-Admin-Staff**: Major rework với device binding, ihos_user_id, offboarding flow (F-3-16, F-3-17)
- **S-Admin-Settings**: Major rework với multi-section (Shift J, Auto Rule, Pay cycle, etc.) (F-3-19)

---

## Screen 1: S-Login (Đăng nhập)

### 1.1 Mục đích

User login vào app HH bằng SĐT + OTP qua Zalo OA (fallback SMS). Device binding 1 user 1 device để chống chia sẻ tài khoản.

### 1.2 Actor + Permission

- **Access**: Tất cả user (NV, BS, TC, KT, CEO)
- **Block**: User offboarded (status = offboarded)

### 1.3 Trigger

- First time login
- Token expired
- User switch device (force re-login)
- Manual logout

### 1.4 Layout (3-step wizard)

**Step 1: Nhập SĐT**

```
┌─────────────────────────┐
│  NP Clinic - App HH     │
│                         │
│  Đăng nhập              │
│                         │
│  Số điện thoại          │
│  ┌─────────────────────┐│
│  │  +84 0123 456 789   ││
│  └─────────────────────┘│
│                         │
│  [Gửi mã OTP]           │
│                         │
└─────────────────────────┘
```

**Step 2: Nhập OTP**

```
┌─────────────────────────┐
│  ← Quay lại             │
│                         │
│  Nhập mã OTP            │
│  Đã gửi tới Zalo        │
│  012*****89             │
│                         │
│  ┌───┬───┬───┬───┬───┬─┐│
│  │ _ │ _ │ _ │ _ │ _ │_││
│  └───┴───┴───┴───┴───┴─┘│
│                         │
│  Mã hết hạn sau: 4:30   │
│                         │
│  Gửi lại OTP            │
│  Không nhận? [Gửi SMS]  │
│                         │
│  [Xác nhận]             │
└─────────────────────────┘
```

**Step 3 (chỉ khi switch device): Xác nhận thiết bị mới**

```
┌─────────────────────────┐
│  Thiết bị mới phát hiện │
│                         │
│  Tài khoản hiện đang    │
│  bind vào:              │
│  📱 iPhone 13 Pro       │
│                         │
│  Bạn đang login từ:     │
│  📱 iPhone 15 Pro       │
│                         │
│  Để chuyển: cần xác     │
│  nhận thêm 1 lần qua    │
│  email hoặc gọi thoại   │
│                         │
│  [Email xác nhận]       │
│  [Yêu cầu gọi thoại]    │
│                         │
└─────────────────────────┘
```

### 1.5 Components

- `Input` SĐT với phone format VN
- `OTPInput` 6 digit với auto-tab
- `Countdown` timer 5 phút
- `NPButton` primary "Xác nhận"
- `NPButton` ghost "Gửi lại", "Gửi SMS"

### 1.6 Flow logic

```
1. User nhập SĐT → POST /api/auth/request-otp
   - Backend check User.phone exists
   - User offboarded → block với message
   - User active → generate OTP 6 digit, save to OtpSession (5 phút expire)
   - Send qua Zalo OA. If fail → auto fallback SMS
2. User nhập OTP → POST /api/auth/verify-otp
   - Verify OTP match + chưa expire
   - 3 lần sai → lock account 15 phút
   - Verify OK → check device:
     - User chưa bind device nào: bind device current → login success
     - Device current = bound device: login success
     - Device current ≠ bound device → trigger Step 3
3. Step 3 (switch device):
   - User chọn email confirm hoặc voice call
   - Email: gửi link confirm tới email user, click → unbind cũ + bind mới + login
   - Voice call: hệ thống gọi voice OTP, user nhập 4 digit confirm
   - Success → notify CEO + TC qua Zalo "User X đã đổi device"
```

### 1.7 Data binding

```
Entity: OtpSession (mới)
Fields:
  - id, user_id, otp_code (hashed), 
  - sent_via (zalo_oa | sms), 
  - expire_at, attempts (max 3), 
  - status (pending/used/expired/locked)

Entity: DeviceBinding (mới)
Fields:
  - user_id (PK), device_id (string, fingerprint),
  - device_name, bound_at, last_active_at

Entity: User (mở rộng)
Fields existing: phone, status, etc.
Add: locked_until (nullable timestamp)
```

API:
```
POST /api/auth/request-otp
Body: { phone }
Response: { sent_via: 'zalo_oa' | 'sms' }

POST /api/auth/verify-otp
Body: { phone, otp_code }
Response: { 
  status: 'success' | 'switch_device_required' | 'invalid' | 'locked',
  token (nếu success)
}

POST /api/auth/confirm-switch-device
Body: { phone, confirm_method: 'email' | 'voice', confirmation_token }
Response: { token }
```

### 1.8 Validation

- SĐT format VN: `+84` hoặc `0` đầu, 10-11 digit
- OTP: exact 6 digit
- Locked account: hiển thị "Tài khoản tạm khóa, thử lại sau 15 phút"
- Offboarded user: hiển thị "Tài khoản đã ngừng. Liên hệ admin"

### 1.9 Edge cases

| Case | Handling |
|---|---|
| SĐT chưa đăng ký | "SĐT chưa có trong hệ thống. Liên hệ admin" |
| Zalo OA fail + SMS fail | Hiện nút "Liên hệ admin" + ghi log alert |
| User chuyển SĐT | Admin update qua admin-staff, user re-login |
| Device fingerprint thay đổi (browser update) | Treat as same device nếu user_id + browser fingerprint similar |
| User logout cố ý | Token revoke, device binding giữ |
| User mất phone | Admin force unbind qua admin-staff |
| OTP delay > 5 phút mới tới | Hết hạn, user gửi lại |

### 1.10 Cross-reference B4 rules

- R-9-1: Permission (mọi user login)
- R-10-2: Audit log mọi login attempt + device switch

### 1.11 Open questions

- Q-Login-A: Email confirm khi switch device. User có email không (B1 không mandatory). Đề xuất voice call làm primary, email là optional fallback.
- Q-Login-B: Voice call OTP: cost dev cao (cần integrate Twilio/Stringee). Có alternative: TC gọi tay xác nhận user, ấn override trong admin-staff?

---

## Screen 2: S-Admin-Staff (Quản lý nhân sự)

### 2.1 Mục đích

CEO + TC quản lý NV: CRUD, role assignment, ihos mapping, offboarding flow.

### 2.2 Actor + Permission

- **Access**: CEO (full CRUD), TC (view only + can mark "sắp nghỉ")
- **Block**: NV, BS, KT (không thấy screen này)

### 2.3 Trigger

CEO/TC vào từ menu "Quản lý NV" trong admin section.

### 2.4 Layout

List view + sheet detail.

```
┌─────────────────────────┐
│ ← Quản lý nhân sự       │
├─────────────────────────┤
│ 🔍 Tìm theo tên/SĐT     │
│ [Tất cả] [Sale] [BS] ...│
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ 👤 Lan               │ │
│ │ ĐD-Sale | M2 | active │ │
│ │ 091234... iSoft✓    │ │
│ │                  →  │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 👤 BS Minh           │ │
│ │ Bác sĩ | L2 | active │ │
│ │ 0987... iSoft✓     │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 👤 Trang             │ │
│ │ ĐD-Sale | M0 | sắp nghỉ │ │
│ │ Ngày nghỉ: 30/05    │ │
│ │ ⚠️ 5 đơn pending    │ │
│ └─────────────────────┘ │
│                         │
│ [+ Thêm nhân sự]        │
└─────────────────────────┘
```

Sheet detail (tap NV hoặc Add):

```
┌─────────────────────────┐
│ × Chi tiết Lan          │
├─────────────────────────┤
│                         │
│ Tên                     │
│ ┌─────────────────────┐ │
│ │ Nguyễn Thị Lan      │ │
│ └─────────────────────┘ │
│                         │
│ Số điện thoại           │
│ ┌─────────────────────┐ │
│ │ 0912345678          │ │
│ └─────────────────────┘ │
│                         │
│ Vai trò                 │
│ [ĐD-Sale ▼]             │
│                         │
│ Ranking                 │
│ [M2 (Bạc) ▼]            │
│                         │
│ iHOS User ID           │
│ ┌─────────────────────┐ │
│ │ ISO-12345           │ │
│ └─────────────────────┘ │
│                         │
│ Trạng thái              │
│ ◉ active                │
│ ○ pending_offboarding   │
│ ○ offboarded            │
│                         │
│ ─── Thiết bị ──────     │
│ 📱 iPhone 13 Pro        │
│ Bound: 15/04/2026       │
│ [Force unbind]          │
│                         │
│ ─── Audit log ────      │
│ 15/04: CEO add user     │
│ 20/04: Promote M1→M2    │
│                         │
│ [Lưu] [Xóa] (soft del)  │
└─────────────────────────┘
```

### 2.5 Components

- `SearchField`, `Chips` filter role
- `Card` per staff với info compact
- `Sheet` modal cho detail
- `Input`, `Select`, `RadioGroup` cho fields
- `NPButton` primary "Lưu", ghost "Xóa"
- `Card` cho thiết bị info
- `List` audit log entries

### 2.6 States + Interactions

| State | Action | Result |
|---|---|---|
| List view | Search/filter | Filter live |
| Add new | Tap "+ Thêm" | Sheet mở với form trống |
| Edit | Tap NV card | Sheet mở với data hiện tại |
| Save | Tap "Lưu" | API call, validate, refresh list |
| Mark offboarding | Set status pending_offboarding | Prompt "Ngày nghỉ?", warning về đơn pending |
| Force unbind | CEO ấn "Force unbind" | Confirm dialog, API call, audit log |

### 2.7 Data binding

```
Entity: User (mở rộng từ B1 section 15)
Fields:
  - id, name, phone, role_id, ranking_id,
  - ihos_user_id (required cho BS, optional khác),
  - status (active/pending_offboarding/offboarded),
  - offboarding_date (nullable),
  - monthly_target_hh, monthly_target_orders,
  - locked_until (cho login security),
  - created_at, created_by_user_id

Note: KHÔNG có field password.
```

API:
```
GET /api/admin/staff?search=&role=&status=
POST /api/admin/staff (CEO only)
Body: { name, phone, role_id, ranking_id, ihos_user_id }

PATCH /api/admin/staff/{id} (CEO only)
PATCH /api/admin/staff/{id}/mark-offboarding (CEO + TC)
Body: { offboarding_date }

POST /api/admin/staff/{id}/force-unbind-device (CEO only)
```

### 2.8 Validation

- Tên: required, min 2 chars
- SĐT: required, unique, format VN
- iHOS User ID: required cho BS (block save nếu thiếu)
- Ranking: phải match với role (BS có ranking riêng L1-L3, NV có M0-M3)
- Mark offboarding: required offboarding_date >= today

### 2.9 Edge cases

| Case | Handling |
|---|---|
| Thêm NV trùng SĐT | Block, hint "SĐT đã có user" |
| Thêm BS thiếu ihos_user_id | Block với hint |
| Mark offboarding với 50 đơn pending | Warning "5 đơn cần handover trước" + link đến MS-4 Bàn giao |
| Force unbind device khi user đang online | User bị logout immediate, audit log |
| Edit role giữa kì lương | %HH apply theo snapshot (đơn cũ giữ rate cũ - B4 R-1-3) |
| Soft delete NV | Status → archived, không hiển thị list, data giữ nguyên cho audit |
| Reactivate NV offboarded | Status → active, reset device binding, prompt onboarding lại |

### 2.10 Cross-reference B4 rules

- R-3-5, R-3-6: Handover flow
- R-9-1: Permission CEO + TC
- R-10-1: Data retention (NV offboarded data giữ 5 năm)
- R-10-2: Audit log mọi change

### 2.11 Open questions

- Q-Staff-A: TC có quyền add NV mới không? Đề xuất KHÔNG (chỉ CEO add). TC chỉ mark offboarding khi CEO không có mặt.
- Q-Staff-B: Soft delete vs hard archive: NV cũ có search được không? Đề xuất tab "Đã nghỉ" trong list để xem.

---

## Screen 3: S-Admin-Settings (Cài đặt hệ thống - Major Rework)

### 3.1 Mục đích

CEO config mọi setting của app HH (single source of truth cho rules).

### 3.2 Actor + Permission

- **Access**: CEO (edit), TC (view only)
- **Block**: NV, BS, KT (KT có thể có view một số section, defer detail)

### 3.3 Trigger

CEO vào từ menu "Cài đặt".

### 3.4 Layout (Accordion 10 sections)

```
┌─────────────────────────┐
│ ← Cài đặt hệ thống      │
├─────────────────────────┤
│                         │
│ 1. Matrix %HH         > │
│ 2. Ranking            > │
│ 3. Vai trò (Role)     > │
│ 4. Ca làm việc (Shift)> │
│ 5. Voucher            > │
│ 6. Auto Rule (HH)     > │
│ 7. Kì lương           > │
│ 8. Tái khám (Recall)  > │
│ 9. Nhắc lịch          > │
│ 10. Audit log         > │
│                         │
└─────────────────────────┘
```

Tap section → expand thành sub-screen.

### 3.5 Section 1: Matrix %HH

```
Bảng %HH theo Role × Ranking:

         | M0  | M1  | M2  | M3  |
---------|-----|-----|-----|-----|
Sale     | 1%  | 2%  | 3%  | 4%  |
TC       | -   | -   | -   | 2%  |  (TC ko ranking)
BS L1    |     |     |     | 3%  |
BS L2    |     |     |     | 5%  |
BS L3    |     |     |     | 7%  |

[Edit] [Lịch sử thay đổi]
```

CEO tap cell → edit %. Save → snapshot pattern (apply cho đơn tạo SAU).

### 3.6 Section 2: Ranking

```
Ranking hiện tại:
- M0 (Mới): tự động cho NV mới
- M1 (Junior): threshold = ? (G1 chờ chốt)
- M2 (Mid): threshold = ?
- M3 (Senior): threshold = ?

Reset: Cứng mỗi quý

[+ Thêm ranking]
[Edit thresholds] (disabled - G1 chưa chốt)
[Promote NV manual]
```

Note: G1 thresholds chờ anh chốt (B-6 PENDING).

### 3.7 Section 3: Role management

```
Roles hiện có:
- Sale (system, ko delete)
- TC (system)
- BS (system)
- KT (system, ko HH)
- CEO (system, ko HH)

[+ Thêm role mới]
```

Add role → form: name, permission matrix.

### 3.8 Section 4: Ca làm việc (Shift J)

```
Ca làm việc hiện tại:
┌─────────────────────────┐
│ Cả ngày (08:00-19:00)   │
│ Trưởng ca: Hà            │
│ Hiệu lực: 01/04/2026 →  │
│ [Edit] [Archive]         │
└─────────────────────────┘

[+ Thêm ca mới]
[Lịch sử TC] (xem lịch sử ShiftHeadAssignment)

Advanced (phương án J):
- Priority + Condition (JSON)
  Hiện chưa dùng. Default 0/NULL.
```

Architecture J: schema additive, future-ready cho multi-shift.

### 3.9 Section 5: Voucher

Link đến `admin-vouchers.tsx` (đã có), không re-spec ở đây.

### 3.10 Section 6: Auto Rule

```
Rules đang active:
┌─────────────────────────┐
│ ✅ Thưởng đạt target     │
│ Trigger: cuối tháng      │
│ target_pct: 100%         │
│ bonus_pct: 5%            │
│ [Edit] [Disable]         │
└─────────────────────────┘

[+ Thêm rule mới] (disabled - phase 2)
[Lịch sử fire] (xem auto rule history)
```

MVP: chỉ "Thưởng target tháng". Phase 2: thêm rule phạt sau khi anh chốt B-12.

### 3.11 Section 7: Kì lương

```
Kì lương:
- Cycle: theo tháng dương lịch
- Deadline payday: ngày 5
  (configurable, default 5)
- Edit window sau payday: 30 ngày (cứng)
- Lock window sau T+30: cứng

Cap warning:
- expected_total_pct_per_order: 10%
  (warning visual, ko enforce)

Mục tiêu HH default cho NV mới: 0đ
(NV tự đặt qua onboarding)
```

### 3.12 Section 8: Tái khám (Recall)

```
Recall settings per Service:

Khám tổng quát: 365 ngày
Thủ thuật phụ khoa: 30 ngày
Test thai: 14 ngày
Xét nghiệm máu: ?
...

[Edit per Service]
```

Anh chưa list hết (B-13 PENDING). Mặc định NULL (không recall).

### 3.13 Section 9: Nhắc lịch (Reminder)

```
Reminder timeline:
- T-24h: Zalo OA reminder ✅
- T-2h: Zalo OA reminder ✅
- T+15p sau giờ hẹn: NV gọi (manual) ✅
- T+30p: Auto NO_SHOW ✅

Zalo OA template:
- Template T-24h: [text...]
- Template T-2h: [text...]

[Edit template]
[Test gửi]

Status Zalo OA: ⚠️ Chưa setup (B-14)
```

### 3.14 Section 10: Audit log

```
Audit log retention:
- Mọi thay đổi setting: vĩnh viễn
- Login attempt: 1 năm
- Notification log: 90 ngày

[Xem audit log full]
```

Read-only info section.

### 3.15 Components

- `Accordion` cho 10 sections
- Mỗi section là sub-screen với:
  - View mode (read-only display current values)
  - Edit mode (form, save)
  - History link (audit log per section)
- `Sheet` modal cho edit forms
- `Table` cho matrix %HH
- `Card` cho mỗi rule/shift entity

### 3.16 Data binding

```
Entity (đã có trong B1):
- Ranking (mở rộng với threshold_config khi G1 chốt)
- Role
- Shift, ShiftHeadAssignment (architecture J)
- Service (recommended_recall_days)
- AutoRule
- SalaryCycle (deadline config)

Entity mới:
- ZaloOATemplate (template, language, variables)
- AuditLogRetention (config, không phải data)
```

API:
```
GET /api/admin/settings/{section}
PATCH /api/admin/settings/{section}
Body: { ...section-specific fields }

GET /api/admin/settings/audit-log/{section}
```

### 3.17 Validation

- %HH: 0-100%, max 1 decimal
- Ranking thresholds: required khi save (chờ G1 chốt)
- Shift time: start < end, không overlap với shift active
- Auto rule parameters: per rule schema validate
- Pay cycle deadline: 1-31 (ngày trong tháng)
- expected_total_pct_per_order: 0-100%

### 3.18 Edge cases

| Case | Handling |
|---|---|
| Edit %HH giữa kì | Snapshot pattern, đơn cũ giữ rate cũ |
| Delete role có user active | Block với hint "Còn 5 user role này" |
| Archive shift đang có TC | Prompt "TC sẽ ko populate đơn mới, đơn cũ giữ" |
| Disable auto rule giữa cycle | Stop fire mới, adjustment đã APPROVED giữ |
| Edit Service.recommended_recall_days | Áp cho đơn COMPLETED sau, đơn cũ giữ recall_due_at cũ |
| Edit cap % | Áp ngay cho mọi đơn (warning chỉ visual, không cut) |

### 3.19 Cross-reference B4 rules

- R-1-3: Snapshot ranking khi edit %HH
- R-2-1: State machine (settings không ảnh hưởng đơn cũ)
- R-3-1, R-3-2: Role assignment
- R-4-2: Reset cứng quý
- R-5-1, R-5-2: Cap warning
- R-6-1, R-7-1: Auto rule
- R-8-1: Reminder schedule
- R-10-2: Audit log

### 3.20 Open questions

- Q-Settings-A: G1 ranking thresholds (B-6) chốt sau, section 2 hiện disabled. Phase 2 implement.
- Q-Settings-B: Zalo OA template editor: cần WYSIWYG hay text plain? Đề xuất text + preview với variable replace.
- Q-Settings-C: KT (Diễm) có view setting nào không? B1 nói "xem", không edit. Đề xuất Diễm xem section 1, 6, 7 (HH, auto rule, pay cycle - liên quan công việc).

---

## 4. Open issues batch 2

| ID | Question | Severity |
|---|---|---|
| Q-Login-A | Email confirm khi switch device (user có email?) | LOW |
| Q-Login-B | Voice call OTP: cost dev cao, alternative? | MEDIUM |
| Q-Staff-A | TC có quyền add NV không? | LOW |
| Q-Staff-B | Soft delete vs archive NV nghỉ | LOW |
| Q-Settings-A | G1 ranking thresholds (B-6) | defer |
| Q-Settings-B | Zalo OA template editor format | LOW |
| Q-Settings-C | KT permission xem section nào | LOW |

---

## 5. Cost dev estimate batch 2

| Screen | Cost ngày |
|---|---|
| S-Login (rewrite SĐT + OTP Zalo + device binding) | 6-8 |
| S-Admin-Staff (rework auth + offboarding) | 4-6 |
| S-Admin-Settings (10 sections major rework) | 10-14 |
| **Total** | **20-28 ngày** |

Phụ thuộc:
- Zalo OA setup (B-14): block S-Login + section 9 reminder
- G1 ranking (B-6): block section 2 ranking thresholds
- Voice call infrastructure: block S-Login switch device flow

---

## 6. Bước tiếp theo

Sau Batch 2:
- **Batch 3**: Update 3 screen core (admin-commission-approval, income, order-detail) - F-3-13, F-3-10, F-3-4, F-3-5
- **Batch 4**: 3 screen mới (Shift config standalone, Auto Rule editor, Customer Follow-up Dashboard)
- **Batch 5**: Cleanup (Tạo đơn thành công, Thông báo, Component reference)

Còn 3 batch B5.

## 7. Lịch sử update

| Date | Update |
|---|---|
| 2026-05-01 v1 | Tạo file. Spec 3 screen rewrite/rework: S-Login, S-Admin-Staff, S-Admin-Settings. 7 open questions. Cost dev 20-28 ngày. |
