/**
 * Admin: Commission Approval (Diễm/KT review)
 *
 * Spec: B5-3 Section 3 (S-Admin-Commission-Approval).
 * 4 tabs: Duyệt CR / Khiếu nại / Adjustment / Export.
 *
 * Permission (R-9-1 + R-11-7):
 * - GET: KT + CEO + TC view
 * - POST/PATCH: KT only (CEO không involve, R-11-7)
 *
 * Bulk safety: whole-cycle bulk-all yêu cầu typing "DUYỆT" + acknowledge checkbox.
 */

import { useState } from "react";
import { useQuayLai } from "@/lib/use-back";
import { Redirect, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/queryClient";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Gift,
  ShieldAlert,
  Verified,
  XCircle,
} from "@/components/np/icon";
import {
  Badge,
  Card,
  DetailHeader,
  NPButton,
  PageHeader,
  Screen,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  BULK_APPROVE_KEYWORD,
  CR_STATUS_LABEL,
  ROLE_LABEL,
  type CRStatus,
  type UserRole,
} from "@shared/types";

// ─────────────────────────────────────────────────────────────────
// Types matching server
// ─────────────────────────────────────────────────────────────────

type CR = {
  id: string;
  orderId: number;
  role: "sale" | "tc" | "doctor";
  userId: number;
  beneficiaryName: string;
  amount: number;
  status: CRStatus;
  createdAt: number;
  rejectedAt: number | null;
  rejectedReason: string | null;
};

type OrderGroup = {
  orderId: number;
  orderCode: string;
  serviceName: string;
  patientName: string;
  totalPrice: number;
  crs: CR[];
};

type ComplaintEntry = {
  id: string;
  crId: string;
  userId: number;
  content: string;
  createdAt: number;
};

type ComplaintCard = {
  cr: CR;
  orderCode: string;
  serviceName: string;
  complaints: ComplaintEntry[];
};

type Adjustment = {
  id: string;
  userId: number;
  beneficiaryName: string;
  cycleId: string;
  type: "thuong" | "phat";
  amount: number;
  reason: string;
  source: "manual" | "auto_rule";
  status: string;
  createdAt: number;
  approvedByUserId: number | null;
  approvedAt: number | null;
  canEdit: boolean;
};

type ApprovalData = {
  cycle: string;
  availableCycles: string[];
  stats: {
    pending: { count: number; totalAmount: number };
    rejected: { count: number; totalAmount: number };
    complaints: { count: number; totalAmount: number };
    approved: { count: number; totalAmount: number };
  };
  orderGroups: OrderGroup[];
  pendingComplaints: ComplaintCard[];
  adjustments: Adjustment[];
};

type Tab = "cr" | "complaint" | "adjustment" | "export";

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

