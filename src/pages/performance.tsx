import { useState } from "react";
import {
  ShoppingBag,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Zap,
  Star,
  Crown,
  Users,
  Target,
  CalendarCheck,
  Award,
  Flame,
  Gift,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import AppHeader from "@/components/app-header";
import { Breadcrumb } from "@/components/breadcrumb";
import DateRangeFilter from "@/components/date-range-filter";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN').format(amount) + " ₫";
};

const formatShort = (amount: number) => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}tr`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k`;
  return amount.toString();
};

const currentRevenue = 35000000;

const milestones = [
  { rank: "Đồng", threshold: 0, commission: 3, bonus: 0 },
  { rank: "Bạc", threshold: 20000000, commission: 5, bonus: 300000 },
  { rank: "Vàng", threshold: 50000000, commission: 6, bonus: 500000 },
  { rank: "Kim cương", threshold: 100000000, commission: 8, bonus: 1000000 },
];

function getMilestoneStatus(threshold: number, nextThreshold: number | null) {
  if (nextThreshold === null) {
    return currentRevenue >= threshold ? "achieved" : "locked";
  }
  if (currentRevenue >= nextThreshold) return "achieved";
  if (currentRevenue >= threshold) return "in-progress";
  return "locked";
}

const monthlyStats = {
  totalOrders: 8,
  revenue: 35000000,
  commission: 1750000,
  completionRate: 75,
};

const chartData = [
  { month: "T10", revenue: 18000000 },
  { month: "T11", revenue: 25000000 },
  { month: "T12", revenue: 22000000 },
  { month: "T1", revenue: 30000000 },
  { month: "T2", revenue: 28000000 },
  { month: "T3", revenue: 35000000 },
];

const goals = [
  { name: "Doanh thu", current: 35000000, target: 50000000, unit: "₫" },
  { name: "Số đơn", current: 8, target: 15, unit: "đơn" },
];

const allBadges = [
  { name: "Đơn đầu tiên", icon: Zap, achieved: true, date: "15/01/2026", condition: "Hoàn tất đơn hàng đầu tiên" },
  { name: "5 đơn liên tiếp", icon: Star, achieved: true, date: "10/02/2026", condition: "Hoàn tất 5 đơn hàng liên tiếp" },
  { name: "Khách VIP", icon: Users, achieved: true, date: "20/02/2026", condition: "Phục vụ khách hàng VIP" },
  { name: "Top 1 tuần", icon: Crown, achieved: false, date: null, condition: "Đứng Top 1 bảng xếp hạng tuần" },
  { name: "Doanh thu 50tr", icon: Target, achieved: false, date: null, condition: "Đạt 50 triệu doanh thu lũy kế" },
  { name: "10 đơn/tháng", icon: CalendarCheck, achieved: false, date: null, condition: "Hoàn tất 10 đơn trong 1 tháng" },
  { name: "Hạng Vàng", icon: Award, achieved: false, date: null, condition: "Đạt cấp bậc Vàng" },
  { name: "Streak 7 ngày", icon: Flame, achieved: false, date: null, condition: "Có đơn hoàn tất 7 ngày liên tiếp" },
  { name: "Thưởng nóng", icon: Gift, achieved: false, date: null, condition: "Đạt 80% target trước ngày 20" },
];

function CircularProgress({ percent, size = 120, strokeWidth = 10, color = "#008060", label, subLabel }: {
  percent: number; size?: number; strokeWidth?: number; color?: string; label: string; subLabel: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e3e3e3" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-[#1a1c1d]">{Math.round(percent)}%</span>
        </div>
      </div>
      <p className="text-sm font-bold text-[#1a1c1d] mt-2">{label}</p>
      <p className="text-xs text-[#8c9196]">{subLabel}</p>
    </div>
  );
}

const metricCards = [
  { label: "Tổng đơn", value: monthlyStats.totalOrders.toString(), icon: ShoppingBag, color: "text-[#7c3aed]", bg: "bg-[#ede9fe]" },
  { label: "Doanh thu", value: formatShort(monthlyStats.revenue), icon: TrendingUp, color: "text-[#008060]", bg: "bg-[#e4f3d9]" },
  { label: "Hoa hồng", value: formatShort(monthlyStats.commission), icon: DollarSign, color: "text-[#d97706]", bg: "bg-[#fef3c7]" },
  { label: "Tỷ lệ hoàn tất", value: monthlyStats.completionRate + "%", icon: CheckCircle2, color: "text-[#2563eb]", bg: "bg-[#dbeafe]" },
];

