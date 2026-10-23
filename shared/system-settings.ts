/**
 * Cấu hình hệ thống: các ngưỡng vận hành trước đây nằm cứng trong mã (cửa sổ sửa
 * 30 ngày, trễ hẹn 15 phút) hoặc trong bảng singleton pay_cycle_settings.
 *
 * Vì sao gom về một bảng key/value (system_settings) kèm bảng lịch sử: mỗi lần đổi
 * ngưỡng là đổi cách tính tiền hoặc cách xếp lịch hẹn, nên phải tra lại được ai
 * đổi, lúc nào, từ bao nhiêu thành bao nhiêu. Thêm một ngưỡng mới chỉ cần thêm một
 * dòng ở SYSTEM_SETTING_DEFS, không phải thêm cột rồi viết migration.
 *
 * Định nghĩa đặt ở shared để máy chủ kiểm khoảng giá trị và giao diện in nhãn, gợi
 * ý cùng một nguồn: sửa khoảng ở đây thì ô nhập và API đổi theo một lượt.
 */

import { z } from "zod";

export const SYSTEM_SETTING_KEYS = [
  "period_close_day",
  "period_edit_window_days",
  "rate_warning_cap_percent",
  "late_minutes",
  "overdue_hours",
  "no_show_days",
] as const;
export type SystemSettingKey = (typeof SYSTEM_SETTING_KEYS)[number];

/** Giá trị đang áp dụng của mọi khóa. Khóa chưa lưu thì mang giá trị mặc định. */
export type SystemSettings = Record<SystemSettingKey, number>;

type SettingDef = {
  /** Nhãn ô nhập, cũng là chủ ngữ của câu báo lỗi. */
  label: string;
  /** Đơn vị in sau số: "ngày", "phút", "%". */
  unit: string;
  min: number;
  max: number;
  /** false cho phép số lẻ (ngưỡng cảnh báo 7,5%). */
  integer: boolean;
  defaultValue: number;
  hint: string;
};

export const SYSTEM_SETTING_DEFS: Record<SystemSettingKey, SettingDef> = {
  // 28 là trần để tháng 2 năm nào cũng có ngày chốt.
  period_close_day: {
    label: "Ngày chốt lương trong tháng",
    unit: "ngày",
    min: 1,
    max: 28,
    integer: true,
    defaultValue: 5,
    hint: "Từ 1 đến 28",
  },
  period_edit_window_days: {
    label: "Số ngày được sửa sau khi chốt",
    unit: "ngày",
    min: 1,
    max: 90,
    integer: true,
    defaultValue: 30,
    hint: "Từ 1 đến 90",
  },
  rate_warning_cap_percent: {
    label: "Ngưỡng cảnh báo hoa hồng mỗi đơn",
    unit: "%",
    min: 0,
    max: 100,
    integer: false,
    defaultValue: 10,
    hint: "Từ 0 đến 100, chỉ cảnh báo, không trừ hoa hồng",
  },
  late_minutes: {
    label: "Số phút tính trễ hẹn",
    unit: "phút",
    min: 1,
    max: 120,
    integer: true,
    defaultValue: 15,
    hint: "Từ 1 đến 120, quá giờ hẹn chừng này mà khách chưa đến thì báo trễ",
  },
  overdue_hours: {
    label: "Số giờ quá hạn chưa đến",
    unit: "giờ",
    min: 1,
    max: 48,
    integer: true,
    defaultValue: 2,
    hint: "Từ 1 đến 48, quá giờ hẹn chừng này thì lịch chuyển sang Cần xử lý",
  },
  no_show_days: {
    label: "Số ngày chuyển Không đến",
    unit: "ngày",
    min: 1,
    max: 30,
    integer: true,
    defaultValue: 3,
    hint: "Từ 1 đến 30, quá hẹn chừng này ngày thì lịch tính là Không đến",
  },
};

export const SYSTEM_SETTING_DEFAULTS: SystemSettings = Object.fromEntries(
  SYSTEM_SETTING_KEYS.map((k) => [k, SYSTEM_SETTING_DEFS[k].defaultValue]),
) as SystemSettings;

