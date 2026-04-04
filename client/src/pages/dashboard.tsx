import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  TrendingUp,
  Briefcase,
  Trophy,
  Star,
  Crown,
  Award,
  Rocket,
  Flame,
  Gem,
  Heart,
  Gift,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppHeader from "@/components/app-header";
import DateRangeFilter from "@/components/date-range-filter";
import elementUrl from "@assets/element_(1)_1771761383161.png";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

function getRank(revenue: number) {
  if (revenue >= 100000000) return { name: "Kim cương", color: "text-[#60a5fa]", bg: "bg-[#dbeafe]", icon: Crown, next: null, nextAmount: 0 };
  if (revenue >= 50000000) return { name: "Vàng", color: "text-[#d97706]", bg: "bg-[#fef3c7]", icon: Trophy, next: "Kim cương", nextAmount: 100000000 };
  if (revenue >= 20000000) return { name: "Bạc", color: "text-[#6b7280]", bg: "bg-[#f3f4f6]", icon: Award, next: "Vàng", nextAmount: 50000000 };
  return { name: "Đồng", color: "text-[#b45309]", bg: "bg-[#fef3c7]", icon: Star, next: "Bạc", nextAmount: 20000000 };
}

const rankRewards: Record<string, { commission: number; bonus: number }> = {
  "Đồng": { commission: 3, bonus: 0 },
  "Bạc": { commission: 5, bonus: 300000 },
  "Vàng": { commission: 6, bonus: 500000 },
  "Kim cương": { commission: 8, bonus: 1000000 },
};

const mockBadges = [
  { name: "Đơn đầu tiên", icon: Rocket, achieved: true, color: "#008060", bg: "#e4f3d9", iconBg: "#00a67d" },
  { name: "5 đơn liên tiếp", icon: Flame, achieved: true, color: "#008060", bg: "#e4f3d9", iconBg: "#00a67d" },
  { name: "Top 1 tuần", icon: Crown, achieved: false, color: "#008060", bg: "#e4f3d9", iconBg: "#00a67d" },
  { name: "Doanh thu 50tr", icon: Gem, achieved: false, color: "#008060", bg: "#e4f3d9", iconBg: "#00a67d" },
  { name: "Khách VIP", icon: Heart, achieved: true, color: "#008060", bg: "#e4f3d9", iconBg: "#00a67d" },
];

