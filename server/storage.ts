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
  type CommissionRecordRow, type InsertCommissionRecord,
  type AdjustmentRow, type InsertAdjustment,
  type CustomerEventRow,
  type VoucherRow, type InsertVoucher,
  type RecallLog,
} from "@shared/schema";
import {
  type AppointmentStatusCode,
  type VisitStatusCode,
  APPOINTMENT_TRANSITIONS,
  VISIT_TRANSITIONS,
} from "@shared/status";
import type { CommissionRecord, ComplaintEntry, Adjustment, Clawback } from "./commission-types";
import type { AutoRuleKey, UpdateAutoRuleInput, UpdatePayCycleInput } from "@shared/types";

/** Bản ghi hoa hồng kèm vai (join order_role_assignments) cho màn Income. */
export type CommissionRecordWithRole = CommissionRecordRow & { role: string | null };

/** Auto Rule thưởng theo target — shape view trả cho màn Cài đặt (updatedAt = ms epoch). */
export type AutoRule = {
  key: AutoRuleKey;
  active: boolean;
  /** 100 = đạt 100% target HH tháng. */
  targetPct: number;
  /** % bonus tính trên revenue khi đạt target (số thực). */
  bonusPct: number;
  updatedAt: number;
  updatedByUserId: number | null;
};

/** Cài đặt Kì lương — singleton. editWindowDays + lockAfterDays CỨNG 30 (không lưu DB). */
export type PayCycleSettings = {
  deadlineDay: number;
  editWindowDays: 30;
  lockAfterDays: 30;
  capWarningPct: number;
  updatedAt: number;
  updatedByUserId: number | null;
};

/** Kết quả file khiếu nại: thành công kèm entry, hoặc lỗi theo loại. */
export type FileComplaintResult =
  | { ok: true; entry: ComplaintEntry }
  | { ok: false; error: "not_found" | "ownership" | "window_expired" | "invalid_state" };

/** Kết quả một lượt gọi tái khám (worklist + log). */
export type RecallCallOutcome = "scheduled" | "no_answer" | "refused" | "other";

/** 1 lượt tái khám (order_item có recallDueDate) + cờ đã có lần gọi nào chưa — cho thống kê. */
export type RecallItemStat = {
  orderItemId: number;
  recallDueDate: string | null; // "YYYY-MM-DD"
  recallStatus: string; // pending | scheduled | refused
  hasLog: boolean; // đã có ≥1 dòng recall_logs
};

/**
 * Một lượt tái khám cần gọi (1 dòng = 1 order_item pending có recallDueDate).
 * Ghép order_items → orders (phone) → customers (tên + người chăm gốc).
 */
export type RecallWorklistRow = {
  orderItemId: number;
  customerId: number;
  customerName: string;
  phone: string;
  serviceName: string;
  recallDueDate: string;                  // "YYYY-MM-DD"
  assigneeUserId: number | null;          // người chăm gốc
  assigneeName: string | null;
  lastCall: { outcome: string; at: string } | null; // lần gọi gần nhất (từ recall_logs)
};

/** 1 lượt tái khám của 1 khách (mọi trạng thái) — cho màn chi tiết khách. */
export type RecallItemForCustomer = {
  orderItemId: number;
  serviceName: string;
  recallDueDate: string; // "YYYY-MM-DD"
  recallStatus: string; // pending | scheduled | refused
  lastCall: { outcome: string; at: string } | null;
};

