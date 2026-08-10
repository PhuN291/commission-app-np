// ===== Appointment Status (Tầng 1) =====
export type AppointmentStatusCode =
  | "pending"
  | "confirmed"
  | "reminded"
  | "arrived"
  | "no_show"
  | "cancelled"
  | "rescheduled";

export interface StatusInfo {
  label: string;
  badgeColor: string; // Tailwind bg class
  badgeText: string;  // Tailwind text class
}

export const APPOINTMENT_STATUSES: Record<AppointmentStatusCode, StatusInfo> = {
  pending:     { label: "Chờ xác nhận",  badgeColor: "bg-[#fff4bd]", badgeText: "text-[#8a6116]" },
  confirmed:   { label: "Đã xác nhận",   badgeColor: "bg-[#dbeafe]", badgeText: "text-[#1e40af]" },
  reminded:    { label: "Đã nhắc",       badgeColor: "bg-[#e0e7ff]", badgeText: "text-[#4338ca]" },
  arrived:     { label: "Đã đến",        badgeColor: "bg-[#bbe5b3]", badgeText: "text-[#008060]" },
  no_show:     { label: "Không đến",     badgeColor: "bg-[#fead9a]", badgeText: "text-[#8a1c1c]" },
  cancelled:   { label: "Đã hủy",        badgeColor: "bg-[#f1f1f2]", badgeText: "text-[#616161]" },
  rescheduled: { label: "Dời lịch",      badgeColor: "bg-[#fce4bd]", badgeText: "text-[#92400e]" },
};

// ===== Visit Status (Tầng 2) =====
export type VisitStatusCode =
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

export const VISIT_STATUSES: Record<VisitStatusCode, StatusInfo> = {
  arrived:     { label: "Chờ khám",      badgeColor: "bg-[#fff4bd]", badgeText: "text-[#8a6116]" },
  in_progress: { label: "Đang khám",     badgeColor: "bg-[#dbeafe]", badgeText: "text-[#1e40af]" },
  completed:   { label: "Hoàn thành",    badgeColor: "bg-[#bbe5b3]", badgeText: "text-[#008060]" },
  cancelled:   { label: "Khách bỏ về",      badgeColor: "bg-[#fead9a]", badgeText: "text-[#8a1c1c]" },
};

// ===== Transition Maps (forward-only) =====
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatusCode, AppointmentStatusCode[]> = {
  pending:     ["confirmed", "cancelled"],
  confirmed:   ["reminded", "cancelled"],
  reminded:    ["arrived", "no_show", "cancelled", "rescheduled"],
  arrived:     [],  // terminal — visit tier takes over
  no_show:     [],  // terminal
  cancelled:   [],  // terminal
  rescheduled: [],  // terminal — new order was created
};

export const VISIT_TRANSITIONS: Record<VisitStatusCode, VisitStatusCode[]> = {
  arrived:     ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed:   [],  // terminal
  cancelled:   [],  // terminal
};

// ===== Button config for UI =====
export interface StatusButton {
  targetStatus: string;
  label: string;
  icon: "check" | "bell" | "log-in" | "x" | "calendar" | "eye-off" | "play" | "check-circle" | "user-x";
  variant: "default" | "destructive" | "outline";
  needsConfirmation: boolean;
}

export const APPOINTMENT_BUTTONS: Record<AppointmentStatusCode, StatusButton[]> = {
  pending: [
    { targetStatus: "confirmed", label: "Xác nhận", icon: "check", variant: "default", needsConfirmation: false },
    { targetStatus: "cancelled", label: "Hủy lịch", icon: "x", variant: "destructive", needsConfirmation: true },
  ],
  confirmed: [
    { targetStatus: "reminded", label: "Đã nhắc lịch", icon: "bell", variant: "default", needsConfirmation: false },
    { targetStatus: "cancelled", label: "Hủy lịch", icon: "x", variant: "destructive", needsConfirmation: true },
  ],
  reminded: [
    { targetStatus: "arrived", label: "Đón khách", icon: "log-in", variant: "default", needsConfirmation: false },
    { targetStatus: "no_show", label: "Không đến", icon: "eye-off", variant: "destructive", needsConfirmation: true },
    { targetStatus: "rescheduled", label: "Dời lịch", icon: "calendar", variant: "outline", needsConfirmation: true },
    { targetStatus: "cancelled", label: "Hủy lịch", icon: "x", variant: "destructive", needsConfirmation: true },
  ],
  arrived: [],
  no_show: [],
  cancelled: [],
  rescheduled: [],
};

