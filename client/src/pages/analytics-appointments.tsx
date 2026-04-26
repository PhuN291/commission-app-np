import { useState } from "react";
import { useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Repeat,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  DetailHeader,
  PageHeader,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";
import DateRangeFilter from "@/components/date-range-filter";
import { cn } from "@/lib/utils";

type KpiCard = {
  title: string;
  value: number;
  change: number;
  icon: LucideIcon;
  format: "number" | "percent";
  invertColor?: boolean;
};

const kpiCards: KpiCard[] = [
  { title: "Tổng lịch hẹn", value: 1247, change: 6.8, icon: Calendar, format: "number" },
  { title: "Tỉ lệ hoàn thành", value: 78.5, change: 3.2, icon: CheckCircle2, format: "percent" },
  { title: "Tỉ lệ không đến", value: 8.3, change: -1.5, icon: XCircle, format: "percent", invertColor: true },
  { title: "Tỉ lệ tái khám", value: 34.2, change: 2.1, icon: Repeat, format: "percent" },
];

const dailyAppointmentsData = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const seed1 = ((i * 7919) % 1000) / 1000;
  const seed2 = ((i * 6997) % 1000) / 1000;
  const total = Math.round(38 + Math.sin(i * 0.4) * 8 + seed1 * 6);
  const completed = Math.round(total * (0.72 + seed2 * 0.12));
  const noShow = Math.round(total * (0.05 + seed1 * 0.06));
  return {
    day: `${day.toString().padStart(2, "0")}/03`,
    total,
    completed,
    noShow,
  };
});

const hourlyData = [
  { hour: "07-08", count: 45 },
  { hour: "08-09", count: 187 },
  { hour: "09-10", count: 231 },
  { hour: "10-11", count: 198 },
  { hour: "11-12", count: 112 },
  { hour: "13-14", count: 156 },
  { hour: "14-15", count: 142 },
  { hour: "15-16", count: 108 },
  { hour: "16-17", count: 68 },
];
const maxHourly = Math.max(...hourlyData.map((h) => h.count));

const statusDistribution = [
  { name: "Hoàn thành", value: 978, color: "#008060" },
  { name: "Đã hủy", value: 112, color: "#8C9196" },
  { name: "Không đến", value: 103, color: "#D72C0D" },
  { name: "Chưa xác nhận", value: 54, color: "#D97706" },
];

const noShowTrend = [
  { month: "T10", rate: 11.2 },
  { month: "T11", rate: 10.5 },
  { month: "T12", rate: 9.8 },
  { month: "T01", rate: 9.1 },
  { month: "T02", rate: 8.9 },
  { month: "T03", rate: 8.3 },
];

const followUpStats = [
  { label: "Cần tái khám", value: 47, color: "#008060" },
  { label: "Đã xác nhận", value: 31, color: "#34D399" },
  { label: "Chưa liên hệ", value: 8, color: "#D97706" },
  { label: "Từ chối / Hủy", value: 8, color: "#D72C0D" },
];

const appointmentsByDoctor = [
  { name: "BS. Nguyễn Văn A", total: 312, completed: 258, noShow: 22, completionRate: 82.7 },
  { name: "BS. Trần Thị B", total: 287, completed: 224, noShow: 28, completionRate: 78.0 },
  { name: "BS. Lê Văn C", total: 245, completed: 186, noShow: 24, completionRate: 75.9 },
  { name: "BS. Phạm Thị D", total: 218, completed: 178, noShow: 15, completionRate: 81.7 },
  { name: "BS. Hoàng Văn E", total: 185, completed: 132, noShow: 14, completionRate: 71.4 },
];

const noShowRate = 8.3;
const noShowTarget = 5;

