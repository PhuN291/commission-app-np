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
import { useQuayLai } from "@/lib/use-back";
import { useLocation } from "wouter";
import {
  Calendar,
  PermPhoneMsg,
} from "@/components/np/icon";
import {
  CallResultSheet,
  type CallOutcome,
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
import { authFetch, getCurrentUserId } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

const OUTCOME_LABEL: Record<string, string> = {
  scheduled: "Đã đặt lịch",
  no_answer: "Chưa bắt máy",
  refused: "Khách từ chối",
  other: "Khác",
};


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
  // Chưa tới hạn là đang chạy đúng tiến độ, không phải nhãn trung tính.
  return { text: `Còn ${-days} ngày`, tone: "info" };
}

type FilterKey = "all" | "overdue" | "today" | "upcoming";

export default function RecallWorklist() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const quayLai = useQuayLai("/");
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

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Tái khám cần gọi" onBack={quayLai} trailing={<div />} />

      <div className="min-h-full flow-root bg-np-bg">
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
              <PermPhoneMsg size={36} className="mx-auto text-np-border-strong" />
              <div className="mt-2.5 text-[13px] font-medium text-np-text-muted">
                Chưa có lượt cần gọi
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${it.customerId}`);
                          }}
                          className="max-w-full truncate text-left text-[15px] font-bold text-np-ink transition-opacity active:underline active:opacity-70"
                        >
                          {it.customerName || "Khách"}
                        </button>
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
                          Phụ trách: {it.assigneeName}
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
                      onClick={() => openSheet(it)}
                      className="flex-shrink-0 self-center"
                    >
                      Hành động
                    </NPButton>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <CallResultSheet
        open={sheet.open}
        onClose={closeSheet}
        customerId={sheet.item?.customerId ?? 0}
        customerName={sheet.item?.customerName ?? ""}
        phone={sheet.item?.phone ?? ""}
        serviceName={sheet.item?.serviceName ?? ""}
        saving={logMut.isPending}
        onSave={({ outcome, note }) =>
          sheet.item && logMut.mutate({ orderItemId: sheet.item.orderItemId, outcome, note })
        }
      />

    </Screen>
  );
}
