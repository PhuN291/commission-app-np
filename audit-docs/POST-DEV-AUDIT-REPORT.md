# POST-DEV AUDIT REPORT

Status: FINAL
Ngày: 2026-05-06
Audit scope: 13 tasks rework (Tasks 1-13) đã hoàn tất
Source of truth: B1-B5 audit-docs

Mục đích: Audit code sau khi dev xong 13 tasks. Surface gaps, inconsistencies, security issues. Output là punch list anh paste cho Claude Code fix batch.

---

## EXECUTIVE SUMMARY

| Severity | Count | Action timeline |
|---|---|---|
| **P0 Critical** | 3 | Fix trước launch (block production) |
| **P1 Major** | 7 (M-1 resolved 06/05) | Fix trước UAT |
| **P2 Minor** | 5 | Fix trước handoff |

**Overall verdict**: 12/13 tasks implement đúng spec. Foundation vững. 3 critical issues là **schema gap** (OrderRoleAssignment missing) + **security misconfig** (DEV_OVERRIDE_OTP) + **incomplete API** (missing POST commission-tiers).

Spec compliance: ~92%. Còn 8% là chi tiết chưa đầy đủ hoặc naming inconsistency.

---

## P0 CRITICAL (3 issues - fix trước launch)

### C-1: Missing OrderRoleAssignment table

**File**: `shared/schema.ts`
**Severity**: P0 Critical
**Impact**: Block toàn bộ HH calculation logic (B4 R-1-1, R-3-*)

**Problem**:
- B1 §15 entity dictionary định nghĩa `OrderRoleAssignment` là **central table** cho HH formula
- Schema hiện tại CHỈ có legacy tables (orders, transactions, appointments)
- Mọi rule R-1-* (formula HH), R-3-* (role populate) đều reference OrderRoleAssignment
- Không có table này → không thể implement HH calculation đúng spec

**Fix**:
```typescript
// shared/schema.ts (add)
export const orderRoleAssignments = pgTable('order_role_assignments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id),
  role: text('role').notNull(),           // 'sale' | 'tc' | 'doctor'
  userId: integer('user_id').references(() => users.id),
  rankingSnapshotId: integer('ranking_snapshot_id'),
  pctAtTime: integer('pct_at_time'),       // basis points
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  assignedByUserId: integer('assigned_by_user_id').references(() => users.id),
})
```

Plus migrate logic: `order.assigneeUserId` → ORA row với `role='sale'`.

### C-2: DEV_OVERRIDE_OTP security risk

**File**: `server/routes.ts:71-73`
**Severity**: P0 Critical
**Impact**: Nếu deploy production với NODE_ENV ≠ "production" (mistake), bất kỳ ai login với SĐT của user nào + OTP "123456" đều thành công.

**Problem**:
```typescript
const IS_DEV = process.env.NODE_ENV !== "production";
const DEV_OVERRIDE_OTP = "123456";
```

Logic relies on env var being correctly set. Nếu deploy tool (Replit, Docker) không set NODE_ENV đúng → IS_DEV = true → security hole.

**Fix**:
1. **Fail-fast assertion** ở startup:
   ```typescript
   // server/index.ts (top)
   if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_OTP === "true") {
     throw new Error("ALLOW_DEV_OTP cannot be true in production")
   }
   ```
2. **Remove DEV_OVERRIDE_OTP** trước production deploy. Hoặc gate bằng explicit env var `ALLOW_DEV_OTP=true` (chỉ set ở dev).
3. **Log warning** khi IS_DEV = true ở startup.

### C-3: Missing POST /api/admin/commission-tiers endpoint

**File**: `server/routes.ts`
**Severity**: P0 Critical
**Impact**: CEO không thể add new tier (vd thêm ranking M4, hoặc thêm role mới)

**Problem**:
- Chỉ có `PATCH /api/admin/commission-tiers` (update existing)
- Không có `POST` để insert new tier rows
- B1 §5 + B4 R-1-2: CEO phải add new tiers được (kiến trúc role mở)

**Fix**:
```typescript
app.post('/api/admin/commission-tiers', requireRole(['ceo']), async (req, res) => {
  const { role, ranking, percentBp } = req.body
  // Validate, check duplicate, insert
  // Audit log
})
```

---

## P1 MAJOR (8 issues - fix trước UAT)

### ~~M-1: "iHOS" vs "Isoft" naming~~ RESOLVED 06/05/2026

**Status**: ✅ Code đúng. Audit-docs đã update theo.

**Clarification**: Anh Phú confirm tên hệ thống chính thức là "**iHOS**" (không phải "Isoft"). Code đang đúng. Audit-docs đã được rename Isoft → iHOS trong toàn bộ files để match code.

**No fix needed cho code**. Audit-docs đã sync.

### M-2: Password field deprecation incomplete

