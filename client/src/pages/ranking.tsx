import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Crown, Award, Star, Medal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppHeader from "@/components/app-header";
import { Breadcrumb } from "@/components/breadcrumb";
import DateRangeFilter from "@/components/date-range-filter";

interface StaffMember {
  id: number;
  name: string;
  role: string;
  revenue: number;
  commission: number;
  rank: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN').format(amount) + " ₫";
};

const formatShort = (amount: number) => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}tr`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k`;
  return amount.toString();
};

function getRankBadge(revenue: number) {
  if (revenue >= 100000000) return { name: "Kim cương", color: "text-[#2563eb]", bg: "bg-[#dbeafe]" };
  if (revenue >= 50000000) return { name: "Vàng", color: "text-[#d97706]", bg: "bg-[#fef3c7]" };
  if (revenue >= 20000000) return { name: "Bạc", color: "text-[#6b7280]", bg: "bg-[#f3f4f6]" };
  return { name: "Đồng", color: "text-[#b45309]", bg: "bg-[#fef3c7]" };
}

function getInitials(name: string) {
  return name.split(" ").slice(-1)[0]?.[0] || "?";
}

const podiumColors = [
  { ring: "ring-[#d97706]", bg: "bg-gradient-to-br from-[#fbbf24] to-[#d97706]", medal: "🥇" },
  { ring: "ring-[#9ca3af]", bg: "bg-gradient-to-br from-[#d1d5db] to-[#6b7280]", medal: "🥈" },
  { ring: "ring-[#b45309]", bg: "bg-gradient-to-br from-[#d97706] to-[#92400e]", medal: "🥉" },
];

export default function RankingPage() {
  const [dateRange, setDateRange] = useState("this_month");

  const { data: staffData = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
  });

  const sorted = [...staffData].sort((a, b) => a.rank - b.rank);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
        <AppHeader activePage="ranking" />
        <main className="flex-1 p-4 md:p-8 bg-[#f6f6f7] rounded-t-2xl flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-[#008060] border-t-transparent rounded-full animate-spin"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader activePage="ranking" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[{ label: "Xếp hạng" }]} />

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1a1c1d]" data-testid="text-ranking-title">Bảng xếp hạng</h1>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        <Card className="border-[#d2d5d8] shadow-sm rounded-xl overflow-hidden bg-white p-6" data-testid="card-podium">
          <div className="flex items-end justify-center gap-3 sm:gap-6 mb-4">
            {podiumOrder.map((person, idx) => {
              if (!person) return null;
              const originalIdx = person.rank - 1;
              const colors = podiumColors[originalIdx] || podiumColors[2];
              const isFirst = person.rank === 1;
              const heightClass = isFirst ? "h-28 sm:h-32" : person.rank === 2 ? "h-20 sm:h-24" : "h-16 sm:h-20";

              return (
                <div key={person.id} className="flex flex-col items-center" data-testid={`podium-${person.rank}`}>
                  <div className={`relative mb-2`}>
                    <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-full ${colors.bg} flex items-center justify-center text-white text-xl sm:text-2xl font-bold ring-4 ${colors.ring} ring-offset-2`}>
                      {getInitials(person.name)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 text-lg sm:text-xl">{colors.medal}</div>
                  </div>
                  <p className="text-sm font-bold text-[#1a1c1d] text-center mt-1">{person.name}</p>
                  <p className="text-[11px] text-[#8c9196]">{person.role}</p>
                  <p className="text-xs font-bold text-[#008060] mt-1">{formatShort(person.revenue)}</p>
                  <div className={`w-16 sm:w-20 ${heightClass} bg-gradient-to-t from-[#e3e3e3] to-[#f6f6f7] rounded-t-lg mt-2 flex items-center justify-center`}>
                    <span className="text-2xl font-bold text-[#c9cccf]">#{person.rank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="border-[#d2d5d8] shadow-sm rounded-xl overflow-hidden bg-white" data-testid="card-leaderboard">
          <div className="px-4 sm:px-6 py-4 border-b border-[#e3e3e3]">
            <h3 className="text-sm font-bold text-[#1a1c1d]">Bảng xếp hạng chi tiết</h3>
          </div>
          <div className="divide-y divide-[#e3e3e3]">
            {sorted.map((person) => {
              const rankBadge = getRankBadge(person.revenue);
              const isCurrentUser = person.name === "Nguyễn Thị Mai";
              return (
                <div
                  key={person.id}
                  className={`flex items-center gap-3 px-4 sm:px-6 py-3.5 transition-colors ${
                    isCurrentUser ? "bg-[#e4f3d9]/50 border-l-4 border-l-[#008060]" : ""
                  }`}
                  data-testid={`rank-row-${person.rank}`}
                >
                  <span className={`w-8 text-center font-bold text-sm ${
                    person.rank <= 3 ? "text-[#d97706]" : "text-[#8c9196]"
                  }`}>
                    {person.rank <= 3 ? (
                      <Medal className={`h-5 w-5 mx-auto ${
                        person.rank === 1 ? "text-[#d97706]" : person.rank === 2 ? "text-[#6b7280]" : "text-[#b45309]"
                      }`} />
                    ) : person.rank}
                  </span>

                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {getInitials(person.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-[#1a1c1d] truncate ${isCurrentUser ? "font-bold" : ""}`}>
                      {person.name}
                      {isCurrentUser && <span className="text-[10px] text-[#008060] ml-1">(Bạn)</span>}
                    </p>
                    <p className="text-[11px] text-[#8c9196]">{person.role}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#1a1c1d] tabular-nums">{formatCurrency(person.revenue)}</p>
                    <p className="text-[11px] text-[#008060]">HH: {formatCurrency(person.commission)}</p>
                  </div>

                  <Badge className={`${rankBadge.bg} ${rankBadge.color} border-0 text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0`}>
                    {rankBadge.name}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </main>
    </div>
  );
}
