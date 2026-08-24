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
import { EditorChoice, Medal, TrendingUp } from "@/components/np/icon";
import { authFetch, getCurrentUserId } from "@/lib/queryClient";
import {
  Badge,
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

type RankTierView = {
  key: Ranking;
  label: string;
  pctBp: number | null;
  requirement: { revenue: number; months: number } | null;
  state: "passed" | "current" | "locked";
};

type PersonalRankingData = {
  user: { id: number; name: string; role: string; ranking: Ranking | null };
  monthlyRevenue: number;
  tierPositionPct: number | null;
  sameTierCount: number;
  isSoloInTier: boolean;
  nextTier: Ranking | null;
  target: { revenue: number; months: number } | null;
  historyMonths: Array<{ month: string; revenue: number; achieved: boolean; current?: boolean }>;
  streakBefore: number;
  tiers: RankTierView[];
  isAtTopTier: boolean;
};

/** 500 basis point → "5%". Bỏ số lẻ .0 cho gọn. */
function fmtPct(bp: number | null): string | null {
  if (bp == null) return null;
  const v = bp / 100;
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
}

/** "3 tháng liên tiếp", nhưng một tháng thì bỏ chữ liên tiếp cho xuôi câu. */
function soThangText(months: number): string {
  return months <= 1 ? "1 tháng" : `${months} tháng liên tiếp`;
}

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

  const {
    user,
    monthlyRevenue,
    tierPositionPct,
    isSoloInTier,
    nextTier,
    target,
    historyMonths,
    isAtTopTier,
  } = data;
  // Chốt hình dạng: hai trường này thêm sau. Máy chủ chưa nạp bản mới (tsx không tự
  // theo dõi) thì payload thiếu chúng, và `tiers.find` làm vỡ trắng cả màn.
  const streakBefore = data.streakBefore ?? 0;
  const tiers = data.tiers ?? [];
  const remaining = target ? Math.max(0, target.revenue - monthlyRevenue) : 0;
  const datThangNay = !!target && monthlyRevenue >= target.revenue;
  const daCo = streakBefore + (datThangNay ? 1 : 0);
  const bacHienTai = tiers.find((t) => t.state === "current");
  const pctHienTai = fmtPct(bacHienTai?.pctBp ?? null);
  const thangNay = historyMonths.find((m) => m.current)?.month;

  return (
    <Screen activeTab={active} onTab={onTab}>
      <PageHeader title="Xếp hạng" subtitle="Bậc hiện tại và tiến độ lên bậc kế" />

      {/* Bậc đang đứng, kèm mức hoa hồng vì đó mới là lý do người ta quan tâm tới bậc */}
      <Card className="px-4 py-5">
        <div className="text-[11px] font-semibold text-np-text-muted">Bậc hiện tại</div>
        <div className="mt-2 flex items-center gap-3">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: rankingBg(user.ranking) }}
          >
            <Medal size={26} color={rankingColor(user.ranking)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[22px] font-extrabold tracking-[-0.4px] text-np-ink">
                {user.ranking ? RANKING_LABEL[user.ranking] : "Chưa xếp bậc"}
              </span>
              {pctHienTai && <Badge tone="success">Hoa hồng {pctHienTai}</Badge>}
            </div>
            {isSoloInTier && user.ranking ? (
              <div className="mt-1 text-[12px] font-medium text-np-text-sub">
                Hiện chỉ có bạn ở bậc {RANKING_LABEL[user.ranking]}
              </div>
            ) : tierPositionPct !== null && user.ranking ? (
              <div className="mt-1 text-[12px] font-medium text-np-text-sub">
                Top <span className="font-bold text-np-brand-ink">{tierPositionPct}%</span> trong bậc{" "}
                {RANKING_LABEL[user.ranking]}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-4 border-t border-np-surface-pressed pt-3">
          <div className="text-[11px] font-semibold text-np-text-muted">
            Doanh số tháng {thangNay ?? ""}
          </div>
          <div className="mt-1 text-[20px] font-extrabold tabular-nums text-np-ink">
            {fmtVND(monthlyRevenue)}
          </div>
          <div className="mt-1 text-[11px] leading-[1.5] text-np-text-muted">
            Tính trên đơn đã khám xong, sau khi trừ bảo hiểm, voucher và tiền hoàn.
          </div>
        </div>
      </Card>

      {isAtTopTier ? (
        <Card className="mt-4 flex items-center gap-3 px-4 py-4">
          <EditorChoice
            size={28}
            className="flex-shrink-0"
            style={{ color: "var(--color-np-rank-vang)" }}
          />
          <div>
            <div className="text-[14px] font-bold text-np-ink">Bậc cao nhất</div>
            <div className="mt-0.5 text-[12px] text-np-text-sub">
              Bạn đang ở bậc cao nhất của thang, không còn bậc nào để lên.
            </div>
          </div>
        </Card>
      ) : target && nextTier ? (
        <>
          <SectionTitle>Tiến độ lên {RANKING_LABEL[nextTier]}</SectionTitle>
          <Card className="space-y-3.5 px-4 py-4">
            <div className="flex items-start gap-2 rounded-np-button border border-np-brand-soft bg-np-brand-soft/30 p-3 text-[12px] leading-[1.5] text-np-text-sub">
              <TrendingUp size={14} className="mt-0.5 flex-shrink-0 text-np-brand-ink" />
              <span>
                Cần <strong className="text-np-ink">{fmtVND(target.revenue)}</strong> mỗi tháng, đạt{" "}
                <strong className="text-np-ink">{soThangText(target.months)}</strong>.
                {target.months > 1 && " Trượt một tháng là đếm lại từ đầu."}
              </span>
            </div>

            <div className="space-y-3">
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

            {/* Câu chốt. Trước đây chỗ này chỉ nói "đã đạt mục tiêu tháng này", người
                dùng đọc xong tưởng sắp lên bậc trong khi chuỗi mới được 1 trên 3. */}
            <div className="border-t border-np-surface-pressed pt-3">
              <div className="text-[13px] font-bold text-np-ink">
                {target.months > 1
                  ? `Đã có ${daCo} trên ${target.months} tháng liên tiếp`
                  : datThangNay
                    ? "Đã đạt mục tiêu tháng này"
                    : "Chưa đạt mục tiêu tháng này"}
              </div>
              <div className="mt-0.5 text-[12px] leading-[1.5] text-np-text-sub">
                {daCo >= target.months ? (
                  <>Đủ điều kiện lên bậc {RANKING_LABEL[nextTier]}.</>
                ) : datThangNay ? (
                  <>
                    Giữ nhịp thêm {target.months - daCo} tháng nữa là lên bậc{" "}
                    {RANKING_LABEL[nextTier]}.
                  </>
                ) : (
                  <>
                    Còn{" "}
                    <span className="font-bold tabular-nums text-np-brand-ink">
                      {fmtVND(remaining)}
                    </span>{" "}
                    nữa là tháng này được tính.
                  </>
                )}
              </div>
            </div>
          </Card>
        </>
      ) : null}

      {tiers.length > 0 && (
        <>
          <SectionTitle>Thang bậc {roleWord(user.role)}</SectionTitle>
          <Card className="overflow-hidden p-0">
            {tiers.map((t, i) => (
              <TierRow key={t.key} tier={t} next={tiers[i + 1]} last={i === tiers.length - 1} />
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

/** Nhãn vai dùng trong câu, viết thường vì nằm giữa câu. */
function roleWord(role: string): string {
  return role === "doctor" ? "bác sĩ" : "điều dưỡng";
}

function TierRow({
  tier,
  next,
  last,
}: {
  tier: RankTierView;
  next?: RankTierView;
  last: boolean;
}) {
  const pct = fmtPct(tier.pctBp);
  const laHienTai = tier.state === "current";
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 ${last ? "" : "np-divider"} ${
        laHienTai ? "bg-np-brand-soft/30" : ""
      }`}
    >
      {/* Chấm mang HAI thông tin: màu là bậc, đặc hay rỗng là đã qua hay chưa tới.
          Chỉ dùng màu thì không đủ, vì Tập sự và Bạc cùng tông xám. */}
      <div
        className="mt-[3px] h-3 w-3 flex-shrink-0 rounded-full"
        style={
          tier.state === "locked"
            ? { border: `2px solid ${rankingColor(tier.key)}`, opacity: 0.5 }
            : { background: rankingColor(tier.key) }
        }
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`text-[14px] text-np-ink ${laHienTai ? "font-extrabold" : "font-semibold"}`}
          >
            {tier.label}
          </span>
          {pct && (
            <Badge tone={laHienTai ? "success" : "neutral"}>Hoa hồng {pct}</Badge>
          )}
          {laHienTai && <span className="text-[11px] font-bold text-np-brand-ink">Bậc của bạn</span>}
        </div>
        <div className="mt-0.5 text-[11px] leading-[1.5] text-np-text-sub">
          {tier.requirement && next ? (
            <>
              Lên {next.label}: {fmtVND(tier.requirement.revenue)} mỗi tháng, đạt{" "}
              {soThangText(tier.requirement.months)}
            </>
          ) : (
            "Bậc cao nhất"
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Một tháng trong cửa sổ xét.
 *
 * Màu thanh phải NÓI CÙNG MỘT ĐIỀU với nhãn trạng thái. Bản trước vẽ mọi tháng bằng
 * một màu xanh, nên tháng trượt 28 trên 30 triệu hiện ra thành thanh xanh dài 93% với
 * một dấu ✕ xám bé ở mép: mắt đọc màu và độ dài trước, nên cả ba tháng nhìn như đã
 * xong trong khi hai tháng đã hỏng.
 */
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
  const pct = target > 0 ? Math.min(100, Math.round((revenue / target) * 100)) : 0;
  const tone = achieved ? "success" : current ? "info" : "muted";
  const nhan = achieved ? "Đạt" : current ? "Đang tính" : "Chưa đạt";
  const mauThanh = achieved
    ? "var(--color-np-badge-success-fg)"
    : current
      ? "var(--color-np-badge-info-fg)"
      : "var(--color-np-badge-muted-fg)";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={`text-[12px] ${current ? "font-bold text-np-ink" : "font-semibold text-np-text-sub"}`}
          >
            {month}
          </span>
          <Badge tone={tone}>{nhan}</Badge>
        </div>
        <span
          className={`flex-shrink-0 text-[12px] tabular-nums ${
            current ? "font-bold text-np-ink" : "font-medium text-np-text-sub"
          }`}
        >
          {fmtVND(revenue)}
        </span>
      </div>
      <NPProgress value={pct} color={mauThanh} />
    </div>
  );
}

/**
 * Nền vòng huy hiệu, đi theo cặp với rankingColor.
 *
 * Trước đây vòng luôn là gradient xanh thương hiệu bất kể bậc, trong khi cái huy hiệu
 * bên trong lại đổi màu theo bậc, nên bậc Bạc hiện ra là huy hiệu xám trên nền xanh lá.
 */
function rankingBg(ranking: Ranking | null): string {
  switch (ranking) {
    case "M1":
    case "L1":
      return "var(--color-np-rank-dong-bg)";
    case "M2":
      return "var(--color-np-rank-bac-bg)";
    case "M3":
    case "L2":
      return "var(--color-np-rank-vang-bg)";
    case "L3":
      return "var(--color-np-rank-kim-bg)";
    default:
      return "var(--color-np-surface-sub)";
  }
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
