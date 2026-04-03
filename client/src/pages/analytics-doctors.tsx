import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Star,
  Users,
  Repeat,
  X,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
    revenue: 380000000,
    commission: 76000000,
    change: 15.2,
    returnRate: 42.5,
    avgRating: 4.8,
    monthlyRevenue: [
      { month: "T10", revenue: 52000000 },
      { month: "T11", revenue: 58000000 },
      { month: "T12", revenue: 55000000 },
      { month: "T1", revenue: 62000000 },
      { month: "T2", revenue: 68000000 },
      { month: "T3", revenue: 85000000 },
    ],
    commissionDetail: [
      { service: "Khám tổng quát", cases: 85, revenue: 170000000, rate: 20, commission: 34000000 },
      { service: "Siêu âm", cases: 32, revenue: 96000000, rate: 20, commission: 19200000 },
      { service: "Xét nghiệm máu", cases: 25, revenue: 75000000, rate: 20, commission: 15000000 },
      { service: "Tư vấn", cases: 20, revenue: 39000000, rate: 20, commission: 7800000 },
    ],
  },
  {
    id: 2,
    name: "BS. Trần Thị B",
    specialty: "Da liễu",
    patients: 98,
    revenue: 295000000,
    commission: 44250000,
    change: 8.7,
    returnRate: 56.3,
    avgRating: 4.6,
    monthlyRevenue: [
      { month: "T10", revenue: 42000000 },
      { month: "T11", revenue: 45000000 },
      { month: "T12", revenue: 48000000 },
      { month: "T1", revenue: 50000000 },
      { month: "T2", revenue: 52000000 },
      { month: "T3", revenue: 58000000 },
    ],
    commissionDetail: [
      { service: "Thẩm mỹ da", cases: 45, revenue: 135000000, rate: 15, commission: 20250000 },
      { service: "Khám da liễu", cases: 35, revenue: 87500000, rate: 15, commission: 13125000 },
      { service: "Laser trị nám", cases: 18, revenue: 72500000, rate: 15, commission: 10875000 },
    ],
  },
  {
    id: 3,
    name: "BS. Lê Văn C",
    specialty: "Ngoại",
    patients: 67,
    revenue: 245000000,
    commission: 73500000,
    change: -3.1,
    returnRate: 28.4,
    avgRating: 4.5,
    monthlyRevenue: [
      { month: "T10", revenue: 48000000 },
      { month: "T11", revenue: 45000000 },
      { month: "T12", revenue: 42000000 },
      { month: "T1", revenue: 40000000 },
      { month: "T2", revenue: 38000000 },
      { month: "T3", revenue: 32000000 },
    ],
    commissionDetail: [
      { service: "Nội soi", cases: 30, revenue: 120000000, rate: 30, commission: 36000000 },
      { service: "Tiểu phẫu", cases: 22, revenue: 88000000, rate: 30, commission: 26400000 },
      { service: "Tư vấn ngoại", cases: 15, revenue: 37000000, rate: 30, commission: 11100000 },
    ],
  },
  {
    id: 4,
    name: "BS. Phạm Thị D",
    specialty: "Sản phụ khoa",
    patients: 89,
    revenue: 210000000,
    commission: 42000000,
    change: 22.4,
    returnRate: 48.1,
    avgRating: 4.9,
    monthlyRevenue: [
      { month: "T10", revenue: 28000000 },
      { month: "T11", revenue: 30000000 },
      { month: "T12", revenue: 32000000 },
      { month: "T1", revenue: 36000000 },
      { month: "T2", revenue: 40000000 },
      { month: "T3", revenue: 44000000 },
    ],
    commissionDetail: [
      { service: "Khám thai", cases: 42, revenue: 84000000, rate: 20, commission: 16800000 },
      { service: "Siêu âm thai", cases: 30, revenue: 75000000, rate: 20, commission: 15000000 },
      { service: "Phụ khoa", cases: 17, revenue: 51000000, rate: 20, commission: 10200000 },
    ],
  },
  {
    id: 5,
    name: "BS. Hoàng Văn E",
    specialty: "Tai mũi họng",
    patients: 76,
    revenue: 115000000,
    commission: 23000000,
    change: 1.2,
    returnRate: 31.6,
    avgRating: 4.3,
    monthlyRevenue: [
      { month: "T10", revenue: 18000000 },
      { month: "T11", revenue: 19000000 },
      { month: "T12", revenue: 18500000 },
      { month: "T1", revenue: 19500000 },
      { month: "T2", revenue: 20000000 },
      { month: "T3", revenue: 20000000 },
    ],
    commissionDetail: [
      { service: "Khám TMH", cases: 45, revenue: 67500000, rate: 20, commission: 13500000 },
      { service: "Nội soi TMH", cases: 20, revenue: 30000000, rate: 20, commission: 6000000 },
      { service: "Thủ thuật nhỏ", cases: 11, revenue: 17500000, rate: 20, commission: 3500000 },
    ],
  },
];