export default function Dashboard() {
  const [dateRange, setDateRange] = useState("last_30_days");
  const { data: dashboardData, isLoading } = useQuery<{
    user: { id: number; name: string; role: string; department: string; avatar: string | null; targetRevenue: number; currentRevenue: number; commissionRate: number };
    recentOrders: { id: number; code: string; serviceName: string; serviceCode: string; patientName: string; totalPrice: number; commission: number; status: string; createdAt: string }[];
    pendingOrdersCount: number;
  }>({
    queryKey: ["/api/dashboard"],
  });

  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-[#008060] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-[#4a4d50]">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const { user, recentOrders, pendingOrdersCount } = dashboardData;

  const currentCommission = user.currentRevenue * (user.commissionRate / 100);

  const rank = getRank(user.currentRevenue);
  const RankIcon = rank.icon;
  const rankProgress = rank.next
    ? ((user.currentRevenue - (rank.nextAmount === 50000000 ? 20000000 : rank.nextAmount === 100000000 ? 50000000 : 0)) / (rank.nextAmount - (rank.nextAmount === 50000000 ? 20000000 : rank.nextAmount === 100000000 ? 50000000 : 0))) * 100
    : 100;
  const remaining = rank.next ? rank.nextAmount - user.currentRevenue : 0;

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader userName={user.name} activePage="dashboard" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <div className="flex items-center gap-3">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        <Link href="/orders?status=pending" className="block">
          <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white hover:bg-[#f6f6f7] transition-colors cursor-pointer">
            <CardContent className="p-4 sm:p-5 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-[#fff4bd] flex items-center justify-center shrink-0">
                <ClipboardList className="h-5 w-5 text-[#8a6116]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1a1c1d]">
                  Bạn có <span className="text-[#005bd3]">{pendingOrdersCount}</span> đơn hàng đang chờ xử lý
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-[#8c9196] shrink-0" />
            </CardContent>
          </Card>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <Card className="border-0 shadow-lg col-span-1 md:col-span-2 lg:col-span-2 bg-gradient-primary-teal text-white overflow-hidden relative rounded-2xl">
            <div className="absolute right-0 top-0 -mr-4 -mt-4 opacity-10 pointer-events-none">
              <img src={elementUrl} alt="" className="w-40 h-40 object-contain brightness-0 invert" />
            </div>
            <CardContent className="p-6 md:p-8 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Hoa hồng tạm tính</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <h2 className="text-4xl font-bold tracking-tight tabular-nums" data-testid="text-commission">
                      {formatCurrency(currentCommission).replace('₫', '')}
                    </h2>
                    <span className="text-lg font-medium text-white/80">VNĐ</span>
                  </div>
                </div>
                <Badge className="bg-white/30 text-white border-0 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm">
                  <TrendingUp className="h-3 w-3 mr-1 inline" /> +12.5%
                </Badge>
              </div>
              
            </CardContent>
          </Card>

          <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-bold text-[#4a4d50] uppercase tracking-wider">Doanh số</p>
                <Badge className="bg-[#e4f3d9] text-[#008060] border-0 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  <TrendingUp className="h-3 w-3 mr-1 inline" /> +8.2%
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-[#1a1c1d] tabular-nums" data-testid="text-revenue">{formatCurrency(user.currentRevenue).replace('₫', '')}</h3>
            </CardContent>
          </Card>

          <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-bold text-[#4a4d50] uppercase tracking-wider">Đã chốt</p>
                <Badge className="bg-[#e4f3d9] text-[#008060] border-0 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  <TrendingUp className="h-3 w-3 mr-1 inline" /> +2
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-[#1a1c1d] tabular-nums" data-testid="text-deals-count">{recentOrders.length}</h3>
            </CardContent>
          </Card>
        </div>

        <Card className="border-[#d2d5d8] shadow-sm rounded-xl overflow-hidden bg-white" data-testid="card-achievements">
          <div className="px-4 sm:px-6 py-4 border-b border-[#e3e3e3]">
            <h3 className="text-sm font-bold text-[#1a1c1d]">Thành tích của bạn</h3>
          </div>
          <CardContent className="p-4 sm:p-6 space-y-5">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#f6f6f7] border border-[#e3e3e3]" data-testid="card-rank">
              <div className={`h-14 w-14 rounded-2xl ${rank.bg} flex items-center justify-center shrink-0`}>
                <RankIcon className={`h-7 w-7 ${rank.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-base font-bold ${rank.color}`}>{rank.name}</span>
                  {rank.next && (
                    <span className="text-[11px] text-[#8c9196]">· còn {formatCurrency(remaining).replace('₫', '')} ₫ để lên {rank.next}</span>
                  )}
                </div>
                <div className="w-full bg-[#e3e3e3] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      rank.name === "Kim cương" ? "bg-[#60a5fa]" :
                      rank.name === "Vàng" ? "bg-[#d97706]" :
                      rank.name === "Bạc" ? "bg-[#6b7280]" : "bg-[#b45309]"
                    }`}
                    style={{ width: `${Math.min(rankProgress, 100)}%` }}
                  />
                </div>
                {rank.next && rankRewards[rank.next] && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Gift className="h-3.5 w-3.5 text-[#008060] shrink-0" />
                    <span className="text-[11px] font-medium text-[#008060]">
                      Lên {rank.next}: Hoa hồng {rankRewards[rank.next].commission}%{rankRewards[rank.next].bonus > 0 ? `, thưởng ${new Intl.NumberFormat('vi-VN').format(rankRewards[rank.next].bonus)}₫` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Badges row hidden */}
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
