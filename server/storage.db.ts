/**
 * DbStorage — implements IStorage trên Postgres thật (Drizzle).
 *
 * Dịch 1-1 từ MemoryStorage: GIỮ NGUYÊN hành vi từng method, chỉ đổi nguồn dữ liệu
 * từ mảng RAM sang truy vấn database. id dùng cột serial (bỏ nextId thủ công),
 * insert dùng .returning() để lấy bản ghi vừa tạo.
 *
 * G2 sẽ thay nốt các store mock (commission/orderItems/adjustments). Bước này chỉ
 * persist users/services/customers/orders/statusLogs/staffMembers/commissionTiers.
 */

import {
  type User, type InsertUser,
  type Service, type InsertService,
  type Order, type InsertOrder,
  type Customer, type InsertCustomer,
  type StaffMember, type InsertStaffMember,
  type StatusLog, type InsertStatusLog,
  type CommissionTier,
  type OrderItemRow, type InsertOrderItem,
  type OrderRoleAssignment,
  type CommissionRecordRow,
  type CustomerEventRow,
  type VoucherRow, type InsertVoucher,
  type RecallLog,
  type CommissionComplaintRow,
  type InsertCommissionRecord, type InsertAdjustment,
  users, services, orders,
  customers, staffMembers, statusLogs, commissionTiers,
  orderItems, orderRoleAssignments, commissionRecords, customerEvents,
  vouchers, recallLogs, commissionComplaints, adjustments,
  autoRules, systemSettings, systemSettingsHistory,
} from "@shared/schema";
import {
  type AppointmentStatusCode,
  type VisitStatusCode,
  APPOINTMENT_TRANSITIONS,
  VISIT_TRANSITIONS,
} from "@shared/status";
import { canKhieuNai, type AutoRuleKey, type UpdateAutoRuleInput } from "@shared/types";
import {
  SYSTEM_SETTING_DEFAULTS,
  SYSTEM_SETTING_KEYS,
  isSystemSettingKey,
  normalizeSettingValue,
  type SystemSettingHistoryEntry,
  type SystemSettingKey,
  type SystemSettings,
  type SystemSettingsView,
} from "@shared/system-settings";
import { and, asc, desc, eq, getTableColumns, gt, ilike, inArray, isNotNull, isNull, lte, notInArray, or, sql, type SQL } from "drizzle-orm";
import { formatVnDateTime, parseVnDateTime } from "@shared/vn-time";
import { db } from "./db";
import type { DbTx } from "./db-tx";
import { computeCommissionForOrder, huyHoaHongChuaDuyet } from "./commission-engine";
import type { ChiTietDichVu } from "./ingest";
import { tomTatDong } from "./order-lines";
import { lyDoKhongDuDieuKien, tienGiamTheoMa } from "./vouchers";
import type { IStorage, CommissionRecordWithRole, RecallWorklistRow, RecallCallOutcome, RecallItemForCustomer, RecallLogForCustomer, RecallItemStat, FileComplaintResult, AutoRule, StatusChangeMeta } from "./storage";
import {
  mapCrRowToView,
  mapComplaintRowToView,
  mapAdjustmentRowToView,
  type CommissionRecord,
  type ComplaintEntry,
  type Adjustment,
  type Clawback,
} from "./commission-types";

/** Escape ký tự đặc biệt của LIKE/ILIKE để khớp đúng hành vi String.includes(). */
function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (c) => "\\" + c);
}

/**
 * Chuẩn hóa giá trị recall_due_date về chuỗi "YYYY-MM-DD" (hoặc null).
 * Cột là kiểu `date` (Drizzle trả string), nhưng phòng trường hợp Date → cắt phần ngày.
 */
function normalizeRecallDate(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v.slice(0, 10);
}

/**
 * VN timestamp DD/MM/YYYY HH:mm, bê đúng format từ MemoryStorage. Ghi theo giờ Việt
 * Nam chứ không theo giờ máy: chạy trên Vercel (UTC) thì nhật ký lệch 7 tiếng.
 */
const vnTimestamp = formatVnDateTime;

async function ghiStatusLog(exec: typeof db | DbTx, insertLog: InsertStatusLog): Promise<StatusLog> {
  const rows = await exec
    .insert(statusLogs)
    .values({
      orderId: insertLog.orderId,
      tier: insertLog.tier,
      fromStatus: insertLog.fromStatus,
      toStatus: insertLog.toStatus,
      timestamp: insertLog.timestamp,
      note: insertLog.note ?? null,
      source: insertLog.source ?? "app",
      actorUserId: insertLog.actorUserId ?? null,
      // Dòng seed chỉ có giờ dạng chữ; lấy mốc từ đó thay vì giờ chạy seed, không
      // thì mọi lịch sử mẫu dồn về cùng một phút.
      createdAt: insertLog.createdAt ?? parseVnDateTime(insertLog.timestamp) ?? new Date(),
    })
    .returning();
  return rows[0];
}

/**
 * Tỷ lệ (điểm cơ bản) đang hiệu lực của một vai, một bậc tại thời điểm `at`. Nhận cả
 * transaction vì tạo đơn tra tỷ lệ lúc đang giữ khoá cấp mã đơn trong ngày: tra qua
 * pool lúc đó là xin thêm kết nối trong khi các đơn xếp hàng sau khoá đang giữ hết.
 */
export async function tyLeHieuLuc(
  exec: typeof db | DbTx,
  role: string,
  ranking: string | null,
  at: Date = new Date(),
): Promise<number | null> {
  const rankingCond: SQL =
    ranking === null ? isNull(commissionTiers.ranking) : eq(commissionTiers.ranking, ranking);
  const rows = await exec
    .select()
    .from(commissionTiers)
    .where(
      and(
        eq(commissionTiers.role, role),
        rankingCond,
        lte(commissionTiers.effectiveFrom, at),
        or(isNull(commissionTiers.effectiveTo), gt(commissionTiers.effectiveTo, at)),
      ),
    )
    .limit(1);
  return rows[0] ? rows[0].percentBp : null;
}

/** Sửa dịch vụ bị từ chối: route trả nguyên `status` và câu này cho người dùng. */
export type LoiSuaDichVu = { loi: true; status: 409 | 422; message: string };

/** Lịch hẹn kết thúc mà khách không khám ở đơn này: hoa hồng ước tính của đơn về 0. */
const LICH_HEN_HUY_HOA_HONG = new Set<AppointmentStatusCode>(["cancelled", "no_show", "rescheduled"]);

/**
 * Chuyển trạng thái lịch hẹn trong transaction của nơi gọi. Dời lịch dùng chung hàm
 * này để đổi trạng thái đơn cũ, hủy khoản và tạo đơn mới trong cùng một lần ghi.
 *
 * Hủy lịch, Không đến, Dời lịch chuyển khoản chưa duyệt của đơn sang CANCEL ngay
 * trong lần ghi đó (OD-19): trước đây khoản vẫn Chờ duyệt nên Trang chủ còn cộng
 * tiền của đơn đã hủy, và dời lịch thì đơn cũ lẫn đơn mới cùng được tính.
 */
export async function chuyenTrangThaiLichHen(
  tx: DbTx,
  order: Order,
  newStatus: AppointmentStatusCode,
  note?: string,
  meta?: StatusChangeMeta,
): Promise<Order | undefined> {
  const currentStatus = order.appointmentStatus as AppointmentStatusCode;
  const validTransitions = APPOINTMENT_TRANSITIONS[currentStatus] || [];
  if (!validTransitions.includes(newStatus)) return undefined;

  const set: Partial<typeof orders.$inferInsert> = { appointmentStatus: newStatus };
  // When arrived, auto-create visit status (bê đúng từ MemoryStorage).
  if (newStatus === "arrived") set.visitStatus = "arrived";

  // Kèm trạng thái cũ vào điều kiện: hai người bấm cùng lúc thì chỉ một lần chuyển
  // được ghi, người kia nhận undefined như một bước chuyển không hợp lệ.
  const rows = await tx
    .update(orders)
    .set(set)
    .where(and(eq(orders.id, order.id), eq(orders.appointmentStatus, currentStatus)))
    .returning();
  if (!rows[0]) return undefined;

  const now = new Date();
  await ghiStatusLog(tx, {
    orderId: order.id,
    tier: "appointment",
    fromStatus: currentStatus,
    toStatus: newStatus,
    timestamp: vnTimestamp(now),
    note: note ?? null,
    source: meta?.source ?? "app",
    actorUserId: meta?.actorUserId ?? null,
    createdAt: now,
  });

  if (!LICH_HEN_HUY_HOA_HONG.has(newStatus)) return rows[0];
  await huyHoaHongChuaDuyet(tx, order.id);
  // Đọc lại để trả về orders.commission đã về số mới.
  const sau = await tx.select().from(orders).where(eq(orders.id, order.id)).limit(1);
  return sau[0] ?? rows[0];
}

