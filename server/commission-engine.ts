/**
 * Engine tính hoa hồng thật (G2): sinh commission_records từ order_items +
 * order_role_assignments của một đơn.
 *
 * Công thức B4 R-1-1:
 *   total_listed = Σ(unit_price × quantity) mọi item
 *   total_paid   = total_listed − insurance_amount − voucher_amount
 *   total_cost   = Σ(cost × quantity) CHỈ item status='completed'
 *   net_profit   = total_paid − total_cost
 *   amount mỗi vai = round( max(net_profit, 0) × pct_at_time_bp / 10000 )
 *
 * Chạy ngay sau ingestOrderDerived (cùng cổng nhận đơn) và mỗi lần sửa dịch vụ.
 * Chạy lại chỉ thay khoản còn Chờ duyệt: khoản Kế toán đã duyệt, đã từ chối hay đang
 * khiếu nại là quyết định đã chốt, xoá đi là mất tiền đã duyệt và khiếu nại trỏ vào
 * khoản không còn tồn tại (OD-33). Đổi tiền sau khi chốt phải đi đường thưởng phạt.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import type { Order } from "@shared/schema";
import { commissionRecords, orderItems, orderRoleAssignments, orders } from "@shared/schema";
import { GROSS_COMMISSION_STATUSES } from "@shared/types";
import { db } from "./db";
import type { DbTx } from "./db-tx";
import { vnCycleOfText } from "@shared/vn-time";
import { currentCycleId } from "./income";

/**
 * Khoản còn ở bước ước tính, tính lại hay hủy được. Mọi trạng thái khác là Kế toán
 * đã quyết (duyệt, từ chối, khiếu nại), là truy thu, hoặc đã hủy theo đơn.
 */
export const KHOAN_CHUA_DUYET = ["TAM_TINH", "CHO_DUYET"] as const;

/**
 * order.createdAt là text 'DD/MM/YYYY HH:mm' giờ Việt Nam → 'YYYY-MM'. Lỗi thì
 * fallback kỳ hiện tại (cũng theo lịch Việt Nam, kể cả khi máy chủ chạy UTC).
 */
function cycleIdFromOrder(createdAt: string): string {
  return vnCycleOfText(createdAt) ?? currentCycleId();
}

/** Một người ở một vai, dùng để so khoản đã chốt giữa hai đơn (dời lịch). */
export type NguoiHuong = { role: string; userId: number };

/**
 * Tính (lại) hoa hồng của một đơn.
 *
 * `tx` là transaction của thao tác gọi tới (tạo đơn, sửa dịch vụ, dời lịch) để dòng
 * dịch vụ, người hưởng và khoản cùng commit hay cùng hủy. Không truyền thì tự mở.
 *
 * `daChotO` là người hưởng đã có khoản chốt trên ĐƠN KHÁC của cùng lịch hẹn (đơn cũ
 * trước khi dời lịch). Họ không nhận thêm khoản mới ở đơn này, không thì một lịch
 * hẹn ra hai lần tiền.
 */
export async function computeCommissionForOrder(
  order: Order,
  tx?: DbTx,
  opts: { daChotO?: NguoiHuong[] } = {},
): Promise<void> {
  if (!tx) {
    await db.transaction((t) => computeCommissionForOrder(order, t, opts));
    return;
  }

  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const assignments = await tx
    .select()
    .from(orderRoleAssignments)
    .where(eq(orderRoleAssignments.orderId, order.id))
    .orderBy(orderRoleAssignments.id);

  const totalListed = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const totalPaid = totalListed - order.insuranceAmount - order.voucherAmount;
  const totalCost = items
    .filter((it) => it.status === "completed")
    .reduce((s, it) => s + it.cost * it.quantity, 0);
  const netProfit = totalPaid - totalCost;
  const base = Math.max(netProfit, 0);

  const cycleId = cycleIdFromOrder(order.createdAt);

  // Khoá các khoản của đơn tới hết transaction: Kế toán bấm duyệt đúng lúc này thì
  // lệnh duyệt phải chờ, rồi thấy khoản đã được thay, thay vì duyệt khoản sắp bị xoá.
  const hienCo = await tx
    .select()
    .from(commissionRecords)
    .where(eq(commissionRecords.orderId, order.id))
    .for("update");
  const chuaDuyet = hienCo.filter((r) => (KHOAN_CHUA_DUYET as readonly string[]).includes(r.status));
  const daChot = new Set(
    hienCo
      .filter((r) => !(KHOAN_CHUA_DUYET as readonly string[]).includes(r.status))
      .map((r) => r.roleAssignmentId)
      .filter((id): id is number => id != null),
  );
  const daChotNoiKhac = new Set((opts.daChotO ?? []).map((n) => `${n.role}:${n.userId}`));

  if (chuaDuyet.length > 0) {
    await tx.delete(commissionRecords).where(
      inArray(
        commissionRecords.id,
        chuaDuyet.map((r) => r.id),
      ),
    );
  }

  for (const a of assignments) {
    if (daChot.has(a.id) || daChotNoiKhac.has(`${a.role}:${a.userId}`)) continue;
    // Vai không có bậc tỷ lệ (CEO, Kế toán, hoặc chưa cấu hình) thì không có khoản,
    // thay vì một dòng 0₫ nằm trong bảng duyệt (BR-HH02-03).
    if (a.pctAtTimeBp == null) {
      console.warn(
        `[commission-engine] order ${order.id} vai ${a.role} (assignment ${a.id}): chưa có tỷ lệ cho vai này, bỏ qua`,
      );
      continue;
    }
    const pctBp = a.pctAtTimeBp;
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

  await capNhatHoaHongDon(tx, order.id);
}

/**
 * Hủy mọi khoản chưa duyệt của đơn (đơn Đã hủy, Không đến, Dời lịch). Giữ lại dòng với
 * số tiền cũ ở trạng thái CANCEL để còn tra được, các màn tổng đã loại CANCEL ra.
 * Khoản đã duyệt hoặc đang khiếu nại không đụng tới: đó là việc của Kế toán.
 */
export async function huyHoaHongChuaDuyet(tx: DbTx, orderId: number): Promise<number> {
  const rows = await tx
    .update(commissionRecords)
    .set({ status: "CANCEL" })
    .where(
      and(
        eq(commissionRecords.orderId, orderId),
        inArray(commissionRecords.status, [...KHOAN_CHUA_DUYET]),
      ),
    )
    .returning({ id: commissionRecords.id });
  await capNhatHoaHongDon(tx, orderId);
  return rows.length;
}

/**
 * orders.commission là con số danh sách đơn và màn tạo đơn xong hiện ra: hoa hồng
 * của chủ đơn trên đơn đó. Trước đây điện thoại tự ước rồi gửi lên; giờ lấy từ khoản
 * thật nên hủy đơn là về 0 và sửa dịch vụ là đổi theo.
 */
export async function capNhatHoaHongDon(tx: DbTx, orderId: number): Promise<void> {
  await tx
    .update(orders)
    .set({
      commission: sql`COALESCE((
        SELECT SUM(${commissionRecords.amount}) FROM ${commissionRecords}
        WHERE ${commissionRecords.orderId} = ${orders.id}
          AND ${commissionRecords.userId} = ${orders.userId}
          AND ${commissionRecords.status} IN (${sql.join(
            GROSS_COMMISSION_STATUSES.map((s) => sql`${s}`),
            sql`, `,
          )})
      ), 0)`,
    })
    .where(eq(orders.id, orderId));
}
