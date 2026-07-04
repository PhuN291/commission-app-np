/**
 * Nhật ký hành động khách hàng (ADR-003). Ghi 1 dòng customer_events cho mỗi thao tác
 * (gọi/nhắn/email/tạo đơn/đổi trạng thái/gọi nhắc lịch). Nuốt lỗi để không làm hỏng
 * hành động chính (giống ingestOrderDerived).
 */
import { eq } from "drizzle-orm";
import { customers, customerEvents } from "@shared/schema";
import { db } from "./db";

export type CustomerEventType =
  | "call"
  | "sms"
  | "email"
  | "order_created"
  | "status_change"
  | "recall_call";

export async function logCustomerEvent(input: {
  customerId?: number;
  phone?: string;
  type: CustomerEventType;
  actorUserId?: number | null;
  orderId?: number | null;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    let customerId = input.customerId;
    if (!customerId && input.phone) {
      const rows = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.phone, input.phone))
        .limit(1);
      customerId = rows[0]?.id;
    }
    if (!customerId) return; // không gắn được vào khách nào → bỏ qua
    await db.insert(customerEvents).values({
      customerId,
      type: input.type,
      actorUserId: input.actorUserId ?? null,
      orderId: input.orderId ?? null,
      meta: input.meta ?? null,
    });
  } catch (err) {
    console.error("[customer-events] ghi sự kiện lỗi:", err);
  }
}
