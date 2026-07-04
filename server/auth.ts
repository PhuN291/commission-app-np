/**
 * Auth state + helpers for SĐT + OTP login flow.
 *
 * Spec: audit-docs/B5-2-screen-specs-batch-2.md Section 1 (S-Login).
 * v15 chốt (PENDING-ITEMS): bỏ 2nd factor switch device, chỉ OTP + notify CEO/TC.
 *
 * Storage strategy: Postgres tables (auth_tokens, otp_sessions, device_bindings,
 * otp_requests) qua drizzle. Trước đây là in-memory Map — không sống được trên
 * serverless (Vercel) vì cold-start xoá RAM → mất phiên/401 ngẫu nhiên.
 * Các hàm trả về đúng shape cũ (epoch ms) nên caller không đổi logic, chỉ thêm await.
 */

import { randomUUID } from "crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "./db";
import { authTokens, otpSessions, deviceBindings, otpRequests } from "@shared/schema";

export type OtpSession = {
  code: string;
  expiresAt: number; // epoch ms
  attempts: number;  // 0..3
};

export type DeviceBinding = {
  deviceId: string;
  deviceName: string;
  boundAt: number;
};

export type TokenRecord = {
  phone: string;
  userId: number;
  issuedAt: number;
};

/**
 * Normalize Vietnamese phone numbers.
 * Accepts: +84xxxxxxxxx, 84xxxxxxxxx, 0xxxxxxxxx, raw 9-10 digit national.
 * Returns 10-digit form starting with 0, or null if invalid.
 */
export function normalizeVNPhone(input: string): string | null {
  if (!input) return null;
  const digits = input.replace(/[\s\-().]/g, "").trim();
  // +84 prefix
  if (digits.startsWith("+84")) {
    const rest = digits.slice(3);
    if (/^\d{9,10}$/.test(rest)) {
      return rest.length === 10 ? rest : "0" + rest;
    }
    return null;
  }
  // 84 prefix (no +)
  if (digits.startsWith("84") && digits.length >= 11) {
    const rest = digits.slice(2);
    if (/^\d{9,10}$/.test(rest)) {
      return rest.length === 10 ? rest : "0" + rest;
    }
    return null;
  }
  // 0xxxxxxxxx
  if (/^0\d{9}$/.test(digits)) return digits;
  // Raw 9 digit (no leading 0)
  if (/^\d{9}$/.test(digits)) return "0" + digits;
  return null;
}

/** Display formatter — masks middle digits for security. */
export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return phone.slice(0, 3) + "*****" + phone.slice(-2);
}

