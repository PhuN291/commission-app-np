import { Badge } from "@/components/ui/badge";
import {
  APPOINTMENT_STATUSES,
  VISIT_STATUSES,
  type AppointmentStatusCode,
  type VisitStatusCode,
} from "@shared/status";

interface OrderStatusBadgesProps {
  appointmentStatus: string;
  visitStatus?: string | null;
  size?: "sm" | "md";
}

export function OrderStatusBadges({ appointmentStatus, visitStatus, size = "sm" }: OrderStatusBadgesProps) {
  const apptInfo = APPOINTMENT_STATUSES[appointmentStatus as AppointmentStatusCode];
  const visitInfo = visitStatus ? VISIT_STATUSES[visitStatus as VisitStatusCode] : null;

  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {apptInfo && (
        <Badge className={`rounded-md ${textSize} font-bold border-0 px-2 py-0.5 ${apptInfo.badgeColor} ${apptInfo.badgeText}`}>
          {apptInfo.label}
        </Badge>
      )}
      {visitInfo && (
        <Badge className={`rounded-md ${textSize} font-bold border-0 px-2 py-0.5 ${visitInfo.badgeColor} ${visitInfo.badgeText}`}>
          {visitInfo.label}
        </Badge>
      )}
    </div>
  );
}

interface SingleStatusBadgeProps {
  status: string;
  tier: "appointment" | "visit";
  size?: "sm" | "md";
}

export function SingleStatusBadge({ status, tier, size = "sm" }: SingleStatusBadgeProps) {
  const info = tier === "appointment"
    ? APPOINTMENT_STATUSES[status as AppointmentStatusCode]
    : VISIT_STATUSES[status as VisitStatusCode];

  if (!info) return null;

  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <Badge className={`rounded-md ${textSize} font-bold border-0 px-2 py-0.5 ${info.badgeColor} ${info.badgeText}`}>
      {info.label}
    </Badge>
  );
}
