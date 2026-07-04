# B3 Screen Audit

Status: WIP draft 1
Ngày: 2026-04-28
Phụ thuộc: B1 FINAL vòng 13, B2.1-B2.4 FINAL, implementation tại `client/src/pages/`

Mục đích: Audit 25 screen tsx hiện có, cross-check với B1+B2 workflow, surface gap và redundancy. Output làm input cho B5 spec.

Convention: tham chiếu B1, B2.x khi cần. Findings format `F-3-X` để phân biệt với B2.3 findings (`F-X`).

---

## 1. Tổng quan

### 1.0 DISCLAIMER QUAN TRỌNG (anh Nguyên nhắc 28/04/2026)

**Source of truth của project**:
1. B1 FINAL vòng 13 (context, formula, entity, business rules)
2. B2.1-B2.4 FINAL (workflow, persona, BPMN, edge cases, pay cycle)
3. ADR-001 (Shift architecture J)
4. PENDING-ITEMS (blocker, assumption)

**Screen implementation hiện tại (`client/src/pages/`) = legacy artifact**:
- Anh build trước khi chúng ta discuss B1+B2
- Có thể thiếu features chốt sau (vd Shift J, Auto rule, Reminder workflow, OrderItem.status)
- Có thể conflict với decisions chốt sau (vd login OTP Zalo thay password, KT/CEO không HH)
- Có thể có features không cần (vd np-playground, multi-select team member)

**Mindset audit B3**:
- Findings = "screen cần update để align với source of truth"
- KHÔNG phải "screen có vấn đề so với baseline"
- Implementation hiện tại được dùng làm tham khảo "đã có gì sẵn", không phải base cho rule

Sau B3, decisions từ B1+B2 trump implementation. Khi conflict → implementation rewrite, không phải B1/B2 thay đổi.

### 1.1 Số screen

- B1 section 22 list: **23 screens** (numbered 01-25, một số bỏ)
- Implementation `client/src/pages/`: **25 file tsx**
- Mismatch: 5-7 screens missing trong implementation, 8-10 screens NEW không có trong B1 list

### 1.2 Phương pháp audit

Mỗi screen check 4 chiều:
- **Match B1**: có trong list 23 screens không?
- **Match B2 workflow**: có support workflow đã chốt B2.1-B2.4 không?
- **Implementation status**: fully implemented, partial, hay placeholder?
- **Misalignment**: có conflict với business rule B1 không?

### 1.3 Categories

Group 25 screens theo chức năng:

| Category | Count | Files |
|---|---|---|
| Core (NV daily) | 7 | dashboard, orders, order-detail, order-create, customers, customer-detail, services |
| Service catalog | 1 | service-detail |
| Personal (HH cá nhân) | 3 | income, ranking, performance |
| Admin (CEO/KT) | 6 | admin-staff, admin-commission-config, admin-commission-approval, admin-vouchers, admin-voucher-detail, admin-settings |
| Analytics (CEO) | 4 | analytics-overview, analytics-appointments, analytics-doctors, analytics-patients |
| Support | 2 | ai-chat, np-playground |
| Auth + Error | 2 | login, not-found |

---

## 2. Mapping B1 list ↔ Implementation

