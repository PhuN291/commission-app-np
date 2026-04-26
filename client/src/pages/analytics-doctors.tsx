import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowUpDown,
  ChevronDown,
  Repeat,
  Star,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Badge,
  Card,
  Chips,
  DetailHeader,
  NPButton,
  PageHeader,
  Screen,
  SectionTitle,
  useTabNav,
  type ChipItem,
} from "@/components/np";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import DateRangeFilter from "@/components/date-range-filter";
import { cn } from "@/lib/utils";

const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

function fmtShort(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + "tr";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  patients: number;
  revenue: number;
  commission: number;
  change: number;
  returnRate: number;
  avgRating: number;
  monthlyRevenue: { month: string; revenue: number }[];
  commissionDetail: {
    service: string;
    cases: number;
    revenue: number;
    rate: number;
    commission: number;
  }[];
}

const doctorsData: Doctor[] = [
  {
    id: 1,
    name: "BS. Nguyễn Văn A",
    specialty: "Nội tổng quát",
    patients: 142,
    revenue: 380_000_000,
    commission: 76_000_000,
    change: 15.2,
    returnRate: 42.5,
    avgRating: 4.8,
    monthlyRevenue: [
      { month: "T10", revenue: 52_000_000 },
      { month: "T11", revenue: 58_000_000 },
      { month: "T12", revenue: 55_000_000 },
      { month: "T1", revenue: 62_000_000 },
      { month: "T2", revenue: 68_000_000 },
      { month: "T3", revenue: 85_000_000 },
    ],
    commissionDetail: [
      { service: "Khám tổng quát", cases: 85, revenue: 170_000_000, rate: 20, commission: 34_000_000 },
      { service: "Siêu âm", cases: 32, revenue: 96_000_000, rate: 20, commission: 19_200_000 },
      { service: "Xét nghiệm máu", cases: 25, revenue: 75_000_000, rate: 20, commission: 15_000_000 },
      { service: "Tư vấn", cases: 20, revenue: 39_000_000, rate: 20, commission: 7_800_000 },
    ],
  },
  {
    id: 2,
    name: "BS. Trần Thị B",
    specialty: "Da liễu",
    patients: 98,
    revenue: 295_000_000,
    commission: 44_250_000,
    change: 8.7,
    returnRate: 56.3,
    avgRating: 4.6,
    monthlyRevenue: [
      { month: "T10", revenue: 42_000_000 },
      { month: "T11", revenue: 45_000_000 },
      { month: "T12", revenue: 48_000_000 },
      { month: "T1", revenue: 50_000_000 },
      { month: "T2", revenue: 52_000_000 },
      { month: "T3", revenue: 58_000_000 },
    ],
    commissionDetail: [
      { service: "Thẩm mỹ da", cases: 45, revenue: 135_000_000, rate: 15, commission: 20_250_000 },
      { service: "Khám da liễu", cases: 35, revenue: 87_500_000, rate: 15, commission: 13_125_000 },
      { service: "Laser trị nám", cases: 18, revenue: 72_500_000, rate: 15, commission: 10_875_000 },
    ],
  },
  {
    id: 3,
    name: "BS. Lê Văn C",
    specialty: "Ngoại",
    patients: 67,
    revenue: 245_000_000,
    commission: 73_500_000,
    change: -3.1,
    returnRate: 28.4,
    avgRating: 4.5,
    monthlyRevenue: [
      { month: "T10", revenue: 48_000_000 },
      { month: "T11", revenue: 45_000_000 },
      { month: "T12", revenue: 42_000_000 },
      { month: "T1", revenue: 40_000_000 },
      { month: "T2", revenue: 38_000_000 },
      { month: "T3", revenue: 32_000_000 },
    ],
    commissionDetail: [
      { service: "Nội soi", cases: 30, revenue: 120_000_000, rate: 30, commission: 36_000_000 },
      { service: "Tiểu phẫu", cases: 22, revenue: 88_000_000, rate: 30, commission: 26_400_000 },
      { service: "Tư vấn ngoại", cases: 15, revenue: 37_000_000, rate: 30, commission: 11_100_000 },
    ],
  },
  {
    id: 4,
    name: "BS. Phạm Thị D",
    specialty: "Sản phụ khoa",
    patients: 89,
    revenue: 210_000_000,
    commission: 42_000_000,
    change: 22.4,
    returnRate: 48.1,
    avgRating: 4.9,
    monthlyRevenue: [
      { month: "T10", revenue: 28_000_000 },
      { month: "T11", revenue: 30_000_000 },
      { month: "T12", revenue: 32_000_000 },
      { month: "T1", revenue: 36_000_000 },
      { month: "T2", revenue: 40_000_000 },
      { month: "T3", revenue: 44_000_000 },
    ],
    commissionDetail: [
      { service: "Khám thai", cases: 42, revenue: 84_000_000, rate: 20, commission: 16_800_000 },
      { service: "Siêu âm thai", cases: 30, revenue: 75_000_000, rate: 20, commission: 15_000_000 },
      { service: "Phụ khoa", cases: 17, revenue: 51_000_000, rate: 20, commission: 10_200_000 },
    ],
  },
  {
    id: 5,
    name: "BS. Hoàng Văn E",
    specialty: "Tai mũi họng",
    patients: 76,
    revenue: 115_000_000,
    commission: 23_000_000,
    change: 1.2,
    returnRate: 31.6,
    avgRating: 4.3,
    monthlyRevenue: [
      { month: "T10", revenue: 18_000_000 },
      { month: "T11", revenue: 19_000_000 },
      { month: "T12", revenue: 18_500_000 },
      { month: "T1", revenue: 19_500_000 },
      { month: "T2", revenue: 20_000_000 },
      { month: "T3", revenue: 20_000_000 },
    ],
    commissionDetail: [
      { service: "Khám TMH", cases: 45, revenue: 67_500_000, rate: 20, commission: 13_500_000 },
      { service: "Nội soi TMH", cases: 20, revenue: 30_000_000, rate: 20, commission: 6_000_000 },
      { service: "Thủ thuật nhỏ", cases: 11, revenue: 17_500_000, rate: 20, commission: 3_500_000 },
    ],
  },
];