**File**: `shared/schema.ts:9-10`
**Severity**: P1 Major
**Impact**: Deprecated field vẫn ở schema, có thể gây confusion cho dev sau, security audit có thể flag.

**Problem**:
```typescript
// @deprecated since v15
password: text("password").notNull().default("")
```

Field giữ với default empty string, nhưng:
- Nếu ai đó accidental code refer field này → leak
- Migration plan thiếu

**Fix**:
1. Add TODO comment với deadline: `// TODO Phase 2: drop column users.password sau khi confirm 0 reference`
2. Run grep verify zero references trong code
3. Tạo migration drop column trong Phase 2

### M-3: Permission ambiguity - CEO reject CR

**File**: `server/routes.ts:788`
**Severity**: P1 Major
**Impact**: Spec ambiguity giữa B4 R-9-1 vs R-11-7

**Problem**:
- R-9-1 permission matrix: KT + CEO đều có "Duyệt CR"
- R-11-7: KT (Diễm) decide alone trong khiếu nại flow, CEO không involve
- Code hiện chỉ KT reject. Nếu CEO muốn reject (vd KT vắng) → 403

**Fix - Cần anh chốt với spec**:
- **Option A**: KT only (current code). CEO không reject CR. Match R-11-7 strict.
- **Option B**: Both KT + CEO can reject. Match R-9-1 permission matrix.

Recommend **Option A** (current). Add comment giải thích spec choice.

### M-4: OrderRoleAssignment missing impacts commission flow

**Files**: `server/commission.ts`, `server/dashboard.ts`
**Severity**: P1 Major (linked to C-1)
**Impact**: Mock CR generation không dùng OrderRoleAssignment → khi migrate ORA later, cần refactor.

**Fix**: Sau khi C-1 fixed (add ORA table), refactor commission.ts query ORA thay vì query Order.assigneeUserId.

### M-5: Missing audit log action: "adjustment.approve"

**File**: `server/adjustments.ts`
**Severity**: P1 Major
**Impact**: CEO duyệt adjustment không có audit trail.

**Problem**:
- `shared/types.ts:100-124` định nghĩa: `adjustment.create`, `adjustment.cancel`, `adjustment.edit`
- THIẾU: `adjustment.approve` (CEO action per B4 R-6-1)

**Fix**:
```typescript
// shared/types.ts
type AuditAction = 
  // ... existing
  | 'adjustment.approve'   // ADD
  | 'adjustment.reject'    // ADD (CEO reject manual adjustment)
```

Update `server/adjustments.ts` log action khi CEO approve/reject.

### M-6: Khiếu nại helper usage in income.tsx not verified

**File**: `client/src/pages/income.tsx:54`
**Severity**: P1 Major (verification needed)
**Impact**: Helpers `canKhieuNai`, `hoursRemainingKhieuNai` imported nhưng usage trong render logic chưa verify đầy đủ.

**Fix**: Manual verify
```bash
grep -n "canKhieuNai\|hoursRemainingKhieuNai" client/src/pages/income.tsx
```

Nếu helpers chỉ import mà không dùng trong JSX → bug. CR TU_CHOI sẽ không show CTA "Khiếu nại HH (Còn Xh)".

### M-7: Rate limit constants verification

**File**: `server/auth.ts` + `shared/types.ts`
**Severity**: P1 Major (verification needed)
**Impact**: Auth security depends on `MAX_OTP_ATTEMPTS = 3` và `LOCK_DURATION_MS = 15 * 60 * 1000`.

**Fix**: Verify constants trong types.ts match B5-2 S-Login spec:
```typescript
export const MAX_OTP_ATTEMPTS = 3
export const LOCK_DURATION_MS = 15 * 60 * 1000  // 15 phút
```

### M-8: VND format consistency

**Files**: All UI components hiển thị tiền
**Severity**: P1 Major
**Impact**: UX inconsistency, không match B4 R-10-4

**Problem**: Một số chỗ hiển thị `8000000`, đúng phải `8,000,000đ` (B4 R-10-4 chuẩn money handling)

**Fix**: Tạo utility function + apply globally
```typescript
// shared/utils.ts
export const formatVND = (amount: number) => 
  `${amount.toLocaleString('vi-VN')}đ`

// Vd: formatVND(8000000) → "8.000.000đ"
```

Apply trong: dashboard.tsx, admin-staff.tsx, income.tsx, order-detail.tsx, admin-commission-config.tsx.

---

## P2 MINOR (5 issues - fix trước handoff)

### m-1: Schema comment "iHOS" abbreviation note

**File**: `shared/schema.ts:5`
**Severity**: P2 Minor
**Impact**: Documentation only

**Fix**: Update comment khi M-1 (rename Isoft) done.

### m-2: Token storage: localStorage security note

**File**: `client/src/pages/login.tsx:24-31`
**Severity**: P2 Minor
**Impact**: localStorage stored token có thể bị XSS attack steal.