| B1 # | B1 name | Implementation | Status |
|---|---|---|---|
| 01 | Trang chủ | dashboard.tsx | ✅ Match |
| 02 | Đơn hàng | orders.tsx | ✅ Match |
| 03 | Khách hàng | customers.tsx | ✅ Match |
| 04 | Hoa hồng | income.tsx (NV view) + admin-commission-approval.tsx (KT view) | ⚠️ Tách 2 file. B1 nói "view khác", implementation tách hẳn 2 file |
| 05 | Dịch vụ | services.tsx | ✅ Match |
| 06 | Xếp hạng | ranking.tsx | ✅ Match (logic G1 ranking thresholds chờ chốt) |
| 07 | Thông báo | **Missing** | ❌ Không có file riêng. Có thể là dropdown/badge trong header |
| 08 | Menu (Drawer) | **Missing** | ❌ Không có file. Có thể là component drawer trong layout |
| 09 | Chi tiết đơn | order-detail.tsx | ✅ Match |
| 10 | Tạo đơn 1 bước | order-create.tsx | ✅ Match (737 lines, complex form) |
| 11 | Tìm kiếm | **Missing** | ⚠️ Không có file riêng. Có search trong orders/customers/services. Đề xuất bỏ screen riêng. |
| 13 | Filter sheet | **Missing** | ⚠️ Là component (Sheet), không phải page. Nằm trong orders/customers/etc. |
| 14 | Chi tiết KH | customer-detail.tsx | ✅ Match (462 lines) |
| 15 | Chi tiết dịch vụ | service-detail.tsx | ✅ Match (763 lines) |
| 16 | Chi tiết HH | income.tsx (per-month detail) | ⚠️ Tích hợp vào income.tsx, không phải file riêng |
| 17 | Đơn của khách | **Missing** | ⚠️ Là section trong customer-detail.tsx, không file riêng |
| 19 | Tạo đơn thành công | **Missing** | ❌ Không có success page. order-create.tsx redirect về orders.tsx? Cần verify |
| 20 | Đăng nhập | login.tsx | ⚠️ Match nhưng dùng email/password, không phải SĐT+OTP Zalo (B1 chốt) |
| 21 | Onboarding | **Missing** | ❌ Không có file. B1 chốt "đặt mục tiêu HH tháng bắt buộc, không skip" |
| 22 | Settings | admin-settings.tsx + admin-commission-config.tsx + admin-staff.tsx + admin-vouchers.tsx | ⚠️ Tách nhiều file admin riêng |
| 23 | Empty state | (component) | ⚠️ Component pattern, không phải page |
| 24 | Error state | not-found.tsx | ✅ Match (404) |
| 25 | Sheet chọn dịch vụ | (Dialog trong order-create) | ⚠️ Component, không page |

