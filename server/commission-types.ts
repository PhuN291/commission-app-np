/**
 * Shape view hoa hồng dùng chung cho server (màn thu nhập, duyệt, chi tiết đơn, thông báo).
 *
 * Quy ước: id là CHUỖI (String của serial), mốc thời gian là số ms (Date.getTime()).
 * Đây là hình dạng cũ do server/commission.ts (đồ giả) export; tách ra đây để khi xoá
 * đồ giả ở Phần 6 các nơi vẫn còn type + mapper để dùng.
 */

import type { CRStatus, AdjustmentSource, AdjustmentStatus, AdjustmentType } from "@shared/types";
import type { CommissionRecordRow, CommissionComplaintRow, AdjustmentRow } from "@shared/schema";

export type CRRole = "sale" | "tc" | "doctor";

/** 1 dòng hoa hồng (1 vai trên 1 đơn) ở dạng view. */
export type CommissionRecord = {
  id: string;
  orderId: number;
  role: CRRole;
  userId: number;
  amount: number;
  status: CRStatus;
  createdAt: number;
  rejectedAt: number | null;
  rejectedReason: string | null;
};

/** 1 dòng khiếu nại ở dạng view. */
export type ComplaintEntry = {
  id: string;
  crId: string;
  userId: number;
  content: string;
  createdAt: number;
};

/** Map row commission_records (DB) + vai (join order_role_assignments) → view. */
export function mapCrRowToView(row: CommissionRecordRow, role: string | null): CommissionRecord {
  return {
    id: String(row.id),
    orderId: row.orderId,
    role: (role ?? "sale") as CRRole,
    userId: row.userId,
    amount: row.amount,
    status: row.status as CRStatus,
    createdAt: row.createdAt.getTime(),
    rejectedAt: row.rejectedAt ? row.rejectedAt.getTime() : null,
    rejectedReason: row.rejectedReason ?? null,
  };
}

/** Map row commission_complaints (DB) → view. */
export function mapComplaintRowToView(row: CommissionComplaintRow): ComplaintEntry {
  return {
    id: String(row.id),
    crId: String(row.crId),
    userId: row.userId,
    content: row.content,
    createdAt: row.createdAt.getTime(),
  };
}

/** Thưởng/phạt ở dạng view (id chuỗi, mốc thời gian ms). */
export type Adjustment = {
  id: string;
  userId: number;
  cycleId: string;
  type: AdjustmentType;
  amount: number;
  reason: string;
  source: AdjustmentSource;
  status: AdjustmentStatus;
  createdAt: number;
  approvedByUserId: number | null;
  approvedAt: number | null;
};

/** Truy thu ở dạng view (amount luôn âm). */
export type Clawback = {
  id: string;
  userId: number;
  cycleId: string;
  sourceOrderCode: string;
  sourceCycleId: string;
  amount: number;
  reason: string;
  createdAt: number;
};

/** Map row adjustments (DB) → view. */
export function mapAdjustmentRowToView(row: AdjustmentRow): Adjustment {
  return {
    id: String(row.id),
    userId: row.userId,
    cycleId: row.cycleId,
    type: row.type as AdjustmentType,
    amount: row.amount,
    reason: row.reason,
    source: row.source as AdjustmentSource,
    status: row.status as AdjustmentStatus,
    createdAt: row.createdAt.getTime(),
    approvedByUserId: row.approvedByUserId ?? null,
    approvedAt: row.approvedAt ? row.approvedAt.getTime() : null,
  };
}

/** Edit window check — APPROVED/EDITED trong 30 ngày kể từ approvedAt. */
const EDIT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export function canEditAdjustment(adj: Adjustment): boolean {
  if (adj.status !== "APPROVED" && adj.status !== "EDITED") return false;
  if (!adj.approvedAt) return false;
  return Date.now() - adj.approvedAt < EDIT_WINDOW_MS;
}
