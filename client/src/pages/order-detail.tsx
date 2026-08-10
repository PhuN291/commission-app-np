import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, authFetch, getCurrentUserId } from "@/lib/queryClient";
import { useLocation, useRoute } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  EyeOff,
  FileText,
  History,
  LogIn,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Play,
  Plus,
  Receipt,
  RefreshCw,
  Stethoscope,
  StickyNote,
  User,
  UserCog,
  UserX,
  X,
} from "lucide-react";
import {
  Avatar,
  Card,
  Chev,
  DetailHeader,
  NPButton,
  OrderStatusBadges,
  Row,
  Screen,
  SectionTitle,
  getStatusTone,
  useTabNav,
} from "@/components/np";
import { Badge as NPBadge } from "@/components/np/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  APPOINTMENT_BUTTONS,
  APPOINTMENT_STATUSES,
  VISIT_BUTTONS,
  VISIT_STATUSES,
  type AppointmentStatusCode,
  type StatusButton,
  type VisitStatusCode,
} from "@shared/status";
import type { Customer, Order, StatusLog } from "@shared/schema";
import {
  CR_STATUS_LABEL,
  ROLE_LABEL,
  SKIPPED_REASON_LABEL,
  canKhieuNai,
  hoursRemainingKhieuNai,
  type CRStatus,
  type OrderItemStatus,
  type SkippedReason,
  type UserRole,
} from "@shared/types";
import { Textarea } from "@/components/ui/textarea";

// ─────────────────────────────────────────────────────────────────
// Extended types from /api/orders/:id
// ─────────────────────────────────────────────────────────────────

type APIOrderItem = {
  id: string;
  orderId: number;
  serviceName: string;
  price: number;
  cost: number;
  status: OrderItemStatus;
  skippedReason: SkippedReason | null;
  refundedAmount: number;
};

type APICommissionRecord = {
  id: string;
  orderId: number;
  role: "sale" | "tc" | "doctor";
  userId: number;
  amount: number;
  status: CRStatus;
  createdAt: number;
  rejectedAt: number | null;
  rejectedReason: string | null;
};

type OrderWithDetails = Order & {
  items: APIOrderItem[];
  crs: APICommissionRecord[];
};


function fmtVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

const BUTTON_ICONS: Record<StatusButton["icon"], LucideIcon> = {
  check: Check,
  bell: Bell,
  "log-in": LogIn,
  x: X,
  calendar: Calendar,
  "eye-off": EyeOff,
  play: Play,
  "check-circle": CheckCircle,
  "user-x": UserX,
};

const TIME_SLOTS = [
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00",
];