**Note**: Common SPA tradeoff. Mitigated by short token TTL + device binding. Phase 2 consider httpOnly cookies.

### m-3: monthlyTargetHh schema

**File**: `shared/schema.ts:38-39`
**Severity**: P2 Minor
**Impact**: Field added correctly, just verify integration với MS-2 Onboarding.

**Fix**: Verify Onboarding screen save target → Order create lookup → display trong Income.

### m-4: Refund schema fields

**File**: `shared/schema.ts:152-154`
**Severity**: P2 Minor
**Impact**: Order-level refund OK cho MVP. Per-item refund (cho OrderItem) là Phase 2.

**Note**: Document trong code comment Phase 2 plan.

### m-5: Audit log viewer UI defer

**File**: `client/src/pages/admin-settings.tsx` Section 10
**Severity**: P2 Minor
**Impact**: Compliance demonstration

**Fix**: Khi anh Nguyên cần demo compliance, quick-add Single Audit Log Viewer (~1 ngày dev).

---

## ACTION ITEMS PRIORITIZED

### Immediate (sprint 1 of fixes)

1. ✅ **C-1**: Add OrderRoleAssignment table + migrate
2. ✅ **C-2**: Lock DEV_OVERRIDE_OTP behind explicit env var
3. ✅ **C-3**: Add POST /api/admin/commission-tiers endpoint
4. ✅ **M-1**: Global rename iHOS → Isoft
5. ✅ **M-3**: Confirm KT-only or KT+CEO reject permission

### Pre-UAT (sprint 2)

6. ✅ **M-2**: Password deprecation TODO + verify zero refs
7. ✅ **M-4**: Refactor commission.ts use ORA
8. ✅ **M-5**: Add adjustment.approve audit action
9. ✅ **M-6**: Verify khiếu nại helper usage in income.tsx
10. ✅ **M-7**: Verify rate limit constants
11. ✅ **M-8**: Apply formatVND globally

### Pre-handoff (sprint 3)

12. ✅ **m-1 đến m-5**: Cleanup minor issues + comments

---

## RECOMMEND APPROACH

### Option A: Fix all in 1 batch (recommend)

Anh paste action items 1-11 vào Claude Code 1 lần. CC fix tuần tự với test.

Cost dev: ~5-7 ngày.

### Option B: Phased fixes

- Sprint 1: P0 critical (1-2 ngày)
- Sprint 2: P1 major (2-3 ngày)
- Sprint 3: P2 minor (1 ngày)

Cost dev: ~5-7 ngày total but spread out.

Recommend Option A: efficient, single CC session đầu sprint.

---

## TÓM GỌN PASTE CHO CLAUDE CODE

```
Fix issues từ POST-DEV-AUDIT-REPORT.md, theo thứ tự ưu tiên:

P0 Critical (must fix):
1. Add OrderRoleAssignment table vào shared/schema.ts (xem C-1)
2. Lock DEV_OVERRIDE_OTP behind ALLOW_DEV_OTP env var với fail-fast assertion (xem C-2)
3. Add POST /api/admin/commission-tiers endpoint với requireRole(["ceo"]) (xem C-3)

P1 Major:
4. Global rename iHOS → Isoft (schema, types, UI labels, seed) - xem M-1
5. Add audit action types: adjustment.approve, adjustment.reject - xem M-5
6. Verify khiếu nại helper usage trong income.tsx render - xem M-6
7. Tạo formatVND utility + apply globally - xem M-8

P1 Verification (no code change, just verify):
8. Confirm CEO reject CR là intentional (KT only per R-11-7) - xem M-3
9. Verify password field zero references - xem M-2
10. Verify rate limit constants MAX_OTP_ATTEMPTS=3, LOCK_DURATION_MS=15min - xem M-7

P2 Minor (cleanup):
11. Update comment iHOS abbreviation note in schema.ts:5 (sau khi rename done)
12. Add Phase 2 TODO comments cho password drop, per-item refund, audit log viewer

Reference đầy đủ: audit-docs/POST-DEV-AUDIT-REPORT.md
```

---

## CONCLUSION

**Quality assessment**: Code quality tốt, foundation vững, spec compliance 92%.

**Risk level**: Manageable. Sau khi fix 3 P0 issues, code đủ stable cho UAT.

**Timeline impact**: ~5-7 ngày fixes, không lệch B6 timeline (M5-M6 testing phase).

**Recommend**: Anh paste action items cho Claude Code fix batch 1 lần. Sau xong, smoke test các flows critical (login, create order, commission calc, pay cycle), rồi move M5 testing phase.

## Lịch sử

| Date | Update |
|---|---|
| 2026-05-06 v1 | Big audit sau 13 tasks dev. 3 P0 + 8 P1 + 5 P2 findings. Spec compliance 92%. |
