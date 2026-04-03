import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Gift,
  ChevronRight,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app-header";
import { Breadcrumb } from "@/components/breadcrumb";
import DateRangeFilter from "@/components/date-range-filter";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatShort = (amount: number) => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(0)}tr`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k`;
  return amount.toString();
};

interface KpiMilestone {
  label: string;
  target: number;
  bonus: number;
  reached: boolean;
}

export default function IncomePage() {
  const [dateRange, setDateRange] = useState("this_month");
  const { data: incomeData, isLoading, isError } = useQuery<{
    user: {
      id: number;
      name: string;
      role: string;
      department: string;
      targetRevenue: number;
      currentRevenue: number;
      commissionRate: number;
    };
    transactions: {
      id: number;
      code: string;
      serviceName: string;
      patientName: string;
      date: string;
      value: number;
      commission: number;
      status: string;
    }[];
    summary: {
      estimatedCommission: number;
      actualCommission: number;
      pendingCommission: number;
      totalRevenue: number;
      totalDeals: number;
      completedDeals: number;
    };
    kpiMilestones: KpiMilestone[];
  }>({
    queryKey: ["/api/income"],
  });

  if (isLoading || !incomeData) {
    return (
      <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-[#008060] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-[#4a4d50]">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-500 font-bold" data-testid="text-error">Không thể tải dữ liệu thu nhập</p>
          <p className="text-xs text-[#8c9196] mt-1">Vui lòng thử lại sau</p>
        </div>
      </div>
    );
  }

  const { user, transactions, summary, kpiMilestones } = incomeData;
  const progressPercent = Math.min((user.currentRevenue / user.targetRevenue) * 100, 100);

  const currentMilestoneIndex = kpiMilestones.findIndex(m => !m.reached);
  const nextMilestone = currentMilestoneIndex >= 0 ? kpiMilestones[currentMilestoneIndex] : null;

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader userName={user.name} activePage="commission" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[{ label: "Hoa hồng" }]} />
        <div className="flex items-center gap-3">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#1a1c1d]">Thu nhập chi tiết</h1>
            <p className="text-xs text-[#8c9196] mt-0.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Tháng 02/2026 · {user.name}
            </p>
          </div>
          <Badge className="bg-[#008060] text-white border-0 text-xs font-bold px-3 py-1">
            {user.role}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-primary-teal text-white overflow-hidden relative rounded-2xl">
            <CardContent className="p-6 relative z-10">
              <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider">Hoa hồng tạm tính</p>
              <h2 className="text-3xl font-bold tracking-tight tabular-nums mt-2" data-testid="text-estimated-commission">
                {formatCurrency(summary.estimatedCommission)}
              </h2>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-white/70" />
                <span className="text-xs text-white/70">{summary.totalDeals} giao dịch trong tháng</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
            <CardContent className="p-6">
              <p className="text-[11px] font-bold text-[#8c9196] uppercase tracking-wider">Hoa hồng thực nhận</p>
              <h2 className="text-3xl font-bold tracking-tight tabular-nums mt-2 text-[#1a1c1d]" data-testid="text-actual-commission">
                {formatCurrency(summary.actualCommission)}
              </h2>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="h-3 w-3 text-[#008060]" />
                <span className="text-xs text-[#008060] font-medium">{summary.completedDeals} đã hoàn tất</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
            <CardContent className="p-6">
              <p className="text-[11px] font-bold text-[#8c9196] uppercase tracking-wider">Hoa hồng chờ duyệt</p>
              <h2 className="text-3xl font-bold tracking-tight tabular-nums mt-2 text-[#f59e0b]" data-testid="text-pending-commission">
                {formatCurrency(summary.pendingCommission)}
              </h2>
              <div className="flex items-center gap-1 mt-2">
                <TrendingDown className="h-3 w-3 text-[#8c9196]" />
                <span className="text-xs text-[#8c9196]">{summary.totalDeals - summary.completedDeals} đang chờ xử lý</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-[#d2d5d8] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#1a1c1d] flex items-center gap-2">
                <Target className="h-4 w-4 text-[#008060]" />
                KPI tháng 02/2026
              </h3>
              <p className="text-xs text-[#8c9196] mt-0.5">
                Doanh số: {formatCurrency(user.currentRevenue)} / {formatCurrency(user.targetRevenue)}
              </p>
            </div>
            <span className="text-2xl font-bold text-[#008060]">{Math.round(progressPercent)}%</span>
          </div>
          <CardContent className="p-6 space-y-5">
            <div className="relative">
              <Progress value={progressPercent} className="h-3 bg-[#e4e5e7] [&>div]:bg-[#008060] rounded-full" />

              <div className="relative mt-1 h-8">
                {kpiMilestones.map((milestone, i) => {
                  const position = (milestone.target / user.targetRevenue) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 flex flex-col items-center"
                      style={{ left: `${Math.min(position, 98)}%`, transform: "translateX(-50%)" }}
                    >
                      <div className={`w-0.5 h-3 ${milestone.reached ? "bg-[#008060]" : "bg-[#d2d5d8]"}`} />
                      <span className={`text-[9px] font-bold mt-0.5 whitespace-nowrap ${milestone.reached ? "text-[#008060]" : "text-[#8c9196]"}`}>
                        {formatShort(milestone.target)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {kpiMilestones.map((milestone, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border transition-all ${
                    milestone.reached
                      ? "bg-[#e6f5ec] border-[#008060]/30"
                      : nextMilestone === milestone
                      ? "bg-[#fffbeb] border-[#f59e0b]/30"
                      : "bg-[#f6f6f7] border-[#e4e5e7]"
                  }`}
                  data-testid={`kpi-milestone-${i}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      milestone.reached ? "text-[#008060]" : nextMilestone === milestone ? "text-[#f59e0b]" : "text-[#8c9196]"
                    }`}>
                      {milestone.label}
                    </span>
                    {milestone.reached ? (
                      <Badge className="bg-[#008060] text-white border-0 text-[9px] px-1.5 py-0">Đạt</Badge>
                    ) : nextMilestone === milestone ? (
                      <Badge className="bg-[#f59e0b] text-white border-0 text-[9px] px-1.5 py-0">Tiếp theo</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm font-bold text-[#1a1c1d]">{formatCurrency(milestone.target)}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Gift className="h-3 w-3 text-[#8c9196]" />
                    <span className="text-xs text-[#4a4d50]">Thưởng: <strong className="text-[#008060]">{formatCurrency(milestone.bonus)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#d2d5d8] shadow-sm rounded-xl overflow-hidden bg-white">
          <div className="px-6 py-4 border-b border-[#d2d5d8] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1a1c1d]">Chi tiết giao dịch trong tháng</h3>
            <span className="text-xs text-[#8c9196] font-medium">{transactions.length} giao dịch</span>
          </div>
          <Table>
            <TableHeader className="bg-[#f6f6f7]">
              <TableRow className="hover:bg-transparent border-b-[#d2d5d8]">
                <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Mã GD</TableHead>
                <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Dịch vụ</TableHead>
                <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Ngày</TableHead>
                <TableHead className="text-right text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Giá trị</TableHead>
                <TableHead className="text-right text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Hoa hồng</TableHead>
                <TableHead className="text-center text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} className="border-b-[#d2d5d8] hover:bg-[#f6f6f7]" data-testid={`row-tx-${tx.id}`}>
                  <TableCell className="px-6 py-4 text-xs font-mono font-bold text-[#8c9196]">{tx.code}</TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="text-sm font-bold text-[#1a1c1d]">{tx.serviceName}</div>
                    <div className="text-xs text-[#8c9196] mt-0.5">{tx.patientName}</div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-[#4a4d50]">{tx.date}</TableCell>
                  <TableCell className="text-right px-6 py-4 text-sm font-bold text-[#1a1c1d] tabular-nums">
                    {formatCurrency(tx.value)}
                  </TableCell>
                  <TableCell className="text-right px-6 py-4 text-sm font-bold text-[#008060] tabular-nums">
                    +{formatCurrency(tx.commission)}
                  </TableCell>
                  <TableCell className="text-center px-6 py-4">
                    <Badge className={`rounded-md text-[10px] font-bold border-0 px-2 py-0.5 ${
                      tx.status === 'Hoàn tất' ? 'bg-[#bbe5b3] text-[#008060]' : 'bg-[#fff4bd] text-[#8a6116]'
                    }`}>
                      {tx.status === 'Hoàn tất' ? 'Đã nhận' : 'Chờ duyệt'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}