export default function OrderDetail() {
  const { active, onTab } = useTabNav();
  const [, params] = useRoute("/orders/:id");
  const [, navigate] = useLocation();
  const orderId = params?.id ? parseInt(params.id, 10) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: "", description: "", action: () => {} });

  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  // Permission + identity (B5-3 Section 2 + R-9-1)
  const role = (typeof window !== "undefined" ? localStorage.getItem("np_role") : null) as UserRole | null;
  const currentUserId = parseInt(
    (typeof window !== "undefined" ? localStorage.getItem("np_user_id") : null) ?? "0",
    10,
  );
  const canRejectCR = role === "kt";

  // Per-section edit state — null = không edit, key xác định section nào đang edit.

  // Reject CR dialog state (KT only)
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; cr: APICommissionRecord | null; reason: string }>({
    open: false,
    cr: null,
    reason: "",
  });

  // Khiếu nại dialog state (NV/BS only)
  const [complaintDialog, setComplaintDialog] = useState<{ open: boolean; cr: APICommissionRecord | null; content: string }>({
    open: false,
    cr: null,
    content: "",
  });

  // Namespace queryKey theo userId để tránh React Query cache leak khi switch user
  // (staleTime: Infinity + key shared across users → user B đọc cache user A).
  const uid = getCurrentUserId();
  const { data: order, isLoading } = useQuery<OrderWithDetails>({
    queryKey: [`/api/orders/${orderId}`, uid],
    enabled: orderId > 0,
  });
  const { data: allOrders = [] } = useQuery<Order[]>({ queryKey: ["/api/orders", uid] });
  const { data: allCustomers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers", uid] });
  const { data: statusLogs = [] } = useQuery<StatusLog[]>({
    queryKey: [`/api/orders/${orderId}/status-logs`, uid],
    enabled: orderId > 0,
  });
  const { data: assignee } = useQuery<{ id: number; name: string; avatar: string | null; role: string }>({
    queryKey: [`/api/users/${order?.userId}`, uid],
    enabled: !!order?.userId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`, uid] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders", uid] });
    queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/status-logs`, uid] });
  };

  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/appointment-status`, { status, note });
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Đã cập nhật trạng thái lịch hẹn" });
    },
    onError: () => {
      toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái", variant: "destructive" });
    },
  });

  const updateVisitStatus = useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/visit-status`, { status, note });
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Đã cập nhật trạng thái khám" });
    },
    onError: () => {
      toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái khám", variant: "destructive" });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async (notes: string) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/notes`, { notes });
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      setEditingNote(false);
      toast({ title: "Đã lưu ghi chú" });
    },
    onError: () => {
      toast({ title: "Lỗi", description: "Không lưu được ghi chú", variant: "destructive" });
    },
  });

  const rescheduleOrder = useMutation({
    mutationFn: async ({ appointmentDate, appointmentTime }: { appointmentDate: string; appointmentTime: string }) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/reschedule`, { appointmentDate, appointmentTime });
      return res.json();
    },
    onSuccess: (data) => {
      invalidateAll();
      toast({ title: "Đã dời lịch", description: `Đơn mới: ${data.newOrder.code}` });
      setRescheduleDialog(false);
      navigate(`/orders/${data.newOrder.id}`);
    },
    onError: () => {
      toast({ title: "Lỗi", description: "Không thể dời lịch", variant: "destructive" });
    },
  });

  // Reject CR — KT only
  const rejectCRMutation = useMutation({
    mutationFn: async (input: { crId: string; reason: string }) => {
      const res = await authFetch(`/api/orders/${orderId}/cr/${input.crId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: input.reason }),
      });
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã từ chối hoa hồng" });
      invalidateAll();
      setRejectDialog({ open: false, cr: null, reason: "" });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi", description: err?.error || "Không thể từ chối", variant: "destructive" });
    },
  });

  // Khiếu nại CR — Sale/Doctor + ownership + 3-day window
  const complaintMutation = useMutation({
    mutationFn: async (input: { crId: string; content: string }) => {
      const res = await authFetch(`/api/orders/${orderId}/cr/${input.crId}/complaint`, {
        method: "POST",
        body: JSON.stringify({ content: input.content }),
      });
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã gửi khiếu nại", description: "Kế toán sẽ xem lại trong 1-2 ngày." });
      invalidateAll();
      setComplaintDialog({ open: false, cr: null, content: "" });
    },
    onError: (err: any) => {
      const msg =
        err?.error === "ownership"
          ? "Chỉ có thể khiếu nại hoa hồng của mình"
          : err?.error === "window_expired"
            ? "Đã quá hạn khiếu nại (3 ngày)"
            : err?.error === "invalid_state"
              ? "Hoa hồng không thể khiếu nại"
              : "Không thể gửi khiếu nại";
      toast({ title: "Lỗi", description: msg, variant: "destructive" });
    },
  });

  const handleAppointmentAction = (btn: StatusButton) => {
    if (btn.targetStatus === "rescheduled") {
      setNewDate("");
      setNewTime("");
      setRescheduleDialog(true);
      return;
    }
    if (btn.needsConfirmation) {
      const info = APPOINTMENT_STATUSES[btn.targetStatus as AppointmentStatusCode];
      setConfirmDialog({
        open: true,
        title: `Xác nhận: ${info?.label || btn.label}`,
        description: `Chuyển trạng thái lịch hẹn sang "${info?.label}"? Không thể hoàn tác.`,
        action: () => {
          updateAppointmentStatus.mutate({ status: btn.targetStatus });
          setConfirmDialog((p) => ({ ...p, open: false }));
        },
      });
    } else {
      updateAppointmentStatus.mutate({ status: btn.targetStatus });
    }
  };

  const handleVisitAction = (btn: StatusButton) => {
    if (btn.needsConfirmation) {
      const info = VISIT_STATUSES[btn.targetStatus as VisitStatusCode];
      setConfirmDialog({
        open: true,
        title: `Xác nhận: ${info?.label || btn.label}`,
        description: `Chuyển trạng thái khám sang "${info?.label}"? Không thể hoàn tác.`,
        action: () => {
          updateVisitStatus.mutate({ status: btn.targetStatus });
          setConfirmDialog((p) => ({ ...p, open: false }));
        },
      });
    } else {
      updateVisitStatus.mutate({ status: btn.targetStatus });
    }
  };

  if (isLoading || !order) {
    return (
      <Screen activeTab={active} onTab={onTab} noHeader>
        <DetailHeader title="Đơn hàng" onBack={() => navigate("/orders")} />
        <div className="flex flex-1 items-center justify-center py-20">
          {isLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
          ) : (
            <p className="text-np-text-muted">Không tìm thấy đơn hàng</p>
          )}
        </div>
      </Screen>
    );
  }

  const appointmentStatus = order.appointmentStatus as AppointmentStatusCode;
  const visitStatus = order.visitStatus as VisitStatusCode | null;
  const appointmentButtons = APPOINTMENT_BUTTONS[appointmentStatus] || [];
  const visitButtons = visitStatus ? VISIT_BUTTONS[visitStatus] || [] : [];

  const currentIndex = allOrders.findIndex((o) => o.id === orderId);
  const prevOrder = currentIndex > 0 ? allOrders[currentIndex - 1] : null;
  const nextOrder = currentIndex < allOrders.length - 1 ? allOrders[currentIndex + 1] : null;
  const matchedCustomer = allCustomers.find((c) => c.phone === order.phone);
  const ratePct = order.totalPrice > 0 ? ((order.commission / order.totalPrice) * 100).toFixed(1) : "0";

  // Mock team — TODO: replace với API thực khi backend hỗ trợ multi-assignee
  const orderTeam: { id: number; name: string; role: string }[] = [
    ...(assignee ? [{ id: assignee.id, name: assignee.name, role: "Điều dưỡng" }] : []),
    { id: -101, name: "Lê Thị Tuyết", role: "Điều dưỡng trưởng" },
    { id: -102, name: "Nguyễn Đức Trần", role: "Bác sĩ" },
  ];

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader
        title={order.code}
        subtitle={`Tạo ${order.createdAt}`}
        onBack={() => navigate("/orders")}
        trailing={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => prevOrder && navigate(`/orders/${prevOrder.id}`)}
              disabled={!prevOrder}
              aria-label="Đơn trước"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-np-button bg-transparent hover:bg-np-surface-sub disabled:opacity-40"
            >
              <ChevronLeft size={20} strokeWidth={2.25} className="text-np-ink" />
            </button>
            <button
              type="button"
              onClick={() => nextOrder && navigate(`/orders/${nextOrder.id}`)}
              disabled={!nextOrder}
              aria-label="Đơn sau"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-np-button bg-transparent hover:bg-np-surface-sub disabled:opacity-40"
            >
              <ChevronRight size={20} strokeWidth={2.25} className="text-np-ink" />
            </button>
          </div>
        }
      />

      <div className="bg-np-surface-sub">
        {/* Status summary */}
        <div className="px-4 py-4">
          <div className="mb-2.5 flex items-baseline justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-np-text-muted">
                Tổng đơn
              </div>
              <div
                className={
                  "mt-0.5 text-[28px] font-extrabold leading-none tracking-[-0.8px] tabular-nums " +
                  (order.refundType === "full"
                    ? "text-np-text-muted line-through"
                    : "text-np-ink")
                }
              >
                {fmtVND(order.totalPrice)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-np-text-muted">
                Hoa hồng
              </div>
              <div className="mt-0.5 text-[18px] font-extrabold text-np-brand-ink tabular-nums">
                +{fmtVND(order.commission)}
              </div>
            </div>
          </div>
          <OrderStatusBadges
            appointmentStatus={order.appointmentStatus}
            visitStatus={order.visitStatus}
          />
          {/* %cap intentionally hidden per task spec (B5-3 Section 2). */}
        </div>

        {/* Refund banner (B5-3 Section 2.10) */}
        {order.refundType !== "none" && (
          <div className="mx-4 mb-3 mt-1 rounded-np-card border border-np-danger-bg bg-np-danger-bg/30 p-3">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-extrabold uppercase tracking-[0.4px] text-np-danger">
                {order.refundType === "full"
                  ? "ĐÃ HOÀN TIỀN TOÀN PHẦN"
                  : `Đã hoàn tiền ${fmtVND(order.refundAmount)}`}
              </span>
            </div>
            {order.refundReason && (
              <div className="mt-1 text-[12px] font-medium text-np-text-sub">
                Lý do: {order.refundReason}
              </div>
            )}
          </div>
        )}

        {/* Phụ trách */}
        {orderTeam.length > 0 && (
          <>
            <SectionTitle icon={UserCog}>Phụ trách</SectionTitle>
            <Card className="overflow-hidden p-0">
              {orderTeam.map((m, i) => (
                <div
                  key={m.id}
                  className={
                    "flex items-center gap-3 px-4 py-3" +
                    (i === orderTeam.length - 1 ? "" : " border-b border-np-surface-pressed")
                  }
                >
                  <Avatar name={m.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <span className="text-[14px] font-semibold text-np-ink">{m.name}</span>
                    <span className="ml-1.5 text-[12px] text-np-text-muted">· {m.role}</span>
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}

        {/* Khách hàng */}
        <SectionTitle icon={User}>Khách hàng</SectionTitle>
        <Card className="overflow-hidden p-0">
          <Row
            leading={<Avatar name={order.patientName} size={44} />}
            title={order.patientName}
            subtitle={`Mã khách hàng: ${String(order.id).padStart(4, "0")}`}
            trailing={matchedCustomer ? <Chev /> : undefined}
            onClick={matchedCustomer ? () => navigate(`/customers/${matchedCustomer.id}`) : undefined}
          />
          <InfoRow icon={Phone} label="Số điện thoại" value={order.phone} />
          {order.email && <InfoRow icon={Mail} label="Email" value={order.email} />}
          {order.examType && <InfoRow icon={MapPin} label="Hình thức" value={order.examType} last />}
        </Card>

        {/* Dịch vụ — multi-item với mark UI cho BS/KT/CEO */}
        <SectionTitle icon={Stethoscope}>Dịch vụ ({order.items?.length ?? 1})</SectionTitle>
        <Card className="overflow-hidden p-0">
          {(order.items ?? []).map((item, i) => (
            <ItemRow
              key={item.id}
              item={item}
              isFullRefund={order.refundType === "full"}
              last={i === (order.items?.length ?? 1) - 1}
            />
          ))}

          {/* Tổng cộng */}
          <div className="flex flex-col gap-1.5 px-4 py-3">
            <div className="flex justify-between text-[13px] font-medium text-np-text-sub">
              <span>Tạm tính</span>
              <span className={"tabular-nums " + (order.refundType === "full" ? "line-through opacity-60" : "")}>
                {fmtVND(order.totalPrice)}
              </span>
            </div>
            {order.refundType === "partial" && (
              <div className="flex justify-between text-[13px] font-medium text-np-danger">
                <span>Hoàn tiền</span>
                <span className="tabular-nums">-{fmtVND(order.refundAmount)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-np-border pt-2 text-[15px] font-extrabold text-np-ink">
              <span>Tổng cộng</span>
              <span
                className={
                  "tabular-nums " + (order.refundType === "full" ? "line-through opacity-60" : "")
                }
              >
                {fmtVND(order.totalPrice - (order.refundType === "partial" ? order.refundAmount : 0))}
              </span>
            </div>
          </div>
        </Card>

        {/* Bảng kê hoa hồng — CR per role với reject (KT) + khiếu nại (NV) */}
        {order.crs && order.crs.length > 0 && (
          <>
            <SectionTitle icon={Receipt}>Bảng kê hoa hồng</SectionTitle>
            <Card className="overflow-hidden p-0">
              {order.crs.map((cr, i) => (
                <CRRow
                  key={cr.id}
                  cr={cr}
                  currentUserId={currentUserId}
                  canReject={canRejectCR}
                  onReject={() => setRejectDialog({ open: true, cr, reason: "" })}
                  onComplaint={() => setComplaintDialog({ open: true, cr, content: "" })}
                  last={i === order.crs.length - 1}
                />
              ))}
            </Card>
          </>
        )}

        {/* Lịch hẹn — chỉ hiện khi có ngày hoặc giờ hẹn */}
        {(order.appointmentDate || order.appointmentTime) && (
          <>
            <SectionTitle icon={Calendar}>Lịch hẹn</SectionTitle>
            <Card className="overflow-hidden p-0">
              {order.appointmentDate && (
                <InfoRow
                  icon={CalendarDays}
                  label="Ngày hẹn"
                  value={order.appointmentDate}
                  last={!order.appointmentTime}
                />
              )}
              {order.appointmentTime && (
                <InfoRow icon={Clock} label="Giờ hẹn" value={order.appointmentTime} last />
              )}
            </Card>
          </>
        )}

        {/* Lịch sử trạng thái */}
        {statusLogs.length > 0 && (
          <>
            <SectionTitle icon={History}>Lịch sử trạng thái</SectionTitle>
            <Card className="p-4">
              <div className="relative space-y-4 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-np-border">
                {statusLogs.map((log) => {
                  const isAppt = log.tier === "appointment";
                  const fromInfo = isAppt
                    ? APPOINTMENT_STATUSES[log.fromStatus as AppointmentStatusCode]
                    : VISIT_STATUSES[log.fromStatus as VisitStatusCode];
                  const toInfo = isAppt
                    ? APPOINTMENT_STATUSES[log.toStatus as AppointmentStatusCode]
                    : VISIT_STATUSES[log.toStatus as VisitStatusCode];
                  return (
                    <div key={log.id} className="relative min-h-[36px] pl-10">
                      <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-np-border bg-white text-np-text-sub">
                        <RefreshCw size={14} strokeWidth={2.25} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[12px] font-bold text-np-ink">
                            {isAppt ? "Cập nhật lịch hẹn" : "Cập nhật khám"}
                          </span>
                          <span className="text-[11px] text-np-text-muted">{log.timestamp}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {fromInfo && (
                            <NPBadge tone={getStatusTone(log.tier as "appointment" | "visit", log.fromStatus)}>
                              {fromInfo.label}
                            </NPBadge>
                          )}
                          <span className="text-[10px] text-np-text-muted">→</span>
                          {toInfo && (
                            <NPBadge tone={getStatusTone(log.tier as "appointment" | "visit", log.toStatus)}>
                              {toInfo.label}
                            </NPBadge>
                          )}
                        </div>
                        {log.note && (
                          <p className="text-[13px] leading-relaxed text-np-text-sub">{log.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}

        {/* Hóa đơn VAT */}
        {(order.vatCompanyName || order.vatTaxCode) && (
          <>
            <SectionTitle icon={FileText}>Hóa đơn VAT</SectionTitle>
            <Card className="space-y-2.5 p-4">
              {order.vatCompanyName && <KeyVal label="Tên công ty" value={order.vatCompanyName} />}
              {order.vatTaxCode && <KeyVal label="Mã số thuế" value={order.vatTaxCode} />}
              {order.vatCompanyAddress && <KeyVal label="Địa chỉ" value={order.vatCompanyAddress} />}
              {order.vatEmail && <KeyVal label="Email" value={order.vatEmail} valueClass="text-np-link" />}
            </Card>
          </>
        )}

        {/* Ghi chú — đọc + sửa + lưu */}
        <SectionTitle
          icon={StickyNote}
          action={
            !editingNote && order.notes ? (
              <button
                type="button"
                onClick={() => {
                  setNoteDraft(order.notes ?? "");
                  setEditingNote(true);
                }}
                className="text-[12px] font-semibold text-np-link hover:underline"
              >
                Sửa
              </button>
            ) : undefined
          }
        >
          Ghi chú
        </SectionTitle>
        <Card className="p-4">
          {editingNote ? (
            <div className="space-y-3">
              <Textarea
                autoFocus
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Nhập ghi chú cho đơn..."
                className="h-24 resize-none"
              />
              <div className="flex items-center gap-2">
                <NPButton
                  size="sm"
                  tone="primary"
                  disabled={updateNotes.isPending || noteDraft.trim() === (order.notes ?? "").trim()}
                  onClick={() => updateNotes.mutate(noteDraft.trim())}
                >
                  {updateNotes.isPending ? "Đang lưu..." : "Lưu"}
                </NPButton>
                <NPButton size="sm" tone="ghost" onClick={() => setEditingNote(false)}>
                  Hủy
                </NPButton>
              </div>
            </div>
          ) : order.notes ? (
            <p className="flex items-start gap-2 text-[13px] text-np-text-sub">
              <FileText size={14} strokeWidth={2.25} className="mt-0.5 flex-shrink-0 text-np-text-muted" />
              {order.notes}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNoteDraft("");
                setEditingNote(true);
              }}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-np-link hover:underline"
            >
              <Plus size={15} strokeWidth={2.25} />
              Thêm ghi chú
            </button>
          )}
        </Card>

        {/* Spacer để content cuối không bị che bởi action bar absolute */}
        {(appointmentButtons.length > 0 || visitButtons.length > 0) && <div className="h-[88px]" />}

        <div className="h-5" />
      </div>

      {/* Compact action bar — absolute pin trên TabBar, luôn visible */}
      {(appointmentButtons.length > 0 || visitButtons.length > 0) &&
        (() => {
          const allActions: Array<StatusButton & { tier: "appointment" | "visit" }> = [
            ...appointmentButtons.map((b) => ({ ...b, tier: "appointment" as const })),
            ...(visitStatus ? visitButtons.map((b) => ({ ...b, tier: "visit" as const })) : []),
          ];
          const primary = allActions.find((b) => b.variant === "default") ?? allActions[0];
          const hasMore = allActions.length > 1;
          const PrimaryIcon = BUTTON_ICONS[primary.icon];
          const handle = (a: typeof primary) =>
            a.tier === "appointment" ? handleAppointmentAction(a) : handleVisitAction(a);

          return (
            <div className="absolute bottom-[64px] left-0 right-0 z-20 border-t border-np-border bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2">
                <NPButton
                  size="lg"
                  tone={
                    primary.variant === "destructive"
                      ? "dark"
                      : primary.variant === "outline"
                      ? "ghost"
                      : "primary"
                  }
                  icon={PrimaryIcon}
                  className="flex-1 justify-center"
                  onClick={() => handle(primary)}
                  disabled={updateAppointmentStatus.isPending || updateVisitStatus.isPending}
                >
                  {primary.label}
                </NPButton>
                {hasMore && (
                  <button
                    type="button"
                    aria-label="Hành động khác"
                    onClick={() => setActionsSheetOpen(true)}
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-np-button border border-np-border-strong bg-white text-np-ink transition-colors hover:bg-np-surface-sub"
                  >
                    <MoreHorizontal size={20} strokeWidth={2.25} />
                  </button>
                )}
              </div>
            </div>
          );
        })()}

      {/* Confirm dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((p) => ({ ...p, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.action}>Xác nhận</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule dialog */}
      <Dialog open={rescheduleDialog} onOpenChange={setRescheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dời lịch hẹn</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-[13px] text-np-text-sub">
              Chọn ngày giờ mới. Đơn hiện tại chuyển "Dời lịch", tạo đơn mới ở trạng thái "Đã xác nhận".
            </p>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-np-text-sub">Ngày hẹn mới</label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  setNewTime("");
                }}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            {newDate && (
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-np-text-sub">Giờ hẹn mới</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setNewTime(time)}
                      className={`h-8 rounded-np-button border text-[12px] font-medium transition-all ${
                        newTime === time
                          ? "border-np-brand-ink bg-np-brand-ink text-white"
                          : "border-np-border-strong bg-np-surface-sub text-np-ink hover:border-np-brand-ink hover:text-np-brand-ink"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <NPButton tone="ghost" onClick={() => setRescheduleDialog(false)}>
              Hủy bỏ
            </NPButton>
            <NPButton
              tone="primary"
              disabled={!newDate || !newTime || rescheduleOrder.isPending}
              onClick={() => {
                const formattedDate = newDate.split("-").reverse().join("/");
                rescheduleOrder.mutate({ appointmentDate: formattedDate, appointmentTime: newTime });
              }}
            >
              {rescheduleOrder.isPending ? "Đang xử lý..." : "Xác nhận dời lịch"}
            </NPButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overflow actions sheet */}
      <Sheet open={actionsSheetOpen} onOpenChange={setActionsSheetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-[390px] gap-0 rounded-t-np-sheet border-0 bg-white p-0"
        >
          <div className="flex justify-center pt-2">
            <div className="h-1 w-9 rounded-full bg-np-border-strong" />
          </div>
          <SheetHeader className="px-5 pb-3 pt-3 text-left">
            <SheetTitle className="text-[17px] font-bold tracking-[-0.1px] text-np-ink">
              Hành động
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-2 px-4 pb-6">
            {appointmentButtons.length > 0 && (
              <>
                <div className="px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-np-text-muted">
                  Lịch hẹn
                </div>
                {appointmentButtons.map((btn) => {
                  const Icon = BUTTON_ICONS[btn.icon];
                  return (
                    <NPButton
                      key={`sheet-appt-${btn.targetStatus}`}
                      size="md"
                      tone={
                        btn.variant === "destructive"
                          ? "dark"
                          : btn.variant === "outline"
                          ? "ghost"
                          : "primary"
                      }
                      icon={Icon}
                      className="w-full justify-start"
                      onClick={() => {
                        setActionsSheetOpen(false);
                        handleAppointmentAction(btn);
                      }}
                      disabled={updateAppointmentStatus.isPending}
                    >
                      {btn.label}
                    </NPButton>
                  );
                })}
              </>
            )}
            {visitStatus && visitButtons.length > 0 && (
              <>
                <div className="px-1 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.6px] text-np-text-muted">
                  Khám bệnh
                </div>
                {visitButtons.map((btn) => {
                  const Icon = BUTTON_ICONS[btn.icon];
                  return (
                    <NPButton
                      key={`sheet-visit-${btn.targetStatus}`}
                      size="md"
                      tone={
                        btn.variant === "destructive"
                          ? "dark"
                          : btn.variant === "outline"
                          ? "ghost"
                          : "primary"
                      }
                      icon={Icon}
                      className="w-full justify-start"
                      onClick={() => {
                        setActionsSheetOpen(false);
                        handleVisitAction(btn);
                      }}
                      disabled={updateVisitStatus.isPending}
                    >
                      {btn.label}
                    </NPButton>
                  );
                })}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Reject CR dialog (KT only) */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((p) => ({ ...p, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối hoa hồng</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-[13px] text-np-text-sub">
              Hoa hồng {rejectDialog.cr ? ROLE_LABEL[rejectDialog.cr.role as UserRole] : ""}{" "}
              ·{" "}
              <span className="font-bold text-np-ink">
                {rejectDialog.cr ? fmtVND(rejectDialog.cr.amount) : ""}
              </span>
            </p>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-np-text-sub">
                Lý do từ chối
              </label>
              <Textarea
                placeholder="VD: Số đơn không khớp với số liệu hệ thống..."
                value={rejectDialog.reason}
                onChange={(e) => setRejectDialog((p) => ({ ...p, reason: e.target.value }))}
              />
            </div>
            <p className="text-[11px] leading-relaxed text-np-text-muted">
              Nhân viên có thể khiếu nại trong 3 ngày sau khi bị từ chối.
            </p>
          </div>
          <DialogFooter>
            <NPButton tone="ghost" onClick={() => setRejectDialog({ open: false, cr: null, reason: "" })}>
              Hủy
            </NPButton>
            <NPButton
              tone="dark"
              disabled={!rejectDialog.reason || rejectDialog.reason.length < 2 || rejectCRMutation.isPending}
              onClick={() =>
                rejectDialog.cr &&
                rejectCRMutation.mutate({ crId: rejectDialog.cr.id, reason: rejectDialog.reason })
              }
            >
              {rejectCRMutation.isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
            </NPButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Khiếu nại dialog (NV/BS owner only, 3-day window) */}
      <Dialog
        open={complaintDialog.open}
        onOpenChange={(open) => setComplaintDialog((p) => ({ ...p, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Khiếu nại hoa hồng</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {complaintDialog.cr && complaintDialog.cr.rejectedReason && (
              <div className="rounded-np-button border border-np-border bg-np-surface-sub p-3 text-[12px] text-np-text-sub">
                <div className="font-bold text-np-text-sub">Lý do từ chối:</div>
                <div className="mt-0.5 text-np-ink">{complaintDialog.cr.rejectedReason}</div>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-np-text-sub">
                Nội dung khiếu nại
              </label>
              <Textarea
                placeholder="Trình bày lý do khiếu nại để kế toán xem lại..."
                value={complaintDialog.content}
                onChange={(e) => setComplaintDialog((p) => ({ ...p, content: e.target.value }))}
              />
            </div>
            <p className="text-[11px] leading-relaxed text-np-text-muted">
              Khiếu nại trong vòng 3 ngày sau khi hoa hồng bị từ chối. Kế toán sẽ xem lại trong 1-2 ngày.
            </p>
          </div>
          <DialogFooter>
            <NPButton tone="ghost" onClick={() => setComplaintDialog({ open: false, cr: null, content: "" })}>
              Hủy
            </NPButton>
            <NPButton
              tone="primary"
              disabled={!complaintDialog.content || complaintDialog.content.length < 2 || complaintMutation.isPending}
              onClick={() =>
                complaintDialog.cr &&
                complaintMutation.mutate({
                  crId: complaintDialog.cr.id,
                  content: complaintDialog.content,
                })
              }
            >
              {complaintMutation.isPending ? "Đang gửi..." : "Gửi khiếu nại"}
            </NPButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}

function ItemRow({
  item,
  isFullRefund,
  last,
}: {
  item: APIOrderItem;
  isFullRefund: boolean;
  last?: boolean;
}) {
  // Status display-only — populate qua iHOS webhook (Phase 2). KHÔNG có manual mark
  // ở app HH vì status là trạng thái khám thực tế, không phải data entry user-side.
  const isStruck = item.status === "skipped" || isFullRefund;
  return (
    <div
      className={
        "px-4 py-3.5" + (last ? "" : " border-b border-np-surface-pressed")
      }
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className={"text-[14px] font-bold " + (isStruck ? "text-np-text-muted line-through" : "text-np-ink")}>
            {item.serviceName}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.status === "completed" && <NPBadge tone="success">Hoàn thành</NPBadge>}
            {item.status === "skipped" && (
              <NPBadge tone="critical">
                Bỏ qua{item.skippedReason ? ` · ${SKIPPED_REASON_LABEL[item.skippedReason]}` : ""}
              </NPBadge>
            )}
            {item.status === "planned" && <NPBadge tone="attention">Chưa thực hiện</NPBadge>}
          </div>
        </div>
        <div className={"flex-shrink-0 text-[14px] font-bold tabular-nums " + (isStruck ? "text-np-text-muted line-through" : "text-np-ink")}>
          {fmtVND(item.price)}
        </div>
      </div>
    </div>
  );
}

function CRRow({
  cr,
  currentUserId,
  canReject,
  onReject,
  onComplaint,
  last,
}: {
  cr: APICommissionRecord;
  currentUserId: number;
  canReject: boolean;
  onReject: () => void;
  onComplaint: () => void;
  last?: boolean;
}) {
  const isOwner = cr.userId === currentUserId;
  const showKhieuNai = isOwner && cr.status === "TU_CHOI";
  const eligible = canKhieuNai({ status: cr.status, rejectedAt: cr.rejectedAt });
  const hoursLeft = hoursRemainingKhieuNai(cr.rejectedAt);
  const showReject = canReject && cr.status === "CHO_DUYET";

  const statusTone =
    cr.status === "DUOC_DUYET"
      ? "success"
      : cr.status === "TU_CHOI"
        ? "critical"
        : cr.status === "KHIEU_NAI"
          ? "attention"
          : "neutral";

  return (
    <div
      className={
        "px-4 py-3.5" + (last ? "" : " border-b border-np-surface-pressed")
      }
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[14px] font-bold text-np-ink">
              {ROLE_LABEL[cr.role as UserRole]}
            </span>
            <NPBadge tone={statusTone as any}>{CR_STATUS_LABEL[cr.status]}</NPBadge>
          </div>
          {cr.status === "TU_CHOI" && cr.rejectedReason && (
            <div className="mt-1 text-[11px] text-np-text-sub">
              Lý do: {cr.rejectedReason}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-[14px] font-extrabold text-np-brand-ink tabular-nums">
          {fmtVND(cr.amount)}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-2 flex flex-wrap gap-2">
        {showReject && (
          <NPButton tone="dark" size="sm" onClick={onReject}>
            Từ chối hoa hồng
          </NPButton>
        )}
        {showKhieuNai &&
          (eligible ? (
            <NPButton tone="primary" size="sm" onClick={onComplaint}>
              Khiếu nại hoa hồng (Còn {hoursLeft}h)
            </NPButton>
          ) : (
            <NPButton tone="ghost" size="sm" disabled>
              Quá hạn khiếu nại (3 ngày)
            </NPButton>
          ))}
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  last,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        last ? "" : "border-b border-np-surface-pressed"
      }`}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-np-surface-sub">
        <Icon size={15} strokeWidth={2.25} className="text-np-text-sub" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-np-text-muted">
          {label}
        </div>
        <div className="mt-0.5 truncate text-[14px] font-semibold text-np-ink">{value || "-"}</div>
      </div>
    </div>
  );
}

function KeyVal({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start gap-2 text-[13px]">
      <span className="w-28 flex-shrink-0 text-np-text-muted">{label}:</span>
      <span className={`font-medium text-np-ink ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}