/** Generate 6-digit numeric OTP. */
export function generateOtp(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

// ─────────────────────────────────────────────────────────────────
// Tokens (bảng auth_tokens)
// ─────────────────────────────────────────────────────────────────

/** Issue a new auth token for a verified phone+user. */
export async function issueToken(phone: string, userId: number): Promise<string> {
  const token = randomUUID();
  await db.insert(authTokens).values({ token, phone, userId });
  return token;
}

/** Đọc token record (null nếu không có). issuedAt trả về epoch ms như bản Map cũ. */
export async function getTokenRecord(token: string): Promise<TokenRecord | null> {
  const [row] = await db.select().from(authTokens).where(eq(authTokens.token, token)).limit(1);
  if (!row) return null;
  return { phone: row.phone, userId: row.userId, issuedAt: row.issuedAt.getTime() };
}

/** Xoá 1 token (logout / hết hạn). */
export async function deleteToken(token: string): Promise<void> {
  await db.delete(authTokens).where(eq(authTokens.token, token));
}

/** Thu hồi mọi token đang hoạt động của 1 số điện thoại (mất phiên ngay lần gọi kế). Trả số token đã xoá. */
export async function revokeTokensForPhone(phone: string): Promise<number> {
  const revoked = await db
    .delete(authTokens)
    .where(eq(authTokens.phone, phone))
    .returning({ token: authTokens.token });
  return revoked.length;
}

// ─────────────────────────────────────────────────────────────────
// OTP sessions (bảng otp_sessions — 1 dòng / SĐT)
// ─────────────────────────────────────────────────────────────────

/** Ghi/ghi đè phiên OTP cho SĐT (reset attempts về 0). */
export async function setOtpSession(phone: string, code: string, expiresAtMs: number): Promise<void> {
  const expiresAt = new Date(expiresAtMs);
  await db
    .insert(otpSessions)
    .values({ phone, code, expiresAt, attempts: 0 })
    .onConflictDoUpdate({ target: otpSessions.phone, set: { code, expiresAt, attempts: 0 } });
}

/** Đọc phiên OTP (null nếu không có). expiresAt trả về epoch ms như bản Map cũ. */
export async function getOtpSession(phone: string): Promise<OtpSession | null> {
  const [row] = await db.select().from(otpSessions).where(eq(otpSessions.phone, phone)).limit(1);
  if (!row) return null;
  return { code: row.code, expiresAt: row.expiresAt.getTime(), attempts: row.attempts };
}

/** Xoá phiên OTP (verify thành công / hết hạn). */
export async function deleteOtpSession(phone: string): Promise<void> {
  await db.delete(otpSessions).where(eq(otpSessions.phone, phone));
}

/** Tăng số lần nhập sai + trả về số attempts mới. */
export async function incrementOtpAttempts(phone: string): Promise<number> {
  const [row] = await db
    .update(otpSessions)
    .set({ attempts: sql`${otpSessions.attempts} + 1` })
    .where(eq(otpSessions.phone, phone))
    .returning({ attempts: otpSessions.attempts });
  return row?.attempts ?? 0;
}

// ─────────────────────────────────────────────────────────────────
// Device bindings (bảng device_bindings — 1 dòng / SĐT)
// ─────────────────────────────────────────────────────────────────

/** Đọc thiết bị đang bind cho SĐT (null nếu chưa bind). boundAt trả về epoch ms. */
export async function getDeviceBinding(phone: string): Promise<DeviceBinding | null> {
  const [row] = await db.select().from(deviceBindings).where(eq(deviceBindings.phone, phone)).limit(1);
  if (!row) return null;
  return { deviceId: row.deviceId, deviceName: row.deviceName, boundAt: row.boundAt.getTime() };
}

/** Bind/rebind thiết bị cho SĐT. */
export async function setDeviceBinding(phone: string, deviceId: string, deviceName: string): Promise<void> {
  await db
    .insert(deviceBindings)
    .values({ phone, deviceId, deviceName })
    .onConflictDoUpdate({
      target: deviceBindings.phone,
      set: { deviceId, deviceName, boundAt: sql`now()` },
    });
}

/** Gỡ bind thiết bị của SĐT (force unbind). */
export async function deleteDeviceBinding(phone: string): Promise<void> {
  await db.delete(deviceBindings).where(eq(deviceBindings.phone, phone));
}

// ─────────────────────────────────────────────────────────────────
// Rate limit xin OTP: tối đa 5 lần / 1 giờ / SĐT (bảng otp_requests).
// ─────────────────────────────────────────────────────────────────
const OTP_RATE_MAX = 5;
const OTP_RATE_WINDOW_MS = 60 * 60 * 1000;

/** Trả true nếu được phép xin OTP (đồng thời ghi nhận lần này); false nếu vượt 5 lần/giờ. */
export async function allowOtpRequest(phone: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - OTP_RATE_WINDOW_MS);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(otpRequests)
    .where(and(eq(otpRequests.phone, phone), gt(otpRequests.requestedAt, windowStart)));
  if ((row?.count ?? 0) >= OTP_RATE_MAX) return false;
  await db.insert(otpRequests).values({ phone });
  return true;
}

/**
 * Notify CEO + TC khi user đổi device.
 * Mock: log to console. Production: Zalo OA broadcast với template message.
 * Per v15 PENDING-ITEMS: chỉ notify, không block, không cần 2nd factor.
 */
export function notifyDeviceSwitch(
  userName: string,
  oldDevice: string,
  newDevice: string,
): void {
  // TODO production: gọi Zalo OA API gửi message tới CEO + TC qua Zalo template.
  // Template: "Cảnh báo: NV {userName} vừa đổi thiết bị đăng nhập từ {old} sang {new}."
  console.log(
    `[DEVICE_SWITCH_NOTIFY] ${userName}: "${oldDevice}" → "${newDevice}" @ ${new Date().toISOString()}`,
  );
}

export const OTP_TTL_MS = 5 * 60 * 1000; // 5 phút
export const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 phút lock sau 3 fails
export const MAX_OTP_ATTEMPTS = 3;

/** Phiên đăng nhập hết hạn sau 24 giờ kể từ lúc cấp token (issuedAt). */
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
