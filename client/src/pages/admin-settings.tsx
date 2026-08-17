/**
 * Màn Cài đặt — 4 nhóm dùng được: phần trăm hoa hồng (link), voucher (link),
 * thưởng theo mục tiêu (sửa, lưu database), kì lương (sửa, lưu database).
 *
 * Quyền: CEO chỉnh sửa; trưởng ca và kế toán chỉ xem; vai khác chuyển về trang chủ.
 */

import { useEffect, useState } from "react";
import { useQuayLai } from "@/lib/use-back";
import { Redirect, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/queryClient";
import {
  Calendar,
  ExternalLink,
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
import {
  type AutoRuleKey,
  type UserRole,
} from "@shared/types";

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

type PayCycleData = {
  deadlineDay: number;
  editWindowDays: 30;
  lockAfterDays: 30;
  capWarningPct: number;
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
  const canView = role === "ceo" || role === "tc" || role === "kt";
  const canEdit = role === "ceo";

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

  const { data: payCycle } = useQuery<PayCycleData>({
    queryKey: ["/api/admin/settings/pay-cycle"],
    enabled: canView,
    queryFn: async () => {
      const res = await authFetch("/api/admin/settings/pay-cycle");
      if (!res.ok) throw new Error("fetch_failed");
      return res.json();
    },
  });

  return (
    <Screen activeTab={navActive} onTab={onNavTab} noHeader>
      <DetailHeader title="Cài đặt hệ thống" onBack={quayLai} />

      <div className="min-h-full flow-root bg-np-bg">
        {!canEdit && (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-np-card border border-np-brand-soft bg-np-brand-soft/30 p-3 text-[12px] font-medium text-np-text-sub">
            <Info size={14} className="mt-0.5 flex-shrink-0 text-np-brand-ink" />
            <span>
              Chế độ xem. Chỉ CEO chỉnh sửa được.
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
            <LinkRow
              n={2}
              title="Voucher"
              subtitle="Quản lý mã giảm giá"
              onClick={() => navigate("/admin/vouchers")}
            />

            {/* 3 — Thưởng theo mục tiêu */}
            <SectionItem value="s6" n={3} title="Thưởng theo mục tiêu">
              <AutoRuleSection rules={autoRules} canEdit={canEdit} />
            </SectionItem>

            {/* 4 — Kì lương (mục cuối) */}
            <SectionItem value="s7" n={4} title="Kỳ lương" last>
              <PayCycleSection data={payCycle} canEdit={canEdit} />
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
// Kì lương
// ─────────────────────────────────────────────────────────────────

function PayCycleSection({
  data,
  canEdit,
}: {
  data: PayCycleData | undefined;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deadlineDay, setDeadlineDay] = useState("");
  const [capWarningPct, setCapWarningPct] = useState("");

  useEffect(() => {
    if (data) {
      setDeadlineDay(String(data.deadlineDay));
      setCapWarningPct(String(data.capWarningPct));
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const dN = Number(deadlineDay);
      const capN = Number(capWarningPct);
      if (!Number.isFinite(dN) || dN < 1 || dN > 28) {
        throw new Error("Ngày chốt phải từ 1 đến 28");
      }
      if (!Number.isFinite(capN) || capN < 0 || capN > 100) {
        throw new Error("Ngưỡng cảnh báo phải từ 0 đến 100%");
      }
      const res = await authFetch("/api/admin/settings/pay-cycle", {
        method: "PATCH",
        body: JSON.stringify({
          deadlineDay: Math.round(dN),
          capWarningPct: capN,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw out;
      return out;
    },
    onSuccess: () => {
      toast({ title: "Đã lưu" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/pay-cycle"] });
    },
    onError: (err: any) => {
      toast({
        title: "Không lưu được",
        description: err?.message || err?.error || "Vui lòng thử lại",
        variant: "destructive",
      });
    },
  });

  if (!data) {
    return <div className="text-center text-[13px] text-np-text-muted">Đang tải…</div>;
  }

  const dirty =
    Number(deadlineDay) !== data.deadlineDay ||
    Number(capWarningPct) !== data.capWarningPct;

  return (
    <div className="space-y-3">
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
              Sau khi chốt lương còn 30 ngày để chỉnh sửa.
            </div>
          </div>
        </div>
      </div>

      <NumberField
        label="Ngày chốt lương trong tháng"
        value={deadlineDay}
        onChange={setDeadlineDay}
        suffix="ngày"
        disabled={!canEdit || saveMut.isPending}
        hint="1-28"
      />
      <NumberField
        label="Ngưỡng cảnh báo hoa hồng mỗi đơn"
        value={capWarningPct}
        onChange={setCapWarningPct}
        suffix="%"
        disabled={!canEdit || saveMut.isPending}
        step="0.5"
        hint="0 đến 100, chỉ cảnh báo, không trừ hoa hồng"
      />

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
