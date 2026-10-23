/**
 * Dashboard data builder — role-based response.
 *
 * Spec: B4 R-9-1 permission matrix.
 * - Personal view (Sale/BS/TC): HH cá nhân + KPI cá nhân + tasks của mình
 * - Admin view (KT/CEO): Tổng HH PK + KPI PK + tasks toàn PK + leaderboard
 *
 * Pending tasks (F-3-1): chỉ giữ task hành động thực:
 * - pendingOrders: mọi role
 * - customersLate15min: Sale (đơn của mình) + TC (toàn PK); BS/KT/CEO = 0
 * - customersRecallDue: mock Phase 2 — chờ iHOS sync recall_due_date
 *
 * TODO v1.5: làm màn báo cáo riêng cho đơn có OrderItem.status='skipped',
 * KHÔNG để ở dashboard trang chủ.
 */

import type { Order, User } from "@shared/schema";
import { isLate15min } from "@shared/status";
import { shiftCycle, vnDaysUntil } from "@shared/vn-time";
import { isGrossCommission } from "@shared/types";
import { storage } from "./storage";
import { currentCycleId } from "./income";
import { orderCycle, orderRealRevenue } from "./analytics";

/** Kỳ 'YYYY-MM' của tháng liền trước tháng hiện tại (để tính tăng trưởng so tháng trước). */
function previousCycleId(): string {
  return shiftCycle(currentCycleId(), -1);
}

/**
 * Tăng trưởng % so kỳ trước, làm tròn. Trả null khi kỳ trước = 0 (chưa có nền so sánh)
 * để UI ẩn badge thay vì hiện số gây hiểu lầm.
 */
function trendPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// ─────────────────────────────────────────────────────────────────
// Pending tasks (F-3-1)
// ─────────────────────────────────────────────────────────────────

export type PendingTasks = {
  pendingOrders: number;
  customersRecallDue: number; // mock — Phase 2 iHOS sync
  customersLate15min: number;
  total: number;
};

async function buildPendingTasks(
  userId: number | null,
  role: string,
  allOrders: Order[],
): Promise<PendingTasks> {
  const myOrders = userId ? allOrders.filter((o) => o.userId === userId) : allOrders;

  const pendingOrders = myOrders.filter((o) => o.appointmentStatus === "pending").length;

  // Late 15p chỉ là task vận hành — Sale gọi xác nhận đơn của mình; TC giám sát toàn PK.
  // BS/KT/CEO không cần (R-9-1). Số phút lấy từ cấu hình late_minutes, cùng con số
  // màn Đơn hàng dùng để lọc "Khách trễ", nên hai chỗ đếm ra như nhau.
  let customersLate15min = 0;
  if (role === "sale" || role === "tc") {
    const { late_minutes: lateMinutes } = await storage.getSystemSettings();
    const pool = role === "sale" ? myOrders : allOrders;
    customersLate15min = pool.filter((o) => isLate15min(o, lateMinutes)).length;
  }

  // Đếm số lượt tái khám của NGƯỜI ĐANG XEM đã tới hạn / quá hạn — dùng CÙNG nguồn với
  // màn danh sách tái khám (getRecallWorklist) để hai chỗ khớp nhau. sale/doctor chỉ tính
  // khách mình chăm; tc/kt/ktt/ceo tính tất cả. So theo ngày lịch Việt Nam (bỏ giờ).
  const worklist = await storage.getRecallWorklist(userId ?? 0, role);
  const customersRecallDue = worklist.filter((w) => {
    const days = vnDaysUntil(w.recallDueDate);
    return days !== null && days <= 0;
  }).length;

  return {
    pendingOrders,
    customersRecallDue,
    customersLate15min,
    total: pendingOrders + customersRecallDue + customersLate15min,
  };
}

// ─────────────────────────────────────────────────────────────────
// Response shapes
// ─────────────────────────────────────────────────────────────────

type SafeUser = Omit<User, "password">;

export type PersonalDashboard = {
  view: "personal";
  user: SafeUser;
  hero: {
    label: string;
    commission: number;
    revenue: number;
    commissionRate: number;
    commissionTrendPct: number | null; // tăng trưởng HH so tháng trước; null = chưa có nền
  };
  kpis: {
    revenue: number;
    closedDeals: number;
    totalDeals: number;
    revenueTrendPct: number | null; // tăng trưởng doanh số so tháng trước
  };
  pendingTasks: PendingTasks;
};

export type AdminDashboard = {
  view: "admin";
  user: SafeUser;
  hero: { label: string; clinicCommission: number; clinicRevenue: number };
  kpis: {
    totalRevenue: number;
    closedDeals: number;
    totalDeals: number;
    activeStaffCount: number;
  };
  pendingTasks: PendingTasks;
  leaderboard: Array<{
    id: number;
    name: string;
    role: string;
    revenue: number;
    commission: number;
    rank: number;
  }>;
};

export type DashboardResponse = PersonalDashboard | AdminDashboard;

// ─────────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────────

function stripPassword(u: User): SafeUser {
  const { password: _p, ...safe } = u;
  return safe;
}

