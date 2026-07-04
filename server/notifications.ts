/**
 * In-app notifications — derive từ data state thật (CR, recall, adjustment, order)
 * + track read state in-memory per user.
 *
 * Pattern: pull-based generation. Mỗi GET /me sinh lại list từ source data hiện tại,
 * bù read timestamp từ in-memory Map. Phase 2: DB table notifications + WS push.
 *
 * Lý do generative: tránh inconsistency giữa notification store và source data.
 * Trade-off: scan O(orders + customers) mỗi request — chấp nhận được cho mock-mode.
 */

import type { Order } from "@shared/schema";
import { notificationReads } from "@shared/schema";
import type { NotificationType, UserRole } from "@shared/types";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { currentCycleId } from "./income";

export type NotificationTone = "hoahong" | "taikham" | "thuong" | "phat";

export type Notification = {
  id: string;
  userId: number;
  type: NotificationType;
  /** Nhãn danh mục hiển thị ở badge (vd "Hoa hồng"). */
  tag: string;
  /** Màu badge theo danh mục. */
  tone: NotificationTone;
  title: string;
  body: string;
  /** Path để FE navigate khi tap. */
  link: string;
  /** ms epoch — null = chưa đọc. */
  readAt: number | null;
  /** ms epoch — sort desc. */
  createdAt: number;
};

// ─────────────────────────────────────────────────────────────────
// Read state: bảng notification_reads (userId, notifId, readAt).
// Trước đây là in-memory Map<userId, Map<notifId, readAt>> — không sống
// qua cold-start trên serverless, nên chuyển sang DB.
// ─────────────────────────────────────────────────────────────────

async function getReadMap(userId: number): Promise<Map<string, number>> {
  const rows = await db
    .select()
    .from(notificationReads)
    .where(eq(notificationReads.userId, userId));
  return new Map(rows.map((r) => [r.notifId, r.readAt.getTime()]));
}

// ─────────────────────────────────────────────────────────────────
// Generators per source
// ─────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

async function genFromCRs(userId: number, role: UserRole): Promise<Notification[]> {
  const list: Notification[] = [];
  const cycle = currentCycleId();
  const allOrders = await storage.getAllOrders();
  const orderById = new Map(allOrders.map((o) => [o.id, o]));

  // NV/TC/BS: notif về CR của mình (bị từ chối / được duyệt) trong kỳ — nguồn DB thật.
  if (role === "sale" || role === "doctor" || role === "tc") {
    const records = await storage.getCommissionRecordsByUser(userId, cycle);
    for (const r of records) {
      const order = orderById.get(r.orderId);
      const body = `${order?.code ?? ""} · ${order?.serviceName ?? ""} · ${fmtVND(r.amount)}đ`;
      if (r.status === "TU_CHOI") {
        list.push({
          id: `n-cr-rej-${r.id}`,
          userId,
          type: "cr.rejected",
          tag: "Hoa hồng",
          tone: "hoahong",
          title: "Bị từ chối",
          body,
          link: `/orders/${r.orderId}`,
          readAt: null,
          createdAt: r.rejectedAt ? r.rejectedAt.getTime() : Date.now() - DAY_MS,
        });
      } else if (r.status === "DUOC_DUYET") {
        list.push({
          id: `n-cr-app-${r.id}`,
          userId,
          type: "cr.approved",
          tag: "Hoa hồng",
          tone: "hoahong",
          title: "Được duyệt",
          body,
          link: `/income`,
          readAt: null,
          createdAt: r.createdAt.getTime(),
        });
      }
    }
  }

  // KT/CEO: 1 notif aggregate cho CR chờ duyệt trong kỳ — đếm từ DB.
  if (role === "kt" || role === "ceo") {
    const { count: pending } = await storage.countCrs(cycle, "CHO_DUYET");
    if (pending > 0) {
      list.push({
        id: `n-cr-pending-aggregate`,
        userId,
        type: "cr.pending_approval",
        tag: "Hoa hồng",
        tone: "hoahong",
        title: `${pending} khoản chờ duyệt`,
        body: `${pending} khoản hoa hồng từ các đơn đã hoàn thành đang chờ Kế toán duyệt`,
        link: `/admin/commission-approval`,
        readAt: null,
        createdAt: Date.now() - DAY_MS * 0.5,
      });
    }
  }

  return list;
}

