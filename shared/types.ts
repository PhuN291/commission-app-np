/**
 * Shared enums + Zod schemas dùng chung FE/BE.
 *
 * Spec: audit-docs/B5-2-screen-specs-batch-2.md Section 2 (S-Admin-Staff)
 * + audit-docs/B1-bien-ban-context.md Section 11 (iHOS mapping — note audit docs vẫn dùng "Isoft", rename khi spec batch sau).
 *
 * Note: text enum thay vì FK tables — đủ cho NP scale 5-10 NV (per v15 chốt).
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// User Roles
// ─────────────────────────────────────────────────────────────────

export const USER_ROLES = ["ceo", "tc", "kt", "sale", "doctor"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABEL: Record<UserRole, string> = {
  ceo: "CEO",
  tc: "Trưởng ca",
  kt: "Kế toán",
  sale: "Điều dưỡng",
  doctor: "Bác sĩ",
};

// ─────────────────────────────────────────────────────────────────
// Rankings
// ─────────────────────────────────────────────────────────────────

export const RANKINGS = ["M0", "M1", "M2", "M3", "L1", "L2", "L3"] as const;
export type Ranking = (typeof RANKINGS)[number];

export const RANKING_LABEL: Record<Ranking, string> = {
  M0: "Tập sự",
  M1: "Đồng",
  M2: "Bạc",
  M3: "Vàng",
  L1: "Sơ cấp",
  L2: "Trung cấp",
  L3: "Chuyên gia",
};

/**
 * Ngưỡng promotion ranking — placeholder cho đến khi anh Nguyên chốt B-6.
 * TODO B-6: chốt sau 3-6 tháng vận hành để tránh ngưỡng quá thấp/cao.
 * Format: { revenue: VND/tháng, months: số tháng liên tiếp đạt }.
 * Top tier (M3, L3) không có entry — đỉnh tier.
 */
export const RANKING_THRESHOLDS: {
  sale: Partial<Record<Ranking, { revenue: number; months: number }>>;
  doctor: Partial<Record<Ranking, { revenue: number; months: number }>>;
} = {
  sale: {
    M0: { revenue: 10_000_000, months: 1 },
    M1: { revenue: 20_000_000, months: 2 },
    M2: { revenue: 30_000_000, months: 3 },
  },
  doctor: {
    L1: { revenue: 30_000_000, months: 1 },
    L2: { revenue: 50_000_000, months: 2 },
  },
};

/** Tier kế tiếp — null nếu đã ở đỉnh hoặc không có ranking. */
export function getNextRanking(current: Ranking | null | undefined): Ranking | null {
  if (current === "M0") return "M1";
  if (current === "M1") return "M2";
  if (current === "M2") return "M3";
  if (current === "L1") return "L2";
  if (current === "L2") return "L3";
  return null;
}

/** Ranking nào hợp lệ với role nào. CEO/TC/KT không có ranking. */
export const RANKING_FOR_ROLE: Record<UserRole, readonly Ranking[]> = {
  ceo: [],
  tc: [],
  kt: [],
  sale: ["M0", "M1", "M2", "M3"],
  doctor: ["L1", "L2", "L3"],
};

// ─────────────────────────────────────────────────────────────────
// User Status (lifecycle)
// ─────────────────────────────────────────────────────────────────

