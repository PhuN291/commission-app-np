import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertServiceSchema, insertOrderSchema, insertCustomerSchema, insertVoucherSchema } from "@shared/schema";
import { computeVoucherDiscount } from "./vouchers";
import { seedDatabase } from "./seed";
import { APPOINTMENT_TRANSITIONS, VISIT_TRANSITIONS, type AppointmentStatusCode, type VisitStatusCode } from "@shared/status";
import {
  setOtpSession,
  getOtpSession,
  deleteOtpSession,
  incrementOtpAttempts,
  getDeviceBinding,
  setDeviceBinding,
  deleteDeviceBinding,
  deleteToken,
  normalizeVNPhone,
  generateOtp,
  issueToken,
  notifyDeviceSwitch,
  revokeTokensForPhone,
  allowOtpRequest,
  OTP_TTL_MS,
  LOCK_DURATION_MS,
  MAX_OTP_ATTEMPTS,
} from "./auth";
import { auditLog } from "./audit";
import { requireRole, stripPassword } from "./permissions";
import { getPersonalRanking } from "./ranking";
import { getAdminDashboard, getPersonalDashboard } from "./dashboard";
import { getAnalyticsOverview, getAnalyticsAppointments } from "./analytics";
import {
  adminCreateStaffSchema,
  adminUpdateStaffSchema,
  markOffboardingSchema,
  updateCommissionTiersSchema,
  rejectCRSchema,
  complaintSchema,
  adminRejectCRSchema,
  bulkApproveCycleSchema,
  resolveComplaintSchema,
  updateAutoRuleSchema,
  updatePayCycleSchema,
  AUTO_RULE_KEYS,
  COMMISSION_RANKINGS,
  ROLE_LABEL,
  isGrossCommission,
  type AutoRuleKey,
  type CommissionableRole,
  type UserRole,
  type UserStatus,
} from "@shared/types";
import { ingestOrderDerived } from "./ingest";
import { logCustomerEvent } from "./customer-events";
import { mapCrRowToView, canEditAdjustment } from "./commission-types";
import { getIncomeForUser, generateLast6Cycles, currentCycleId } from "./income";
import {
  countUnreadForUser,
  listNotificationsForUser,
  markAllRead,
  markRead,
} from "./notifications";

