import { useState } from "react";
import { useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ChevronDown,
  Crown,
  Repeat,
  User,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
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

const patientKPIs: {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
}[] = [
  { title: "Tổng BN", value: "2.341", icon: Users, description: "Không đếm trùng" },
  { title: "BN mới", value: "312", icon: UserPlus, description: "Lần đầu đến khám" },
  { title: "Tỷ lệ quay lại", value: "34,2%", icon: Repeat, description: "BN cũ quay lại" },
];

const patientGroupData = [
  { name: "Nội khoa", value: 845, percent: 36.1, color: "#1A8A7D" },
  { name: "Ngoại khoa", value: 412, percent: 17.6, color: "#22A594" },
  { name: "Thẩm mỹ / Da liễu", value: 389, percent: 16.6, color: "#34D399" },
  { name: "Sản phụ khoa", value: 356, percent: 15.2, color: "#6EE7B7" },
  { name: "Khác", value: 339, percent: 14.5, color: "#A7F3D0" },
];

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
  icon: LucideIcon;
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
    avgRevenue: 28_100_000,
    icon: Crown,
    color: "#D97706",
    bgColor: "#FEF3C7",
    patients: [
      { name: "Nguyễn Thị Lan", phone: "0901 xxx xxx", lastVisit: "08/03/2026", totalSpent: 45_200_000 },
      { name: "Trần Văn Hùng", phone: "0912 xxx xxx", lastVisit: "05/03/2026", totalSpent: 38_700_000 },
      { name: "Lê Thị Mai", phone: "0903 xxx xxx", lastVisit: "01/03/2026", totalSpent: 32_100_000 },
      { name: "Phạm Văn Đức", phone: "0934 xxx xxx", lastVisit: "28/02/2026", totalSpent: 28_900_000 },
      { name: "Hoàng Thị Nga", phone: "0965 xxx xxx", lastVisit: "25/02/2026", totalSpent: 25_600_000 },
    ],
  },
  {
    name: "Thường xuyên",
    condition: "Chi tiêu 2-10 triệu",
    count: 724,
    revenuePercent: 38,
    avgRevenue: 6_520_000,
    icon: User,
    color: "#008060",
    bgColor: "#E4F3D9",
    patients: [
      { name: "Võ Văn Thành", phone: "0908 xxx xxx", lastVisit: "09/03/2026", totalSpent: 8_500_000 },
      { name: "Đặng Thị Hoa", phone: "0917 xxx xxx", lastVisit: "07/03/2026", totalSpent: 7_200_000 },
      { name: "Bùi Văn Nam", phone: "0923 xxx xxx", lastVisit: "04/03/2026", totalSpent: 5_800_000 },
    ],
  },
  {
    name: "Vãng lai",
    condition: "Chi tiêu < 2 triệu",
    count: 1431,
    revenuePercent: 20,
    avgRevenue: 1_740_000,
    icon: UserMinus,
    color: "#8C9196",
    bgColor: "#F6F6F7",
    patients: [
      { name: "Ngô Văn Tín", phone: "0944 xxx xxx", lastVisit: "10/03/2026", totalSpent: 1_500_000 },
      { name: "Lý Thị Bình", phone: "0955 xxx xxx", lastVisit: "06/03/2026", totalSpent: 850_000 },
    ],
  },
];

const churnRiskPatients = [
  { name: "Phạm Văn Đức", tier: "VIP", lastVisit: "15/11/2025", daysInactive: 116, totalSpent: 28_900_000 },
  { name: "Hoàng Thị Nga", tier: "VIP", lastVisit: "28/11/2025", daysInactive: 103, totalSpent: 25_600_000 },
  { name: "Trần Minh Quân", tier: "VIP", lastVisit: "01/12/2025", daysInactive: 100, totalSpent: 22_300_000 },
  { name: "Võ Văn Thành", tier: "Thường xuyên", lastVisit: "20/11/2025", daysInactive: 111, totalSpent: 8_500_000 },
  { name: "Đặng Thị Hoa", tier: "Thường xuyên", lastVisit: "05/12/2025", daysInactive: 96, totalSpent: 7_200_000 },
  { name: "Nguyễn Thị Yến", tier: "Thường xuyên", lastVisit: "08/12/2025", daysInactive: 93, totalSpent: 6_100_000 },
];