export async function getPersonalDashboard(userId: number): Promise<PersonalDashboard | null> {
  const user = await storage.getUser(userId);
  if (!user) return null;
  const cycle = currentCycleId();
  const prevCycle = previousCycleId();

  // Các query dưới đây không phụ thuộc lẫn nhau — chạy song song thay vì tuần tự
  // để giảm tổng round-trip DB (mỗi round-trip cộng dồn latency tới Neon).
  const [myRecords, myOrders, prevRecords, rateBp, allOrders] = await Promise.all([
    // Hoa hồng thật: tổng amount commission_records của user trong kỳ — cùng nguồn màn Income
    // nên hai màn ra cùng một con số cho cùng người, cùng kỳ.
    storage.getCommissionRecordsByUser(userId, cycle),
    // Doanh số + đếm đơn: đơn của user trong kỳ hiện tại, loại đơn đã hủy.
    storage.getOrdersByUser(userId),
    // Tăng trưởng so tháng trước (số thật): cùng cách tính nhưng cho kỳ liền trước.
    storage.getCommissionRecordsByUser(userId, prevCycle),
    // commissionRate chỉ để hiển thị: % tier Sale hiện tại theo hạng (500bp → 5). null → 0.
    storage.getEffectiveCommissionRate("sale", user.ranking ?? null, new Date()),
    // Dùng chung cho buildPendingTasks bên dưới — tránh gọi getAllOrders() lần nữa.
    storage.getAllOrders(),
  ]);

  const commission = myRecords.filter((r) => isGrossCommission(r.status)).reduce((s, r) => s + r.amount, 0);

  const cycleOrders = myOrders.filter(
    (o) => orderCycle(o.createdAt) === cycle && o.appointmentStatus !== "cancelled",
  );
  const revenue = cycleOrders.reduce((s, o) => s + o.totalPrice, 0);
  const totalDeals = cycleOrders.length;
  const closedDeals = cycleOrders.filter((o) => o.visitStatus === "completed").length;

  const prevCommission = prevRecords.filter((r) => isGrossCommission(r.status)).reduce((s, r) => s + r.amount, 0);
  const prevRevenue = myOrders
    .filter((o) => orderCycle(o.createdAt) === prevCycle && o.appointmentStatus !== "cancelled")
    .reduce((s, o) => s + o.totalPrice, 0);

  const commissionRate = (rateBp ?? 0) / 100;

  return {
    view: "personal",
    user: stripPassword(user),
    hero: {
      label: "Hoa hồng cá nhân tháng",
      commission,
      revenue,
      commissionRate,
      commissionTrendPct: trendPct(commission, prevCommission),
    },
    kpis: {
      revenue,
      closedDeals,
      totalDeals,
      revenueTrendPct: trendPct(revenue, prevRevenue),
    },
    pendingTasks: await buildPendingTasks(userId, user.role, allOrders),
  };
}

export async function getAdminDashboard(userId: number): Promise<AdminDashboard | null> {
  const user = await storage.getUser(userId);
  if (!user) return null;
  const cycle = currentCycleId();

  // Các query dưới đây không phụ thuộc lẫn nhau — chạy song song thay vì tuần tự.
  const [allUsers, allOrders, allRecords] = await Promise.all([
    storage.getAllUsers(),
    storage.getAllOrders(),
    // Tổng HH thật toàn phòng khám trong kỳ: cộng amount mọi commission_records của kỳ.
    storage.getAllCommissionRecordsByCycle(cycle),
  ]);

  // Doanh số + đếm đơn toàn phòng khám trong kỳ hiện tại, loại đơn đã hủy.
  const cycleOrders = allOrders.filter(
    (o) => orderCycle(o.createdAt) === cycle && o.appointmentStatus !== "cancelled",
  );
  const clinicRevenue = cycleOrders.reduce((s, o) => s + o.totalPrice, 0);
  const totalDeals = cycleOrders.length;
  const closedDeals = cycleOrders.filter((o) => o.visitStatus === "completed").length;

  const clinicCommission = allRecords.filter((r) => isGrossCommission(r.status)).reduce((s, r) => s + r.amount, 0);

  // Số NV ăn hoa hồng đang active (sale/doctor/tc) — chỉ để hiển thị, không tính tiền.
  const activeStaffCount = allUsers.filter(
    (u) => ["sale", "doctor", "tc"].includes(u.role) && u.status === "active",
  ).length;

  // Bảng xếp hạng người THẬT trong kỳ: mỗi NV ăn hoa hồng (sale/doctor/tc) có doanh
  // thu thực thu (đơn họ tạo, đã khám xong) + tổng hoa hồng gross; xếp theo HH giảm dần.
  const grossByUser = new Map<number, number>();
  for (const r of allRecords) {
    if (isGrossCommission(r.status)) grossByUser.set(r.userId, (grossByUser.get(r.userId) ?? 0) + r.amount);
  }
  const revByUser = new Map<number, number>();
  for (const o of allOrders) {
    if (orderCycle(o.createdAt) === cycle) revByUser.set(o.userId, (revByUser.get(o.userId) ?? 0) + orderRealRevenue(o));
  }
  const leaderboard = allUsers
    .filter((u) => ["sale", "doctor", "tc"].includes(u.role))
    .map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      revenue: revByUser.get(u.id) ?? 0,
      commission: grossByUser.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.commission - a.commission)
    .map((row, i) => ({ ...row, rank: i + 1 }));
  return {
    view: "admin",
    user: stripPassword(user),
    hero: {
      label: "Tổng hoa hồng chi",
      clinicCommission,
      clinicRevenue,
    },
    kpis: {
      totalRevenue: clinicRevenue,
      closedDeals,
      totalDeals,
      activeStaffCount,
    },
    pendingTasks: await buildPendingTasks(null, user.role, allOrders),
    leaderboard,
  };
}
