/**
 * Audit log abstraction.
 *
 * Spec: B5-2 Section 2.10 (R-10-2: Audit log mọi change).
 * Ghi vào bảng audit_logs. Bản trong bộ nhớ trước đây mất sạch mỗi lần khởi động
 * lại máy chủ, và trên Vercel thì mỗi lần cold start, nên nhật ký nhân sự cứ trống.
 * Giao diện append/listForUser giữ nguyên để nơi gọi không phải sửa.
 */

import { and, desc, eq } from "drizzle-orm";
import { auditLogs } from "@shared/schema";
import type { AuditAction } from "@shared/types";
import { db } from "./db";

/** Ai thao tác: người dùng qua app, việc tự chạy, hay script migration. */
export type AuditSource = "app" | "system" | "migration";

/** Thứ không phải một nhân sự mà vẫn cần nhật ký: bảng tỷ lệ, quy tắc thưởng, tiền của đơn. */
export type AuditEntityType = "commission_tiers" | "auto_rule" | "order";

export interface AuditEntry {
  id: number;
  /** Subject — the user this event is about. */
  userId: number;
  action: AuditAction;
  /** Actor — the user who performed the action. null là hệ thống tự làm. */
  actorId: number | null;
  /** Epoch ms. */
  timestamp: number;
  /** Giá trị sau thay đổi (cột after). */
  payload?: Record<string, unknown>;
  /** Giá trị trước thay đổi, chỉ có khi nơi gọi gửi kèm. */
  before?: Record<string, unknown> | null;
}

type AuditCommon = {
  action: AuditAction;
  actorId: number | null;
  payload?: Record<string, unknown>;
  before?: Record<string, unknown> | null;
  source?: AuditSource;
};

/**
 * Sự việc về một nhân sự thì gửi userId như trước. Thay đổi cấu hình chung gửi
 * entityType thay cho userId: gắn nó vào người sửa thì nó lọt vào nhật ký nhân sự
 * của chính người đó thành "Cập nhật thông tin", như lỗi đổi tỷ lệ trước đây.
 */
export type AuditAppendInput =
  | (AuditCommon & { userId: number })
  | (AuditCommon & { entityType: AuditEntityType; entityId?: number | null });

export interface AuditLogStore {
  /** null khi ghi DB lỗi; xem lý do ở DbAuditLog.append. */
  append(entry: AuditAppendInput): Promise<AuditEntry | null>;
  listForUser(userId: number, limit?: number): Promise<AuditEntry[]>;
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

class DbAuditLog implements AuditLogStore {
  /**
   * Lỗi ghi nhật ký chỉ in ra log chứ không ném: lúc này thay đổi chính đã lưu
   * xong, trả 500 cho người dùng thì họ tưởng chưa lưu và bấm làm lại lần nữa.
   */
  async append(input: AuditAppendInput): Promise<AuditEntry | null> {
    const isUser = "userId" in input;
    try {
      const rows = await db
        .insert(auditLogs)
        .values({
          actorUserId: input.actorId,
          action: input.action,
          entityType: isUser ? "user" : input.entityType,
          entityId: isUser ? input.userId : (input.entityId ?? null),
          before: input.before ?? null,
          after: input.payload ?? null,
          source: input.source ?? "app",
        })
        .returning();
      const row = rows[0];
      return {
        id: row.id,
        userId: row.entityId ?? 0,
        action: row.action as AuditAction,
        actorId: row.actorUserId,
        timestamp: row.createdAt.getTime(),
        payload: asRecord(row.after),
        before: asRecord(row.before) ?? null,
      };
    } catch (err) {
      console.error(`[audit] không ghi được ${input.action}:`, err);
      return null;
    }
  }

  async listForUser(userId: number, limit = 50): Promise<AuditEntry[]> {
    const rows = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, "user"), eq(auditLogs.entityId, userId)))
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(limit);
    return rows.map((row) => ({
      id: row.id,
      userId,
      action: row.action as AuditAction,
      actorId: row.actorUserId,
      timestamp: row.createdAt.getTime(),
      payload: asRecord(row.after),
      before: asRecord(row.before) ?? null,
    }));
  }
}

export const auditLog: AuditLogStore = new DbAuditLog();
