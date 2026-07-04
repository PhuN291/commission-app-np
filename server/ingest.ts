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

export async function ingestOrderDerived(order: Order): Promise<void> {
  const now = new Date();

  // ── (a) order_items: lookup service theo code, tạo MỘT item đại diện ─────
  // Đơn hiện gộp nhiều dịch vụ vào một order → tạm tạo 1 item từ thông tin đơn.
  // G3 (mở rộng màn nhập) sẽ gửi chi tiết từng dịch vụ → nhiều item; cổng giữ nguyên.
  const services = await storage.getAllServices();
  const service = services.find((s) => s.code === order.serviceCode);
  if (service) {
    await db.insert(orderItems).values({
      orderId: order.id,
      serviceId: service.id,
      serviceName: order.serviceName,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      cost: service.defaultCost, // thường 0 cho tới khi CEO/KT nhập giá vốn thật
      status: "completed",
      skippedReason: null,
      performedByUserId: null, // bác sĩ để bước sau
      recallDueDate: null,
      refundedAmount: 0,
    });
  } else {
    console.warn(
      `[ingest] order ${order.id}: không tìm thấy service code='${order.serviceCode}' → bỏ qua tạo order_item`,
    );
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
