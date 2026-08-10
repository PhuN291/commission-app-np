/**
 * Admin: Staff management.
 *
 * Spec: audit-docs/B5-2-screen-specs-batch-2.md Section 2 (S-Admin-Staff).
 * Permission: CEO full CRUD, TC view + mark-offboarding, others 403.
 *
 * Server-side enforcement qua requireRole middleware (server/permissions.ts).
 * FE chỉ hide CTA based on np_role — không phải security gate.
 */

import { useEffect, useMemo, useState } from "react";
import { Redirect, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/queryClient";
import {
  AlertTriangle,
  Smartphone,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Card,
  Chips,
  DetailHeader,
  NPButton,
  PageHeader,
  Screen,
  SearchField,
  SectionTitle,
  type ChipItem,
  useTabNav,
} from "@/components/np";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { useToast } from "@/hooks/use-toast";
import {
  AUDIT_ACTION_LABEL,
  RANKING_FOR_ROLE,
  RANKING_LABEL,
  ROLE_LABEL,
  STATUS_LABEL,
  USER_ROLES,
  type AuditAction,
  type Ranking,
  type UserRole,
  type UserStatus,
} from "@shared/types";

// ─────────────────────────────────────────────────────────────────
// Types matching server response
// ─────────────────────────────────────────────────────────────────

type DeviceBinding = { deviceId: string; deviceName: string; boundAt: number } | null;

type AdminStaffMember = {
  id: number;
  name: string;
  phone: string;
  role: UserRole;
  ranking: Ranking | null;
  ihosUserId: string | null;
  status: UserStatus;
  offboardingDate: string | null;
  monthlyTargetHh: number;
  monthlyTargetOrders: number;
  pendingOrders: number;
  deviceBinding: DeviceBinding;
};

type AuditLogEntry = {
  id: number;
  userId: number;
  action: AuditAction;
  actorId: number;
  actorName: string;
  timestamp: number;
  payload?: Record<string, unknown>;
};


// ─────────────────────────────────────────────────────────────────
// Empty form
// ─────────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  phone: string;
  role: UserRole;
  ranking: Ranking | null;
  ihosUserId: string;
  monthlyTargetHh: number;
  monthlyTargetOrders: number;
};

const emptyForm: FormState = {
  name: "",
  phone: "",
  role: "sale",
  ranking: "M0",
  ihosUserId: "",
  monthlyTargetHh: 0,
  monthlyTargetOrders: 0,
};

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────