export default function AnalyticsAppointments() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const [dateRange, setDateRange] = useState("last_30_days");

  const totalStatus = statusDistribution.reduce((s, d) => s + d.value, 0);
  const gaugeAngle = Math.min((noShowRate / 15) * 180, 180);
  const gaugeColor =
    noShowRate <= 5
      ? "var(--color-np-brand-ink)"
      : noShowRate <= 10
      ? "var(--color-np-warning)"
      : "var(--color-np-danger)";

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Lịch hẹn" onBack={() => navigate("/")} />

      <div className="bg-np-surface-sub pb-5">
        <PageHeader
          title="Lịch hẹn"
          subtitle="Xu hướng và tỉ lệ hoàn thành"
          action={<DateRangeFilter value={dateRange} onChange={setDateRange} />}
        />

        {/* KPI */}
        <div className="grid grid-cols-2 gap-2.5 px-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            const isPositive = card.invertColor ? card.change <= 0 : card.change >= 0;
            const displayValue =
              card.format === "percent"
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
                    {card.change >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {card.change >= 0 ? "+" : ""}
                    {card.change.toFixed(1)}%
                  </div>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
                  {card.title}
                </p>
                <p className="mt-0.5 text-[20px] font-extrabold text-np-ink tabular-nums">
                  {displayValue}
                </p>
              </div>
            );
          })}
        </div>

        {/* Daily trend */}
        <SectionTitle>Xu hướng theo ngày</SectionTitle>
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <LegendItem color="var(--color-np-brand-ink)" label="Tổng" />
            <LegendItem color="#34D399" label="Hoàn thành" />
            <LegendItem color="var(--color-np-danger)" label="Không đến" dashed />
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyAppointmentsData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
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
                  tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-np-ink)",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "#fff",
                    padding: "6px 10px",
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === "total" ? "Tổng" : name === "completed" ? "Hoàn thành" : "Không đến",
                  ]}
                  labelFormatter={(label) => `Ngày ${label}`}
                />
                <Line type="monotone" dataKey="total" stroke="var(--color-np-brand-ink)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="completed" stroke="#34D399" strokeWidth={1.5} dot={false} />
                <Line
                  type="monotone"
                  dataKey="noShow"
                  stroke="var(--color-np-danger)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Hourly distribution */}
        <SectionTitle>Phân bố theo khung giờ</SectionTitle>
        <Card className="p-4">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-np-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 9, fill: "var(--color-np-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-np-ink)",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "#fff",
                    padding: "6px 10px",
                  }}
                  formatter={(value: number) => [`${value} lịch`, "Số lượng"]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={32}>
                  {hourlyData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.count === maxHourly ? "var(--color-np-brand-ink)" : "#A7F3D0"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status donut */}
        <SectionTitle>Phân bố trạng thái</SectionTitle>
        <Card className="p-4">
          <div className="flex items-center justify-center">
            <div className="h-[160px] w-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-np-ink)",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "#fff",
                      padding: "6px 10px",
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} (${((value / totalStatus) * 100).toFixed(1)}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {statusDistribution.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="flex-1 text-[13px] text-np-ink">{s.name}</span>
                <span className="text-[13px] font-bold text-np-ink tabular-nums">{s.value}</span>
                <span className="w-10 text-right text-[11px] text-np-text-muted">
                  {((s.value / totalStatus) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* No-show analysis */}
        <SectionTitle>Phân tích không đến</SectionTitle>
        <Card className="space-y-4 p-4">
          {/* Gauge */}
          <div className="flex flex-col items-center">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
              Tỉ lệ hiện tại
            </p>
            <div className="relative h-[100px] w-[200px]">
              <svg viewBox="0 0 200 110" className="h-full w-full">
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="var(--color-np-border)"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke={gaugeColor}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${(gaugeAngle / 180) * 251} 251`}
                />
              </svg>
              <div className="absolute bottom-0 left-0 right-0 text-center">
                <p
                  className="text-[28px] font-extrabold tabular-nums"
                  style={{ color: gaugeColor }}
                >
                  {noShowRate}%
                </p>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-np-text-muted">
              Mục tiêu &lt; {noShowTarget}%{" "}
              <span
                className={cn(
                  "font-bold",
                  noShowRate <= noShowTarget ? "text-np-brand-ink" : "text-np-danger",
                )}
              >
                ({noShowRate <= noShowTarget ? "Đạt" : "Chưa đạt"})
              </span>
            </p>
          </div>

          {/* Trend */}
          <div className="border-t border-np-surface-pressed pt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
              Xu hướng 6 tháng
            </p>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={noShowTrend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-np-border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 15]}
                    tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-np-ink)",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "#fff",
                      padding: "6px 10px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Không đến"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="var(--color-np-danger)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-np-danger)", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Follow-up stats */}
        <SectionTitle>Tái khám sắp tới</SectionTitle>
        <Card className="space-y-3 p-4">
          {followUpStats.map((stat) => {
            const total = followUpStats[0].value;
            const widthPct = (stat.value / total) * 100;
            return (
              <div key={stat.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[12px] text-np-text-sub">{stat.label}</span>
                  <span className="text-[13px] font-bold text-np-ink tabular-nums">
                    {stat.value}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-np-surface-sub">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${widthPct}%`, backgroundColor: stat.color }}
                  />
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t border-np-surface-pressed pt-2">
            <span className="text-[12px] font-bold text-np-text-sub">Tỉ lệ xác nhận</span>
            <span className="text-[15px] font-bold text-np-brand-ink">66.0%</span>
          </div>
        </Card>

        {/* Doctor completion */}
        <SectionTitle>Tỉ lệ hoàn thành theo bác sĩ</SectionTitle>
        <Card className="space-y-3 p-4">
          {appointmentsByDoctor.map((doc) => {
            const barColor =
              doc.completionRate >= 80
                ? "var(--color-np-brand-ink)"
                : doc.completionRate >= 70
                ? "var(--color-np-warning)"
                : "var(--color-np-danger)";
            return (
              <div key={doc.name}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="truncate text-[13px] font-medium text-np-ink">{doc.name}</span>
                  <span
                    className="text-[13px] font-bold tabular-nums"
                    style={{ color: barColor }}
                  >
                    {doc.completionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-np-surface-sub">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${doc.completionRate}%`, backgroundColor: barColor }}
                  />
                </div>
                <div className="mt-1 flex gap-3 text-[10px] tabular-nums">
                  <span className="text-np-text-muted">{doc.total} tổng</span>
                  <span className="text-np-brand-ink">{doc.completed} hoàn thành</span>
                  <span className="text-np-danger">{doc.noShow} không đến</span>
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

function LegendItem({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-0.5 w-5 rounded-full"
        style={{
          backgroundColor: dashed ? "transparent" : color,
          borderTop: dashed ? `1px dashed ${color}` : undefined,
        }}
      />
      <span className="text-[11px] text-np-text-muted">{label}</span>
    </div>
  );
}