export const VISIT_BUTTONS: Record<VisitStatusCode, StatusButton[]> = {
  arrived: [
    { targetStatus: "in_progress", label: "Bắt đầu khám", icon: "play", variant: "default", needsConfirmation: false },
    { targetStatus: "cancelled", label: "Khách bỏ về", icon: "user-x", variant: "destructive", needsConfirmation: true },
  ],
  in_progress: [
    { targetStatus: "completed", label: "Hoàn thành khám", icon: "check-circle", variant: "default", needsConfirmation: false },
    { targetStatus: "cancelled", label: "Khách bỏ về", icon: "user-x", variant: "destructive", needsConfirmation: true },
  ],
  completed: [],
  cancelled: [],
};

// ===== Helper functions =====
export function getValidAppointmentTransitions(current: AppointmentStatusCode): AppointmentStatusCode[] {
  return APPOINTMENT_TRANSITIONS[current] || [];
}

export function getValidVisitTransitions(current: VisitStatusCode): VisitStatusCode[] {
  return VISIT_TRANSITIONS[current] || [];
}

export function isAppointmentTerminal(status: AppointmentStatusCode): boolean {
  return APPOINTMENT_TRANSITIONS[status]?.length === 0;
}

export function isVisitTerminal(status: VisitStatusCode): boolean {
  return VISIT_TRANSITIONS[status]?.length === 0;
}

export function getAppointmentStatusInfo(code: AppointmentStatusCode): StatusInfo {
  return APPOINTMENT_STATUSES[code] || APPOINTMENT_STATUSES.pending;
}

export function getVisitStatusInfo(code: VisitStatusCode): StatusInfo {
  return VISIT_STATUSES[code] || VISIT_STATUSES.arrived;
}

/**
 * @deprecated Per B4 R-2-1, dùng `ORDER_FILTER_TABS` (8 unified states).
 * Giữ tạm để không vỡ pages khác nếu có; orders.tsx đã migrate.
 */
export const APPOINTMENT_FILTER_TABS: { label: string; value: AppointmentStatusCode | "all" }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Chờ xác nhận", value: "pending" },
  { label: "Đã xác nhận", value: "confirmed" },
  { label: "Đã nhắc", value: "reminded" },
  { label: "Đã đến", value: "arrived" },
  { label: "Không đến", value: "no_show" },
  { label: "Đã hủy", value: "cancelled" },
  { label: "Dời lịch", value: "rescheduled" },
];

// ─────────────────────────────────────────────────────────────────
// Unified Order Status (B4 R-2-1) — derived từ (appt, visit) cũ
// ─────────────────────────────────────────────────────────────────
//
// Spec: audit-docs/B4-business-rules.md R-2-1
// Spec: audit-docs/B2-2-bpmn-flowchart.md Section 1.1
//
// Note: data model hiện tại vẫn 2-tier (appointmentStatus + visitStatus).
// Hàm `deriveOrderStatus()` dưới đây map (appt, visit) → 1-state unified
// để dùng cho filter chip ở orders.tsx. Order-detail giữ 2 badges.
// Full migration sang `orderStatus` 1-tier defer big audit.

export const ORDER_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "REFUND_FULL",
  "REFUND_PARTIAL",
] as const;
export type OrderStatusCode = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatusCode, string> = {
  DRAFT: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  IN_PROGRESS: "Đang khám",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Không đến",
  REFUND_FULL: "Hoàn tiền toàn phần",
  REFUND_PARTIAL: "Hoàn tiền 1 phần",
};

/**
 * Derive 8-state unified order status từ (appointmentStatus, visitStatus).
 *
 * Mapping (B2.2 v3 + Q&A chốt):
 *   - DRAFT          ← appt=pending
 *   - CONFIRMED      ← appt ∈ {confirmed, reminded}, visit=null
 *   - IN_PROGRESS    ← visit ∈ {arrived, in_progress}  (B2.2 v3: gộp checkin + exam)
 *   - COMPLETED      ← visit=completed
 *   - CANCELLED      ← appt=cancelled OR visit=cancelled OR appt=rescheduled
 *                       (rescheduled là legacy state — R-2-1 không có RESCHEDULED;
 *                        UI hiện subtitle "(đã dời lịch)" để phân biệt)
 *   - NO_SHOW        ← appt=no_show
 *   - REFUND_FULL    ← (defer Phase 2 — Isoft webhook order.refunded full)
 *   - REFUND_PARTIAL ← (defer Phase 2)
 */
