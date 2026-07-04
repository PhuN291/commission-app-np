# B6 Implementation Plan

Status: Draft 1 - Final phase
Ngày: 2026-05-05
Phụ thuộc: B1 vòng 16, B2.1-B2.4, B3, B4 v3, B5.1-5.5, ADR-001
Source of truth: Toàn bộ docs trong `audit-docs/`

Mục đích: Aggregate spec từ B1-B5 thành plan thực thi cho dev team. Output là document hand-off dev có thể start build ngay.

---

## 1. Executive Summary

### 1.1 Project scope

App Hoa Hồng (HH) cho **Phòng khám Nguyên Phương (NP)**. App quản lý:
- Tính HH tự động per đơn theo formula (Sale + TC + BS)
- Workflow duyệt CR (KT trưởng) + adjustment (KT trưởng tạo, CEO duyệt)
- Pay cycle ngày 5 hàng tháng với clawback/edit window 30 ngày
- Customer follow-up + recall theo y lệnh BS từ iHOS
- Reminder Zalo OA + auto NO_SHOW
- Auto rule "Thưởng đạt target tháng" (MVP)

**Out of MVP scope** (defer Phase 2): Penalty SLA rules, Auto Reward 5 sao, Awards cuối tháng, 90-day probation, Customer complaint dedicated flow, Permission role-based config (Sapo-style).

### 1.2 Cost summary

| Category | Cost (ngày dev) |
|---|---|
| Frontend specs B5 (5 batches) | 74-104 |
| Backend logic (state machines, formula, integrations) | 45-64 |
| Testing (~25% of dev) | 30-42 |
| DevOps + deployment | 5-8 |
| Documentation | 3-5 |
| Buffer 15% | 22-32 |
| **Total** | **179-255 ngày dev** |

### 1.3 Timeline

| Team config | Estimate timeline |
|---|---|
| 1 dev (NP hiện tại) | **9-13 tháng** |
| 2 devs parallel | **4.5-6.5 tháng** |
| Agency 3 devs | **3-4.5 tháng** |

### 1.4 Critical blockers

3 items BLOCK MVP:
1. **iHOS webhook contract**: Chưa contact (action A-4)
2. **Zalo OA setup**: Chưa đăng ký (action A-5)
3. **Dev team confirm**: 1 dev hay 2 dev hay agency

Anh phải clear 3 blocker này trong 2-4 tuần tới.

---

## 2. Cost breakdown chi tiết

### 2.1 Frontend (B5 specs)

| Batch | Screens | Cost ngày |
|---|---|---|
| B5.1 | MS-2 Onboarding, MS-9 Tạo Adjustment, MS-10 Duyệt Adjustment, MS-12 Export Excel | 9-12 |
| B5.2 | S-Login (OTP Zalo), S-Admin-Staff (rework), S-Admin-Settings (10 sections) | 20-28 |
| B5.3 | S-Income, S-Order-Detail, S-Admin-Commission-Approval | 16-22 |
| B5.4 | MS-5 Cấu hình Shift, MS-6 Auto Rule, MS-7 Customer Follow-up, S-Ranking | 17-24 |
| B5.5 | MS-1 Success page, MS-3 Notification, MS-4 Handover, MS-8 Notification Log, MS-11 Pay slip | 12-18 |
| **Total Frontend** | **20+ screens** | **74-104 ngày** |

### 2.2 Backend logic

| Module | Cost ngày |
|---|---|
| Database schema + migrations (40+ entities) | 5-7 |
| Auth (SĐT + OTP Zalo + Device binding) | 5-7 |
| Permission middleware base (5 role hardcode) | 4-6 |
| Order lifecycle + state machine | 6-8 |
| OrderRoleAssignment populate logic | 3-4 |
| HH formula + snapshot pattern + recompute | 5-7 |
| CR lifecycle + reject + khiếu nại | 4-5 |
| Adjustment workflow + edit window 30 ngày + clawback | 5-7 |
| Auto rule engine framework + 1 rule MVP | 5-7 |
| Webhook integration (iHOS 6 events) | 6-10 |
| Reminder + recall scheduler (cron 5p) | 3-4 |
| Notification system (push + email) | 4-5 |
| Pay cycle + Excel export | 5-7 |
| Audit log + retention | 3-4 |
| **Total Backend** | **63-88 ngày** |