const avgClinicReturnRate = 34.2;

type SortField = "name" | "patients" | "revenue" | "commission" | "change";
type SortDir = "asc" | "desc";

export default function AnalyticsDoctors() {
  const [dateRange, setDateRange] = useState("last_30_days");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = [...doctorsData].sort((a, b) => {
    let aVal: number | string = a[sortField];
    let bVal: number | string = b[sortField];
    if (typeof aVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
    }
    return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const compareDoctors = doctorsData.filter((d) => compareIds.includes(d.id));

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 text-[#c9cccf]" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-[#008060]" />
    ) : (
      <ChevronDown className="h-3 w-3 text-[#008060]" />
    );
  };

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader userName="Nguyễn Thị Mai" activePage="analytics-doctors" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold text-[#1a1c1d]">Hiệu suất bác sĩ</h1>
            <p className="text-xs text-[#8c9196] mt-0.5">
              Doanh thu, hoa hồng và hiệu suất từng bác sĩ
            </p>
          </div>
          <div className="flex items-center gap-3">
            {compareIds.length >= 2 && (
              <button
                onClick={() => setShowCompare(true)}
                className="h-9 px-4 rounded-lg bg-[#008060] text-white text-sm font-bold hover:bg-[#006e52] transition-colors"
              >
                So sánh ({compareIds.length})
              </button>
            )}
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        {/* Doctor Table */}
        <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e3e3e3]">
            <h3 className="text-sm font-bold text-[#1a1c1d]">Bảng tổng hợp bác sĩ</h3>
            <p className="text-[11px] text-[#8c9196] mt-0.5">Click vào hàng để xem chi tiết · Tick chọn 2-3 bác sĩ để so sánh</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-[#e3e3e3] bg-[#f6f6f7]">
                  <th className="px-5 py-3 text-left w-10">
                    <span className="sr-only">Chọn</span>
                  </th>
                  <th
                    className="px-3 py-3 text-left font-bold text-[11px] text-[#4a4d50] uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                    onClick={() => toggleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Bác sĩ <SortIcon field="name" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-[11px] text-[#4a4d50] uppercase tracking-wider whitespace-nowrap">
                    Chuyên khoa
                  </th>
                  <th
                    className="px-3 py-3 text-right font-bold text-[11px] text-[#4a4d50] uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                    onClick={() => toggleSort("patients")}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Số BN <SortIcon field="patients" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-right font-bold text-[11px] text-[#4a4d50] uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                    onClick={() => toggleSort("revenue")}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Doanh thu <SortIcon field="revenue" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-right font-bold text-[11px] text-[#4a4d50] uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                    onClick={() => toggleSort("commission")}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Hoa hồng <SortIcon field="commission" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-right font-bold text-[11px] text-[#4a4d50] uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                    onClick={() => toggleSort("change")}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      % thay đổi <SortIcon field="change" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((doc) => {
                  const isExpanded = expandedId === doc.id;
                  const isNegative = doc.change < 0;
                  return (
                    <>
                      <tr
                        key={doc.id}
                        className={`border-b border-[#e3e3e3] transition-colors cursor-pointer ${
                          isNegative ? "bg-[#fff5f5]" : "hover:bg-[#f6f6f7]"
                        } ${isExpanded ? "bg-[#f0fdf4]" : ""}`}
                        onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                      >
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={compareIds.includes(doc.id)}
                            onChange={() => toggleCompare(doc.id)}
                            className="h-4 w-4 rounded border-[#d2d5d8] text-[#008060] focus:ring-[#008060] cursor-pointer"
                            disabled={!compareIds.includes(doc.id) && compareIds.length >= 3}
                          />
                        </td>
                        <td className="px-3 py-3.5 font-semibold text-[#1a1c1d] whitespace-nowrap">{doc.name}</td>
                        <td className="px-3 py-3.5 text-[#4a4d50] whitespace-nowrap">{doc.specialty}</td>
                        <td className="px-3 py-3.5 text-right tabular-nums font-medium whitespace-nowrap">{doc.patients}</td>
                        <td className="px-3 py-3.5 text-right tabular-nums font-medium whitespace-nowrap">{formatCurrency(doc.revenue)}</td>
                        <td className="px-3 py-3.5 text-right tabular-nums font-medium whitespace-nowrap">{formatCurrency(doc.commission)}</td>
                        <td className="px-3 py-3.5 text-right">
                          <span
                            className={`inline-flex items-center gap-0.5 text-xs font-bold ${
                              isNegative ? "text-[#d72c0d]" : "text-[#008060]"
                            }`}
                          >
                            {isNegative ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            {isNegative ? "" : "+"}
                            {doc.change.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`detail-${doc.id}`}>
                          <td colSpan={7} className="p-0">
                            <div className="bg-[#f6f6f7] border-b border-[#e3e3e3] p-5 space-y-5 animate-in slide-in-from-top-2 duration-200">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {/* 6-month bar chart */}
                                <div className="bg-white rounded-xl border border-[#e3e3e3] p-4">
                                  <h4 className="text-xs font-bold text-[#4a4d50] uppercase tracking-wider mb-3">
                                    Doanh thu 6 tháng gần nhất
                                  </h4>
                                  <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={doc.monthlyRevenue}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e3e3e3" vertical={false} />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8c9196" }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={formatShort} tick={{ fontSize: 11, fill: "#8c9196" }} axisLine={false} tickLine={false} width={45} />
                                        <Tooltip
                                          contentStyle={{
                                            background: "#1a1c1d",
                                            border: "none",
                                            borderRadius: "10px",
                                            fontSize: "12px",
                                            color: "#fff",
                                            padding: "8px 12px",
                                          }}
                                          formatter={(value: number) => [formatCurrency(value), "Doanh thu"]}
                                        />
                                        <Bar dataKey="revenue" fill="#008060" radius={[6, 6, 0, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>

                                {/* Stats panel */}
                                <div className="space-y-4">
                                  {/* Return rate & rating */}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white rounded-xl border border-[#e3e3e3] p-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Repeat className="h-4 w-4 text-[#008060]" />
                                        <span className="text-[11px] font-bold text-[#4a4d50] uppercase tracking-wider">
                                          Tỷ lệ BN quay lại
                                        </span>
                                      </div>
                                      <p className="text-2xl font-bold text-[#1a1c1d] tabular-nums">{doc.returnRate}%</p>
                                      <p className="text-[11px] text-[#8c9196] mt-1">
                                        TB phòng khám: {avgClinicReturnRate}%
                                        <span
                                          className={`ml-1 font-bold ${
                                            doc.returnRate >= avgClinicReturnRate ? "text-[#008060]" : "text-[#d72c0d]"
                                          }`}
                                        >
                                          ({doc.returnRate >= avgClinicReturnRate ? "+" : ""}
                                          {(doc.returnRate - avgClinicReturnRate).toFixed(1)}%)
                                        </span>
                                      </p>
                                    </div>
                                    <div className="bg-white rounded-xl border border-[#e3e3e3] p-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Star className="h-4 w-4 text-[#d97706]" />
                                        <span className="text-[11px] font-bold text-[#4a4d50] uppercase tracking-wider">
                                          Đánh giá hài lòng
                                        </span>
                                      </div>
                                      <div className="flex items-baseline gap-1">
                                        <p className="text-2xl font-bold text-[#1a1c1d] tabular-nums">{doc.avgRating}</p>
                                        <span className="text-sm text-[#8c9196]">/ 5</span>
                                      </div>
                                      <div className="flex items-center gap-0.5 mt-1.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <Star
                                            key={star}
                                            className={`h-3.5 w-3.5 ${
                                              star <= Math.round(doc.avgRating) ? "text-[#d97706] fill-[#d97706]" : "text-[#e3e3e3]"
                                            }`}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Commission detail table */}
                                  <div className="bg-white rounded-xl border border-[#e3e3e3] overflow-hidden">
                                    <div className="px-4 py-3 border-b border-[#e3e3e3]">
                                      <h4 className="text-xs font-bold text-[#4a4d50] uppercase tracking-wider">
                                        Chi tiết hoa hồng
                                      </h4>
                                    </div>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-[#e3e3e3] bg-[#f6f6f7]">
                                          <th className="px-4 py-2 text-left font-bold text-[#4a4d50]">Dịch vụ</th>
                                          <th className="px-3 py-2 text-right font-bold text-[#4a4d50]">Số ca</th>
                                          <th className="px-3 py-2 text-right font-bold text-[#4a4d50]">Doanh thu</th>
                                          <th className="px-3 py-2 text-right font-bold text-[#4a4d50]">% HH</th>
                                          <th className="px-4 py-2 text-right font-bold text-[#4a4d50]">Hoa hồng</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {doc.commissionDetail.map((item) => (
                                          <tr key={item.service} className="border-b border-[#e3e3e3] last:border-0">
                                            <td className="px-4 py-2.5 font-medium text-[#1a1c1d]">{item.service}</td>
                                            <td className="px-3 py-2.5 text-right tabular-nums">{item.cases}</td>
                                            <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(item.revenue)}</td>
                                            <td className="px-3 py-2.5 text-right tabular-nums">{item.rate}%</td>
                                            <td className="px-4 py-2.5 text-right tabular-nums font-bold text-[#008060]">
                                              {formatCurrency(item.commission)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Compare Modal */}
        {showCompare && compareDoctors.length >= 2 && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCompare(false)}>
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-[#e3e3e3] flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
                <h3 className="text-base font-bold text-[#1a1c1d]">So sánh bác sĩ</h3>
                <button
                  onClick={() => setShowCompare(false)}
                  className="h-8 w-8 rounded-lg hover:bg-[#f6f6f7] flex items-center justify-center text-[#8c9196]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e3e3e3]">
                        <th className="px-4 py-3 text-left font-bold text-[11px] text-[#4a4d50] uppercase tracking-wider w-40">
                          Chỉ số
                        </th>
                        {compareDoctors.map((doc) => (
                          <th key={doc.id} className="px-4 py-3 text-center font-bold text-sm text-[#1a1c1d]">
                            <div>{doc.name}</div>
                            <div className="text-[11px] text-[#8c9196] font-normal mt-0.5">{doc.specialty}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[#e3e3e3]">
                        <td className="px-4 py-3 font-medium text-[#4a4d50]">Số bệnh nhân</td>
                        {compareDoctors.map((doc) => (
                          <td key={doc.id} className="px-4 py-3 text-center font-bold tabular-nums">{doc.patients}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-[#e3e3e3]">
                        <td className="px-4 py-3 font-medium text-[#4a4d50]">Doanh thu</td>
                        {compareDoctors.map((doc) => (
                          <td key={doc.id} className="px-4 py-3 text-center font-bold tabular-nums">{formatCurrency(doc.revenue)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-[#e3e3e3]">
                        <td className="px-4 py-3 font-medium text-[#4a4d50]">Hoa hồng</td>
                        {compareDoctors.map((doc) => (
                          <td key={doc.id} className="px-4 py-3 text-center font-bold tabular-nums text-[#008060]">
                            {formatCurrency(doc.commission)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-[#e3e3e3]">
                        <td className="px-4 py-3 font-medium text-[#4a4d50]">% thay đổi DT</td>
                        {compareDoctors.map((doc) => (
                          <td key={doc.id} className="px-4 py-3 text-center">
                            <span className={`font-bold ${doc.change >= 0 ? "text-[#008060]" : "text-[#d72c0d]"}`}>
                              {doc.change >= 0 ? "+" : ""}
                              {doc.change.toFixed(1)}%
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-[#e3e3e3]">
                        <td className="px-4 py-3 font-medium text-[#4a4d50]">Tỷ lệ BN quay lại</td>
                        {compareDoctors.map((doc) => (
                          <td key={doc.id} className="px-4 py-3 text-center font-bold tabular-nums">{doc.returnRate}%</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-[#4a4d50]">Đánh giá</td>
                        {compareDoctors.map((doc) => (
                          <td key={doc.id} className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Star className="h-4 w-4 text-[#d97706] fill-[#d97706]" />
                              <span className="font-bold">{doc.avgRating}</span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bar comparison chart */}
                <div className="mt-6">
                  <h4 className="text-xs font-bold text-[#4a4d50] uppercase tracking-wider mb-3">
                    So sánh doanh thu (VNĐ)
                  </h4>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          ...compareDoctors.map((doc) => ({
                            name: doc.name.replace("BS. ", ""),
                            "Doanh thu": doc.revenue,
                            "Hoa hồng": doc.commission,
                          })),
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e3e3e3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8c9196" }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={formatShort} tick={{ fontSize: 11, fill: "#8c9196" }} axisLine={false} tickLine={false} width={45} />
                        <Tooltip
                          contentStyle={{
                            background: "#1a1c1d",
                            border: "none",
                            borderRadius: "10px",
                            fontSize: "12px",
                            color: "#fff",
                            padding: "8px 12px",
                          }}
                          formatter={(value: number) => [formatCurrency(value)]}
                        />
                        <Bar dataKey="Doanh thu" fill="#008060" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Hoa hồng" fill="#34d399" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
