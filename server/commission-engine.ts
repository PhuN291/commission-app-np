/**
 * Engine tính hoa hồng thật (G2) — sinh commission_records từ order_items +
 * order_role_assignments của một đơn.
 *
 * Công thức B4 R-1-1:
 *   total_listed = Σ(unit_price × quantity) mọi item
 *   total_paid   = total_listed − insurance_amount − voucher_amount
 *   total_cost   = Σ(cost × quantity) CHỈ item status='completed'
 *   net_profit   = total_paid − total_cost
 *   amount mỗi vai = round( max(net_profit, 0) × pct_at_time_bp / 10000 )
 *
 * Chạy ngay sau ingestOrderDerived (cùng cổng nhận đơn). Idempotent: xoá record cũ
 * của đơn rồi sinh lại trong một transaction để chạy lại không nhân đôi và không
 * mất sạch nếu insert lỗi giữa chừng.
 */

import { eq } from "drizzle-orm";
import type { Order } from "@shared/schema";
import { commissionRecords } from "@shared/schema";
import { db } from "./db";
import { storage } from "./storage";
import { currentCycleId } from "./income";

/** order.createdAt là text 'DD/MM/YYYY HH:mm' → 'YYYY-MM'. Lỗi thì fallback tháng hiện tại. */
function cycleIdFromOrder(createdAt: string): string {
  try {
    const datePart = createdAt.trim().split(" ")[0]; // 'DD/MM/YYYY'
    const [, mm, yyyy] = datePart.split("/");
    if (yyyy && mm && /^\d{4}$/.test(yyyy) && /^\d{1,2}$/.test(mm)) {
      return `${yyyy}-${mm.padStart(2, "0")}`;
    }
  } catch {
    // rơi xuống fallback
  }
  return currentCycleId();
}

export async function computeCommissionForOrder(order: Order): Promise<void> {
  const items = await storage.getOrderItems(order.id);
  const assignments = await storage.getRoleAssignments(order.id);

  const totalListed = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const totalPaid = totalListed - order.insuranceAmount - order.voucherAmount;
  const totalCost = items
    .filter((it) => it.status === "completed")
    .reduce((s, it) => s + it.cost * it.quantity, 0);
  const netProfit = totalPaid - totalCost;
  const base = Math.max(netProfit, 0);

  const cycleId = cycleIdFromOrder(order.createdAt);

  await db.transaction(async (tx) => {
    // Chống trùng: xoá record cũ của đơn trước khi sinh lại.
    await tx.delete(commissionRecords).where(eq(commissionRecords.orderId, order.id));

    for (const a of assignments) {
      if (a.pctAtTimeBp == null) {
        console.warn(
          `[commission-engine] order ${order.id} vai ${a.role} (assignment ${a.id}): pctAtTimeBp null (chưa seed commission_tiers?) → amount = 0`,
        );
      }
      const pctBp = a.pctAtTimeBp ?? 0;
      const amount = Math.round((base * pctBp) / 10000);
      await tx.insert(commissionRecords).values({
        orderId: order.id,
        roleAssignmentId: a.id,
        userId: a.userId,
        cycleId,
        baseNetProfit: netProfit,
        pctBp,
        amount,
        status: "CHO_DUYET",
      });
    }
  });
}
