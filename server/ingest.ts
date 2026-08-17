/**
 * Cổng nhận đơn dùng chung (G1b) — sinh dữ liệu phái sinh khi có đơn mới.
 *
 * Sau này webhook iHOS + đồng bộ website đều gọi lại hàm này (không viết lại logic
 * sinh order_items / order_role_assignments). Bước này CHƯA tính hoa hồng (commission_records
 * để G2), CHƯA gán vai bác sĩ (cần cơ chế chọn BS — G3).
 *
 * An toàn: mọi lookup chịu được "không tìm thấy" mà không ném lỗi; route POST /api/orders
 * bọc thêm try/catch để tạo đơn luôn thành công kể cả khi sinh phái sinh lỗi.
 */

import { eq } from "drizzle-orm";
import type { Order } from "@shared/schema";
import { orderItems, orderRoleAssignments, orders } from "@shared/schema";
import { db } from "./db";
import { storage } from "./storage";
import { computeCommissionForOrder } from "./commission-engine";

/** Chi tiết từng dịch vụ trên đơn, do màn tạo đơn gửi kèm. */
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
): Promise<void> {
  const now = new Date();

  // ── (a) order_items: một dòng cho MỖI dịch vụ ────────────────────────────
  // Bảng orders vẫn giữ kiểu gộp (serviceName nối bằng ", "), nên nếu chỉ đọc từ
  // đó thì đơn hai dịch vụ chỉ đẻ ra một dòng mang cái tên đã nối, số lượng cộng
  // dồn và đơn giá bị bình quân. Màn sửa dịch vụ đọc lại đúng chỗ đó, mở ra thấy
  // một dịch vụ trong khi khách đặt hai, lưu lại là gộp thật thành một.
  //
  // Nơi gọi có chi tiết (màn tạo đơn) thì gửi kèm; nơi chưa có (webhook iHOS,
  // dữ liệu mẫu) vẫn rơi về cách cũ để không hỏng đường nhận đơn sẵn có.
  const services = await storage.getAllServices();
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
    const service = services.find((s) => s.code === x.serviceCode);
    if (!service) {
      console.warn(
        `[ingest] order ${order.id}: không tìm thấy service code='${x.serviceCode}' → bỏ qua dòng này`,
      );
      continue;
    }
    await db.insert(orderItems).values({
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

  // ── (b) order_role_assignments: vai Sale (luôn) + vai TC (nếu có active) ──
  const saleUser = await storage.getUser(order.userId);
  const salePct = await storage.getEffectiveCommissionRate("sale", saleUser?.ranking ?? null, now);
  await db.insert(orderRoleAssignments).values({
    orderId: order.id,
    role: "sale",
    userId: order.userId,
    rankingSnapshot: saleUser?.ranking ?? null,
    pctAtTimeBp: salePct,
    assignedAt: now,
    endedAt: null,
    assignedByUserId: null,
  });

  const allUsers = await storage.getAllUsers();
  const tcUser = allUsers.find((u) => u.role === "tc" && u.status === "active");
  if (tcUser) {
    const tcPct = await storage.getEffectiveCommissionRate("tc", null, now);
    await db.insert(orderRoleAssignments).values({
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
  const allCustomers = await storage.getAllCustomers();
  const customer = allCustomers.find((c) => c.phone === order.phone);
  const set: Partial<typeof orders.$inferInsert> = {
    saleUserId: order.userId,
    totalListed: order.totalPrice,
  };
  if (customer) set.customerId = customer.id; // chỉ set nếu khớp phone
  await db.update(orders).set(set).where(eq(orders.id, order.id));

  // ── (c2) gán người chăm gốc cho khách: chỉ set lần đầu (giữ nguyên người cũ).
  // Bọc riêng để không bao giờ làm hỏng tạo đơn nếu update lỗi.
  if (customer && !customer.primaryAssignedUserId) {
    try {
      await storage.setCustomerPrimaryAssignee(customer.id, order.userId);
    } catch (err) {
      console.error(`[ingest] order ${order.id}: gán người chăm gốc lỗi (bỏ qua):`, err);
    }
  }

  // ── (d) G2: tính hoa hồng từ items + assignments vừa tạo ─────────────────
  // Bọc riêng để engine lỗi không xoá phần items/assignments đã tạo ở trên.
  try {
    await computeCommissionForOrder(order);
  } catch (err) {
    console.error(`[ingest] order ${order.id}: tính hoa hồng lỗi (items/assignments vẫn giữ):`, err);
  }
}