export default function PerformancePage() {
  const [dateRange, setDateRange] = useState("this_month");

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader activePage="performance" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[{ label: "Hiệu suất" }]} />

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1a1c1d]" data-testid="text-performance-title">Hiệu suất cá nhân</h1>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="section-metrics">
          {metricCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Card key={i} className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`h-9 w-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                      <Icon className={`h-4.5 w-4.5 ${card.color}`} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-[#1a1c1d] tabular-nums" data-testid={`metric-value-${i}`}>{card.value}</p>
                  <p className="text-[11px] text-[#8c9196] font-medium mt-0.5">{card.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white" data-testid="section-chart">
          <div className="px-4 sm:px-6 py-4 border-b border-[#e3e3e3]">
            <h3 className="text-sm font-bold text-[#1a1c1d]">Doanh thu 6 tháng gần nhất</h3>
          </div>
          <CardContent className="p-4 sm:p-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e3e3" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#8c9196" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8c9196" }} tickFormatter={(v) => formatShort(v)} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Doanh thu"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #d2d5d8", fontSize: 13 }}
                  />
                  <Bar dataKey="revenue" fill="#008060" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white" data-testid="section-goals">
          <div className="px-4 sm:px-6 py-4 border-b border-[#e3e3e3]">
            <h3 className="text-sm font-bold text-[#1a1c1d]">Mục tiêu tháng</h3>
          </div>
          <CardContent className="p-6">
            <div className="flex justify-center gap-12 sm:gap-20">
              {goals.map((goal, i) => {
                const percent = Math.min((goal.current / goal.target) * 100, 100);
                const subLabel = goal.unit === "₫"
                  ? `Đã đạt ${formatShort(goal.current)} / ${formatShort(goal.target)}`
                  : `Đã đạt ${goal.current} / ${goal.target} ${goal.unit}`;
                return (
                  <CircularProgress
                    key={i}
                    percent={percent}
                    label={goal.name}
                    subLabel={subLabel}
                    color={i === 0 ? "#008060" : "#7c3aed"}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white" data-testid="section-milestones">
          <div className="px-4 sm:px-6 py-4 border-b border-[#e3e3e3]">
            <h3 className="text-sm font-bold text-[#1a1c1d]">Mốc thưởng doanh số</h3>
          </div>
          <CardContent className="p-4 sm:p-6">
            <div className="relative">
              {milestones.map((m, i) => {
                const nextThreshold = i < milestones.length - 1 ? milestones[i + 1].threshold : null;
                const status = getMilestoneStatus(m.threshold, nextThreshold);
                const isLast = i === milestones.length - 1;
                const progressInStep = status === "in-progress" && nextThreshold
                  ? Math.round(((currentRevenue - m.threshold) / (nextThreshold - m.threshold)) * 100)
                  : 0;

                return (
                  <div key={i} className="flex gap-4" data-testid={`milestone-${i}`}>
                    <div className="flex flex-col items-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
                        status === "achieved"
                          ? "bg-[#008060] border-[#008060] text-white"
                          : status === "in-progress"
                          ? "bg-white border-[#008060] text-[#008060]"
                          : "bg-[#f6f6f7] border-[#d2d5d8] text-[#d2d5d8]"
                      }`}>
                        {status === "achieved" ? (
                          <Check className="h-4 w-4" />
                        ) : status === "in-progress" ? (
                          <div className="h-2.5 w-2.5 rounded-full bg-[#008060] animate-pulse" />
                        ) : (
                          <div className="h-2.5 w-2.5 rounded-full bg-[#d2d5d8]" />
                        )}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 flex-1 min-h-[40px] ${
                          status === "achieved" ? "bg-[#008060]" : "bg-[#e3e3e3]"
                        }`} />
                      )}
                    </div>

                    <div className={`flex-1 pb-6 ${isLast ? "pb-0" : ""}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${
                          status === "locked" ? "text-[#8c9196]" : "text-[#1a1c1d]"
                        }`}>{m.rank}</span>
                        <span className={`text-xs ${status === "locked" ? "text-[#c9cccf]" : "text-[#8c9196]"}`}>
                          {m.threshold > 0 ? `${formatShort(m.threshold)} trở lên` : "Khởi đầu"}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1.5 mt-1 ${status === "locked" ? "text-[#c9cccf]" : "text-[#8c9196]"}`}>
                        <Gift className="h-3 w-3 shrink-0" />
                        <span className="text-[11px]">
                          Hoa hồng {m.commission}%{m.bonus > 0 ? ` · Thưởng ${new Intl.NumberFormat('vi-VN').format(m.bonus)}₫` : ""}
                        </span>
                      </div>
                      {status === "in-progress" && nextThreshold && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-[#008060] font-medium mb-1">
                            <span>{formatShort(currentRevenue)} / {formatShort(nextThreshold)}</span>
                            <span>{progressInStep}%</span>
                          </div>
                          <div className="w-full bg-[#e3e3e3] rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#008060] transition-all duration-1000 ease-out"
                              style={{ width: `${progressInStep}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Badge section hidden */}
      </main>
    </div>
  );
}
