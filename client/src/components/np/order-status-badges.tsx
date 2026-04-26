import {
  APPOINTMENT_STATUSES,
  VISIT_STATUSES,
  type AppointmentStatusCode,
  type VisitStatusCode,
} from "@shared/status";
import { Badge, type BadgeTone } from "./badge";

export const APPT_TONE: Record<AppointmentStatusCode, BadgeTone> = {
  pending: "attention",
  confirmed: "neutral",
  reminded: "neutral",
  arrived: "neutral",
  no_show: "critical",
  cancelled: "neutral",
  rescheduled: "attention",
};

export const VISIT_TONE: Record<VisitStatusCode, BadgeTone> = {
  arrived: "attention",
  in_progress: "neutral",
  completed: "success",
  cancelled: "critical",
};

export function getStatusTone(
  tier: "appointment" | "visit",
  code: string,
): BadgeTone {
  if (tier === "appointment") {
    return APPT_TONE[code as AppointmentStatusCode] ?? "neutral";
  }
  return VISIT_TONE[code as VisitStatusCode] ?? "neutral";
}

type OrderStatusBadgesProps = {
  appointmentStatus?: string;
  visitStatus?: string | null;
};

export function OrderStatusBadges({ appointmentStatus, visitStatus }: OrderStatusBadgesProps) {
  const a = appointmentStatus
    ? APPOINTMENT_STATUSES[appointmentStatus as AppointmentStatusCode]
    : null;
  const v = visitStatus ? VISIT_STATUSES[visitStatus as VisitStatusCode] : null;
  const apptTone = appointmentStatus ? APPT_TONE[appointmentStatus as AppointmentStatusCode] : "neutral";
  const visitTone = visitStatus ? VISIT_TONE[visitStatus as VisitStatusCode] : "neutral";
  return (
    <div className="inline-flex flex-wrap gap-1">
      {a && <Badge tone={apptTone ?? "neutral"}>{a.label}</Badge>}
      {v && <Badge tone={visitTone ?? "neutral"}>{v.label}</Badge>}
    </div>
  );
}