const AVG_CLINIC_RETURN = 34.2;

type SortKey = "revenue" | "commission" | "patients" | "change";

const SORT_CHIPS: ChipItem[] = [
  { key: "revenue", label: "Doanh thu" },
  { key: "commission", label: "Hoa hồng" },
  { key: "patients", label: "Số BN" },
  { key: "change", label: "% thay đổi" },
];

export default function AnalyticsDoctors() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const [dateRange, setDateRange] = useState("last_30_days");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const sorted = [...doctorsData].sort((a, b) => b[sortKey] - a[sortKey]);
  const compareDoctors = doctorsData.filter((d) => compareIds.includes(d.id));

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Hiệu suất bác sĩ" onBack={() => navigate("/")} />

      <div className="bg-np-surface-sub pb-5">
        <PageHeader
          title="Hiệu suất bác sĩ"
          subtitle="Doanh thu, hoa hồng và hiệu suất"
          action={<DateRangeFilter value={dateRange} onChange={setDateRange} />}
        />

        {/* Sort chips */}
        <div className="flex items-center gap-2 px-4 pb-1">
          <ArrowUpDown size={14} className="flex-shrink-0 text-np-text-muted" />
          <span className="flex-shrink-0 text-[12px] font-medium text-np-text-muted">Sắp xếp:</span>
        </div>
        <Chips items={SORT_CHIPS} active={sortKey} onChange={(k) => setSortKey(k as SortKey)} />

        {/* Doctor list */}
        <Card className="overflow-hidden p-0">
          {sorted.map((doc, i) => {
            const isExpanded = expandedId === doc.id;
            const isNegative = doc.change < 0;
            const isSelected = compareIds.includes(doc.id);
            return (
              <div
                key={doc.id}
                className={cn(
                  i === sorted.length - 1 ? "" : "border-b border-np-surface-pressed",
                  isExpanded && "bg-np-brand-soft/40",
                )}
              >
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCompare(doc.id)}
                    disabled={!isSelected && compareIds.length >= 3}
                    className="mt-1 h-4 w-4 flex-shrink-0 accent-np-brand-ink"
                  />
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-bold text-np-ink">
                          {doc.name}
                        </span>
                        <Badge tone="neutral">{doc.specialty}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px]">
                        <span className="text-np-text-muted">
                          <span className="font-medium text-np-ink tabular-nums">
                            {doc.patients}
                          </span>{" "}
                          BN
                        </span>
                        <span className="font-bold text-np-ink tabular-nums">
                          {fmtShort(doc.revenue)}đ
                        </span>
                        <span className="font-semibold text-np-brand-ink tabular-nums">
                          HH {fmtShort(doc.commission)}đ
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 text-[12px] font-bold",
                          isNegative ? "text-np-danger" : "text-np-brand-ink",
                        )}
                      >
                        {isNegative ? (
                          <ArrowDownRight size={12} strokeWidth={2.5} />
                        ) : (
                          <ArrowUpRight size={12} strokeWidth={2.5} />
                        )}
                        {isNegative ? "" : "+"}
                        {doc.change.toFixed(1)}%
                      </span>
                      <ChevronDown
                        size={14}
                        className={cn(
                          "text-np-text-muted transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </div>
                  </button>
                </div>

                {isExpanded && (
                  <div className="space-y-3 px-4 pb-4">
                    {/* Chart */}
                    <div className="rounded-lg bg-white p-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
                        Doanh thu 6 tháng
                      </p>
                      <div className="h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={doc.monthlyRevenue}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="var(--color-np-border)"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                              axisLine={false}
                              tickLine={false}
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
                                padding: "6px 10px",
                              }}
                              formatter={(value: number) => [fmtVND(value), "Doanh thu"]}
                            />
                            <Bar
                              dataKey="revenue"
                              fill="var(--color-np-brand-ink)"
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-white p-3">
                        <div className="mb-1 flex items-center gap-1.5">
                          <Repeat size={13} className="text-np-brand-ink" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.4px] text-np-text-muted">
                            BN quay lại
                          </span>
                        </div>
                        <p className="text-[20px] font-extrabold text-np-ink tabular-nums">
                          {doc.returnRate}%
                        </p>
                        <p className="mt-0.5 text-[10px] text-np-text-muted">
                          TB {AVG_CLINIC_RETURN}%{" "}
                          <span
                            className={cn(
                              "font-bold",
                              doc.returnRate >= AVG_CLINIC_RETURN
                                ? "text-np-brand-ink"
                                : "text-np-danger",
                            )}
                          >
                            ({doc.returnRate >= AVG_CLINIC_RETURN ? "+" : ""}
                            {(doc.returnRate - AVG_CLINIC_RETURN).toFixed(1)}%)
                          </span>
                        </p>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <div className="mb-1 flex items-center gap-1.5">
                          <Star size={13} className="text-[#D97706]" fill="#D97706" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.4px] text-np-text-muted">
                            Đánh giá
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-[20px] font-extrabold text-np-ink tabular-nums">
                            {doc.avgRating}
                          </p>
                          <span className="text-[12px] text-np-text-muted">/ 5</span>
                        </div>
                        <div className="mt-1 flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={11}
                              className={
                                s <= Math.round(doc.avgRating)
                                  ? "fill-[#D97706] text-[#D97706]"
                                  : "text-np-border"
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Commission detail */}
                    <div className="overflow-hidden rounded-lg bg-white">
                      <div className="border-b border-np-surface-pressed bg-np-surface-sub px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
                          Chi tiết hoa hồng
                        </p>
                      </div>
                      {doc.commissionDetail.map((item, idx) => (
                        <div
                          key={item.service}
                          className={cn(
                            "px-3 py-2.5",
                            idx === doc.commissionDetail.length - 1
                              ? ""
                              : "border-b border-np-surface-pressed",
                          )}
                        >
                          <div className="flex items-baseline justify-between">
                            <span className="text-[13px] font-medium text-np-ink">
                              {item.service}
                            </span>
                            <span className="text-[13px] font-bold text-np-brand-ink tabular-nums">
                              {fmtShort(item.commission)}đ
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-np-text-muted tabular-nums">
                            <span>{item.cases} ca</span>
                            <span>{fmtShort(item.revenue)}đ</span>
                            <span>{item.rate}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        <div className="h-5" />
      </div>

      {/* Compare fab */}
      {compareIds.length >= 2 && (
        <div className="absolute bottom-[80px] left-1/2 z-20 -translate-x-1/2">
          <NPButton tone="primary" onClick={() => setShowCompare(true)}>
            So sánh ({compareIds.length})
          </NPButton>
        </div>
      )}

      {/* Compare sheet */}
      <Sheet open={showCompare} onOpenChange={setShowCompare}>
        <SheetContent
          side="bottom"
          className="mx-auto flex h-[88dvh] max-w-[390px] flex-col gap-0 rounded-t-np-sheet border-0 bg-np-surface-sub p-0"
        >
          <SheetHeader className="border-b border-np-surface-pressed bg-white px-5 pb-3 pt-5 text-left">
            <SheetTitle className="text-[17px] font-bold text-np-ink">So sánh bác sĩ</SheetTitle>
          </SheetHeader>
          <div className="scrollbar-hide flex-1 overflow-y-auto p-4 pb-8">
            <Card className="overflow-hidden p-0">
              {[
                { label: "Số BN", get: (d: Doctor) => d.patients.toString() },
                { label: "Doanh thu", get: (d: Doctor) => `${fmtShort(d.revenue)}đ` },
                { label: "Hoa hồng", get: (d: Doctor) => `${fmtShort(d.commission)}đ`, accent: true },
                {
                  label: "% thay đổi",
                  get: (d: Doctor) => `${d.change >= 0 ? "+" : ""}${d.change.toFixed(1)}%`,
                  tone: (d: Doctor) => (d.change >= 0 ? "brand" : "danger"),
                },
                { label: "BN quay lại", get: (d: Doctor) => `${d.returnRate}%` },
                { label: "Đánh giá", get: (d: Doctor) => `${d.avgRating} ★` },
              ].map((row, idx, arr) => (
                <div
                  key={row.label}
                  className={
                    "grid grid-cols-[110px_1fr] gap-2 px-3 py-3 text-[12px]" +
                    (idx === arr.length - 1 ? "" : " border-b border-np-surface-pressed")
                  }
                >
                  <span className="font-medium text-np-text-muted">{row.label}</span>
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${compareDoctors.length}, 1fr)` }}
                  >
                    {compareDoctors.map((doc) => {
                      const value = row.get(doc);
                      const tone = row.tone ? row.tone(doc) : undefined;
                      return (
                        <div
                          key={doc.id}
                          className={cn(
                            "text-center font-bold tabular-nums",
                            row.accent && "text-np-brand-ink",
                            tone === "brand" && "text-np-brand-ink",
                            tone === "danger" && "text-np-danger",
                            !row.accent && !tone && "text-np-ink",
                          )}
                        >
                          {value}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </Card>

            <div className="mt-4 rounded-np-card bg-white p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
                So sánh doanh thu & hoa hồng
              </p>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={compareDoctors.map((doc) => ({
                      name: doc.name.replace("BS. ", ""),
                      "Doanh thu": doc.revenue,
                      "Hoa hồng": doc.commission,
                    }))}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-np-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                      axisLine={false}
                      tickLine={false}
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
                        padding: "6px 10px",
                      }}
                      formatter={(value: number) => [fmtVND(value)]}
                    />
                    <Bar
                      dataKey="Doanh thu"
                      fill="var(--color-np-brand-ink)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar dataKey="Hoa hồng" fill="#34D399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}
