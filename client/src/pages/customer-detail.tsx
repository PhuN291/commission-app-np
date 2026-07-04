import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { authFetch, getCurrentUserId } from "@/lib/queryClient";
import {
  Ban,
  Calendar,
  CalendarCheck,
  Check,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  PhoneMissed,
  Plus,
  RefreshCw,
  ShoppingBag,
  X,
  type LucideIcon,
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
  type BadgeTone,
} from "@/components/np";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Customer, Order } from "@shared/schema";
import {
  RECALL_OUTCOME_LABEL,
  type RecallOutcome,
} from "@shared/types";

// 1 lượt tái khám (order_item) của khách — shape khớp GET /api/customers/:id .recallItems.
type RecallItem = {
  orderItemId: number;
  serviceName: string;
  recallDueDate: string; // "YYYY-MM-DD"
  recallStatus: string; // pending | scheduled | refused
  lastCall: { outcome: string; at: string } | null;
};

// 1 dòng lịch sử gọi (recall_logs) — shape khớp .recallLogs từ database.
type RecallLogEntry = {
  id: number;
  orderItemId: number;
  customerId: number;
  actorUserId: number;
  actorName: string;
  outcome: string;
  note: string | null;
  createdAt: string; // ISO
};

function fmtVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

function fmtShort(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + " tr";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return String(n);
}

// Nhật ký hành động khách hàng (ADR-003).
type CustomerEvent = {
  id: number;
  type: string;
  actorUserId: number | null;
  actorName: string | null;
  orderId: number | null;
  meta: {
    code?: string;
    serviceName?: string;
    tier?: string;
    fromStatus?: string;
    toStatus?: string;
    outcome?: string;
  } | null;
  createdAt: string;
};

const STATUS_VN: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  reminded: "Đã nhắc",
  arrived: "Đã đến",
  no_show: "Không đến",
  cancelled: "Đã hủy",
  rescheduled: "Đã dời lịch",
  in_progress: "Đang khám",
  completed: "Hoàn tất",
};

// Kết quả gọi tái khám — 3 lựa chọn (giống màn "Tái khám cần gọi" /recalls).
type CallOutcome = "scheduled" | "no_answer" | "refused";

const OUTCOME_OPTIONS: { value: CallOutcome; label: string; icon: LucideIcon }[] = [
  { value: "scheduled", label: "Đã đặt lịch lại", icon: CalendarCheck },
  { value: "no_answer", label: "Chưa bắt máy", icon: PhoneMissed },
  { value: "refused", label: "Khách từ chối", icon: Ban },
];

const OUTCOME_LABEL: Record<string, string> = {
  scheduled: "Đã đặt lịch lại",
  no_answer: "Chưa bắt máy",
  refused: "Khách từ chối",
  other: "Khác",
};

const NOTE_CHIPS = ["Khách bận", "Gọi lại tuần sau", "Đổi số điện thoại"];

