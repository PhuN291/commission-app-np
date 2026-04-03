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
  cancelled:   { label: "BN bỏ về",      badgeColor: "bg-[#fead9a]", badgeText: "text-[#8a1c1c]" },
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
    { targetStatus: "arrived", label: "Check-in", icon: "log-in", variant: "default", needsConfirmation: false },
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
    { targetStatus: "cancelled", label: "BN bỏ về", icon: "user-x", variant: "destructive", needsConfirmation: true },
  ],
  in_progress: [
    { targetStatus: "completed", label: "Hoàn thành khám", icon: "check-circle", variant: "default", needsConfirmation: false },
    { targetStatus: "cancelled", label: "BN bỏ về", icon: "user-x", variant: "destructive", needsConfirmation: true },
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

// Filter tabs for orders page
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
