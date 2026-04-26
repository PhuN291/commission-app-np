import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  LogIn,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Play,
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

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: [`/api/orders/${orderId}`],
    enabled: orderId > 0,
  });
  const { data: allOrders = [] } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const { data: allCustomers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: statusLogs = [] } = useQuery<StatusLog[]>({
    queryKey: [`/api/orders/${orderId}/status-logs`],
    enabled: orderId > 0,
  });
  const { data: assignee } = useQuery<{ id: number; name: string; avatar: string | null; role: string }>({
    queryKey: [`/api/users/${order?.userId}`],
    enabled: !!order?.userId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/status-logs`] });
  };

  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      const res = await fetch(`/api/orders/${orderId}/appointment-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      if (!res.ok) throw new Error("Failed");
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
      const res = await fetch(`/api/orders/${orderId}/visit-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      if (!res.ok) throw new Error("Failed");
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

  const rescheduleOrder = useMutation({
    mutationFn: async ({ appointmentDate, appointmentTime }: { appointmentDate: string; appointmentTime: string }) => {
      const res = await fetch(`/api/orders/${orderId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentDate, appointmentTime }),
      });
      if (!res.ok) throw new Error("Failed");
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
        description: `Bạn có chắc muốn chuyển trạng thái lịch hẹn sang "${info?.label}"? Thao tác này không thể hoàn tác.`,
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
        description: `Bạn có chắc muốn chuyển trạng thái khám sang "${info?.label}"? Thao tác này không thể hoàn tác.`,
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
    ...(assignee ? [{ id: assignee.id, name: assignee.name, role: "Sale - Điều dưỡng" }] : []),
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
              <div className="mt-0.5 text-[28px] font-extrabold leading-none tracking-[-0.8px] text-np-ink tabular-nums">
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
          <div className="mt-1.5 text-[11px] font-medium text-np-text-muted">
            Tỉ lệ hoa hồng: {ratePct}%
          </div>
        </div>

        {/* Phụ trách */}
        {orderTeam.length > 0 && (
          <>
            <SectionTitle>Phụ trách</SectionTitle>
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
        <SectionTitle>Khách hàng</SectionTitle>
        <Card className="overflow-hidden p-0">
          <Row
            leading={<Avatar name={order.patientName} size={44} />}
            title={order.patientName}
            subtitle={`Mã KH: KH-${String(order.id).padStart(4, "0")}`}
            trailing={matchedCustomer ? <Chev /> : undefined}
            onClick={matchedCustomer ? () => navigate(`/customers/${matchedCustomer.id}`) : undefined}
          />
          <InfoRow icon={Phone} label="Số điện thoại" value={order.phone} />
          {order.email && <InfoRow icon={Mail} label="Email" value={order.email} />}
          {order.examType && <InfoRow icon={MapPin} label="Hình thức" value={order.examType} last />}
        </Card>

        {/* Dịch vụ */}
        <SectionTitle>Dịch vụ</SectionTitle>
        <Card className="overflow-hidden p-0">
          <div className="border-b border-np-surface-pressed px-4 py-3.5">
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold text-np-ink">{order.serviceName}</div>
                <div className="mt-1 text-[12px] font-medium text-np-text-muted">
                  {order.serviceCode}
                  {order.serviceCategory ? ` · ${order.serviceCategory}` : ""}
                </div>
                <div className="mt-1.5 text-[12px] font-medium text-np-text-sub">
                  {fmtVND(order.unitPrice)} × {order.quantity}
                </div>
              </div>
              <div className="flex-shrink-0 text-[14px] font-bold text-np-ink tabular-nums">
                {fmtVND(order.totalPrice)}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 px-4 py-3">
            <div className="flex justify-between text-[13px] font-medium text-np-text-sub">
              <span>Tạm tính</span>
              <span className="tabular-nums">{fmtVND(order.totalPrice)}</span>
            </div>
            <div className="flex justify-between text-[13px] font-medium text-np-text-sub">
              <span>Giảm giá</span>
              <span className="tabular-nums">0₫</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-np-border pt-2 text-[15px] font-extrabold text-np-ink">
              <span>Tổng cộng</span>
              <span className="tabular-nums">{fmtVND(order.totalPrice)}</span>
            </div>
          </div>
        </Card>

        {/* Lịch hẹn — chỉ hiện khi có ngày hoặc giờ hẹn */}
        {(order.appointmentDate || order.appointmentTime) && (
          <>
            <SectionTitle>Lịch hẹn</SectionTitle>
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
            <SectionTitle>Lịch sử trạng thái</SectionTitle>
            <Card className="p-4">
              <div className="relative space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-np-border">
                {statusLogs.map((log, idx) => {
                  const isAppt = log.tier === "appointment";
                  const isLatest = idx === statusLogs.length - 1;
                  const fromInfo = isAppt
                    ? APPOINTMENT_STATUSES[log.fromStatus as AppointmentStatusCode]
                    : VISIT_STATUSES[log.fromStatus as VisitStatusCode];
                  const toInfo = isAppt
                    ? APPOINTMENT_STATUSES[log.toStatus as AppointmentStatusCode]
                    : VISIT_STATUSES[log.toStatus as VisitStatusCode];
                  const dotColor = isAppt ? "border-np-brand-ink" : "border-[#1e40af]";
                  const fillColor = isAppt ? "bg-np-brand-ink" : "bg-[#1e40af]";
                  return (
                    <div key={log.id} className="relative pl-6">
                      {/* Marker */}
                      {isLatest ? (
                        <span className="absolute left-0 top-1 z-10 flex h-4 w-4 items-center justify-center">
                          <span
                            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${fillColor}`}
                          />
                          <span
                            className={`relative inline-flex h-3 w-3 rounded-full ${fillColor}`}
                          />
                        </span>
                      ) : (
                        <div
                          className={`absolute left-0 top-1 z-10 h-4 w-4 rounded-full border-2 bg-white ${dotColor}`}
                        />
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[11px] ${
                            isLatest ? "font-bold text-np-ink" : "text-np-text-muted"
                          }`}
                        >
                          {log.timestamp}
                        </span>
                        <span className="rounded-np-badge border border-np-border px-1.5 py-0 text-[9px] font-normal text-np-text-sub">
                          {isAppt ? "Lịch hẹn" : "Khám"}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
                        <p
                          className={`mt-1 text-[12px] ${
                            isLatest ? "font-medium text-np-ink" : "text-np-text-sub"
                          }`}
                        >
                          {log.note}
                        </p>
                      )}
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
            <SectionTitle>Hóa đơn VAT</SectionTitle>
            <Card className="space-y-2.5 p-4">
              {order.vatCompanyName && <KeyVal label="Tên công ty" value={order.vatCompanyName} />}
              {order.vatTaxCode && <KeyVal label="Mã số thuế" value={order.vatTaxCode} />}
              {order.vatCompanyAddress && <KeyVal label="Địa chỉ" value={order.vatCompanyAddress} />}
              {order.vatEmail && <KeyVal label="Email" value={order.vatEmail} valueClass="text-np-link" />}
            </Card>
          </>
        )}

        {/* Ghi chú */}
        {order.notes && (
          <>
            <SectionTitle>Ghi chú</SectionTitle>
            <Card className="p-4">
              <p className="flex items-start gap-2 text-[13px] text-np-text-sub">
                <FileText size={14} strokeWidth={2.25} className="mt-0.5 flex-shrink-0 text-np-text-muted" />
                {order.notes}
              </p>
            </Card>
          </>
        )}

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
              Chọn ngày và giờ mới. Đơn hiện tại sẽ được đánh dấu "Dời lịch" và một đơn mới sẽ được tạo với trạng thái "Đã xác nhận".
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
    </Screen>
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
        <div className="mt-0.5 truncate text-[14px] font-semibold text-np-ink">{value || "—"}</div>
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
