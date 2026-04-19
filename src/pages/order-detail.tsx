import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  FileText,
  User,
  Package,
  CalendarDays,
  Clock,
  MapPin,
  Check,
  Bell,
  LogIn,
  X,
  Calendar,
  EyeOff,
  Play,
  CheckCircle,
  UserX,
  History,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import AppHeader from "@/components/app-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { OrderStatusBadges, SingleStatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import {
  APPOINTMENT_BUTTONS,
  VISIT_BUTTONS,
  APPOINTMENT_STATUSES,
  VISIT_STATUSES,
  type AppointmentStatusCode,
  type VisitStatusCode,
  type StatusButton,
} from "@shared/status";
import type { Order, Customer, StatusLog } from "@shared/schema";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
}

function getButtonIcon(icon: StatusButton["icon"]) {
  const cls = "h-3.5 w-3.5";
  switch (icon) {
    case "check": return <Check className={cls} />;
    case "bell": return <Bell className={cls} />;
    case "log-in": return <LogIn className={cls} />;
    case "x": return <X className={cls} />;
    case "calendar": return <Calendar className={cls} />;
    case "eye-off": return <EyeOff className={cls} />;
    case "play": return <Play className={cls} />;
    case "check-circle": return <CheckCircle className={cls} />;
    case "user-x": return <UserX className={cls} />;
    default: return null;
  }
}

