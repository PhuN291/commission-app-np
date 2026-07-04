/**
 * Permission middleware for admin endpoints.
 *
 * Per task plan: FE np_role chỉ là UX gate (hide buttons),
 * server middleware là security gate (reject request không đúng role).
 *
 * Token → user lookup qua `tokens` Map trong server/auth.ts.
 */

import type { NextFunction, Request, Response } from "express";
import type { User } from "@shared/schema";
import type { UserRole } from "@shared/types";
import { getTokenRecord, deleteToken, TOKEN_TTL_MS } from "./auth";
import { storage } from "./storage";

/** Augment Express request type with currentUser. */
declare module "express-serve-static-core" {
  interface Request {
    currentUser?: User;
  }
}

/** Extract authenticated user from `Authorization: Bearer <token>` header. */
export async function getCurrentUser(req: Request): Promise<User | null> {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const record = await getTokenRecord(token);
  if (!record) return null;
  // Phiên hết hạn sau 24h → xoá token, coi như chưa đăng nhập (middleware sẽ trả 401).
  if (Date.now() > record.issuedAt + TOKEN_TTL_MS) {
    await deleteToken(token);
    return null;
  }
  const user = await storage.getUser(record.userId);
  if (!user) return null;
  // Chặn tài khoản đã nghỉ (offboarded) hoặc đang bị khóa; pending_offboarding vẫn cho vào.
  if (user.status === "offboarded") return null;
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) return null;
  return user;
}

/**
 * Middleware factory — gate handler by allowed roles.
 *
 * Usage: `app.post(..., requireRole(["ceo"]), handler)`.
 * Sets `req.currentUser` for the handler.
 *
 * Errors:
 *   401 — missing or invalid token
 *   403 — token valid but role not allowed
 */
export function requireRole(allowed: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "unauthorized", message: "Vui lòng đăng nhập" });
    }
    if (!allowed.includes(user.role as UserRole)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Không có quyền thực hiện hành động này",
        required: allowed,
        actual: user.role,
      });
    }
    req.currentUser = user;
    next();
  };
}

/** Strip sensitive fields before sending user to client. */
export function stripPassword<T extends { password?: unknown }>(user: T): Omit<T, "password"> {
  const { password: _password, ...safe } = user;
  return safe;
}
