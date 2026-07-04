/**
 * Income data composer — kết hợp CR + Adjustment + Clawback theo cycle.
 *
 * Spec: B5-3 Section 1 (S-Income).
 * Permission: Sale/BS/TC chỉ xem của mình. KT/CEO 403 (vào admin-commission-approval).
 */

import { type Adjustment, type CommissionRecord, type Clawback } from "./commission-types";
import { isGrossCommission } from "@shared/types";
import { storage } from "./storage";

export type IncomeCROrderGroup = {
  orderId: number;
  orderCode: string;
  serviceName: string;
  crs: CommissionRecord[];
};

export type IncomeData = {
  cycle: string;
  target: number;
  crGroups: IncomeCROrderGroup[];
  adjustments: Adjustment[];
  clawbacks: Clawback[];
  totalHh: number;
  totalAdjustment: number;
  totalClawback: number;
  netHh: number;
};

export function currentCycleId(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Last 6 cycles từ tháng hiện tại lùi về quá khứ. */
export function generateLast6Cycles(): string[] {
  const list: string[] = [];
  const d = new Date();
  for (let i = 0; i < 6; i++) {
    list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return list;
}

export async function getIncomeForUser(userId: number, cycle: string): Promise<IncomeData | null> {
  const user = await storage.getUser(userId);
  if (!user) return null;

  // G2: đọc commission_records thật (lọc theo user + cycle), gom theo đơn.
  const allOrders = await storage.getAllOrders();
  const orderById = new Map(allOrders.map((o) => [o.id, o]));
  const records = await storage.getCommissionRecordsByUser(userId, cycle);

  const crGroups: IncomeCROrderGroup[] = [];
  const groupByOrder = new Map<number, IncomeCROrderGroup>();
  let totalHh = 0;

  for (const r of records) {
    // CR trạng thái truy thu được surface riêng ở clawbacks (âm), không cộng vào HH kiếm được.
    if (r.status === "CLAWBACK_PENDING") continue;
    let group = groupByOrder.get(r.orderId);
    if (!group) {
      const order = orderById.get(r.orderId);
      group = {
        orderId: r.orderId,
        orderCode: order?.code ?? "",
        serviceName: order?.serviceName ?? "",
        crs: [],
      };
      groupByOrder.set(r.orderId, group);
      crGroups.push(group);
    }
    const cr: CommissionRecord = {
      id: String(r.id),
      orderId: r.orderId,
      role: (r.role ?? "sale") as CommissionRecord["role"],
      userId: r.userId,
      amount: r.amount,
      status: r.status as CommissionRecord["status"],
      createdAt: r.createdAt.getTime(),
      rejectedAt: r.rejectedAt ? r.rejectedAt.getTime() : null,
      rejectedReason: r.rejectedReason ?? null,
    };
    group.crs.push(cr);
    // Chỉ cộng vào HH gross các trạng thái được tính (loại TU_CHOI/CANCEL); dòng bị từ
    // chối vẫn nằm trong crGroups để NV thấy trạng thái + khiếu nại, chỉ không cộng tiền.
    if (isGrossCommission(r.status)) totalHh += r.amount;
  }

  const adjustments = await storage.listAdjustmentsForUser(userId, cycle);
  const clawbacks = await storage.listClawbacksForUser(userId, cycle);
  const totalAdjustment = adjustments.reduce((s, a) => s + a.amount, 0);
  const totalClawback = clawbacks.reduce((s, c) => s + c.amount, 0);
  const netHh = totalHh + totalAdjustment + totalClawback;

  return {
    cycle,
    target: user.monthlyTargetHh ?? 0,
    crGroups,
    adjustments,
    clawbacks,
    totalHh,
    totalAdjustment,
    totalClawback,
    netHh,
  };
}
