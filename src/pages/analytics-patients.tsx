import { useState } from "react";
import {
  Users,
  UserPlus,
  Repeat,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Crown,
  User,
  UserMinus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import AppHeader from "@/components/app-header";
import DateRangeFilter from "@/components/date-range-filter";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
};

// KPI Cards
const patientKPIs = [
  { title: "Tổng BN (unique)", value: "2.341", icon: Users, description: "Không đếm trùng, tính theo SĐT/CMND" },
  { title: "BN mới trong kỳ", value: "312", icon: UserPlus, description: "Lần đầu đến khám" },
  { title: "Tỷ lệ quay lại", value: "34,2%", icon: Repeat, description: "BN cũ quay lại / Tổng BN cũ" },
];

// Donut chart data
const patientGroupData = [
  { name: "Nội khoa", value: 845, percent: 36.1, color: "#008060" },
  { name: "Ngoại khoa", value: 412, percent: 17.6, color: "#00a67d" },
  { name: "Thẩm mỹ / Da liễu", value: 389, percent: 16.6, color: "#34d399" },
  { name: "Sản phụ khoa", value: 356, percent: 15.2, color: "#6ee7b7" },
  { name: "Khác", value: 339, percent: 14.5, color: "#a7f3d0" },
];

// Patient value tiers
interface PatientItem {
  name: string;
  phone: string;
  lastVisit: string;
  totalSpent: number;
}

interface Tier {
  name: string;
  condition: string;
  count: number;
  revenuePercent: number;
  avgRevenue: number;
  icon: typeof Crown;
  color: string;
  bgColor: string;
  patients: PatientItem[];
}

const tiers: Tier[] = [
  {
    name: "VIP",
    condition: "Chi tiêu > 10 triệu",
    count: 186,
    revenuePercent: 42,
    avgRevenue: 28100000,
    icon: Crown,
    color: "#d97706",
    bgColor: "#fef3c7",
    patients: [
      { name: "Nguyễn Thị Lan", phone: "0901 xxx xxx", lastVisit: "08/03/2026", totalSpent: 45200000 },
      { name: "Trần Văn Hùng", phone: "0912 xxx xxx", lastVisit: "05/03/2026", totalSpent: 38700000 },
      { name: "Lê Thị Mai", phone: "0903 xxx xxx", lastVisit: "01/03/2026", totalSpent: 32100000 },
      { name: "Phạm Văn Đức", phone: "0934 xxx xxx", lastVisit: "28/02/2026", totalSpent: 28900000 },
      { name: "Hoàng Thị Nga", phone: "0965 xxx xxx", lastVisit: "25/02/2026", totalSpent: 25600000 },
    ],
  },
  {
    name: "Thường xuyên",
    condition: "Chi tiêu 2-10 triệu",
    count: 724,
    revenuePercent: 38,
    avgRevenue: 6520000,
    icon: User,
    color: "#008060",
    bgColor: "#e4f3d9",
    patients: [
      { name: "Võ Văn Thành", phone: "0908 xxx xxx", lastVisit: "09/03/2026", totalSpent: 8500000 },
      { name: "Đặng Thị Hoa", phone: "0917 xxx xxx", lastVisit: "07/03/2026", totalSpent: 7200000 },
      { name: "Bùi Văn Nam", phone: "0923 xxx xxx", lastVisit: "04/03/2026", totalSpent: 5800000 },
    ],
  },
  {
    name: "Vãng lai",
    condition: "Chi tiêu < 2 triệu",
    count: 1431,
    revenuePercent: 20,
    avgRevenue: 1740000,
    icon: UserMinus,
    color: "#8c9196",
    bgColor: "#f6f6f7",
    patients: [
      { name: "Ngô Văn Tín", phone: "0944 xxx xxx", lastVisit: "10/03/2026", totalSpent: 1500000 },
      { name: "Lý Thị Bình", phone: "0955 xxx xxx", lastVisit: "06/03/2026", totalSpent: 850000 },
    ],
  },
];

// Churn risk patients
const churnRiskPatients = [
  { name: "Phạm Văn Đức", tier: "VIP", lastVisit: "15/11/2025", daysInactive: 116, totalSpent: 28900000 },
  { name: "Hoàng Thị Nga", tier: "VIP", lastVisit: "28/11/2025", daysInactive: 103, totalSpent: 25600000 },
  { name: "Trần Minh Quân", tier: "VIP", lastVisit: "01/12/2025", daysInactive: 100, totalSpent: 22300000 },
  { name: "Võ Văn Thành", tier: "Thường xuyên", lastVisit: "20/11/2025", daysInactive: 111, totalSpent: 8500000 },
  { name: "Đặng Thị Hoa", tier: "Thường xuyên", lastVisit: "05/12/2025", daysInactive: 96, totalSpent: 7200000 },
  { name: "Nguyễn Thị Yến", tier: "Thường xuyên", lastVisit: "08/12/2025", daysInactive: 93, totalSpent: 6100000 },
];