Note: Backend hơi cao hơn estimate tóm gọn (45-64). Đây là số chi tiết hơn.

### 2.3 Testing strategy

- Unit tests: 80% coverage cho business rules (formula, state machines, calculations)
- Integration tests: webhook handlers, API endpoints
- E2E tests: critical flows (login, create order, approve CR, payday)
- Load test: 100 đơn/ngày × 30 ngày = 3000 đơn cycle

Cost: 30-42 ngày (25% of dev).

### 2.4 DevOps

- CI/CD setup
- Staging environment
- Production deployment
- Monitoring + alert (uptime, error rate, webhook fail)
- Backup automation (per R-10-1: backup mỗi 4h, giữ 1 năm)

Cost: 5-8 ngày.

---

## 3. Risk Register

### 3.1 HIGH risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | iHOS webhook contract không match assumption | HIGH | Anh contact iHOS trong 2 tuần. Nếu iHOS không gửi đủ field (vd `performed_by_user_id`, `recall_due_date`), workaround manual UI cho lễ tân/Diễm. Cost +5-10 ngày dev. |
| R2 | Zalo OA Verified chưa setup | HIGH | NP đăng ký ngay. Cost: free, 1-2 tuần admin work + 1-2 tuần Zalo approve template. Block module Login OTP, Reminder, Customer Follow-up. |
| R3 | Database performance scale 100 đơn/ngày | MEDIUM-HIGH | Index đúng (order_id, customer_id, cycle_id). Optimistic lock cho concurrent edit. Stress test 3 lần volume target. |
| R4 | Money handling precision (luật kế toán VN) | HIGH | bigint VND, decimal(5,2) %HH, half-up rounding cuối cùng. Đối soát Misa hằng tháng. |
| R5 | Auth security (OTP brute force, device hijack) | HIGH | Rate limit OTP 3 lần/SĐT/15 phút. Device binding chống share. Audit log đầy đủ. |

### 3.2 MEDIUM risks

| ID | Risk | Mitigation |
|---|---|---|
| R6 | Adjustment edit window clawback logic phức tạp | Test edge case nhiều: edit 1 lần, edit nhiều lần, edit sau payday, edit của edit. |
| R7 | Cross-month đơn (tạo cuối tháng, complete tháng sau) HH timing | UI thêm cột "Kì gốc" trên pay slip. Linh giải thích NV nếu cần. |
| R8 | Customer follow-up phụ thuộc iHOS recall_due_date | Nếu iHOS không gửi → module gần như non-functional. Fallback: NV/Hà gọi tay (out of app). |
| R9 | Auto rule fire timing chính xác (23:59 cuối tháng) | Cron job với retry 3 lần. Audit log fire history. CEO duyệt batch ngày 1-5. |
| R10 | Optimistic lock conflict | Hiện rare với 5 NV. Test concurrent edit edge case. UX clear khi conflict. |

### 3.3 LOW risks (managed)

- R11 Pay slip format đẹp (UI work)
- R12 Notification spam (rate limit per user)
- R13 NV nghỉ việc đột ngột (force handover TC)
- R14 BHYT reject (manual log InsuranceClaim)

---

## 4. Dependency Graph

### 4.1 External dependencies

```
NP App HH
  ├── iHOS (webhook + API)        ← BLOCKER A-4
  ├── Zalo OA (login + reminder)   ← BLOCKER A-5
  ├── Misa (kế toán đối soát)       ← Diễm dùng ngoài app
  └── Bank (chuyển khoản)          ← Diễm dùng ngoài app
```

### 4.2 Internal module dependencies

```
Auth (foundation)
  └─→ Permission middleware
       └─→ All other modules

Order lifecycle
  └─→ Commission calculation
       └─→ Pay cycle
            └─→ Excel export
                 └─→ Bank transfer (out of app)

Adjustment workflow
  └─→ Pay cycle clawback

Reminder schedule
  └─→ Notification module

Auto rule
  └─→ Adjustment workflow
       └─→ CEO approve queue

Customer follow-up
  └─→ Notification module
  └─→ iHOS recall_due_date
```