export default function AnalyticsPatients() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const [dateRange, setDateRange] = useState("last_30_days");
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Phân tích bệnh nhân" onBack={() => navigate("/")} />

      <div className="bg-np-surface-sub pb-5">
        <PageHeader
          title="Bệnh nhân"
          subtitle="Số lượng, quay lại, phân nhóm"
          action={<DateRangeFilter value={dateRange} onChange={setDateRange} />}
        />

        {/* KPI */}
        <div className="grid grid-cols-3 gap-2 px-4">
          {patientKPIs.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.title} className="rounded-np-card bg-white p-3">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-np-brand-soft">
                  <Icon size={16} strokeWidth={2} className="text-np-brand-ink" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.4px] text-np-text-muted">
                  {kpi.title}
                </p>
                <p className="mt-0.5 text-[18px] font-extrabold text-np-ink tabular-nums">
                  {kpi.value}
                </p>
                <p className="mt-0.5 text-[10px] text-np-text-muted">{kpi.description}</p>
              </div>
            );
          })}
        </div>

        {/* Donut */}
        <SectionTitle>Phân bổ bệnh nhân theo nhóm</SectionTitle>
        <Card className="p-4">
          <div className="flex items-center justify-center">
            <div className="h-[180px] w-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={patientGroupData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
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
                      background: "var(--color-np-ink)",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "#fff",
                      padding: "6px 10px",
                    }}
                    formatter={(value: number, name: string) => [`${value} BN`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {patientGroupData.map((group) => (
              <div key={group.name} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <span className="flex-1 text-[13px] text-np-ink">{group.name}</span>
                <span className="text-[13px] font-bold text-np-ink tabular-nums">{group.value}</span>
                <span className="w-10 text-right text-[11px] text-np-text-muted">
                  {group.percent}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Tiers */}
        <SectionTitle>Phân tích giá trị bệnh nhân</SectionTitle>
        <div className="space-y-3 px-0">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const isExpanded = expandedTier === tier.name;
            return (
              <Card key={tier.name} className="overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() => setExpandedTier(isExpanded ? null : tier.name)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-np-surface-sub"
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: tier.bgColor }}
                  >
                    <Icon size={20} strokeWidth={2} style={{ color: tier.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold" style={{ color: tier.color }}>
                        {tier.name}
                      </span>
                      <span className="text-[11px] text-np-text-muted">{tier.condition}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-np-text-sub tabular-nums">
                      <span>{tier.count} BN</span>
                      <span>{tier.revenuePercent}% DT</span>
                      <span>TB {fmtShort(tier.avgRevenue)}đ</span>
                    </div>
                  </div>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "flex-shrink-0 text-np-text-muted transition-transform",
                      isExpanded && "rotate-180",
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="border-t border-np-surface-pressed">
                    {tier.patients.map((p, i) => (
                      <div
                        key={p.name}
                        className={
                          "px-4 py-3" +
                          (i === tier.patients.length - 1
                            ? ""
                            : " border-b border-np-surface-pressed")
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold text-np-ink">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-np-text-muted">{p.phone}</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-[13px] font-bold text-np-brand-ink tabular-nums">
                              {fmtShort(p.totalSpent)}đ
                            </p>
                            <p className="text-[10px] text-np-text-muted">{p.lastVisit}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Churn risk */}
        <SectionTitle>
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={14} strokeWidth={2.25} className="text-np-danger" />
            BN có nguy cơ mất
          </span>
        </SectionTitle>
        <Card className="overflow-hidden p-0">
          <div className="bg-np-surface-sub px-4 py-2 text-[11px] text-np-text-muted">
            VIP & Thường xuyên · không quay lại quá 90 ngày
          </div>
          {churnRiskPatients.map((p, i) => (
            <div
              key={p.name}
              className={
                "px-4 py-3" +
                (i === churnRiskPatients.length - 1 ? "" : " border-b border-np-surface-pressed")
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-semibold text-np-ink">
                      {p.name}
                    </span>
                    <Badge tone={p.tier === "VIP" ? "attention" : "success"}>{p.tier}</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-np-text-muted">
                    Khám cuối: {p.lastVisit} · {fmtVND(p.totalSpent)}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[14px] font-bold text-np-danger tabular-nums">
                    {p.daysInactive} ngày
                  </p>
                  <p className="text-[10px] text-np-text-muted">chưa quay lại</p>
                </div>
              </div>
            </div>
          ))}
        </Card>

        <div className="h-5" />
      </div>
    </Screen>
  );
}