export default function AdminStaff() {
  const { active: navActive, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Permission gate (UX layer — server enforces too)
  const role = (typeof window !== "undefined" ? localStorage.getItem("np_role") : null) as UserRole | null;
  const isCeo = role === "ceo";
  const isTc = role === "tc";
  const canView = isCeo || isTc;
  const canEdit = isCeo;
  const canMarkOffboarding = isCeo || isTc;
  const canForceUnbind = isCeo;
  const canSoftDelete = isCeo;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "offboarded">("active");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const [offboardingDialog, setOffboardingDialog] = useState<{ open: boolean; staffId: number | null; date: string }>({
    open: false,
    staffId: null,
    date: "",
  });
  const [unbindDialog, setUnbindDialog] = useState<{ open: boolean; staff: AdminStaffMember | null }>({
    open: false,
    staff: null,
  });
  const [softDeleteDialog, setSoftDeleteDialog] = useState<{ open: boolean; staff: AdminStaffMember | null }>({
    open: false,
    staff: null,
  });

  // ───────── Queries ─────────

  // Fetch ALL users (server only filters by search). Status + role lọc client-side
  // để mọi count (tab badge, chip, subtitle) đều chính xác.
  const listKey = ["/api/admin/staff", searchTerm] as const;

  const { data: rawList = [], isLoading } = useQuery<AdminStaffMember[]>({
    queryKey: listKey,
    enabled: canView,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      const res = await authFetch(`/api/admin/staff?${params.toString()}`);
      if (res.status === 401 || res.status === 403) {
        throw new Error("forbidden");
      }
      if (!res.ok) throw new Error("fetch_failed");
      return (await res.json()) as AdminStaffMember[];
    },
  });

  // Lọc theo tab status (Đang làm việc = active + pending; Đã nghỉ = offboarded)
  const inTabList = useMemo(
    () =>
      statusFilter === "offboarded"
        ? rawList.filter((u) => u.status === "offboarded")
        : rawList.filter((u) => u.status === "active" || u.status === "pending_offboarding"),
    [rawList, statusFilter],
  );

  // Display list = inTabList filtered by current roleFilter
  const staffList = useMemo(
    () => (roleFilter === "all" ? inTabList : inTabList.filter((u) => u.role === roleFilter)),
    [inTabList, roleFilter],
  );

  const editingStaff = useMemo(
    () => (editingId !== null ? rawList.find((s) => s.id === editingId) ?? null : null),
    [editingId, rawList],
  );

  const { data: auditEntries = [] } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/admin/staff/audit-log", editingId],
    enabled: canView && editingId !== null,
    queryFn: async () => {
      const res = await authFetch(`/api/admin/staff/${editingId}/audit-log`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // ───────── Mutations ─────────

  const createMut = useMutation({
    mutationFn: async (input: FormState) => {
      const res = await authFetch("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify({
          ...input,
          ihosUserId: input.ihosUserId || null,
          ranking: input.ranking,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return data;
    },
    onSuccess: (created) => {
      toast({ title: "Đã thêm nhân sự", description: created.name });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
      setSheetOpen(false);
      setForm(emptyForm);
      setFormErrors({});
    },
    onError: (err: any) => handleApiError(err, toast, setFormErrors),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<FormState> }) => {
      const res = await authFetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...input,
          ihosUserId: input.ihosUserId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Đã cập nhật" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff/audit-log", editingId] });
      setSheetOpen(false);
      setFormErrors({});
    },
    onError: (err: any) => handleApiError(err, toast, setFormErrors),
  });

  const offboardingMut = useMutation({
    mutationFn: async ({ id, date }: { id: number; date: string }) => {
      const res = await authFetch(`/api/admin/staff/${id}/mark-offboarding`, {
        method: "PATCH",
        body: JSON.stringify({ offboardingDate: date }),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Đã đánh dấu sắp nghỉ",
        description: data.pendingOrders > 0
          ? `Lưu ý: ${data.pendingOrders} đơn cần bàn giao trước ngày nghỉ.`
          : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff/audit-log"] });
      setOffboardingDialog({ open: false, staffId: null, date: "" });
    },
    onError: (err: any) => {
      const msg = err?.issues?.[0]?.message || err?.message || "Không thể đánh dấu";
      toast({ title: "Lỗi", description: msg, variant: "destructive" });
    },
  });

  const forceUnbindMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await authFetch(`/api/admin/staff/${id}/force-unbind-device`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Đã gỡ thiết bị",
        description: `Đã thu hồi ${data.revokedTokens} phiên đăng nhập.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff/audit-log"] });
      setUnbindDialog({ open: false, staff: null });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi", description: err?.message || "Không thể gỡ thiết bị", variant: "destructive" });
    },
  });

  const softDeleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await authFetch(`/api/admin/staff/${id}/soft-delete`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Đã chuyển sang Đã nghỉ" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
      setSoftDeleteDialog({ open: false, staff: null });
      setSheetOpen(false);
    },
  });

  // ───────── Auto-correct ranking on role change ─────────

  useEffect(() => {
    const allowed = RANKING_FOR_ROLE[form.role];
    if (allowed.length === 0) {
      if (form.ranking !== null) setForm((f) => ({ ...f, ranking: null }));
    } else if (form.ranking == null || !allowed.includes(form.ranking)) {
      setForm((f) => ({ ...f, ranking: allowed[0] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.role]);

  // ───────── Permission redirect ─────────

  if (typeof window !== "undefined" && !canView) {
    return <Redirect to="/" />;
  }

  // ───────── Helpers ─────────

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setSheetOpen(true);
  };

  const openEdit = (m: AdminStaffMember) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      phone: m.phone,
      role: m.role,
      ranking: m.ranking,
      ihosUserId: m.ihosUserId ?? "",
      monthlyTargetHh: m.monthlyTargetHh,
      monthlyTargetOrders: m.monthlyTargetOrders,
    });
    setFormErrors({});
    setSheetOpen(true);
  };

  function validateForm(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length < 2) errs.name = "Tên phải có ít nhất 2 ký tự";
    if (form.phone.replace(/\D/g, "").length < 9) errs.phone = "Số điện thoại không hợp lệ";
    if (form.role === "doctor" && !form.ihosUserId.trim()) {
      errs.ihosUserId = "Bác sĩ bắt buộc có Mã iHOS";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const handleSave = () => {
    if (!validateForm()) return;
    if (editingId) {
      updateMut.mutate({ id: editingId, input: form });
    } else {
      createMut.mutate(form);
    }
  };

  // ───────── Chips / filters ─────────

  // Counts dựa trên inTabList (cùng tab hiện tại) để chip count đúng theo từng role.
  const roleChips: ChipItem[] = useMemo(
    () => [
      { key: "all", label: "Tất cả", count: inTabList.length },
      ...USER_ROLES.map((r) => ({
        key: r,
        label: ROLE_LABEL[r],
        count: inTabList.filter((s) => s.role === r).length,
      })),
    ],
    [inTabList],
  );

  // ───────── Render ─────────

  return (
    <Screen activeTab={navActive} onTab={onTab} noHeader>
      <DetailHeader title="Quản lý nhân sự" onBack={() => navigate("/")} />

      <div className="bg-np-surface-sub pb-5">
        <PageHeader
          title={isCeo ? "Quản lý nhân sự" : "Nhân sự (chỉ xem)"}
          subtitle={`${inTabList.length} người${isTc ? " · Chỉ được đánh dấu sắp nghỉ" : ""}`}
          action={
            canEdit ? (
              <NPButton tone="primary" size="sm" icon={UserPlus} onClick={openAdd}>
                Thêm
              </NPButton>
            ) : undefined
          }
        />

        {/* Tab Active vs Đã nghỉ */}
        <div className="flex gap-1.5 px-4 pt-2">
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`flex-1 rounded-np-button px-3 py-2 text-[13px] font-semibold transition-colors ${
              statusFilter === "active"
                ? "bg-np-brand text-white"
                : "bg-white text-np-text-sub hover:bg-np-surface-pressed"
            }`}
          >
            Đang làm việc
            <span className="ml-1.5 text-[12px] font-medium tabular-nums opacity-80">
              {rawList.filter((u) => u.status === "active" || u.status === "pending_offboarding").length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("offboarded")}
            className={`flex-1 rounded-np-button px-3 py-2 text-[13px] font-semibold transition-colors ${
              statusFilter === "offboarded"
                ? "bg-np-brand text-white"
                : "bg-white text-np-text-sub hover:bg-np-surface-pressed"
            }`}
          >
            Đã nghỉ
            <span className="ml-1.5 text-[12px] font-medium tabular-nums opacity-80">
              {rawList.filter((u) => u.status === "offboarded").length}
            </span>
          </button>
        </div>

        <SearchField
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Tìm tên, số điện thoại..."
          className="mt-3"
        />
        <Chips items={roleChips} active={roleFilter} onChange={setRoleFilter} />

        <Card className="overflow-hidden p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
            </div>
          ) : staffList.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Users size={36} className="mx-auto text-np-border-strong" />
              <div className="mt-2.5 text-[13px] font-medium text-np-text-muted">
                Không tìm thấy nhân sự
              </div>
            </div>
          ) : (
            staffList.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => openEdit(m)}
                className={
                  "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-np-surface-pressed" +
                  (i === staffList.length - 1 ? "" : " border-b border-np-surface-pressed")
                }
              >
                <Avatar name={m.name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[15px] font-bold text-np-ink">{m.name}</span>
                    <Badge tone="neutral">{ROLE_LABEL[m.role]}</Badge>
                    {m.ranking && <Badge tone="neutral">{RANKING_LABEL[m.ranking]}</Badge>}
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-np-text-sub tabular-nums">
                    {m.phone}
                    {m.ihosUserId ? (
                      <span className="ml-2 font-mono text-np-brand-ink">iHOS✓ {m.ihosUserId}</span>
                    ) : m.role === "doctor" ? (
                      <span className="ml-2 font-mono text-np-danger">⚠ Thiếu iHOS</span>
                    ) : null}
                  </div>
                  {m.status === "pending_offboarding" && m.offboardingDate && (
                    <div className="mt-1 text-[11px] font-medium text-np-attention-ink">
                      Ngày nghỉ: {formatDate(m.offboardingDate)}
                      {m.pendingOrders > 0 && (
                        <span className="ml-2 text-np-danger">⚠️ {m.pendingOrders} đơn chưa xong</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </Card>

        <div className="h-5" />
      </div>

      {/* Sheet detail */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-md"
          side="right"
        >
          <SheetHeader className="flex-shrink-0 border-b border-np-surface-pressed px-6 pb-4 pr-12 pt-6">
            <SheetTitle className="text-[16px] font-bold text-np-ink">
              {editingId ? `Chi tiết: ${editingStaff?.name ?? ""}` : "Thêm nhân sự"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-4 pt-5">
            {/* Section: Thông tin */}
            <FormField label="Họ tên" error={formErrors.name}>
              <Input
                placeholder="Nguyễn Thị A"
                value={form.name}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>

            <FormField label="Số điện thoại" error={formErrors.phone}>
              <Input
                placeholder="0901234567"
                value={form.phone}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </FormField>

            <FormField label="Vai trò" error={formErrors.role}>
              <Select
                value={form.role}
                disabled={!canEdit}
                onValueChange={(v) => setForm({ ...form, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {RANKING_FOR_ROLE[form.role].length > 0 && (
              <FormField label="Bậc">
                <Select
                  value={form.ranking ?? ""}
                  disabled={!canEdit}
                  onValueChange={(v) => setForm({ ...form, ranking: v as Ranking })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RANKING_FOR_ROLE[form.role].map((r) => (
                      <SelectItem key={r} value={r}>
                        {RANKING_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}

            <FormField
              label={`Mã iHOS${form.role === "doctor" ? " *" : ""}`}
              error={formErrors.ihosUserId}
              hint={form.role === "doctor" ? "Bắt buộc cho Bác sĩ" : "Tùy chọn"}
            >
              <Input
                placeholder="iHOS-12345"
                value={form.ihosUserId}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, ihosUserId: e.target.value })}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Chỉ tiêu hoa hồng/tháng">
                <Input
                  type="number"
                  value={form.monthlyTargetHh}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, monthlyTargetHh: Number(e.target.value) || 0 })}
                />
              </FormField>
              <FormField label="Chỉ tiêu đơn/tháng">
                <Input
                  type="number"
                  value={form.monthlyTargetOrders}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, monthlyTargetOrders: Number(e.target.value) || 0 })}
                />
              </FormField>
            </div>

            {/* Section: Trạng thái — chỉ hiện khi edit */}
            {editingStaff && (
              <>
                <SectionDivider label="Trạng thái" />
                <div className="rounded-np-card border border-np-border bg-np-surface-sub p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-np-ink">
                      {STATUS_LABEL[editingStaff.status]}
                    </span>
                    <StatusBadge status={editingStaff.status} />
                  </div>
                  {editingStaff.offboardingDate && (
                    <div className="mt-1 text-[12px] text-np-text-sub">
                      Ngày nghỉ: <span className="font-medium">{formatDate(editingStaff.offboardingDate)}</span>
                    </div>
                  )}
                  {editingStaff.pendingOrders > 0 && editingStaff.status === "pending_offboarding" && (
                    <div className="mt-2 flex items-start gap-1.5 rounded bg-np-danger-bg/30 p-2 text-[12px] text-np-danger">
                      <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                      <span>{editingStaff.pendingOrders} đơn chưa xong cần bàn giao trước ngày nghỉ</span>
                    </div>
                  )}
                  {canMarkOffboarding && editingStaff.status === "active" && (
                    <NPButton
                      tone="ghost"
                      size="sm"
                      className="mt-2 w-full justify-center"
                      onClick={() =>
                        setOffboardingDialog({
                          open: true,
                          staffId: editingStaff.id,
                          date: defaultOffboardingDate(),
                        })
                      }
                    >
                      Đánh dấu sắp nghỉ
                    </NPButton>
                  )}
                </div>

                {/* Section: Thiết bị */}
                <SectionDivider label="Thiết bị đã đăng nhập" icon={Smartphone} />
                <div className="rounded-np-card border border-np-border bg-white p-3">
                  {editingStaff.deviceBinding ? (
                    <>
                      <div className="text-[13px] font-semibold text-np-ink">
                        {editingStaff.deviceBinding.deviceName}
                      </div>
                      <div className="mt-0.5 text-[11px] text-np-text-muted">
                        Đăng nhập lúc: {formatTimestamp(editingStaff.deviceBinding.boundAt)}
                      </div>
                      {canForceUnbind && (
                        <NPButton
                          tone="ghost"
                          size="sm"
                          icon={UserX}
                          className="mt-2 w-full justify-center"
                          onClick={() => setUnbindDialog({ open: true, staff: editingStaff })}
                        >
                          Gỡ thiết bị
                        </NPButton>
                      )}
                    </>
                  ) : (
                    <div className="text-[12px] text-np-text-muted">
                      Chưa đăng nhập trên thiết bị nào
                    </div>
                  )}
                </div>

                {/* Section: Audit log */}
                <SectionDivider label="Lịch sử thay đổi" />
                <div className="max-h-[200px] overflow-y-auto rounded-np-card border border-np-border bg-white">
                  {auditEntries.length === 0 ? (
                    <div className="px-3 py-4 text-center text-[12px] text-np-text-muted">
                      Chưa có lịch sử
                    </div>
                  ) : (
                    auditEntries.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className={
                          "px-3 py-2 text-[12px]" +
                          (idx === auditEntries.length - 1 ? "" : " border-b border-np-surface-pressed")
                        }
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="font-medium text-np-ink">
                            {AUDIT_ACTION_LABEL[entry.action] ?? entry.action}
                          </span>
                          <span className="text-[10px] text-np-text-muted tabular-nums">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-np-text-sub">
                          bởi {entry.actorName}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Danger zone — chỉ hiện khi edit + có quyền soft delete */}
            {canSoftDelete && editingStaff && editingStaff.status !== "offboarded" && (
              <>
                <SectionDivider label="Thao tác nguy hiểm" />
                <div className="rounded-np-card border border-np-danger-bg/60 bg-np-danger-bg/10 p-3">
                  <div className="text-[12px] font-medium text-np-text-sub">
                    Chuyển nhân viên sang "Đã nghỉ", dữ liệu vẫn giữ lại để tra cứu.
                  </div>
                  <NPButton
                    tone="ghost"
                    size="sm"
                    icon={UserX}
                    className="mt-2 w-full justify-center text-np-danger"
                    onClick={() => setSoftDeleteDialog({ open: true, staff: editingStaff })}
                  >
                    Chuyển sang Đã nghỉ
                  </NPButton>
                </div>
              </>
            )}
          </div>

          {/* Footer actions — flex child với elevation */}
          <div className="z-10 flex flex-shrink-0 gap-2 border-t border-np-border bg-white px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
            <NPButton tone="ghost" onClick={() => setSheetOpen(false)} className="flex-1 justify-center">
              Đóng
            </NPButton>
            {canEdit && (
              <NPButton
                tone="primary"
                onClick={handleSave}
                disabled={createMut.isPending || updateMut.isPending}
                className="flex-1 justify-center"
              >
                {editingId ? "Lưu" : "Tạo mới"}
              </NPButton>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Mark offboarding dialog */}
      <Dialog
        open={offboardingDialog.open}
        onOpenChange={(open) => setOffboardingDialog((p) => ({ ...p, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đánh dấu sắp nghỉ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-[13px] text-np-text-sub">
              Nhân viên sẽ chuyển sang trạng thái "Sắp nghỉ". Cần bàn giao các đơn chưa xong trước ngày nghỉ.
            </p>
            <Label className="text-[12px] font-semibold text-np-text-sub">Ngày nghỉ dự kiến</Label>
            <Input
              type="date"
              value={offboardingDialog.date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setOffboardingDialog((p) => ({ ...p, date: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <NPButton tone="ghost" onClick={() => setOffboardingDialog({ open: false, staffId: null, date: "" })}>
              Hủy
            </NPButton>
            <NPButton
              tone="primary"
              disabled={!offboardingDialog.date || offboardingMut.isPending}
              onClick={() =>
                offboardingDialog.staffId &&
                offboardingMut.mutate({ id: offboardingDialog.staffId, date: offboardingDialog.date })
              }
            >
              Xác nhận
            </NPButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force unbind confirm */}
      <AlertDialog open={unbindDialog.open} onOpenChange={(open) => setUnbindDialog((p) => ({ ...p, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gỡ thiết bị?</AlertDialogTitle>
            <AlertDialogDescription>
              {unbindDialog.staff?.name} sẽ bị đăng xuất khỏi thiết bị hiện tại. Lần đăng nhập tiếp theo sẽ gắn thiết bị mới.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => unbindDialog.staff && forceUnbindMut.mutate(unbindDialog.staff.id)}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Soft delete confirm */}
      <AlertDialog
        open={softDeleteDialog.open}
        onOpenChange={(open) => setSoftDeleteDialog((p) => ({ ...p, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chuyển sang Đã nghỉ?</AlertDialogTitle>
            <AlertDialogDescription>
              {softDeleteDialog.staff?.name} sẽ ẩn khỏi danh sách Đang làm việc, dữ liệu vẫn giữ lại để tra cứu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => softDeleteDialog.staff && softDeleteMut.mutate(softDeleteDialog.staff.id)}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────

function FormField({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-semibold text-np-text-sub">{label}</Label>
      {children}
      {hint && !error && <div className="text-[11px] text-np-text-muted">{hint}</div>}
      {error && <div className="text-[11px] font-medium text-np-danger">{error}</div>}
    </div>
  );
}

function SectionDivider({ label, icon: Icon }: { label: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 pt-2 text-[11px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
      {Icon && <Icon size={13} />}
      <span>{label}</span>
      <div className="flex-1 border-t border-np-surface-pressed" />
    </div>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  if (status === "active") return <Badge tone="success">Đang làm việc</Badge>;
  if (status === "pending_offboarding") return <Badge tone="attention">Sắp nghỉ</Badge>;
  return <Badge tone="critical">Đã nghỉ</Badge>;
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function formatDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-");
  return `${d}/${m}/${y}`;
}

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function defaultOffboardingDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14); // mặc định 2 tuần sau
  return d.toISOString().slice(0, 10);
}

function handleApiError(
  err: any,
  toast: ReturnType<typeof useToast>["toast"],
  setFormErrors: (e: Partial<Record<keyof FormState, string>>) => void,
) {
  if (err?.error === "validation" && Array.isArray(err.issues)) {
    const errs: Partial<Record<keyof FormState, string>> = {};
    for (const issue of err.issues) {
      const field = Array.isArray(issue.path) ? issue.path[0] : null;
      if (field) errs[field as keyof FormState] = issue.message;
    }
    setFormErrors(errs);
    toast({ title: "Vui lòng kiểm tra thông tin", variant: "destructive" });
    return;
  }
  if (err?.error === "phone_exists") {
    setFormErrors({ phone: "Số điện thoại đã dùng cho người khác" });
    toast({ title: "Trùng số điện thoại", variant: "destructive" });
    return;
  }
  if (err?.error === "forbidden") {
    toast({ title: "Không có quyền", description: err.message, variant: "destructive" });
    return;
  }
  toast({ title: "Lỗi", description: err?.message || "Có lỗi xảy ra", variant: "destructive" });
}