### 4.3 Critical path

Order lifecycle + HH calculation + Pay cycle = **must** for MVP. Không có 3 module này → app vô nghĩa.

Customer follow-up + Reminder + Auto rule = should for MVP, có thể defer 1-2 tuần sau launch nếu iHOS/Zalo OA chậm.

---

## 5. MoSCoW Scope

### 5.1 MUST HAVE (MVP launch)

| Module | B5 batch | Notes |
|---|---|---|
| Auth (SĐT + OTP Zalo + device binding) | B5.2 | Block bởi Zalo OA setup |
| Order lifecycle (CRUD + state machine 8 states) | Backend | |
| OrderRoleAssignment populate (Sale + TC + BS) | Backend | |
| HH calculation formula + snapshot ranking | Backend | |
| CR lifecycle (TAM_TINH → DUOC_DUYET) | Backend | |
| Adjustment workflow (KT tạo, CEO duyệt) | B5.1 (MS-9, MS-10) | |
| Pay cycle + Export Excel | B5.1 (MS-12) | |
| Permission matrix base 5 role | Backend | |
| Order screens (orders, order-detail, order-create, success) | B5.3, B5.5 | |
| Customer screens (customers, customer-detail) | Existing | |
| Income (HH cá nhân) | B5.3 | |
| Admin commission approval | B5.3 | |
| Admin staff (rework auth) | B5.2 | |
| Admin settings (10 sections) | B5.2 | |
| Login + Onboarding | B5.1 (MS-2), B5.2 (S-Login) | |
| Notification basic | B5.5 (MS-3) | |
| Audit log + retention | Backend | |

### 5.2 SHOULD HAVE (cố gắng MVP, có thể defer 2-4 tuần sau launch)

| Module | Cost defer impact |
|---|---|
| Reminder schedule (T-24h, T-2h, T+15p, T+30p) | NP vận hành thủ công, NV gọi tay khi cần |
| Customer follow-up dashboard (MS-7) | NV/Hà tự nhớ recall, log ngoài app |
| Auto rule "Thưởng target tháng" (MS-6) | CEO/Diễm tạo manual adjustment cuối tháng |
| Shift config (MS-5) | NP day-1 chỉ 1 shift, hardcode trước |
| Notification log audit (MS-8) | TC/CEO debug tay khi cần |
| Pay slip preview NV (MS-11) | NV xem Excel Diễm gửi |

### 5.3 COULD HAVE (defer Phase 2)

| Module | Lý do defer |
|---|---|
| Awards cuối tháng (Rising Star, Top Performer) | Manual qua MS-9 Adjustment đã đủ. PDF anh Nguyên defer. |
| Performance screen (theo dõi cá nhân) | Trùng dashboard + income. |
| Ranking conditional (NV/BS personal view) | Phase 1 tất cả role thấy full leaderboard cũng OK. |
| Bàn giao công việc dedicated screen (MS-4) | Hiếm xảy ra (NV nghỉ 1-2 lần/năm). Manual via admin-staff. |

### 5.4 WON'T HAVE (out of MVP, defer phase 2 hoặc hoàn toàn skip)

| Item | Status | Defer to |
|---|---|---|
| Penalty SLA rules (đi muộn, complaint, vi phạm SOP) | PDF defer | Phase 2 sau 6 tháng vận hành |
| Auto Reward review 5 sao (Google/FB/Zalo) | PDF defer | Phase 2 hoặc skip |
| 90-day probation auto tracking | PDF defer | Phase 2 (manual tracking đủ) |
| Customer complaint dedicated flow | PDF defer | Phase 2 (manual qua MS-9) |
| Permission role-based config (Sapo-style) | Architecture note phase 2 | Phase 2 |
| Combo/liệu trình dịch vụ | B1 G6 phase 2 | Phase 2 |
| AI chat (ai-chat.tsx) | Defer phase 2 | Phase 2 |
| Component playground (np-playground.tsx) | Bỏ khỏi production | Sẽ tạo reference doc riêng |

