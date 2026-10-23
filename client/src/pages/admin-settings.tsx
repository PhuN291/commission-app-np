/**
 * Màn Cài đặt, 5 nhóm: phần trăm hoa hồng (link), voucher (link), thưởng theo mục
 * tiêu (sửa, lưu database), kỳ lương và lịch hẹn (sửa, lưu system_settings, mỗi ô
 * có lịch sử thay đổi).
 *
 * Quyền: thưởng theo mục tiêu chỉ CEO sửa; kỳ lương và lịch hẹn CEO, kế toán sửa;
 * trưởng ca chỉ xem; vai khác chuyển về trang chủ.
 */

import { useEffect, useRef, useState } from "react";
import { useQuayLai } from "@/lib/use-back";
import { Redirect, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/queryClient";
import {
  Calendar,
  ChevronDown,
  ExternalLink,
  History,
  Info,
  Save,
  Sparkles,
} from "@/components/np/icon";
import {
  Card,
  DetailHeader,
  NPButton,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  type AutoRuleKey,
  type UserRole,
} from "@shared/types";
import {
  SYSTEM_SETTING_DEFS,
  formatSettingValue,
  type SystemSettingHistoryEntry,
  type SystemSettingKey,
  type SystemSettings,
  type SystemSettingsView,
} from "@shared/system-settings";
import { formatVnDateTime } from "@shared/vn-time";

// ─────────────────────────────────────────────────────────────────
// Types matching server response
// ─────────────────────────────────────────────────────────────────

type AutoRuleData = {
  key: AutoRuleKey;
  active: boolean;
  targetPct: number;
  bonusPct: number;
  updatedAt: number;
  updatedByUserId: number | null;
};

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const { active: navActive, onTab: onNavTab } = useTabNav();
  const [, navigate] = useLocation();
  const quayLai = useQuayLai("/");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Permission gate (UX layer — server enforces too via requireRole).
  const role = (typeof window !== "undefined"
    ? localStorage.getItem("np_role")
    : null) as UserRole | null;
  const canView = role === "ceo" || role === "tc" || role === "kt" || role === "ktt";
  // Thưởng theo mục tiêu là chính sách tiền thưởng nên chỉ CEO sửa; kỳ lương và
  // ngưỡng lịch hẹn thêm Kế toán trưởng, Kế toán chỉ xem vì cửa sổ sửa kỳ giới hạn
  // chính việc của Kế toán. Máy chủ chặn y như vậy.
  const canEditRules = role === "ceo";
  const canEditSystem = role === "ceo" || role === "ktt";
  // Màn mã giảm giá chỉ mở cho CEO; vai khác bấm vào là bị đưa về Trang chủ.
  const coVoucher = role === "ceo";
  const lui = coVoucher ? 0 : 1;

  if (typeof window !== "undefined" && !canView) {
    return <Redirect to="/" />;
  }

  // Fetch backend-driven sections.
  const { data: autoRules = [] } = useQuery<AutoRuleData[]>({
    queryKey: ["/api/admin/settings/auto-rules"],
    enabled: canView,
    queryFn: async () => {
      const res = await authFetch("/api/admin/settings/auto-rules");
      if (!res.ok) throw new Error("fetch_failed");
      return res.json();
    },
  });

  const { data: settings } = useQuery<SystemSettingsView>({
    queryKey: ["/api/admin/settings"],
    enabled: canView,
    queryFn: async () => {
      const res = await authFetch("/api/admin/settings");
      if (!res.ok) throw new Error("fetch_failed");
      return res.json();
    },
  });

  return (
    <Screen activeTab={navActive} onTab={onNavTab} noHeader>
      <DetailHeader title="Cài đặt hệ thống" onBack={quayLai} />

      <div className="min-h-full flow-root bg-np-bg">
        {!canEditSystem && (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-np-card border border-np-brand-soft bg-np-brand-soft/30 p-3 text-[12px] font-medium text-np-text-sub">
            <Info size={14} className="mt-0.5 flex-shrink-0 text-np-brand-ink" />
            <span>
              Chế độ xem. Chỉ CEO và Kế toán trưởng chỉnh sửa được.
            </span>
          </div>
        )}

        <SectionTitle>Thiết lập</SectionTitle>
        <Card className="overflow-hidden p-0">
          <Accordion type="multiple" className="w-full">
            {/* 1 — Phần trăm hoa hồng (link) */}
            <LinkRow
              n={1}
              title="Tỷ lệ hoa hồng"
              subtitle="Mức hoa hồng theo vai và hạng"
              onClick={() => navigate("/admin/commission-config")}
            />

            {/* 2 — Voucher (link) */}
            {coVoucher && (
              <LinkRow
                n={2}
                title="Voucher"
                subtitle="Quản lý mã giảm giá"
                onClick={() => navigate("/admin/vouchers")}
              />
            )}

            {/* 3 — Thưởng theo mục tiêu */}
            <SectionItem value="s6" n={3 - lui} title="Thưởng theo mục tiêu">
              {canEditSystem && !canEditRules && (
                <div className="mb-3 flex items-start gap-2 text-[12px] font-medium text-np-text-sub">
                  <Info size={14} className="mt-0.5 flex-shrink-0 text-np-brand-ink" />
                  <span>Chỉ CEO sửa được mục này.</span>
                </div>
              )}
              <AutoRuleSection rules={autoRules} canEdit={canEditRules} />
            </SectionItem>

            {/* 4 — Kỳ lương */}
            <SectionItem value="s7" n={4 - lui} title="Kỳ lương">
              <SettingsGroup
                keys={KHOA_KY_LUONG}
                view={settings}
                canEdit={canEditSystem}
                intro={settings && <PayCycleIntro editWindowDays={settings.values.period_edit_window_days} />}
              />
            </SectionItem>

            {/* 5 — Lịch hẹn (mục cuối) */}
            <SectionItem value="s8" n={5 - lui} title="Lịch hẹn" last>
              <SettingsGroup keys={KHOA_LICH_HEN} view={settings} canEdit={canEditSystem} />
            </SectionItem>
          </Accordion>
        </Card>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────
// Accordion building blocks
// ─────────────────────────────────────────────────────────────────

function SectionItem({
  value,
  n,
  title,
  last,
  children,
}: {
  value: string;
  n: number;
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem
      value={value}
      className={last ? "border-b-0" : "np-divider"}
    >
      <AccordionTrigger className="px-4 py-3.5 hover:no-underline">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-np-brand-soft text-[12px] font-bold text-np-brand-ink">
            {n}
          </span>
          <span className="text-[15px] font-semibold text-np-ink">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-0">{children}</AccordionContent>
    </AccordionItem>
  );
}

function LinkRow({
  n,
  title,
  subtitle,
  onClick,
}: {
  n: number;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 np-divider px-4 py-3.5 text-left transition-colors active:bg-np-surface-pressed"
    >
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-np-brand-soft text-[12px] font-bold text-np-brand-ink">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-np-ink">{title}</div>
        <div className="mt-0.5 text-[12px] text-np-text-muted">{subtitle}</div>
      </div>
      <ExternalLink size={16} className="flex-shrink-0 text-np-text-muted" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
// Thưởng theo mục tiêu
// ─────────────────────────────────────────────────────────────────

function AutoRuleSection({
  rules,
  canEdit,
}: {
  rules: AutoRuleData[];
  canEdit: boolean;
}) {
  return (
    <div className="space-y-3">
      {rules.length === 0 ? (
        <div className="text-center text-[13px] text-np-text-muted">
          Đang tải…
        </div>
      ) : (
        rules.map((r) => <AutoRuleCard key={r.key} rule={r} canEdit={canEdit} />)
      )}
    </div>
  );
}

function AutoRuleCard({ rule, canEdit }: { rule: AutoRuleData; canEdit: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [active, setActive] = useState(rule.active);
  const [targetPct, setTargetPct] = useState(String(rule.targetPct));
  const [bonusPct, setBonusPct] = useState(String(rule.bonusPct));

  // Sync khi server data đổi (init hoặc sau save).
  useEffect(() => {
    setActive(rule.active);
    setTargetPct(String(rule.targetPct));
    setBonusPct(String(rule.bonusPct));
  }, [rule.active, rule.targetPct, rule.bonusPct]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const targetN = Number(targetPct);
      const bonusN = Number(bonusPct);
      if (!Number.isFinite(targetN) || targetN < 0 || targetN > 200) {
        throw new Error("Mục tiêu phải từ 0 đến 200%");
      }
      if (!Number.isFinite(bonusN) || bonusN < 0 || bonusN > 50) {
        throw new Error("Thưởng phải từ 0 đến 50%");
      }
      const res = await authFetch(`/api/admin/settings/auto-rules/${rule.key}`, {
        method: "PATCH",
        body: JSON.stringify({
          active,
          targetPct: Math.round(targetN),
          bonusPct: bonusN,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Đã lưu" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/auto-rules"] });
    },
    onError: (err: any) => {
      toast({
        title: "Không lưu được",
        description: err?.message || err?.error || "Vui lòng thử lại",
        variant: "destructive",
      });
    },
  });

  const dirty =
    active !== rule.active ||
    Number(targetPct) !== rule.targetPct ||
    Number(bonusPct) !== rule.bonusPct;

  return (
    <div className="space-y-3 rounded-np-card border border-np-border bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="flex-shrink-0 text-np-brand-ink" />
            <span className="text-[14px] font-bold text-np-ink">
              Thưởng đạt mục tiêu tháng
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-np-text-muted">
            Cuối tháng, nhân viên đạt mục tiêu sẽ được đề xuất thưởng tự động.
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Switch
            checked={active}
            onCheckedChange={setActive}
            disabled={!canEdit || saveMut.isPending}
          />
          <span className="text-[11px] font-semibold text-np-text-sub">
            {active ? "Bật" : "Tắt"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Mục tiêu tháng"
          value={targetPct}
          onChange={setTargetPct}
          suffix="%"
          disabled={!canEdit || saveMut.isPending}
          hint="0-200"
        />
        <NumberField
          label="Thưởng trên doanh số"
          value={bonusPct}
          onChange={setBonusPct}
          suffix="%"
          disabled={!canEdit || saveMut.isPending}
          step="0.5"
          hint="0-50"
        />
      </div>

      {canEdit && (
        <NPButton
          tone="primary"
          size="md"
          icon={Save}
          onClick={() => saveMut.mutate()}
          disabled={!dirty || saveMut.isPending}
          className="w-full justify-center"
        >
          {saveMut.isPending ? "Đang lưu..." : "Lưu"}
        </NPButton>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Kỳ lương + Lịch hẹn: ô cấu hình hệ thống, mỗi ô kèm lịch sử thay đổi
// ─────────────────────────────────────────────────────────────────

const KHOA_KY_LUONG: SystemSettingKey[] = [
  "period_close_day",
  "period_edit_window_days",
  "rate_warning_cap_percent",
];
const KHOA_LICH_HEN: SystemSettingKey[] = ["late_minutes", "overdue_hours", "no_show_days"];

function PayCycleIntro({ editWindowDays }: { editWindowDays: number }) {
  return (
    <div className="rounded-np-card border border-np-border bg-white p-3">
      <div className="flex items-start gap-2">
        <Calendar size={14} className="mt-0.5 flex-shrink-0 text-np-brand-ink" />
        <div className="flex-1">
          <div className="text-[12px] font-semibold text-np-text-muted">
            Chu kỳ trả lương
          </div>
          <div className="text-[14px] font-bold text-np-ink">
            Theo tháng dương lịch
          </div>
          <div className="mt-1 text-[11px] text-np-text-muted">
            Sau khi chốt lương còn {editWindowDays} ngày để chỉnh sửa.
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Một nhóm ô có nút Lưu riêng, chỉ gửi những ô đã đổi: gửi cả nhóm thì hai người
 * sửa hai ô khác nhau cùng lúc sẽ ghi đè giá trị của nhau.
 */
function SettingsGroup({
  keys,
  view,
  canEdit,
  intro,
}: {
  keys: SystemSettingKey[];
  view: SystemSettingsView | undefined;
  canEdit: boolean;
  intro?: React.ReactNode;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Partial<Record<SystemSettingKey, string>>>({});
  const daDongBo = useRef<SystemSettings | null>(null);

  // Chỉ nạp lại ô mà giá trị trên máy chủ vừa đổi. Nạp lại cả nhóm thì lưu nhóm
  // Kỳ lương xong là xóa mất số đang gõ dở ở nhóm Lịch hẹn.
  useEffect(() => {
    if (!view) return;
    const truoc = daDongBo.current;
    setDraft((d) => {
      const next = { ...d };
      for (const k of keys) {
        if (!truoc || truoc[k] !== view.values[k] || next[k] === undefined) {
          next[k] = String(view.values[k]);
        }
      }
      return next;
    });
    daDongBo.current = view.values;
  }, [view, keys]);

  const daDoi = view
    ? keys.filter((k) => draft[k] !== undefined && Number(draft[k]) !== view.values[k])
    : [];

  const saveMut = useMutation({
    mutationFn: async () => {
      const body: Partial<Record<SystemSettingKey, number>> = {};
      for (const k of daDoi) {
        const d = SYSTEM_SETTING_DEFS[k];
        const raw = (draft[k] ?? "").trim();
        const n = Number(raw);
        if (raw === "" || !Number.isFinite(n) || n < d.min || n > d.max || (d.integer && !Number.isInteger(n))) {
          throw new Error(`${d.label} phải ${d.integer ? "là số nguyên " : ""}từ ${d.min} đến ${d.max}`);
        }
        body[k] = n;
      }
      const res = await authFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const out = await res.json();
      if (!res.ok) throw out;
      return out;
    },
    onSuccess: () => {
      toast({ title: "Đã lưu" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/runtime"] });
    },
    onError: (err: any) => {
      toast({
        title: "Không lưu được",
        description: err?.message || err?.error || "Vui lòng thử lại",
        variant: "destructive",
      });
    },
  });

  if (!view) {
    return <div className="text-center text-[13px] text-np-text-muted">Đang tải…</div>;
  }

  return (
    <div className="space-y-3">
      {intro}
      {keys.map((k) => {
        const d = SYSTEM_SETTING_DEFS[k];
        return (
          <div key={k} className="space-y-1.5">
            <NumberField
              label={d.label}
              value={draft[k] ?? ""}
              onChange={(v) => setDraft((cur) => ({ ...cur, [k]: v }))}
              suffix={d.unit}
              disabled={!canEdit || saveMut.isPending}
              step={d.integer ? "1" : "0.5"}
              hint={d.hint}
            />
            <SettingHistory settingKey={k} />
          </div>
        );
      })}

      {canEdit && (
        <NPButton
          tone="primary"
          size="md"
          icon={Save}
          onClick={() => saveMut.mutate()}
          disabled={daDoi.length === 0 || saveMut.isPending}
          className="w-full justify-center"
        >
          {saveMut.isPending ? "Đang lưu..." : "Lưu"}
        </NPButton>
      )}
    </div>
  );
}

/**
 * Lịch sử của một ô, gập sẵn và chỉ tải khi mở: sáu ô mà tải hết lúc vào trang là
 * sáu lượt gọi cho thứ ít khi có người xem.
 */
function SettingHistory({ settingKey }: { settingKey: SystemSettingKey }) {
  const [open, setOpen] = useState(false);
  const { data = [], isLoading, isError } = useQuery<SystemSettingHistoryEntry[]>({
    queryKey: ["/api/admin/settings/history", settingKey],
    enabled: open,
    queryFn: async () => {
      const res = await authFetch(`/api/admin/settings/history?key=${settingKey}&limit=20`);
      if (!res.ok) throw new Error("fetch_failed");
      return res.json();
    },
  });

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1 py-0.5 text-[12px] font-semibold text-np-brand-ink"
      >
        <History size={13} className="flex-shrink-0" />
        Lịch sử thay đổi
        <ChevronDown size={13} className={cn("flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-1.5 max-h-[168px] overflow-y-auto rounded-np-card border border-np-border bg-np-surface-sub">
          {isLoading ? (
            <div className="px-3 py-2.5 text-[12px] text-np-text-muted">Đang tải…</div>
          ) : isError ? (
            <div className="px-3 py-2.5 text-[12px] text-np-text-muted">Không tải được lịch sử</div>
          ) : data.length === 0 ? (
            <div className="px-3 py-2.5 text-[12px] text-np-text-muted">Chưa có thay đổi</div>
          ) : (
            <ul>
              {data.map((h, i) => (
                <li key={h.id} className={cn("px-3 py-2", i > 0 && "border-t border-np-border")}>
                  <div className="text-[12px] font-semibold tabular-nums text-np-ink">
                    {formatSettingValue(settingKey, h.oldValue)} → {formatSettingValue(settingKey, h.newValue)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-np-text-muted">
                    {h.changedByName ?? "Không rõ"} · {formatVnDateTime(new Date(h.changedAt))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Number field helper — input với suffix + hint
// ─────────────────────────────────────────────────────────────────

function NumberField({
  label,
  value,
  onChange,
  suffix,
  hint,
  disabled,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  hint?: string;
  disabled?: boolean;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[12px] font-semibold text-np-text-sub">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step={step ?? "1"}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="pr-12 text-right tabular-nums"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-np-text-muted">
          {suffix}
        </span>
      </div>
      {hint && <div className="text-[11px] text-np-text-muted">{hint}</div>}
    </div>
  );
}