export default function AnalyticsPatients() {
  const [dateRange, setDateRange] = useState("last_30_days");
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader userName="Nguyễn Thị Mai" activePage="analytics-patients" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#1a1c1d]">Phân tích bệnh nhân</h1>
            <p className="text-xs text-[#8c9196] mt-0.5">Số lượng, tỷ lệ quay lại và phân nhóm bệnh nhân</p>
          </div>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {patientKPIs.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.title} className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#e4f3d9] flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-[#008060]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#4a4d50] uppercase tracking-wider">{kpi.title}</p>
                      <h3 className="text-2xl font-bold text-[#1a1c1d] tabular-nums mt-1">{kpi.value}</h3>
                      <p className="text-[11px] text-[#8c9196] mt-0.5">{kpi.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Donut Chart + Patient Value */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut Chart */}
          <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
            <div className="px-5 py-4 border-b border-[#e3e3e3]">
              <h3 className="text-sm font-bold text-[#1a1c1d]">Phân bổ bệnh nhân theo nhóm</h3>
            </div>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="h-[220px] w-[220px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={patientGroupData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {patientGroupData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#1a1c1d",
                          border: "none",
                          borderRadius: "10px",
                          fontSize: "12px",
                          color: "#fff",
                          padding: "8px 12px",
                        }}
                        formatter={(value: number, name: string) => [`${value} BN`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2.5 w-full">
                  {patientGroupData.map((group) => (
                    <div key={group.name} className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                      <span className="text-sm text-[#1a1c1d] flex-1">{group.name}</span>
                      <span className="text-sm font-bold tabular-nums text-[#1a1c1d]">{group.value}</span>
                      <span className="text-xs text-[#8c9196] w-12 text-right">{group.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patient Value Tiers */}
          <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
            <div className="px-5 py-4 border-b border-[#e3e3e3]">
              <h3 className="text-sm font-bold text-[#1a1c1d]">Phân tích giá trị bệnh nhân</h3>
            </div>
            <CardContent className="p-5 space-y-3">
              {tiers.map((tier) => {
                const Icon = tier.icon;
                const isExpanded = expandedTier === tier.name;
                return (
                  <div key={tier.name}>
                    <button
                      onClick={() => setExpandedTier(isExpanded ? null : tier.name)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-[#e3e3e3] hover:bg-[#f6f6f7] transition-colors text-left"
                      style={{ backgroundColor: isExpanded ? tier.bgColor : undefined }}
                    >
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: tier.bgColor }}
                      >
                        <Icon className="h-5 w-5" style={{ color: tier.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: tier.color }}>{tier.name}</span>
                          <span className="text-[11px] text-[#8c9196]">{tier.condition}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-[#4a4d50]">{tier.count} BN</span>
                          <span className="text-xs text-[#4a4d50]">{tier.revenuePercent}% tổng DT</span>
                          <span className="text-xs text-[#4a4d50]">TB: {formatCurrency(tier.avgRevenue)}</span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-[#8c9196] shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#8c9196] shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 border border-[#e3e3e3] rounded-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-[#f6f6f7] border-b border-[#e3e3e3]">
                              <th className="px-4 py-2 text-left font-bold text-[#4a4d50]">Tên</th>
                              <th className="px-3 py-2 text-left font-bold text-[#4a4d50]">SĐT</th>
                              <th className="px-3 py-2 text-left font-bold text-[#4a4d50]">Lần khám gần nhất</th>
                              <th className="px-4 py-2 text-right font-bold text-[#4a4d50]">Tổng chi tiêu</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tier.patients.map((p) => (
                              <tr key={p.name} className="border-b border-[#e3e3e3] last:border-0">
                                <td className="px-4 py-2.5 font-medium text-[#1a1c1d]">{p.name}</td>
                                <td className="px-3 py-2.5 text-[#4a4d50]">{p.phone}</td>
                                <td className="px-3 py-2.5 text-[#4a4d50]">{p.lastVisit}</td>
                                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-[#008060]">
                                  {formatCurrency(p.totalSpent)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Churn Risk */}
        <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e3e3e3] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#d72c0d]" />
            <h3 className="text-sm font-bold text-[#1a1c1d]">Bệnh nhân có nguy cơ mất</h3>
            <span className="text-[11px] text-[#8c9196] ml-1">VIP & Thường xuyên · Không quay lại quá 90 ngày</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e3e3e3] bg-[#f6f6f7]">
                  <th className="px-5 py-3 text-left font-bold text-[11px] text-[#4a4d50] uppercase tracking-wider">Bệnh nhân</th>
                  <th className="px-3 py-3 text-left font-bold text-[11px] text-[#4a4d50] uppercase tracking-wider">Tier</th>
                  <th className="px-3 py-3 text-left font-bold text-[11px] text-[#4a4d50] uppercase tracking-wider">Lần khám cuối</th>
                  <th className="px-3 py-3 text-right font-bold text-[11px] text-[#4a4d50] uppercase tracking-wider">Ngày chưa quay lại</th>
                </tr>
              </thead>
              <tbody>
                {churnRiskPatients.map((p) => (
                  <tr key={p.name} className="border-b border-[#e3e3e3] last:border-0 hover:bg-[#f6f6f7]">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-semibold text-[#1a1c1d]">{p.name}</p>
                        <p className="text-[11px] text-[#8c9196]">Tổng chi tiêu: {formatCurrency(p.totalSpent)}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                          p.tier === "VIP"
                            ? "bg-[#fef3c7] text-[#d97706]"
                            : "bg-[#e4f3d9] text-[#008060]"
                        }`}
                      >
                        {p.tier === "VIP" && <Crown className="h-3 w-3" />}
                        {p.tier}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-[#4a4d50]">{p.lastVisit}</td>
                    <td className="px-3 py-3.5 text-right">
                      <span className="text-sm font-bold text-[#d72c0d] tabular-nums">{p.daysInactive} ngày</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