---

## 6. Milestones + Sprint Plan

### 6.1 Milestone breakdown (assume 2 devs parallel)

**M1: Foundation (Tuần 1-4, 4 tuần)**

Sprint 1-2:
- Database schema + migrations
- Auth (SĐT + OTP Zalo) - block bởi Zalo OA setup
- Permission middleware base 5 role
- Login screen + Onboarding (MS-2)

Gate M1: Anh Phú demo login + permission cho anh Nguyên.

**M2: Core HH engine (Tuần 5-8, 4 tuần)**

Sprint 3-4:
- Order lifecycle + state machine
- OrderRoleAssignment populate logic
- HH formula + snapshot ranking
- CR lifecycle (TAM_TINH → DUOC_DUYET)
- Order screens (orders, order-detail, order-create, MS-1 success)

Gate M2: Demo end-to-end "tạo đơn → ăn HH" cho anh Nguyên.

**M3: Adjustment + Pay cycle (Tuần 9-12, 4 tuần)**

Sprint 5-6:
- Adjustment workflow (MS-9 KT tạo, MS-10 CEO duyệt)
- Edit window 30 ngày + clawback delta
- Pay cycle workflow + Export Excel (MS-12)
- Income screen + Pay slip preview (MS-11)
- Admin commission approval với khiếu nại flow

Gate M3: Diễm demo 1 cycle thực tế (test với data fake).

**M4: Integrations + Admin (Tuần 13-16, 4 tuần)**

Sprint 7-8:
- iHOS webhook integration (6 events) - block bởi A-4
- Zalo OA reminder + Notification module
- Admin staff (rework auth + offboarding)
- Admin settings (10 sections, một số defer)
- Customer follow-up base (MS-7)

Gate M4: Test integration với iHOS + Zalo OA staging.

**M5: Customer engagement + Polish (Tuần 17-20, 4 tuần)**

Sprint 9-10:
- Shift config (MS-5)
- Auto rule MVP (MS-6)
- Notification list (MS-3)
- Notification log audit (MS-8)
- Bàn giao công việc (MS-4)
- Performance + Ranking conditional
- E2E testing

Gate M5: UAT (User Acceptance Test) với Diễm + Hà + 1 NV.

**M6: Launch prep (Tuần 21-24, 4 tuần)**

Sprint 11-12:
- Pilot 2 tuần với data thật của NP
- Bug fix + polish
- Documentation handoff
- Training NP staff
- Go-live

Gate M6: Anh Nguyên approve go-live.

**Total: 24 tuần = 6 tháng (2 devs parallel)**.

### 6.2 Critical path

M1 (Auth) → M2 (HH engine) → M3 (Pay cycle) là critical path.

M4 (Integrations) có thể delay nếu iHOS/Zalo OA chậm, nhưng KHÔNG block M5 frontend work (Shift, Auto Rule, etc. có thể build với mock).

### 6.3 Sprint cadence

- 2-tuần sprint
- Daily standup 15 phút
- Sprint planning đầu sprint
- Sprint review + demo cuối sprint
- Retrospective 30 phút

---

## 7. Action items cho anh Phú (CRITICAL trước khi dev start)

### 7.1 Trong 1-2 tuần tới

| ID | Action | Priority | Block |
|---|---|---|---|
| AI-1 | Liên hệ iHOS team. Confirm webhook events + payload structure. Template message trong PENDING-ITEMS section A. | CRITICAL | M4 |
| AI-2 | Đăng ký Zalo OA Verified cho NP. Setup template tin nhắn. | CRITICAL | M1 + M4 |
| AI-3 | Quyết định team dev: 1 dev in-house, 2 devs in-house, hay agency. | CRITICAL | Toàn bộ |
| AI-4 | Confirm bank của NP (cho format file chuyển khoản). Fallback: generic Excel. | MEDIUM | M3 |
| AI-5 | Chốt 7 questions LOW còn lại (C-4, C-5, C-6, C-7) khi tiện. | LOW | Inline trong sprint |