**Tổng kết mapping**:
- ✅ Match clean: 9/23 (#01, #02, #03, #05, #06, #09, #10, #14, #15, #24)
- ⚠️ Match nhưng tách/tích hợp khác B1: 7/23 (#04, #11, #13, #16, #17, #20, #22, #23, #25)
- ❌ Missing thật sự: 4/23 (#07 Thông báo, #08 Menu Drawer, #19 Tạo đơn thành công, #21 Onboarding)

---

## 3. Implementation screens NOT trong B1 list

8 screens implementation có nhưng B1 chưa list:

| File | Tên | Phân loại | Cần giữ? |
|---|---|---|---|
| performance.tsx | Hiệu suất cá nhân | Personal | ⚠️ Trùng chức năng với dashboard.tsx và income.tsx, có thể consolidate |
| analytics-overview.tsx | Tổng quan kinh doanh | Analytics CEO | ✅ Giữ. B1 section 19 mention "CEO Dashboard realtime" |
| analytics-appointments.tsx | Phân tích lịch hẹn | Analytics CEO | ✅ Giữ |
| analytics-doctors.tsx | Hiệu suất bác sĩ | Analytics CEO | ✅ Giữ |
| analytics-patients.tsx | Phân tích khách hàng | Analytics CEO | ✅ Giữ |
| ai-chat.tsx | Trợ lý AI | Support | ⚠️ Hardcoded responses, chờ Dify API. B1 không list. Defer phase 2? |
| np-playground.tsx | Component Playground | Dev only | 🔴 BỎ trước production. Không phải user-facing screen |
| admin-voucher-detail.tsx | Tạo/Sửa voucher | Admin | ✅ Giữ. Sub-screen của admin-vouchers |

---

## 4. Audit từng screen với B2 workflow

### 4.1 Core daily screens

#### dashboard.tsx (Trang chủ)

**Match B2**: ✅
- B2.1 P1 Lan: "8h00 mở app screen Dashboard cá nhân" - match
- B2.1 P3 BS Minh: "8h45 mở app HH 1 lần xem HH MTD" - match
- Hero card HH MTD + KPI vs target: align

**Gap**:
- B2.3 Scenario 13 mention "khách bỏ về" → screen này nên có alert/notify cho NV về đơn skipped
- B2.4 mention reminder T+15p NV gọi → screen này nên có "Cần gọi" task list (task pending), Agent report mention "Pending tasks section" - có rồi ✅
- B1 section 7 Permission: NV chỉ xem HH "của mình" - cần verify dashboard có lock theo user

**Misalignment**:
- Dashboard show "rank achievement progress" với milestone rewards: B1 chốt ranking reset cứng quý, ngưỡng G1 chưa chốt → milestone chưa thể fix cứng. Dùng mock data, OK cho MVP nhưng cần làm rõ G1 trước launch.

**Findings**:
- F-3-1: Dashboard có "Pending tasks" (Cần xử lý) - cần verify gồm gì: lead chưa gọi, khách trễ T+15p, đơn skipped khách bỏ về, etc. Spec rõ trong B5.

#### orders.tsx (Đơn hàng)

**Match B2**: ✅
- Filter status: all/pending/confirmed/no-show/rescheduled - match B2.2 state machine (CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW)
- Search by code/patient/service - match P1, P2 workflow

**Gap**:
- Filter chưa có status REFUND_FULL, REFUND_PARTIAL (B2.2 v3 8 states)
- Filter chưa có "đơn vượt cap 10%" (B2.4 mention Diễm dùng filter này)
- Filter chưa có "đơn cross-month chốt muộn" (B2.4 mention)

**Misalignment**:
- "rescheduled" status không có trong B1 hay B2.2. B1 chỉ mention "Dời lịch" trong phase 2 chưa làm. Implementation có sẵn rồi, có thể không khớp với schema.

**Findings**:
- F-3-2: Status REFUND_FULL, REFUND_PARTIAL, IN_PROGRESS chưa có trong filter. Cần add trong B5 spec.
- F-3-3: "rescheduled" status implementation có nhưng B1+B2 chưa chốt. Cần verify hoặc remove.

#### order-detail.tsx (Chi tiết đơn)

**Match B2**: ✅
- Status timeline với StatusLog markers - match B2.2 state machine
- Team member assignment list - match OrderRoleAssignment
- Pricing detail với VAT - match formula
- Action buttons (confirm, reschedule, complete, mark no-show) - match transitions

**Gap**:
- Không thấy "Khiếu nại HH" button cho NV (B2.3 Scenario 9, B2.4 section 5)
- Không thấy section "OrderItem.status" (planned/completed/skipped) cho khách bỏ về case (Scenario 13)
- Không thấy "Reject HH" button cho Diễm trên CR cụ thể (B2.4 timeline)
- Không thấy hiển thị OrderRoleAssignment 2 row (Sale + TC) khác với BS row N (B2.2 v3)

**Misalignment**:
- "Multi-select team member assignment" - có vẻ implementation cho phép gán nhiều người per role per đơn? Conflict với B1 section 3.3 (Sale tối đa 1, TC tối đa 1).

**Findings**:
- F-3-4: Thiếu UI khiếu nại HH cho NV. Cần add (B5 spec).
- F-3-5: Thiếu UI quản lý OrderItem.status (mark skipped với lý do). Cần add.
- F-3-6: Multi-select team member có thể conflict với rule "tối đa 1 row per role" (Sale, TC). Cần verify.

#### order-create.tsx (Tạo đơn 1 bước)

**Match B2**: ✅
- Customer selection (inline create) - match
- Date/time picker với preset slots - match
- Service picker với expandable packages - match
- Notes textarea, payment summary với VAT - match

**Gap**:
- Không thấy schedule reminder T-24h, T-2h khi đơn CONFIRMED (B2.2 v3 Section 1.5)
- Không thấy populate OrderRoleAssignment 2 row (Sale, TC theo ShiftHeadAssignment) tự động
- Không thấy snapshot ranking_id

**Misalignment**:
- "Invoice/receipt fields conditional" - có thể là form BHYT? B1 chưa rõ flow tạo invoice. Cần check.

**Findings**:
- F-3-7: Thiếu logic schedule reminder + populate OrderRoleAssignment + snapshot ranking khi đơn CONFIRMED. Đây là CRITICAL backend logic, có thể đã có ở server side, frontend không thấy.

#### customers.tsx (Khách hàng)

**Match B2**: ✅
- Search + filter tabs (all/follow-up/VIP/new-this-month) - phần lớn match
- Total spent + order count + VIP badge - match

**Gap**:
- B2.2 v3 mention `Customer.next_recall_due_at` và `recall_status` - filter "follow-up needed" có thể link với recall, cần verify
- Không thấy filter "khách quay lại" (LTV) hay "khách inactive > 24 tháng"

**Findings**:
- F-3-8: Filter "follow-up needed" cần align với recall logic (Service.recommended_recall_days từ B2.2). Cần spec rõ.

#### customer-detail.tsx (Chi tiết KH)

**Match B2**: ✅
- Interaction history (calls, messages, visits, post-visit notes) - match B2.2 v3 Customer Follow-up
- Reminder management - match
- Order history - match B1 section 17 "Đơn của khách"

**Gap**:
- B2.2 v3 mention tự động generate recall task khi đến `next_recall_due_at` - implementation có "reminder management with status (upcoming, overdue, completed)" nhưng cần verify auto-generation.
- B1 chốt "primary_assigned_user_id" rule cho KH cũ quay lại - cần verify implementation respect

**Findings**:
- F-3-9: Reminder feature trong customer-detail có thể trùng với recall workflow (B2.2 Section 1.6). Cần consolidate vào 1 feature.

### 4.2 Personal HH screens

#### income.tsx (Hoa hồng - NV view)

**Match B2**: ✅
- Month selector + estimated vs actual summary - match B2.4
- Transaction detail list per đơn HH breakdown - match
- Status indicators (pending/approved/paid) - match CR lifecycle

**Gap**:
- Không thấy hiển thị adjustment lines (B2.4 pay slip example có "Điều chỉnh +200k thưởng / -150k phạt")
- Không thấy clawback lines (B2.4 mention "Clawback kì trước -30k")
- Không thấy "Khiếu nại" CTA cho CR bị reject (B2.4 section 5)

**Findings**:
- F-3-10: income.tsx thiếu adjustment + clawback + khiếu nại UI. Critical gap.

#### ranking.tsx (Xếp hạng)

**Match B2**: ✅ minimal
- Podium top 3 + ranking table với tier system

**Gap**:
- Tier system (Đồng/Bạc/Vàng/Kim cương) hardcode? B1 chốt CEO tự define ranking trong Settings. Implementation có thể conflict.
- B1 G1 threshold chưa chốt → ranking calculation cần [GIẢ ĐỊNH]

**Findings**:
- F-3-11: Ranking tier hardcode vs CEO-configurable? Cần check.
- F-3-25 (mới 01/05/2026): NV/BS chỉ thấy ranking của mình (chốt vòng 14). Implementation hiện show full leaderboard với podium top 3 + table → cần REWORK conditional render theo role: NV/BS thấy "Bạn ở vị trí #X + tier hiện tại + progress lên tier kế", không thấy người khác.

#### performance.tsx (Hiệu suất cá nhân)

**Trùng dashboard và income**: 6-month historical revenue chart, milestone progress.

**Findings**:
- F-3-12: performance.tsx có thể consolidate vào dashboard.tsx hoặc income.tsx. Đề xuất bỏ. Cần anh quyết.

### 4.3 Admin screens

#### admin-commission-approval.tsx (Duyệt HH cho KT)

**Match B2.4**: ⚠️ Partial
- Expandable staff cards với total commission pending - match
- Date range + role/status filtering - match
- Bulk select + "Mark as Paid" - match
- Order detail expansion - match

**Gap critical**:
- B2.4 mention "Export 4 file Excel" + "File chuyển khoản format" - không thấy UI export
- B2.4 mention "Bulk approve all CR" cho 1 đơn vs 1 NV - không rõ implementation
- B2.4 section 5 khiếu nại flow (Diễm review revert) - không thấy UI riêng cho review khiếu nại
- B2.4 mention CR reject + lý do - implementation có không? Cần verify

**Misalignment**:
- "Mark as Paid" - đây là gì? B1+B2 chưa có concept "đã trả" (DUOC_DUYET đã là final). Có thể là phase update sau bank transfer.

**Findings**:
- F-3-13: admin-commission-approval thiếu UI Export 4 Excel + UI khiếu nại review. Critical gap cho B2.4 workflow.

#### admin-commission-config.tsx (Cấu hình %HH)

**Match B1**: ⚠️ Partial
- Commission tier configuration by role (doctor, nurse) với % editing - match B1 section 12
- Calculator tool - match nice-to-have

**Misalignment**:
- "doctor, nurse" - chỉ 2 role? B1 hiện có Sale, TC, BS (3 role có HH sau vòng 13). KT, CEO không có HH (vòng 13). Implementation có thể outdated.
- Snapshot pattern: B1 chốt "settings áp dụng cho đơn tạo SAU thời điểm đổi". Implementation có handle không? Cần verify.

**Findings**:
- F-3-14: admin-commission-config có "doctor, nurse" tier - cần update thành Sale, TC, BS sau vòng 13. KT, CEO không cần config.
- F-3-15: Snapshot pattern khi edit %HH - cần verify backend logic respect.

#### admin-staff.tsx (Quản lý NV)

**Match B1**: ⚠️
- Staff list + role filter (ĐD-Sale, BS, KTV, KT) - match
- Add/Edit qua Sheet - match
- Status active/inactive toggle - match B1 NV.status

**Misalignment**:
- "Password reset" - B1 chốt đăng nhập = SĐT + OTP Zalo (B1 section 10), KHÔNG dùng password. Implementation có password concept là conflict.
- Không thấy device binding (B1 section 10: "1 tài khoản 1 thiết bị")
- Không thấy `ihos_user_id` mapping (B1 section 11: "BẮT BUỘC khi tạo")
- Không thấy `pending_offboarding` status flow (B1 section 20)

**Findings**:
- F-3-16: admin-staff có "password" - REMOVE, dùng OTP Zalo. Critical conflict.
- F-3-17: Thiếu device binding + ihos_user_id mapping + offboarding flow. Critical gap.

#### admin-vouchers.tsx + admin-voucher-detail.tsx (Voucher)

**Match B1**: ✅ Mostly
- List với status filter, edit/disable - match
- Form discount type (percent/fixed), date range, usage limit, min order - match

**Misalignment**:
- B1 section 12 chốt "Người tạo voucher: Trưởng ca và CEO". Implementation cho ai access? Cần check role permission.

**Findings**:
- F-3-18: Verify voucher screens chỉ TC + CEO access được. NV không thấy.

#### admin-settings.tsx (System settings)

**Match B1**: ⚠️ Partial
- VIP threshold, reminder lead time, overdue alert - basic config

**Gap critical**:
- B1 section 12 list: Matrix %HH, Ranking, Role, User management, **Shift management (J architecture)**, Voucher, Kì lương, Mục tiêu HH default, expected_total_pct (10%)
- B2.2 v3 thêm: Auto rule engine, Customer Follow-up Dashboard
- Implementation có **chỉ 3 setting** (VIP, reminder, overdue). Critical gap.

**Findings**:
- F-3-19: admin-settings thiếu hầu hết section quan trọng (Shift management, Auto rule, Pay cycle, Cap %, etc.). Major rework B5 spec.

### 4.4 Analytics screens

#### analytics-overview.tsx

**Match B1+B2**: ✅
- KPI revenue, patient count, return rate - match B1 section 19 CEO Dashboard
- Line chart period comparison + service breakdown - match

**Gap**:
- B1 mention "Alert đơn vượt trần 10%" - không thấy widget alert riêng
- B1 mention "Top NV theo doanh số" - có trong analytics-doctors riêng

**Findings**:
- F-3-20: analytics-overview thiếu widget "Đơn vượt cap 10%" alert (B1 section 19).

#### analytics-appointments.tsx

**Match B2**: ✅
- KPI completion %, no-show %, return rate - match B2.4 metrics
- Charts trends + status pie - useful

**Findings**: OK.

#### analytics-doctors.tsx

**Match B2**: ✅
- Sortable leaderboard với revenue, commission, patient count - match
- Compare 2-3 doctors mode - nice feature

**Findings**: OK.

#### analytics-patients.tsx

**Match B2.2 Customer Follow-up**: ⚠️
- Patient distribution + tier (VIP/Regular/Occasional) + churn risk - useful
- Không thấy filter "khách đến ngày recall hôm nay" (B2.2 v3 Section 1.6)

**Findings**:
- F-3-21: analytics-patients có thể merge với "Customer Follow-up Dashboard" (B1 section 22 mới đề xuất).

### 4.5 Support + Auth + Error

#### ai-chat.tsx

**Status**: Hardcoded responses, planned Dify integration.

**Findings**:
- F-3-22: ai-chat là experiment feature, B1 không list. Defer phase 2 hoặc giữ MVP với template responses cố định.

#### np-playground.tsx

**Status**: Dev tool only.

**Findings**:
- F-3-23: Bỏ trước production hoặc gate behind admin role. Không user-facing.

#### login.tsx

**Match B1**: 🔴 CRITICAL CONFLICT
- B1 section 10 chốt: SĐT + OTP qua Zalo OA, fallback SMS. Device binding 1 tài khoản 1 thiết bị.
- Implementation: email/phone + password, mock credentials.

**Findings**:
- F-3-24: login.tsx phải REWRITE theo SĐT + OTP Zalo. Critical conflict với B1.

#### not-found.tsx

**Status**: Minimal 404.

**Findings**: OK.

---

## 5. Findings tổng hợp

### 5.1 Critical findings (HIGH severity, must fix)

| ID | Issue | File | Action |
|---|---|---|---|
| F-3-7 | Logic schedule reminder + populate OrderRoleAssignment + snapshot ranking khi đơn CONFIRMED | order-create.tsx (backend?) | Verify backend logic. Spec B5 |
| F-3-13 | admin-commission-approval thiếu Export 4 Excel + khiếu nại UI | admin-commission-approval.tsx | Add UI. Spec B5 |
| F-3-16 | admin-staff dùng password thay vì OTP Zalo | admin-staff.tsx + login.tsx | REWRITE auth flow. Critical |
| F-3-19 | admin-settings thiếu nhiều section (Shift, Auto rule, Pay cycle, Cap) | admin-settings.tsx | Major rework |
| F-3-24 | login.tsx phải dùng SĐT + OTP Zalo | login.tsx | REWRITE |

### 5.2 Important findings (MEDIUM)

| ID | Issue | File | Action |
|---|---|---|---|
| F-3-2 | Filter status thiếu REFUND_*, IN_PROGRESS | orders.tsx | Add filter |
| F-3-4 | Thiếu UI khiếu nại HH cho NV | order-detail.tsx + income.tsx | Add UI |
| F-3-5 | Thiếu UI quản lý OrderItem.status (skipped) | order-detail.tsx | Add UI |
| F-3-6 | Multi-select team member có thể conflict tối đa 1 Sale/TC | order-detail.tsx | Verify |
| F-3-10 | income.tsx thiếu adjustment + clawback + khiếu nại UI | income.tsx | Add 3 sections |
| F-3-14 | admin-commission-config có "doctor, nurse" tier outdated | admin-commission-config.tsx | Update Sale/TC/BS, bỏ KT/CEO |
| F-3-15 | Snapshot pattern khi edit %HH | admin-commission-config.tsx | Verify backend |
| F-3-17 | Thiếu device binding + ihos_user_id + offboarding | admin-staff.tsx | Add features |

### 5.3 Minor findings (LOW)

| ID | Issue | File | Action |
|---|---|---|---|
| F-3-1 | Dashboard "Pending tasks" cần spec rõ | dashboard.tsx | Spec B5 |
| F-3-3 | "rescheduled" status không có trong B1 | orders.tsx | Verify |
| F-3-8 | Filter "follow-up needed" align với recall logic | customers.tsx | Verify logic |
| F-3-9 | Reminder feature trùng với recall workflow | customer-detail.tsx | Consolidate |
| F-3-11 | Ranking tier hardcode vs CEO-configurable | ranking.tsx | Verify |
| F-3-12 | performance.tsx có thể merge dashboard/income | performance.tsx | Decide consolidate |
| F-3-18 | Voucher screens role permission verify | admin-vouchers.tsx | Verify |
| F-3-20 | analytics-overview thiếu widget vượt cap 10% | analytics-overview.tsx | Add widget |
| F-3-21 | analytics-patients merge với Customer Follow-up | analytics-patients.tsx | Consider merge |
| F-3-22 | ai-chat status (defer hoặc MVP template) | ai-chat.tsx | Decide |
| F-3-23 | np-playground bỏ trước production | np-playground.tsx | Remove or gate |

### 5.4 Missing screens (cần thêm)

Từ B1 list 23 screens + B2.2 v3 + B2.2 v3 Section 22 mới đề xuất:

| ID | Tên | Mục đích | Priority |
|---|---|---|---|
| MS-1 | Tạo đơn thành công | Confirmation page sau order-create | HIGH |
| MS-2 | Onboarding | Đặt mục tiêu HH tháng (B1 chốt bắt buộc) | HIGH |
| MS-3 | Thông báo | List push notification (đơn mới, khiếu nại, recall, etc.) | HIGH |
| MS-4 | Bàn giao công việc | NV pending_offboarding giao đơn (B1 section 20) | MEDIUM |
| MS-5 | Cấu hình ca làm việc (Shift) | CEO setup shift + ShiftHeadAssignment (architecture J) | HIGH |
| MS-6 | Tạo Auto Reward/Penalty rule | CEO setup rule | HIGH |
| MS-7 | Customer Follow-up Dashboard | NV xem khách đến ngày recall | HIGH |
| MS-8 | Notification Log audit | TC + CEO audit reminder + call follow-up | LOW |
| MS-9 | Adjustment Request flow (KT tạo) | Diễm tạo adjustment | HIGH |
| MS-10 | Approve Adjustment (CEO) | CEO duyệt batch | HIGH |
| MS-11 | Pay slip preview cá nhân | NV xem pay slip kì hiện tại | MEDIUM |
| MS-12 | Export Excel kì lương | Diễm trigger export 4 file | HIGH |

**Total missing screens HIGH priority**: 8

### 5.5 Redundant screens (xem xét bỏ)

| File | Reason | Action |
|---|---|---|
| performance.tsx | Trùng dashboard + income | Consider merge or keep as power user view |
| np-playground.tsx | Dev only, không user-facing | Remove or gate behind dev role |
| ai-chat.tsx | Hardcoded responses, value chưa rõ | Defer phase 2 hoặc strip down |

---

## 6. Đề xuất rewrite B1 section 22 list

Dựa trên audit, list 23 screens trong B1 chưa phù hợp với reality. Đề xuất rewrite:

### Core (8 screens)

1. Trang chủ (dashboard)
2. Đơn hàng (orders)
3. Chi tiết đơn (order-detail)
4. Tạo đơn (order-create)
5. **Tạo đơn thành công (mới)**
6. Khách hàng (customers)
7. Chi tiết KH (customer-detail)
8. Dịch vụ (services)
9. Chi tiết dịch vụ (service-detail)

### Personal HH (3 screens)

10. Hoa hồng cá nhân (income)
11. Xếp hạng (ranking)
12. Hiệu suất (performance) - optional, có thể merge

### Admin CEO/KT (10 screens)

13. Settings tổng (admin-settings) - rework với nhiều section
14. Cấu hình %HH (admin-commission-config)
15. **Cấu hình ca làm việc (mới, Shift J)**
16. **Cấu hình Auto Rule (mới)**
17. Quản lý NV (admin-staff) - rework auth + offboarding
18. Voucher list (admin-vouchers)
19. Voucher detail (admin-voucher-detail)
20. Duyệt HH (admin-commission-approval) - add khiếu nại + export Excel
21. **Tạo Adjustment (mới, KT)**
22. **Duyệt Adjustment (mới, CEO)**

### Analytics CEO (4 screens)

23. Tổng quan kinh doanh (analytics-overview)
24. Phân tích lịch hẹn (analytics-appointments)
25. Hiệu suất bác sĩ (analytics-doctors)
26. Phân tích khách hàng (analytics-patients)

### Customer engagement (2 screens, mới)

27. **Customer Follow-up Dashboard (mới)**
28. **Notification Log (mới)**

### Auth + Error (3 screens)

29. Đăng nhập (login) - REWRITE OTP Zalo
30. **Onboarding (mới, đặt mục tiêu HH)**
31. Error 404 (not-found)

### Support (2 screens, optional)

32. AI Chat (ai-chat) - defer
33. Component Playground (np-playground) - dev only

### Sub-modal (component, không page)

- Filter sheet (component)
- Sheet chọn dịch vụ (component)
- Empty state (component)
- Thông báo (dropdown trong header, component)

**Tổng**: 25 screens core + 4 screens optional + 4 component patterns = ~30 entities cho B5 spec.

So với B1 section 22 list 23: tăng ~7 screens, hợp lý vì cover full workflow B2.

---

## 7. Bước tiếp theo

Sau B3:
- B4: Consolidate business rules từ B1+B2+B3 thành rule engine spec
- B5: Spec chi tiết từng screen (priority HIGH first: MS-1, MS-2, MS-3, MS-5, MS-6, MS-7, MS-9, MS-10, MS-12)
- B6: Plan thực thi với estimate

Trước B4, anh cần chốt:
- ~~F-3-12 performance.tsx~~: **CHỐT 28/04 - Giữ riêng**
- ~~F-3-22 ai-chat.tsx~~: **CHỐT 28/04 - Defer phase 2**
- ~~F-3-23 np-playground.tsx~~: **CHỐT 28/04 - Remove khỏi app, tạo component reference doc riêng trong B5 phase**
- Confirm new list 25-30 screens + 4 component (Section 6) - chờ feedback

## 8. Lịch sử update

| Date | Update |
|---|---|
| 2026-04-28 v1 | Tạo file. Audit 25 screens tsx + cross-check B1+B2. 24 findings (5 HIGH, 7 MEDIUM, 12 LOW). 12 missing screens identify. 3 redundant. Đề xuất rewrite B1 list thành ~25-30 entities. |
| 2026-04-28 v2 | Add disclaimer Section 1.0: B1+B2 là source of truth, screens là legacy. Chốt 3 quyết định: performance giữ riêng, ai-chat defer phase 2, np-playground remove + tạo component reference doc riêng B5 phase. |
