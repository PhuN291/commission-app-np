/**
 * Dữ liệu màn Xếp hạng cá nhân.
 *
 * Spec: B5-4 Section 4 (S-Ranking conditional render).
 * Quyền: mọi người đã đăng nhập (nhân viên và bác sĩ xem bậc của mình).
 *
 * Doanh số lấy từ ĐƠN THẬT qua orderRealRevenue, cùng một định nghĩa với màn Phân
 * tích và bảng xếp hạng, để ba nơi không ra ba con số. Trước đây hàm này đọc
 * users.currentRevenue (cột đã ngưng dùng, giá trị nằm im từ seed) và ghi cứng doanh
 * số hai tháng trước, nên màn hình hiện số không có thật.
 */

import {
  RANKING_FOR_ROLE,
  RANKING_LABEL,
  RANKING_THRESHOLDS,
  getNextRanking,
  type Ranking,
} from "@shared/types";
import { orderCycle, orderRealRevenue } from "./analytics";
import { storage } from "./storage";

/** Một bậc trên thang, kèm mức hoa hồng và điều kiện rời bậc. */
export type RankTierView = {
  key: Ranking;
  label: string;
  /** Phần trăm hoa hồng của bậc này, đơn vị basis point. null nếu chưa cấu hình. */
  pctBp: number | null;
  /** Điều kiện để LÊN bậc kế. null ở bậc cao nhất. */
  requirement: { revenue: number; months: number } | null;
  state: "passed" | "current" | "locked";
};

export type PersonalRankingData = {
  user: {
    id: number;
    name: string;
    role: string;
    ranking: Ranking | null;
  };
  monthlyRevenue: number;
  /** Top % trong bậc, null nếu người này không có bậc (CEO, trưởng ca, kế toán). */
  tierPositionPct: number | null;
  sameTierCount: number;
  isSoloInTier: boolean;
  nextTier: Ranking | null;
  /** Mục tiêu lên bậc kế. null nếu đã ở bậc cao nhất hoặc vai không có thang bậc. */
  target: { revenue: number; months: number } | null;
  /** Đúng target.months tháng gần nhất, cũ trước mới sau. Tháng cuối là tháng hiện tại. */
  historyMonths: Array<{
    month: string;
    revenue: number;
    achieved: boolean;
    current?: boolean;
  }>;
  /**
   * Số tháng liên tiếp đã đạt mục tiêu, tính lùi từ tháng TRƯỚC tháng hiện tại.
   *
   * Không tính tháng hiện tại vì nó chưa hết: chưa đạt không có nghĩa là đã trượt.
   * Đây là con số màn hình phải nói ra, trước đây không nơi nào hiển thị nên người
   * dùng thấy "đã đạt mục tiêu tháng này" và tưởng sắp lên bậc.
   */
  streakBefore: number;
  /** Cả thang bậc của vai này. */
  tiers: RankTierView[];
  isAtTopTier: boolean;
};

