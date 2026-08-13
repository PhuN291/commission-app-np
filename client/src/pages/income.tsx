/**
 * Income page — HH cá nhân theo cycle.
 *
 * Spec: B5-3 Section 1 (S-Income).
 * - Sale/BS/TC: xem của mình
 * - KT/CEO: 403 (vào admin-commission-approval)
 *
 * Sections:
 * 1. Hero card — netHh + breakdown
 * 2. HH gốc theo đơn — CR grouped by orderId, có khiếu nại CTA cho TU_CHOI (3-day window)
 * 3. Điều chỉnh — APPROVED only (NV không thấy AUTO_PENDING)
 * 4. Truy thu kì trước — Clawback từ refund kì cũ
 *
 * KHÔNG hiển thị %cap (per task spec).
 */

import monogram from "@assets/np-monogram.png";
import { useState } from "react";
import { Redirect, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch, getCurrentUserId } from "@/lib/queryClient";
import {
  AlertTriangle,
  ContentPasteSearch,
  ChevronRight,
  Gift,
  Info,
} from "@/components/np/icon";
import {
  Badge,
  Card,
  CR_TONE,
  NPButton,
  PageHeader,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CR_STATUS_LABEL,
  canKhieuNai,
  hoursRemainingKhieuNai,
  type CRStatus,
  type UserRole,
} from "@shared/types";

// ─────────────────────────────────────────────────────────────────
// Types matching server response
// ─────────────────────────────────────────────────────────────────