async function genFromRecalls(userId: number, role: UserRole): Promise<Notification[]> {
  // Notif recall: NV (sale/doctor) chỉ nhận của khách MÌNH chăm; quản lý (tc/kt/ceo) nhận hết.
  if (!["sale", "doctor", "tc", "kt", "ceo"].includes(role)) return [];
  const isManager = role === "tc" || role === "kt" || role === "ceo";

  const list: Notification[] = [];
  const customers = await storage.getAllCustomers();
  // Trạng thái tái khám gộp từ database (hệ mới): chỉ notif khách còn lượt pending.
  const recallState = await storage.getRecallStateByCustomer();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const c of customers) {
    if (recallState.get(c.id) !== "pending") continue; // đã xử lý hết / không có lượt → bỏ qua
    // NV chỉ nhận thông báo của khách mình chăm (theo người trong token, không theo client).
    if (!isManager && c.primaryAssignedUserId !== userId) continue;

    // Ngày tái khám tính từ ca khám thật (MIN order_items.recall_due_date), không
    // còn đọc customer.next_recall_due_at seed cứng.
    const recallDue = await storage.getNextRecallDueForCustomer(c.id);
    if (!recallDue) continue;
    const due = new Date(recallDue);
    due.setHours(0, 0, 0, 0);
    const overdueDays = Math.floor((today.getTime() - due.getTime()) / DAY_MS);

    // Chỉ notif nếu overdue hoặc đến hạn hôm nay/ngày mai
    if (overdueDays < -1) continue;

    const title = overdueDays > 0
      ? `Trễ hạn ${overdueDays} ngày`
      : overdueDays === 0
      ? "Đến hạn hôm nay"
      : "Đến hạn ngày mai";

    list.push({
      id: `n-recall-${c.id}`,
      userId,
      type: "recall.due",
      tag: "Tái khám",
      tone: "taikham",
      title,
      body: `${c.name} · ${c.phone}`,
      link: `/customers/${c.id}`,
      readAt: null,
      createdAt: due.getTime(),
    });
  }

  return list;
}

async function genFromAdjustments(userId: number, role: UserRole): Promise<Notification[]> {
  // Adjustment chỉ notif cho NV nhận (sale/doctor/tc) khi APPROVED
  if (!["sale", "doctor", "tc"].includes(role)) return [];

  const list: Notification[] = [];
  const cycle = currentCycleId();
  const adjustments = await storage.listAdjustmentsForUser(userId, cycle);

  for (const a of adjustments) {
    const isThuong = a.type === "thuong";
    list.push({
      id: `n-adj-${a.id}`,
      userId,
      type: "adjustment.created",
      tag: isThuong ? "Thưởng" : "Phạt",
      tone: isThuong ? "thuong" : "phat",
      title: isThuong ? `+${fmtVND(a.amount)}đ` : `-${fmtVND(a.amount)}đ`,
      body: a.reason,
      link: `/income`,
      readAt: null,
      createdAt: a.approvedAt ?? a.createdAt,
    });
  }

  return list;
}

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

/** Sinh notifications cho user, kèm read state. Sort desc by createdAt. */
export async function listNotificationsForUser(
  userId: number,
  role: UserRole,
): Promise<Notification[]> {
  const [crs, recalls, adjs] = await Promise.all([
    genFromCRs(userId, role),
    genFromRecalls(userId, role),
    genFromAdjustments(userId, role),
  ]);

  const all = [...crs, ...recalls, ...adjs];

  // Apply read state.
  const readMap = await getReadMap(userId);
  for (const n of all) {
    const r = readMap.get(n.id);
    if (r !== undefined) n.readAt = r;
  }

  all.sort((a, b) => b.createdAt - a.createdAt);
  return all;
}

export async function countUnreadForUser(userId: number, role: UserRole): Promise<number> {
  const all = await listNotificationsForUser(userId, role);
  return all.filter((n) => n.readAt === null).length;
}

export async function markRead(userId: number, notifId: string): Promise<void> {
  // Giữ mốc đọc lần đầu: nếu đã có thì không ghi đè.
  await db
    .insert(notificationReads)
    .values({ userId, notifId })
    .onConflictDoNothing();
}

export async function markAllRead(userId: number, notifIds: string[]): Promise<void> {
  if (notifIds.length === 0) return;
  await db
    .insert(notificationReads)
    .values(notifIds.map((notifId) => ({ userId, notifId })))
    .onConflictDoNothing();
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function fmtVND(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.abs(n));
}

// Type guard helper export (cho route use type-check Order).
export type { Order };
