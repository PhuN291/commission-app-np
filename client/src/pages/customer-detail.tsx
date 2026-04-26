import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Stethoscope,
  Users,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Card,
  DetailHeader,
  NPButton,
  OrderStatusBadges,
  Row,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CUSTOMER_INTERACTIONS,
  CUSTOMER_REMINDERS,
  type InteractionEntry,
  type InteractionType,
  type Reminder,
} from "@/lib/mock-crm";
import type { Customer, Order } from "@shared/schema";

function fmtVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

function fmtShort(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + " tr";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return String(n);
}

export default function CustomerDetail() {
  const { active, onTab } = useTabNav();
  const [, params] = useRoute("/customers/:id");
  const [, navigate] = useLocation();
  const customerId = params?.id ? parseInt(params.id, 10) : 0;

  const [interactions, setInteractions] = useState<InteractionEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [isAddingInteraction, setIsAddingInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState<{ type: InteractionType; note: string }>({
    type: "Goi dien",
    note: "",
  });

  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminder, setNewReminder] = useState({ content: "", dueDate: "" });

  const { data: customerData, isLoading } = useQuery<{
    customer: Customer;
    orders: Order[];
    stats: { orderCount: number; totalSpent: number; customerSince: string };
  }>({
    queryKey: [`/api/customers/${customerId}`],
    enabled: customerId > 0,
  });

  useEffect(() => {
    if (customerId > 0) {
      setInteractions(CUSTOMER_INTERACTIONS[customerId] || []);
      setReminders(CUSTOMER_REMINDERS[customerId] || []);
    }
  }, [customerId]);

  const handleAddInteraction = () => {
    if (!newInteraction.note.trim()) return;
    const entry: InteractionEntry = {
      id: Date.now(),
      date: new Date().toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: newInteraction.type,
      note: newInteraction.note,
      performer: "Nguyễn Thị Mai",
    };
    setInteractions([entry, ...interactions]);
    setNewInteraction({ type: "Goi dien", note: "" });
    setIsAddingInteraction(false);
  };

  const handleAddReminder = () => {
    if (!newReminder.content.trim() || !newReminder.dueDate) return;
    const reminder: Reminder = {
      id: Date.now(),
      content: newReminder.content,
      dueDate: newReminder.dueDate.split("-").reverse().join("/"),
      status: "upcoming",
    };
    setReminders([reminder, ...reminders]);
    setNewReminder({ content: "", dueDate: "" });
    setIsAddingReminder(false);
  };

  const interactionIcon = (type: InteractionType) => {
    switch (type) {
      case "Goi dien":
        return <Phone size={14} strokeWidth={2.25} />;
      case "Nhan tin":
        return <MessageSquare size={14} strokeWidth={2.25} />;
      case "Gap truc tiep":
        return <Users size={14} strokeWidth={2.25} />;
      case "Kham xong":
        return <Stethoscope size={14} strokeWidth={2.25} />;
      default:
        return <MessageSquare size={14} strokeWidth={2.25} />;
    }
  };

  if (isLoading || !customerData) {
    return (
      <Screen activeTab={active} onTab={onTab} noHeader>
        <DetailHeader title="Khách hàng" onBack={() => navigate("/customers")} />
        <div className="flex flex-1 items-center justify-center py-20">
          {isLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
          ) : (
            <p className="text-np-text-muted">Không tìm thấy khách hàng</p>
          )}
        </div>
      </Screen>
    );
  }

  const { customer, orders, stats } = customerData;

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title={customer.name} onBack={() => navigate("/customers")} />

      <div className="bg-np-surface-sub pb-5">
        {/* Customer header */}
        <div className="flex items-center gap-3 bg-white px-4 py-4">
          <Avatar name={customer.name} size={56} />
          <div className="min-w-0 flex-1">
            <div className="text-[18px] font-bold text-np-ink">{customer.name}</div>
            <div className="mt-0.5 text-[12px] text-np-text-muted">
              Khách hàng từ {stats.customerSince}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 px-4 pt-3">
          <div className="rounded-np-card bg-white px-3.5 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-np-text-muted">
              Tổng chi tiêu
            </div>
            <div className="mt-1 text-[18px] font-extrabold text-np-ink tabular-nums">
              {fmtShort(stats.totalSpent)}₫
            </div>
          </div>
          <div className="rounded-np-card bg-white px-3.5 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-np-text-muted">
              Số đơn hàng
            </div>
            <div className="mt-1 text-[18px] font-extrabold text-np-ink tabular-nums">
              {stats.orderCount} đơn
            </div>
          </div>
        </div>

        {/* Thông tin liên hệ */}
        <SectionTitle>Thông tin liên hệ</SectionTitle>
        <Card className="overflow-hidden p-0">
          <InfoLine icon={<Phone size={16} strokeWidth={2.25} />} label="Số điện thoại" value={customer.phone} />
          {customer.email && (
            <InfoLine icon={<Mail size={16} strokeWidth={2.25} />} label="Email" value={customer.email} valueClass="text-np-link" />
          )}
          <InfoLine
            icon={<MapPin size={16} strokeWidth={2.25} />}
            label="Địa chỉ"
            value={
              customer.address
                ? `${customer.address}${customer.location ? ` · ${customer.location}` : ""}`
                : "Chưa cập nhật địa chỉ"
            }
            last
          />
        </Card>

        {/* Nhắc nhở */}
        <SectionTitle
          action={
            !isAddingReminder && (
              <button
                type="button"
                onClick={() => setIsAddingReminder(true)}
                className="text-[13px] font-semibold text-np-link"
              >
                Tạo nhắc nhở
              </button>
            )
          }
        >
          Nhắc nhở
        </SectionTitle>
        <Card className="space-y-3 p-4">
          {isAddingReminder && (
            <div className="space-y-3 rounded-lg bg-np-surface-sub p-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-np-text-sub">
                  Hạn chót
                </label>
                <Input
                  type="date"
                  value={newReminder.dueDate}
                  onChange={(e) => setNewReminder({ ...newReminder, dueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-np-text-sub">
                  Nội dung
                </label>
                <Input
                  placeholder="Nhập nội dung..."
                  value={newReminder.content}
                  onChange={(e) => setNewReminder({ ...newReminder, content: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <NPButton size="sm" tone="ghost" onClick={() => setIsAddingReminder(false)}>
                  Hủy
                </NPButton>
                <NPButton size="sm" tone="primary" onClick={handleAddReminder}>
                  Lưu
                </NPButton>
              </div>
            </div>
          )}
          {reminders.length === 0 ? (
            <p className="py-2 text-center text-[12px] italic text-np-text-muted">
              Không có nhắc nhở nào
            </p>
          ) : (
            reminders.map((r) => (
              <div
                key={r.id}
                className="flex items-start gap-3 rounded-lg bg-np-surface-sub p-3"
              >
                {r.status === "done" ? (
                  <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-np-success" />
                ) : r.status === "overdue" ? (
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-np-danger" />
                ) : (
                  <Clock size={16} className="mt-0.5 flex-shrink-0 text-np-warning" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-np-ink">{r.content}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[11px] text-np-text-muted">{r.dueDate}</span>
                    <Badge
                      tone={
                        r.status === "upcoming"
                          ? "attention"
                          : r.status === "overdue"
                          ? "critical"
                          : "success"
                      }
                    >
                      {r.status === "upcoming"
                        ? "Sắp tới"
                        : r.status === "overdue"
                        ? "Quá hạn"
                        : "Hoàn tất"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>

        {/* Lịch sử tương tác */}
        <SectionTitle
          action={
            !isAddingInteraction && (
              <button
                type="button"
                onClick={() => setIsAddingInteraction(true)}
                className="text-[13px] font-semibold text-np-link"
              >
                Thêm ghi chú
              </button>
            )
          }
        >
          Lịch sử tương tác
        </SectionTitle>
        <Card className="p-4">
          {isAddingInteraction && (
            <div className="mb-4 space-y-3 rounded-lg bg-np-surface-sub p-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-np-text-sub">
                  Loại tương tác
                </label>
                <Select
                  value={newInteraction.type}
                  onValueChange={(v) =>
                    setNewInteraction({ ...newInteraction, type: v as InteractionType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Goi dien">Gọi điện</SelectItem>
                    <SelectItem value="Nhan tin">Nhắn tin</SelectItem>
                    <SelectItem value="Gap truc tiep">Gặp trực tiếp</SelectItem>
                    <SelectItem value="Kham xong">Khám xong</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-np-text-sub">
                  Nội dung
                </label>
                <Textarea
                  placeholder="Nhập nội dung tương tác..."
                  className="min-h-[80px] text-[13px]"
                  value={newInteraction.note}
                  onChange={(e) => setNewInteraction({ ...newInteraction, note: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <NPButton size="sm" tone="ghost" onClick={() => setIsAddingInteraction(false)}>
                  Hủy
                </NPButton>
                <NPButton size="sm" tone="primary" onClick={handleAddInteraction}>
                  Lưu ghi chú
                </NPButton>
              </div>
            </div>
          )}
          {interactions.length === 0 ? (
            <p className="py-2 text-center text-[12px] italic text-np-text-muted">
              Chưa có tương tác nào
            </p>
          ) : (
            <div className="relative space-y-4 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-np-border">
              {interactions.map((entry) => (
                <div key={entry.id} className="relative pl-10">
                  <div className="absolute left-0 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-np-border bg-white text-np-text-sub">
                    {interactionIcon(entry.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-bold text-np-ink">{entry.type}</span>
                      <span className="text-[11px] text-np-text-muted">{entry.date}</span>
                      <Badge tone="neutral">{entry.performer}</Badge>
                    </div>
                    <p className="text-[13px] leading-relaxed text-np-text-sub">{entry.note}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Đơn hàng */}
        <SectionTitle
          action={
            <NPButton size="sm" tone="primary" icon={Plus} onClick={() => navigate("/orders/new")}>
              Tạo đơn
            </NPButton>
          }
        >
          Đơn hàng liên quan
        </SectionTitle>
        <Card className="overflow-hidden p-0">
          {orders.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-np-text-muted">
              Chưa có đơn hàng nào
            </div>
          ) : (
            orders.map((o, i) => (
              <Row
                key={o.id}
                onClick={() => navigate(`/orders/${o.id}`)}
                title={o.code}
                subtitle={`${o.serviceName} · ${o.createdAt.split(" ")[0]}`}
                meta={
                  <div className="mt-1">
                    <OrderStatusBadges
                      appointmentStatus={o.appointmentStatus}
                      visitStatus={o.visitStatus}
                    />
                  </div>
                }
                trailing={
                  <div className="flex-shrink-0 text-right text-[14px] font-bold text-np-ink tabular-nums">
                    {fmtVND(o.totalPrice)}
                  </div>
                }
                last={i === orders.length - 1}
              />
            ))
          )}
        </Card>
      </div>
    </Screen>
  );
}

function InfoLine({
  icon,
  label,
  value,
  valueClass,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${last ? "" : "border-b border-np-surface-pressed"}`}>
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-np-surface-sub text-np-text-sub">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-np-text-muted">
          {label}
        </div>
        <div className={`mt-0.5 text-[14px] font-semibold text-np-ink ${valueClass ?? ""}`}>
          {value}
        </div>
      </div>
    </div>
  );
}
