import { useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  CheckCircle2,
  DollarSign,
  Gift,
  ShoppingBag,
  Target,
  TrendingUp,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Card,
  DetailHeader,
  NPProgress,
  PageHeader,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";

function fmtVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

function fmtShort(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + " tr";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return String(n);
}

const currentRevenue = 35_000_000;

const milestones = [
  { rank: "Đồng", threshold: 0, commission: 3, bonus: 0 },
  { rank: "Bạc", threshold: 20_000_000, commission: 5, bonus: 300_000 },
  { rank: "Vàng", threshold: 50_000_000, commission: 6, bonus: 500_000 },
  { rank: "Kim cương", threshold: 100_000_000, commission: 8, bonus: 1_000_000 },
];

function getMilestoneStatus(threshold: number, nextThreshold: number | null) {
  if (nextThreshold === null) return currentRevenue >= threshold ? "achieved" : "locked";
  if (currentRevenue >= nextThreshold) return "achieved";
  if (currentRevenue >= threshold) return "in-progress";
  return "locked";
}

const monthlyStats = {
  totalOrders: 8,
  revenue: 35_000_000,
  commission: 1_750_000,
  completionRate: 75,
};

const chartData = [
  { month: "T10", revenue: 18_000_000 },
  { month: "T11", revenue: 25_000_000 },
  { month: "T12", revenue: 22_000_000 },
  { month: "T1", revenue: 30_000_000 },
  { month: "T2", revenue: 28_000_000 },
  { month: "T3", revenue: 35_000_000 },
];

const goals = [
  { name: "Doanh thu", current: 35_000_000, target: 50_000_000, isVND: true },
  { name: "Số đơn", current: 8, target: 15, isVND: false },
];

type MetricCardDef = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "brand" | "warning" | "info" | "purple";
};

const metricCards: MetricCardDef[] = [
  { label: "Tổng đơn", value: String(monthlyStats.totalOrders), icon: ShoppingBag, tone: "purple" },
  { label: "Doanh thu", value: fmtShort(monthlyStats.revenue), icon: TrendingUp, tone: "brand" },
  { label: "Hoa hồng", value: fmtShort(monthlyStats.commission), icon: DollarSign, tone: "warning" },
  { label: "Tỷ lệ hoàn tất", value: `${monthlyStats.completionRate}%`, icon: CheckCircle2, tone: "info" },
];

const TONE_BG: Record<MetricCardDef["tone"], string> = {
  brand: "bg-np-brand-soft",
  warning: "bg-[#FEF3C7]",
  info: "bg-[#DBEAFE]",
  purple: "bg-[#EDE9FE]",
};

const TONE_FG: Record<MetricCardDef["tone"], string> = {
  brand: "text-np-brand-ink",
  warning: "text-[#D97706]",
  info: "text-[#2563EB]",
  purple: "text-[#7C3AED]",
};

function CircularProgress({
  percent,
  size = 120,
  strokeWidth = 10,
  color = "var(--color-np-brand-ink)",
  label,
  subLabel,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  subLabel: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-np-border)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[20px] font-bold text-np-ink">{Math.round(percent)}%</span>
        </div>
      </div>
      <p className="mt-2 text-[14px] font-bold text-np-ink">{label}</p>
      <p className="text-[12px] text-np-text-muted">{subLabel}</p>
    </div>
  );
}

