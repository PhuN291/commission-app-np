import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, serial, date, jsonb, doublePrecision, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  /** @deprecated since v15 — login bằng SĐT + OTP, password không còn dùng (B5-2 line 329). */
  password: text("password").notNull().default(""),
  // VN phone, normalized to 0xxxxxxxxx (10 digits, leading 0). Unique per user.
  // Used for SĐT + OTP login per B5-2 S-Login spec.
  phone: text("phone").notNull().unique(),
  // Account lock — set when 3 OTP attempts fail. ISO timestamp; null = not locked.
  lockedUntil: timestamp("locked_until"),
  name: text("name").notNull(),
  // UserRole enum from @shared/types: "ceo" | "tc" | "kt" | "sale" | "doctor".
  // Default sale per B1 — most users là ĐD-Sale.
  role: text("role").notNull().default("sale"),
  department: text("department").notNull().default("Phòng Kinh Doanh"),
  avatar: text("avatar"),
  /** @deprecated since v15 (B5-2) — use monthlyTargetHh / monthlyTargetOrders. Giữ tạm cho dashboard/income/performance cũ. */
  targetRevenue: integer("target_revenue").notNull().default(50000000),
  /** @deprecated since v15 (B5-2). */
  currentRevenue: integer("current_revenue").notNull().default(0),
  /** @deprecated since v15 (B5-2). */
  commissionRate: integer("commission_rate").notNull().default(5),
  // ── Added per B5-2 Section 2 (S-Admin-Staff) ─────────────────────
  // Ranking enum from @shared/types: M0-M3 cho sale, L1-L3 cho doctor, null cho ceo/tc/kt.
  ranking: text("ranking"),
  // Required khi role=doctor (validate ở zod adminCreateStaffSchema).
  // Mapping ID giữa NP App và iHOS hệ thống.
  ihosUserId: text("ihos_user_id"),
  // UserStatus enum: "active" | "pending_offboarding" | "offboarded".
  status: text("status").notNull().default("active"),
  // Format YYYY-MM-DD. Set khi mark-offboarding.
  offboardingDate: text("offboarding_date"),
  monthlyTargetHh: integer("monthly_target_hh").notNull().default(0),
  monthlyTargetOrders: integer("monthly_target_orders").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Self-FK to users.id; nullable for seed root user.
  createdByUserId: integer("created_by_user_id"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

/**
 * Commission tier config — Sale/TC/BS rates per ranking.
 * Spec: B4 R-1-2 (3 commissionable roles) + R-1-3 (snapshot per CR creation time).
 *
 * History via effective_from/to: edit %HH = mark old row effectiveTo=now() + insert new row.
 * Allows getEffectiveCommissionRate(role, ranking, at) to lookup historical rate
 * — needed when OrderRoleAssignment populates row at order CONFIRMED time (separate task).
 */
export const commissionTiers = pgTable("commission_tiers", {
  id: serial("id").primaryKey(),
  // CommissionableRole from @shared/types: 'sale' | 'tc' | 'doctor'.
  // KT/CEO không có row (R-1-2: KT/CEO không HH per đơn).
  role: text("role").notNull(),
  // Ranking from @shared/types. NULL khi role=tc (TC flat rate, không ranking — B2.3).
  ranking: text("ranking"),
  // Basis points: 300 = 3.00%. Integer tránh float precision.
  percentBp: integer("percent_bp").notNull(),
  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  // null = currently active. Set khi superseded by new row.
  effectiveTo: timestamp("effective_to"),
  createdByUserId: integer("created_by_user_id"),
});

export const insertCommissionTierSchema = createInsertSchema(commissionTiers).omit({ id: true });
export type InsertCommissionTier = z.infer<typeof insertCommissionTierSchema>;
export type CommissionTier = typeof commissionTiers.$inferSelect;

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull().default(0),
  commissionRange: text("commission_range").notNull(),
  requiresDoctor: boolean("requires_doctor").notNull().default(true),
  duration: text("duration").notNull(),
  insurance: text("insurance").notNull().default("Có hỗ trợ"),
  category: text("category"),
  diseaseType: text("disease_type"),
  // G1 (SPEC 3.2): giá vốn mặc định để tính lãi ròng (R-1-1). Chưa nối logic ở bước này.
  defaultCost: integer("default_cost").notNull().default(0),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  patientName: text("patient_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  serviceName: text("service_name").notNull(),
  serviceCode: text("service_code").notNull(),
  serviceCategory: text("service_category"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
  commission: integer("commission").notNull().default(0),
  appointmentStatus: text("appointment_status").notNull().default("pending"),
  visitStatus: text("visit_status"),
  notes: text("notes"),
  appointmentDate: text("appointment_date"),
  appointmentTime: text("appointment_time"),
  examType: text("exam_type"),
  vatCompanyName: text("vat_company_name"),
  vatTaxCode: text("vat_tax_code"),
  vatCompanyAddress: text("vat_company_address"),
  vatEmail: text("vat_email"),
  createdAt: text("created_at").notNull(),
  userId: integer("user_id").notNull(),
  // Refund (B5-3 Section 2). Phase 2: per-item refund cùng OrderItem table thật.
  refundAmount: integer("refund_amount").notNull().default(0),
  refundType: text("refund_type").notNull().default("none"), // 'none' | 'partial' | 'full'
  refundReason: text("refund_reason"),
  // ── G1 (SPEC 3.2): cột mới, tất cả nullable/có default → không phá dữ liệu cũ.
  // Chỉ định nghĩa schema, CHƯA nối logic (app vẫn in-memory ở bước này).
  customerId: integer("customer_id"),
  source: text("source").notNull().default("manual"), // 'manual' | 'ihos' | 'website'
  idempotencyKey: text("idempotency_key").unique(),    // chống nhận trùng webhook (R-12-4)
  // ── Phụ trách đơn: 3 chỗ, sửa được qua PATCH /api/orders/:id/assignees.
  // Cố ý TÁCH KHỎI bảng order_role_assignments (thứ quyết định ai ăn hoa hồng):
  // đây là ghi nhận ai làm gì trên ca, đổi ở đây KHÔNG dịch chuyển hoa hồng đã
  // chốt. Muốn nối hai thứ lại thì phải tính lại hoa hồng, việc đó chưa làm.
  saleUserId: integer("sale_user_id"),                       // Tư vấn (vai Sale)
  indicatedByUserId: integer("indicated_by_user_id"),        // Chỉ định
  performedByUserId: integer("performed_by_user_id"),        // Thực hiện
  insuranceAmount: integer("insurance_amount").notNull().default(0),
  voucherAmount: integer("voucher_amount").notNull().default(0),
  voucherCode: text("voucher_code"), // mã voucher đã áp (null = không dùng)
  totalListed: integer("total_listed").notNull().default(0),
  netProfit: integer("net_profit").notNull().default(0),
  confirmedAt: timestamp("confirmed_at"),
  completedAt: timestamp("completed_at"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export const statusLogs = pgTable("status_logs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  tier: text("tier").notNull(), // "appointment" | "visit"
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  timestamp: text("timestamp").notNull(),
  note: text("note"),
});

export const insertStatusLogSchema = createInsertSchema(statusLogs).omit({ id: true });
export type InsertStatusLog = z.infer<typeof insertStatusLogSchema>;
export type StatusLog = typeof statusLogs.$inferSelect;

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // Số điện thoại là mã nhận diện khách: đơn nối với khách qua cột này, trùng số
  // là hai hồ sơ cùng ăn chung một tập đơn. Tên thì cho phép trùng.
  phone: text("phone").notNull().unique(),
  email: text("email"),
  address: text("address"),
  location: text("location"),
  createdAt: text("created_at").notNull().default(""),
  // TODO Phase 2 (B4 R-8-5): populate từ MIN(OrderItem.recall_due_date)
  // qua Isoft webhook. Hiện manual seed cho demo.
  // null = không có y lệnh tái khám.
  nextRecallDueAt: timestamp("next_recall_due_at"),
  // Nhân viên chăm gốc (R-8-6). null = chưa gán. Set lần đầu khi tạo đơn (ingest).
  primaryAssignedUserId: integer("primary_assigned_user_id"),
  // Khách VIP: gán tay, KHÔNG tự suy theo mức chi tiêu (đã chốt với anh Phú).
  isVip: boolean("is_vip").notNull().default(false),
  // Ghi chú bệnh nhân: dị ứng thuốc, tiền sử bệnh, lưu ý khi chăm sóc.
  // Dữ liệu y tế do nhân viên tự nhập, KHÔNG đồng bộ HIS, nên lưu kèm người nhập
  // và thời điểm để truy vết. timestamptz tránh lệch +7h.
  medicalNote: text("medical_note"),
  medicalNoteBy: integer("medical_note_by"),
  medicalNoteAt: timestamp("medical_note_at", { withTimezone: true }),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export const staffMembers = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  revenue: integer("revenue").notNull().default(0),
  commission: integer("commission").notNull().default(0),
  rank: integer("rank").notNull().default(0),
});

export const insertStaffMemberSchema = createInsertSchema(staffMembers).omit({ id: true });
export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;
export type StaffMember = typeof staffMembers.$inferSelect;

// ════════════════════════════════════════════════════════════════════
// G1 — Nền dữ liệu thật (SPEC mục 3.2). 5 bảng mới.
// CHỈ định nghĩa schema để db:push tạo bảng. CHƯA nối vào logic app
// (app vẫn dùng MemoryStorage in-memory). Tiền: số nguyên VND. %HH: basis points.
// ════════════════════════════════════════════════════════════════════

// order_items — đơn là vỏ chứa nhiều dòng dịch vụ; nơi lưu giá vốn để tính lãi (R-1-1).
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  serviceId: integer("service_id").notNull(),
  serviceName: text("service_name").notNull(), // snapshot tên lúc tạo
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  cost: integer("cost").notNull().default(0),   // giá vốn 1 đơn vị (mặc định services.default_cost)
  status: text("status").notNull().default("planned"), // planned | completed | skipped (R-2-5)
  skippedReason: text("skipped_reason"),
  performedByUserId: integer("performed_by_user_id"), // BS thực hiện (phân vai BS)
  recallDueDate: date("recall_due_date"),             // y lệnh tái khám (G4, để sẵn cột)
  // Trạng thái lượt tái khám của item: pending = còn cần gọi, scheduled = đã đặt lịch lại,
  // refused = khách từ chối. Default pending để mọi item có y lệnh đều vào worklist.
  recallStatus: text("recall_status").notNull().default("pending"), // pending | scheduled | refused
  refundedAmount: integer("refunded_amount").notNull().default(0),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItemRow = typeof orderItems.$inferSelect;

// order_role_assignments — ai ăn hoa hồng trên đơn (R-3).
export const orderRoleAssignments = pgTable("order_role_assignments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  role: text("role").notNull(), // 'sale' | 'tc' | 'doctor' (R-1-2, không KT/CEO)
  userId: integer("user_id").notNull(),
  rankingSnapshot: text("ranking_snapshot"),          // hạng lúc gán (R-1-3)
  pctAtTimeBp: integer("pct_at_time_bp"),              // %HH chốt lúc gán, đọc từ commission_tiers
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),                     // set khi handover (R-3-5)
  assignedByUserId: integer("assigned_by_user_id"),
});

