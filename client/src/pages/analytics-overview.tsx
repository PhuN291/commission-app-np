import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Repeat,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import AppHeader from "@/components/app-header";
import DateRangeFilter from "@/components/date-range-filter";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
};

const formatShort = (amount: number) => {
  if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}tỷ`;
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(0)}tr`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k`;
  return amount.toString();
};

// KPI Cards mock data
const kpiCards = [
  {
    title: "Tổng doanh thu",
    value: 1245000000,
    change: 12.3,
    icon: DollarSign,
    format: "currency",
  },
  {
    title: "Số bệnh nhân",
    value: 847,
    change: 8.1,
    icon: Users,
    format: "number",
  },
  {
    title: "DT trung bình / BN",
    value: 1470000,
    change: 4.2,
    icon: Activity,
    format: "currency",
  },
  {
    title: "Tỷ lệ quay lại",
    value: 34.2,
    change: -2.1,
    icon: Repeat,
    format: "percent",
  },
];

// Line chart mock data - 30 days
const revenueLineData = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const base = 35000000 + Math.sin(i * 0.3) * 15000000 + Math.random() * 8000000;
  const prev = 30000000 + Math.sin(i * 0.3) * 12000000 + Math.random() * 6000000;
  return {
    day: `${day.toString().padStart(2, "0")}/03`,
    current: Math.round(base),
    previous: Math.round(prev),
  };
});

// Horizontal bar chart - revenue by service
const serviceRevenueData = [
  { name: "Khám tổng quát", revenue: 320000000, percent: 25.7 },
  { name: "Siêu âm", revenue: 245000000, percent: 19.7 },
  { name: "Xét nghiệm máu", revenue: 198000000, percent: 15.9 },
  { name: "Nội soi", revenue: 176000000, percent: 14.1 },
  { name: "Điều dưỡng tại nhà", revenue: 152000000, percent: 12.2 },
  { name: "Khác", revenue: 154000000, percent: 12.4 },
];

const barColors = ["#008060", "#00a67d", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"];

// Top 5 growing services
const topGrowingServices = [
  { name: "Điều dưỡng tại nhà", growth: 45.2, revenue: 152000000 },
  { name: "Nội soi", growth: 28.7, revenue: 176000000 },
  { name: "Xét nghiệm máu", growth: 18.3, revenue: 198000000 },
  { name: "Siêu âm", growth: 12.1, revenue: 245000000 },
  { name: "Khám tổng quát", growth: -3.5, revenue: 320000000 },
];

export default function AnalyticsOverview() {
  const [dateRange, setDateRange] = useState("last_30_days");

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader userName="Nguyễn Thị Mai" activePage="analytics-overview" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#1a1c1d]">Tổng quan doanh thu</h1>
            <p className="text-xs text-[#8c9196] mt-0.5">Theo dõi doanh thu và các chỉ số chính của phòng khám</p>
          </div>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            const isPositive = card.change >= 0;
            return (
              <Card key={card.title} className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="h-10 w-10 rounded-xl bg-[#e4f3d9] flex items-center justify-center">
                      <Icon className="h-5 w-5 text-[#008060]" />
                    </div>
                    <div
                      className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full ${
                        isPositive ? "bg-[#e4f3d9] text-[#008060]" : "bg-[#fce4e4] text-[#d72c0d]"
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {isPositive ? "+" : ""}
                      {card.change.toFixed(1)}%
                    </div>
                  </div>
                  <p className="text-xs font-bold text-[#4a4d50] uppercase tracking-wider mb-1">
                    {card.title}
                  </p>
                  <h3 className="text-2xl font-bold text-[#1a1c1d] tabular-nums">
                    {card.format === "currency"
                      ? formatCurrency(card.value)
                      : card.format === "percent"
                      ? `${card.value}%`
                      : card.value.toLocaleString("vi-VN")}
                  </h3>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Revenue Line Chart */}
        <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
          <div className="px-5 py-4 border-b border-[#e3e3e3]">
            <h3 className="text-sm font-bold text-[#1a1c1d]">Doanh thu theo thời gian</h3>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-5 bg-[#008060] rounded-full" />
                <span className="text-[11px] text-[#8c9196]">Kỳ hiện tại</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-5 bg-[#c9cccf] rounded-full" style={{ borderTop: "1px dashed #c9cccf" }} />
                <span className="text-[11px] text-[#8c9196]">Kỳ trước</span>
              </div>
            </div>
          </div>
          <CardContent className="p-5">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueLineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3e3e3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "#8c9196" }}
                    axisLine={{ stroke: "#e3e3e3" }}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tickFormatter={formatShort}
                    tick={{ fontSize: 11, fill: "#8c9196" }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1c1d",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "12px",
                      color: "#fff",
                      padding: "10px 14px",
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "current" ? "Kỳ hiện tại" : "Kỳ trước",
                    ]}
                    labelFormatter={(label) => `Ngày ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="current"
                    stroke="#008060"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: "#008060", stroke: "#fff", strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="previous"
                    stroke="#c9cccf"
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 4, fill: "#c9cccf", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Service + Top Growing */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Horizontal Bar Chart - 60% */}
          <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white lg:col-span-3">
            <div className="px-5 py-4 border-b border-[#e3e3e3]">
              <h3 className="text-sm font-bold text-[#1a1c1d]">Doanh thu theo dịch vụ</h3>
            </div>
            <CardContent className="p-5">
              <div className="space-y-4">
                {serviceRevenueData.map((service, i) => {
                  const maxRevenue = serviceRevenueData[0].revenue;
                  const widthPercent = (service.revenue / maxRevenue) * 100;
                  return (
                    <div key={service.name} className="flex items-center gap-3">
                      <div className="w-28 sm:w-32 shrink-0">
                        <span className="text-sm font-medium text-[#1a1c1d] truncate block">
                          {service.name}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1 h-8 bg-[#f6f6f7] rounded-lg overflow-hidden">
                          <div
                            className="h-full rounded-lg transition-all duration-700 ease-out flex items-center px-3"
                            style={{
                              width: `${widthPercent}%`,
                              backgroundColor: barColors[i],
                            }}
                          >
                            {widthPercent > 30 && (
                              <span className="text-[11px] font-bold text-white whitespace-nowrap">
                                {formatCurrency(service.revenue)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#8c9196] w-12 text-right shrink-0">
                          {service.percent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top 5 Growing Services - 40% */}
          <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white lg:col-span-2">
            <div className="px-5 py-4 border-b border-[#e3e3e3]">
              <h3 className="text-sm font-bold text-[#1a1c1d]">Top 5 dịch vụ tăng trưởng</h3>
            </div>
            <CardContent className="p-5">
              <div className="space-y-3">
                {topGrowingServices.map((service, i) => {
                  const isPositive = service.growth >= 0;
                  return (
                    <div
                      key={service.name}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#f6f6f7] border border-[#e3e3e3]"
                    >
                      <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-sm font-bold text-[#8c9196] border border-[#e3e3e3]">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1a1c1d] truncate">{service.name}</p>
                        <p className="text-[11px] text-[#8c9196]">{formatCurrency(service.revenue)}</p>
                      </div>
                      <div
                        className={`flex items-center gap-0.5 text-xs font-bold ${
                          isPositive ? "text-[#008060]" : "text-[#d72c0d]"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {isPositive ? "+" : ""}
                        {service.growth.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
