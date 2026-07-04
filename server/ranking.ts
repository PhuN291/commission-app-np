/**
 * Personal ranking data builder.
 *
 * Spec: B5-4 Section 4 (S-Ranking conditional render).
 * Permission: any authenticated user (cho NV/BS xem tier của mình).
 *
 * History months hiện mock 3 tháng. TODO Phase 2: compute từ orders sum by month + userId.
 */

import {
  RANKING_THRESHOLDS,
  getNextRanking,
  type CommissionableRole,
  type Ranking,
} from "@shared/types";
import { storage } from "./storage";

export type PersonalRankingData = {
  user: {
    id: number;
    name: string;
    role: string;
    ranking: Ranking | null;
  };
  monthlyRevenue: number;
  /** Top % trong tier — `null` nếu user không có ranking (CEO/TC/KT). */
  tierPositionPct: number | null;
  sameTierCount: number;
  isSoloInTier: boolean;
  nextTier: Ranking | null;
  /** Promotion target — `null` nếu đỉnh tier hoặc role không có thresholds. */
  target: { revenue: number; months: number } | null;
  historyMonths: Array<{
    month: string;
    revenue: number;
    achieved: boolean;
    current?: boolean;
  }>;
  isAtTopTier: boolean;
};

export async function getPersonalRanking(userId: number): Promise<PersonalRankingData | null> {
  const user = await storage.getUser(userId);
  if (!user) return null;

  const ranking = (user.ranking ?? null) as Ranking | null;
  const role = user.role;
  // TODO Phase 2: compute từ orders sum by month thay vì legacy currentRevenue field.
  const monthlyRevenue = user.currentRevenue ?? 0;

  // Tier position pct — anonymous count cùng tier.
  const allUsers = await storage.getAllUsers();
  const sameTier = allUsers.filter(
    (u) => u.role === role && u.ranking === ranking && u.status === "active",
  );
  const sortedByRevenue = [...sameTier].sort(
    (a, b) => (b.currentRevenue ?? 0) - (a.currentRevenue ?? 0),
  );
  const myIndex = sortedByRevenue.findIndex((u) => u.id === userId);
  const tierPositionPct =
    sameTier.length > 0 && myIndex >= 0
      ? Math.max(1, Math.round(((myIndex + 1) / sameTier.length) * 100))
      : null;
  const isSoloInTier = sameTier.length === 1;

  // Promotion target — null nếu đỉnh tier hoặc role không có ranking thresholds.
  const nextTier = getNextRanking(ranking);
  const thresholds =
    role === "sale"
      ? RANKING_THRESHOLDS.sale
      : role === "doctor"
        ? RANKING_THRESHOLDS.doctor
        : null;
  const target = ranking && thresholds ? (thresholds[ranking] ?? null) : null;

  // Mock 3 tháng history — TODO Phase 2: compute từ orders.
  const now = new Date();
  const historyMonths = [
    {
      month: monthLabel(now, -2),
      revenue: 22_000_000,
      achieved: target ? 22_000_000 >= target.revenue : false,
    },
    {
      month: monthLabel(now, -1),
      revenue: 28_000_000,
      achieved: target ? 28_000_000 >= target.revenue : false,
    },
    {
      month: monthLabel(now, 0),
      revenue: monthlyRevenue,
      achieved: target ? monthlyRevenue >= target.revenue : false,
      current: true,
    },
  ];

  return {
    user: { id: user.id, name: user.name, role, ranking },
    monthlyRevenue,
    tierPositionPct,
    sameTierCount: sameTier.length,
    isSoloInTier,
    nextTier,
    target,
    historyMonths,
    isAtTopTier: nextTier === null && ranking !== null,
  };
}

function monthLabel(now: Date, offset: number): string {
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