export const USER_STATUSES = ["active", "pending_offboarding", "offboarded"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const STATUS_LABEL: Record<UserStatus, string> = {
  active: "Đang làm việc",
  pending_offboarding: "Sắp nghỉ",
  offboarded: "Đã nghỉ",
};

// ─────────────────────────────────────────────────────────────────
// Audit log actions
// ─────────────────────────────────────────────────────────────────

export const AUDIT_ACTION_LABEL = {
  // User lifecycle
  "user.create": "Tạo nhân sự",
  "user.update": "Cập nhật thông tin",
  "user.mark_offboarding": "Đánh dấu sắp nghỉ",
  "user.reactivate": "Kích hoạt lại",
  "user.force_unbind": "Gỡ thiết bị",
  "user.soft_delete": "Đánh dấu đã nghỉ",
  // CR (Commission Record) lifecycle — B5-3 Section 3
  "cr.approve": "Duyệt hoa hồng",
  "cr.reject": "Từ chối hoa hồng",
  "cr.bulk_approve_order": "Duyệt cả đơn",
  "cr.bulk_approve_cycle": "Duyệt toàn bộ kỳ",
  "cr.complaint_submit": "Gửi khiếu nại",
  "cr.complaint_resolve_revert": "Khiếu nại: Khôi phục và duyệt",
  "cr.complaint_resolve_keep": "Khiếu nại: Giữ từ chối",
  // Adjustment lifecycle (B4 R-6-*)
  "adjustment.create": "Tạo điều chỉnh",
  "adjustment.cancel": "Hủy điều chỉnh chờ",
  "adjustment.edit": "Sửa điều chỉnh (tạo truy thu)",
  // Settings (B5-2 Section 3 — admin-settings)
  "setting.auto_rule_update": "Cập nhật Auto Rule",
  "setting.pay_cycle_update": "Cập nhật kỳ lương",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTION_LABEL;

// ─────────────────────────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────────────────────────

const baseStaffFields = {
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  phone: z.string().min(9, "Số điện thoại không hợp lệ"),
  role: z.enum(USER_ROLES),
  ranking: z.enum(RANKINGS).nullable().optional(),
  ihosUserId: z.string().nullable().optional(),
  monthlyTargetHh: z.number().int().nonnegative().default(0),
  monthlyTargetOrders: z.number().int().nonnegative().default(0),
};

/** BS bắt buộc có ihosUserId; ranking phải match role (hoặc null nếu role=ceo/tc/kt). */
function refineStaff<T extends z.ZodObject<typeof baseStaffFields>>(schema: T) {
  return schema
    .refine(
      (d) =>
        d.role !== "doctor" || (d.ihosUserId !== null && d.ihosUserId !== undefined && d.ihosUserId.length > 0),
      { message: "Bác sĩ bắt buộc có Mã iHOS", path: ["ihosUserId"] },
    )
    .refine(
      (d) => {
        const allowedRankings = RANKING_FOR_ROLE[d.role];
        if (allowedRankings.length === 0) return d.ranking == null; // ceo/tc/kt không có ranking
        return d.ranking != null && (allowedRankings as readonly string[]).includes(d.ranking);
      },
      { message: "Bậc không hợp lệ với vai trò", path: ["ranking"] },
    );
}

export const adminCreateStaffSchema = refineStaff(z.object(baseStaffFields));
export type AdminCreateStaffInput = z.infer<typeof adminCreateStaffSchema>;

/** Update partial — không refine BS-iHOS vì có thể chỉ patch 1 field. Server kiểm sau. */
export const adminUpdateStaffSchema = z.object(baseStaffFields).partial();
export type AdminUpdateStaffInput = z.infer<typeof adminUpdateStaffSchema>;

export const markOffboardingSchema = z.object({
  offboardingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng YYYY-MM-DD"),
});
export type MarkOffboardingInput = z.infer<typeof markOffboardingSchema>;

// ─────────────────────────────────────────────────────────────────
// Commission tier config (B4 R-1-2 + R-1-3)
// ─────────────────────────────────────────────────────────────────

/** Roles có HH per đơn. KT + CEO không có (R-1-2). */
export const COMMISSIONABLE_ROLES = ["sale", "tc", "doctor"] as const;
export type CommissionableRole = (typeof COMMISSIONABLE_ROLES)[number];

/**
 * Ranking hợp lệ cho từng commissionable role.
 * - sale: M0..M3 (4 ranks)
 * - tc: [null] — flat rate, không ranking (B2.3 nhân vật table)
 * - doctor: L1..L3 (3 ranks)
 */
export const COMMISSION_RANKINGS: Record<CommissionableRole, readonly (Ranking | null)[]> = {
  sale: ["M0", "M1", "M2", "M3"],
  tc: [null],
  doctor: ["L1", "L2", "L3"],
};

/** Tier hiện diện trong UI matrix — cố định 8 row tổng. */
export type TierKey = { role: CommissionableRole; ranking: Ranking | null };

export function tierKeyToString(k: TierKey): string {
  return `${k.role}:${k.ranking ?? "-"}`;
}

// ─────────────────────────────────────────────────────────────────
// Order Items + Skipped reasons (B4 R-2-5, B5-3 Section 2)
// ─────────────────────────────────────────────────────────────────

export const ORDER_ITEM_STATUSES = ["planned", "completed", "skipped"] as const;
export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number];

export const SKIPPED_REASONS = [
  "customer_left",
  "insurance_rejected",
  "patient_changed_mind",
  "service_not_executable",
  "medical_contraindication",
  "consent_refused",
  "other",
] as const;
export type SkippedReason = (typeof SKIPPED_REASONS)[number];

export const SKIPPED_REASON_LABEL: Record<SkippedReason, string> = {
  customer_left: "Khách bỏ về",
  insurance_rejected: "Bảo hiểm từ chối",
  patient_changed_mind: "Khách đổi ý",
  service_not_executable: "Dịch vụ không thực hiện được",
  medical_contraindication: "Chống chỉ định y khoa",
  consent_refused: "Khách từ chối",
  other: "Khác",
};

export const markItemStatusSchema = z.object({
  status: z.enum(ORDER_ITEM_STATUSES),
  skippedReason: z.enum(SKIPPED_REASONS).nullable().optional(),
});
export type MarkItemStatusInput = z.infer<typeof markItemStatusSchema>;

// ─────────────────────────────────────────────────────────────────
// Commission Record states (B4 R-2-3) + khiếu nại window (R-11-7)
// ─────────────────────────────────────────────────────────────────

export const CR_STATUSES = [
  "TAM_TINH",
  "CHO_DUYET",
  "DUOC_DUYET",
  "TU_CHOI",
  "KHIEU_NAI",
  "CLAWBACK_PENDING",
  "CANCEL",
] as const;
export type CRStatus = (typeof CR_STATUSES)[number];

export const CR_STATUS_LABEL: Record<CRStatus, string> = {
  TAM_TINH: "Tạm tính",
  CHO_DUYET: "Chờ duyệt",
  DUOC_DUYET: "Đã duyệt",
  TU_CHOI: "Bị từ chối",
  KHIEU_NAI: "Đang khiếu nại",
  CLAWBACK_PENDING: "Truy thu chờ",
  CANCEL: "Hủy",
};

/** Khiếu nại window — 3 ngày sau khi CR bị reject (R-11-7). */
export const KHIEU_NAI_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export function canKhieuNai(cr: { status: string; rejectedAt: number | null }): boolean {
  if (cr.status !== "TU_CHOI" || !cr.rejectedAt) return false;
  return Date.now() - cr.rejectedAt < KHIEU_NAI_WINDOW_MS;
}

/**
 * Trạng thái CR được tính vào TỔNG HOA HỒNG GROSS (kiếm được) — dùng chung cho trang chủ,
 * bảng xếp hạng, màn thu nhập để ba nơi ra cùng một con số.
 * Loại ra: TU_CHOI (bị từ chối), CANCEL (hủy), CLAWBACK_PENDING (truy thu — mục trừ riêng).
 */
export const GROSS_COMMISSION_STATUSES = [
  "TAM_TINH",
  "CHO_DUYET",
  "DUOC_DUYET",
  "KHIEU_NAI",
] as const satisfies readonly CRStatus[];

export function isGrossCommission(status: string): boolean {
  return (GROSS_COMMISSION_STATUSES as readonly string[]).includes(status);
}

export function hoursRemainingKhieuNai(rejectedAt: number | null): number {
  if (!rejectedAt) return 0;
  const elapsed = Date.now() - rejectedAt;
  return Math.max(0, Math.floor((KHIEU_NAI_WINDOW_MS - elapsed) / (60 * 60 * 1000)));
}

export const rejectCRSchema = z.object({ reason: z.string().min(2, "Lý do tối thiểu 2 ký tự") });
export const complaintSchema = z.object({ content: z.string().min(2, "Nội dung tối thiểu 2 ký tự") });
export type RejectCRInput = z.infer<typeof rejectCRSchema>;
export type ComplaintInput = z.infer<typeof complaintSchema>;

// Admin-side reject (B5-3 Section 3.9: min 10 chars)
export const adminRejectCRSchema = z.object({
  reason: z.string().min(10, "Lý do tối thiểu 10 ký tự"),
});

// Bulk-all cycle approve (safety gate — type "DUYỆT")
export const BULK_APPROVE_KEYWORD = "DUYỆT";
export const bulkApproveCycleSchema = z.object({
  cycle: z.string().regex(/^\d{4}-\d{2}$/),
  typedConfirmation: z.literal(BULK_APPROVE_KEYWORD),
  acknowledged: z.literal(true),
});

// Khiếu nại resolve (R-11-7)
export const COMPLAINT_RESOLUTIONS = ["revert", "keep"] as const;
export type ComplaintResolution = (typeof COMPLAINT_RESOLUTIONS)[number];
export const resolveComplaintSchema = z
  .object({
    resolution: z.enum(COMPLAINT_RESOLUTIONS),
    note: z.string().optional(),
  })
  .refine(
    (d) => d.resolution !== "keep" || (d.note != null && d.note.length >= 2),
    { message: "Note required khi giữ từ chối", path: ["note"] },
  );

// ─────────────────────────────────────────────────────────────────
// Recall workflow (B4 R-8-5, R-8-6)
// ─────────────────────────────────────────────────────────────────

// Trạng thái tái khám gộp theo khách (suy từ order_items): còn lượt chờ gọi → "pending",
// đã xử lý hết → "done". (Đã bỏ "skipped" của hệ in-memory cũ.)
export const RECALL_STATUSES = ["pending", "done"] as const;
export type RecallStatus = (typeof RECALL_STATUSES)[number];

export const RECALL_STATUS_LABEL: Record<RecallStatus, string> = {
  pending: "Chờ gọi",
  done: "Đã gọi",
};

/** Kết quả call recall — log entry outcome. */
export const RECALL_OUTCOMES = [
  "scheduled",
  "no_answer",
  "refused",
  "other",
] as const;
export type RecallOutcome = (typeof RECALL_OUTCOMES)[number];

export const RECALL_OUTCOME_LABEL: Record<RecallOutcome, string> = {
  scheduled: "Đã đặt lịch tái khám",
  no_answer: "Chưa bắt máy",
  refused: "Khách từ chối",
  other: "Khác",
};

export const logRecallSchema = z.object({
  outcome: z.enum(RECALL_OUTCOMES),
  note: z.string().optional(),
});
export type LogRecallInput = z.infer<typeof logRecallSchema>;

// ─────────────────────────────────────────────────────────────────
// Adjustment + Clawback (B4 R-6-* + R-2-3)
// ─────────────────────────────────────────────────────────────────

export const ADJUSTMENT_TYPES = ["thuong", "phat"] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

export const ADJUSTMENT_SOURCES = ["manual", "auto_rule"] as const;
export type AdjustmentSource = (typeof ADJUSTMENT_SOURCES)[number];

/**
 * Adjustment lifecycle (B4 R-6):
 * - PENDING: Diễm tạo manual, chờ CEO duyệt
 * - AUTO_PENDING: rule engine sinh, chờ CEO duyệt (NV không thấy — C-1.1)
 * - APPROVED: CEO duyệt → vào kì lương
 * - REJECTED: CEO từ chối
 * - EDITED: trong 30-day edit window post-payday
 * - LOCKED: hết window
 */
export const ADJUSTMENT_STATUSES = [
  "PENDING",
  "AUTO_PENDING",
  "APPROVED",
  "REJECTED",
  "EDITED",
  "LOCKED",
] as const;
export type AdjustmentStatus = (typeof ADJUSTMENT_STATUSES)[number];

// ─────────────────────────────────────────────────────────────────
// Refund (R-2-1)
// ─────────────────────────────────────────────────────────────────

export const REFUND_TYPES = ["none", "partial", "full"] as const;
export type RefundType = (typeof REFUND_TYPES)[number];

// ─────────────────────────────────────────────────────────────────

export const updateCommissionTiersSchema = z.object({
  tiers: z
    .array(
      z.object({
        role: z.enum(COMMISSIONABLE_ROLES),
        ranking: z.enum(RANKINGS).nullable(),
        // Basis points: 0..10000 (0%..100%).
        percentBp: z.number().int().nonnegative().max(10000),
      }),
    )
    .min(1),
});
export type UpdateCommissionTiersInput = z.infer<typeof updateCommissionTiersSchema>;

// ─────────────────────────────────────────────────────────────────
// Auto Rule (B4 R-6-1, B5-2 §3.10)
// MVP chỉ có 1 rule: "Thưởng đạt target tháng". Phase 2 sẽ thêm rule phạt
// (chờ B-12 chốt). `+ Thêm rule mới` UI disabled cho đến khi expand engine.
// ─────────────────────────────────────────────────────────────────

export const AUTO_RULE_KEYS = ["target_bonus"] as const;
export type AutoRuleKey = (typeof AUTO_RULE_KEYS)[number];

export const AUTO_RULE_LABEL: Record<AutoRuleKey, string> = {
  target_bonus: "Thưởng đạt target tháng",
};

export const updateAutoRuleSchema = z.object({
  active: z.boolean(),
  // 100 = đạt 100% target HH tháng. Cho phép > 100 để khuyến khích vượt mức.
  targetPct: z.number().int().min(0).max(200),
  // % bonus tính trên revenue tháng khi đạt target.
  bonusPct: z.number().min(0).max(50),
});
export type UpdateAutoRuleInput = z.infer<typeof updateAutoRuleSchema>;

// ─────────────────────────────────────────────────────────────────
// Pay cycle settings (B5-2 §3.11, R-5-1)
// Cycle theo tháng dương lịch (cứng). Edit window 30 ngày sau payday + lock
// sau T+30 cũng cứng. Chỉ deadline + cap warning là editable.
// ─────────────────────────────────────────────────────────────────

export const updatePayCycleSchema = z.object({
  // Ngày trong tháng deadline payday (1-28 để tránh tháng 2).
  deadlineDay: z.number().int().min(1).max(28),
  // expected_total_pct_per_order — warning visual, không enforce cut.
  capWarningPct: z.number().min(0).max(100),
});
export type UpdatePayCycleInput = z.infer<typeof updatePayCycleSchema>;

// ─────────────────────────────────────────────────────────────────
// Notifications — in-app feed cho bell icon AppHeader.
// Sinh từ data thật (CR rejected/approved, recall overdue, adjustment, …).
// Read state in-memory per user. Phase 2: DB table notifications + WS realtime.
// ─────────────────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = [
  "cr.rejected",       // CR bị từ chối → NV/BS/TC xem income
  "cr.approved",       // CR được duyệt → NV/BS/TC xem income
  "cr.complaint_resolved", // Khiếu nại đã xử lý → NV
  "recall.due",        // KH đến hạn / quá hạn recall → NV chăm gốc + TC/KT/CEO
  "adjustment.created", // Adjustment thưởng/phạt mới → NV
  "order.created",     // Đơn mới (cho TC/KT view)
  "cr.pending_approval", // CR chờ KT duyệt → KT/CEO
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_LABEL: Record<NotificationType, string> = {
  "cr.rejected": "Hoa hồng bị từ chối",
  "cr.approved": "Hoa hồng được duyệt",
  "cr.complaint_resolved": "Khiếu nại đã xử lý",
  "recall.due": "Khách đến hạn tái khám",
  "adjustment.created": "Điều chỉnh hoa hồng mới",
  "order.created": "Đơn hàng mới",
  "cr.pending_approval": "Hoa hồng chờ duyệt",
};

// ─────────────────────────────────────────────────────────────────
// Thống kê chi tiêu của khách theo kỳ gần đây.
// Đặt ở shared để máy chủ (chi tiết khách) và giao diện (danh sách khách) dùng
// CHUNG một phép tính, tránh hai màn hiện hai số khác nhau cho cùng một khách.
// ─────────────────────────────────────────────────────────────────

/** Số tháng gần nhất dùng cho ô "Chi tiêu 12 tháng" và "Đơn 12 tháng". */
export const CUSTOMER_STATS_MONTHS = 12;

/** order.createdAt là text 'DD/MM/YYYY HH:mm' → Date đầu ngày; null nếu định dạng lạ. */
export function parseOrderDate(createdAt: string | null | undefined): Date | null {
  const datePart = (createdAt ?? "").trim().split(" ")[0]; // 'DD/MM/YYYY'
  const [dd, mm, yyyy] = datePart.split("/");
  const d = Number(dd);
  const m = Number(mm);
  const y = Number(yyyy);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return null;
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Đơn có nằm trong N tháng gần nhất tính từ hôm nay không.
 * Ngày sai định dạng trả false để không cộng nhầm vào thống kê.
 */
export function isWithinLastMonths(
  createdAt: string | null | undefined,
  months: number = CUSTOMER_STATS_MONTHS,
): boolean {
  const date = parseOrderDate(createdAt);
  if (!date) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  cutoff.setHours(0, 0, 0, 0);
  return date.getTime() >= cutoff.getTime();
}