export function isSystemSettingKey(k: unknown): k is SystemSettingKey {
  return typeof k === "string" && (SYSTEM_SETTING_KEYS as readonly string[]).includes(k);
}

/**
 * Giá trị đọc từ DB (jsonb) → số hợp lệ, hoặc null khi lạ hay ra ngoài khoảng.
 * Đọc lại cũng kiểm vì dòng có thể bị sửa tay bằng SQL: một ngưỡng 0 phút sẽ làm
 * mọi lịch hẹn thành trễ, thà rơi về mặc định còn hơn.
 */
export function normalizeSettingValue(key: SystemSettingKey, raw: unknown): number | null {
  const d = SYSTEM_SETTING_DEFS[key];
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < d.min || n > d.max) return null;
  if (d.integer && !Number.isInteger(n)) return null;
  return n;
}

function settingField(key: SystemSettingKey) {
  const d = SYSTEM_SETTING_DEFS[key];
  const range = `${d.label} phải từ ${d.min} đến ${d.max}`;
  const base = z.number({ invalid_type_error: `${d.label} phải là số` }).min(d.min, range).max(d.max, range);
  return (d.integer ? base.int(`${d.label} phải là số nguyên`) : base).optional();
}

/**
 * Thân PUT /api/admin/settings: gửi khóa nào thì đổi khóa đó. strict() để gõ sai
 * tên khóa bị báo lỗi thay vì âm thầm bỏ qua, người sửa tưởng đã lưu.
 */
export const updateSystemSettingsSchema = z
  .object({
    period_close_day: settingField("period_close_day"),
    period_edit_window_days: settingField("period_edit_window_days"),
    rate_warning_cap_percent: settingField("rate_warning_cap_percent"),
    late_minutes: settingField("late_minutes"),
    overdue_hours: settingField("overdue_hours"),
    no_show_days: settingField("no_show_days"),
  })
  .strict("Có ô cấu hình không tồn tại")
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Chưa có giá trị nào để lưu",
  });
export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>;

/** Lần sửa gần nhất của từng khóa; null khi khóa còn mang giá trị mặc định chưa ai lưu. */
export type SystemSettingMeta = {
  updatedAt: string | null;
  updatedByUserId: number | null;
  updatedByName: string | null;
};

/** Trả về của GET/PUT /api/admin/settings. */
export type SystemSettingsView = {
  values: SystemSettings;
  meta: Record<SystemSettingKey, SystemSettingMeta>;
};

/** Một dòng của GET /api/admin/settings/history. changedAt là ISO có múi giờ. */
export type SystemSettingHistoryEntry = {
  id: number;
  key: SystemSettingKey;
  oldValue: number | null;
  newValue: number | null;
  changedAt: string;
  changedByUserId: number | null;
  changedByName: string | null;
};

/**
 * Phần cấu hình mọi vai cần để tự tính trên giao diện (huy hiệu trễ hẹn ở danh
 * sách đơn). Tách riêng khỏi bộ đầy đủ để vai không xem được Cài đặt vẫn đọc được.
 */
export type RuntimeSettings = {
  lateMinutes: number;
  overdueHours: number;
  noShowDays: number;
};

export function toRuntimeSettings(s: SystemSettings): RuntimeSettings {
  return { lateMinutes: s.late_minutes, overdueHours: s.overdue_hours, noShowDays: s.no_show_days };
}

export const DEFAULT_RUNTIME_SETTINGS: RuntimeSettings = toRuntimeSettings(SYSTEM_SETTING_DEFAULTS);

/** "7,5%", "15 phút": dấu phẩy thập phân, phần trăm viết liền số. */
export function formatSettingValue(key: SystemSettingKey, v: number | null): string {
  if (v === null) return "Chưa đặt";
  const d = SYSTEM_SETTING_DEFS[key];
  const so = String(v).replace(".", ",");
  // Ngày chốt là một ngày trong tháng, không phải một khoảng: "5 ngày" đặt cạnh dòng
  // "30 ngày" của cửa sổ sửa thì đọc như hai khoảng thời gian.
  if (key === "period_close_day") return `Ngày ${so} hằng tháng`;
  return d.unit === "%" ? `${so}%` : `${so} ${d.unit}`;
}
