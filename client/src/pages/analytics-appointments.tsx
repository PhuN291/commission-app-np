import { useState } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Repeat,
  TrendingUp,
  UserX,
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import AppHeader from "@/components/app-header";
import DateRangeFilter from "@/components/date-range-filter";

// KPI Cards
const kpiCards = [
  { title: "Tổng lịch hẹn", value: 1247, change: 6.8, icon: Calendar, format: "number" },
  { title: "Tỉ lệ hoàn thành", value: 78.5, change: 3.2, icon: CheckCircle2, format: "percent" },
  { title: "Tỉ lệ không đến", value: 8.3, change: -1.5, icon: XCircle, format: "percent", invertColor: true },
  { title: "Tỉ lệ tái khám", value: 34.2, change: 2.1, icon: Repeat, format: "percent" },
];

// Daily appointments line chart - 30 days
const dailyAppointmentsData = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const total = Math.round(38 + Math.sin(i * 0.4) * 8 + Math.random() * 6);
  const completed = Math.round(total * (0.72 + Math.random() * 0.12));
  const noShow = Math.round(total * (0.05 + Math.random() * 0.06));
  return {
    day: `${day.toString().padStart(2, "0")}/03`,
    total,
    completed,
    noShow,
  };
});

// Appointments by hour - bar chart
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

// Status distribution - donut chart
const statusDistribution = [
  { name: "Hoàn thành", value: 978, color: "#008060" },
  { name: "Đã hủy", value: 112, color: "#8c9196" },
  { name: "Không đến", value: 103, color: "#d72c0d" },
  { name: "Chưa xác nhận", value: 54, color: "#d97706" },
];

// No-show rate trend - last 6 months
const noShowTrend = [
  { month: "T10", rate: 11.2 },
  { month: "T11", rate: 10.5 },
  { month: "T12", rate: 9.8 },
  { month: "T01", rate: 9.1 },
  { month: "T02", rate: 8.9 },
  { month: "T03", rate: 8.3 },
];

// Top no-show time slots
const topNoShowHours = [
  { time: "11:00 – 12:00", count: 28, percent: 27.2 },
  { time: "16:00 – 17:00", count: 21, percent: 20.4 },
  { time: "14:00 – 15:00", count: 18, percent: 17.5 },
  { time: "07:00 – 08:00", count: 15, percent: 14.6 },
];

// Follow-up stats
const followUpStats = [
  { label: "Cần tái khám (7 ngày tới)", value: 47 },
  { label: "Đã xác nhận", value: 31 },
  { label: "Chưa liên hệ được", value: 8 },
  { label: "Từ chối / Hủy", value: 8 },
];

// Repeat no-show patients
const repeatNoShowPatients = [
  { name: "Phạm Thị W", count: 5, lastNoShow: "11/03/2026" },
  { name: "Ngô Văn R", count: 3, lastNoShow: "08/03/2026" },
  { name: "Đặng Thị L", count: 3, lastNoShow: "05/03/2026" },
  { name: "Trần Văn M", count: 2, lastNoShow: "09/03/2026" },
  { name: "Lý Thị N", count: 2, lastNoShow: "04/03/2026" },
];

