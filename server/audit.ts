/**
 * Audit log abstraction.
 *
 * Spec: B5-2 Section 2.10 (R-10-2: Audit log mọi change).
 * MVP: in-memory implementation. Phase 2: swap với Postgres `audit_logs` table —
 * chỉ cần implement AuditLogStore interface, không touch caller code.
 */

import type { AuditAction } from "@shared/types";

export interface AuditEntry {
  id: number;
  /** Subject — the user this event is about. */
  userId: number;
  action: AuditAction;
  /** Actor — the user who performed the action. */
  actorId: number;
  /** Epoch ms. */
  timestamp: number;
  payload?: Record<string, unknown>;
}

export interface AuditLogStore {
  append(entry: Omit<AuditEntry, "id" | "timestamp">): Promise<AuditEntry>;
  listForUser(userId: number, limit?: number): Promise<AuditEntry[]>;
}

class InMemoryAuditLog implements AuditLogStore {
  private entries: AuditEntry[] = [];
  private nextId = 1;

  async append(input: Omit<AuditEntry, "id" | "timestamp">): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: this.nextId++,
      timestamp: Date.now(),
      ...input,
    };
    this.entries.push(entry);
    return entry;
  }

  async listForUser(userId: number, limit = 50): Promise<AuditEntry[]> {
    return this.entries
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

export const auditLog: AuditLogStore = new InMemoryAuditLog();
