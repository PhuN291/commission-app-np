/**
 * Màn danh sách tái khám cần gọi (worklist).
 *
 * Nguồn: GET /api/recalls/worklist — server trả các lượt cần gọi của người đang đăng nhập
 * (nhân viên thấy khách mình chăm, trưởng ca thấy hết), đã sắp quá-hạn-nhiều-nhất lên đầu.
 * Ghi kết quả gọi: POST /api/recalls/item/:orderItemId/log { outcome, note }.
 *
 * Chỉ client. Không đụng hệ recall in-memory cũ ở màn chi tiết khách.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Ban,
  Calendar,
  CalendarCheck,
  Check,
  MessageCircle,
  Phone,
  PhoneCall,
  PhoneMissed,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Card,
  Chips,
  DetailHeader,
  NPButton,
  Screen,
  useTabNav,
  type BadgeTone,
  type ChipItem,
} from "@/components/np";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { authFetch, getCurrentUserId } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Một lượt cần gọi (shape khớp GET /api/recalls/worklist). */
interface WorklistRow {
  orderItemId: number;
  customerId: number;
  customerName: string;
  phone: string;
  serviceName: string;
  recallDueDate: string; // "YYYY-MM-DD"
  assigneeUserId: number | null;
  assigneeName: string | null;
  lastCall: { outcome: string; at: string } | null;
}

/** 3 kết quả gọi hiển thị (POST chấp nhận thêm 'other' nhưng màn này chỉ cần 3). */
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