export class DbStorage implements IStorage {
  // ───────────────────────── Users ─────────────────────────

  async getUser(id: number): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0];
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return rows[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const rows = await db
      .insert(users)
      .values({
        username: insertUser.username,
        password: insertUser.password ?? "",
        phone: insertUser.phone,
        lockedUntil: insertUser.lockedUntil ?? null,
        name: insertUser.name,
        role: insertUser.role ?? "sale",
        department: insertUser.department ?? "Phòng Kinh Doanh",
        avatar: insertUser.avatar ?? null,
        targetRevenue: insertUser.targetRevenue ?? 50000000,
        currentRevenue: insertUser.currentRevenue ?? 0,
        commissionRate: insertUser.commissionRate ?? 5,
        ranking: insertUser.ranking ?? null,
        ihosUserId: insertUser.ihosUserId ?? null,
        status: insertUser.status ?? "active",
        offboardingDate: insertUser.offboardingDate ?? null,
        monthlyTargetHh: insertUser.monthlyTargetHh ?? 0,
        monthlyTargetOrders: insertUser.monthlyTargetOrders ?? 0,
        createdAt: insertUser.createdAt ?? new Date(),
        createdByUserId: insertUser.createdByUserId ?? null,
      })
      .returning();
    return rows[0];
  }

  async updateUser(id: number, data: Partial<Pick<User, "name" | "avatar">>): Promise<User | undefined> {
    const set: Partial<typeof users.$inferInsert> = {};
    if (data.name !== undefined) set.name = data.name;
    if (data.avatar !== undefined) set.avatar = data.avatar;
    if (Object.keys(set).length === 0) return this.getUser(id);
    const rows = await db.update(users).set(set).where(eq(users.id, id)).returning();
    return rows[0];
  }

  async updateUserLock(id: number, lockedUntil: Date | null): Promise<User | undefined> {
    const rows = await db.update(users).set({ lockedUntil }).where(eq(users.id, id)).returning();
    return rows[0];
  }

  async updateUserFields(
    id: number,
    data: Partial<
      Pick<
        User,
        "name" | "phone" | "role" | "ranking" | "ihosUserId" | "monthlyTargetHh" | "monthlyTargetOrders" | "status" | "offboardingDate"
      >
    >,
  ): Promise<User | undefined> {
    const set: Partial<typeof users.$inferInsert> = {};
    if (data.name !== undefined) set.name = data.name;
    if (data.phone !== undefined) set.phone = data.phone;
    if (data.role !== undefined) set.role = data.role;
    if (data.ranking !== undefined) set.ranking = data.ranking;
    if (data.ihosUserId !== undefined) set.ihosUserId = data.ihosUserId;
    if (data.monthlyTargetHh !== undefined) set.monthlyTargetHh = data.monthlyTargetHh;
    if (data.monthlyTargetOrders !== undefined) set.monthlyTargetOrders = data.monthlyTargetOrders;
    if (data.status !== undefined) set.status = data.status;
    if (data.offboardingDate !== undefined) set.offboardingDate = data.offboardingDate;
    if (Object.keys(set).length === 0) return this.getUser(id);
    const rows = await db.update(users).set(set).where(eq(users.id, id)).returning();
    return rows[0];
  }

  async updateUserStatus(
    id: number,
    status: User["status"],
    offboardingDate: string | null,
  ): Promise<User | undefined> {
    const rows = await db
      .update(users)
      .set({ status, offboardingDate })
      .where(eq(users.id, id))
      .returning();
    return rows[0];
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(asc(users.id));
  }

  // ───────────────────────── Services ─────────────────────────

  async getAllServices(): Promise<Service[]> {
    return db.select().from(services).orderBy(asc(services.id));
  }

  async getService(id: number): Promise<Service | undefined> {
    const rows = await db.select().from(services).where(eq(services.id, id)).limit(1);
    return rows[0];
  }

  async createService(insertService: InsertService): Promise<Service> {
    const rows = await db
      .insert(services)
      .values({
        code: insertService.code,
        title: insertService.title,
        description: insertService.description,
        price: insertService.price ?? 0,
        commissionRange: insertService.commissionRange,
        requiresDoctor: insertService.requiresDoctor ?? true,
        duration: insertService.duration,
        insurance: insertService.insurance ?? "Có hỗ trợ",
        category: insertService.category ?? null,
        diseaseType: insertService.diseaseType ?? null,
        defaultCost: insertService.defaultCost ?? 0,
      })
      .returning();
    return rows[0];
  }

  // ───────────────────────── Customers ─────────────────────────

  async getAllCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(asc(customers.id));
  }

  /** Tìm khách theo số điện thoại. Dùng để chặn tạo trùng hồ sơ. */
  async findCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const rows = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, phone.trim()))
      .limit(1);
    return rows[0];
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return rows[0];
  }

  async getCustomerOrders(phone: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.phone, phone)).orderBy(desc(orders.id));
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    // MemoryStorage: name/phone/email chứa query (case-insensitive). ilike + escape.
    const pattern = `%${escapeLike(query.toLowerCase())}%`;
    return db
      .select()
      .from(customers)
      .where(
        or(
          ilike(customers.name, pattern),
          ilike(customers.phone, pattern),
          ilike(customers.email, pattern),
        ),
      )
      .orderBy(asc(customers.id));
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const rows = await db
      .insert(customers)
      .values({
        name: insertCustomer.name,
        phone: insertCustomer.phone,
        email: insertCustomer.email ?? null,
        address: insertCustomer.address ?? null,
        location: insertCustomer.location ?? null,
        createdAt: insertCustomer.createdAt ?? "",
        nextRecallDueAt: insertCustomer.nextRecallDueAt ?? null,
        primaryAssignedUserId: insertCustomer.primaryAssignedUserId ?? null,
        // Bốn cột dưới trước đây bị bỏ quên, nên khai khách kèm ghi chú hay đánh
        // dấu VIP ngay lúc tạo đều rơi mất mà không báo lỗi gì.
        isVip: insertCustomer.isVip ?? false,
        medicalNote: insertCustomer.medicalNote ?? null,
        medicalNoteBy: insertCustomer.medicalNoteBy ?? null,
        medicalNoteAt: insertCustomer.medicalNoteAt ?? null,
      })
      .returning();
    return rows[0];
  }

  async updateCustomer(
    id: number,
    patch: Partial<Pick<Customer, "isVip" | "medicalNote" | "medicalNoteBy" | "medicalNoteAt">>,
  ): Promise<Customer | undefined> {
    const rows = await db.update(customers).set(patch).where(eq(customers.id, id)).returning();
    return rows[0];
  }

  // ───────────────────────── Orders ─────────────────────────

  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.id));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return rows[0];
  }

  async getOrderByCode(code: string): Promise<Order | undefined> {
    const rows = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
    return rows[0];
  }

  async getOrdersByUser(userId: number): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.id));
  }

  /**
   * Số đơn còn dở dang mỗi nhân viên đang đứng tên, cho cảnh báo bàn giao khi đánh dấu
   * nghỉ. Đứng tên ở bất kỳ chỗ nào trên đơn đều tính: chủ đơn, tư vấn, chỉ định, thực
   * hiện. Dở dang là lịch hẹn chưa kết thúc (hủy, không đến, đã dời sang đơn khác) và
   * nếu đã đến khám thì ca khám chưa xong.
   */
  async countOpenOrdersByStaff(): Promise<Map<number, number>> {
    const rows = await db.execute(sql`
      SELECT t.uid AS "userId", count(DISTINCT t.id)::int AS "soDon"
      FROM (
        SELECT o.id, unnest(ARRAY[o.user_id, o.sale_user_id, o.indicated_by_user_id, o.performed_by_user_id]) AS uid
        FROM ${orders} o
        WHERE o.appointment_status NOT IN ('cancelled', 'no_show', 'rescheduled')
          AND (o.visit_status IS NULL OR o.visit_status NOT IN ('completed', 'cancelled'))
      ) t
      WHERE t.uid IS NOT NULL
      GROUP BY t.uid
    `);
    const list = ((rows as { rows?: unknown[] }).rows ?? rows) as { userId: number; soDon: number }[];
    return new Map(list.map((r) => [Number(r.userId), Number(r.soDon)]));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const rows = await db
      .insert(orders)
      .values({
        code: insertOrder.code,
        patientName: insertOrder.patientName,
        phone: insertOrder.phone,
        email: insertOrder.email ?? null,
        serviceName: insertOrder.serviceName,
        serviceCode: insertOrder.serviceCode,
        serviceCategory: insertOrder.serviceCategory ?? null,
        quantity: insertOrder.quantity ?? 1,
        unitPrice: insertOrder.unitPrice,
        totalPrice: insertOrder.totalPrice,
        commission: insertOrder.commission ?? 0,
        appointmentStatus: insertOrder.appointmentStatus ?? "pending",
        visitStatus: insertOrder.visitStatus ?? null,
        notes: insertOrder.notes ?? null,
        appointmentDate: insertOrder.appointmentDate ?? null,
        appointmentTime: insertOrder.appointmentTime ?? null,
        examType: insertOrder.examType ?? null,
        vatCompanyName: insertOrder.vatCompanyName ?? null,
        vatTaxCode: insertOrder.vatTaxCode ?? null,
        vatCompanyAddress: insertOrder.vatCompanyAddress ?? null,
        vatEmail: insertOrder.vatEmail ?? null,
        createdAt: insertOrder.createdAt,
        userId: insertOrder.userId,
        refundAmount: insertOrder.refundAmount ?? 0,
        refundType: insertOrder.refundType ?? "none",
        refundReason: insertOrder.refundReason ?? null,
        // G1 columns (mock-mode chưa dùng, vẫn persist để khớp schema)
        customerId: insertOrder.customerId ?? null,
        source: insertOrder.source ?? "manual",
        idempotencyKey: insertOrder.idempotencyKey ?? null,
        saleUserId: insertOrder.saleUserId ?? null,
        indicatedByUserId: insertOrder.indicatedByUserId ?? null,
        performedByUserId: insertOrder.performedByUserId ?? null,
        insuranceAmount: insertOrder.insuranceAmount ?? 0,
        voucherAmount: insertOrder.voucherAmount ?? 0,
        voucherCode: insertOrder.voucherCode ?? null,
        totalListed: insertOrder.totalListed ?? 0,
        netProfit: insertOrder.netProfit ?? 0,
        confirmedAt: insertOrder.confirmedAt ?? null,
        completedAt: insertOrder.completedAt ?? null,
      })
      .returning();
    return rows[0];
  }

  async updateOrderAppointmentStatus(
    id: number,
    newStatus: AppointmentStatusCode,
    note?: string,
    meta?: StatusChangeMeta,
  ): Promise<Order | undefined> {
    return db.transaction(async (tx) => {
      const rows = await tx.select().from(orders).where(eq(orders.id, id)).limit(1).for("update");
      if (!rows[0]) return undefined;
      return chuyenTrangThaiLichHen(tx, rows[0], newStatus, note, meta);
    });
  }

  async updateOrderVisitStatus(
    id: number,
    newStatus: VisitStatusCode,
    note?: string,
    meta?: StatusChangeMeta,
  ): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (!order || !order.visitStatus) return undefined;

    const currentStatus = order.visitStatus as VisitStatusCode;
    const validTransitions = VISIT_TRANSITIONS[currentStatus] || [];
    if (!validTransitions.includes(newStatus)) return undefined;

    const fromStatus = order.visitStatus;
    const rows = await db
      .update(orders)
      .set({ visitStatus: newStatus })
      .where(eq(orders.id, id))
      .returning();

    const now = new Date();
    await this.createStatusLog({
      orderId: id,
      tier: "visit",
      fromStatus,
      toStatus: newStatus,
      timestamp: vnTimestamp(now),
      note: note ?? null,
      source: meta?.source ?? "app",
      actorUserId: meta?.actorUserId ?? null,
      createdAt: now,
    });

    return rows[0];
  }

  async updateOrderNotes(id: number, notes: string | null): Promise<Order | undefined> {
    const rows = await db.update(orders).set({ notes }).where(eq(orders.id, id)).returning();
    return rows[0];
  }

  async updateOrderAppointment(
    id: number,
    appointmentDate: string,
    appointmentTime: string,
  ): Promise<Order | undefined> {
    const rows = await db
      .update(orders)
      .set({ appointmentDate, appointmentTime })
      .where(eq(orders.id, id))
      .returning();
    return rows[0];
  }

  /**
   * Đổi người phụ trách đơn (chỉ định / thực hiện / tư vấn).
   *
   * Chỉ ghi những cột thật sự được gửi lên, nên sửa một chỗ không xoá hai chỗ kia.
   * Cố ý KHÔNG gọi computeCommissionForOrder: ba chỗ này ghi nhận ai làm gì trên
   * ca, còn người hưởng hoa hồng nằm ở bảng order_role_assignments. Nối hai thứ
   * lại thì mỗi lần đổi tên là xoá sạch hoa hồng đã duyệt của đơn, việc đó phải
   * là một quyết định riêng chứ không nên xảy ra âm thầm ở đây.
   */
  async updateOrderAssignees(
    id: number,
    assignees: Partial<{
      indicatedByUserId: number | null;
      performedByUserId: number | null;
      saleUserId: number | null;
    }>,
  ): Promise<Order | undefined> {
    if (Object.keys(assignees).length === 0) return this.getOrder(id);
    const rows = await db.update(orders).set(assignees).where(eq(orders.id, id)).returning();
    return rows[0];
  }

  /**
   * Thay toàn bộ dịch vụ của đơn rồi tính lại tiền, trong một transaction.
   *
   * Bảng orders vẫn giữ kiểu gộp (xem tomTatDong); chi tiết từng dịch vụ nằm ở
   * order_items. Giá các dòng là giá máy chủ đã tra danh mục, nơi gọi lo việc đó.
   *
   * totalPrice và totalListed là tạm tính trước giảm, cùng nghĩa như lúc tạo đơn;
   * trước đây chỗ này ghi tổng sau giảm vào totalPrice còn totalListed giữ số cũ, nên
   * đơn đã sửa thì hai cột lệch nhau. Đơn có mã giảm giá thì tính lại số giảm theo tạm
   * tính mới, không thì mã phần trăm giữ số giảm của danh sách dịch vụ cũ.
   *
   * Hoa hồng chỉ tính lại khoản còn Chờ duyệt, khoản đã duyệt, từ chối, khiếu nại giữ
   * nguyên (xem computeCommissionForOrder).
   *
   * `danhMuc` do nơi gọi tải sẵn: đọc qua pool khi đang giữ khoá dòng đơn thì hai
   * người cùng sửa một đơn có thể giữ hết kết nối rồi chờ nhau mãi.
   * `trangThaiDaKiem` là trạng thái lịch hẹn route đã kiểm là còn sửa được; khác đi lúc
   * đã khoá dòng nghĩa là vừa có người đổi (thường là khách vừa đến), dừng lại.
   */
  async replaceOrderServices(
    id: number,
    services: ChiTietDichVu[],
    danhMuc: Service[],
    trangThaiDaKiem: string,
  ): Promise<Order | LoiSuaDichVu | undefined> {
    if (services.length === 0) return undefined;
    return db.transaction(async (tx): Promise<Order | LoiSuaDichVu | undefined> => {
      const truoc = (await tx.select().from(orders).where(eq(orders.id, id)).limit(1).for("update"))[0];
      if (!truoc) return undefined;
      if (truoc.appointmentStatus !== trangThaiDaKiem) {
        return { loi: true, status: 409, message: "Đơn vừa đổi trạng thái lịch hẹn, mở lại đơn rồi sửa" };
      }

      const tom = tomTatDong(services);
      let voucherAmount = Math.min(truoc.voucherAmount, tom.subtotal);
      if (truoc.voucherCode) {
        const v = (await tx.select().from(vouchers).where(eq(vouchers.code, truoc.voucherCode)).limit(1))[0];
        if (v) {
          const thieu = lyDoKhongDuDieuKien(v, tom.subtotal, services.length);
          if (thieu) {
            return {
              loi: true,
              status: 422,
              message: `Đơn sau khi sửa không còn đủ điều kiện mã ${v.code}. ${thieu}`,
            };
          }
          // Điều khoản mã đã đổi sau khi đơn dùng (tính lại trên tạm tính cũ không ra
          // đúng số đã giảm) thì giữ số đã giảm: khách đặt theo điều khoản lúc đặt, CEO
          // sửa phần trăm về sau không được kéo theo đơn cũ mỗi lần sửa dịch vụ.
          if (tienGiamTheoMa(v, truoc.totalListed) === truoc.voucherAmount) {
            voucherAmount = tienGiamTheoMa(v, tom.subtotal);
          }
        }
      }
      const rows = await tx
        .update(orders)
        .set({
          serviceName: tom.serviceName,
          serviceCode: tom.serviceCode,
          serviceCategory: tom.serviceCategory,
          quantity: tom.quantity,
          unitPrice: tom.unitPrice,
          totalPrice: tom.subtotal,
          totalListed: tom.subtotal,
          voucherAmount,
        })
        .where(eq(orders.id, id))
        .returning();
      const sau = rows[0];
      if (!sau) return undefined;

      await tx.delete(orderItems).where(eq(orderItems.orderId, id));
      for (const x of services) {
        const sv = danhMuc.find((s) => s.code === x.serviceCode);
        await tx.insert(orderItems).values({
          orderId: id,
          serviceId: sv?.id ?? 0,
          serviceName: x.serviceName,
          quantity: x.quantity,
          unitPrice: x.unitPrice,
          cost: sv?.defaultCost ?? 0,
          status: "completed",
          skippedReason: null,
          performedByUserId: null,
          recallDueDate: null,
          refundedAmount: 0,
        });
      }
      await computeCommissionForOrder(sau, tx);
      return (await tx.select().from(orders).where(eq(orders.id, id)).limit(1))[0] ?? sau;
    });
  }

  // ───────────────────────── Status logs ─────────────────────────

  async getStatusLogs(orderId: number): Promise<StatusLog[]> {
    return db
      .select()
      .from(statusLogs)
      .where(eq(statusLogs.orderId, orderId))
      .orderBy(asc(statusLogs.id));
  }

  async createStatusLog(insertLog: InsertStatusLog): Promise<StatusLog> {
    return ghiStatusLog(db, insertLog);
  }

  // ───────────────────────── Staff members ─────────────────────────

  async getAllStaffMembers(): Promise<StaffMember[]> {
    return db.select().from(staffMembers).orderBy(asc(staffMembers.rank));
  }

  async createStaffMember(insertMember: InsertStaffMember): Promise<StaffMember> {
    const rows = await db
      .insert(staffMembers)
      .values({
        name: insertMember.name,
        role: insertMember.role,
        revenue: insertMember.revenue ?? 0,
        commission: insertMember.commission ?? 0,
        rank: insertMember.rank ?? 0,
      })
      .returning();
    return rows[0];
  }

  // ──────────── Commission tier config (B4 R-1-2 + R-1-3) ────────────

  async listCommissionTiers(activeOnly: boolean = true): Promise<CommissionTier[]> {
    if (activeOnly) {
      return db
        .select()
        .from(commissionTiers)
        .where(isNull(commissionTiers.effectiveTo))
        .orderBy(desc(commissionTiers.effectiveFrom));
    }
    return db.select().from(commissionTiers).orderBy(desc(commissionTiers.effectiveFrom));
  }

  async upsertCommissionTier(input: {
    role: string;
    ranking: string | null;
    percentBp: number;
    createdByUserId: number | null;
  }): Promise<CommissionTier> {
    const now = new Date();
    const rankingCond: SQL =
      input.ranking === null
        ? isNull(commissionTiers.ranking)
        : eq(commissionTiers.ranking, input.ranking);

    return db.transaction(async (tx) => {
      // 1. Mark current active row (same role+ranking) expired.
      await tx
        .update(commissionTiers)
        .set({ effectiveTo: now })
        .where(and(isNull(commissionTiers.effectiveTo), eq(commissionTiers.role, input.role), rankingCond));
      // 2. Insert new row.
      const rows = await tx
        .insert(commissionTiers)
        .values({
          role: input.role,
          ranking: input.ranking,
          percentBp: input.percentBp,
          effectiveFrom: now,
          effectiveTo: null,
          createdByUserId: input.createdByUserId,
        })
        .returning();
      return rows[0];
    });
  }

  async getEffectiveCommissionRate(
    role: string,
    ranking: string | null,
    at: Date = new Date(),
  ): Promise<number | null> {
    return tyLeHieuLuc(db, role, ranking, at);
  }

  // ── G1b: dữ liệu phái sinh đơn ───────────────────────────────────

  async getOrderItems(orderId: number): Promise<OrderItemRow[]> {
    return db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.id));
  }

  async getOrderItemsForOrders(orderIds: number[]): Promise<OrderItemRow[]> {
    if (orderIds.length === 0) return [];
    return db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))
      .orderBy(asc(orderItems.id));
  }

  async getRoleAssignments(orderId: number): Promise<OrderRoleAssignment[]> {
    return db
      .select()
      .from(orderRoleAssignments)
      .where(eq(orderRoleAssignments.orderId, orderId))
      .orderBy(asc(orderRoleAssignments.id));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItemRow> {
    const rows = await db
      .insert(orderItems)
      .values({
        orderId: item.orderId,
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice,
        cost: item.cost ?? 0,
        status: item.status ?? "completed",
        skippedReason: item.skippedReason ?? null,
        performedByUserId: item.performedByUserId ?? null,
        recallDueDate: item.recallDueDate ?? null,
        recallStatus: item.recallStatus ?? "pending",
        refundedAmount: item.refundedAmount ?? 0,
      })
      .returning();
    return rows[0];
  }

  /**
   * Ngày tái khám gần nhất = MIN(order_items.recall_due_date) trên mọi đơn cùng
   * số điện thoại của khách. Chịu được khách không có đơn / đơn không có item → null.
   * So sánh theo chuỗi "YYYY-MM-DD" (đúng thứ tự ngày, không lệ thuộc giờ/múi giờ).
   */
  async getNextRecallDueForCustomer(customerId: number): Promise<string | null> {
    const cust = await this.getCustomer(customerId);
    if (!cust) return null;

    const custOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.phone, cust.phone));
    if (custOrders.length === 0) return null;

    // Chỉ tính lượt CÒN CHỜ GỌI (pending). Lượt đã scheduled/refused coi như xử lý
    // xong → bỏ qua. Khi không còn lượt pending nào, trả null (badge cần gọi tắt).
    const items = await db
      .select({ recallDueDate: orderItems.recallDueDate })
      .from(orderItems)
      .where(
        and(
          inArray(orderItems.orderId, custOrders.map((o) => o.id)),
          eq(orderItems.recallStatus, "pending"),
        ),
      );

    const dates = items
      .map((i) => normalizeRecallDate(i.recallDueDate))
      .filter((d): d is string => d !== null)
      .sort(); // chuỗi "YYYY-MM-DD" → sort tăng dần = theo ngày
    return dates[0] ?? null;
  }

  async getRecallStateByCustomer(): Promise<Map<number, "pending" | "done">> {
    // 1 truy vấn: mọi item có recallDueDate + trạng thái, ghép sang customerId qua phone.
    const rows = await db
      .select({ customerId: customers.id, recallStatus: orderItems.recallStatus })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(customers, eq(orders.phone, customers.phone))
      .where(isNotNull(orderItems.recallDueDate));
    const map = new Map<number, "pending" | "done">();
    for (const r of rows) {
      // pending thắng: khách còn bất kỳ lượt nào chờ gọi thì coi là "cần gọi".
      if (r.recallStatus === "pending") map.set(r.customerId, "pending");
      else if (!map.has(r.customerId)) map.set(r.customerId, "done");
    }
    return map;
  }

  async getRecallItemsWithLogFlag(): Promise<RecallItemStat[]> {
    // Mọi lượt tái khám (order_item có recallDueDate) + cờ đã có log (1 lượt distinct).
    const items = await db
      .select({ orderItemId: orderItems.id, recallDueDate: orderItems.recallDueDate, recallStatus: orderItems.recallStatus })
      .from(orderItems)
      .where(isNotNull(orderItems.recallDueDate));
    const logged = await db.selectDistinct({ orderItemId: recallLogs.orderItemId }).from(recallLogs);
    const loggedSet = new Set(logged.map((l) => l.orderItemId));
    return items.map((it) => ({
      orderItemId: it.orderItemId,
      recallDueDate: normalizeRecallDate(it.recallDueDate),
      recallStatus: it.recallStatus,
      hasLog: loggedSet.has(it.orderItemId),
    }));
  }

  async getRecallWorklist(viewerUserId: number, viewerRole: string): Promise<RecallWorklistRow[]> {
    // Ghép item -> đơn (lấy phone) -> khách (tên + người chăm). Chỉ lượt pending có y lệnh.
    const base = await db
      .select({
        orderItemId: orderItems.id,
        serviceName: orderItems.serviceName,
        recallDueDate: orderItems.recallDueDate,
        customerId: customers.id,
        customerName: customers.name,
        phone: customers.phone,
        assigneeUserId: customers.primaryAssignedUserId,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(customers, eq(orders.phone, customers.phone))
      .where(and(eq(orderItems.recallStatus, "pending"), isNotNull(orderItems.recallDueDate)));

    // Lọc quyền: nhân viên (sale/doctor) chỉ thấy khách mình chăm; tc/kt/ktt/ceo thấy tất cả.
    const permRows =
      viewerRole === "sale" || viewerRole === "doctor"
        ? base.filter((r) => r.assigneeUserId === viewerUserId)
        : base;
    // Dedupe theo orderItemId — phòng 2 khách trùng số điện thoại khiến join nhân đôi dòng.
    const seenItem = new Set<number>();
    const rows = permRows.filter((r) =>
      seenItem.has(r.orderItemId) ? false : (seenItem.add(r.orderItemId), true),
    );
    if (rows.length === 0) return [];

    // Tên người chăm (1 truy vấn duy nhất, gộp mọi userId) và lần gọi gần nhất theo từng
    // item (1 truy vấn khác) không phụ thuộc nhau — chạy song song thay vì tuần tự.
    const assigneeIds = Array.from(
      new Set(rows.map((r) => r.assigneeUserId).filter((x): x is number => x != null)),
    );
    const itemIds = rows.map((r) => r.orderItemId);
    const [assignees, logs] = await Promise.all([
      assigneeIds.length > 0
        ? db.select().from(users).where(inArray(users.id, assigneeIds))
        : Promise.resolve([]),
      // sort desc → bản ghi đầu mỗi item là mới nhất.
      db
        .select()
        .from(recallLogs)
        .where(inArray(recallLogs.orderItemId, itemIds))
        .orderBy(desc(recallLogs.createdAt), desc(recallLogs.id)),
    ]);
    const nameByUser = new Map<number, string>();
    for (const u of assignees) nameByUser.set(u.id, u.name);
    const lastByItem = new Map<number, { outcome: string; at: string }>();
    for (const l of logs) {
      if (!lastByItem.has(l.orderItemId)) {
        const at = l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt);
        lastByItem.set(l.orderItemId, { outcome: l.outcome, at });
      }
    }

    return rows
      .map((r) => ({
        orderItemId: r.orderItemId,
        customerId: r.customerId,
        customerName: r.customerName,
        phone: r.phone,
        serviceName: r.serviceName,
        recallDueDate: normalizeRecallDate(r.recallDueDate) as string, // không null (đã lọc)
        assigneeUserId: r.assigneeUserId ?? null,
        assigneeName: r.assigneeUserId != null ? nameByUser.get(r.assigneeUserId) ?? null : null,
        lastCall: lastByItem.get(r.orderItemId) ?? null,
      }))
      // Quá hạn nhiều nhất (ngày sớm nhất) lên đầu.
      .sort((a, b) => a.recallDueDate.localeCompare(b.recallDueDate));
  }

  async logRecallCall(input: {
    orderItemId: number;
    actorUserId: number;
    outcome: RecallCallOutcome;
    note?: string | null;
  }): Promise<RecallLog> {
    // Tìm item → đơn → khách để lấy customerId cho dòng log (item phải tồn tại).
    const itemRows = await db
      .select({ id: orderItems.id, orderId: orderItems.orderId })
      .from(orderItems)
      .where(eq(orderItems.id, input.orderItemId))
      .limit(1);
    const item = itemRows[0];
    if (!item) throw new Error(`order item ${input.orderItemId} not found`);

    const ordRows = await db
      .select({ phone: orders.phone })
      .from(orders)
      .where(eq(orders.id, item.orderId))
      .limit(1);
    const custRows = ordRows[0]
      ? await db
          .select({ id: customers.id })
          .from(customers)
          .where(eq(customers.phone, ordRows[0].phone))
          .limit(1)
      : [];
    // Không chèn customerId rác: nếu không suy ra được khách thì báo lỗi (route trả 404).
    if (!custRows[0]) {
      throw new Error(`không tìm thấy khách cho order item ${input.orderItemId}`);
    }
    const customerId = custRows[0].id;

    // scheduled → 'scheduled'; refused → 'refused'; no_answer/other → giữ 'pending' (mai gọi lại).
    const nextStatus =
      input.outcome === "scheduled" ? "scheduled" : input.outcome === "refused" ? "refused" : "pending";

    return db.transaction(async (tx) => {
      await tx
        .update(orderItems)
        .set({ recallStatus: nextStatus })
        .where(eq(orderItems.id, input.orderItemId));
      const rows = await tx
        .insert(recallLogs)
        .values({
          orderItemId: input.orderItemId,
          customerId,
          actorUserId: input.actorUserId,
          outcome: input.outcome,
          note: input.note ?? null,
        })
        .returning();
      return rows[0];
    });
  }

  async getRecallItemsForCustomer(customerId: number): Promise<RecallItemForCustomer[]> {
    const cust = await this.getCustomer(customerId);
    if (!cust) return [];
    // Item -> đơn (lấy phone). Lấy MỌI trạng thái (pending/scheduled/refused), miễn có ngày hẹn.
    const base = await db
      .select({
        orderItemId: orderItems.id,
        serviceName: orderItems.serviceName,
        recallDueDate: orderItems.recallDueDate,
        recallStatus: orderItems.recallStatus,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(eq(orders.phone, cust.phone), isNotNull(orderItems.recallDueDate)));
    // Dedupe theo orderItemId (an toàn, dù mỗi item chỉ thuộc 1 đơn).
    const seenItem = new Set<number>();
    const rows = base.filter((r) =>
      seenItem.has(r.orderItemId) ? false : (seenItem.add(r.orderItemId), true),
    );
    if (rows.length === 0) return [];

    // Lần gọi gần nhất theo từng item (1 truy vấn, sort desc → bản ghi đầu mỗi item là mới nhất).
    const itemIds = rows.map((r) => r.orderItemId);
    const logs = await db
      .select()
      .from(recallLogs)
      .where(inArray(recallLogs.orderItemId, itemIds))
      .orderBy(desc(recallLogs.createdAt), desc(recallLogs.id));
    const lastByItem = new Map<number, { outcome: string; at: string }>();
    for (const l of logs) {
      if (!lastByItem.has(l.orderItemId)) {
        const at = l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt);
        lastByItem.set(l.orderItemId, { outcome: l.outcome, at });
      }
    }

    return rows
      .map((r) => ({
        orderItemId: r.orderItemId,
        serviceName: r.serviceName,
        recallDueDate: normalizeRecallDate(r.recallDueDate) as string, // không null (đã lọc)
        recallStatus: r.recallStatus,
        lastCall: lastByItem.get(r.orderItemId) ?? null,
      }))
      // Ngày hẹn sớm nhất lên đầu.
      .sort((a, b) => a.recallDueDate.localeCompare(b.recallDueDate));
  }

  async getRecallLogsForCustomer(customerId: number): Promise<RecallLogForCustomer[]> {
    const rows = await db
      .select()
      .from(recallLogs)
      .where(eq(recallLogs.customerId, customerId))
      .orderBy(desc(recallLogs.createdAt), desc(recallLogs.id));
    if (rows.length === 0) return [];

    // Tên người gọi (gộp 1 lượt lookup mỗi userId).
    const actorIds = Array.from(new Set(rows.map((r) => r.actorUserId)));
    const nameByUser = new Map<number, string>();
    for (const uid of actorIds) {
      const u = await this.getUser(uid);
      if (u) nameByUser.set(uid, u.name);
    }

    return rows.map((r) => ({
      id: r.id,
      orderItemId: r.orderItemId,
      customerId: r.customerId,
      actorUserId: r.actorUserId,
      actorName: nameByUser.get(r.actorUserId) ?? "?",
      outcome: r.outcome,
      note: r.note ?? null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  }

  async getRecallItemOwner(
    orderItemId: number,
  ): Promise<{ customerId: number; assigneeUserId: number | null } | null> {
    // item → đơn (lấy phone) → khách (id + người chăm). Cùng cách suy khách như logRecallCall.
    const itemRows = await db
      .select({ orderId: orderItems.orderId })
      .from(orderItems)
      .where(eq(orderItems.id, orderItemId))
      .limit(1);
    if (!itemRows[0]) return null;
    const ordRows = await db
      .select({ phone: orders.phone })
      .from(orders)
      .where(eq(orders.id, itemRows[0].orderId))
      .limit(1);
    if (!ordRows[0]) return null;
    const custRows = await db
      .select({ id: customers.id, assignee: customers.primaryAssignedUserId })
      .from(customers)
      .where(eq(customers.phone, ordRows[0].phone))
      .limit(1);
    if (!custRows[0]) return null;
    return { customerId: custRows[0].id, assigneeUserId: custRows[0].assignee ?? null };
  }

  async setCustomerPrimaryAssignee(customerId: number, userId: number): Promise<void> {
    await db
      .update(customers)
      .set({ primaryAssignedUserId: userId })
      .where(eq(customers.id, customerId));
  }

  // ── G2: commission_records thật ──────────────────────────────────

  async getCommissionRecordsByUser(userId: number, cycleId: string): Promise<CommissionRecordWithRole[]> {
    // leftJoin order_role_assignments để trả kèm vai (record do engine sinh luôn có
    // roleAssignmentId; left join để record cũ/null vẫn ra, role = null).
    return db
      .select({ ...getTableColumns(commissionRecords), role: orderRoleAssignments.role })
      .from(commissionRecords)
      .leftJoin(orderRoleAssignments, eq(commissionRecords.roleAssignmentId, orderRoleAssignments.id))
      .where(and(eq(commissionRecords.userId, userId), eq(commissionRecords.cycleId, cycleId)))
      .orderBy(asc(commissionRecords.orderId), asc(commissionRecords.id));
  }

  async getCommissionRecordsByOrder(orderId: number): Promise<CommissionRecordRow[]> {
    return db
      .select()
      .from(commissionRecords)
      .where(eq(commissionRecords.orderId, orderId))
      .orderBy(asc(commissionRecords.id));
  }

  async getAllCommissionRecordsByCycle(cycleId: string): Promise<CommissionRecordRow[]> {
    return db
      .select()
      .from(commissionRecords)
      .where(eq(commissionRecords.cycleId, cycleId))
      .orderBy(asc(commissionRecords.id));
  }

  // ── G2b: thao tác hoa hồng trên DB thật (màn duyệt KT) ───────────────
  // Đọc 1 CR kèm vai (join) ở dạng view. Dùng sau khi transaction đã commit.
  private async getCrView(crId: number): Promise<CommissionRecord | null> {
    const rows = await db
      .select({ ...getTableColumns(commissionRecords), role: orderRoleAssignments.role })
      .from(commissionRecords)
      .leftJoin(orderRoleAssignments, eq(commissionRecords.roleAssignmentId, orderRoleAssignments.id))
      .where(eq(commissionRecords.id, crId))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    const { role, ...row } = r;
    return mapCrRowToView(row as CommissionRecordRow, role);
  }

  async listCrsForCycleGrouped(cycleId: string): Promise<Map<number, CommissionRecord[]>> {
    const rows = await db
      .select({ ...getTableColumns(commissionRecords), role: orderRoleAssignments.role })
      .from(commissionRecords)
      .leftJoin(orderRoleAssignments, eq(commissionRecords.roleAssignmentId, orderRoleAssignments.id))
      // Màn duyệt chỉ hiện CR còn trong luồng duyệt; truy thu (CLAWBACK_PENDING) + CANCEL
      // không phải lượt duyệt nên loại khỏi orderGroups.
      .where(
        and(
          eq(commissionRecords.cycleId, cycleId),
          notInArray(commissionRecords.status, ["CLAWBACK_PENDING", "CANCEL"]),
        ),
      )
      .orderBy(asc(commissionRecords.orderId), asc(commissionRecords.id));
    const grouped = new Map<number, CommissionRecord[]>();
    for (const r of rows) {
      const { role, ...row } = r;
      const view = mapCrRowToView(row as CommissionRecordRow, role);
      const arr = grouped.get(view.orderId) ?? [];
      arr.push(view);
      grouped.set(view.orderId, arr);
    }
    return grouped;
  }

  async countCrs(cycleId: string, status: string): Promise<{ count: number; totalAmount: number }> {
    const rows = await db
      .select({ amount: commissionRecords.amount })
      .from(commissionRecords)
      .where(and(eq(commissionRecords.cycleId, cycleId), eq(commissionRecords.status, status)));
    return { count: rows.length, totalAmount: rows.reduce((s, r) => s + r.amount, 0) };
  }

  // Mọi lệnh duyệt, từ chối đều kèm điều kiện "còn Chờ duyệt" ngay trong câu UPDATE:
  // đơn vừa bị hủy chuyển khoản sang CANCEL giữa lúc Kế toán bấm thì lệnh duyệt không
  // được ghi đè CANCEL thành Đã duyệt.
  async approveCommissionRecord(crId: number): Promise<CommissionRecord | null> {
    const rows = await db
      .update(commissionRecords)
      .set({ status: "DUOC_DUYET" })
      .where(and(eq(commissionRecords.id, crId), eq(commissionRecords.status, "CHO_DUYET")))
      .returning({ id: commissionRecords.id });
    return rows.length > 0 ? this.getCrView(crId) : null;
  }

  async rejectCommissionRecord(crId: number, reason: string): Promise<CommissionRecord | null> {
    const rows = await db
      .update(commissionRecords)
      .set({ status: "TU_CHOI", rejectedAt: new Date(), rejectedReason: reason })
      .where(and(eq(commissionRecords.id, crId), eq(commissionRecords.status, "CHO_DUYET")))
      .returning({ id: commissionRecords.id });
    return rows.length > 0 ? this.getCrView(crId) : null;
  }

  async bulkApproveCrsByOrder(orderId: number): Promise<{ approved: number; total: number }> {
    return db.transaction(async (tx) => {
      const list = await tx
        .select({ id: commissionRecords.id, status: commissionRecords.status })
        .from(commissionRecords)
        .where(eq(commissionRecords.orderId, orderId));
      const pendingIds = list.filter((c) => c.status === "CHO_DUYET").map((c) => c.id);
      if (pendingIds.length === 0) return { approved: 0, total: list.length };
      const duyet = await tx
        .update(commissionRecords)
        .set({ status: "DUOC_DUYET" })
        .where(and(inArray(commissionRecords.id, pendingIds), eq(commissionRecords.status, "CHO_DUYET")))
        .returning({ id: commissionRecords.id });
      return { approved: duyet.length, total: list.length };
    });
  }

  async bulkApproveCrsByCycle(cycleId: string): Promise<{ approved: number; totalAmount: number; affectedOrders: number }> {
    return db.transaction(async (tx) => {
      const list = await tx
        .select({ id: commissionRecords.id, orderId: commissionRecords.orderId, amount: commissionRecords.amount })
        .from(commissionRecords)
        .where(and(eq(commissionRecords.cycleId, cycleId), eq(commissionRecords.status, "CHO_DUYET")));
      if (list.length === 0) return { approved: 0, totalAmount: 0, affectedOrders: 0 };
      const duyet = new Set(
        (
          await tx
            .update(commissionRecords)
            .set({ status: "DUOC_DUYET" })
            .where(
              and(
                inArray(commissionRecords.id, list.map((c) => c.id)),
                eq(commissionRecords.status, "CHO_DUYET"),
              ),
            )
            .returning({ id: commissionRecords.id })
        ).map((r) => r.id),
      );
      const daDuyet = list.filter((c) => duyet.has(c.id));
      return {
        approved: daDuyet.length,
        totalAmount: daDuyet.reduce((s, c) => s + c.amount, 0),
        affectedOrders: new Set(daDuyet.map((c) => c.orderId)).size,
      };
    });
  }

  async fileCommissionComplaint(crId: number, userId: number, content: string): Promise<FileComplaintResult> {
    return db.transaction(async (tx) => {
      const cr = (await tx.select().from(commissionRecords).where(eq(commissionRecords.id, crId)).limit(1))[0];
      if (!cr) return { ok: false, error: "not_found" };
      if (cr.userId !== userId) return { ok: false, error: "ownership" };
      if (cr.status !== "TU_CHOI") return { ok: false, error: "invalid_state" };
      const rejectedAtMs = cr.rejectedAt ? cr.rejectedAt.getTime() : null;
      if (!canKhieuNai({ status: cr.status, rejectedAt: rejectedAtMs })) {
        return { ok: false, error: "window_expired" };
      }
      // Mỗi khoản chỉ khiếu nại MỘT lần, đúng như câu đang hứa với người dùng.
      // Trước đây chỉ dựa vào việc trạng thái chuyển sang KHIEU_NAI để chặn trùng,
      // nhưng kế toán chọn giữ nguyên quyết định thì bản ghi về lại TU_CHOI mà
      // rejectedAt không đổi, nên còn trong 72 giờ là khiếu nại tiếp được.
      const daCo = (
        await tx
          .select({ id: commissionComplaints.id })
          .from(commissionComplaints)
          .where(eq(commissionComplaints.crId, crId))
          .limit(1)
      )[0];
      if (daCo) return { ok: false, error: "invalid_state" };
      await tx.update(commissionRecords).set({ status: "KHIEU_NAI" }).where(eq(commissionRecords.id, crId));
      const inserted = (await tx.insert(commissionComplaints).values({ crId, userId, content }).returning())[0];
      return { ok: true, entry: mapComplaintRowToView(inserted) };
    });
  }

  async getCommissionComplaints(crId: number): Promise<ComplaintEntry[]> {
    const rows = await db
      .select()
      .from(commissionComplaints)
      .where(eq(commissionComplaints.crId, crId))
      .orderBy(asc(commissionComplaints.id));
    return rows.map(mapComplaintRowToView);
  }

  async resolveCommissionComplaint(
    crId: number,
    resolution: "revert" | "keep",
    note: string | null,
  ): Promise<CommissionRecord | null> {
    const ok = await db.transaction(async (tx) => {
      const cr = (await tx.select().from(commissionRecords).where(eq(commissionRecords.id, crId)).limit(1))[0];
      if (!cr || cr.status !== "KHIEU_NAI") return false;
      if (resolution === "revert") {
        await tx
          .update(commissionRecords)
          .set({ status: "DUOC_DUYET", rejectedAt: null, rejectedReason: null })
          .where(eq(commissionRecords.id, crId));
      } else {
        const newReason = note ? `${cr.rejectedReason ?? ""} | Khiếu nại bị giữ: ${note}` : cr.rejectedReason;
        await tx
          .update(commissionRecords)
          .set({ status: "TU_CHOI", rejectedReason: newReason })
          .where(eq(commissionRecords.id, crId));
      }
      return true;
    });
    return ok ? this.getCrView(crId) : null;
  }

  async listPendingCommissionComplaints(
    cycleId: string,
  ): Promise<Array<{ cr: CommissionRecord; complaints: ComplaintEntry[] }>> {
    const rows = await db
      .select({ ...getTableColumns(commissionRecords), role: orderRoleAssignments.role })
      .from(commissionRecords)
      .leftJoin(orderRoleAssignments, eq(commissionRecords.roleAssignmentId, orderRoleAssignments.id))
      .where(and(eq(commissionRecords.cycleId, cycleId), eq(commissionRecords.status, "KHIEU_NAI")))
      .orderBy(asc(commissionRecords.id));
    const result: Array<{ cr: CommissionRecord; complaints: ComplaintEntry[] }> = [];
    for (const r of rows) {
      const { role, ...row } = r;
      const cr = mapCrRowToView(row as CommissionRecordRow, role);
      const complaints = await this.getCommissionComplaints(row.id);
      result.push({ cr, complaints });
    }
    return result;
  }

  async createCommissionRecord(input: InsertCommissionRecord): Promise<CommissionRecordRow> {
    const rows = await db
      .insert(commissionRecords)
      .values({
        orderId: input.orderId,
        roleAssignmentId: input.roleAssignmentId ?? null,
        userId: input.userId,
        cycleId: input.cycleId,
        baseNetProfit: input.baseNetProfit ?? 0,
        pctBp: input.pctBp ?? 0,
        amount: input.amount ?? 0,
        status: input.status,
        parentCrId: input.parentCrId ?? null,
        rejectedAt: input.rejectedAt ?? null,
        rejectedReason: input.rejectedReason ?? null,
      })
      .returning();
    return rows[0];
  }

  // ── G2c: thưởng/phạt (adjustments) + truy thu (clawback) trên DB thật ─────
  async createAdjustment(input: InsertAdjustment): Promise<Adjustment> {
    const rows = await db
      .insert(adjustments)
      .values({
        userId: input.userId,
        cycleId: input.cycleId,
        type: input.type,
        amount: input.amount,
        reason: input.reason,
        source: input.source ?? "manual",
        status: input.status,
        createdByUserId: input.createdByUserId ?? null,
        approvedByUserId: input.approvedByUserId ?? null,
        approvedAt: input.approvedAt ?? null,
        parentAdjustmentId: input.parentAdjustmentId ?? null,
      })
      .returning();
    return mapAdjustmentRowToView(rows[0]);
  }

  async listAdjustmentsForUser(userId: number, cycleId: string): Promise<Adjustment[]> {
    const rows = await db
      .select()
      .from(adjustments)
      .where(
        and(
          eq(adjustments.userId, userId),
          eq(adjustments.cycleId, cycleId),
          eq(adjustments.status, "APPROVED"),
        ),
      )
      .orderBy(asc(adjustments.id));
    return rows.map(mapAdjustmentRowToView);
  }

  async listAllAdjustmentsForCycle(cycleId: string): Promise<Adjustment[]> {
    const rows = await db
      .select()
      .from(adjustments)
      .where(eq(adjustments.cycleId, cycleId))
      .orderBy(asc(adjustments.id));
    return rows.map(mapAdjustmentRowToView);
  }

  async cancelAdjustment(id: number): Promise<Adjustment | null> {
    const ok = await db.transaction(async (tx) => {
      const adj = (await tx.select().from(adjustments).where(eq(adjustments.id, id)).limit(1))[0];
      if (!adj || (adj.status !== "PENDING" && adj.status !== "AUTO_PENDING")) return false;
      await tx.update(adjustments).set({ status: "REJECTED" }).where(eq(adjustments.id, id));
      return true;
    });
    if (!ok) return null;
    const row = (await db.select().from(adjustments).where(eq(adjustments.id, id)).limit(1))[0];
    return row ? mapAdjustmentRowToView(row) : null;
  }

  async listClawbacksForUser(userId: number, cycleId: string): Promise<Clawback[]> {
    // Truy thu suy từ commission_records CLAWBACK_PENDING của user trong kỳ chi trả.
    const rows = await db
      .select()
      .from(commissionRecords)
      .where(
        and(
          eq(commissionRecords.userId, userId),
          eq(commissionRecords.cycleId, cycleId),
          eq(commissionRecords.status, "CLAWBACK_PENDING"),
        ),
      )
      .orderBy(asc(commissionRecords.id));
    if (rows.length === 0) return [];
    const orderIds = Array.from(new Set(rows.map((r) => r.orderId)));
    const ords = await db
      .select({ id: orders.id, code: orders.code })
      .from(orders)
      .where(inArray(orders.id, orderIds));
    const codeById = new Map(ords.map((o) => [o.id, o.code]));
    return rows.map((r) => ({
      id: String(r.id),
      userId: r.userId,
      cycleId: r.cycleId,
      sourceOrderCode: codeById.get(r.orderId) ?? "",
      sourceCycleId: r.cycleId,
      amount: -Math.abs(r.amount),
      reason: r.rejectedReason ?? "Truy thu hoa hồng đơn hoàn tiền",
      createdAt: r.createdAt.getTime(),
    }));
  }

  async getCustomerEvents(customerId: number): Promise<CustomerEventRow[]> {
    return db
      .select()
      .from(customerEvents)
      .where(eq(customerEvents.customerId, customerId))
      .orderBy(desc(customerEvents.createdAt), desc(customerEvents.id));
  }

  /** Nhật ký của riêng một đơn, cho mục Lịch sử đơn ở màn chi tiết. */
  async getOrderEvents(orderId: number): Promise<CustomerEventRow[]> {
    return db
      .select()
      .from(customerEvents)
      .where(eq(customerEvents.orderId, orderId))
      .orderBy(desc(customerEvents.createdAt), desc(customerEvents.id));
  }

  // ───────────────────────── Vouchers ─────────────────────────

  async listVouchers(): Promise<VoucherRow[]> {
    return db.select().from(vouchers).orderBy(desc(vouchers.active), asc(vouchers.id));
  }

  async getActiveVouchers(): Promise<VoucherRow[]> {
    return db.select().from(vouchers).where(eq(vouchers.active, true)).orderBy(asc(vouchers.id));
  }

  async getVoucher(id: number): Promise<VoucherRow | undefined> {
    const rows = await db.select().from(vouchers).where(eq(vouchers.id, id)).limit(1);
    return rows[0];
  }

  async getVoucherByCode(code: string): Promise<VoucherRow | undefined> {
    const rows = await db.select().from(vouchers).where(eq(vouchers.code, code)).limit(1);
    return rows[0];
  }

  async createVoucher(data: InsertVoucher): Promise<VoucherRow> {
    const rows = await db.insert(vouchers).values(data).returning();
    return rows[0];
  }

  async updateVoucher(id: number, data: Partial<InsertVoucher>): Promise<VoucherRow | undefined> {
    const rows = await db.update(vouchers).set(data).where(eq(vouchers.id, id)).returning();
    return rows[0];
  }

  async deleteVoucher(id: number): Promise<boolean> {
    const rows = await db.delete(vouchers).where(eq(vouchers.id, id)).returning();
    return rows.length > 0;
  }

  async incrementVoucherUse(code: string): Promise<void> {
    await db
      .update(vouchers)
      .set({ usedCount: sql`${vouchers.usedCount} + 1` })
      .where(eq(vouchers.code, code));
  }

  // ───────────────────────── Admin settings ─────────────────────────

  private mapAutoRule(row: typeof autoRules.$inferSelect): AutoRule {
    return {
      key: row.key as AutoRuleKey,
      active: row.active,
      targetPct: row.targetPct,
      bonusPct: row.bonusPct,
      updatedAt: row.updatedAt.getTime(), // timestamptz → ms epoch (giữ shape JSON cũ)
      updatedByUserId: row.updatedByUserId ?? null,
    };
  }

  async listAutoRules(): Promise<AutoRule[]> {
    const rows = await db.select().from(autoRules).orderBy(asc(autoRules.id));
    return rows.map((r) => this.mapAutoRule(r));
  }

  async getAutoRule(key: AutoRuleKey): Promise<AutoRule | null> {
    const rows = await db.select().from(autoRules).where(eq(autoRules.key, key)).limit(1);
    return rows[0] ? this.mapAutoRule(rows[0]) : null;
  }

  async updateAutoRule(
    key: AutoRuleKey,
    patch: UpdateAutoRuleInput,
    actorUserId: number,
  ): Promise<AutoRule | null> {
    const rows = await db
      .update(autoRules)
      .set({
        active: patch.active,
        targetPct: patch.targetPct,
        bonusPct: patch.bonusPct,
        updatedAt: new Date(),
        updatedByUserId: actorUserId,
      })
      .where(eq(autoRules.key, key))
      .returning();
    return rows[0] ? this.mapAutoRule(rows[0]) : null; // null nếu key chưa có → route trả 404
  }

  // ───────────────────────── Cấu hình hệ thống ─────────────────────────

  /** Dòng DB → bộ giá trị đủ khóa. Khóa thiếu hoặc giá trị hỏng rơi về mặc định. */
  private settingsFromRows(rows: { key: string; value: unknown }[]): SystemSettings {
    const out: SystemSettings = { ...SYSTEM_SETTING_DEFAULTS };
    for (const r of rows) {
      if (!isSystemSettingKey(r.key)) continue;
      const v = normalizeSettingValue(r.key, r.value);
      if (v !== null) out[r.key] = v;
    }
    return out;
  }

  async getSystemSettings(): Promise<SystemSettings> {
    const rows = await db.select({ key: systemSettings.key, value: systemSettings.value }).from(systemSettings);
    return this.settingsFromRows(rows);
  }

  async getSystemSettingsView(): Promise<SystemSettingsView> {
    const rows = await db
      .select({
        key: systemSettings.key,
        value: systemSettings.value,
        updatedAt: systemSettings.updatedAt,
        updatedByUserId: systemSettings.updatedByUserId,
        updatedByName: users.name,
      })
      .from(systemSettings)
      .leftJoin(users, eq(users.id, systemSettings.updatedByUserId));
    const meta = Object.fromEntries(
      SYSTEM_SETTING_KEYS.map((k) => [k, { updatedAt: null, updatedByUserId: null, updatedByName: null }]),
    ) as SystemSettingsView["meta"];
    for (const r of rows) {
      if (!isSystemSettingKey(r.key)) continue;
      meta[r.key] = {
        updatedAt: r.updatedAt.toISOString(),
        updatedByUserId: r.updatedByUserId ?? null,
        updatedByName: r.updatedByName ?? null,
      };
    }
    return { values: this.settingsFromRows(rows), meta };
  }

  async updateSystemSettings(patch: Partial<SystemSettings>, actorUserId: number): Promise<SystemSettingsView> {
    const keys = SYSTEM_SETTING_KEYS.filter((k) => patch[k] !== undefined);
    if (keys.length > 0) {
      await db.transaction(async (tx) => {
        // Khóa các dòng sắp sửa: hai người bấm Lưu cùng lúc thì người sau đọc được
        // giá trị người trước vừa ghi, lịch sử không có hai dòng chung một giá trị cũ.
        const current = await tx
          .select({ key: systemSettings.key, value: systemSettings.value })
          .from(systemSettings)
          .where(inArray(systemSettings.key, keys))
          .for("update");
        const truoc = this.settingsFromRows(current);
        const now = new Date();
        for (const k of keys) {
          const moi = patch[k]!;
          if (moi === truoc[k]) continue; // lưu lại y giá trị cũ thì không thành một lần đổi
          await tx
            .insert(systemSettings)
            .values({ key: k, value: moi, updatedAt: now, updatedByUserId: actorUserId })
            .onConflictDoUpdate({
              target: systemSettings.key,
              set: { value: moi, updatedAt: now, updatedByUserId: actorUserId },
            });
          await tx.insert(systemSettingsHistory).values({
            key: k,
            oldValue: truoc[k],
            newValue: moi,
            changedAt: now,
            changedByUserId: actorUserId,
          });
        }
      });
    }
    return this.getSystemSettingsView();
  }

  async listSystemSettingsHistory(key: SystemSettingKey | null, limit: number): Promise<SystemSettingHistoryEntry[]> {
    const rows = await db
      .select({ h: systemSettingsHistory, changedByName: users.name })
      .from(systemSettingsHistory)
      .leftJoin(users, eq(users.id, systemSettingsHistory.changedByUserId))
      .where(key ? eq(systemSettingsHistory.key, key) : undefined)
      .orderBy(desc(systemSettingsHistory.changedAt), desc(systemSettingsHistory.id))
      .limit(limit);
    // Giá trị cũ in đúng như đã lưu, kể cả khi khoảng cho phép về sau đổi khác.
    const so = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const out: SystemSettingHistoryEntry[] = [];
    for (const { h, changedByName } of rows) {
      if (!isSystemSettingKey(h.key)) continue;
      out.push({
        id: h.id,
        key: h.key,
        oldValue: so(h.oldValue),
        newValue: so(h.newValue),
        changedAt: h.changedAt.toISOString(),
        changedByUserId: h.changedByUserId ?? null,
        changedByName: changedByName ?? null,
      });
    }
    return out;
  }
}
