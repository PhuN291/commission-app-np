import { useQuery } from "@tanstack/react-query";
import { Calendar, Gift, Target, TrendingUp } from "lucide-react";
import {
  Badge,
  Card,
  NPProgress,
  PageHeader,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";

type KpiMilestone = {
  label: string;
  target: number;
  bonus: number;
  reached: boolean;
};

type IncomeData = {
  user: {
    id: number;
    name: string;
    role: string;
    department: string;
    targetRevenue: number;
    currentRevenue: number;
    commissionRate: number;
  };
  transactions: {
    id: number;
    code: string;
    serviceName: string;
    patientName: string;
    date: string;
    value: number;
    commission: number;
    status: string;
  }[];
  summary: {
    estimatedCommission: number;
    actualCommission: number;
    pendingCommission: number;
    totalRevenue: number;
    totalDeals: number;
    completedDeals: number;
  };
  kpiMilestones: KpiMilestone[];
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

export default function IncomePage() {
  const { active, onTab } = useTabNav();
  const { data, isLoading, isError } = useQuery<IncomeData>({ queryKey: ["/api/income"] });

  if (isLoading || !data) {
    return (
      <Screen activeTab={active} onTab={onTab} notifCount={3}>
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
        </div>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen activeTab={active} onTab={onTab} notifCount={3}>
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="text-np-danger">Không thể tải dữ liệu thu nhập</p>
        </div>
      </Screen>
    );
  }

  const { user, transactions, summary, kpiMilestones } = data;
  const progressPercent = Math.min((user.currentRevenue / user.targetRevenue) * 100, 100);
  const nextMilestone = kpiMilestones.find((m) => !m.reached) ?? null;

  return (
    <Screen activeTab={active} onTab={onTab} notifCount={3}>
      <PageHeader
        title="Hoa hồng"
        subtitle={
          <span className="flex items-center gap-1">
            <Calendar size={12} strokeWidth={2.25} /> Tháng 02/2026 · {user.name}
          </span>
        }
        action={<Badge tone="success">{user.role}</Badge>}
      />

      {/* Hero: estimated commission */}
      <div className="px-4 pb-2">
        <div
          className="relative overflow-hidden rounded-np-card p-[22px] text-white"
          style={{ background: "linear-gradient(135deg, #1A8A7D 0%, #0F5F56 100%)" }}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-white/85">
              Hoa hồng tạm tính
            </div>
            <div className="mt-3 text-[36px] font-extrabold leading-none tracking-[-1px] tabular-nums">
              {fmtVND(summary.estimatedCommission)}
            </div>
            <div className="mt-3 flex items-center gap-1 text-[12px] font-medium text-white/75">
              <TrendingUp size={12} strokeWidth={2.25} />
              {summary.totalDeals} giao dịch trong tháng
            </div>
          </div>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-2.5 px-4 pt-3">
        <div className="rounded-np-card bg-white px-3.5 py-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.8px] text-np-text-muted">
            Thực nhận
          </div>
          <div className="mt-1 text-[18px] font-extrabold text-np-ink tabular-nums">
            {fmtShort(summary.actualCommission)}₫
          </div>
          <div className="mt-0.5 text-[11px] font-semibold text-np-brand-ink">
            {summary.completedDeals} đã hoàn tất
          </div>
        </div>
        <div className="rounded-np-card bg-white px-3.5 py-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.8px] text-np-text-muted">
            Chờ duyệt
          </div>
          <div className="mt-1 text-[18px] font-extrabold text-np-warning tabular-nums">
            {fmtShort(summary.pendingCommission)}₫
          </div>
          <div className="mt-0.5 text-[11px] text-np-text-muted">
            {summary.totalDeals - summary.completedDeals} đang chờ
          </div>
        </div>
      </div>

      {/* KPI */}
      <SectionTitle
        action={<span className="text-[20px] font-extrabold text-np-brand-ink">{Math.round(progressPercent)}%</span>}
      >
        <span className="flex items-center gap-1.5">
          <Target size={14} strokeWidth={2.25} className="text-np-brand-ink" />
          KPI tháng 02/2026
        </span>
      </SectionTitle>
      <Card className="space-y-4 p-4">
        <div>
          <div className="mb-1 text-[12px] text-np-text-muted">
            Doanh số: <strong className="text-np-ink">{fmtVND(user.currentRevenue)}</strong> /{" "}
            {fmtVND(user.targetRevenue)}
          </div>
          <NPProgress value={progressPercent} height={8} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {kpiMilestones.map((m, i) => (
            <div
              key={i}
              className={`rounded-np-card border p-3 ${
                m.reached
                  ? "border-np-brand-ink/30 bg-np-brand-soft"
                  : nextMilestone === m
                  ? "border-np-warning/30 bg-[#FFFBEB]"
                  : "border-np-border bg-np-surface-sub"
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.4px] ${
                    m.reached
                      ? "text-np-brand-ink"
                      : nextMilestone === m
                      ? "text-np-warning"
                      : "text-np-text-muted"
                  }`}
                >
                  {m.label}
                </span>
                {m.reached ? (
                  <Badge tone="success">Đạt</Badge>
                ) : nextMilestone === m ? (
                  <Badge tone="attention">Tiếp theo</Badge>
                ) : null}
              </div>
              <p className="text-[14px] font-bold text-np-ink">{fmtShort(m.target)}₫</p>
              <div className="mt-1 flex items-center gap-1">
                <Gift size={12} strokeWidth={2.25} className="text-np-text-muted" />
                <span className="text-[11px] text-np-text-sub">
                  Thưởng <strong className="text-np-brand-ink">{fmtShort(m.bonus)}₫</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Transactions */}
      <SectionTitle
        action={<span className="text-[12px] text-np-text-muted">{transactions.length} giao dịch</span>}
      >
        Chi tiết giao dịch
      </SectionTitle>
      <Card className="overflow-hidden p-0">
        {transactions.map((tx, i) => (
          <div
            key={tx.id}
            className={`px-4 py-3.5 ${
              i === transactions.length - 1 ? "" : "border-b border-np-surface-pressed"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-np-text-muted">{tx.code}</span>
              <span className="text-[12px] text-np-text-muted">{tx.date}</span>
            </div>
            <div className="mt-1 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-bold text-np-ink">{tx.serviceName}</div>
                <div className="mt-0.5 text-[12px] text-np-text-muted">{tx.patientName}</div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-[14px] font-bold text-np-ink tabular-nums">
                  {fmtVND(tx.value)}
                </div>
                <div className="mt-0.5 text-[12px] font-bold text-np-brand-ink tabular-nums">
                  +{fmtVND(tx.commission)}
                </div>
              </div>
            </div>
            <div className="mt-1.5">
              <Badge tone={tx.status === "Hoàn tất" ? "success" : "attention"}>
                {tx.status === "Hoàn tất" ? "Đã nhận" : "Chờ duyệt"}
              </Badge>
            </div>
          </div>
        ))}
      </Card>

      <div className="h-5" />
    </Screen>
  );
}