/** Bỏ ký tự lạ, chỉ giữ chữ số cho link tel: và zalo.me. */
function digitsOnly(phone: string | null | undefined): string {
  return (phone ?? "").replace(/[^0-9]/g, "");
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY". Trả chuỗi gốc nếu định dạng lạ. */
function fmtRecallDate(s: string | null | undefined): string {
  if (!s) return "Chưa rõ";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

/** ISO -> "HH:mm DD/MM". Rỗng nếu không parse được. */
function fmtCallTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}`;
}

/** Số ngày từ hôm nay tới recallDueDate (dương = quá hạn). null nếu thiếu/lạ. */
function daysOverdue(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  if (Number.isNaN(due.getTime())) return null;
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - due.getTime()) / 86_400_000);
}

/** Nhãn trạng thái thời gian theo số ngày quá hạn (giống worklist). */
function timeLabel(days: number | null): { text: string; tone: BadgeTone } {
  if (days == null) return { text: "Chưa rõ", tone: "neutral" };
  if (days > 0) return { text: `Trễ ${days} ngày`, tone: "critical" };
  if (days === 0) return { text: "Hôm nay", tone: "attention" };
  return { text: `Sắp tới ${-days} ngày`, tone: "neutral" };
}

function eventView(
  e: CustomerEvent,
  orderCode?: string,
): { icon: React.ReactNode; title: string; detail: string | null } {
  const m = e.meta ?? {};
  const code = orderCode ?? m.code;
  switch (e.type) {
    case "call":
      return { icon: <Phone size={14} strokeWidth={2.25} />, title: "Gọi điện cho khách", detail: null };
    case "sms":
      return { icon: <MessageSquare size={14} strokeWidth={2.25} />, title: "Nhắn tin", detail: null };
    case "email":
      return { icon: <Mail size={14} strokeWidth={2.25} />, title: "Gửi email", detail: null };
    case "order_created":
      return {
        icon: <ShoppingBag size={14} strokeWidth={2.25} />,
        title: `Tạo đơn ${code ?? ""}`.trim(),
        detail: m.serviceName ?? null,
      };
    case "status_change": {
      const from = STATUS_VN[m.fromStatus ?? ""] ?? m.fromStatus ?? "";
      const to = STATUS_VN[m.toStatus ?? ""] ?? m.toStatus ?? "";
      return {
        icon: <RefreshCw size={14} strokeWidth={2.25} />,
        title: code ? `Cập nhật đơn ${code}` : "Cập nhật trạng thái đơn",
        detail: from && to ? `${from} → ${to}` : null,
      };
    }
    case "recall_call":
      return {
        icon: <Phone size={14} strokeWidth={2.25} />,
        title: "Gọi nhắc lịch",
        detail: m.outcome ? (RECALL_OUTCOME_LABEL[m.outcome as RecallOutcome] ?? null) : null,
      };
    default:
      return { icon: <Clock size={14} strokeWidth={2.25} />, title: e.type, detail: null };
  }
}

function fmtEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CustomerDetail() {
  const { active, onTab } = useTabNav();
  const [, params] = useRoute("/customers/:id");
  const [, navigate] = useLocation();
  const customerId = params?.id ? parseInt(params.id, 10) : 0;

  const { data: customerData, isLoading } = useQuery<{
    customer: Customer;
    orders: Order[];
    stats: { orderCount: number; totalSpent: number; customerSince: string };
    recallItems: RecallItem[];
    recallLogs: RecallLogEntry[];
    events: CustomerEvent[];
  }>({
    queryKey: [`/api/customers/${customerId}`, getCurrentUserId()],
    enabled: customerId > 0,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Hộp "Kết quả gọi" cho 1 lượt tái khám (item). item=null khi đóng.
  const [callSheet, setCallSheet] = useState<{
    item: RecallItem | null;
    outcome: CallOutcome;
    note: string;
  }>({ item: null, outcome: "scheduled", note: "" });
  const closeCallSheet = () => setCallSheet({ item: null, outcome: "scheduled", note: "" });

  const logRecallMut = useMutation({
    mutationFn: async (input: { orderItemId: number; outcome: CallOutcome; note: string }) => {
      const res = await authFetch(`/api/recalls/item/${input.orderItemId}/log`, {
        method: "POST",
        body: JSON.stringify({ outcome: input.outcome, note: input.note || undefined }),
      });
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã ghi nhận kết quả gọi" });
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] }); // cập nhật badge ở list ngay
      queryClient.invalidateQueries({ queryKey: ["/api/recalls/worklist", getCurrentUserId()] }); // worklist đồng bộ
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", getCurrentUserId()] }); // đếm tái khám trang chủ
      closeCallSheet();
    },
    onError: () =>
      toast({ title: "Lỗi", description: "Không thể lưu kết quả gọi", variant: "destructive" }),
  });

  const openCallSheet = (item: RecallItem) =>
    setCallSheet({ item, outcome: "scheduled", note: "" });

  // Ghi nhật ký thao tác gọi/nhắn/email rồi cập nhật timeline.
  const logAction = (type: "call" | "sms" | "email") => {
    authFetch(`/api/customers/${customerId}/events`, {
      method: "POST",
      body: JSON.stringify({ type }),
    })
      .then(() => queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}`] }))
      .catch(() => {});
  };

  if (isLoading || !customerData) {
    return (
      <Screen activeTab={active} onTab={onTab} noHeader>
        <DetailHeader title="Khách hàng" onBack={() => navigate("/customers")} trailing={<div />} />
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
      <DetailHeader title={customer.name} onBack={() => navigate("/customers")} trailing={<div />} />

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

        {/* Nút tác vụ nhanh */}
        <div className="grid grid-cols-4 gap-2 px-4 pt-2.5">
          <ActionBtn
            icon={<Phone size={20} strokeWidth={2.25} />}
            label="Gọi"
            onClick={() => {
              logAction("call");
              window.location.href = `tel:${customer.phone}`;
            }}
          />
          <ActionBtn
            icon={<MessageSquare size={20} strokeWidth={2.25} />}
            label="Nhắn"
            onClick={() => {
              logAction("sms");
              window.location.href = `sms:${customer.phone}`;
            }}
          />
          <ActionBtn
            icon={<Mail size={20} strokeWidth={2.25} />}
            label="Email"
            disabled={!customer.email}
            onClick={() => {
              if (customer.email) {
                logAction("email");
                window.location.href = `mailto:${customer.email}`;
              }
            }}
          />
          <ActionBtn
            icon={<Plus size={20} strokeWidth={2.25} />}
            label="Tạo đơn"
            onClick={() => navigate("/orders/new")}
          />
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

        {/* Lịch tái khám — danh sách từng lượt order_item (database), gọi như màn /recalls */}
        <SectionTitle>Lịch tái khám</SectionTitle>
        <RecallSection
          items={customerData.recallItems}
          logs={customerData.recallLogs}
          onCall={openCallSheet}
        />

        {/* Lịch sử tương tác — nhật ký hành động tự ghi nhận (ADR-003) */}
        <SectionTitle>Lịch sử tương tác</SectionTitle>
        <Card className="p-4">
          {customerData.events.length === 0 ? (
            <p className="py-2 text-center text-[12px] italic text-np-text-muted">
              Chưa có hoạt động nào
            </p>
          ) : (
            <div className="relative space-y-4 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-np-border">
              {customerData.events.map((e) => {
                const orderCode = e.orderId
                  ? customerData.orders.find((o) => o.id === e.orderId)?.code
                  : undefined;
                const v = eventView(e, orderCode);
                return (
                  <div key={e.id} className="relative min-h-[36px] pl-10">
                    <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-np-border bg-white text-np-text-sub">
                      {v.icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-bold text-np-ink">{v.title}</span>
                        <span className="text-[11px] text-np-text-muted">{fmtEventTime(e.createdAt)}</span>
                        {e.actorName && <Badge tone="neutral">{e.actorName}</Badge>}
                      </div>
                      {v.detail && (
                        <p className="text-[13px] leading-relaxed text-np-text-sub">{v.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}
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
                subtitle={
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={13} strokeWidth={2.25} className="flex-shrink-0" />
                    {o.createdAt.split(" ")[0]}
                  </span>
                }
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

      {/* Kết quả gọi 1 lượt tái khám (giống màn /recalls) */}
      <Sheet open={!!callSheet.item} onOpenChange={(open) => (open ? null : closeCallSheet())}>
        <SheetContent side="bottom" className="rounded-t-2xl border-0 p-5 pt-3 [&>button]:hidden">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-np-surface-pressed" />

          <div className="mb-4 flex items-center justify-between">
            <SheetTitle className="text-[16px] font-bold text-np-ink">Kết quả gọi</SheetTitle>
            <button
              type="button"
              aria-label="Đóng"
              onClick={closeCallSheet}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-np-surface-sub text-np-text-sub"
            >
              <X size={16} strokeWidth={2.25} />
            </button>
          </div>

          {callSheet.item && (
            <>
              {/* Thẻ khách */}
              <div className="mb-4 flex items-center gap-3 rounded-np-card bg-np-surface-sub p-3">
                <Avatar name={customer.name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold text-np-ink">{customer.name}</div>
                  <div className="truncate text-[12px] text-np-text-muted">
                    {customer.phone || "Chưa có số"} · {callSheet.item.serviceName}
                  </div>
                </div>
              </div>

              {/* Liên hệ: gọi điện / nhắn Zalo */}
              <div className="mb-4 flex gap-2.5">
                <a
                  href={digitsOnly(customer.phone) ? `tel:${digitsOnly(customer.phone)}` : undefined}
                  aria-disabled={!digitsOnly(customer.phone)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-np-card border border-np-border-strong bg-white p-3 text-[13px] font-bold text-np-ink",
                    !digitsOnly(customer.phone) && "pointer-events-none opacity-50",
                  )}
                >
                  <Phone size={18} strokeWidth={2.25} className="text-np-brand" />
                  Gọi điện
                </a>
                <a
                  href={digitsOnly(customer.phone) ? `https://zalo.me/${digitsOnly(customer.phone)}` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!digitsOnly(customer.phone)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-np-card border border-np-border-strong bg-white p-3 text-[13px] font-bold text-np-ink",
                    !digitsOnly(customer.phone) && "pointer-events-none opacity-50",
                  )}
                >
                  <MessageCircle size={18} strokeWidth={2.25} className="text-np-brand" />
                  Nhắn Zalo
                </a>
              </div>

              {/* Kết quả */}
              <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.4px] text-np-text-muted">
                Kết quả cuộc gọi
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {OUTCOME_OPTIONS.map((o) => {
                  const sel = callSheet.outcome === o.value;
                  const Icon = o.icon;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setCallSheet((p) => ({ ...p, outcome: o.value }))}
                      className={cn(
                        "relative flex flex-col items-center gap-2 rounded-np-card p-3 text-center transition-colors",
                        sel ? "border-2 border-np-ink" : "border border-np-border-strong",
                      )}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-np-surface-sub text-np-text-sub">
                        <Icon size={18} strokeWidth={2.25} />
                      </span>
                      <span className="text-[12px] font-bold leading-tight text-np-ink">{o.label}</span>
                      {sel && (
                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-np-ink text-white">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Ghi chú */}
              <div className="mb-1.5 mt-4 flex items-center justify-between">
                <span className="text-[12px] font-bold uppercase tracking-[0.4px] text-np-text-muted">Ghi chú</span>
                <span className="text-[11px] text-np-text-muted">Tùy chọn</span>
              </div>
              <Textarea
                placeholder="VD: Khách bận, hẹn gọi lại tuần sau..."
                className="min-h-[72px]"
                value={callSheet.note}
                onChange={(e) => setCallSheet((p) => ({ ...p, note: e.target.value }))}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {NOTE_CHIPS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCallSheet((p) => ({ ...p, note: p.note ? `${p.note}, ${t}` : t }))}
                    className="rounded-full border border-np-border-strong bg-white px-3 py-1.5 text-[12px] font-semibold text-np-text-sub"
                  >
                    + {t}
                  </button>
                ))}
              </div>

              {/* Lưu + Hủy — bọc trong div để không là con <button> trực tiếp của
                  SheetContent (tránh bị ẩn bởi [&>button]:hidden dùng cho nút Close). */}
              <div className="mt-5">
                <NPButton
                  tone="primary"
                  size="lg"
                  icon={Check}
                  disabled={logRecallMut.isPending}
                  onClick={() =>
                    callSheet.item &&
                    logRecallMut.mutate({
                      orderItemId: callSheet.item.orderItemId,
                      outcome: callSheet.outcome,
                      note: callSheet.note,
                    })
                  }
                  className="w-full justify-center"
                >
                  {logRecallMut.isPending ? "Đang lưu..." : "Lưu kết quả"}
                </NPButton>
                <button
                  type="button"
                  onClick={closeCallSheet}
                  className="mt-2 h-10 w-full text-[14px] font-bold text-np-text-sub"
                >
                  Hủy
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────
// RecallSection — B4 R-8-5 + R-8-6
// ─────────────────────────────────────────────────────────────────

function RecallSection({
  items,
  logs,
  onCall,
}: {
  items: RecallItem[];
  logs: RecallLogEntry[];
  onCall: (item: RecallItem) => void;
}) {
  // Tên dịch vụ theo orderItemId — để gắn vào dòng lịch sử gọi (đa lượt).
  const serviceByItem = new Map(items.map((it) => [it.orderItemId, it.serviceName]));

  if (items.length === 0 && logs.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center text-[13px] text-np-text-muted">Chưa có lịch tái khám</div>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Mỗi lượt tái khám = 1 thẻ (kiểu màn /recalls) */}
      {items.map((it) => {
        const label = timeLabel(daysOverdue(it.recallDueDate));
        const statusChip =
          it.recallStatus === "scheduled"
            ? { text: "Đã đặt lịch", tone: "success" as BadgeTone }
            : it.recallStatus === "refused"
              ? { text: "Đã từ chối", tone: "neutral" as BadgeTone }
              : null;
        return (
          <Card key={it.orderItemId} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[15px] font-bold text-np-ink">
                    {it.serviceName || "Dịch vụ tái khám"}
                  </span>
                  {/* Lượt chưa xử lý: nhãn thời gian; đã xử lý: nhãn trạng thái */}
                  {statusChip ? (
                    <Badge tone={statusChip.tone}>{statusChip.text}</Badge>
                  ) : (
                    <Badge tone={label.tone}>{label.text}</Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[12px] text-np-text-muted">
                  <Calendar size={13} strokeWidth={2.25} className="flex-shrink-0" />
                  Hẹn {fmtRecallDate(it.recallDueDate)}
                </div>
                {it.lastCall && (
                  <div className="mt-0.5 text-[12px] text-np-text-muted">
                    Gọi gần nhất: {OUTCOME_LABEL[it.lastCall.outcome] ?? it.lastCall.outcome}
                    {fmtCallTime(it.lastCall.at) ? ` · ${fmtCallTime(it.lastCall.at)}` : ""}
                  </div>
                )}
              </div>
              <NPButton
                tone="primary"
                size="sm"
                icon={Phone}
                onClick={() => onCall(it)}
                className="flex-shrink-0 self-center"
              >
                Gọi
              </NPButton>
            </div>
          </Card>
        );
      })}

      {/* Lịch sử gọi (mọi lượt) */}
      {logs.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.5px] text-np-text-muted">
            Lịch sử gọi ({logs.length})
          </div>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-np-button border border-np-border bg-np-surface-sub p-2.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-bold text-np-ink">
                    {OUTCOME_LABEL[log.outcome] ?? log.outcome}
                  </span>
                  <span className="flex-shrink-0 text-[10px] text-np-text-muted tabular-nums">
                    {new Date(log.createdAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {serviceByItem.get(log.orderItemId) && (
                  <div className="mt-0.5 text-[11px] text-np-text-sub">
                    {serviceByItem.get(log.orderItemId)}
                  </div>
                )}
                {log.note && <div className="mt-1 text-[11px] text-np-text-sub">{log.note}</div>}
                <div className="mt-0.5 text-[10px] text-np-text-muted">bởi {log.actorName}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
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

function ActionBtn({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 rounded-np-card border border-np-border-strong bg-white px-1 py-2.5 transition-colors active:bg-np-surface-pressed disabled:opacity-40"
    >
      <span className="text-np-brand-ink">{icon}</span>
      <span className="text-[11px] font-semibold text-np-ink">{label}</span>
    </button>
  );
}