export default function PerformancePage() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Hiệu suất cá nhân" onBack={() => navigate("/")} />

      <div className="bg-np-surface-sub pb-5">
        <PageHeader title="Hiệu suất" subtitle="Tháng 03/2026" />

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2.5 px-4">
          {metricCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="rounded-np-card bg-white p-3.5">
                <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${TONE_BG[card.tone]}`}>
                  <Icon size={18} strokeWidth={2} className={TONE_FG[card.tone]} />
                </div>
                <p className="text-[22px] font-extrabold text-np-ink tabular-nums">{card.value}</p>
                <p className="mt-0.5 text-[11px] font-medium text-np-text-muted">{card.label}</p>
              </div>
            );
          })}
        </div>

        {/* Revenue chart */}
        <SectionTitle>Doanh thu 6 tháng</SectionTitle>
        <Card className="p-4">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-np-border)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "var(--color-np-text-muted)" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-np-text-muted)" }}
                  tickFormatter={(v) => fmtShort(v)}
                />
                <Tooltip
                  formatter={(value: number) => [fmtVND(value), "Doanh thu"]}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid var(--color-np-border)",
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="revenue" fill="var(--color-np-brand-ink)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Goals */}
        <SectionTitle>Mục tiêu tháng</SectionTitle>
        <Card className="p-6">
          <div className="flex justify-center gap-10">
            {goals.map((goal, i) => {
              const percent = Math.min((goal.current / goal.target) * 100, 100);
              const subLabel = goal.isVND
                ? `${fmtShort(goal.current)}₫ / ${fmtShort(goal.target)}₫`
                : `${goal.current} / ${goal.target} đơn`;
              return (
                <CircularProgress
                  key={i}
                  percent={percent}
                  label={goal.name}
                  subLabel={subLabel}
                  color={i === 0 ? "var(--color-np-brand-ink)" : "#7C3AED"}
                />
              );
            })}
          </div>
        </Card>

        {/* Milestones */}
        <SectionTitle>Mốc thưởng doanh số</SectionTitle>
        <Card className="p-4">
          {milestones.map((m, i) => {
            const nextThreshold = i < milestones.length - 1 ? milestones[i + 1].threshold : null;
            const status = getMilestoneStatus(m.threshold, nextThreshold);
            const isLast = i === milestones.length - 1;
            const progressInStep =
              status === "in-progress" && nextThreshold
                ? Math.round(((currentRevenue - m.threshold) / (nextThreshold - m.threshold)) * 100)
                : 0;

            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      status === "achieved"
                        ? "border-np-brand-ink bg-np-brand-ink text-white"
                        : status === "in-progress"
                        ? "border-np-brand-ink bg-white text-np-brand-ink"
                        : "border-np-border-strong bg-np-surface-sub text-np-border-strong"
                    }`}
                  >
                    {status === "achieved" ? (
                      <Check size={16} strokeWidth={2.5} />
                    ) : status === "in-progress" ? (
                      <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-np-brand-ink" />
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full bg-np-border-strong" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`min-h-[40px] w-0.5 flex-1 ${
                        status === "achieved" ? "bg-np-brand-ink" : "bg-np-border"
                      }`}
                    />
                  )}
                </div>

                <div className={`flex-1 ${isLast ? "pb-0" : "pb-5"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[15px] font-bold ${
                        status === "locked" ? "text-np-text-muted" : "text-np-ink"
                      }`}
                    >
                      {m.rank}
                    </span>
                    <span
                      className={`text-[12px] ${
                        status === "locked" ? "text-np-border-strong" : "text-np-text-muted"
                      }`}
                    >
                      {m.threshold > 0 ? `từ ${fmtShort(m.threshold)}₫` : "Khởi đầu"}
                    </span>
                  </div>
                  <div
                    className={`mt-1 flex items-center gap-1.5 ${
                      status === "locked" ? "text-np-border-strong" : "text-np-text-muted"
                    }`}
                  >
                    <Gift size={12} strokeWidth={2.25} className="flex-shrink-0" />
                    <span className="text-[11px]">
                      HH {m.commission}%
                      {m.bonus > 0 ? ` · Thưởng ${fmtShort(m.bonus)}₫` : ""}
                    </span>
                  </div>
                  {status === "in-progress" && nextThreshold && (
                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-np-brand-ink">
                        <span>
                          {fmtShort(currentRevenue)}₫ / {fmtShort(nextThreshold)}₫
                        </span>
                        <span>{progressInStep}%</span>
                      </div>
                      <NPProgress value={progressInStep} height={6} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Card>

        <div className="h-5" />
      </div>
    </Screen>
  );
}