/** 1 dòng lịch sử gọi tái khám của khách (recall_logs), kèm tên người gọi. */
export type RecallLogForCustomer = {
  id: number;
  orderItemId: number;
  customerId: number;
  actorUserId: number;
  actorName: string;
  outcome: string;
  note: string | null;
  createdAt: string; // ISO
};

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<Pick<User, "name" | "avatar">>): Promise<User | undefined>;
  updateUserLock(id: number, lockedUntil: Date | null): Promise<User | undefined>;
  // Admin staff management — B5-2 Section 2.
  updateUserFields(
    id: number,
    data: Partial<
      Pick<
        User,
        "name" | "phone" | "role" | "ranking" | "ihosUserId" | "monthlyTargetHh" | "monthlyTargetOrders" | "status" | "offboardingDate"
      >
    >,
  ): Promise<User | undefined>;
  updateUserStatus(id: number, status: User["status"], offboardingDate: string | null): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  getAllServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;

  getAllCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerOrders(phone: string): Promise<Order[]>;
  searchCustomers(query: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  /** Cập nhật một phần hồ sơ khách (VIP, ghi chú bệnh nhân). Trả undefined nếu không có khách. */
  updateCustomer(
    id: number,
    patch: Partial<Pick<Customer, "isVip" | "medicalNote" | "medicalNoteBy" | "medicalNoteAt">>,
  ): Promise<Customer | undefined>;

  getAllOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByCode(code: string): Promise<Order | undefined>;
  getOrdersByUser(userId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderAppointmentStatus(id: number, status: AppointmentStatusCode, note?: string): Promise<Order | undefined>;
  updateOrderVisitStatus(id: number, status: VisitStatusCode, note?: string): Promise<Order | undefined>;
  updateOrderNotes(id: number, notes: string | null): Promise<Order | undefined>;

  getStatusLogs(orderId: number): Promise<StatusLog[]>;
  createStatusLog(log: InsertStatusLog): Promise<StatusLog>;

  getAllStaffMembers(): Promise<StaffMember[]>;
  createStaffMember(member: InsertStaffMember): Promise<StaffMember>;

  // Commission tier config (B4 R-1-2 + R-1-3) — see shared/schema.ts.
  listCommissionTiers(activeOnly?: boolean): Promise<CommissionTier[]>;
  upsertCommissionTier(input: {
    role: string;
    ranking: string | null;
    percentBp: number;
    createdByUserId: number | null;
  }): Promise<CommissionTier>;
  /** Lookup effective rate at a given timestamp (default: now). Returns percentBp or null. */
  getEffectiveCommissionRate(role: string, ranking: string | null, at?: Date): Promise<number | null>;

  // ── G1b: dữ liệu phái sinh đơn (order_items + order_role_assignments).
  // Đọc theo orderId cho engine (G2) + test. Chỉ DbStorage có thật; MemoryStorage trả [].
  getOrderItems(orderId: number): Promise<OrderItemRow[]>;
  /** Lấy order_items của NHIỀU đơn cùng lúc (cho báo cáo, tránh N truy vấn). */
  getOrderItemsForOrders(orderIds: number[]): Promise<OrderItemRow[]>;
  getRoleAssignments(orderId: number): Promise<OrderRoleAssignment[]>;
  /** Tạo 1 order_item (seed/cổng nhận đơn). MemoryStorage trả stub. */
  createOrderItem(item: InsertOrderItem): Promise<OrderItemRow>;

  /**
   * Ngày tái khám gần nhất của khách, tính từ ca khám thật:
   * MIN(order_items.recall_due_date) trên tất cả đơn cùng số điện thoại.
   * Trả "YYYY-MM-DD" hoặc null (không có y lệnh tái khám). MemoryStorage trả null.
   */
  getNextRecallDueForCustomer(customerId: number): Promise<string | null>;

  /**
   * Trạng thái tái khám gộp theo khách (1 truy vấn) cho badge danh sách + thông báo:
   * "pending" nếu khách còn ≥1 lượt order_item đang chờ gọi; "done" nếu có lượt tái
   * khám nhưng đã xử lý hết (scheduled/refused); khách không có lượt nào sẽ vắng mặt
   * trong Map. MemoryStorage trả Map rỗng.
   */
  getRecallStateByCustomer(): Promise<Map<number, "pending" | "done">>;
  /** Mọi lượt tái khám (order_item có recallDueDate) + cờ đã có log — cho thống kê lịch hẹn. */
  getRecallItemsWithLogFlag(): Promise<RecallItemStat[]>;

  // ── Recall worklist (danh sách tái khám cần gọi). MemoryStorage stub.
  /**
   * Các lượt cần gọi: order_item có recallDueDate != null và recallStatus = 'pending'.
   * Lọc quyền: sale/doctor chỉ thấy lượt của khách mình chăm (primaryAssignedUserId =
   * viewer); tc/kt/ceo thấy tất cả. Sắp xếp quá hạn nhiều nhất (recallDueDate sớm nhất) lên đầu.
   */
  getRecallWorklist(viewerUserId: number, viewerRole: string): Promise<RecallWorklistRow[]>;
  /**
   * Ghi 1 dòng recall_logs + đổi order_items.recallStatus theo outcome:
   * scheduled → 'scheduled', refused → 'refused', no_answer/other → giữ 'pending'.
   */
  logRecallCall(input: {
    orderItemId: number;
    actorUserId: number;
    outcome: RecallCallOutcome;
    note?: string | null;
  }): Promise<RecallLog>;
  /**
   * Mọi lượt tái khám (order_item có recallDueDate, mọi trạng thái) của 1 khách —
   * cho màn chi tiết khách. Ghép order_item theo phone như getRecallWorklist, kèm
   * lần gọi gần nhất; sắp theo ngày hẹn tăng dần.
   */
  getRecallItemsForCustomer(customerId: number): Promise<RecallItemForCustomer[]>;
  /** Lịch sử gọi tái khám (recall_logs) của 1 khách (mọi lượt), mới nhất trước. */
  getRecallLogsForCustomer(customerId: number): Promise<RecallLogForCustomer[]>;
  /**
   * Khách + người chăm gốc của 1 lượt tái khám (order_item) — để route kiểm quyền ghi
   * (NV chỉ được ghi cho khách mình chăm). null nếu không suy ra được khách.
   */
  getRecallItemOwner(
    orderItemId: number,
  ): Promise<{ customerId: number; assigneeUserId: number | null } | null>;
  /** Gán người chăm gốc cho khách (set khi tạo đơn / seed). MemoryStorage no-op. */
  setCustomerPrimaryAssignee(customerId: number, userId: number): Promise<void>;

  // ── G2: đọc commission_records thật cho màn Income. MemoryStorage trả [].
  getCommissionRecordsByUser(userId: number, cycleId: string): Promise<CommissionRecordWithRole[]>;
  getCommissionRecordsByOrder(orderId: number): Promise<CommissionRecordRow[]>;
  /** Tổng hoa hồng toàn phòng khám theo kỳ (Dashboard admin). */
  getAllCommissionRecordsByCycle(cycleId: string): Promise<CommissionRecordRow[]>;

  // ── Thao tác hoa hồng trên DB thật (màn duyệt KT). Đổi trạng thái trong transaction,
  //    theo state machine B4. MemoryStorage trả rỗng/null. CR id truyền vào là id số.
  /** CR toàn kỳ (kèm vai) gom theo orderId — cho màn duyệt. */
  listCrsForCycleGrouped(cycleId: string): Promise<Map<number, CommissionRecord[]>>;
  /** Đếm + tổng tiền CR theo trạng thái trong kỳ. */
  countCrs(cycleId: string, status: string): Promise<{ count: number; totalAmount: number }>;
  /** Duyệt 1 CR: CHO_DUYET → DUOC_DUYET. Trả view hoặc null nếu sai trạng thái. */
  approveCommissionRecord(crId: number): Promise<CommissionRecord | null>;
  /** Từ chối 1 CR: CHO_DUYET → TU_CHOI (+ rejectedAt/reason). */
  rejectCommissionRecord(crId: number, reason: string): Promise<CommissionRecord | null>;
  /** Duyệt mọi CR CHO_DUYET của 1 đơn. */
  bulkApproveCrsByOrder(orderId: number): Promise<{ approved: number; total: number }>;
  /** Duyệt mọi CR CHO_DUYET trong kỳ. */
  bulkApproveCrsByCycle(cycleId: string): Promise<{ approved: number; totalAmount: number; affectedOrders: number }>;
  /** Khiếu nại 1 CR: kiểm sở hữu + TU_CHOI + cửa sổ 3 ngày → KHIEU_NAI + ghi nội dung. */
  fileCommissionComplaint(crId: number, userId: number, content: string): Promise<FileComplaintResult>;
  /** Nội dung khiếu nại của 1 CR. */
  getCommissionComplaints(crId: number): Promise<ComplaintEntry[]>;
  /** Giải quyết khiếu nại: revert → DUOC_DUYET (xoá rejected*), keep → TU_CHOI (nối note). */
  resolveCommissionComplaint(crId: number, resolution: "revert" | "keep", note: string | null): Promise<CommissionRecord | null>;
  /** Các CR đang KHIEU_NAI trong kỳ kèm nội dung khiếu nại. */
  listPendingCommissionComplaints(cycleId: string): Promise<Array<{ cr: CommissionRecord; complaints: ComplaintEntry[] }>>;
  /** Tạo 1 commission_record (seed truy thu). MemoryStorage stub. */
  createCommissionRecord(input: InsertCommissionRecord): Promise<CommissionRecordRow>;

  // ── Thưởng/phạt (adjustments) + truy thu (clawback) trên DB thật. MemoryStorage rỗng.
  /** Tạo 1 thưởng/phạt. */
  createAdjustment(input: InsertAdjustment): Promise<Adjustment>;
  /** NV view — chỉ APPROVED của user trong kỳ. */
  listAdjustmentsForUser(userId: number, cycleId: string): Promise<Adjustment[]>;
  /** Admin view — mọi thưởng/phạt trong kỳ (mọi trạng thái). */
  listAllAdjustmentsForCycle(cycleId: string): Promise<Adjustment[]>;
  /** Hủy thưởng/phạt chờ duyệt (PENDING/AUTO_PENDING → REJECTED). */
  cancelAdjustment(id: number): Promise<Adjustment | null>;
  /** Truy thu của user trong kỳ — suy từ commission_records status CLAWBACK_PENDING. */
  listClawbacksForUser(userId: number, cycleId: string): Promise<Clawback[]>;

  /** Nhật ký hành động khách hàng (ADR-003). MemoryStorage trả []. */
  getCustomerEvents(customerId: number): Promise<CustomerEventRow[]>;

  // Vouchers — mã giảm giá (trang tạo đơn đọc active + validate; admin CRUD).
  listVouchers(): Promise<VoucherRow[]>;
  getActiveVouchers(): Promise<VoucherRow[]>;
  getVoucher(id: number): Promise<VoucherRow | undefined>;
  getVoucherByCode(code: string): Promise<VoucherRow | undefined>;
  createVoucher(data: InsertVoucher): Promise<VoucherRow>;
  updateVoucher(id: number, data: Partial<InsertVoucher>): Promise<VoucherRow | undefined>;
  deleteVoucher(id: number): Promise<boolean>;
  incrementVoucherUse(code: string): Promise<void>;

  // Admin settings — Auto Rule + Kì lương (lưu DB, bền qua restart). CEO sửa; TC/KT xem.
  listAutoRules(): Promise<AutoRule[]>;
  getAutoRule(key: AutoRuleKey): Promise<AutoRule | null>;
  updateAutoRule(key: AutoRuleKey, patch: UpdateAutoRuleInput, actorUserId: number): Promise<AutoRule | null>;
  getPayCycle(): Promise<PayCycleSettings>;
  updatePayCycle(patch: UpdatePayCycleInput, actorUserId: number): Promise<PayCycleSettings>;
}

export class MemoryStorage implements IStorage {
  private users: User[] = [];
  private services: Service[] = [];
  private orders: Order[] = [];
  private customers: Customer[] = [];
  private staffMembers: StaffMember[] = [];
  private statusLogs: StatusLog[] = [];
  private commissionTiers: CommissionTier[] = [];

  private nextId = {
    users: 1,
    services: 1,
    orders: 1,
    customers: 1,
    staffMembers: 1,
    statusLogs: 1,
    commissionTiers: 1,
  };

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return this.users.find(u => u.phone === phone);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.nextId.users++,
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
    };
    this.users.push(user);
    return user;
  }

  async updateUser(id: number, data: Partial<Pick<User, "name" | "avatar">>): Promise<User | undefined> {
    const user = this.users.find(u => u.id === id);
    if (!user) return undefined;
    if (data.name !== undefined) user.name = data.name;
    if (data.avatar !== undefined) user.avatar = data.avatar;
    return user;
  }

  async updateUserLock(id: number, lockedUntil: Date | null): Promise<User | undefined> {
    const user = this.users.find(u => u.id === id);
    if (!user) return undefined;
    user.lockedUntil = lockedUntil;
    return user;
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
    const user = this.users.find(u => u.id === id);
    if (!user) return undefined;
    if (data.name !== undefined) user.name = data.name;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.role !== undefined) user.role = data.role;
    if (data.ranking !== undefined) user.ranking = data.ranking;
    if (data.ihosUserId !== undefined) user.ihosUserId = data.ihosUserId;
    if (data.monthlyTargetHh !== undefined) user.monthlyTargetHh = data.monthlyTargetHh;
    if (data.monthlyTargetOrders !== undefined) user.monthlyTargetOrders = data.monthlyTargetOrders;
    if (data.status !== undefined) user.status = data.status;
    if (data.offboardingDate !== undefined) user.offboardingDate = data.offboardingDate;
    return user;
  }

  async updateUserStatus(
    id: number,
    status: User["status"],
    offboardingDate: string | null,
  ): Promise<User | undefined> {
    const user = this.users.find(u => u.id === id);
    if (!user) return undefined;
    user.status = status;
    user.offboardingDate = offboardingDate;
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.users];
  }

  async getAllServices(): Promise<Service[]> {
    return [...this.services];
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.find(s => s.id === id);
  }

  async createService(insertService: InsertService): Promise<Service> {
    const service: Service = {
      id: this.nextId.services++,
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
      // G1 schema column (default). Mock-mode chưa dùng giá vốn.
      defaultCost: insertService.defaultCost ?? 0,
    };
    this.services.push(service);
    return service;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return [...this.customers];
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.find(c => c.id === id);
  }

  async getCustomerOrders(phone: string): Promise<Order[]> {
    return this.orders.filter(o => o.phone === phone).sort((a, b) => b.id - a.id);
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    const q = query.toLowerCase();
    return this.customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const customer: Customer = {
      id: this.nextId.customers++,
      name: insertCustomer.name,
      phone: insertCustomer.phone,
      email: insertCustomer.email ?? null,
      address: insertCustomer.address ?? null,
      location: insertCustomer.location ?? null,
      createdAt: insertCustomer.createdAt ?? "",
      nextRecallDueAt: insertCustomer.nextRecallDueAt ?? null,
      primaryAssignedUserId: insertCustomer.primaryAssignedUserId ?? null,
      isVip: insertCustomer.isVip ?? false,
      medicalNote: insertCustomer.medicalNote ?? null,
      medicalNoteBy: insertCustomer.medicalNoteBy ?? null,
      medicalNoteAt: insertCustomer.medicalNoteAt ?? null,
    };
    this.customers.push(customer);
    return customer;
  }

  async updateCustomer(
    id: number,
    patch: Partial<Pick<Customer, "isVip" | "medicalNote" | "medicalNoteBy" | "medicalNoteAt">>,
  ): Promise<Customer | undefined> {
    const customer = this.customers.find((c) => c.id === id);
    if (!customer) return undefined;
    Object.assign(customer, patch);
    return customer;
  }

  async getAllOrders(): Promise<Order[]> {
    return [...this.orders].sort((a, b) => b.id - a.id);
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.find(o => o.id === id);
  }

  async getOrderByCode(code: string): Promise<Order | undefined> {
    return this.orders.find(o => o.code === code);
  }

  async getOrdersByUser(userId: number): Promise<Order[]> {
    return this.orders.filter(o => o.userId === userId).sort((a, b) => b.id - a.id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const order: Order = {
      id: this.nextId.orders++,
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
      // ── G1 schema columns (nullable/default). Mock-mode CHƯA dùng — chỉ để khớp kiểu.
      customerId: insertOrder.customerId ?? null,
      source: insertOrder.source ?? "manual",
      idempotencyKey: insertOrder.idempotencyKey ?? null,
      saleUserId: insertOrder.saleUserId ?? null,
      insuranceAmount: insertOrder.insuranceAmount ?? 0,
      voucherAmount: insertOrder.voucherAmount ?? 0,
      voucherCode: insertOrder.voucherCode ?? null,
      totalListed: insertOrder.totalListed ?? 0,
      netProfit: insertOrder.netProfit ?? 0,
      confirmedAt: insertOrder.confirmedAt ?? null,
      completedAt: insertOrder.completedAt ?? null,
    };
    this.orders.push(order);
    return order;
  }

  async updateOrderAppointmentStatus(id: number, newStatus: AppointmentStatusCode, note?: string): Promise<Order | undefined> {
    const order = this.orders.find(o => o.id === id);
    if (!order) return undefined;

    const currentStatus = order.appointmentStatus as AppointmentStatusCode;
    const validTransitions = APPOINTMENT_TRANSITIONS[currentStatus] || [];
    if (!validTransitions.includes(newStatus)) return undefined;

    const fromStatus = order.appointmentStatus;
    order.appointmentStatus = newStatus;

    // When arrived, auto-create visit status
    if (newStatus === "arrived") {
      order.visitStatus = "arrived";
    }

    // Log the transition
    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    await this.createStatusLog({
      orderId: id,
      tier: "appointment",
      fromStatus,
      toStatus: newStatus,
      timestamp,
      note: note ?? null,
    });

    return order;
  }

  async updateOrderVisitStatus(id: number, newStatus: VisitStatusCode, note?: string): Promise<Order | undefined> {
    const order = this.orders.find(o => o.id === id);
    if (!order || !order.visitStatus) return undefined;

    const currentStatus = order.visitStatus as VisitStatusCode;
    const validTransitions = VISIT_TRANSITIONS[currentStatus] || [];
    if (!validTransitions.includes(newStatus)) return undefined;

    const fromStatus = order.visitStatus;
    order.visitStatus = newStatus;

    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    await this.createStatusLog({
      orderId: id,
      tier: "visit",
      fromStatus,
      toStatus: newStatus,
      timestamp,
      note: note ?? null,
    });

    return order;
  }

  async updateOrderNotes(id: number, notes: string | null): Promise<Order | undefined> {
    const order = this.orders.find(o => o.id === id);
    if (!order) return undefined;
    order.notes = notes;
    return order;
  }

  async getStatusLogs(orderId: number): Promise<StatusLog[]> {
    return this.statusLogs.filter(l => l.orderId === orderId).sort((a, b) => a.id - b.id);
  }

  async createStatusLog(insertLog: InsertStatusLog): Promise<StatusLog> {
    const log: StatusLog = {
      id: this.nextId.statusLogs++,
      orderId: insertLog.orderId,
      tier: insertLog.tier,
      fromStatus: insertLog.fromStatus,
      toStatus: insertLog.toStatus,
      timestamp: insertLog.timestamp,
      note: insertLog.note ?? null,
    };
    this.statusLogs.push(log);
    return log;
  }

  async getAllStaffMembers(): Promise<StaffMember[]> {
    return [...this.staffMembers].sort((a, b) => a.rank - b.rank);
  }

  async createStaffMember(insertMember: InsertStaffMember): Promise<StaffMember> {
    const member: StaffMember = {
      id: this.nextId.staffMembers++,
      name: insertMember.name,
      role: insertMember.role,
      revenue: insertMember.revenue ?? 0,
      commission: insertMember.commission ?? 0,
      rank: insertMember.rank ?? 0,
    };
    this.staffMembers.push(member);
    return member;
  }

  // ────────── Commission tier config (B4 R-1-2 + R-1-3) ──────────

  async listCommissionTiers(activeOnly: boolean = true): Promise<CommissionTier[]> {
    const list = activeOnly
      ? this.commissionTiers.filter((t) => t.effectiveTo === null)
      : [...this.commissionTiers];
    return list.sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  }

  async upsertCommissionTier(input: {
    role: string;
    ranking: string | null;
    percentBp: number;
    createdByUserId: number | null;
  }): Promise<CommissionTier> {
    const now = new Date();
    // 1. Mark current active row (same role+ranking) expired.
    const current = this.commissionTiers.find(
      (t) => t.effectiveTo === null && t.role === input.role && t.ranking === input.ranking,
    );
    if (current) current.effectiveTo = now;
    // 2. Insert new row.
    const tier: CommissionTier = {
      id: this.nextId.commissionTiers++,
      role: input.role,
      ranking: input.ranking,
      percentBp: input.percentBp,
      effectiveFrom: now,
      effectiveTo: null,
      createdByUserId: input.createdByUserId,
    };
    this.commissionTiers.push(tier);
    return tier;
  }

  async getEffectiveCommissionRate(
    role: string,
    ranking: string | null,
    at: Date = new Date(),
  ): Promise<number | null> {
    const atMs = at.getTime();
    const match = this.commissionTiers.find((t) => {
      if (t.role !== role) return false;
      if (t.ranking !== ranking) return false;
      if (t.effectiveFrom.getTime() > atMs) return false;
      if (t.effectiveTo !== null && t.effectiveTo.getTime() <= atMs) return false;
      return true;
    });
    return match ? match.percentBp : null;
  }

  // G1b: MemoryStorage không mô hình hóa order_items/role_assignments (rollback-only) → []
  async getOrderItems(_orderId: number): Promise<OrderItemRow[]> {
    return [];
  }

  async getOrderItemsForOrders(_orderIds: number[]): Promise<OrderItemRow[]> {
    return [];
  }

  async getRoleAssignments(_orderId: number): Promise<OrderRoleAssignment[]> {
    return [];
  }

  async createOrderItem(_item: InsertOrderItem): Promise<OrderItemRow> {
    // MemoryStorage rollback-only: không mô hình hóa order_items.
    throw new Error("createOrderItem not supported in MemoryStorage");
  }

  async getNextRecallDueForCustomer(_customerId: number): Promise<string | null> {
    return null;
  }

  async getRecallStateByCustomer(): Promise<Map<number, "pending" | "done">> {
    return new Map();
  }

  async getRecallItemsWithLogFlag(): Promise<RecallItemStat[]> {
    return [];
  }

  async getRecallWorklist(_viewerUserId: number, _viewerRole: string): Promise<RecallWorklistRow[]> {
    return [];
  }

  async logRecallCall(_input: {
    orderItemId: number;
    actorUserId: number;
    outcome: RecallCallOutcome;
    note?: string | null;
  }): Promise<RecallLog> {
    throw new Error("logRecallCall not supported in MemoryStorage");
  }

  async getRecallItemsForCustomer(_customerId: number): Promise<RecallItemForCustomer[]> {
    return [];
  }

  async getRecallLogsForCustomer(_customerId: number): Promise<RecallLogForCustomer[]> {
    return [];
  }

  async getRecallItemOwner(
    _orderItemId: number,
  ): Promise<{ customerId: number; assigneeUserId: number | null } | null> {
    return null;
  }

  async setCustomerPrimaryAssignee(_customerId: number, _userId: number): Promise<void> {
    // no-op (rollback-only)
  }

  // G2: MemoryStorage không mô hình hóa commission_records (rollback-only) → []
  async getCommissionRecordsByUser(_userId: number, _cycleId: string): Promise<CommissionRecordWithRole[]> {
    return [];
  }

  async getCommissionRecordsByOrder(_orderId: number): Promise<CommissionRecordRow[]> {
    return [];
  }

  async getAllCommissionRecordsByCycle(_cycleId: string): Promise<CommissionRecordRow[]> {
    return [];
  }

  // ── Thao tác hoa hồng trên DB — MemoryStorage rollback-only: stub rỗng/null.
  async listCrsForCycleGrouped(_cycleId: string): Promise<Map<number, CommissionRecord[]>> {
    return new Map();
  }
  async countCrs(_cycleId: string, _status: string): Promise<{ count: number; totalAmount: number }> {
    return { count: 0, totalAmount: 0 };
  }
  async approveCommissionRecord(_crId: number): Promise<CommissionRecord | null> {
    return null;
  }
  async rejectCommissionRecord(_crId: number, _reason: string): Promise<CommissionRecord | null> {
    return null;
  }
  async bulkApproveCrsByOrder(_orderId: number): Promise<{ approved: number; total: number }> {
    return { approved: 0, total: 0 };
  }
  async bulkApproveCrsByCycle(_cycleId: string): Promise<{ approved: number; totalAmount: number; affectedOrders: number }> {
    return { approved: 0, totalAmount: 0, affectedOrders: 0 };
  }
  async fileCommissionComplaint(_crId: number, _userId: number, _content: string): Promise<FileComplaintResult> {
    return { ok: false, error: "not_found" };
  }
  async getCommissionComplaints(_crId: number): Promise<ComplaintEntry[]> {
    return [];
  }
  async resolveCommissionComplaint(_crId: number, _resolution: "revert" | "keep", _note: string | null): Promise<CommissionRecord | null> {
    return null;
  }
  async listPendingCommissionComplaints(_cycleId: string): Promise<Array<{ cr: CommissionRecord; complaints: ComplaintEntry[] }>> {
    return [];
  }
  async createCommissionRecord(_input: InsertCommissionRecord): Promise<CommissionRecordRow> {
    throw new Error("createCommissionRecord not supported in MemoryStorage");
  }
  async createAdjustment(_input: InsertAdjustment): Promise<Adjustment> {
    throw new Error("createAdjustment not supported in MemoryStorage");
  }
  async listAdjustmentsForUser(_userId: number, _cycleId: string): Promise<Adjustment[]> {
    return [];
  }
  async listAllAdjustmentsForCycle(_cycleId: string): Promise<Adjustment[]> {
    return [];
  }
  async cancelAdjustment(_id: number): Promise<Adjustment | null> {
    return null;
  }
  async listClawbacksForUser(_userId: number, _cycleId: string): Promise<Clawback[]> {
    return [];
  }

  async getCustomerEvents(_customerId: number): Promise<CustomerEventRow[]> {
    return [];
  }

  // ───────────────────────── Vouchers ─────────────────────────
  private vouchers: VoucherRow[] = [];
  private voucherSeq = 1;

  async listVouchers(): Promise<VoucherRow[]> {
    return [...this.vouchers];
  }
  async getActiveVouchers(): Promise<VoucherRow[]> {
    return this.vouchers.filter((v) => v.active);
  }
  async getVoucher(id: number): Promise<VoucherRow | undefined> {
    return this.vouchers.find((v) => v.id === id);
  }
  async getVoucherByCode(code: string): Promise<VoucherRow | undefined> {
    return this.vouchers.find((v) => v.code === code);
  }
  async createVoucher(data: InsertVoucher): Promise<VoucherRow> {
    const row: VoucherRow = {
      id: this.voucherSeq++,
      code: data.code,
      discountType: data.discountType ?? "percent",
      value: data.value ?? 0,
      maxDiscount: data.maxDiscount ?? null,
      minOrder: data.minOrder ?? 0,
      minServices: data.minServices ?? 0,
      description: data.description ?? null,
      usedCount: data.usedCount ?? 0,
      usageLimit: data.usageLimit ?? 0,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      active: data.active ?? true,
      createdAt: data.createdAt ?? new Date(),
    };
    this.vouchers.push(row);
    return row;
  }
  async updateVoucher(id: number, data: Partial<InsertVoucher>): Promise<VoucherRow | undefined> {
    const v = this.vouchers.find((x) => x.id === id);
    if (!v) return undefined;
    Object.assign(v, data);
    return v;
  }
  async deleteVoucher(id: number): Promise<boolean> {
    const i = this.vouchers.findIndex((x) => x.id === id);
    if (i < 0) return false;
    this.vouchers.splice(i, 1);
    return true;
  }
  async incrementVoucherUse(code: string): Promise<void> {
    const v = this.vouchers.find((x) => x.code === code);
    if (v) v.usedCount++;
  }

  // Admin settings — stub (MemoryStorage rollback-only; nguồn thật là DbStorage).
  async listAutoRules(): Promise<AutoRule[]> {
    return [];
  }
  async getAutoRule(_key: AutoRuleKey): Promise<AutoRule | null> {
    return null;
  }
  async updateAutoRule(
    _key: AutoRuleKey,
    _patch: UpdateAutoRuleInput,
    _actorUserId: number,
  ): Promise<AutoRule | null> {
    return null;
  }
  async getPayCycle(): Promise<PayCycleSettings> {
    return { deadlineDay: 5, editWindowDays: 30, lockAfterDays: 30, capWarningPct: 10, updatedAt: 0, updatedByUserId: null };
  }
  async updatePayCycle(patch: UpdatePayCycleInput, actorUserId: number): Promise<PayCycleSettings> {
    return {
      deadlineDay: patch.deadlineDay,
      editWindowDays: 30,
      lockAfterDays: 30,
      capWarningPct: patch.capWarningPct,
      updatedAt: 0,
      updatedByUserId: actorUserId,
    };
  }
}

// G1: chuyển sang database thật. MemoryStorage giữ NGUYÊN ở trên để rollback nhanh
// (chỉ cần đổi lại dòng export này thành `new MemoryStorage()`).
import { DbStorage } from "./storage.db";
export const storage = new DbStorage();