export default function AdminCommissionApproval() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const quayLai = useQuayLai("/");
  const role = (typeof window !== "undefined" ? localStorage.getItem("np_role") : null) as UserRole | null;
  const canView = role === "kt" || role === "ceo" || role === "tc";
  const canEdit = role === "kt";

  const [cycle, setCycle] = useState<string>(currentCycleId());
  const [tab, setTab] = useState<Tab>("cr");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<ApprovalData>({
    queryKey: ["/api/admin/commission-approval", cycle],
    enabled: canView,
    queryFn: async () => {
      const res = await authFetch(
        `/api/admin/commission-approval?cycle=${encodeURIComponent(cycle)}`,
      );
      if (!res.ok) throw new Error("fetch_failed");
      return res.json();
    },
  });

  // ───────── Mutations ─────────

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/admin/commission-approval"] });

  const approveCRMut = useMutation({
    mutationFn: async (crId: string) => {
      const res = await authFetch(
        `/api/admin/commission-approval/cr/${crId}/approve`,
        { method: "POST" },
      );
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã duyệt hoa hồng" });
      invalidate();
    },
    onError: (err: any) => toast({ title: "Lỗi", description: err?.error || "", variant: "destructive" }),
  });

  const rejectCRMut = useMutation({
    mutationFn: async (input: { crId: string; reason: string }) => {
      const res = await authFetch(
        `/api/admin/commission-approval/cr/${input.crId}/reject`,
        { method: "POST", body: JSON.stringify({ reason: input.reason }) },
      );
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã từ chối hoa hồng" });
      invalidate();
      setRejectDialog({ open: false, cr: null, reason: "" });
    },
    onError: (err: any) =>
      toast({ title: "Lỗi", description: err?.issues?.[0]?.message || err?.error || "", variant: "destructive" }),
  });

  const bulkOrderMut = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await authFetch(
        `/api/admin/commission-approval/order/${orderId}/bulk-approve`,
        { method: "POST" },
      );
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: (result) => {
      toast({ title: "Đã duyệt cả đơn", description: `${result.approved}/${result.total} khoản` });
      invalidate();
    },
    onError: (err: any) => toast({ title: "Lỗi", description: err?.error || "", variant: "destructive" }),
  });

  const bulkCycleMut = useMutation({
    mutationFn: async (input: { typed: string; ack: boolean }) => {
      const res = await authFetch(
        `/api/admin/commission-approval/bulk-approve-cycle`,
        {
          method: "POST",
          body: JSON.stringify({
            cycle,
            typedConfirmation: input.typed,
            acknowledged: input.ack,
          }),
        },
      );
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Duyệt hàng loạt thành công",
        description: `${result.approved} khoản · ${fmtVND(result.totalAmount)} · ${result.affectedOrders} đơn`,
      });
      invalidate();
      setBulkDialog({ open: false, typed: "", ack: false });
    },
    onError: (err: any) =>
      toast({
        title: "Lỗi",
        description: err?.issues?.[0]?.message || err?.error || "",
        variant: "destructive",
      }),
  });

  const resolveComplaintMut = useMutation({
    mutationFn: async (input: { crId: string; resolution: "revert" | "keep"; note?: string }) => {
      const res = await authFetch(
        `/api/admin/commission-approval/complaint/${input.crId}/resolve`,
        {
          method: "POST",
          body: JSON.stringify({ resolution: input.resolution, note: input.note }),
        },
      );
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã xử lý khiếu nại" });
      invalidate();
      setComplaintDialog({ open: false, card: null, resolution: "revert", note: "" });
    },
    onError: (err: any) =>
      toast({
        title: "Lỗi",
        description: err?.issues?.[0]?.message || err?.error || "",
        variant: "destructive",
      }),
  });

  const cancelAdjustmentMut = useMutation({
    mutationFn: async (adjId: string) => {
      const res = await authFetch(
        `/api/admin/commission-approval/adjustment/${adjId}/cancel`,
        { method: "POST" },
      );
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã hủy điều chỉnh" });
      invalidate();
    },
    onError: (err: any) => toast({ title: "Lỗi", description: err?.error || "", variant: "destructive" }),
  });

  // ───────── Dialog states ─────────

  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    cr: CR | null;
    reason: string;
  }>({ open: false, cr: null, reason: "" });
  const [bulkDialog, setBulkDialog] = useState<{ open: boolean; typed: string; ack: boolean }>({
    open: false,
    typed: "",
    ack: false,
  });
  const [complaintDialog, setComplaintDialog] = useState<{
    open: boolean;
    card: ComplaintCard | null;
    resolution: "revert" | "keep";
    note: string;
  }>({ open: false, card: null, resolution: "revert", note: "" });

  // ───────── Permission redirect ─────────

  if (typeof window !== "undefined" && !canView) {
    return <Redirect to="/" />;
  }

  if (isLoading || !data) {
    return (
      <Screen activeTab={active} onTab={onTab} noHeader>
        <DetailHeader title="Duyệt hoa hồng" onBack={quayLai} />
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
        </div>
      </Screen>
    );
  }

  const toggleExpand = (orderId: number) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Duyệt hoa hồng" onBack={quayLai} />

      <div className="min-h-full flow-root bg-np-bg">
        <PageHeader title={`Duyệt hoa hồng ${cycleLabel(cycle).toLowerCase()}`} />

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

        {/* Tabs */}
        <TabPills
          tab={tab}
          setTab={setTab}
          counts={{
            cr: data.stats.pending.count,
            complaint: data.pendingComplaints.length,
            adjustment: data.adjustments.length,
            export: 0,
          }}
        />

        {/* Tab: CR */}
        {tab === "cr" && (
          <CRTab
            data={data}
            canEdit={canEdit}
            expandedOrders={expandedOrders}
            onToggleExpand={toggleExpand}
            onApprove={(crId) => approveCRMut.mutate(crId)}
            onReject={(cr) => setRejectDialog({ open: true, cr, reason: "" })}
            onBulkOrder={(orderId) => bulkOrderMut.mutate(orderId)}
            onBulkCycle={() => setBulkDialog({ open: true, typed: "", ack: false })}
            isApproving={approveCRMut.isPending || bulkOrderMut.isPending}
          />
        )}

        {/* Tab: Complaint */}
        {tab === "complaint" && (
          <ComplaintTab
            cards={data.pendingComplaints}
            canEdit={canEdit}
            onResolve={(card) =>
              setComplaintDialog({ open: true, card, resolution: "revert", note: "" })
            }
          />
        )}

        {/* Tab: Adjustment */}
        {tab === "adjustment" && (
          <AdjustmentTab
            items={data.adjustments}
            canEdit={canEdit}
            onCancel={(id) => cancelAdjustmentMut.mutate(id)}
            onCreate={() => navigate("/admin/adjustment/new")}
          />
        )}

        {/* Tab: Export */}
        {tab === "export" && (
          <ExportTab
            cycle={cycle}
            stats={data.stats}
            onExport={() => navigate("/admin/export-payroll")}
          />
        )}
      </div>

      {/* Reject CR dialog */}
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
              {rejectDialog.cr && ROLE_LABEL[rejectDialog.cr.role as UserRole]} ·{" "}
              {rejectDialog.cr ? fmtVND(rejectDialog.cr.amount) : ""}
            </p>
            <Textarea
              placeholder="Lý do từ chối (tối thiểu 10 ký tự)..."
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog((p) => ({ ...p, reason: e.target.value }))}
            />
            <p className="text-[11px] text-np-text-muted">
              Nhân viên được phép khiếu nại trong 3 ngày kể từ khi bị từ chối.
            </p>
          </div>
          <DialogFooter>
            <NPButton tone="ghost" onClick={() => setRejectDialog({ open: false, cr: null, reason: "" })}>
              Hủy
            </NPButton>
            <NPButton
              tone="dark"
              disabled={rejectDialog.reason.length < 10 || rejectCRMut.isPending}
              onClick={() =>
                rejectDialog.cr &&
                rejectCRMut.mutate({ crId: rejectDialog.cr.id, reason: rejectDialog.reason })
              }
            >
              {rejectCRMut.isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
            </NPButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk-all cycle dialog (safety gate) */}
      <Dialog
        open={bulkDialog.open}
        onOpenChange={(open) => setBulkDialog((p) => ({ ...p, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-np-danger">
              <ShieldAlert size={18} /> Duyệt hàng loạt cả kỳ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-np-button border border-np-danger-bg bg-np-danger-bg/30 p-3 text-[13px] font-medium text-np-danger">
              Sắp duyệt <strong>{data.stats.pending.count}</strong> khoản hoa hồng (
              <strong>{fmtVND(data.stats.pending.totalAmount)}</strong>) cho{" "}
              <strong>{cycleLabel(cycle)}</strong>.
              <div className="mt-1 text-[11px] font-medium">
                Hành động không khôi phục được. Thao tác này được lưu vết để tra cứu.
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-np-text-sub">
                Gõ chính xác "<strong>{BULK_APPROVE_KEYWORD}</strong>" để xác nhận:
              </label>
              <Input
                placeholder={BULK_APPROVE_KEYWORD}
                value={bulkDialog.typed}
                onChange={(e) => setBulkDialog((p) => ({ ...p, typed: e.target.value }))}
                autoFocus
              />
            </div>
            <label className="flex items-center gap-2 text-[13px] text-np-text-sub">
              <Checkbox
                checked={bulkDialog.ack}
                onCheckedChange={(v) => setBulkDialog((p) => ({ ...p, ack: v === true }))}
              />
              <span>Tôi đã xem lại tất cả khoản hoa hồng trong kỳ này</span>
            </label>
          </div>
          <DialogFooter>
            <NPButton tone="ghost" onClick={() => setBulkDialog({ open: false, typed: "", ack: false })}>
              Hủy
            </NPButton>
            <NPButton
              tone="dark"
              disabled={
                bulkDialog.typed !== BULK_APPROVE_KEYWORD ||
                !bulkDialog.ack ||
                bulkCycleMut.isPending ||
                data.stats.pending.count === 0
              }
              onClick={() => bulkCycleMut.mutate({ typed: bulkDialog.typed, ack: bulkDialog.ack })}
            >
              {bulkCycleMut.isPending
                ? "Đang xử lý..."
                : `Duyệt ${data.stats.pending.count} khoản`}
            </NPButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complaint resolve dialog */}
      <Dialog
        open={complaintDialog.open}
        onOpenChange={(open) => setComplaintDialog((p) => ({ ...p, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xử lý khiếu nại</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {complaintDialog.card && (
              <>
                <div className="text-[13px] text-np-text-sub">
                  <strong className="text-np-ink">{complaintDialog.card.cr.beneficiaryName}</strong> ·{" "}
                  {ROLE_LABEL[complaintDialog.card.cr.role as UserRole]} ·{" "}
                  {fmtVND(complaintDialog.card.cr.amount)}
                </div>
                {complaintDialog.card.cr.rejectedReason && (
                  <div className="rounded-np-button border border-np-border bg-np-surface-sub p-2 text-[12px]">
                    <span className="font-bold text-np-text-sub">Lý do từ chối:</span>{" "}
                    {complaintDialog.card.cr.rejectedReason}
                  </div>
                )}
                {complaintDialog.card.complaints.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-np-button border border-np-brand-soft bg-np-brand-soft/30 p-2 text-[12px]"
                  >
                    <span className="font-bold text-np-brand-ink">Nhân viên khiếu nại:</span>{" "}
                    {c.content}
                  </div>
                ))}
              </>
            )}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-np-text-sub">
                Quyết định
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setComplaintDialog((p) => ({ ...p, resolution: "revert" }))}
                  className={
                    "flex-1 rounded-np-button border px-3 py-2 text-[13px] font-semibold transition-colors " +
                    (complaintDialog.resolution === "revert"
                      ? "border-np-brand bg-np-brand-soft text-np-brand-ink"
                      : "border-np-border-strong bg-white text-np-text-sub")
                  }
                >
                  Khôi phục + duyệt
                </button>
                <button
                  type="button"
                  onClick={() => setComplaintDialog((p) => ({ ...p, resolution: "keep" }))}
                  className={
                    "flex-1 rounded-np-button border px-3 py-2 text-[13px] font-semibold transition-colors " +
                    (complaintDialog.resolution === "keep"
                      ? "border-np-danger bg-np-danger-bg text-np-danger"
                      : "border-np-border-strong bg-white text-np-text-sub")
                  }
                >
                  Giữ từ chối
                </button>
              </div>
            </div>
            {complaintDialog.resolution === "keep" && (
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-np-text-sub">
                  Ghi chú (bắt buộc khi giữ từ chối)
                </label>
                <Textarea
                  placeholder="Lý do bổ sung gửi nhân viên..."
                  value={complaintDialog.note}
                  onChange={(e) => setComplaintDialog((p) => ({ ...p, note: e.target.value }))}
                />
              </div>
            )}
            <p className="text-[11px] text-np-text-muted">
              Kế toán là người quyết định cuối cùng cho khiếu nại này.
            </p>
          </div>
          <DialogFooter>
            <NPButton
              tone="ghost"
              onClick={() => setComplaintDialog({ open: false, card: null, resolution: "revert", note: "" })}
            >
              Hủy
            </NPButton>
            <NPButton
              tone="primary"
              disabled={
                resolveComplaintMut.isPending ||
                (complaintDialog.resolution === "keep" && complaintDialog.note.length < 2)
              }
              onClick={() =>
                complaintDialog.card &&
                resolveComplaintMut.mutate({
                  crId: complaintDialog.card.cr.id,
                  resolution: complaintDialog.resolution,
                  note: complaintDialog.resolution === "keep" ? complaintDialog.note : undefined,
                })
              }
            >
              {resolveComplaintMut.isPending ? "Đang xử lý..." : "Xác nhận"}
            </NPButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────
// Tab pills
// ─────────────────────────────────────────────────────────────────

function TabPills({
  tab,
  setTab,
  counts,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  counts: { cr: number; complaint: number; adjustment: number; export: number };
}) {
  const items: Array<{ key: Tab; label: string; count: number }> = [
    { key: "cr", label: "Duyệt hoa hồng", count: counts.cr },
    { key: "complaint", label: "Khiếu nại", count: counts.complaint },
    { key: "adjustment", label: "Điều chỉnh", count: counts.adjustment },
    { key: "export", label: "Xuất file", count: 0 },
  ];
  return (
    <div className="scrollbar-hide mb-2 flex gap-1.5 overflow-x-auto px-4 pb-2">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => setTab(it.key)}
          className={
            "flex flex-shrink-0 items-center gap-1.5 rounded-np-chip border px-3.5 py-[7px] text-[13px] transition-colors " +
            (tab === it.key
              ? "border-np-ink bg-np-ink font-bold text-white"
              : "border-np-border-strong bg-white font-semibold text-np-text-sub")
          }
        >
          {it.label}
          {it.count > 0 && (
            <span
              className={
                "text-[12px] font-medium tabular-nums " +
                (tab === it.key ? "text-white/80" : "text-np-text-muted")
              }
            >
              {it.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CR Tab — list orders với CRs grouped, bulk actions
// ─────────────────────────────────────────────────────────────────

function CRTab({
  data,
  canEdit,
  expandedOrders,
  onToggleExpand,
  onApprove,
  onReject,
  onBulkOrder,
  onBulkCycle,
  isApproving,
}: {
  data: ApprovalData;
  canEdit: boolean;
  expandedOrders: Set<number>;
  onToggleExpand: (orderId: number) => void;
  onApprove: (crId: string) => void;
  onReject: (cr: CR) => void;
  onBulkOrder: (orderId: number) => void;
  onBulkCycle: () => void;
  isApproving: boolean;
}) {
  return (
    <>
      {/* Stats summary */}
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <StatCard
          label="Chờ duyệt"
          count={data.stats.pending.count}
          amount={data.stats.pending.totalAmount}
          tone="attention"
        />
        <StatCard
          label="Đã duyệt"
          count={data.stats.approved.count}
          amount={data.stats.approved.totalAmount}
          tone="success"
        />
      </div>

      {/* Bulk-all cycle button (KT only) */}
      {canEdit && data.stats.pending.count > 0 && (
        <div className="mx-4 mb-3">
          <NPButton
            tone="dark"
            size="lg"
            icon={ShieldAlert}
            className="w-full justify-center"
            onClick={onBulkCycle}
          >
            Duyệt TẤT CẢ {data.stats.pending.count} khoản kỳ này
          </NPButton>
        </div>
      )}

      {/* Order groups */}
      {data.orderGroups.length === 0 ? (
        <Card className="px-5 py-12 text-center">
          <Verified size={36} className="mx-auto text-np-border-strong" />
          <div className="mt-2.5 text-[13px] font-medium text-np-text-muted">
            Chưa có hoa hồng trong kỳ
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.orderGroups.map((g) => (
            <OrderGroupCard
              key={g.orderId}
              group={g}
              canEdit={canEdit}
              expanded={expandedOrders.has(g.orderId)}
              onToggle={() => onToggleExpand(g.orderId)}
              onApprove={onApprove}
              onReject={onReject}
              onBulkOrder={() => onBulkOrder(g.orderId)}
              isApproving={isApproving}
            />
          ))}
        </div>
      )}
    </>
  );
}

function StatCard({
  label,
  count,
  amount,
  tone,
}: {
  label: string;
  count: number;
  amount: number;
  tone: "attention" | "success";
}) {
  const colorClass =
    tone === "attention" ? "text-np-badge-attention-fg" : "text-np-badge-success-fg";
  return (
    <div className="bg-white px-3.5 py-3">
      <div className="text-[11px] font-bold text-np-text-muted">
        {label}
      </div>
      <div className={"mt-1 text-[20px] font-extrabold tabular-nums " + colorClass}>{count}</div>
      <div className="mt-0.5 text-[11px] font-medium tabular-nums text-np-text-sub">
        {fmtVND(amount)}
      </div>
    </div>
  );
}

function OrderGroupCard({
  group,
  canEdit,
  expanded,
  onToggle,
  onApprove,
  onReject,
  onBulkOrder,
  isApproving,
}: {
  group: OrderGroup;
  canEdit: boolean;
  expanded: boolean;
  onToggle: () => void;
  onApprove: (crId: string) => void;
  onReject: (cr: CR) => void;
  onBulkOrder: () => void;
  isApproving: boolean;
}) {
  const pendingCRs = group.crs.filter((c) => c.status === "CHO_DUYET");
  const total = group.crs.reduce((s, c) => s + c.amount, 0);
  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-np-surface-pressed"
      >
        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-np-text-muted">
            {group.orderCode}
          </div>
          <div className="mt-0.5 truncate text-[13px] font-bold text-np-ink">
            {group.serviceName}
          </div>
          <div className="mt-0.5 text-[11px] text-np-text-muted">
            {group.patientName} · {group.crs.length} khoản
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-bold text-np-brand-ink tabular-nums">
            {fmtVND(total)}
          </div>
          {pendingCRs.length > 0 && (
            <div className="text-[11px] font-medium text-np-badge-attention-fg">
              {pendingCRs.length} chờ
            </div>
          )}
        </div>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-np-surface-pressed bg-white px-4 py-3">
          {group.crs.map((cr) => (
            <CRRow
              key={cr.id}
              cr={cr}
              canEdit={canEdit}
              onApprove={() => onApprove(cr.id)}
              onReject={() => onReject(cr)}
            />
          ))}
          {canEdit && pendingCRs.length > 1 && (
            <NPButton
              tone="primary"
              size="sm"
              icon={Verified}
              className="mt-2 w-full justify-center"
              onClick={onBulkOrder}
              disabled={isApproving}
            >
              Duyệt cả đơn này
            </NPButton>
          )}
        </div>
      )}
    </Card>
  );
}

function CRRow({
  cr,
  canEdit,
  onApprove,
  onReject,
}: {
  cr: CR;
  canEdit: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const tone =
    cr.status === "DUOC_DUYET"
      ? "success"
      : cr.status === "TU_CHOI"
        ? "critical"
        : cr.status === "KHIEU_NAI"
          ? "attention"
          : "neutral";
  const isPending = cr.status === "CHO_DUYET";
  return (
    <div className="rounded-np-button border border-np-border bg-white p-3">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-bold text-np-ink">
              {ROLE_LABEL[cr.role as UserRole]}
            </span>
            <Badge tone={tone as any}>{CR_STATUS_LABEL[cr.status]}</Badge>
          </div>
          <div className="mt-0.5 text-[11px] text-np-text-muted">{cr.beneficiaryName}</div>
          {cr.rejectedReason && cr.status === "TU_CHOI" && (
            <div className="mt-1 text-[11px] text-np-text-sub">
              Lý do: {cr.rejectedReason}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-[14px] font-extrabold text-np-brand-ink tabular-nums">
          {fmtVND(cr.amount)}
        </div>
      </div>
      {canEdit && isPending && (
        <div className="mt-2 flex gap-2">
          <NPButton tone="primary" size="sm" icon={Verified} onClick={onApprove}>
            Duyệt
          </NPButton>
          <NPButton tone="ghost" size="sm" icon={XCircle} onClick={onReject}>
            Từ chối
          </NPButton>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Complaint Tab
// ─────────────────────────────────────────────────────────────────

function ComplaintTab({
  cards,
  canEdit,
  onResolve,
}: {
  cards: ComplaintCard[];
  canEdit: boolean;
  onResolve: (card: ComplaintCard) => void;
}) {
  if (cards.length === 0) {
    return (
      <Card className="px-5 py-12 text-center">
        <Verified size={36} className="mx-auto text-np-border-strong" />
        <div className="mt-2.5 text-[13px] font-medium text-np-text-muted">
          Chưa có khiếu nại chờ xử lý
        </div>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {cards.map((card) => (
        <Card key={card.cr.id} className="p-4">
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-np-text-muted">
                {card.orderCode}
              </div>
              <div className="mt-0.5 text-[13px] font-bold text-np-ink">
                {card.serviceName}
              </div>
              <div className="mt-0.5 text-[11px] text-np-text-muted">
                {card.cr.beneficiaryName} · {ROLE_LABEL[card.cr.role as UserRole]}
              </div>
            </div>
            <div className="flex-shrink-0 text-[14px] font-extrabold text-np-brand-ink tabular-nums">
              {fmtVND(card.cr.amount)}
            </div>
          </div>
          {card.cr.rejectedReason && (
            <div className="mt-2 rounded-np-button border border-np-border bg-np-surface-sub p-2 text-[11px]">
              <span className="font-bold text-np-text-sub">Lý do từ chối:</span>{" "}
              {card.cr.rejectedReason}
            </div>
          )}
          {card.complaints.map((c) => (
            <div
              key={c.id}
              className="mt-2 rounded-np-button border border-np-brand-soft bg-np-brand-soft/30 p-2 text-[11px]"
            >
              <span className="font-bold text-np-brand-ink">Nhân viên khiếu nại:</span> {c.content}
            </div>
          ))}
          {canEdit && (
            <NPButton
              tone="primary"
              size="sm"
              className="mt-3 w-full justify-center"
              onClick={() => onResolve(card)}
            >
              Xử lý khiếu nại
            </NPButton>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Adjustment Tab — 3 sections: PENDING / APPROVED / Create link
// ─────────────────────────────────────────────────────────────────

function AdjustmentTab({
  items,
  canEdit,
  onCancel,
  onCreate,
}: {
  items: Adjustment[];
  canEdit: boolean;
  onCancel: (id: string) => void;
  onCreate: () => void;
}) {
  const pending = items.filter((a) => a.status === "PENDING" || a.status === "AUTO_PENDING");
  const approved = items.filter((a) => a.status === "APPROVED" || a.status === "EDITED");

  return (
    <div className="space-y-3">
      {/* Section 1: Pending queue */}
      <div>
        <h3 className="mb-2 text-[13px] font-bold text-np-ink">Chờ CEO duyệt ({pending.length})</h3>
        {pending.length === 0 ? (
          <Card className="px-5 py-8 text-center">
            <Clock size={28} className="mx-auto text-np-border-strong" />
            <div className="mt-2 text-[12px] font-medium text-np-text-muted">
              Chưa có điều chỉnh chờ duyệt
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            {pending.map((a, i) => (
              <AdjustmentRow
                key={a.id}
                adj={a}
                canEdit={canEdit}
                onCancel={() => onCancel(a.id)}
                last={i === pending.length - 1}
              />
            ))}
          </Card>
        )}
      </div>

      {/* Section 2: Approved (edit window) */}
      <div>
        <h3 className="mb-2 text-[13px] font-bold text-np-ink">
          Đã duyệt (sửa được trong 30 ngày, {approved.length})
        </h3>
        {approved.length === 0 ? (
          <Card className="px-5 py-8 text-center">
            <Verified size={28} className="mx-auto text-np-border-strong" />
            <div className="mt-2 text-[12px] font-medium text-np-text-muted">
              Chưa có điều chỉnh được duyệt
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            {approved.map((a, i) => (
              <AdjustmentRow
                key={a.id}
                adj={a}
                canEdit={canEdit}
                last={i === approved.length - 1}
              />
            ))}
          </Card>
        )}
      </div>

      {/* Section 3: Create new link */}
      {canEdit && (
        <NPButton
          tone="ghost"
          size="lg"
          className="w-full justify-center"
          onClick={onCreate}
        >
          + Tạo điều chỉnh mới
        </NPButton>
      )}
      <p className="text-center text-[11px] text-np-text-muted">
        Tính năng tạo điều chỉnh đang được hoàn thiện.
      </p>
    </div>
  );
}

function AdjustmentRow({
  adj,
  canEdit,
  onCancel,
  last,
}: {
  adj: Adjustment;
  canEdit: boolean;
  onCancel?: () => void;
  last?: boolean;
}) {
  const isThuong = adj.type === "thuong";
  const Icon = isThuong ? Gift : AlertTriangle;
  const isPending = adj.status === "PENDING" || adj.status === "AUTO_PENDING";
  return (
    <div
      className={
        "flex items-start gap-3 px-4 py-3.5" +
        (last ? "" : " np-divider")
      }
    >
      <div
        className={
          "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-np-button " +
          (isThuong ? "bg-np-brand-soft text-np-brand-ink" : "bg-np-danger-bg/40 text-np-danger")
        }
      >
        <Icon size={16} strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] font-bold text-np-ink">
            {isThuong ? "Thưởng" : "Phạt"}
          </span>
          <Badge tone="neutral">{adj.beneficiaryName}</Badge>
          {isPending && <Badge tone="attention">{adj.status === "AUTO_PENDING" ? "Tự động · chờ CEO" : "Chờ CEO"}</Badge>}
          {adj.status === "APPROVED" && adj.canEdit && (
            <Badge tone="success">Sửa được</Badge>
          )}
        </div>
        <div className="mt-0.5 text-[12px] text-np-text-sub">{adj.reason}</div>
        {canEdit && isPending && onCancel && (
          <NPButton tone="ghost" size="sm" className="mt-2" onClick={onCancel}>
            Hủy điều chỉnh
          </NPButton>
        )}
      </div>
      <div
        className={
          "flex-shrink-0 text-[14px] font-extrabold tabular-nums " +
          (isThuong ? "text-np-badge-success-fg" : "text-np-danger")
        }
      >
        {fmtSignedVND(adj.amount)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Export Tab — placeholder MS-12 link
// ─────────────────────────────────────────────────────────────────

function ExportTab({
  cycle,
  stats,
  onExport,
}: {
  cycle: string;
  stats: ApprovalData["stats"];
  onExport: () => void;
}) {
  const exportable = stats.approved.count + stats.pending.count;
  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={20} className="text-np-brand-ink" />
          <h3 className="text-[15px] font-bold text-np-ink">
            Xuất file kỳ lương {cycleLabel(cycle)}
          </h3>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-np-button border border-np-border bg-np-surface-sub p-3">
            <div className="text-[11px] font-bold text-np-text-muted">
              Tổng khoản
            </div>
            <div className="mt-1 text-[18px] font-extrabold tabular-nums text-np-ink">
              {exportable}
            </div>
          </div>
          <div className="rounded-np-button border border-np-border bg-np-surface-sub p-3">
            <div className="text-[11px] font-bold text-np-text-muted">
              Đã duyệt
            </div>
            <div className="mt-1 text-[18px] font-extrabold tabular-nums text-np-badge-success-fg">
              {stats.approved.count}
            </div>
          </div>
        </div>

        <div className="mt-3 text-[12px] font-medium text-np-text-sub">
          Tổng hoa hồng: <strong className="text-np-ink">{fmtVND(stats.approved.totalAmount + stats.pending.totalAmount)}</strong>
        </div>

        <NPButton
          tone="primary"
          size="lg"
          icon={Download}
          className="mt-4 w-full justify-center"
          onClick={onExport}
        >
          Mở trang xuất file Excel
          <ExternalLink size={14} className="ml-1.5" />
        </NPButton>

        <p className="mt-2 text-[11px] leading-relaxed text-np-text-muted">
          Tính năng xuất file đang được hoàn thiện.
        </p>
      </Card>
    </div>
  );
}