const IS_DEV = process.env.NODE_ENV !== "production";
// Mã đăng nhập TẠM — hợp lệ ở MỌI môi trường, dùng làm lối đăng nhập tạm cho tới khi
// nối Zalo OA gửi OTP thật.
// TODO: BỎ hằng này khi có kênh gửi OTP thật; lúc đó verify phải khớp đúng code đã gen.
const TEMP_LOGIN_OTP = "062026";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed chỉ chạy ở local dev, hoặc khi bật cờ SEED_ON_BOOT=1. KHÔNG chạy mặc định ở
  // production vì trên serverless (Vercel) mỗi cold-start gọi lại registerRoutes → seed
  // (dù idempotent) sẽ tốn query mỗi lần khởi động. Seed prod chạy 1 lần qua `npm run seed`.
  if (process.env.NODE_ENV !== "production" || process.env.SEED_ON_BOOT === "1") {
    await seedDatabase();
  }

  // ============================================================
  // Auth: SĐT + OTP login (B5-2 S-Login spec, v15 simplified flow)
  // ============================================================

  // POST /api/auth/request-otp { phone }
  app.post("/api/auth/request-otp", async (req, res) => {
    const { phone: rawPhone } = req.body ?? {};
    const phone = typeof rawPhone === "string" ? normalizeVNPhone(rawPhone) : null;
    if (!phone) {
      return res.status(400).json({ error: "invalid_phone", message: "SĐT không hợp lệ" });
    }

    // Rate limit theo số điện thoại: tối đa 5 lần / 1 giờ.
    if (!(await allowOtpRequest(phone))) {
      return res.status(429).json({
        error: "rate_limited",
        message: "Bạn đã yêu cầu mã quá nhiều lần, vui lòng thử lại sau.",
      });
    }

    // Thông điệp TRUNG TÍNH — không tiết lộ số có trong hệ thống hay không (chống dò số).
    const neutral = {
      sent_via: "zalo_oa" as const,
      message: "Nếu số có trong hệ thống, mã đã được gửi.",
    };

    const user = await storage.getUserByPhone(phone);
    if (!user) {
      // Không lộ "chưa đăng ký" — trả y hệt như khi gửi thành công.
      return res.json(neutral);
    }

    // Tài khoản bị khóa → báo (UX), không gen mã.
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      return res.status(423).json({
        error: "locked",
        message: "Tài khoản tạm khóa, thử lại sau",
        lockedUntil: user.lockedUntil.toISOString(),
      });
    }

    const code = generateOtp();
    await setOtpSession(phone, code, Date.now() + OTP_TTL_MS);

    // TODO production: gọi Zalo OA send-template-message API (fallback SMS nếu fail).
    // KHÔNG in mã OTP ra log ở production (chỉ log ngoài production để dev xem).
    if (IS_DEV) console.log(`[OTP] ${phone}: ${code} (expires in ${OTP_TTL_MS / 1000}s)`);

    // KHÔNG trả mã OTP ra response.
    res.json(neutral);
  });

  // POST /api/auth/verify-otp { phone, otp_code, device_id, device_name }
  app.post("/api/auth/verify-otp", async (req, res) => {
    const { phone: rawPhone, otp_code, device_id, device_name } = req.body ?? {};
    const phone = typeof rawPhone === "string" ? normalizeVNPhone(rawPhone) : null;
    if (!phone || typeof otp_code !== "string" || typeof device_id !== "string") {
      return res.status(400).json({ status: "invalid", message: "Thiếu thông tin" });
    }

    const user = await storage.getUserByPhone(phone);
    if (!user) {
      // Trung tính: không lộ số chưa đăng ký (giống hệt khi không có OTP hợp lệ).
      return res.status(400).json({ status: "invalid", message: "OTP không tồn tại hoặc đã dùng" });
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      return res.status(423).json({
        status: "locked",
        message: "Tài khoản tạm khóa",
        lockedUntil: user.lockedUntil.toISOString(),
      });
    }

    const session = await getOtpSession(phone);
    if (!session) {
      return res.status(400).json({ status: "invalid", message: "OTP không tồn tại hoặc đã dùng" });
    }
    if (Date.now() > session.expiresAt) {
      await deleteOtpSession(phone);
      return res.status(400).json({ status: "expired", message: "OTP đã hết hạn, vui lòng gửi lại" });
    }

    // OTP check — chấp nhận mã đã gen hoặc mã đăng nhập TẠM 062026 (hợp lệ mọi môi trường).
    const isMatch = otp_code === session.code || otp_code === TEMP_LOGIN_OTP;
    if (!isMatch) {
      const attempts = await incrementOtpAttempts(phone);
      if (attempts >= MAX_OTP_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        await storage.updateUserLock(user.id, lockUntil);
        await deleteOtpSession(phone);
        return res.status(423).json({
          status: "locked",
          message: "Tài khoản tạm khóa, thử lại sau 15 phút",
          lockedUntil: lockUntil.toISOString(),
        });
      }
      return res.status(400).json({
        status: "invalid",
        message: `OTP sai (còn ${MAX_OTP_ATTEMPTS - attempts} lần thử)`,
        attempts_left: MAX_OTP_ATTEMPTS - attempts,
      });
    }

    // Success: bind/rebind device
    const deviceNameStr = typeof device_name === "string" ? device_name : "Unknown device";
    const existing = await getDeviceBinding(phone);
    let switched = false;
    if (existing && existing.deviceId !== device_id) {
      switched = true;
      notifyDeviceSwitch(user.name, existing.deviceName, deviceNameStr);
    }
    await setDeviceBinding(phone, device_id, deviceNameStr);

    // Clear lock if any (succesful login implies user is back in good standing)
    if (user.lockedUntil) await storage.updateUserLock(user.id, null);

    const token = await issueToken(phone, user.id);
    await deleteOtpSession(phone);

    res.json({
      status: "success",
      token,
      switched_device: switched,
      role: user.role,
      userId: user.id,
      name: user.name,
    });
  });

  // POST /api/auth/logout — token revoke. Device binding preserved per spec edge case.
  app.post("/api/auth/logout", async (req, res) => {
    const auth = req.headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token) await deleteToken(token);
    res.json({ ok: true });
  });

  // ============================================================
  // Admin: Staff management (B5-2 Section 2)
  // Permission: CEO full, TC view + mark-offboarding, others 403.
  // ============================================================

  /** Helper — count đơn pending của user (chưa terminal). */
  function countPendingOrders(userId: number): number {
    // appointmentStatus terminal = cancelled / no_show; visitStatus terminal = completed / cancelled.
    // "Pending" = chưa terminal cả 2 tier.
    let count = 0;
    for (const o of (storage as any).orders ?? []) {
      if (o.userId !== userId) continue;
      const apptDone = o.appointmentStatus === "cancelled" || o.appointmentStatus === "no_show";
      const visitDone = o.visitStatus === "completed" || o.visitStatus === "cancelled";
      if (apptDone) continue;
      if (o.visitStatus && visitDone) continue;
      count++;
    }
    return count;
  }

  /** Helper — strip + enrich user object for admin staff list. */
  async function enrichUserForAdmin(user: any) {
    const safe = stripPassword(user);
    return {
      ...safe,
      pendingOrders: countPendingOrders(user.id),
      deviceBinding: await getDeviceBinding(user.phone),
    };
  }

  // GET /api/admin/staff?search=&role=&status=  (CEO + TC)
  app.get("/api/admin/staff", requireRole(["ceo", "tc"]), async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search.toLowerCase() : "";
    const roleFilter = typeof req.query.role === "string" ? req.query.role : "all";
    const statusFilter = typeof req.query.status === "string" ? req.query.status : "all";
    const all = await storage.getAllUsers();
    const filtered = all.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (search) {
        if (!u.name.toLowerCase().includes(search) && !u.phone.includes(search)) return false;
      }
      return true;
    });
    const enriched = await Promise.all(filtered.map(enrichUserForAdmin));
    res.json(enriched);
  });

  // POST /api/admin/staff (CEO only)
  app.post("/api/admin/staff", requireRole(["ceo"]), async (req, res) => {
    const parsed = adminCreateStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation",
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      });
    }
    const phone = normalizeVNPhone(parsed.data.phone);
    if (!phone) {
      return res.status(400).json({ error: "invalid_phone", message: "SĐT không hợp lệ" });
    }
    const existing = await storage.getUserByPhone(phone);
    if (existing) {
      return res.status(409).json({ error: "phone_exists", message: "SĐT đã có người dùng" });
    }
    const created = await storage.createUser({
      username: phone, // legacy field — auto-set
      password: "",
      phone,
      name: parsed.data.name,
      role: parsed.data.role,
      ranking: parsed.data.ranking ?? null,
      ihosUserId: parsed.data.ihosUserId ?? null,
      monthlyTargetHh: parsed.data.monthlyTargetHh,
      monthlyTargetOrders: parsed.data.monthlyTargetOrders,
      status: "active",
      createdByUserId: req.currentUser!.id,
    });
    await auditLog.append({
      userId: created.id,
      action: "user.create",
      actorId: req.currentUser!.id,
      payload: { name: created.name, role: created.role, ranking: created.ranking },
    });
    res.json(stripPassword(created));
  });

  // PATCH /api/admin/staff/:id (CEO only)
  app.patch("/api/admin/staff/:id", requireRole(["ceo"]), async (req, res) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid_id" });
    const target = await storage.getUser(id);
    if (!target) return res.status(404).json({ error: "not_found" });

    const parsed = adminUpdateStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation",
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      });
    }
    const data = parsed.data;
    // Re-validate BS iHOS requirement when role/iHOS changes.
    const nextRole = (data.role ?? target.role) as UserRole;
    const nextIhos = data.ihosUserId !== undefined ? data.ihosUserId : target.ihosUserId;
    if (nextRole === "doctor" && (!nextIhos || nextIhos.length === 0)) {
      return res.status(400).json({
        error: "validation",
        issues: [{ path: ["ihosUserId"], message: "Bác sĩ bắt buộc có Mã iHOS" }],
      });
    }
    // Phone unique check if changed
    if (data.phone) {
      const normalized = normalizeVNPhone(data.phone);
      if (!normalized) return res.status(400).json({ error: "invalid_phone" });
      if (normalized !== target.phone) {
        const dup = await storage.getUserByPhone(normalized);
        if (dup) return res.status(409).json({ error: "phone_exists" });
        data.phone = normalized;
      } else {
        data.phone = normalized;
      }
    }
    const updated = await storage.updateUserFields(id, data as any);
    if (!updated) return res.status(404).json({ error: "not_found" });
    await auditLog.append({
      userId: id,
      action: "user.update",
      actorId: req.currentUser!.id,
      payload: data,
    });
    res.json(stripPassword(updated));
  });

  // PATCH /api/admin/staff/:id/mark-offboarding (CEO + TC)
  app.patch("/api/admin/staff/:id/mark-offboarding", requireRole(["ceo", "tc"]), async (req, res) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid_id" });
    const target = await storage.getUser(id);
    if (!target) return res.status(404).json({ error: "not_found" });
    const parsed = markOffboardingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation",
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      });
    }
    // Date >= today check (allow same day for testing flexibility)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offDate = new Date(parsed.data.offboardingDate);
    if (offDate.getTime() < today.getTime()) {
      return res.status(400).json({
        error: "validation",
        issues: [{ path: ["offboardingDate"], message: "Ngày nghỉ phải >= hôm nay" }],
      });
    }
    const updated = await storage.updateUserStatus(id, "pending_offboarding", parsed.data.offboardingDate);
    if (!updated) return res.status(404).json({ error: "not_found" });
    // Thu hồi token để NV mất phiên ngay khi bị đánh dấu nghỉ.
    const revokedTokens = await revokeTokensForPhone(target.phone);
    const pendingOrders = countPendingOrders(id);
    await auditLog.append({
      userId: id,
      action: "user.mark_offboarding",
      actorId: req.currentUser!.id,
      payload: { offboardingDate: parsed.data.offboardingDate, pendingOrders, revokedTokens },
    });
    res.json({ ...stripPassword(updated), pendingOrders });
  });

  // POST /api/admin/staff/:id/force-unbind-device (CEO only)
  app.post("/api/admin/staff/:id/force-unbind-device", requireRole(["ceo"]), async (req, res) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid_id" });
    const target = await storage.getUser(id);
    if (!target) return res.status(404).json({ error: "not_found" });
    const previousDevice = (await getDeviceBinding(target.phone))?.deviceName ?? null;
    await deleteDeviceBinding(target.phone);
    // Revoke active tokens cho phone này → user bị logout next request.
    const revokedCount = await revokeTokensForPhone(target.phone);
    await auditLog.append({
      userId: id,
      action: "user.force_unbind",
      actorId: req.currentUser!.id,
      payload: { previousDevice, revokedTokens: revokedCount },
    });
    res.json({ ok: true, revokedTokens: revokedCount });
  });

  // PATCH /api/admin/staff/:id/soft-delete (CEO only) — set status=offboarded
  app.patch("/api/admin/staff/:id/soft-delete", requireRole(["ceo"]), async (req, res) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid_id" });
    const target = await storage.getUser(id);
    if (!target) return res.status(404).json({ error: "not_found" });
    const today = new Date().toISOString().slice(0, 10);
    const updated = await storage.updateUserStatus(id, "offboarded", target.offboardingDate ?? today);
    if (!updated) return res.status(404).json({ error: "not_found" });
    // Thu hồi token để NV mất phiên ngay khi bị xóa mềm (đã nghỉ).
    const revokedTokens = await revokeTokensForPhone(target.phone);
    await auditLog.append({
      userId: id,
      action: "user.soft_delete",
      actorId: req.currentUser!.id,
      payload: { revokedTokens },
    });
    res.json(stripPassword(updated));
  });

  // GET /api/admin/staff/:id/audit-log (CEO + TC)
  app.get("/api/admin/staff/:id/audit-log", requireRole(["ceo", "tc"]), async (req, res) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid_id" });
    const entries = await auditLog.listForUser(id, 50);
    // Enrich với actor name
    const enriched = await Promise.all(
      entries.map(async (e) => {
        const actor = await storage.getUser(e.actorId);
        return { ...e, actorName: actor?.name ?? "Unknown" };
      }),
    );
    res.json(enriched);
  });

  // ============================================================
  // Admin: Commission tier config (B4 R-1-2 + R-1-3)
  // Permission: CEO edit, TC + KT view-only.
  // ============================================================

  // GET /api/admin/commission-tiers (CEO + TC + KT view active rows)
  app.get("/api/admin/commission-tiers", requireRole(["ceo", "tc", "kt"]), async (_req, res) => {
    const tiers = await storage.listCommissionTiers(true);
    res.json(tiers);
  });

  // GET /api/admin/commission-tiers/history (CEO + TC + KT view all rows including expired)
  app.get("/api/admin/commission-tiers/history", requireRole(["ceo", "tc", "kt"]), async (_req, res) => {
    const all = await storage.listCommissionTiers(false);
    // Enrich actor name
    const enriched = await Promise.all(
      all.map(async (t) => {
        const actor = t.createdByUserId ? await storage.getUser(t.createdByUserId) : null;
        return { ...t, createdByName: actor?.name ?? "-" };
      }),
    );
    res.json(enriched);
  });

  // PATCH /api/admin/commission-tiers (CEO only — bulk update)
  app.patch("/api/admin/commission-tiers", requireRole(["ceo"]), async (req, res) => {
    const parsed = updateCommissionTiersSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation",
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      });
    }
    // Validate ranking match role.
    for (const t of parsed.data.tiers) {
      const allowed = COMMISSION_RANKINGS[t.role as CommissionableRole];
      if (!(allowed as readonly (string | null)[]).includes(t.ranking)) {
        return res.status(400).json({
          error: "invalid_ranking_for_role",
          role: t.role,
          ranking: t.ranking,
          allowed,
        });
      }
    }
    // Apply (mark old expired + insert new).
    const updated = [];
    for (const t of parsed.data.tiers) {
      const result = await storage.upsertCommissionTier({
        role: t.role,
        ranking: t.ranking,
        percentBp: t.percentBp,
        createdByUserId: req.currentUser!.id,
      });
      updated.push(result);
    }
    // Audit log — config change tracked under CEO actor. userId = actor (config global, không attach NV).
    await auditLog.append({
      userId: req.currentUser!.id,
      action: "user.update",
      actorId: req.currentUser!.id,
      payload: {
        type: "commission_tiers_update",
        changes: parsed.data.tiers,
      },
    });
    res.json(updated);
  });

  // ───────────────────────────────────────────────────────────────
  // Admin settings — Auto Rule + Pay cycle (B5-2 §3.10 + §3.11)
  // CEO edit; TC + KT view-only. R-9-1 permission gate.
  // ───────────────────────────────────────────────────────────────

  // GET auto rules — view all (CEO + TC + KT)
  app.get(
    "/api/admin/settings/auto-rules",
    requireRole(["ceo", "tc", "kt"]),
    async (_req, res) => {
      res.json(await storage.listAutoRules());
    },
  );

  // PATCH auto rule — CEO only, audit-logged
  app.patch(
    "/api/admin/settings/auto-rules/:key",
    requireRole(["ceo"]),
    async (req, res) => {
      const key = String(req.params.key);
      if (!(AUTO_RULE_KEYS as readonly string[]).includes(key)) {
        return res.status(404).json({ error: "rule_not_found" });
      }
      const parsed = updateAutoRuleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "validation",
          issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
        });
      }
      const updated = await storage.updateAutoRule(key as AutoRuleKey, parsed.data, req.currentUser!.id);
      if (!updated) return res.status(404).json({ error: "rule_not_found" });
      await auditLog.append({
        userId: req.currentUser!.id,
        action: "setting.auto_rule_update",
        actorId: req.currentUser!.id,
        payload: { key, ...parsed.data },
      });
      res.json(updated);
    },
  );

  // GET pay cycle — view (CEO + TC + KT)
  app.get(
    "/api/admin/settings/pay-cycle",
    requireRole(["ceo", "tc", "kt"]),
    async (_req, res) => {
      res.json(await storage.getPayCycle());
    },
  );

  // PATCH pay cycle — CEO only, audit-logged
  app.patch(
    "/api/admin/settings/pay-cycle",
    requireRole(["ceo"]),
    async (req, res) => {
      const parsed = updatePayCycleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "validation",
          issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
        });
      }
      const updated = await storage.updatePayCycle(parsed.data, req.currentUser!.id);
      await auditLog.append({
        userId: req.currentUser!.id,
        action: "setting.pay_cycle_update",
        actorId: req.currentUser!.id,
        payload: parsed.data,
      });
      res.json(updated);
    },
  );

  app.get("/api/user", async (req, res) => {
    // Trả chính người đang đăng nhập (req.currentUser do middleware auth gắn).
    res.json(stripPassword(req.currentUser!));
  });

  app.patch("/api/user", async (req, res) => {
    try {
      const { name, avatar } = req.body;
      const updated = await storage.updateUser(req.currentUser!.id, { name, avatar });
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(stripPassword(updated));
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.get("/api/users", async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const safeUsers = allUsers.map(({ password, ...u }) => u);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/services", async (_req, res) => {
    try {
      const allServices = await storage.getAllServices();
      res.json(allServices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      const parsed = insertServiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid service data", errors: parsed.error.errors });
      }
      const service = await storage.createService(parsed.data);
      res.status(201).json(service);
    } catch (error) {
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      // Lọc theo người đăng nhập (token): NV (sale/doctor) chỉ thấy đơn của mình;
      // quản lý (tc/kt/ceo) thấy tất cả. KHÔNG theo userId client gửi.
      const user = req.currentUser!;
      const seesAll = user.role === "tc" || user.role === "kt" || user.role === "ceo";
      const list = seesAll ? await storage.getAllOrders() : await storage.getOrdersByUser(user.id);
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  /**
   * Helper — find sample commissionable users cho mock CR generation.
   * Phase 2: order.userId trực tiếp = sale, ShiftHeadAssignment lookup = tc, etc.
   */
  // GET /api/orders/:id — extended với items + crs (B5-3 Section 2)
  // CR visibility theo R-9-1:
  //   - Sale / BS: chỉ CR của chính mình
  //   - TC / KT / CEO: toàn PK (full view)
  app.get(
    "/api/orders/:id",
    requireRole(["sale", "doctor", "tc", "kt", "ceo"]),
    async (req, res) => {
      try {
        const id = parseInt(String(req.params.id), 10);
        const order = await storage.getOrder(id);
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
        // Chủ đơn: NV (sale/doctor) chỉ xem đơn của mình; quản lý xem mọi đơn.
        const user = req.currentUser!;
        const seesAll = user.role === "tc" || user.role === "kt" || user.role === "ceo";
        if (!seesAll && order.userId !== user.id) {
          return res.status(403).json({ error: "forbidden", message: "Không có quyền xem đơn này" });
        }
        // Dịch vụ từ order_items thật → shape client (id chuỗi, price/cost theo dòng).
        const itemRows = await storage.getOrderItems(id);
        const items = itemRows.map((it) => ({
          id: String(it.id),
          orderId: it.orderId,
          serviceName: it.serviceName,
          price: it.unitPrice * it.quantity,
          cost: it.cost * it.quantity,
          status: it.status,
          skippedReason: it.skippedReason,
          refundedAmount: it.refundedAmount,
        }));

        // Hoa hồng từ commission_records thật + vai (join role_assignments).
        const crRows = await storage.getCommissionRecordsByOrder(id);
        const roleAssigns = await storage.getRoleAssignments(id);
        const roleById = new Map(roleAssigns.map((a) => [a.id, a.role]));
        const allCrs = crRows.map((r) =>
          mapCrRowToView(r, r.roleAssignmentId ? roleById.get(r.roleAssignmentId) ?? null : null),
        );

        // CR visibility (R-9-1): NV chỉ thấy hoa hồng của mình, quản lý thấy hết.
        const crs = seesAll ? allCrs : allCrs.filter((cr) => cr.userId === user.id);

        res.json({ ...order, items, crs });
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch order" });
      }
    },
  );

  // OrderItem.status KHÔNG có endpoint user-facing — status sync từ iHOS webhook Phase 2
  // (order.exam_finished + order.adjusted). updateItemStatus() giữ trong server/orderItems.ts
  // cho webhook handler dùng lại.

  // POST /api/orders/:orderId/cr/:crId/reject — KT only
  app.post(
    "/api/orders/:orderId/cr/:crId/reject",
    requireRole(["kt"]),
    async (req, res) => {
      const parsed = rejectCRSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "validation", issues: parsed.error.issues });
      }
      const crId = parseInt(String(req.params.crId), 10);
      if (!Number.isFinite(crId)) return res.status(400).json({ error: "invalid_id" });
      const cr = await storage.rejectCommissionRecord(crId, parsed.data.reason);
      if (!cr) {
        return res.status(404).json({ error: "not_found_or_invalid_state" });
      }
      res.json(cr);
    },
  );

  // POST /api/orders/:orderId/cr/:crId/complaint — Sale/Doctor + ownership + 3-day window
  app.post(
    "/api/orders/:orderId/cr/:crId/complaint",
    requireRole(["sale", "doctor"]),
    async (req, res) => {
      const parsed = complaintSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "validation", issues: parsed.error.issues });
      }
      const crId = parseInt(String(req.params.crId), 10);
      if (!Number.isFinite(crId)) return res.status(400).json({ error: "invalid_id" });
      const result = await storage.fileCommissionComplaint(
        crId,
        req.currentUser!.id,
        parsed.data.content,
      );
      if (!result.ok) {
        return res.status(403).json({ error: result.error });
      }
      res.json(result.entry);
    },
  );

  app.post("/api/orders", async (req, res) => {
    try {
      const parsed = insertOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid order data", errors: parsed.error.errors });
      }
      // IDOR (tạo đơn): NV thường luôn tạo đơn cho CHÍNH MÌNH (bỏ qua userId client gửi);
      // chỉ trưởng ca/CEO mới được tạo hộ người khác theo userId trong body.
      const u = req.currentUser!;
      const data =
        u.role === "tc" || u.role === "ceo" ? parsed.data : { ...parsed.data, userId: u.id };
      const order = await storage.createOrder(data);
      // G1b: sinh dữ liệu phái sinh (order_items + role_assignments). KHÔNG được làm
      // hỏng tạo đơn nếu lỗi → bọc try/catch, log, vẫn trả đơn đã tạo. Response giữ nguyên.
      try {
        await ingestOrderDerived(order);
      } catch (ingestErr) {
        console.error(`[ingest] lỗi sinh dữ liệu phái sinh cho order ${order.id}:`, ingestErr);
      }
      await logCustomerEvent({
        phone: order.phone,
        type: "order_created",
        actorUserId: order.userId,
        orderId: order.id,
        meta: { code: order.code, serviceName: order.serviceName },
      });
      // Voucher: cộng lượt dùng nếu đơn có áp mã. Không làm hỏng tạo đơn nếu lỗi.
      if (order.voucherCode) {
        try {
          await storage.incrementVoucherUse(order.voucherCode);
        } catch (voucherErr) {
          console.error(`[voucher] tăng lượt dùng lỗi cho ${order.voucherCode}:`, voucherErr);
        }
      }
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // ─────────────────────────── Vouchers ───────────────────────────
  // GET /api/vouchers — danh sách mã đang áp dụng (trang tạo đơn chọn nhanh).
  app.get("/api/vouchers", async (_req, res) => {
    try {
      res.json(await storage.getActiveVouchers());
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vouchers" });
    }
  });

  // POST /api/vouchers/validate — kiểm tra mã + tính tiền giảm cho đơn hiện tại.
  app.post("/api/vouchers/validate", async (req, res) => {
    try {
      const code = String(req.body?.code ?? "").trim().toUpperCase();
      const subtotal = Number(req.body?.subtotal ?? 0);
      const serviceCount = Number(req.body?.serviceCount ?? 0);
      if (!code) return res.status(400).json({ error: "Thiếu mã giảm giá" });
      const voucher = await storage.getVoucherByCode(code);
      if (!voucher) return res.status(404).json({ error: "Mã không tồn tại" });
      const result = computeVoucherDiscount(voucher, subtotal, serviceCount);
      if (!result.ok) return res.status(422).json({ error: result.reason ?? "Mã không hợp lệ" });
      res.json({
        code: voucher.code,
        discountType: voucher.discountType,
        value: voucher.value,
        amount: result.amount,
        description: voucher.description,
      });
    } catch (error) {
      res.status(500).json({ error: "Không kiểm tra được mã" });
    }
  });

  // Admin CRUD vouchers (CEO).
  app.get("/api/admin/vouchers", requireRole(["ceo"]), async (_req, res) => {
    res.json(await storage.listVouchers());
  });

  app.post("/api/admin/vouchers", requireRole(["ceo"]), async (req, res) => {
    const parsed = insertVoucherSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid voucher data", errors: parsed.error.errors });
    }
    const existing = await storage.getVoucherByCode(parsed.data.code);
    if (existing) return res.status(409).json({ message: "Mã đã tồn tại" });
    res.status(201).json(await storage.createVoucher(parsed.data));
  });

  app.patch("/api/admin/vouchers/:id", requireRole(["ceo"]), async (req, res) => {
    const id = parseInt(String(req.params.id), 10);
    const parsed = insertVoucherSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid voucher data", errors: parsed.error.errors });
    }
    const updated = await storage.updateVoucher(id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Voucher not found" });
    res.json(updated);
  });

  app.delete("/api/admin/vouchers/:id", requireRole(["ceo"]), async (req, res) => {
    const ok = await storage.deleteVoucher(parseInt(String(req.params.id), 10));
    if (!ok) return res.status(404).json({ message: "Voucher not found" });
    res.json({ ok: true });
  });

  // Update appointment status
  app.patch("/api/orders/:id/appointment-status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, note } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      // IDOR: chỉ chủ đơn hoặc trưởng ca/CEO mới được thao tác.
      const u = req.currentUser!;
      if (order.userId !== u.id && u.role !== "tc" && u.role !== "ceo") {
        return res.status(403).json({ message: "Không có quyền với đơn này" });
      }
      const currentStatus = order.appointmentStatus as AppointmentStatusCode;
      const validTransitions = APPOINTMENT_TRANSITIONS[currentStatus] || [];
      if (!validTransitions.includes(status)) {
        return res.status(400).json({ message: `Cannot transition from ${currentStatus} to ${status}` });
      }
      const updated = await storage.updateOrderAppointmentStatus(id, status, note);
      if (!updated) {
        return res.status(400).json({ message: "Failed to update status" });
      }
      await logCustomerEvent({
        phone: order.phone,
        type: "status_change",
        actorUserId: req.currentUser?.id ?? order.userId,
        orderId: id,
        meta: { tier: "appointment", fromStatus: currentStatus, toStatus: status },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update appointment status" });
    }
  });

  // Update visit status
  app.patch("/api/orders/:id/visit-status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, note } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const order = await storage.getOrder(id);
      if (!order || !order.visitStatus) {
        return res.status(404).json({ message: "Order not found or visit not started" });
      }
      // IDOR: chỉ chủ đơn hoặc trưởng ca/CEO mới được thao tác.
      const u = req.currentUser!;
      if (order.userId !== u.id && u.role !== "tc" && u.role !== "ceo") {
        return res.status(403).json({ message: "Không có quyền với đơn này" });
      }
      const currentStatus = order.visitStatus as VisitStatusCode;
      const validTransitions = VISIT_TRANSITIONS[currentStatus] || [];
      if (!validTransitions.includes(status)) {
        return res.status(400).json({ message: `Cannot transition from ${currentStatus} to ${status}` });
      }
      const updated = await storage.updateOrderVisitStatus(id, status, note);
      if (!updated) {
        return res.status(400).json({ message: "Failed to update visit status" });
      }
      await logCustomerEvent({
        phone: order.phone,
        type: "status_change",
        actorUserId: req.currentUser?.id ?? order.userId,
        orderId: id,
        meta: { tier: "visit", fromStatus: currentStatus, toStatus: status },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update visit status" });
    }
  });

  // Cập nhật ghi chú đơn (sửa/lưu từ màn chi tiết đơn)
  app.patch("/api/orders/:id/notes", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      // IDOR: chỉ chủ đơn hoặc trưởng ca/CEO mới được thao tác.
      const u = req.currentUser!;
      if (order.userId !== u.id && u.role !== "tc" && u.role !== "ceo") {
        return res.status(403).json({ message: "Không có quyền với đơn này" });
      }
      const raw = typeof req.body?.notes === "string" ? req.body.notes.trim() : "";
      const updated = await storage.updateOrderNotes(id, raw ? raw : null);
      if (!updated) return res.status(404).json({ message: "Order not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update notes" });
    }
  });

  // Reschedule: set current order to rescheduled, create new order
  app.post("/api/orders/:id/reschedule", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { appointmentDate, appointmentTime } = req.body;
      if (!appointmentDate || !appointmentTime) {
        return res.status(400).json({ message: "New appointment date and time required" });
      }
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      // IDOR: chỉ chủ đơn hoặc trưởng ca/CEO mới được thao tác.
      const u = req.currentUser!;
      if (order.userId !== u.id && u.role !== "tc" && u.role !== "ceo") {
        return res.status(403).json({ message: "Không có quyền với đơn này" });
      }
      // Mark current as rescheduled
      const updated = await storage.updateOrderAppointmentStatus(id, "rescheduled" as AppointmentStatusCode, `Dời sang ${appointmentDate} ${appointmentTime}`);
      if (!updated) {
        return res.status(400).json({ message: "Cannot reschedule this order" });
      }
      // Create new order with status confirmed
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = String(now.getFullYear()).slice(2);
      const rand = String(Math.floor(Math.random() * 900) + 100);
      const code = `#NP${year}${month}${day}${rand}`;
      const timeStr = `${day}/${month}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const newOrder = await storage.createOrder({
        code,
        patientName: order.patientName,
        phone: order.phone,
        email: order.email,
        serviceName: order.serviceName,
        serviceCode: order.serviceCode,
        serviceCategory: order.serviceCategory,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        totalPrice: order.totalPrice,
        commission: order.commission,
        appointmentStatus: "confirmed",
        notes: `Dời lịch từ đơn ${order.code}`,
        appointmentDate,
        appointmentTime,
        examType: order.examType,
        vatCompanyName: order.vatCompanyName,
        vatTaxCode: order.vatTaxCode,
        vatCompanyAddress: order.vatCompanyAddress,
        vatEmail: order.vatEmail,
        createdAt: timeStr,
        userId: order.userId,
      });
      // G2: đơn dời lịch cũng phải có nguyên liệu + hoa hồng. Bọc try/catch giống
      // POST /api/orders để ingest lỗi không làm hỏng dời lịch.
      try {
        await ingestOrderDerived(newOrder);
      } catch (ingestErr) {
        console.error(`[reschedule] ingest lỗi cho đơn mới ${newOrder.id}:`, ingestErr);
      }
      await logCustomerEvent({
        phone: newOrder.phone,
        type: "order_created",
        actorUserId: newOrder.userId,
        orderId: newOrder.id,
        meta: { code: newOrder.code, serviceName: newOrder.serviceName, rescheduledFrom: order.code },
      });
      res.json({ originalOrder: updated, newOrder });
    } catch (error) {
      res.status(500).json({ message: "Failed to reschedule" });
    }
  });

  // Get status logs for an order
  app.get("/api/orders/:id/status-logs", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      // Cùng quy tắc chủ đơn: NV chỉ xem log đơn của mình; quản lý xem hết.
      const user = req.currentUser!;
      const seesAll = user.role === "tc" || user.role === "kt" || user.role === "ceo";
      if (!seesAll && order.userId !== user.id) {
        return res.status(403).json({ error: "forbidden", message: "Không có quyền xem đơn này" });
      }
      const logs = await storage.getStatusLogs(id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch status logs" });
    }
  });

  app.get("/api/customers", async (req, res) => {
    try {
      // Lọc theo người chăm (token): NV (sale/doctor) chỉ thấy khách có
      // primaryAssignedUserId = id mình; quản lý (tc/kt/ceo) thấy tất cả. Khách chưa
      // có người chăm thì chỉ quản lý thấy.
      const user = req.currentUser!;
      const seesAll = user.role === "tc" || user.role === "kt" || user.role === "ceo";
      const scope = <T extends { primaryAssignedUserId: number | null }>(list: T[]) =>
        seesAll ? list : list.filter((c) => c.primaryAssignedUserId === user.id);
      // Badge tái khám suy từ database (hệ mới): khách còn lượt pending → "pending"
      // (client hiện badge quá-hạn/đến-hạn theo nextRecallDueAt), xử lý hết → "done"
      // (hiện "Đã nhắc"), không có lượt → bỏ trống.
      const recallState = await storage.getRecallStateByCustomer();
      const withStatus = <T extends { id: number }>(list: T[]) =>
        list.map((c) => ({ ...c, recallStatus: recallState.get(c.id) }));
      const q = req.query.q as string | undefined;
      if (q && q.length > 0) {
        const results = await storage.searchCustomers(q);
        return res.json(withStatus(scope(results)));
      }
      const all = await storage.getAllCustomers();
      res.json(withStatus(scope(all)));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      // Người chăm: NV (sale/doctor) chỉ xem khách mình chăm; quản lý xem hết.
      const user = req.currentUser!;
      const seesAll = user.role === "tc" || user.role === "kt" || user.role === "ceo";
      if (!seesAll && customer.primaryAssignedUserId !== user.id) {
        return res.status(403).json({ error: "forbidden", message: "Không có quyền xem khách này" });
      }
      // Chủ ý: sau khi qua cổng quyền xem khách, hiện TOÀN BỘ lịch sử đơn của khách
      // (theo SĐT) cho người chăm — KHÔNG lọc tiếp theo chủ đơn, để người chăm có đủ
      // bối cảnh. Mở từng đơn vẫn khoá theo chủ đơn ở GET /api/orders/:id. Trường hợp
      // hai khách trùng SĐT (đơn lẫn nhau) là case biên đã chốt để xử lý sau.
      const customerOrders = await storage.getCustomerOrders(customer.phone);

      // Ngày tái khám lấy từ ca khám thật (MIN order_items.recall_due_date) thay vì
      // customer.next_recall_due_at seed cứng. Ghi đè đúng trường để giao diện giữ nguyên.
      const derivedRecallDue = await storage.getNextRecallDueForCustomer(id);
      const customerWithRecall = { ...customer, nextRecallDueAt: derivedRecallDue };

      const totalSpent = customerOrders
        .filter(o => o.appointmentStatus !== "cancelled")
        .reduce((sum, o) => sum + o.totalPrice, 0);
      const orderCount = customerOrders.filter(o => o.appointmentStatus !== "cancelled").length;
      const lastOrder = customerOrders.length > 0 ? customerOrders[0] : null;

      // Tái khám lấy từ database (hệ mới): các lượt order_item của khách (mọi trạng thái)
      // + lịch sử gọi từ recall_logs. Không còn dùng store in-memory.
      const recallItems = await storage.getRecallItemsForCustomer(id);
      const recallLogs = await storage.getRecallLogsForCustomer(id);

      // Nhật ký hành động (ADR-003) — resolve tên người thực hiện.
      const rawEvents = await storage.getCustomerEvents(id);
      const events = await Promise.all(
        rawEvents.map(async (e) => {
          const actor = e.actorUserId ? await storage.getUser(e.actorUserId) : null;
          return { ...e, actorName: actor?.name ?? null };
        }),
      );

      res.json({
        customer: customerWithRecall,
        orders: customerOrders,
        stats: {
          totalSpent,
          orderCount,
          customerSince: customer.createdAt,
        },
        lastOrder,
        recallItems,
        recallLogs,
        events,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  // (Đã bỏ POST /api/customers/:id/recall-log + /recall-skip — hệ tái khám cũ in-memory.
  //  Ghi kết quả gọi nay qua POST /api/recalls/item/:orderItemId/log theo từng lượt order_item.)

  // POST /api/customers/:id/events — ghi nhật ký thao tác gọi/nhắn/email (ADR-003).
  app.post(
    "/api/customers/:id/events",
    requireRole(["sale", "doctor", "tc", "kt", "ceo"]),
    async (req, res) => {
      const customerId = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(customerId)) return res.status(400).json({ error: "invalid_id" });
      const type = req.body?.type;
      if (type !== "call" && type !== "sms" && type !== "email") {
        return res.status(400).json({ error: "invalid_type" });
      }
      await logCustomerEvent({ customerId, type, actorUserId: req.currentUser!.id });
      res.json({ ok: true });
    },
  );

  // ── Danh sách tái khám cần gọi (worklist) — nguồn DB mới theo từng lượt order_item.
  const RECALL_CALL_OUTCOMES = ["scheduled", "no_answer", "refused", "other"] as const;

  // GET /api/recalls/worklist — lọc theo người xem (sale/doctor chỉ khách mình chăm).
  app.get(
    "/api/recalls/worklist",
    requireRole(["sale", "doctor", "tc", "kt", "ceo"]),
    async (req, res) => {
      try {
        const viewer = req.currentUser!;
        const list = await storage.getRecallWorklist(viewer.id, viewer.role);
        res.json(list);
      } catch (error) {
        console.error("[recalls] worklist lỗi:", error);
        res.status(500).json({ error: "worklist_failed" });
      }
    },
  );

  // POST /api/recalls/item/:orderItemId/log — ghi kết quả 1 lượt gọi + đổi trạng thái item.
  app.post(
    "/api/recalls/item/:orderItemId/log",
    requireRole(["sale", "doctor", "tc", "kt", "ceo"]),
    async (req, res) => {
      const orderItemId = parseInt(String(req.params.orderItemId), 10);
      if (!Number.isFinite(orderItemId)) return res.status(400).json({ error: "invalid_id" });
      const outcome = req.body?.outcome;
      if (!RECALL_CALL_OUTCOMES.includes(outcome)) {
        return res
          .status(400)
          .json({ error: "validation", message: "outcome phải thuộc: " + RECALL_CALL_OUTCOMES.join(", ") });
      }
      const note = typeof req.body?.note === "string" ? req.body.note : null;
      // Quyền ghi: NV (sale/doctor) chỉ ghi cho khách mình chăm; tc/kt/ceo ghi mọi lượt.
      const viewer = req.currentUser!;
      if (viewer.role === "sale" || viewer.role === "doctor") {
        const owner = await storage.getRecallItemOwner(orderItemId);
        if (!owner) {
          return res.status(404).json({ error: "not_found", message: "Không tìm thấy lượt tái khám" });
        }
        if (owner.assigneeUserId !== viewer.id) {
          return res.status(403).json({ error: "forbidden", message: "Bạn không phụ trách khách này" });
        }
      }
      try {
        const log = await storage.logRecallCall({
          orderItemId,
          actorUserId: viewer.id,
          outcome,
          note,
        });
        // Ghi thêm sự kiện vào nhật ký tương tác của khách (recall_call) để hiện ở
        // "Lịch sử tương tác" bên cạnh "Lịch sử gọi". customerId lấy từ dòng log vừa ghi.
        // Best-effort: lượt gọi đã lưu (recall_logs) là nguồn chính; nếu ghi event lỗi
        // thì chỉ cảnh báo, KHÔNG fail request (tránh client tưởng thất bại rồi gọi lại).
        try {
          await logCustomerEvent({
            customerId: log.customerId,
            type: "recall_call",
            actorUserId: viewer.id,
            meta: { outcome },
          });
        } catch (evErr) {
          console.error("[recalls] ghi recall_call event lỗi (bỏ qua):", evErr);
        }
        res.json(log);
      } catch (error) {
        console.error("[recalls] log lỗi:", error);
        res.status(404).json({ error: "log_failed", message: "Không ghi được lượt gọi" });
      }
    },
  );

  app.post("/api/customers", async (req, res) => {
    try {
      const parsed = insertCustomerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid customer data", errors: parsed.error.errors });
      }
      const customer = await storage.createCustomer(parsed.data);
      res.status(201).json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  // Full leaderboard — gated CEO/TC/KT only per B4 R-9-1 (NV/BS chỉ thấy của mình).
  app.get("/api/staff", requireRole(["ceo", "tc", "kt"]), async (_req, res) => {
    try {
      const staff = await storage.getAllStaffMembers();
      res.json(staff);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  // Bảng xếp hạng theo kỳ — xếp hạng NV theo tổng HH thật (commission_records) của cycle.
  app.get("/api/leaderboard", requireRole(["ceo", "tc", "kt"]), async (req, res) => {
    try {
      const cycle = typeof req.query.cycle === "string" ? req.query.cycle : currentCycleId();
      const records = await storage.getAllCommissionRecordsByCycle(cycle);
      const totals = new Map<number, number>();
      for (const r of records) {
        // Chỉ tính HH gross (loại TU_CHOI, CANCEL, CLAWBACK_PENDING) — cùng bộ lọc với
        // trang chủ + màn thu nhập để ba nơi ra một con số.
        if (!isGrossCommission(r.status)) continue;
        totals.set(r.userId, (totals.get(r.userId) ?? 0) + r.amount);
      }
      const users = await storage.getAllUsers();
      const byId = new Map(users.map((u) => [u.id, u]));
      const leaderboard = Array.from(totals.entries())
        .map(([userId, total]) => {
          const u = byId.get(userId);
          return {
            id: userId,
            name: u?.name ?? `#${userId}`,
            role: u ? ROLE_LABEL[u.role as UserRole] ?? u.role : "",
            revenue: total,
            commission: total,
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .map((row, i) => ({ ...row, rank: i + 1 }));
      res.json({ availableCycles: generateLast6Cycles(), leaderboard });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Phân tích tổng quan — số liệu thật theo kỳ (quản lý xem; NV thường 403).
  app.get("/api/analytics/overview", requireRole(["ceo", "tc", "kt"]), async (req, res) => {
    try {
      const cycle = typeof req.query.cycle === "string" && req.query.cycle ? req.query.cycle : currentCycleId();
      const data = await getAnalyticsOverview(cycle);
      res.json(data);
    } catch (error) {
      console.error("[analytics] overview lỗi:", error);
      res.status(500).json({ message: "Failed to fetch analytics overview" });
    }
  });

  // Phân tích lịch hẹn — số liệu thật theo kỳ (chưa gồm phần theo bác sĩ).
  app.get("/api/analytics/appointments", requireRole(["ceo", "tc", "kt"]), async (req, res) => {
    try {
      const cycle = typeof req.query.cycle === "string" && req.query.cycle ? req.query.cycle : currentCycleId();
      const data = await getAnalyticsAppointments(cycle);
      res.json(data);
    } catch (error) {
      console.error("[analytics] appointments lỗi:", error);
      res.status(500).json({ message: "Failed to fetch analytics appointments" });
    }
  });

  // Personal ranking — any authenticated user (NV/BS dùng để xem tier của mình).
  app.get(
    "/api/ranking/me",
    requireRole(["sale", "tc", "kt", "ceo", "doctor"]),
    async (req, res) => {
      try {
        const data = await getPersonalRanking(req.currentUser!.id);
        if (!data) return res.status(404).json({ error: "not_found" });
        res.json(data);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch personal ranking" });
      }
    },
  );

  /**
   * Income detail — role-gated, current user only (B4 R-9-1 + R-11-7).
   * - Sale/BS/TC: xem HH của mình
   * - KT/CEO: 403 (vào admin-commission-approval thay vì)
   *
   * Query: ?cycle=YYYY-MM (default current cycle).
   * Response: HH gốc theo đơn (CR group) + Adjustments APPROVED + Clawbacks + net.
   *
   * Spec: B5-3 Section 1 (S-Income).
   */
  app.get(
    "/api/income/me",
    requireRole(["sale", "doctor", "tc"]),
    async (req, res) => {
      try {
        const cycleParam = typeof req.query.cycle === "string" ? req.query.cycle : null;
        const cycle = cycleParam || currentCycleId();
        const data = await getIncomeForUser(req.currentUser!.id, cycle);
        if (!data) return res.status(404).json({ error: "user_not_found" });
        res.json({ ...data, availableCycles: generateLast6Cycles() });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch income" });
      }
    },
  );

  // ============================================================
  // Admin: Commission Approval (B5-3 Section 3 — Diễm/KT review)
  // GET: KT + CEO + TC view; POST: KT only.
  // ============================================================

  // Helper: ensure CRs sinh cho mọi đơn (cycle hiện tại) trước khi list.
  // GET — overview cho 4 tabs (CR, complaint, adjustment counts)
  app.get(
    "/api/admin/commission-approval",
    requireRole(["kt", "ceo", "tc"]),
    async (req, res) => {
      const cycle = typeof req.query.cycle === "string" ? req.query.cycle : currentCycleId();

      const allOrders = await storage.getAllOrders();
      const orderMap = new Map(allOrders.map((o) => [o.id, o]));
      const allUsers = await storage.getAllUsers();
      const userMap = new Map(allUsers.map((u) => [u.id, u]));

      // CRs grouped by order — nguồn DB thật theo kỳ
      const grouped = await storage.listCrsForCycleGrouped(cycle);
      const orderGroups = Array.from(grouped.entries()).map(([orderId, crs]) => {
        const order = orderMap.get(orderId);
        return {
          orderId,
          orderCode: order?.code ?? "",
          serviceName: order?.serviceName ?? "",
          patientName: order?.patientName ?? "",
          totalPrice: order?.totalPrice ?? 0,
          crs: crs.map((cr) => ({
            ...cr,
            beneficiaryName: userMap.get(cr.userId)?.name ?? "-",
          })),
        };
      });

      // Stats — đếm theo kỳ từ DB
      const pendingStats = await storage.countCrs(cycle, "CHO_DUYET");
      const rejectedStats = await storage.countCrs(cycle, "TU_CHOI");
      const complaintStats = await storage.countCrs(cycle, "KHIEU_NAI");
      const approvedStats = await storage.countCrs(cycle, "DUOC_DUYET");

      // Complaints — DB theo kỳ
      const pendingComplaints = (await storage.listPendingCommissionComplaints(cycle)).map((entry) => {
        const cr = entry.cr;
        const order = orderMap.get(cr.orderId);
        const user = userMap.get(cr.userId);
        return {
          cr: { ...cr, beneficiaryName: user?.name ?? "-" },
          orderCode: order?.code ?? "",
          serviceName: order?.serviceName ?? "",
          complaints: entry.complaints,
        };
      });

      // Adjustments — toàn cycle, nguồn DB thật
      const allAdj = (await storage.listAllAdjustmentsForCycle(cycle)).map((a) => ({
        ...a,
        beneficiaryName: userMap.get(a.userId)?.name ?? "-",
        canEdit: canEditAdjustment(a),
      }));

      res.json({
        cycle,
        availableCycles: generateLast6Cycles(),
        stats: {
          pending: pendingStats,
          rejected: rejectedStats,
          complaints: complaintStats,
          approved: approvedStats,
        },
        orderGroups,
        pendingComplaints,
        adjustments: allAdj,
      });
    },
  );

  // POST /cr/:crId/approve (KT only — find orderId từ crId scan)
  app.post(
    "/api/admin/commission-approval/cr/:crId/approve",
    requireRole(["kt"]),
    async (req, res) => {
      const crId = parseInt(String(req.params.crId), 10);
      if (!Number.isFinite(crId)) return res.status(400).json({ error: "invalid_id" });
      const cr = await storage.approveCommissionRecord(crId);
      if (!cr) return res.status(409).json({ error: "invalid_state" });
      await auditLog.append({
        userId: req.currentUser!.id,
        action: "cr.approve",
        actorId: req.currentUser!.id,
        payload: { crId, orderId: cr.orderId, amount: cr.amount, role: cr.role },
      });
      res.json(cr);
    },
  );

  // POST /cr/:crId/reject (KT only — admin reject với reason min 10 chars)
  app.post(
    "/api/admin/commission-approval/cr/:crId/reject",
    requireRole(["kt"]),
    async (req, res) => {
      const parsed = adminRejectCRSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "validation", issues: parsed.error.issues });
      }
      const crId = parseInt(String(req.params.crId), 10);
      if (!Number.isFinite(crId)) return res.status(400).json({ error: "invalid_id" });
      const cr = await storage.rejectCommissionRecord(crId, parsed.data.reason);
      if (!cr) return res.status(409).json({ error: "invalid_state" });
      await auditLog.append({
        userId: req.currentUser!.id,
        action: "cr.reject",
        actorId: req.currentUser!.id,
        payload: { crId, orderId: cr.orderId, amount: cr.amount, role: cr.role, reason: parsed.data.reason },
      });
      res.json(cr);
    },
  );

  // POST /order/:orderId/bulk-approve (KT only — duyệt tất cả CR CHO_DUYET trong đơn)
  app.post(
    "/api/admin/commission-approval/order/:orderId/bulk-approve",
    requireRole(["kt"]),
    async (req, res) => {
      const orderId = parseInt(String(req.params.orderId), 10);
      if (!Number.isFinite(orderId)) return res.status(400).json({ error: "invalid_id" });
      const result = await storage.bulkApproveCrsByOrder(orderId);
      if (result.approved === 0) {
        return res.status(409).json({ error: "no_pending_crs", ...result });
      }
      await auditLog.append({
        userId: req.currentUser!.id,
        action: "cr.bulk_approve_order",
        actorId: req.currentUser!.id,
        payload: { orderId, ...result },
      });
      res.json(result);
    },
  );

  // POST /bulk-approve-cycle (KT only — safety gate: typing "DUYỆT")
  app.post(
    "/api/admin/commission-approval/bulk-approve-cycle",
    requireRole(["kt"]),
    async (req, res) => {
      const parsed = bulkApproveCycleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "validation_or_keyword_mismatch", issues: parsed.error.issues });
      }
      const result = await storage.bulkApproveCrsByCycle(parsed.data.cycle);
      await auditLog.append({
        userId: req.currentUser!.id,
        action: "cr.bulk_approve_cycle",
        actorId: req.currentUser!.id,
        payload: {
          cycle: parsed.data.cycle,
          ...result,
          typedConfirmation: parsed.data.typedConfirmation,
          acknowledged: parsed.data.acknowledged,
        },
      });
      res.json(result);
    },
  );

  // POST /complaint/:crId/resolve (KT only — Diễm decide alone per R-11-7)
  app.post(
    "/api/admin/commission-approval/complaint/:crId/resolve",
    requireRole(["kt"]),
    async (req, res) => {
      const parsed = resolveComplaintSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "validation", issues: parsed.error.issues });
      }
      const crId = parseInt(String(req.params.crId), 10);
      if (!Number.isFinite(crId)) return res.status(400).json({ error: "invalid_id" });
      const cr = await storage.resolveCommissionComplaint(crId, parsed.data.resolution, parsed.data.note ?? null);
      if (!cr) return res.status(409).json({ error: "invalid_state" });
      await auditLog.append({
        userId: req.currentUser!.id,
        action:
          parsed.data.resolution === "revert"
            ? "cr.complaint_resolve_revert"
            : "cr.complaint_resolve_keep",
        actorId: req.currentUser!.id,
        payload: { crId, resolution: parsed.data.resolution, note: parsed.data.note },
      });
      res.json(cr);
    },
  );

  // POST /adjustment/:adjId/cancel (KT only — chỉ PENDING/AUTO_PENDING)
  app.post(
    "/api/admin/commission-approval/adjustment/:adjId/cancel",
    requireRole(["kt"]),
    async (req, res) => {
      const adjId = parseInt(String(req.params.adjId), 10);
      if (!Number.isFinite(adjId)) return res.status(400).json({ error: "invalid_id" });
      const adj = await storage.cancelAdjustment(adjId);
      if (!adj) return res.status(409).json({ error: "invalid_state" });
      await auditLog.append({
        userId: req.currentUser!.id,
        action: "adjustment.cancel",
        actorId: req.currentUser!.id,
        payload: { adjId, amount: adj.amount, type: adj.type },
      });
      res.json(adj);
    },
  );

  /**
   * Dashboard — role-based response (B4 R-9-1).
   * - Sale/BS/TC → Personal view (HH cá nhân, KPI cá nhân, pending của mình)
   * - KT/CEO → Admin view (Tổng HH PK, KPI PK, pending toàn PK, leaderboard)
   *
   * Token-gated; bỏ hardcoded "mai" lookup.
   */
  app.get(
    "/api/dashboard",
    requireRole(["sale", "doctor", "tc", "kt", "ceo"]),
    async (req, res) => {
      try {
        const role = req.currentUser!.role;
        const userId = req.currentUser!.id;
        const isAdmin = role === "kt" || role === "ceo";
        const data = isAdmin
          ? await getAdminDashboard(userId)
          : await getPersonalDashboard(userId);
        if (!data) return res.status(404).json({ error: "user_not_found" });
        res.json(data);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch dashboard data" });
      }
    },
  );

  // ───────────────────────────────────────────────────────────────
  // Notifications (bell icon AppHeader) — derive từ CR/recall/adjustment state.
  // Require auth nhưng không role-specific gate; mỗi user nhận data của mình.
  // ───────────────────────────────────────────────────────────────

  app.get(
    "/api/notifications/me",
    requireRole(["ceo", "tc", "kt", "sale", "doctor"]),
    async (req, res) => {
      const user = req.currentUser!;
      const list = await listNotificationsForUser(user.id, user.role as UserRole);
      const unread = list.filter((n) => n.readAt === null).length;
      res.json({ notifications: list, unread });
    },
  );

  app.get(
    "/api/notifications/me/count",
    requireRole(["ceo", "tc", "kt", "sale", "doctor"]),
    async (req, res) => {
      const user = req.currentUser!;
      const count = await countUnreadForUser(user.id, user.role as UserRole);
      res.json({ unread: count });
    },
  );

  app.post(
    "/api/notifications/:id/read",
    requireRole(["ceo", "tc", "kt", "sale", "doctor"]),
    async (req, res) => {
      const id = String(req.params.id);
      if (!id) return res.status(400).json({ error: "invalid_id" });
      await markRead(req.currentUser!.id, id);
      res.json({ ok: true });
    },
  );

  app.post(
    "/api/notifications/read-all",
    requireRole(["ceo", "tc", "kt", "sale", "doctor"]),
    async (req, res) => {
      const user = req.currentUser!;
      const list = await listNotificationsForUser(user.id, user.role as UserRole);
      const ids = list.filter((n) => n.readAt === null).map((n) => n.id);
      await markAllRead(user.id, ids);
      res.json({ ok: true, marked: ids.length });
    },
  );

  app.get("/api/search", async (req, res) => {
    try {
      const q = (req.query.q as string || "").trim().toLowerCase();
      if (!q) {
        return res.json({ services: [], customers: [], orders: [] });
      }

      // Lọc theo người đăng nhập (token): NV (sale/doctor) chỉ thấy đơn của mình +
      // khách mình chăm; quản lý (tc/kt/ceo) thấy hết. Dịch vụ là danh mục chung, không lọc.
      const user = req.currentUser!;
      const seesAll = user.role === "tc" || user.role === "kt" || user.role === "ceo";

      const allServices = await storage.getAllServices();
      const allCustomers = await storage.getAllCustomers();
      const allOrders = await storage.getAllOrders();

      const scopedCustomers = seesAll
        ? allCustomers
        : allCustomers.filter(c => c.primaryAssignedUserId === user.id);
      const scopedOrders = seesAll ? allOrders : allOrders.filter(o => o.userId === user.id);

      const services = allServices
        .filter(s => s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.category || "").toLowerCase().includes(q))
        .slice(0, 5);

      const customers = scopedCustomers
        .filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email || "").toLowerCase().includes(q))
        .slice(0, 5);

      const orders = scopedOrders
        .filter(o => o.code.toLowerCase().includes(q) || o.patientName.toLowerCase().includes(q) || o.serviceName.toLowerCase().includes(q))
        .slice(0, 5);

      res.json({ services, customers, orders });
    } catch (error) {
      res.status(500).json({ message: "Failed to search" });
    }
  });

  return httpServer;
}