/** Lùi `offset` tháng từ mốc, trả 'YYYY-MM'. */
function cycleOffset(from: Date, offset: number): string {
  const d = new Date(from.getFullYear(), from.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 'YYYY-MM' → 'MM/YYYY' cho nhãn hiển thị. */
function monthLabel(cycle: string): string {
  const [y, m] = cycle.split("-");
  return `${m}/${y}`;
}

export async function getPersonalRanking(userId: number): Promise<PersonalRankingData | null> {
  const user = await storage.getUser(userId);
  if (!user) return null;

  const ranking = (user.ranking ?? null) as Ranking | null;
  const role = user.role;
  const thresholds =
    role === "sale" ? RANKING_THRESHOLDS.sale : role === "doctor" ? RANKING_THRESHOLDS.doctor : null;

  // ── Doanh số theo tháng, gom từ đơn thật ────────────────────────────────
  const allOrders = await storage.getAllOrders();
  const doanhSoTheoKy = new Map<string, number>();
  for (const o of allOrders) {
    if (o.userId !== userId) continue;
    const ky = orderCycle(o.createdAt);
    if (!ky) continue;
    doanhSoTheoKy.set(ky, (doanhSoTheoKy.get(ky) ?? 0) + orderRealRevenue(o));
  }

  const now = new Date();
  const kyHienTai = cycleOffset(now, 0);
  const monthlyRevenue = doanhSoTheoKy.get(kyHienTai) ?? 0;

  // ── Vị trí trong bậc ────────────────────────────────────────────────────
  // So bằng doanh số tháng này của từng người, cùng nguồn với số phía trên.
  const allUsers = await storage.getAllUsers();
  const sameTier = allUsers.filter(
    (u) => u.role === role && u.ranking === ranking && u.status === "active",
  );
  const doanhSoNguoi = new Map<number, number>();
  for (const o of allOrders) {
    if (orderCycle(o.createdAt) !== kyHienTai) continue;
    doanhSoNguoi.set(o.userId, (doanhSoNguoi.get(o.userId) ?? 0) + orderRealRevenue(o));
  }
  const sortedByRevenue = [...sameTier].sort(
    (a, b) => (doanhSoNguoi.get(b.id) ?? 0) - (doanhSoNguoi.get(a.id) ?? 0),
  );
  const myIndex = sortedByRevenue.findIndex((u) => u.id === userId);
  const tierPositionPct =
    sameTier.length > 0 && myIndex >= 0
      ? Math.max(1, Math.round(((myIndex + 1) / sameTier.length) * 100))
      : null;

  // ── Mục tiêu lên bậc kế ─────────────────────────────────────────────────
  const nextTier = getNextRanking(ranking);
  const target = ranking && thresholds ? (thresholds[ranking] ?? null) : null;

  // ── Lịch sử đúng bằng cửa sổ xét, và chuỗi tháng liên tiếp ──────────────
  const soThang = target?.months ?? 3;
  const historyMonths: PersonalRankingData["historyMonths"] = [];
  for (let i = soThang - 1; i >= 0; i--) {
    const ky = cycleOffset(now, -i);
    const revenue = doanhSoTheoKy.get(ky) ?? 0;
    historyMonths.push({
      month: monthLabel(ky),
      revenue,
      achieved: target ? revenue >= target.revenue : false,
      ...(i === 0 ? { current: true } : {}),
    });
  }

  // Đếm lùi từ tháng liền trước, dừng ở tháng đầu tiên không đạt.
  let streakBefore = 0;
  if (target) {
    for (let i = 1; ; i++) {
      const revenue = doanhSoTheoKy.get(cycleOffset(now, -i)) ?? 0;
      if (revenue < target.revenue) break;
      streakBefore++;
      // Không cần đếm quá cửa sổ xét: đủ months-1 tháng là tháng này chốt được rồi.
      if (streakBefore >= target.months) break;
    }
  }

  // ── Cả thang bậc, kèm mức hoa hồng đọc từ commission_tiers ──────────────
  const cacBac = RANKING_FOR_ROLE[role as keyof typeof RANKING_FOR_ROLE] ?? [];
  const viTriHienTai = ranking ? cacBac.indexOf(ranking) : -1;
  const tiers: RankTierView[] = await Promise.all(
    cacBac.map(async (bac, i) => ({
      key: bac,
      label: RANKING_LABEL[bac],
      pctBp: await storage.getEffectiveCommissionRate(role, bac, now),
      requirement: thresholds?.[bac] ?? null,
      state:
        viTriHienTai < 0
          ? ("locked" as const)
          : i < viTriHienTai
            ? ("passed" as const)
            : i === viTriHienTai
              ? ("current" as const)
              : ("locked" as const),
    })),
  );

  return {
    user: { id: user.id, name: user.name, role, ranking },
    monthlyRevenue,
    tierPositionPct,
    sameTierCount: sameTier.length,
    isSoloInTier: sameTier.length === 1,
    nextTier,
    target,
    historyMonths,
    streakBefore,
    tiers,
    isAtTopTier: nextTier === null && ranking !== null,
  };
}
