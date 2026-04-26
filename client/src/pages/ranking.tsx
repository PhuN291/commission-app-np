import { useQuery } from "@tanstack/react-query";
import { Medal } from "lucide-react";
import {
  Badge,
  Card,
  PageHeader,
  Row,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";

interface StaffMember {
  id: number;
  name: string;
  role: string;
  revenue: number;
  commission: number;
  rank: number;
}

function fmtVND(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

function fmtShort(amount: number) {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + " tỷ";
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1) + " tr";
  if (amount >= 1_000) return Math.round(amount / 1_000) + "k";
  return String(amount);
}

function getRankTier(revenue: number) {
  if (revenue >= 100_000_000)
    return { name: "Kim cương", color: "var(--color-np-rank-kim)", bg: "var(--color-np-rank-kim-bg)" };
  if (revenue >= 50_000_000)
    return { name: "Vàng", color: "var(--color-np-rank-vang)", bg: "var(--color-np-rank-vang-bg)" };
  if (revenue >= 20_000_000)
    return { name: "Bạc", color: "var(--color-np-rank-bac)", bg: "var(--color-np-rank-bac-bg)" };
  return { name: "Đồng", color: "var(--color-np-rank-dong)", bg: "var(--color-np-rank-dong-bg)" };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();
}

const PODIUM_CONFIG = [
  { medal: "🥇", ring: "#D97706", bg: "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)" },
  { medal: "🥈", ring: "#9CA3AF", bg: "linear-gradient(135deg, #D1D5DB 0%, #6B7280 100%)" },
  { medal: "🥉", ring: "#B45309", bg: "linear-gradient(135deg, #D97706 0%, #92400E 100%)" },
];

export default function RankingPage() {
  const { active, onTab } = useTabNav();
  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
  });

  const sorted = [...staff].sort((a, b) => a.rank - b.rank);
  const top3 = sorted.slice(0, 3);
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  if (isLoading) {
    return (
      <Screen activeTab={active} onTab={onTab} notifCount={3}>
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
        </div>
      </Screen>
    );
  }

  return (
    <Screen activeTab={active} onTab={onTab} notifCount={3}>
      <PageHeader title="Bảng xếp hạng" subtitle="Tháng 02/2026 · Toàn công ty" />

      {/* Podium */}
      <Card className="p-4">
        <div className="flex items-end justify-center gap-3">
          {podiumOrder.map((person) => {
            if (!person) return null;
            const originalIdx = person.rank - 1;
            const cfg = PODIUM_CONFIG[originalIdx] || PODIUM_CONFIG[2];
            const isFirst = person.rank === 1;
            const barHeight = isFirst ? 110 : person.rank === 2 ? 82 : 64;
            return (
              <div key={person.id} className="flex flex-col items-center">
                <div className="relative mb-2">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full text-[18px] font-bold text-white ring-4 ring-offset-2"
                    style={{ background: cfg.bg, boxShadow: `0 0 0 4px ${cfg.ring}` }}
                  >
                    {getInitials(person.name)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 text-[18px]">{cfg.medal}</div>
                </div>
                <p className="mt-1 text-center text-[13px] font-bold text-np-ink">{person.name}</p>
                <p className="text-[11px] text-np-text-muted">{person.role}</p>
                <p className="mt-0.5 text-[12px] font-bold text-np-brand-ink">
                  {fmtShort(person.revenue)}₫
                </p>
                <div
                  className="mt-2 flex w-16 items-center justify-center rounded-t-lg bg-gradient-to-t from-np-border to-np-surface-sub"
                  style={{ height: barHeight }}
                >
                  <span className="text-[22px] font-bold text-np-border-strong">#{person.rank}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Leaderboard */}
      <SectionTitle>Bảng xếp hạng chi tiết</SectionTitle>
      <Card className="overflow-hidden p-0">
        {sorted.map((p, i) => {
          const tier = getRankTier(p.revenue);
          const isCurrentUser = p.name === "Nguyễn Thị Mai";
          return (
            <div
              key={p.id}
              className={`relative flex items-center gap-3 px-4 py-3.5 ${
                i === sorted.length - 1 ? "" : "border-b border-np-surface-pressed"
              } ${isCurrentUser ? "bg-np-brand-soft/40" : ""}`}
            >
              {isCurrentUser && (
                <div className="absolute bottom-0 left-0 top-0 w-1 bg-np-brand-ink" />
              )}
              <span
                className={`w-7 text-center text-[14px] font-bold ${
                  p.rank <= 3 ? "text-np-warning" : "text-np-text-muted"
                }`}
              >
                {p.rank <= 3 ? (
                  <Medal
                    size={20}
                    className={`mx-auto ${
                      p.rank === 1
                        ? "text-np-rank-vang"
                        : p.rank === 2
                        ? "text-np-rank-bac"
                        : "text-np-rank-dong"
                    }`}
                    style={{
                      color:
                        p.rank === 1
                          ? "var(--color-np-rank-vang)"
                          : p.rank === 2
                          ? "var(--color-np-rank-bac)"
                          : "var(--color-np-rank-dong)",
                    }}
                  />
                ) : (
                  p.rank
                )}
              </span>
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#A855F7] to-[#7C3AED] text-[12px] font-bold text-white">
                {getInitials(p.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-[14px] text-np-ink ${
                    isCurrentUser ? "font-bold" : "font-medium"
                  }`}
                >
                  {p.name}
                  {isCurrentUser && (
                    <span className="ml-1 text-[10px] text-np-brand-ink">(Bạn)</span>
                  )}
                </p>
                <p className="text-[11px] text-np-text-muted">{p.role}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-[13px] font-bold text-np-ink tabular-nums">
                  {fmtShort(p.revenue)}₫
                </p>
                <p className="text-[11px] text-np-brand-ink">HH {fmtShort(p.commission)}₫</p>
              </div>
              <span
                className="flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold"
                style={{ background: tier.bg, color: tier.color }}
              >
                {tier.name}
              </span>
            </div>
          );
        })}
      </Card>

      <div className="h-5" />
    </Screen>
  );
}