/** Bỏ khoảng trắng + ký tự lạ, chỉ giữ chữ số cho link tel: và zalo.me. */
function digitsOnly(phone: string | null | undefined): string {
  return (phone ?? "").replace(/[^0-9]/g, "");
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY". Trả chuỗi gốc nếu định dạng lạ. */
function formatDate(s: string | null | undefined): string {
  if (!s) return "Chưa rõ";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

/** ISO -> "HH:mm DD/MM". Rỗng nếu không parse được. */
function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}`;
}

/** Số ngày từ hôm nay tới recallDueDate (dương = quá hạn). null nếu thiếu/định dạng lạ. */
function daysOverdue(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  if (Number.isNaN(due.getTime())) return null;
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - due.getTime()) / 86_400_000);
}

/** Nhãn trạng thái thời gian theo số ngày quá hạn. */
function timeLabel(days: number | null): { text: string; tone: BadgeTone } {
  if (days == null) return { text: "Chưa rõ", tone: "neutral" };
  if (days > 0) return { text: `Trễ ${days} ngày`, tone: "critical" };
  if (days === 0) return { text: "Hôm nay", tone: "attention" };
  return { text: `Sắp tới ${-days} ngày`, tone: "neutral" };
}

type FilterKey = "all" | "overdue" | "today" | "upcoming";

export default function RecallWorklist() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [sheet, setSheet] = useState<{
    open: boolean;
    item: WorklistRow | null;
    outcome: CallOutcome;
    note: string;
  }>({ open: false, item: null, outcome: "scheduled", note: "" });

  const { data: items = [], isLoading } = useQuery<WorklistRow[]>({
    queryKey: ["/api/recalls/worklist", getCurrentUserId()],
  });

  const logMut = useMutation({
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
      // Tải lại worklist + đếm tái khám trên trang chủ.
      queryClient.invalidateQueries({ queryKey: ["/api/recalls/worklist", getCurrentUserId()] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", getCurrentUserId()] });
      setSheet({ open: false, item: null, outcome: "scheduled", note: "" });
    },
    onError: () =>
      toast({ title: "Lỗi", description: "Không thể lưu kết quả gọi", variant: "destructive" }),
  });

  // Gắn số ngày quá hạn để lọc + sắp xếp giữ nguyên thứ tự server (quá hạn nhất lên đầu).
  const withDays = items.map((it) => ({ it, days: daysOverdue(it.recallDueDate) }));
  const filtered = withDays.filter(({ days }) => {
    if (filter === "all") return true;
    if (filter === "overdue") return days != null && days > 0;
    if (filter === "today") return days === 0;
    return days != null && days < 0; // upcoming
  });

  const chips: ChipItem[] = [
    { key: "all", label: "Tất cả", count: items.length },
    { key: "overdue", label: "Quá hạn", count: withDays.filter((x) => x.days != null && x.days > 0).length },
    { key: "today", label: "Hôm nay", count: withDays.filter((x) => x.days === 0).length },
    { key: "upcoming", label: "Sắp tới", count: withDays.filter((x) => x.days != null && x.days < 0).length },
  ];

  const openSheet = (item: WorklistRow) =>
    setSheet({ open: true, item, outcome: "scheduled", note: "" });
  const closeSheet = () => setSheet({ open: false, item: null, outcome: "scheduled", note: "" });

  const sheetDigits = digitsOnly(sheet.item?.phone);

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Tái khám cần gọi" onBack={() => navigate("/")} trailing={<div />} />

      <div className="min-h-full bg-np-surface-sub pt-1">
        <Chips
          items={chips}
          active={filter}
          onChange={(k) => setFilter(k as FilterKey)}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="overflow-hidden p-0">
            <div className="px-5 py-12 text-center">
              <PhoneCall size={36} className="mx-auto text-np-border-strong" />
              <div className="mt-2.5 text-[13px] font-medium text-np-text-muted">
                Hiện không có lượt nào cần gọi
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-2.5 pb-2">
            {filtered.map(({ it, days }) => {
              const label = timeLabel(days);
              return (
                <Card key={it.orderItemId} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[15px] font-bold text-np-ink">
                          {it.customerName || "Khách"}
                        </span>
                        <Badge tone={label.tone}>{label.text}</Badge>
                      </div>
                      <div className="mt-1 text-[13px] font-medium text-np-text-sub">
                        {it.serviceName || "Dịch vụ tái khám"}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[12px] text-np-text-muted">
                        <Calendar size={13} strokeWidth={2.25} className="flex-shrink-0" />
                        Hẹn {formatDate(it.recallDueDate)}
                      </div>
                      {it.assigneeName && (
                        <div className="mt-0.5 text-[12px] text-np-text-muted">
                          Chăm: {it.assigneeName}
                        </div>
                      )}
                      {it.lastCall && (
                        <div className="mt-0.5 text-[12px] text-np-text-muted">
                          Gọi gần nhất: {OUTCOME_LABEL[it.lastCall.outcome] ?? it.lastCall.outcome}
                          {formatDateTime(it.lastCall.at) ? ` · ${formatDateTime(it.lastCall.at)}` : ""}
                        </div>
                      )}
                    </div>
                    <NPButton
                      tone="primary"
                      size="sm"
                      icon={Phone}
                      onClick={() => openSheet(it)}
                      className="flex-shrink-0 self-center"
                    >
                      Gọi
                    </NPButton>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        <div className="h-4" />
      </div>

      {/* Bottom sheet: kết quả gọi */}
      <Sheet open={sheet.open} onOpenChange={(open) => (open ? null : closeSheet())}>
        <SheetContent side="bottom" className="rounded-t-2xl border-0 p-5 pt-3 [&>button]:hidden">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-np-surface-pressed" />

          <div className="mb-4 flex items-center justify-between">
            <SheetTitle className="text-[16px] font-bold text-np-ink">Kết quả gọi</SheetTitle>
            <button
              type="button"
              aria-label="Đóng"
              onClick={closeSheet}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-np-surface-sub text-np-text-sub"
            >
              <X size={16} strokeWidth={2.25} />
            </button>
          </div>

          {sheet.item && (
            <>
              {/* Thẻ khách */}
              <div className="mb-4 flex items-center gap-3 rounded-np-card bg-np-surface-sub p-3">
                <Avatar name={sheet.item.customerName || "Khách"} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold text-np-ink">
                    {sheet.item.customerName || "Khách"}
                  </div>
                  <div className="truncate text-[12px] text-np-text-muted">
                    {sheet.item.phone || "Chưa có số"} · {sheet.item.serviceName}
                  </div>
                </div>
              </div>

              {/* Liên hệ: gọi điện / nhắn Zalo */}
              <div className="mb-4 flex gap-2.5">
                <a
                  href={sheetDigits ? `tel:${sheetDigits}` : undefined}
                  aria-disabled={!sheetDigits}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-np-card border border-np-border-strong bg-white p-3 text-[13px] font-bold text-np-ink",
                    !sheetDigits && "pointer-events-none opacity-50",
                  )}
                >
                  <Phone size={18} strokeWidth={2.25} className="text-np-brand" />
                  Gọi điện
                </a>
                <a
                  href={sheetDigits ? `https://zalo.me/${sheetDigits}` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!sheetDigits}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-np-card border border-np-border-strong bg-white p-3 text-[13px] font-bold text-np-ink",
                    !sheetDigits && "pointer-events-none opacity-50",
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
                  const sel = sheet.outcome === o.value;
                  const Icon = o.icon;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setSheet((p) => ({ ...p, outcome: o.value }))}
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
                <span className="text-[12px] font-bold uppercase tracking-[0.4px] text-np-text-muted">
                  Ghi chú
                </span>
                <span className="text-[11px] text-np-text-muted">Tùy chọn</span>
              </div>
              <Textarea
                placeholder="VD: Khách bận, hẹn gọi lại tuần sau..."
                className="min-h-[72px]"
                value={sheet.note}
                onChange={(e) => setSheet((p) => ({ ...p, note: e.target.value }))}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {NOTE_CHIPS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setSheet((p) => ({ ...p, note: p.note ? `${p.note}, ${t}` : t }))
                    }
                    className="rounded-full border border-np-border-strong bg-white px-3 py-1.5 text-[12px] font-semibold text-np-text-sub"
                  >
                    + {t}
                  </button>
                ))}
              </div>

              {/* Lưu + Hủy — bọc trong div để 2 nút không là con <button> trực tiếp của
                  SheetContent (tránh bị ẩn bởi class [&>button]:hidden dùng cho nút Close). */}
              <div className="mt-5">
                <NPButton
                  tone="primary"
                  size="lg"
                  icon={Check}
                  disabled={logMut.isPending}
                  onClick={() =>
                    sheet.item &&
                    logMut.mutate({
                      orderItemId: sheet.item.orderItemId,
                      outcome: sheet.outcome,
                      note: sheet.note,
                    })
                  }
                  className="w-full justify-center"
                >
                  {logMut.isPending ? "Đang lưu..." : "Lưu kết quả"}
                </NPButton>
                <button
                  type="button"
                  onClick={closeSheet}
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