type APICR = {
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

type CROrderGroup = {
  orderId: number;
  orderCode: string;
  serviceName: string;
  crs: APICR[];
};

type Adjustment = {
  id: string;
  userId: number;
  cycleId: string;
  type: "thuong" | "phat";
  amount: number;
  reason: string;
  source: "manual" | "auto_rule";
  status: string;
  createdAt: number;
  approvedByUserId: number | null;
  approvedAt: number | null;
};

type Clawback = {
  id: string;
  userId: number;
  cycleId: string;
  sourceOrderCode: string;
  sourceCycleId: string;
  amount: number;
  reason: string;
  createdAt: number;
};

type IncomeData = {
  cycle: string;
  target: number;
  crGroups: CROrderGroup[];
  adjustments: Adjustment[];
  clawbacks: Clawback[];
  totalHh: number;
  totalAdjustment: number;
  totalClawback: number;
  netHh: number;
  availableCycles: string[];
};

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function fmtVND(n: number) {
  const sign = n < 0 ? "-" : "";
  return sign + new Intl.NumberFormat("vi-VN").format(Math.abs(n)) + "₫";
}

function fmtSignedVND(n: number) {
  if (n > 0) return "+" + fmtVND(n);
  return fmtVND(n);
}

function cycleLabel(cycle: string): string {
  const [y, m] = cycle.split("-");
  return `Tháng ${m}/${y}`;
}

function currentCycleId(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}


// ─────────────────────────────────────────────────────────────────
// Top-level
// ─────────────────────────────────────────────────────────────────

export default function Income() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const role = (typeof window !== "undefined" ? localStorage.getItem("np_role") : null) as UserRole | null;
  const canView = role === "sale" || role === "doctor" || role === "tc";

  const [cycle, setCycle] = useState<string>(currentCycleId());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<IncomeData>({
    queryKey: ["/api/income/me", cycle, getCurrentUserId()],
    enabled: canView,
    queryFn: async () => {
      const res = await authFetch(`/api/income/me?cycle=${encodeURIComponent(cycle)}`);
      if (!res.ok) throw new Error("fetch_failed");
      return res.json();
    },
  });

  const [complaintDialog, setComplaintDialog] = useState<{
    open: boolean;
    cr: APICR | null;
    content: string;
  }>({ open: false, cr: null, content: "" });

  const complaintMut = useMutation({
    mutationFn: async (input: { orderId: number; crId: string; content: string }) => {
      const res = await authFetch(
        `/api/orders/${input.orderId}/cr/${input.crId}/complaint`,
        { method: "POST", body: JSON.stringify({ content: input.content }) },
      );
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã gửi khiếu nại", description: "Kế toán sẽ xem lại trong 1-2 ngày." });
      queryClient.invalidateQueries({ queryKey: ["/api/income/me"] });
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

  if (typeof window !== "undefined" && !canView) {
    return <Redirect to="/" />;
  }

  if (isLoading || !data) {
    return (
      <Screen activeTab={active} onTab={onTab}>
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
        </div>
      </Screen>
    );
  }

  const isEmpty =
    data.crGroups.length === 0 &&
    data.adjustments.length === 0 &&
    data.clawbacks.length === 0;
  const targetPct =
    data.target > 0 ? Math.min(100, Math.round((data.netHh / data.target) * 100)) : 0;

  return (
    <Screen activeTab={active} onTab={onTab}>
      <PageHeader title="Hoa hồng" />

      {/* Cycle selector */}
      <div className="mx-4 mb-3">
        <Select value={cycle} onValueChange={setCycle}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {data.availableCycles.map((c) => (
              <SelectItem key={c} value={c}>
                {cycleLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hero card */}
      <div className="px-4">
        <div
          className="relative overflow-hidden rounded-np-card p-[22px] text-white"
          style={{ background: "linear-gradient(135deg, #1A8A7D 0%, #0F5F56 100%)" }}
        >
          {/* Dấu hiệu nhận diện phòng khám thay cho hình tròn trang trí cũ. Tràn khỏi
              mép phải và mép trên nên chỉ thấy một phần, đủ nhận ra mà không giành chỗ
              của con số. aria-hidden vì đây là hoa văn, không phải thông tin. */}
          <img
            src={monogram}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-2 top-2 h-[104px] w-auto select-none opacity-[0.24]"
          />
          <div className="relative">
            <div className="mb-1.5 text-[11px] font-medium text-white/80">
              Thực nhận
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[34px] font-extrabold leading-none tracking-[-0.8px] tabular-nums">
                {new Intl.NumberFormat("vi-VN").format(data.netHh)}
              </span>
              <span className="text-base font-bold text-white/80">đ</span>
            </div>
            {data.target > 0 && (
              <div className="mt-3.5">
                <div className="mb-1.5 flex items-baseline justify-between text-[11px] font-medium text-white/80">
                  <span>Mục tiêu tháng {fmtVND(data.target)}</span>
                  <span className="font-bold tabular-nums text-white">{targetPct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${targetPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <Card className="mt-5 px-5 py-12 text-center">
          <Info size={36} className="mx-auto text-np-border-strong" />
          <div className="mt-2.5 text-[13px] font-medium text-np-text-muted">
            Chưa có hoa hồng {cycleLabel(cycle).toLowerCase()}
          </div>
        </Card>
      )}

      {/* Section 1: HH gốc theo đơn */}
      {data.crGroups.length > 0 && (
        <>
          <SectionTitle>Hoa hồng theo đơn</SectionTitle>
          <Card className="overflow-hidden p-0">
            {data.crGroups.map((g, gi) => {
              const items = g.serviceName.split(", ").filter(Boolean);
              const firstItem = items[0] ?? g.serviceName;
              const extra = items.length - 1;
              const goDetail = () => navigate(`/orders/${g.orderId}`);
              return (
                <div
                  key={g.orderId}
                  role="button"
                  tabIndex={0}
                  onClick={goDetail}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goDetail();
                    }
                  }}
                  className={
                    "cursor-pointer px-4 py-3.5 transition-colors hover:bg-np-surface-sub active:bg-np-surface-pressed" +
                    (gi === data.crGroups.length - 1 ? "" : " np-divider")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-np-text-sub">
                      {g.orderCode}
                    </span>
                    <ChevronRight size={16} strokeWidth={2.25} className="flex-shrink-0 text-np-text-muted" />
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-np-ink">
                      {firstItem}
                    </span>
                    {extra > 0 && (
                      <span className="flex-shrink-0 text-[12px] font-semibold text-np-text-muted">
                        +{extra} dịch vụ
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-2">
                    {g.crs.map((cr) => (
                      <CRRow
                        key={cr.id}
                        cr={cr}
                        onComplaint={() =>
                          setComplaintDialog({ open: true, cr, content: "" })
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t border-np-border px-4 py-3.5 text-[15px] font-extrabold text-np-ink">
              <span>Tổng hoa hồng</span>
              <span className="tabular-nums">{fmtVND(data.totalHh)}</span>
            </div>
          </Card>
        </>
      )}

      {/* Section 2: Adjustments (APPROVED only) */}
      {data.adjustments.length > 0 && (
        <>
          <SectionTitle>Điều chỉnh</SectionTitle>
          <Card className="overflow-hidden p-0">
            {data.adjustments.map((a, ai) => (
              <AdjustmentRow
                key={a.id}
                adj={a}
                last={ai === data.adjustments.length - 1}
              />
            ))}
            <div className="flex items-center justify-between border-t border-np-border px-4 py-3.5 text-[15px] font-extrabold text-np-ink">
              <span>Tổng điều chỉnh</span>
              <span className={"tabular-nums " + (data.totalAdjustment >= 0 ? "" : "text-np-danger")}>
                {fmtSignedVND(data.totalAdjustment)}
              </span>
            </div>
          </Card>
        </>
      )}

      {/* Section 3: Clawback */}
      {data.clawbacks.length > 0 && (
        <>
          <SectionTitle>Truy thu kỳ trước</SectionTitle>
          <Card className="overflow-hidden p-0">
            {data.clawbacks.map((cb, ci) => (
              <ClawbackRow
                key={cb.id}
                clawback={cb}
                last={ci === data.clawbacks.length - 1}
              />
            ))}
            <div className="flex items-center justify-between border-t border-np-border px-4 py-3.5 text-[15px] font-extrabold text-np-ink">
              <span>Tổng truy thu</span>
              <span className="tabular-nums text-np-danger">
                {fmtSignedVND(data.totalClawback)}
              </span>
            </div>
          </Card>
        </>
      )}


      {/* Khiếu nại dialog (reuse pattern Task 13) */}
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
              <div className="rounded-np-button border border-np-border bg-np-surface-sub p-3 text-[12px]">
                <div className="font-bold text-np-text-sub">Lý do từ chối:</div>
                <div className="mt-0.5 text-np-ink">{complaintDialog.cr.rejectedReason}</div>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-np-text-sub">
                Nội dung khiếu nại
              </label>
              <Textarea
                placeholder="Lý do khiếu nại..."
                value={complaintDialog.content}
                onChange={(e) => setComplaintDialog((p) => ({ ...p, content: e.target.value }))}
              />
            </div>
            <p className="text-[11px] leading-relaxed text-np-text-muted">
              Khiếu nại trong vòng 3 ngày. Kế toán xem lại trong 1-2 ngày. Chỉ khiếu nại được 1 lần.
            </p>
          </div>
          <DialogFooter>
            <NPButton tone="ghost" onClick={() => setComplaintDialog({ open: false, cr: null, content: "" })}>
              Hủy
            </NPButton>
            <NPButton
              tone="primary"
              disabled={
                !complaintDialog.content ||
                complaintDialog.content.length < 2 ||
                complaintMut.isPending
              }
              onClick={() =>
                complaintDialog.cr &&
                complaintMut.mutate({
                  orderId: complaintDialog.cr.orderId,
                  crId: complaintDialog.cr.id,
                  content: complaintDialog.content,
                })
              }
            >
              {complaintMut.isPending ? "Đang gửi..." : "Gửi khiếu nại"}
            </NPButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────

function CRRow({ cr, onComplaint }: { cr: APICR; onComplaint: () => void }) {
  const eligible = canKhieuNai({ status: cr.status, rejectedAt: cr.rejectedAt });
  const hoursLeft = hoursRemainingKhieuNai(cr.rejectedAt);
  const showKhieuNai = cr.status === "TU_CHOI";

  return (
    <div className="flex items-start justify-between gap-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={CR_TONE[cr.status]}>{CR_STATUS_LABEL[cr.status]}</Badge>
        </div>
        {cr.status === "TU_CHOI" && cr.rejectedReason && (
          <div className="mt-1 text-[11px] text-np-text-sub">
            Lý do: {cr.rejectedReason}
          </div>
        )}
        {showKhieuNai && (
          <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
            {eligible ? (
              <NPButton tone="primary" size="sm" onClick={onComplaint}>
                Khiếu nại (còn {hoursLeft}h)
              </NPButton>
            ) : (
              <NPButton tone="ghost" size="sm" disabled>
                Quá hạn khiếu nại (3 ngày)
              </NPButton>
            )}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 text-[14px] font-extrabold tabular-nums text-np-brand-ink">
        {fmtVND(cr.amount)}
      </div>
    </div>
  );
}

function AdjustmentRow({ adj, last }: { adj: Adjustment; last?: boolean }) {
  const isThuong = adj.type === "thuong";
  const Icon = isThuong ? Gift : AlertTriangle;
  return (
    <div
      className={
        "flex items-start gap-3 px-4 py-3.5" +
        (last ? "" : " np-divider")
      }
    >
      <Icon size={18} strokeWidth={2.25} className="mt-1 flex-shrink-0 text-np-text-muted" />
      <div className="min-w-0 flex-1">
        <span className="text-[13px] font-bold text-np-ink">
          {isThuong ? "Thưởng" : "Phạt"}
        </span>
        <div className="mt-0.5 text-[12px] text-np-text-sub">{adj.reason}</div>
      </div>
      <div
        className={
          "flex-shrink-0 text-[14px] font-extrabold tabular-nums " +
          (isThuong ? "text-np-badge-success-fg" : "text-np-badge-critical-fg")
        }
      >
        {fmtSignedVND(adj.amount)}
      </div>
    </div>
  );
}

function ClawbackRow({ clawback, last }: { clawback: Clawback; last?: boolean }) {
  return (
    <div
      className={
        "flex items-start gap-3 px-4 py-3.5" +
        (last ? "" : " np-divider")
      }
    >
      <ContentPasteSearch size={18} strokeWidth={2.25} className="mt-1 flex-shrink-0 text-np-text-muted" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold text-np-ink">{clawback.sourceOrderCode}</div>
        <div className="mt-0.5 text-[12px] text-np-text-sub">{clawback.reason}</div>
        <div className="mt-0.5 text-[11px] text-np-text-muted">
          Kỳ gốc: {cycleLabel(clawback.sourceCycleId)}
        </div>
      </div>
      <div className="flex-shrink-0 text-[14px] font-extrabold tabular-nums text-np-danger">
        {fmtSignedVND(clawback.amount)}
      </div>
    </div>
  );
}
