/**
 * Admin: Commission tier config.
 *
 * Spec: B4 R-1-2 (Sale/TC/BS có HH, KT/CEO không) + R-1-3 (snapshot per CR creation time).
 * Permission: CEO edit; TC + KT view-only; others 403 (server-enforced).
 *
 * Schema fixed: 4 sale ranks (M0-M3) + 1 TC flat + 3 doctor ranks (L1-L3) = 8 rows.
 * History via effective_from/to — edit nào chỉ áp cho đơn tạo SAU thời điểm Lưu.
 */

import { useEffect, useMemo, useState } from "react";
import { Redirect, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/queryClient";
import { History, Info } from "lucide-react";
import {
  Card,
  DetailHeader,
  NPButton,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  COMMISSIONABLE_ROLES,
  COMMISSION_RANKINGS,
  RANKING_LABEL,
  ROLE_LABEL,
  tierKeyToString,
  type CommissionableRole,
  type Ranking,
  type TierKey,
  type UserRole,
} from "@shared/types";

// ─────────────────────────────────────────────────────────────────
// Types matching server response
// ─────────────────────────────────────────────────────────────────

type CommissionTier = {
  id: number;
  role: string;
  ranking: string | null;
  percentBp: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdByUserId: number | null;
};

type HistoryEntry = CommissionTier & { createdByName: string };

// ─────────────────────────────────────────────────────────────────
// Fixed matrix — 8 rows (Sale 4 + TC 1 + Doctor 3)
// ─────────────────────────────────────────────────────────────────

const TIER_KEYS: TierKey[] = COMMISSIONABLE_ROLES.flatMap((role) =>
  COMMISSION_RANKINGS[role].map((ranking) => ({ role, ranking } as TierKey)),
);

function bpToPercent(bp: number): string {
  return (bp / 100).toFixed(2).replace(/\.?0+$/, ""); // 500 → "5", 350 → "3.5"
}

function percentToBp(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────

export default function AdminCommissionConfig() {
  const { active: navActive, onTab: onNavTab } = useTabNav();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Permission gate (UX layer — server enforces too)
  const role = (typeof window !== "undefined" ? localStorage.getItem("np_role") : null) as UserRole | null;
  const canView = role === "ceo" || role === "tc" || role === "kt";
  const canEdit = role === "ceo";

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: tiers = [], isLoading } = useQuery<CommissionTier[]>({
    queryKey: ["/api/admin/commission-tiers"],
    enabled: canView,
    queryFn: async () => {
      const res = await authFetch("/api/admin/commission-tiers");
      if (!res.ok) throw new Error("fetch_failed");
      return res.json();
    },
  });

  const { data: history = [] } = useQuery<HistoryEntry[]>({
    queryKey: ["/api/admin/commission-tiers/history"],
    enabled: canView && historyOpen,
    queryFn: async () => {
      const res = await authFetch("/api/admin/commission-tiers/history");
      if (!res.ok) throw new Error("fetch_failed");
      return res.json();
    },
  });

  // Lookup map: tierKey → percentBp from server.
  const currentMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tiers) {
      m.set(tierKeyToString({ role: t.role as CommissionableRole, ranking: t.ranking as Ranking | null }), t.percentBp);
    }
    return m;
  }, [tiers]);

  const updateMut = useMutation({
    mutationFn: async (changes: Array<{ role: string; ranking: string | null; percentBp: number }>) => {
      const res = await authFetch("/api/admin/commission-tiers", {
        method: "PATCH",
        body: JSON.stringify({ tiers: changes }),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Đã lưu cấu hình",
        description: "Tỉ lệ mới chỉ áp cho đơn tạo SAU thời điểm này.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commission-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commission-tiers/history"] });
      setEdits({});
    },
    onError: (err: any) => {
      toast({
        title: "Lỗi lưu cấu hình",
        description: err?.message || err?.error || "Vui lòng thử lại",
        variant: "destructive",
      });
    },
  });

  // Permission redirect
  if (typeof window !== "undefined" && !canView) {
    return <Redirect to="/" />;
  }

  // ───── Helpers ─────

  function getDisplayValue(key: TierKey): string {
    const k = tierKeyToString(key);
    if (k in edits) return edits[k];
    const bp = currentMap.get(k);
    return bp !== undefined ? bpToPercent(bp) : "";
  }

  function setEditValue(key: TierKey, value: string) {
    const k = tierKeyToString(key);
    setEdits((prev) => ({ ...prev, [k]: value }));
  }

  function handleCancel() {
    setEdits({});
  }

  function handleSave() {
    // Build changes — only include tiers that changed AND are valid.
    const changes: Array<{ role: string; ranking: string | null; percentBp: number }> = [];
    for (const key of TIER_KEYS) {
      const k = tierKeyToString(key);
      if (!(k in edits)) continue;
      const bp = percentToBp(edits[k]);
      if (bp === null) {
        toast({
          title: "Giá trị không hợp lệ",
          description: `${ROLE_LABEL[key.role]}${key.ranking ? " " + RANKING_LABEL[key.ranking as Ranking] : ""}: phải là số từ 0 đến 100`,
          variant: "destructive",
        });
        return;
      }
      const currentBp = currentMap.get(k);
      if (bp === currentBp) continue; // no real change
      changes.push({ role: key.role, ranking: key.ranking, percentBp: bp });
    }
    if (changes.length === 0) {
      toast({ title: "Không có thay đổi" });
      return;
    }
    updateMut.mutate(changes);
  }

  const hasEdits = Object.keys(edits).length > 0;

  // ───── Render ─────

  return (
    <Screen activeTab={navActive} onTab={onNavTab} noHeader>
      <DetailHeader title="Cấu hình hoa hồng" onBack={() => navigate("/")} />

      <div className="bg-np-surface-sub pb-5">
        {/* Banner info */}
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-np-card border border-np-brand-soft bg-np-brand-soft/30 p-3 text-[12px] font-medium text-np-text-sub">
          <Info size={14} className="mt-0.5 flex-shrink-0 text-np-brand-ink" />
          <span>
            Tỉ lệ mới chỉ áp cho đơn tạo <strong>SAU</strong> thời điểm Lưu. Đơn cũ giữ tỉ lệ hoa hồng tại thời điểm tạo.
            {!canEdit && <span className="ml-1 italic text-np-text-muted">(Bạn chỉ có quyền xem.)</span>}
          </span>
        </div>

        {/* Section: Sale */}
        <SectionTitle>Điều dưỡng</SectionTitle>
        <Card className="space-y-3 p-4">
          {COMMISSION_RANKINGS.sale.map((r) => (
            <TierRow
              key={`sale:${r}`}
              label={r ? RANKING_LABEL[r] : ""}
              value={getDisplayValue({ role: "sale", ranking: r })}
              onChange={(v) => setEditValue({ role: "sale", ranking: r }, v)}
              disabled={!canEdit}
              placeholder="0"
            />
          ))}
        </Card>

        {/* Section: TC */}
        <SectionTitle>Trưởng ca</SectionTitle>
        <Card className="space-y-2 p-4">
          <TierRow
            label="Mức cố định"
            value={getDisplayValue({ role: "tc", ranking: null })}
            onChange={(v) => setEditValue({ role: "tc", ranking: null }, v)}
            disabled={!canEdit}
            placeholder="0"
          />
          <div className="text-[11px] text-np-text-muted">
            Trưởng ca không có bậc, áp dụng mức cố định cho mọi trưởng ca.
          </div>
        </Card>

        {/* Section: Doctor */}
        <SectionTitle>Bác sĩ</SectionTitle>
        <Card className="space-y-3 p-4">
          {COMMISSION_RANKINGS.doctor.map((r) => (
            <TierRow
              key={`doctor:${r}`}
              label={r ? RANKING_LABEL[r] : ""}
              value={getDisplayValue({ role: "doctor", ranking: r })}
              onChange={(v) => setEditValue({ role: "doctor", ranking: r }, v)}
              disabled={!canEdit}
              placeholder="0"
            />
          ))}
        </Card>

        {/* Action row */}
        <div className="mx-4 mt-4 flex flex-col gap-2">
          <NPButton
            tone="ghost"
            size="md"
            icon={History}
            onClick={() => setHistoryOpen(true)}
            className="w-full justify-center"
          >
            Lịch sử thay đổi
          </NPButton>

          {canEdit && (
            <div className="flex gap-2">
              <NPButton
                tone="ghost"
                size="lg"
                onClick={handleCancel}
                disabled={!hasEdits || updateMut.isPending}
                className="flex-1 justify-center"
              >
                Hủy
              </NPButton>
              <NPButton
                tone="primary"
                size="lg"
                onClick={handleSave}
                disabled={!hasEdits || updateMut.isPending}
                className="flex-1 justify-center"
              >
                {updateMut.isPending ? "Đang lưu..." : "Lưu"}
              </NPButton>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
          </div>
        )}
      </div>

      {/* History modal */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-md"
        >
          <SheetHeader className="flex-shrink-0 border-b border-np-surface-pressed px-6 pb-4 pr-12 pt-6">
            <SheetTitle className="text-[16px] font-bold text-np-ink">
              Lịch sử thay đổi tỉ lệ
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
            {history.length === 0 ? (
              <div className="px-3 py-8 text-center text-[13px] text-np-text-muted">
                Chưa có thay đổi nào
              </div>
            ) : (
              history.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-np-card border border-np-border bg-white p-3"
                >
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-np-ink">
                        {ROLE_LABEL[entry.role as CommissionableRole] ?? entry.role}
                        {entry.ranking ? ` · ${RANKING_LABEL[entry.ranking as Ranking]}` : ""}
                      </span>
                      <span className="text-[14px] font-extrabold text-np-brand-ink tabular-nums">
                        {bpToPercent(entry.percentBp)}%
                      </span>
                    </div>
                    {entry.effectiveTo === null && (
                      <span className="rounded-np-badge bg-np-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-np-brand-ink">
                        Hiện tại
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-np-text-muted">
                    Hiệu lực từ: {formatDate(entry.effectiveFrom)}
                    {entry.effectiveTo && (
                      <> · Hết hiệu lực: {formatDate(entry.effectiveTo)}</>
                    )}
                  </div>
                  <div className="text-[11px] text-np-text-muted">
                    Bởi: {entry.createdByName}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="z-10 flex flex-shrink-0 gap-2 border-t border-np-border bg-white px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
            <NPButton
              tone="ghost"
              onClick={() => setHistoryOpen(false)}
              className="flex-1 justify-center"
            >
              Đóng
            </NPButton>
          </div>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────
// Tier row — label left, percent input right
// ─────────────────────────────────────────────────────────────────

function TierRow({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 text-[14px] font-medium text-np-ink">{label}</div>
      <div className="relative w-24">
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          max="100"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="pr-7 text-right tabular-nums"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-np-text-muted">
          %
        </span>
      </div>
    </div>
  );
}