export function deriveOrderStatus(
  appointmentStatus: string,
  visitStatus: string | null,
): OrderStatusCode {
  // Visit tier ưu tiên — đã đến phòng khám → state mạnh hơn appt
  if (visitStatus === "completed") return "COMPLETED";
  if (visitStatus === "in_progress" || visitStatus === "arrived") return "IN_PROGRESS";
  if (visitStatus === "cancelled") return "CANCELLED";
  // Appt tier (visit chưa có)
  if (appointmentStatus === "no_show") return "NO_SHOW";
  if (appointmentStatus === "cancelled" || appointmentStatus === "rescheduled") return "CANCELLED";
  if (appointmentStatus === "confirmed" || appointmentStatus === "reminded") return "CONFIRMED";
  // Mặc định: DRAFT (covers pending + edge cases)
  return "DRAFT";
}

/** Cờ phân biệt CANCELLED do reschedule vs hủy thật, để hiện subtitle "(đã dời lịch)". */
export function isRescheduled(appointmentStatus: string): boolean {
  return appointmentStatus === "rescheduled";
}

/** Filter chip cho orders.tsx — 9 options (Tất cả + 8 states). */
export const ORDER_FILTER_TABS: { label: string; value: OrderStatusCode | "all" }[] = [
  { label: "Tất cả", value: "all" },
  { label: ORDER_STATUS_LABEL.DRAFT, value: "DRAFT" },
  { label: ORDER_STATUS_LABEL.CONFIRMED, value: "CONFIRMED" },
  { label: ORDER_STATUS_LABEL.IN_PROGRESS, value: "IN_PROGRESS" },
  { label: ORDER_STATUS_LABEL.COMPLETED, value: "COMPLETED" },
  { label: ORDER_STATUS_LABEL.CANCELLED, value: "CANCELLED" },
  { label: ORDER_STATUS_LABEL.NO_SHOW, value: "NO_SHOW" },
  { label: ORDER_STATUS_LABEL.REFUND_FULL, value: "REFUND_FULL" },
  { label: ORDER_STATUS_LABEL.REFUND_PARTIAL, value: "REFUND_PARTIAL" },
];

// ===== Đơn trễ T+15p (dùng chung Dashboard đếm + trang Đơn hàng lọc) =====

/** Field tối thiểu để xét đơn trễ (tránh phụ thuộc type Order trong file này). */
type LateCheckOrder = {
  appointmentDate: string | null;
  appointmentTime: string | null;
  appointmentStatus: string;
  visitStatus: string | null;
};

/** Parse 'dd/MM/yyyy' + 'HH:mm' → Date thủ công (không dùng date-fns). null nếu sai/rỗng. */
function parseVNDateTime(dateStr: string | null, timeStr: string | null): Date | null {
  if (!dateStr || !timeStr) return null;
  const d = dateStr.split("/");
  const t = timeStr.split(":");
  if (d.length !== 3 || t.length < 2) return null;
  const [day, month, year] = d.map(Number);
  const [hour, minute] = t.map(Number);
  if ([day, month, year, hour, minute].some((n) => Number.isNaN(n))) return null;
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Đơn trễ T+15p: quá giờ hẹn 15 phút, trạng thái reminded/confirmed, chưa checkin.
 * Edge case T+30p auto NO_SHOW (R-2-2): đơn NO_SHOW không còn reminded/confirmed nên tự loại.
 */
export function isLate15min(order: LateCheckOrder): boolean {
  const scheduled = parseVNDateTime(order.appointmentDate, order.appointmentTime);
  if (!scheduled) return false;
  const cutoff = scheduled.getTime() + 15 * 60_000;
  if (Date.now() <= cutoff) return false;
  if (!["reminded", "confirmed"].includes(order.appointmentStatus)) return false;
  if (order.visitStatus) return false; // đã checkin
  return true;
}