### 7.2 Trong 3-4 tuần tới

| ID | Action | Priority |
|---|---|---|
| AI-6 | Communicate với anh Nguyên về MVP scope vs Phase 2 (defer items). | HIGH |
| AI-7 | Plan pilot 2 tuần với NP staff (Diễm, Hà, 1-2 NV) trước go-live. | MEDIUM |
| AI-8 | Quyết định hosting (VPS hiện tại của NP hay cloud mới). | MEDIUM |
| AI-9 | Backup strategy + retention (theo R-10-1: backup 4h/lần, giữ 1 năm). | MEDIUM |

### 7.3 Trong 6 tháng đầu vận hành (post-launch)

| ID | Action | Priority |
|---|---|---|
| AI-10 | Monitor pattern: NV vi phạm SLA, KH skip recall, bonus fire. Data làm input cho Phase 2. | LOW |
| AI-11 | Review G1 ranking thresholds với data thực. | LOW |
| AI-12 | Decide Phase 2 features: penalty rules, awards auto, role-based permission. | MEDIUM |

---

## 8. Phase 2 roadmap (post-MVP)

### 8.1 Sau 3 tháng vận hành

- Review feedback từ NV, Diễm, Hà
- Identify pain points
- Decide priorities Phase 2

### 8.2 Phase 2 candidates

| Feature | Cost dev | Trigger |
|---|---|---|
| Penalty SLA rules (đi muộn, complaint) | 14-19 ngày | Khi NP scale > 30 NV hoặc vi phạm > 10/tháng |
| Awards cuối tháng auto (Rising Star, Top Performer) | 4-5 ngày | Khi anh Nguyên thấy cần motivation tool |
| Permission role-based config (Sapo-style) | 10-15 ngày | Khi cần thêm role mới (vd Receptionist, Marketing) |
| Auto Reward review 5 sao | 15-20 ngày | Khi NP có volume review đáng kể |
| 90-day probation tracking | 5-7 ngày | Khi vi phạm có pattern repeat |
| Customer complaint dedicated flow | 7-10 ngày | Khi volume complaint cao |
| Combo/liệu trình dịch vụ | 10-15 ngày | Khi NP launch package products |

---

## 9. Document deliverables for dev handoff

| Document | Status | Mục đích |
|---|---|---|
| B1-bien-ban-context.md | FINAL v16 | Context + business model + entity dictionary |
| B2.1-2.4 (4 files) | FINAL | Workflow + persona + BPMN + edge cases + pay cycle |
| B3-screen-audit.md | FINAL | Audit existing screens + gap analysis |
| B4-business-rules.md | FINAL v3 | ~75 business rules consolidate |
| B5.1-5.5 (5 files) | FINAL | Spec chi tiết 20+ screens |
| ADR-001-truong-ca-architecture.md | FINAL | Shift architecture decision |
| PENDING-ITEMS.md | Living doc | Open questions + actions |
| **B6-implementation-plan.md** | **THIS DOC** | **Plan thực thi** |
| UI-COMPONENTS-REFERENCE.md | TODO | Sẽ tạo khi dev start |

---

## 10. Risks of going alone (1 dev)

Anh Phú mention dev nhỏ. Nếu chỉ 1 dev:

**Pros**:
- Cost thấp nhất
- Coordination đơn giản

**Cons**:
- Timeline 9-13 tháng (quá dài cho NP đang lỗ)
- Bus factor 1 (dev nghỉ → project freeze)
- Burn-out risk
- Slow learning loop (1 người không có sparring partner)

**Recommend**: 2 devs parallel.

Cost difference: 1 dev × 12 tháng vs 2 devs × 6 tháng = same total man-month, nhưng 2 devs launch sớm 6 tháng → revenue earlier + reduce loss earlier.

---

## 11. Lịch sử update

| Date | Update |
|---|---|
| 2026-05-05 v1 | Tạo file. Aggregate B1-B5. Cost 179-255 ngày dev. Timeline 6 tháng (2 devs). 5 risks HIGH. 6 milestones. 9 action items. |