// Appointments by doctor
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
  const [dateRange, setDateRange] = useState("last_30_days");

  const gaugeAngle = Math.min((noShowRate / 15) * 180, 180);
  const gaugeColor = noShowRate <= 5 ? "#008060" : noShowRate <= 10 ? "#d97706" : "#d72c0d";
  const totalStatus = statusDistribution.reduce((s, d) => s + d.value, 0);

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader userName="Nguyễn Thị Mai" activePage="analytics-appointments" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#1a1c1d]">Thống kê lịch hẹn</h1>
            <p className="text-xs text-[#8c9196] mt-0.5">Phân tích xu hướng lịch hẹn, tỉ lệ hoàn thành và không đến</p>
          </div>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            const isPositive = card.invertColor ? card.change <= 0 : card.change >= 0;
            const changeAbs = Math.abs(card.change);
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
                      {card.change >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {card.change >= 0 ? "+" : "-"}{changeAbs.toFixed(1)}%
                    </div>
                  </div>
                  <p className="text-xs font-bold text-[#4a4d50] uppercase tracking-wider mb-1">{card.title}</p>
                  <h3 className="text-2xl font-bold text-[#1a1c1d] tabular-nums">
                    {card.format === "percent" ? `${card.value}%` : card.value.toLocaleString("vi-VN")}
                  </h3>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Appointments Trend Line Chart */}
        <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
          <div className="px-5 py-4 border-b border-[#e3e3e3]">
            <h3 className="text-sm font-bold text-[#1a1c1d]">Xu hướng lịch hẹn theo ngày</h3>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-5 bg-[#008060] rounded-full" />
                <span className="text-[11px] text-[#8c9196]">Tổng</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-5 bg-[#34d399] rounded-full" />
                <span className="text-[11px] text-[#8c9196]">Hoàn thành</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-5 bg-[#d72c0d] rounded-full" style={{ borderTop: "1px dashed #d72c0d" }} />
                <span className="text-[11px] text-[#8c9196]">Không đến</span>
              </div>
            </div>
          </div>
          <CardContent className="p-5">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyAppointmentsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3e3e3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "#8c9196" }}
                    axisLine={{ stroke: "#e3e3e3" }}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#8c9196" }}
                    axisLine={false}
                    tickLine={false}
                    width={35}
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
                      value,
                      name === "total" ? "Tổng" : name === "completed" ? "Hoàn thành" : "Không đến",
                    ]}
                    labelFormatter={(label) => `Ngày ${label}`}
                  />
                  <Line type="monotone" dataKey="total" stroke="#008060" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#008060", stroke: "#fff", strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="completed" stroke="#34d399" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: "#34d399", stroke: "#fff", strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="noShow" stroke="#d72c0d" strokeWidth={1.5} strokeDasharray="6 4" dot={false} activeDot={{ r: 4, fill: "#d72c0d", stroke: "#fff", strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Distribution + Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Hourly Bar Chart */}
          <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white lg:col-span-3">
            <div className="px-5 py-4 border-b border-[#e3e3e3]">
              <h3 className="text-sm font-bold text-[#1a1c1d]">Phân bố theo khung giờ</h3>
            </div>
            <CardContent className="p-5">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e3e3" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 11, fill: "#8c9196" }}
                      axisLine={{ stroke: "#e3e3e3" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#8c9196" }}
                      axisLine={false}
                      tickLine={false}
                      width={35}
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
                      formatter={(value: number) => [`${value} lịch hẹn`, "Số lượng"]}
                      labelFormatter={(label) => `Khung giờ ${label}`}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {hourlyData.map((entry, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={entry.count === Math.max(...hourlyData.map(h => h.count)) ? "#008060" : "#a7f3d0"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Donut */}
          <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white lg:col-span-2">
            <div className="px-5 py-4 border-b border-[#e3e3e3]">
              <h3 className="text-sm font-bold text-[#1a1c1d]">Phân bố trạng thái</h3>
            </div>
            <CardContent className="p-5">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#1a1c1d",
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: "#fff",
                        padding: "10px 14px",
                      }}
                      formatter={(value: number, name: string) => [`${value} (${((value / totalStatus) * 100).toFixed(1)}%)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {statusDistribution.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-[#4a4d50] flex-1">{s.name}</span>
                    <span className="text-xs font-bold text-[#1a1c1d] tabular-nums">{s.value}</span>
                    <span className="text-[11px] text-[#8c9196] tabular-nums w-12 text-right">
                      {((s.value / totalStatus) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* No-show Analysis + Follow-up Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* No-show deep dive */}
          <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white lg:col-span-3">
            <div className="px-5 py-4 border-b border-[#e3e3e3]">
              <h3 className="text-sm font-bold text-[#1a1c1d]">Phân tích không đến</h3>
            </div>
            <CardContent className="p-5 space-y-6">
              {/* Gauge + Trend side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Gauge */}
                <div className="flex flex-col items-center">
                  <p className="text-[11px] font-bold text-[#4a4d50] uppercase tracking-wider mb-3">Tỉ lệ hiện tại</p>
                  <div className="relative w-36 h-[72px] overflow-hidden">
                    <svg viewBox="0 0 200 100" className="w-full h-full">
                      <path d="M 20 95 A 80 80 0 0 1 180 95" fill="none" stroke="#e3e3e3" strokeWidth="12" strokeLinecap="round" />
                      <path d="M 20 95 A 80 80 0 0 1 180 95" fill="none" stroke={gaugeColor} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(gaugeAngle / 180) * 251} 251`} />
                      <text x="20" y="98" fontSize="8" fill="#8c9196" textAnchor="middle">0%</text>
                      <text x="100" y="15" fontSize="8" fill="#8c9196" textAnchor="middle">7.5%</text>
                      <text x="180" y="98" fontSize="8" fill="#8c9196" textAnchor="middle">15%</text>
                    </svg>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                      <p className="text-2xl font-bold tabular-nums" style={{ color: gaugeColor }}>{noShowRate}%</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8c9196] mt-1">
                    Mục tiêu: {"<"}{noShowTarget}%{" "}
                    <span className={noShowRate <= noShowTarget ? "text-[#008060] font-bold" : "text-[#d72c0d] font-bold"}>
                      ({noShowRate <= noShowTarget ? "Đạt" : "Chưa đạt"})
                    </span>
                  </p>
                </div>

                {/* No-show trend mini chart */}
                <div>
                  <p className="text-[11px] font-bold text-[#4a4d50] uppercase tracking-wider mb-3">Xu hướng 6 tháng</p>
                  <div className="h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={noShowTrend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#8c9196" }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 15]} tick={{ fontSize: 10, fill: "#8c9196" }} axisLine={false} tickLine={false} width={25} tickFormatter={(v) => `${v}%`} />
                        <Line type="monotone" dataKey="rate" stroke="#d72c0d" strokeWidth={2} dot={{ r: 3, fill: "#d72c0d", stroke: "#fff", strokeWidth: 2 }} />
                        {/* Target line */}
                        <CartesianGrid horizontal={false} vertical={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="h-px w-4 bg-[#008060] border-t border-dashed border-[#008060]" />
                    <span className="text-[10px] text-[#8c9196]">Mục tiêu: {noShowTarget}%</span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Right column: Follow-up stats + Doctor completion */}
          <div className="lg:col-span-2 space-y-6">
            {/* Follow-up overview */}
            <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
              <div className="px-5 py-4 border-b border-[#e3e3e3]">
                <h3 className="text-sm font-bold text-[#1a1c1d]">Tái khám sắp tới</h3>
              </div>
              <CardContent className="p-5 space-y-3">
                {followUpStats.map((stat, i) => {
                  const colors = ["#008060", "#34d399", "#d97706", "#d72c0d"];
                  const bgs = ["#e4f3d9", "#d1fae5", "#fef3c7", "#fce4e4"];
                  const total = followUpStats[0].value;
                  const widthPct = (stat.value / total) * 100;
                  return (
                    <div key={stat.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#4a4d50]">{stat.label}</span>
                        <span className="text-xs font-bold text-[#1a1c1d] tabular-nums">{stat.value}</span>
                      </div>
                      <div className="h-2 bg-[#f6f6f7] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${widthPct}%`, backgroundColor: colors[i] }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-[#e3e3e3]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4a4d50]">Tỉ lệ xác nhận</span>
                    <span className="text-sm font-bold text-[#008060]">66.0%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Doctor completion rate */}
            <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
              <div className="px-5 py-4 border-b border-[#e3e3e3]">
                <h3 className="text-sm font-bold text-[#1a1c1d]">Tỉ lệ hoàn thành theo bác sĩ</h3>
              </div>
              <CardContent className="p-5 space-y-3">
                {appointmentsByDoctor.map((doc) => {
                  const barColor = doc.completionRate >= 80 ? "#008060" : doc.completionRate >= 70 ? "#d97706" : "#d72c0d";
                  return (
                    <div key={doc.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[#1a1c1d] truncate">{doc.name}</span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: barColor }}>
                          {doc.completionRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-[#f6f6f7] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${doc.completionRate}%`, backgroundColor: barColor }} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-[#8c9196]">{doc.total} tổng</span>
                        <span className="text-[10px] text-[#008060]">{doc.completed} hoàn thành</span>
                        <span className="text-[10px] text-[#d72c0d]">{doc.noShow} không đến</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
