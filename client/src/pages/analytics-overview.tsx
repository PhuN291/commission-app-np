import { useState } from "react";
import { useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Repeat,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Badge,
  Card,
  DetailHeader,
  PageHeader,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";
import DateRangeFilter from "@/components/date-range-filter";
import { cn } from "@/lib/utils";

const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

function fmtShort(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + "tr";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

type KpiCard = {
  title: string;
  value: number;
  change: number;
  icon: LucideIcon;
  format: "currency" | "number" | "percent";
};

const kpiCards: KpiCard[] = [
  { title: "Tổng doanh thu", value: 1_245_000_000, change: 12.3, icon: DollarSign, format: "currency" },
  { title: "Số bệnh nhân", value: 847, change: 8.1, icon: Users, format: "number" },
  { title: "DT trung bình / BN", value: 1_470_000, change: 4.2, icon: Activity, format: "currency" },
  { title: "Tỷ lệ quay lại", value: 34.2, change: -2.1, icon: Repeat, format: "percent" },
];

const revenueLineData = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const base = 35_000_000 + Math.sin(i * 0.3) * 15_000_000 + (((i * 7919) % 1000) / 1000) * 8_000_000;
  const prev = 30_000_000 + Math.sin(i * 0.3) * 12_000_000 + (((i * 6997) % 1000) / 1000) * 6_000_000;
  return {
    day: `${day.toString().padStart(2, "0")}/03`,
    current: Math.round(base),
    previous: Math.round(prev),
  };
});

const serviceRevenueData = [
  { name: "Khám tổng quát", revenue: 320_000_000, percent: 25.7 },
  { name: "Siêu âm", revenue: 245_000_000, percent: 19.7 },
  { name: "Xét nghiệm máu", revenue: 198_000_000, percent: 15.9 },
  { name: "Nội soi", revenue: 176_000_000, percent: 14.1 },
  { name: "Điều dưỡng tại nhà", revenue: 152_000_000, percent: 12.2 },
  { name: "Khác", revenue: 154_000_000, percent: 12.4 },
];

const BAR_COLORS = ["#1A8A7D", "#22A594", "#34D399", "#6EE7B7", "#A7F3D0", "#D1FAE5"];

const topGrowingServices = [
  { name: "Điều dưỡng tại nhà", growth: 45.2, revenue: 152_000_000 },
  { name: "Nội soi", growth: 28.7, revenue: 176_000_000 },
  { name: "Xét nghiệm máu", growth: 18.3, revenue: 198_000_000 },
  { name: "Siêu âm", growth: 12.1, revenue: 245_000_000 },
  { name: "Khám tổng quát", growth: -3.5, revenue: 320_000_000 },
];

export default function AnalyticsOverview() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const [dateRange, setDateRange] = useState("last_30_days");

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Phân tích tổng quan" onBack={() => navigate("/")} />

      <div className="bg-np-surface-sub pb-5">
        <PageHeader
          title="Tổng quan"
          subtitle="Doanh thu và chỉ số chính"
          action={<DateRangeFilter value={dateRange} onChange={setDateRange} />}
        />

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-2.5 px-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            const isPositive = card.change >= 0;
            const displayValue =
              card.format === "currency"
                ? fmtShort(card.value) + "đ"
                : card.format === "percent"
                ? `${card.value}%`
                : card.value.toLocaleString("vi-VN");
            return (
              <div key={card.title} className="rounded-np-card bg-white p-3.5">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-np-brand-soft">
                    <Icon size={18} strokeWidth={2} className="text-np-brand-ink" />
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      isPositive
                        ? "bg-np-brand-soft text-np-brand-ink"
                        : "bg-np-danger-bg text-np-danger",
                    )}
                  >
                    {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {isPositive ? "+" : ""}
                    {card.change.toFixed(1)}%
                  </div>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
                  {card.title}
                </p>
                <h3 className="mt-0.5 text-[20px] font-extrabold tracking-[-0.4px] text-np-ink tabular-nums">
                  {displayValue}
                </h3>
              </div>
            );
          })}
        </div>

        {/* Line chart */}
        <SectionTitle>Doanh thu theo thời gian</SectionTitle>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-5 rounded-full bg-np-brand-ink" />
              <span className="text-[11px] text-np-text-muted">Kỳ hiện tại</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="h-0 w-5"
                style={{ borderTop: "1px dashed var(--color-np-border-strong)" }}
              />
              <span className="text-[11px] text-np-text-muted">Kỳ trước</span>
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueLineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-np-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                  axisLine={{ stroke: "var(--color-np-border)" }}
                  tickLine={false}
                  interval={5}
                />
                <YAxis
                  tickFormatter={fmtShort}
                  tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-np-ink)",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "#fff",
                    padding: "8px 12px",
                  }}
                  formatter={(value: number, name: string) => [
                    fmtVND(value),
                    name === "current" ? "Kỳ hiện tại" : "Kỳ trước",
                  ]}
                  labelFormatter={(label) => `Ngày ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke="var(--color-np-brand-ink)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "var(--color-np-brand-ink)", stroke: "#fff", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="var(--color-np-border-strong)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Revenue by service */}
        <SectionTitle>Doanh thu theo dịch vụ</SectionTitle>
        <Card className="p-4">
          <div className="space-y-3">
            {serviceRevenueData.map((service, i) => {
              const maxRevenue = serviceRevenueData[0].revenue;
              const widthPercent = (service.revenue / maxRevenue) * 100;
              return (
                <div key={service.name}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="truncate text-[13px] font-medium text-np-ink">
                      {service.name}
                    </span>
                    <div className="flex flex-shrink-0 items-center gap-2 tabular-nums">
                      <span className="text-[12px] font-bold text-np-ink">
                        {fmtShort(service.revenue)}đ
                      </span>
                      <span className="text-[11px] font-medium text-np-text-muted">
                        {service.percent}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-np-surface-sub">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${widthPercent}%`,
                        backgroundColor: BAR_COLORS[i],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top growing */}
        <SectionTitle>Top 5 dịch vụ tăng trưởng</SectionTitle>
        <Card className="overflow-hidden p-0">
          {topGrowingServices.map((service, i) => {
            const isPositive = service.growth >= 0;
            return (
              <div
                key={service.name}
                className={
                  "flex items-center gap-3 px-4 py-3" +
                  (i === topGrowingServices.length - 1 ? "" : " border-b border-np-surface-pressed")
                }
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-np-surface-sub text-[13px] font-bold text-np-text-sub">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-np-ink">{service.name}</p>
                  <p className="text-[11px] text-np-text-muted tabular-nums">
                    {fmtShort(service.revenue)}đ
                  </p>
                </div>
                <Badge tone={isPositive ? "success" : "critical"}>
                  {isPositive ? (
                    <TrendingUp size={11} strokeWidth={2.25} />
                  ) : (
                    <TrendingDown size={11} strokeWidth={2.25} />
                  )}
                  {isPositive ? "+" : ""}
                  {service.growth.toFixed(1)}%
                </Badge>
              </div>
            );
          })}
        </Card>

        <div className="h-5" />
      </div>
    </Screen>
  );
}
