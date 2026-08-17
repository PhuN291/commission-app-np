/**
 * Ranking screen — conditional render theo role.
 *
 * Spec: B5-4 Section 4 + B4 R-9-1 vòng 14.
 * - NV (Sale) + BS: PersonalRankView (vị trí + tier + progress lên tier kế)
 * - TC + KT + CEO: FullLeaderboardView (podium + table — giữ implementation cũ)
 *
 * Permission server-side: GET /api/staff gated CEO/TC/KT, GET /api/ranking/me any auth.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, EditorChoice, Medal, TrendingUp, Verified, XCircle } from "@/components/np/icon";
import { authFetch, getCurrentUserId } from "@/lib/queryClient";
import {
  Card,
  NPProgress,
  PageHeader,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RANKING_LABEL, type Ranking, type UserRole } from "@shared/types";

/** 'YYYY-MM' → 'Tháng MM/YYYY'. */
function cycleLabel(cycle: string): string {
  const [y, m] = cycle.split("-");
  return `Tháng ${m}/${y}`;
}

function currentCycleId(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtVND(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

function fmtShort(amount: number) {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + " tỷ";
  if (amount >= 1_000_000)
    return (amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1) + " tr";
  if (amount >= 1_000) return Math.round(amount / 1_000) + "k";
  return String(amount);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();
}

// ─────────────────────────────────────────────────────────────────
// Top-level — role gate
// ─────────────────────────────────────────────────────────────────

export default function RankingPage() {
  const role = (typeof window !== "undefined"
    ? localStorage.getItem("np_role")
    : null) as UserRole | null;
  const isPersonalView = role === "sale" || role === "doctor";
  return isPersonalView ? <PersonalRankView /> : <FullLeaderboardView />;
}

// ─────────────────────────────────────────────────────────────────
// PersonalRankView — NV/BS only (R-9-1)
// ─────────────────────────────────────────────────────────────────

type PersonalRankingData = {
  user: { id: number; name: string; role: string; ranking: Ranking | null };
  monthlyRevenue: number;
  tierPositionPct: number | null;
  sameTierCount: number;
  isSoloInTier: boolean;
  nextTier: Ranking | null;
  target: { revenue: number; months: number } | null;
  historyMonths: Array<{ month: string; revenue: number; achieved: boolean; current?: boolean }>;
  isAtTopTier: boolean;
};

function PersonalRankView() {
  const { active, onTab } = useTabNav();
  const { data, isLoading } = useQuery<PersonalRankingData>({
    queryKey: ["/api/ranking/me", getCurrentUserId()],
    queryFn: async () => {
      const res = await authFetch("/api/ranking/me");
      if (!res.ok) throw new Error("fetch_failed");
      return res.json();
    },
  });

  if (isLoading || !data) {
    return (
      <Screen activeTab={active} onTab={onTab}>
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
        </div>
      </Screen>
    );
  }

  const { user, monthlyRevenue, tierPositionPct, isSoloInTier, nextTier, target, historyMonths, isAtTopTier } = data;
  const remaining = target ? Math.max(0, target.revenue - monthlyRevenue) : 0;
  const currentMonthProgress = target
    ? Math.min(100, Math.round((monthlyRevenue / target.revenue) * 100))
    : 0;

  return (
    <Screen activeTab={active} onTab={onTab}>
      <PageHeader title="Xếp hạng" subtitle="Vị trí tháng này" />

      {/* Hero card — current rank + tier position */}
      <Card className="px-4 py-5">
        <div className="text-[11px] font-semibold text-np-text-muted">
          Bậc hiện tại
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-np-brand-soft to-np-brand-soft/60">
            <Medal size={26} color={rankingColor(user.ranking)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[22px] font-extrabold tracking-[-0.4px] text-np-ink">
              {user.ranking ? RANKING_LABEL[user.ranking] : "Chưa xếp bậc"}
            </div>
            {isSoloInTier ? (
              <div className="mt-0.5 text-[12px] font-medium text-np-text-sub">
                Duy nhất ở bậc {user.ranking && RANKING_LABEL[user.ranking]}
              </div>
            ) : tierPositionPct !== null && user.ranking ? (
              <div className="mt-0.5 text-[12px] font-medium text-np-text-sub">
                Top <span className="font-bold text-np-brand-ink">{tierPositionPct}%</span> trong bậc {RANKING_LABEL[user.ranking]}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-4 border-t border-np-surface-pressed pt-3">
          <div className="text-[11px] font-semibold text-np-text-muted">
            Doanh số tháng
          </div>
          <div className="mt-1 text-[20px] font-extrabold text-np-ink tabular-nums">
            {fmtVND(monthlyRevenue)}
          </div>
        </div>
      </Card>

      {/* Progress section — chỉ hiện khi không ở đỉnh tier */}
      {isAtTopTier ? (
        <Card className="mt-4 flex items-center gap-3 px-4 py-4">
          <EditorChoice size={28} className="flex-shrink-0 text-np-rank-vang" style={{ color: "var(--color-np-rank-vang, #D97706)" }} />
          <div>
            <div className="text-[14px] font-bold text-np-ink">Bậc cao nhất</div>
            <div className="mt-0.5 text-[12px] text-np-text-sub">
              Đã đạt bậc cao nhất.
            </div>
          </div>
        </Card>
      ) : target && nextTier ? (
        <>
          <SectionTitle>Tiến độ lên {RANKING_LABEL[nextTier]}</SectionTitle>
          <Card className="space-y-3 px-4 py-4">
            <div className="flex items-start gap-2 rounded-np-button border border-np-brand-soft bg-np-brand-soft/30 p-3 text-[12px] text-np-text-sub">
              <TrendingUp size={14} className="mt-0.5 flex-shrink-0 text-np-brand-ink" />
              <span>
                Mục tiêu: <strong className="text-np-ink">{fmtVND(target.revenue)}/tháng</strong>{" "}
                × <strong className="text-np-ink">{target.months} tháng liên tiếp</strong>
              </span>
            </div>

            <div className="space-y-2.5">
              {historyMonths.map((m) => (
                <MonthRow
                  key={m.month}
                  month={m.month}
                  revenue={m.revenue}
                  target={target.revenue}
                  achieved={m.achieved}
                  current={!!m.current}
                />
              ))}
            </div>

            {remaining > 0 && (
              <div className="border-t border-np-surface-pressed pt-3 text-center text-[13px] font-medium text-np-text-sub">
                Còn{" "}
                <span className="font-bold text-np-brand-ink tabular-nums">
                  {fmtVND(remaining)}
                </span>{" "}
                để đạt mục tiêu tháng này
              </div>
            )}
            {remaining === 0 && currentMonthProgress >= 100 && (
              <div className="flex items-center justify-center gap-1.5 border-t border-np-surface-pressed pt-3 text-[13px] font-bold text-np-badge-success-fg">
                <Verified size={15} />
                Đã đạt mục tiêu tháng này
              </div>
            )}
          </Card>
        </>
      ) : null}

    </Screen>
  );
}

function MonthRow({
  month,
  revenue,
  target,
  achieved,
  current,
}: {
  month: string;
  revenue: number;
  target: number;
  achieved: boolean;
  current: boolean;
}) {
  const pct = Math.min(100, Math.round((revenue / target) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className={`font-semibold ${current ? "text-np-ink" : "text-np-text-sub"}`}>
          {month}
          {current && <span className="ml-1.5 text-[10px] font-medium text-np-text-muted">(tháng này)</span>}
        </span>
        <span className="flex items-center gap-1.5 font-medium tabular-nums text-np-text-sub">
          <span className={current ? "text-np-ink font-bold" : ""}>{fmtVND(revenue)}</span>
          {achieved ? (
            <Verified size={15} className="text-np-badge-success-fg" />
          ) : current ? (
            <Clock size={15} className="text-np-text-muted" />
          ) : (
            <XCircle size={15} className="text-np-text-muted" />
          )}
        </span>
      </div>
      <NPProgress value={pct} />
    </div>
  );
}

/**
 * Màu huy hiệu theo bậc. Dùng MỘT hình dáng huy hiệu chung, phân biệt bằng màu của
 * design token, thay cho mỗi bậc một emoji (emoji hiển thị khác nhau tuỳ máy và
 * làm giao diện trông rẻ tiền).
 */
function rankingColor(ranking: Ranking | null): string {
  switch (ranking) {
    case "M0":
      return "var(--color-np-text-muted)";
    case "M1":
      return "var(--color-np-rank-dong)";
    case "M2":
      return "var(--color-np-rank-bac)";
    case "M3":
    case "L2":
      return "var(--color-np-rank-vang)";
    case "L1":
      return "var(--color-np-rank-dong)";
    case "L3":
      return "var(--color-np-rank-kim)";
    default:
      return "var(--color-np-text-muted)";
  }
}

// ─────────────────────────────────────────────────────────────────
// FullLeaderboardView — TC/KT/CEO (giữ implementation cũ)
// ─────────────────────────────────────────────────────────────────

interface StaffMember {
  id: number;
  name: string;
  role: string;
  revenue: number;
  commission: number;
  rank: number;
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

// Huy hiệu hạng 1-2-3: cùng một hình, khác màu (vàng, bạc, đồng).
const PODIUM_CONFIG = [
  { medalColor: "#D97706", ring: "#D97706", bg: "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)" },
  { medalColor: "#6B7280", ring: "#9CA3AF", bg: "linear-gradient(135deg, #D1D5DB 0%, #6B7280 100%)" },
  { medalColor: "#92400E", ring: "#B45309", bg: "linear-gradient(135deg, #D97706 0%, #92400E 100%)" },
];

function FullLeaderboardView() {
  const { active, onTab } = useTabNav();
  const [cycle, setCycle] = useState(currentCycleId());
  const { data, isLoading } = useQuery<{ availableCycles: string[]; leaderboard: StaffMember[] }>({
    queryKey: ["/api/leaderboard", cycle],
    queryFn: async () => {
      const res = await authFetch(`/api/leaderboard?cycle=${encodeURIComponent(cycle)}`);
      if (!res.ok) throw new Error("fetch_failed");
      return res.json();
    },
  });

  const staff = data?.leaderboard ?? [];
  const availableCycles = data?.availableCycles ?? [cycle];
  const sorted = [...staff].sort((a, b) => a.rank - b.rank);
  const top3 = sorted.slice(0, 3);
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const myName = (typeof window !== "undefined" ? localStorage.getItem("np_name") : null) ?? "";

  if (isLoading) {
    return (
      <Screen activeTab={active} onTab={onTab}>
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
        </div>
      </Screen>
    );
  }

  return (
    <Screen activeTab={active} onTab={onTab}>
      <PageHeader title="Bảng xếp hạng" />

      {/* Chọn kỳ (tháng) */}
      <div className="mx-4 mb-3">
        <Select value={cycle} onValueChange={setCycle}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableCycles.map((c) => (
              <SelectItem key={c} value={c}>
                {cycleLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sorted.length === 0 ? (
        <Card className="p-8 text-center text-[13px] text-np-text-muted">
          Chưa có xếp hạng kỳ này
        </Card>
      ) : (
        <>
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
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
                    <Medal size={15} color={cfg.medalColor} />
                  </div>
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
          const isCurrentUser = p.name === myName;
          return (
            <div
              key={p.id}
              className={`relative flex items-center gap-3 px-4 py-3.5 ${
                i === sorted.length - 1 ? "" : "np-divider"
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
                    className="mx-auto"
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
                    <span className="ml-1 text-[10px] text-np-brand-ink">(Tôi)</span>
                  )}
                </p>
                <p className="text-[11px] text-np-text-muted">{p.role}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-[14px] font-bold text-np-brand-ink tabular-nums">
                  {fmtShort(p.commission)}₫
                </p>
                <p className="text-[11px] text-np-text-muted">Hoa hồng kỳ này</p>
              </div>
            </div>
          );
        })}
      </Card>
        </>
      )}

    </Screen>
  );
}