export default function OrderDetail() {
  const [, params] = useRoute("/orders/:id");
  const [, navigate] = useLocation();
  const orderId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: "", description: "", action: () => {} });

  // Reschedule dialog state
  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: [`/api/orders/${orderId}`],
    enabled: orderId > 0,
  });

  const { data: allOrders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: allCustomers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: statusLogs = [] } = useQuery<StatusLog[]>({
    queryKey: [`/api/orders/${orderId}/status-logs`],
    enabled: orderId > 0,
  });

  const { data: assignee } = useQuery<{
    id: number; name: string; avatar: string | null; role: string;
  }>({
    queryKey: [`/api/users/${order?.userId}`],
    enabled: !!order?.userId,
  });

  const assigneeInitials = assignee
    ? assignee.name.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase()
    : "";

  const matchedCustomer = order ? allCustomers.find(c => c.phone === order.phone) : null;
  const currentIndex = allOrders.findIndex(o => o.id === orderId);
  const prevOrder = currentIndex > 0 ? allOrders[currentIndex - 1] : null;
  const nextOrder = currentIndex < allOrders.length - 1 ? allOrders[currentIndex + 1] : null;

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
      const statusInfo = APPOINTMENT_STATUSES[btn.targetStatus as AppointmentStatusCode];
      setConfirmDialog({
        open: true,
        title: `Xác nhận: ${statusInfo?.label || btn.label}`,
        description: `Bạn có chắc muốn chuyển trạng thái lịch hẹn sang "${statusInfo?.label}"? Thao tác này không thể hoàn tác.`,
        action: () => {
          updateAppointmentStatus.mutate({ status: btn.targetStatus });
          setConfirmDialog(prev => ({ ...prev, open: false }));
        },
      });
    } else {
      updateAppointmentStatus.mutate({ status: btn.targetStatus });
    }
  };

  const handleVisitAction = (btn: StatusButton) => {
    if (btn.needsConfirmation) {
      const statusInfo = VISIT_STATUSES[btn.targetStatus as VisitStatusCode];
      setConfirmDialog({
        open: true,
        title: `Xác nhận: ${statusInfo?.label || btn.label}`,
        description: `Bạn có chắc muốn chuyển trạng thái khám sang "${statusInfo?.label}"? Thao tác này không thể hoàn tác.`,
        action: () => {
          updateVisitStatus.mutate({ status: btn.targetStatus });
          setConfirmDialog(prev => ({ ...prev, open: false }));
        },
      });
    } else {
      updateVisitStatus.mutate({ status: btn.targetStatus });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
        <AppHeader activePage="orders" />
        <main className="flex-1 p-4 md:p-8 bg-[#f6f6f7] rounded-t-2xl flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-[#008060] border-t-transparent rounded-full animate-spin"></div>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
        <AppHeader activePage="orders" />
        <main className="flex-1 p-4 md:p-8 bg-[#f6f6f7] rounded-t-2xl flex items-center justify-center">
          <p className="text-[#8c9196]">Không tìm thấy đơn hàng</p>
        </main>
      </div>
    );
  }

  const appointmentStatus = order.appointmentStatus as AppointmentStatusCode;
  const visitStatus = order.visitStatus as VisitStatusCode | null;
  const appointmentButtons = APPOINTMENT_BUTTONS[appointmentStatus] || [];
  const visitButtons = visitStatus ? (VISIT_BUTTONS[visitStatus] || []) : [];

  const timeSlots = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"];

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader activePage="orders" />

      <main className="flex-1 p-4 md:p-8 space-y-5 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[{ label: "Đơn hàng", href: "/orders" }, { label: order.code }]} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate("/orders")} className="shrink-0 text-[#8c9196] hover:text-[#1a1c1d] transition-colors" data-testid="button-back-orders">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-[#1a1c1d] truncate" data-testid="text-order-code">{order.code}</h1>
                <OrderStatusBadges appointmentStatus={order.appointmentStatus} visitStatus={order.visitStatus} />
              </div>
              <p className="text-xs text-[#8c9196]">{order.createdAt}</p>
              {assignee && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Avatar className="h-5 w-5">
                    {assignee.avatar && <AvatarImage src={assignee.avatar} alt={assignee.name} />}
                    <AvatarFallback className="text-[8px] font-bold bg-[#a855f7] text-white">
                      {assigneeInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-[#8c9196]">{assignee.name}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
            <Button variant="outline" size="icon" className="h-8 w-8 border-[#d2d5d8]" disabled={!prevOrder} onClick={() => prevOrder && navigate(`/orders/${prevOrder.id}`)} data-testid="button-prev-order">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 border-[#d2d5d8]" disabled={!nextOrder} onClick={() => nextOrder && navigate(`/orders/${nextOrder.id}`)} data-testid="button-next-order">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Dịch vụ */}
            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center gap-2">
                <Package className="h-4 w-4 text-[#4a4d50]" />
                <h2 className="text-sm font-bold text-[#1a1c1d]">Dịch vụ</h2>
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e3e3e3] bg-[#f6f6f7]">
                      <th className="text-left text-[10px] font-bold text-[#4a4d50] uppercase px-5 py-3">Dịch vụ</th>
                      <th className="text-center text-[10px] font-bold text-[#4a4d50] uppercase px-5 py-3 w-24">Số lượng</th>
                      <th className="text-right text-[10px] font-bold text-[#4a4d50] uppercase px-5 py-3 w-32">Đơn giá</th>
                      <th className="text-right text-[10px] font-bold text-[#4a4d50] uppercase px-5 py-3 w-32">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#e3e3e3]" data-testid="row-order-service">
                      <td className="px-5 py-4">
                        <p className="font-medium text-[#1a1c1d]">{order.serviceName}</p>
                        <p className="text-[10px] text-[#8c9196] mt-0.5">Mã DV: {order.serviceCode}</p>
                        {order.serviceCategory && <p className="text-[10px] text-[#8c9196] mt-0.5">Danh mục: {order.serviceCategory}</p>}
                      </td>
                      <td className="px-5 py-4 text-center text-[#1a1c1d]">{order.quantity}</td>
                      <td className="px-5 py-4 text-right text-[#1a1c1d]">{formatCurrency(order.unitPrice)}</td>
                      <td className="px-5 py-4 text-right font-bold text-[#1a1c1d]">{formatCurrency(order.totalPrice)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="sm:hidden p-4" data-testid="card-order-service-mobile">
                <p className="font-medium text-[#1a1c1d] text-sm">{order.serviceName}</p>
                <p className="text-[10px] text-[#8c9196] mt-0.5">Mã DV: {order.serviceCode}</p>
                {order.serviceCategory && <p className="text-[10px] text-[#8c9196] mt-0.5">Danh mục: {order.serviceCategory}</p>}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-[#8c9196]">SL: {order.quantity}</span>
                  <span className="text-[#8c9196]">{formatCurrency(order.unitPrice)}/dv</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-[#616161]">Thành tiền</span>
                  <span className="text-sm font-bold text-[#1a1c1d]">{formatCurrency(order.totalPrice)}</span>
                </div>
              </div>
            </Card>

            {/* Thanh toán */}
            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3]">
                <h2 className="text-sm font-bold text-[#1a1c1d]">Thanh toán</h2>
              </div>
              <div className="px-4 sm:px-5 py-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#616161]">Tạm tính ({order.quantity} dịch vụ)</span>
                  <span className="text-[#1a1c1d] font-medium">{formatCurrency(order.totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#616161]">Giảm giá</span>
                  <span className="text-[#1a1c1d]">0 ₫</span>
                </div>
                <div className="border-t border-[#e3e3e3] pt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#1a1c1d]">Tổng cộng</span>
                  <span className="font-bold text-[#1a1c1d] text-base" data-testid="text-order-total">{formatCurrency(order.totalPrice)}</span>
                </div>
              </div>
            </Card>

            {/* Hoa hồng */}
            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-bold text-[#1a1c1d]">Hoa hồng</h2>
                <Badge className="bg-[#e4f3d9] text-[#008060] text-[10px] font-bold border-0 px-2 py-0.5">Thu nhập từ đơn</Badge>
              </div>
              <div className="px-4 sm:px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#8c9196]">Số tiền hoa hồng</p>
                  <p className="text-xl font-bold text-[#008060] mt-1" data-testid="text-order-commission">{formatCurrency(order.commission)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#8c9196]">Tỉ lệ</p>
                  <p className="text-sm font-bold text-[#1a1c1d] mt-1">{order.totalPrice > 0 ? ((order.commission / order.totalPrice) * 100).toFixed(1) : 0}%</p>
                </div>
              </div>
            </Card>

            {/* Lịch sử trạng thái */}
            {statusLogs.length > 0 && (
              <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center gap-2">
                  <History className="h-4 w-4 text-[#4a4d50]" />
                  <h2 className="text-sm font-bold text-[#1a1c1d]">Lịch sử trạng thái</h2>
                </div>
                <div className="px-4 sm:px-5 py-4">
                  <div className="relative space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-[#e3e3e3]">
                    {statusLogs.map((log) => {
                      const isAppt = log.tier === "appointment";
                      const fromInfo = isAppt
                        ? APPOINTMENT_STATUSES[log.fromStatus as AppointmentStatusCode]
                        : VISIT_STATUSES[log.fromStatus as VisitStatusCode];
                      const toInfo = isAppt
                        ? APPOINTMENT_STATUSES[log.toStatus as AppointmentStatusCode]
                        : VISIT_STATUSES[log.toStatus as VisitStatusCode];
                      return (
                        <div key={log.id} className="relative pl-6">
                          <div className={`absolute left-0 top-1 h-4 w-4 rounded-full border-2 z-10 ${
                            isAppt ? "bg-white border-[#008060]" : "bg-white border-[#1e40af]"
                          }`} />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-[#8c9196]">{log.timestamp}</span>
                              <Badge variant="outline" className="text-[9px] font-normal border-[#e3e3e3] px-1.5 py-0 h-4">
                                {isAppt ? "Lịch hẹn" : "Khám"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <SingleStatusBadge status={log.fromStatus} tier={log.tier as "appointment" | "visit"} />
                              <span className="text-[10px] text-[#8c9196]">→</span>
                              <SingleStatusBadge status={log.toStatus} tier={log.tier as "appointment" | "visit"} />
                            </div>
                            {log.note && (
                              <p className="text-xs text-[#616161] mt-1">{log.note}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Card Trạng thái — nút hành động */}
            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3]">
                <h2 className="text-sm font-bold text-[#1a1c1d]">Trạng thái</h2>
              </div>
              <div className="px-4 sm:px-5 py-4 space-y-4">
                {/* Current appointment status */}
                <div>
                  <p className="text-[10px] font-bold text-[#616161] uppercase mb-2">Lịch hẹn</p>
                  <OrderStatusBadges appointmentStatus={order.appointmentStatus} size="md" />
                  {appointmentButtons.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {appointmentButtons.map((btn) => (
                        <Button
                          key={btn.targetStatus}
                          size="sm"
                          variant={btn.variant === "destructive" ? "destructive" : btn.variant === "outline" ? "outline" : "default"}
                          className={`h-9 text-xs font-bold justify-start gap-2 ${
                            btn.variant === "default" ? "bg-[#008060] hover:bg-[#006e52] text-white" : ""
                          } ${btn.variant === "outline" ? "border-[#d2d5d8]" : ""}`}
                          onClick={() => handleAppointmentAction(btn)}
                          disabled={updateAppointmentStatus.isPending}
                        >
                          {getButtonIcon(btn.icon)}
                          {btn.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Visit status (only when arrived) */}
                {visitStatus && (
                  <div className="pt-4 border-t border-[#e3e3e3]">
                    <p className="text-[10px] font-bold text-[#616161] uppercase mb-2">Khám bệnh</p>
                    <SingleStatusBadge status={visitStatus} tier="visit" size="md" />
                    {visitButtons.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2">
                        {visitButtons.map((btn) => (
                          <Button
                            key={btn.targetStatus}
                            size="sm"
                            variant={btn.variant === "destructive" ? "destructive" : btn.variant === "outline" ? "outline" : "default"}
                            className={`h-9 text-xs font-bold justify-start gap-2 ${
                              btn.variant === "default" ? "bg-[#1e40af] hover:bg-[#1e3a8a] text-white" : ""
                            } ${btn.variant === "outline" ? "border-[#d2d5d8]" : ""}`}
                            onClick={() => handleVisitAction(btn)}
                            disabled={updateVisitStatus.isPending}
                          >
                            {getButtonIcon(btn.icon)}
                            {btn.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Lịch hẹn */}
            {(order.appointmentDate || order.appointmentTime || order.examType) && (
              <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#4a4d50]" />
                  <h2 className="text-sm font-bold text-[#1a1c1d]">Lịch hẹn</h2>
                </div>
                <div className="px-4 sm:px-5 py-4 space-y-3">
                  {order.appointmentDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#8c9196]" />
                      <span className="text-[#616161]">Ngày hẹn:</span>
                      <span className="font-medium text-[#1a1c1d]" data-testid="text-appointment-date">{order.appointmentDate}</span>
                    </div>
                  )}
                  {order.appointmentTime && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-[#8c9196]" />
                      <span className="text-[#616161]">Giờ hẹn:</span>
                      <span className="font-medium text-[#1a1c1d]" data-testid="text-appointment-time">{order.appointmentTime}</span>
                    </div>
                  )}
                  {order.examType && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#8c9196]" />
                      <span className="text-[#616161]">Hình thức:</span>
                      <Badge className={`text-[10px] font-bold border-0 px-2 py-0.5 ${
                        order.examType === "Lấy mẫu tại nhà" ? "bg-[#dbeafe] text-[#1e40af]" : "bg-[#e4f3d9] text-[#008060]"
                      }`} data-testid="badge-exam-type">
                        {order.examType}
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Hóa đơn VAT */}
            {(order.vatCompanyName || order.vatTaxCode) && (
              <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#4a4d50]" />
                  <h2 className="text-sm font-bold text-[#1a1c1d]">Hóa đơn VAT</h2>
                </div>
                <div className="px-4 sm:px-5 py-4 space-y-3">
                  {order.vatCompanyName && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-[#8c9196] shrink-0 w-28">Tên công ty:</span>
                      <span className="font-medium text-[#1a1c1d]">{order.vatCompanyName}</span>
                    </div>
                  )}
                  {order.vatTaxCode && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-[#8c9196] shrink-0 w-28">Mã số thuế:</span>
                      <span className="font-medium text-[#1a1c1d]">{order.vatTaxCode}</span>
                    </div>
                  )}
                  {order.vatCompanyAddress && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-[#8c9196] shrink-0 w-28">Địa chỉ:</span>
                      <span className="font-medium text-[#1a1c1d]">{order.vatCompanyAddress}</span>
                    </div>
                  )}
                  {order.vatEmail && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-[#8c9196] shrink-0 w-28">Email:</span>
                      <span className="font-medium text-[#005bd3]">{order.vatEmail}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Ghi chú */}
            {order.notes !== null && order.notes !== undefined && order.notes !== "" && (
              <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#4a4d50]" />
                  <h2 className="text-sm font-bold text-[#1a1c1d]">Ghi chú</h2>
                </div>
                <div className="px-4 sm:px-5 py-4">
                  <p className="text-sm text-[#616161]">{order.notes}</p>
                </div>
              </Card>
            )}

            {/* Khách hàng */}
            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center gap-2">
                <User className="h-4 w-4 text-[#4a4d50]" />
                <h2 className="text-sm font-bold text-[#1a1c1d]">Khách hàng</h2>
              </div>
              <div className="px-4 sm:px-5 py-4 space-y-3">
                {matchedCustomer ? (
                  <Link href={`/customers/${matchedCustomer.id}`}>
                    <p className="text-sm font-bold text-[#005bd3] hover:underline cursor-pointer" data-testid="text-order-patient">{order.patientName}</p>
                  </Link>
                ) : (
                  <p className="text-sm font-bold text-[#005bd3]" data-testid="text-order-patient">{order.patientName}</p>
                )}
                <div className="space-y-2">
                  <p className="text-sm text-[#616161] font-medium">Thông tin liên hệ</p>
                  <div className="flex items-center gap-2 text-sm text-[#616161]">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-[#8c9196]" />
                    <span data-testid="text-order-phone">{order.phone}</span>
                  </div>
                  {order.email && (
                    <div className="flex items-center gap-2 text-sm text-[#005bd3] min-w-0">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-[#8c9196]" />
                      <span className="truncate" data-testid="text-order-email">{order.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Confirmation AlertDialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
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

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog} onOpenChange={setRescheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dời lịch hẹn</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-[#616161]">
              Chọn ngày và giờ mới. Đơn hiện tại sẽ được đánh dấu "Dời lịch" và một đơn mới sẽ được tạo với trạng thái "Đã xác nhận".
            </p>
            <div>
              <label className="text-xs font-medium text-[#616161] mb-1.5 block">Ngày hẹn mới</label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => { setNewDate(e.target.value); setNewTime(""); }}
                min={new Date().toISOString().split("T")[0]}
                className="bg-[#f6f6f7] border-[#d2d5d8] rounded-lg h-9 text-sm"
              />
            </div>
            {newDate && (
              <div>
                <label className="text-xs font-medium text-[#616161] mb-1.5 block">Giờ hẹn mới</label>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map(time => (
                    <button
                      key={time}
                      type="button"
                      className={`h-8 rounded-lg text-xs font-medium border transition-all ${newTime === time ? "bg-[#008060] text-white border-[#008060]" : "bg-[#f6f6f7] text-[#1a1c1d] border-[#d2d5d8] hover:border-[#008060] hover:text-[#008060]"}`}
                      onClick={() => setNewTime(time)}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialog(false)} className="border-[#d2d5d8]">
              Hủy bỏ
            </Button>
            <Button
              className="bg-[#008060] hover:bg-[#006e52] text-white"
              disabled={!newDate || !newTime || rescheduleOrder.isPending}
              onClick={() => {
                const formattedDate = newDate.split("-").reverse().join("/");
                rescheduleOrder.mutate({ appointmentDate: formattedDate, appointmentTime: newTime });
              }}
            >
              {rescheduleOrder.isPending ? "Đang xử lý..." : "Xác nhận dời lịch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