export const insertOrderRoleAssignmentSchema = createInsertSchema(orderRoleAssignments).omit({ id: true });
export type InsertOrderRoleAssignment = z.infer<typeof insertOrderRoleAssignmentSchema>;
export type OrderRoleAssignment = typeof orderRoleAssignments.$inferSelect;

// commission_records — một dòng HH cho một vai trên một đơn (R-2-3). Thay store mock.
export const commissionRecords = pgTable("commission_records", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  roleAssignmentId: integer("role_assignment_id"),
  userId: integer("user_id").notNull(),
  cycleId: text("cycle_id").notNull(),     // 'YYYY-MM' theo orders.created_at (R-11-1)
  baseNetProfit: integer("base_net_profit").notNull().default(0),
  pctBp: integer("pct_bp").notNull().default(0),
  amount: integer("amount").notNull().default(0),
  status: text("status").notNull(), // 7 trạng thái R-2-3
  parentCrId: integer("parent_cr_id"),     // dòng delta truy thu (clawback, R-6-4)
  // timestamptz: tránh lệch +7h (node-pg đọc timestamp-không-tz như UTC trong khi DB
  // session Asia/Ho_Chi_Minh) — quan trọng cho cửa sổ khiếu nại 3 ngày (canKhieuNai).
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectedReason: text("rejected_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommissionRecordSchema = createInsertSchema(commissionRecords).omit({ id: true });
export type InsertCommissionRecord = z.infer<typeof insertCommissionRecordSchema>;
export type CommissionRecordRow = typeof commissionRecords.$inferSelect;

// adjustments — thưởng/phạt theo kỳ (R-6). Thay store mock.
export const adjustments = pgTable("adjustments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // áp cho bất kỳ ai kể cả KT/CEO (R-6-8)
  cycleId: text("cycle_id").notNull(),
  type: text("type").notNull(), // 'thuong' | 'phat'
  amount: integer("amount").notNull(), // dương = thưởng, âm = phạt
  reason: text("reason").notNull(),
  source: text("source").notNull().default("manual"), // 'manual' | 'auto_rule'
  status: text("status").notNull(), // 6 trạng thái R-2-4
  createdByUserId: integer("created_by_user_id"),
  approvedByUserId: integer("approved_by_user_id"),
  approvedAt: timestamp("approved_at"),
  parentAdjustmentId: integer("parent_adjustment_id"), // bản gốc khi edit 30 ngày (R-6-4)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdjustmentSchema = createInsertSchema(adjustments).omit({ id: true });
export type InsertAdjustment = z.infer<typeof insertAdjustmentSchema>;
export type AdjustmentRow = typeof adjustments.$inferSelect;

// commission_complaints — nội dung khiếu nại của NV trên 1 commission_record (R-11-7).
// Thay store mock complaints in-memory; CR đổi sang KHIEU_NAI khi có dòng này.
export const commissionComplaints = pgTable("commission_complaints", {
  id: serial("id").primaryKey(),
  crId: integer("cr_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommissionComplaintSchema = createInsertSchema(commissionComplaints).omit({ id: true });
export type InsertCommissionComplaint = z.infer<typeof insertCommissionComplaintSchema>;
export type CommissionComplaintRow = typeof commissionComplaints.$inferSelect;

// audit_logs — ghi mọi thay đổi quan trọng (R-10-2). Thay store mock.
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  action: text("action").notNull(),
  actorId: integer("actor_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLogRow = typeof auditLogs.$inferSelect;

// customer_events — nhật ký hành động trên khách hàng (ADR-003).
export const customerEvents = pgTable("customer_events", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  type: text("type").notNull(), // call | sms | email | order_created | status_change | recall_call
  actorUserId: integer("actor_user_id"),
  orderId: integer("order_id"),
  meta: jsonb("meta"),
  // timestamptz: lưu mốc tuyệt đối (UTC). Tránh lệch +7h do cột timestamp-không-tz
  // bị node-postgres đọc như UTC trong khi DB session là Asia/Ho_Chi_Minh.
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomerEventSchema = createInsertSchema(customerEvents).omit({ id: true });
export type InsertCustomerEvent = z.infer<typeof insertCustomerEventSchema>;
export type CustomerEventRow = typeof customerEvents.$inferSelect;

// recall_logs — nhật ký từng lượt gọi tái khám trên một order_item (theo lượt, không
// theo khách). Lưu DB để worklist + trạng thái còn nguyên sau restart.
export const recallLogs = pgTable("recall_logs", {
  id: serial("id").primaryKey(),
  orderItemId: integer("order_item_id").notNull(),
  customerId: integer("customer_id").notNull(),
  actorUserId: integer("actor_user_id").notNull(),
  outcome: text("outcome").notNull(), // scheduled | no_answer | refused | other
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRecallLogSchema = createInsertSchema(recallLogs).omit({ id: true });
export type InsertRecallLog = z.infer<typeof insertRecallLogSchema>;
export type RecallLog = typeof recallLogs.$inferSelect;

// vouchers — mã giảm giá. Trang tạo đơn đọc danh sách active + validate khi áp mã;
// trang admin voucher CRUD. Tiền: số nguyên VND. percent: value là %.
export const vouchers = pgTable("vouchers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull().default("percent"), // 'percent' | 'fixed'
  value: integer("value").notNull().default(0),       // percent: %; fixed: VND
  maxDiscount: integer("max_discount"),               // trần giảm cho percent; null = không trần
  minOrder: integer("min_order").notNull().default(0),     // tạm tính tối thiểu (VND)
  minServices: integer("min_services").notNull().default(0), // số dịch vụ tối thiểu
  description: text("description"),                   // câu điều kiện hiển thị ở thẻ voucher
  usedCount: integer("used_count").notNull().default(0),
  usageLimit: integer("usage_limit").notNull().default(0), // 0 = không giới hạn
  startDate: text("start_date"),                      // 'YYYY-MM-DD'
  endDate: text("end_date"),                          // 'YYYY-MM-DD'
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVoucherSchema = createInsertSchema(vouchers).omit({ id: true });
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;
export type VoucherRow = typeof vouchers.$inferSelect;

// auto_rules — cài đặt Auto Rule thưởng theo target (Cài đặt > Auto Rule). Lưu DB để
// bền qua restart. bonus_pct là số thực (cho phép 0.5). edit_window/lock cứng trong mã.
export const autoRules = pgTable("auto_rules", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // ví dụ "target_bonus"
  active: boolean("active").notNull().default(true),
  targetPct: integer("target_pct").notNull(),
  bonusPct: doublePrecision("bonus_pct").notNull(), // số thực, ví dụ 0.5
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: integer("updated_by_user_id"),
});

export const insertAutoRuleSchema = createInsertSchema(autoRules).omit({ id: true });
export type InsertAutoRule = z.infer<typeof insertAutoRuleSchema>;
export type AutoRuleRow = typeof autoRules.$inferSelect;

// pay_cycle_settings — cài đặt Kì lương (singleton, 1 dòng). cap_warning_pct là số thực.
// editWindowDays + lockAfterDays cứng 30, KHÔNG lưu DB (dựng trong mã khi trả về).
export const payCycleSettings = pgTable("pay_cycle_settings", {
  id: serial("id").primaryKey(),
  deadlineDay: integer("deadline_day").notNull(),
  capWarningPct: doublePrecision("cap_warning_pct").notNull(), // số thực
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: integer("updated_by_user_id"),
});

export const insertPayCycleSettingsSchema = createInsertSchema(payCycleSettings).omit({ id: true });
export type InsertPayCycleSettings = z.infer<typeof insertPayCycleSettingsSchema>;
export type PayCycleSettingsRow = typeof payCycleSettings.$inferSelect;

// ════════════════════════════════════════════════════════════════════
// Session/auth stores — chuyển từ in-memory Map sang DB để chạy được trên
// serverless (Vercel): mỗi cold-start xoá RAM nên token/OTP phải nằm ở DB.
// Thay các Map trong server/auth.ts + readStore trong server/notifications.ts.
// ════════════════════════════════════════════════════════════════════

// auth_tokens — Bearer token đang hoạt động. Thay Map `tokens`. TTL 24h check ở app.
export const authTokens = pgTable("auth_tokens", {
  token: text("token").primaryKey(),
  phone: text("phone").notNull(),
  userId: integer("user_id").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
});

// otp_sessions — phiên OTP đang chờ verify (1 dòng / SĐT). Thay Map `otpSessions`.
export const otpSessions = pgTable("otp_sessions", {
  phone: text("phone").primaryKey(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
});

// device_bindings — thiết bị đã bind theo SĐT (1 dòng / SĐT). Thay Map `deviceBindings`.
export const deviceBindings = pgTable("device_bindings", {
  phone: text("phone").primaryKey(),
  deviceId: text("device_id").notNull(),
  deviceName: text("device_name").notNull(),
  boundAt: timestamp("bound_at", { withTimezone: true }).notNull().defaultNow(),
});

// otp_requests — mốc mỗi lần xin OTP, để rate-limit 5 lần/giờ/SĐT. Thay Map `otpRequestTimes`.
export const otpRequests = pgTable("otp_requests", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
});

// notification_reads — đánh dấu đã đọc theo (user, notifId). Thay Map `readStore`.
export const notificationReads = pgTable(
  "notification_reads",
  {
    userId: integer("user_id").notNull(),
    notifId: text("notif_id").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.notifId] }) }),
);
