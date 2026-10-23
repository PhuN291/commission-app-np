/**
 * Cổng nhận đơn dùng chung (G1b): sinh dữ liệu phái sinh khi có đơn mới.
 *
 * Sau này webhook iHOS + đồng bộ website đều gọi lại hàm này (không viết lại logic
 * sinh order_items / order_role_assignments). CHƯA gán vai bác sĩ (cần cơ chế chọn
 * BS, G3).
 *
 * Chạy trong transaction của nơi gọi: đơn, dòng dịch vụ, người hưởng và khoản hoa
 * hồng cùng commit hoặc cùng hủy. Trước đây mỗi bước tự nuốt lỗi nên có thể còn lại
 * một đơn không dịch vụ, không người hưởng mà màn hình vẫn báo tạo thành công.
 */

import { and, asc, eq, isNull } from "drizzle-orm";
import type { Order } from "@shared/schema";
import { customers, orderItems, orderRoleAssignments, orders, services, users } from "@shared/schema";
import { db } from "./db";
import type { DbTx } from "./db-tx";
import { tyLeHieuLuc } from "./storage.db";
import { computeCommissionForOrder, type NguoiHuong } from "./commission-engine";

/** Chi tiết từng dịch vụ trên đơn. Giá ở đây phải là giá máy chủ đã tự tính. */
export type ChiTietDichVu = {
  serviceCode: string;
  serviceName: string;
  serviceCategory?: string | null;
  quantity: number;
  unitPrice: number;
};

export async function ingestOrderDerived(
  order: Order,
  chiTiet?: ChiTietDichVu[] | null,
  tx?: DbTx,
  opts: { daChotO?: NguoiHuong[] } = {},
): Promise<void> {
  if (!tx) {
    await db.transaction((t) => ingestOrderDerived(order, chiTiet, t, opts));
    return;
  }
  const now = new Date();

  // ── (a) order_items: một dòng cho MỖI dịch vụ ────────────────────────────
  // Bảng orders vẫn giữ kiểu gộp (serviceName nối bằng ", "), nên nếu chỉ đọc từ
  // đó thì đơn hai dịch vụ chỉ đẻ ra một dòng mang cái tên đã nối, số lượng cộng
  // dồn và đơn giá bị bình quân. Màn sửa dịch vụ đọc lại đúng chỗ đó, mở ra thấy
  // một dịch vụ trong khi khách đặt hai, lưu lại là gộp thật thành một.
  //
  // Nơi gọi có chi tiết (màn tạo đơn) thì gửi kèm; nơi chưa có (webhook iHOS,
  // dữ liệu mẫu) vẫn rơi về cách cũ để không hỏng đường nhận đơn sẵn có.
  //
  // Mọi lần đọc trong hàm này đi qua `tx`, không qua storage (pool). Nơi gọi đang giữ
  // khoá cấp mã đơn trong ngày; đủ số đơn cùng lúc thì mọi kết nối của pool đều đang
  // chờ khoá đó, đọc qua pool lúc này là chờ một kết nối không bao giờ được trả.
  const danhMuc = await tx.select().from(services).orderBy(asc(services.id));
  const dsGhi: ChiTietDichVu[] =
    chiTiet && chiTiet.length > 0
      ? chiTiet
      : [
          {
            serviceCode: order.serviceCode,
            serviceName: order.serviceName,
            serviceCategory: order.serviceCategory,
            quantity: order.quantity,
            unitPrice: order.unitPrice,
          },
        ];

  for (const x of dsGhi) {
    const service = danhMuc.find((s) => s.code === x.serviceCode);
    if (!service) {
      console.warn(
        `[ingest] order ${order.id}: không tìm thấy service code='${x.serviceCode}' → bỏ qua dòng này`,
      );
      continue;
    }
    await tx.insert(orderItems).values({
      orderId: order.id,
      serviceId: service.id,
      serviceName: x.serviceName,
      quantity: x.quantity,
      unitPrice: x.unitPrice,
      cost: service.defaultCost, // thường 0 cho tới khi CEO/KT nhập giá vốn thật
      status: "completed",
      skippedReason: null,
      performedByUserId: null, // bác sĩ để bước sau
      recallDueDate: null,
      refundedAmount: 0,
    });
  }

  // ── (b) order_role_assignments: vai Sale cho chủ đơn + vai TC (nếu có active) ──
  // Chỉ chủ đơn là Điều dưỡng mới nhận vai Sale. CEO, Trưởng ca, Bác sĩ tạo đơn mà
  // gán vai Sale thì tra bảng tỷ lệ Sale theo bậc của họ không ra gì, sinh khoản 0₫
  // nằm chờ Kế toán duyệt (CM-16, BR-HH02-03).
  const saleUser = (await tx.select().from(users).where(eq(users.id, order.userId)).limit(1))[0];
  if (saleUser?.role === "sale") {
    const salePct = await tyLeHieuLuc(tx, "sale", saleUser.ranking ?? null, now);
    await tx.insert(orderRoleAssignments).values({
      orderId: order.id,
      role: "sale",
      userId: order.userId,
      rankingSnapshot: saleUser.ranking ?? null,
      pctAtTimeBp: salePct,
      assignedAt: now,
      endedAt: null,
      assignedByUserId: null,
    });
  }

  const tcUser = (
    await tx
      .select()
      .from(users)
      .where(and(eq(users.role, "tc"), eq(users.status, "active")))
      .orderBy(asc(users.id))
      .limit(1)
  )[0];
  if (tcUser) {
    const tcPct = await tyLeHieuLuc(tx, "tc", null, now);
    await tx.insert(orderRoleAssignments).values({
      orderId: order.id,
      role: "tc",
      userId: tcUser.id,
      rankingSnapshot: null,
      pctAtTimeBp: tcPct,
      assignedAt: now,
      endedAt: null,
      assignedByUserId: null,
    });
  }

  // ── (c) cập nhật vài cột phái sinh trên order cho nhất quán ───────────────
  const customer = (
    await tx.select().from(customers).where(eq(customers.phone, order.phone)).limit(1)
  )[0];
  const set: Partial<typeof orders.$inferInsert> = {
    // Đơn dời lịch mang sẵn người tư vấn của đơn cũ, đè bằng chủ đơn là mất người đó.
    saleUserId: order.saleUserId ?? order.userId,
    totalListed: order.totalPrice,
  };
  if (customer) set.customerId = customer.id; // chỉ set nếu khớp phone
  const [daCapNhat] = await tx.update(orders).set(set).where(eq(orders.id, order.id)).returning();

  // ── (c2) gán người chăm gốc cho khách: chỉ set lần đầu (giữ nguyên người cũ).
  if (customer && !customer.primaryAssignedUserId) {
    await tx
      .update(customers)
      .set({ primaryAssignedUserId: order.userId })
      .where(and(eq(customers.id, customer.id), isNull(customers.primaryAssignedUserId)));
  }

  // ── (d) G2: tính hoa hồng từ items + assignments vừa tạo ─────────────────
  await computeCommissionForOrder(daCapNhat ?? order, tx, opts);
}
