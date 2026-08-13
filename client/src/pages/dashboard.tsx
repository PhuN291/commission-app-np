/**
 * Dashboard — role-based view (B4 R-9-1).
 *
 * - Sale/BS/TC: PersonalView (HH cá nhân, KPI cá nhân, "Cần xử lý" của mình, "Thành tích tháng")
 * - KT/CEO: AdminView (Tổng HH PK, KPI PK, "Cần xử lý" toàn PK, leaderboard mini)
 *
 * Server enforces — `/api/dashboard` returns shape khác theo role qua middleware requireRole.
 */

import { useQuery } from "@tanstack/react-query";
import monogram from "@assets/np-monogram.png";
import { useLocation } from "wouter";
import { authFetch, getCurrentUserId } from "@/lib/queryClient";
import {
  Bell,
  Calendar,
  ClipboardList,
  Clock,
  EditorChoice,
  Gift,
  Info,
  Medal,
  TrendingDown,
  TrendingUp,
  Users,
} from "@/components/np/icon";
import {
  Badge,
  type BadgeTone,
  Card,
  Chev,
  IconTile,
  NPProgress,
  PageHeader,
  Row,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ROLE_LABEL, type UserRole } from "@shared/types";
import metricRevenueIcon from "@/assets/icons/metric-revenue.svg";
import metricCustomersClosedIcon from "@/assets/icons/metric-customers-closed.svg";

// ─────────────────────────────────────────────────────────────────
// Types matching server response
// ─────────────────────────────────────────────────────────────────

type SafeUser = {
  id: number;
  name: string;
  role: string;
  department: string;
  avatar: string | null;
  targetRevenue: number;
  currentRevenue: number;
  commissionRate: number;
};

type PendingTasks = {
  pendingOrders: number;
  customersRecallDue: number;
  customersLate15min: number;
  total: number;
};

type PersonalDashboard = {
  view: "personal";
  user: SafeUser;
  hero: {
    label: string;
    commission: number;
    revenue: number;
    commissionRate: number;
    commissionTrendPct: number | null;
  };
  kpis: {
    revenue: number;
    closedDeals: number;
    totalDeals: number;
    revenueTrendPct: number | null;
  };
  pendingTasks: PendingTasks;
};

type AdminDashboard = {
  view: "admin";
  user: SafeUser;
  hero: { label: string; clinicCommission: number; clinicRevenue: number };
  kpis: { totalRevenue: number; closedDeals: number; totalDeals: number; activeStaffCount: number };
  pendingTasks: PendingTasks;
  leaderboard: Array<{
    id: number;
    name: string;
    role: string;
    revenue: number;
    commission: number;
    rank: number;
  }>;
};

type DashboardData = PersonalDashboard | AdminDashboard;

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

const RANK_TIERS = [
  { name: "Đồng", min: 0, next: "Bạc", nextMin: 20_000_000, color: "var(--color-np-rank-dong)", bg: "var(--color-np-rank-dong-bg)" },
  { name: "Bạc", min: 20_000_000, next: "Vàng", nextMin: 50_000_000, color: "var(--color-np-rank-bac)", bg: "var(--color-np-rank-bac-bg)" },
  { name: "Vàng", min: 50_000_000, next: "Kim cương", nextMin: 100_000_000, color: "var(--color-np-rank-vang)", bg: "var(--color-np-rank-vang-bg)" },
  { name: "Kim cương", min: 100_000_000, next: null, nextMin: 0, color: "var(--color-np-rank-kim)", bg: "var(--color-np-rank-kim-bg)" },
];

const RANK_REWARDS: Record<string, { commission: number; bonus: number }> = {
  "Bạc": { commission: 5, bonus: 300_000 },
  "Vàng": { commission: 6, bonus: 500_000 },
  "Kim cương": { commission: 8, bonus: 1_000_000 },
};

function getRank(revenue: number) {
  for (let i = RANK_TIERS.length - 1; i >= 0; i -= 1) {
    if (revenue >= RANK_TIERS[i].min) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}

function fmtShort(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + " triệu";
  if (n >= 1_000) return Math.round(n / 1_000) + " nghìn";
  return String(n);
}

function fmtFull(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return "Chào buổi sáng";
  if (h < 13) return "Chào buổi trưa";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

// ─────────────────────────────────────────────────────────────────
// Top-level — split conditional
// ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", getCurrentUserId()],
    queryFn: async () => {
      const res = await authFetch("/api/dashboard");
      if (!res.ok) throw new Error("fetch_failed");
      return res.json();
    },
  });

  if (isLoading || !data) {
    return (
      <Screen activeTab={active} onTab={onTab}>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
            <p className="text-np-sub text-np-text-muted">Đang tải...</p>
          </div>
        </div>
      </Screen>
    );
  }

  return data.view === "admin" ? (
    <AdminView data={data} navigate={navigate} active={active} onTab={onTab} />
  ) : (
    <PersonalView data={data} navigate={navigate} active={active} onTab={onTab} />
  );
}

// ─────────────────────────────────────────────────────────────────
// PersonalView — Sale/BS/TC
// ─────────────────────────────────────────────────────────────────

function PersonalView({
  data,
  navigate,
  active,
  onTab,
}: {
  data: PersonalDashboard;
  navigate: (to: string) => void;
  active: any;
  onTab: any;
}) {
  const { user, hero, kpis, pendingTasks } = data;
  const rank = getRank(kpis.revenue);
  const rankProgress = rank.next
    ? Math.min(100, ((kpis.revenue - rank.min) / (rank.nextMin - rank.min)) * 100)
    : 100;
  const remaining = rank.next ? rank.nextMin - kpis.revenue : 0;
  const firstName = user.name.split(" ").slice(-1)[0];

  return (
    <Screen activeTab={active} onTab={onTab}>
      <PageHeader title="Trang chủ" subtitle={`${getGreeting()}, ${firstName}`} />

      {/* Hero — HH cá nhân tháng */}
      <div className="px-4 pb-2">
        <HeroCard
          label="Hoa hồng tạm tính"
          amount={hero.commission}
          showInfoPopover
          trendPct={hero.commissionTrendPct}
        />
      </div>

      {/* Quick metrics */}
      <div className="grid grid-cols-2 gap-2.5 pt-3">
        <MetricCard
          label="Doanh số"
          value={fmtShort(kpis.revenue)}
          delta={
            kpis.revenueTrendPct != null
              ? `${kpis.revenueTrendPct >= 0 ? "+" : ""}${kpis.revenueTrendPct}%`
              : null
          }
          tone="success"
          icon={metricRevenueIcon}
        />
        <MetricCard
          label="Đã chốt"
          value={`${kpis.closedDeals}`}
          delta={null}
          icon={metricCustomersClosedIcon}
        />
      </div>

      {/* Cần xử lý */}
      <SectionTitle
        action={
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="text-[13px] font-semibold text-np-link"
          >
            Xem tất cả
          </button>
        }
      >
        Cần xử lý ({pendingTasks.total})
      </SectionTitle>
      <PendingTasksCard tasks={pendingTasks} role={data.user.role} navigate={navigate} />

      {/* Thành tích tháng */}
      <SectionTitle>Thành tích tháng</SectionTitle>
      <Card className="p-4">
        <div className="flex items-center gap-3.5">
          <div
            className="flex flex-shrink-0 items-center justify-center rounded-[14px]"
            style={{ width: 52, height: 52, background: rank.bg }}
          >
            <EditorChoice size={26} strokeWidth={2.2} style={{ color: rank.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="text-base font-bold" style={{ color: rank.color }}>
                {rank.name}
              </span>
              {rank.next && (
                <span className="text-[11px] font-medium text-np-text-muted">
                  còn {fmtShort(remaining)}₫ lên {rank.next}
                </span>
              )}
            </div>
            <NPProgress value={rankProgress} color={rank.color} />
            {rank.next && RANK_REWARDS[rank.next] && (
              <div className="mt-2 flex items-center gap-1.5">
                <Gift size={14} strokeWidth={2.2} className="flex-shrink-0 text-np-brand-ink" />
                <span className="text-[11px] font-semibold text-np-brand-ink">
                  Lên {rank.next}: Hoa hồng {RANK_REWARDS[rank.next].commission}%
                  {RANK_REWARDS[rank.next].bonus > 0
                    ? ` · thưởng ${fmtFull(RANK_REWARDS[rank.next].bonus)}₫`
                    : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────
// AdminView — KT/CEO
// ─────────────────────────────────────────────────────────────────

function AdminView({
  data,
  navigate,
  active,
  onTab,
}: {
  data: AdminDashboard;
  navigate: (to: string) => void;
  active: any;
  onTab: any;
}) {
  const { user, hero, kpis, pendingTasks, leaderboard } = data;
  const firstName = user.name.split(" ").slice(-1)[0];
  const top3 = [...leaderboard].sort((a, b) => a.rank - b.rank).slice(0, 3);

  return (
    <Screen activeTab={active} onTab={onTab}>
      <PageHeader title="Trang chủ" subtitle={`${getGreeting()}, ${firstName}`} />

      {/* Hero — Tổng HH chi PK tháng */}
      <div className="px-4 pb-2">
        <HeroCard
          label={hero.label}
          amount={hero.clinicCommission}
          variant="admin"
        />
      </div>

      {/* Quick metrics — PK aggregate */}
      <div className="grid grid-cols-2 gap-2.5 pt-3">
        <MetricCard
          label="Doanh số"
          value={fmtShort(kpis.totalRevenue)}
          delta={`${kpis.activeStaffCount} nhân viên`}
          tone="success"
          icon={metricRevenueIcon}
        />
        <MetricCard
          label="Đơn"
          value={`${kpis.closedDeals}/${kpis.totalDeals}`}
          delta="Đã chốt"
          icon={metricCustomersClosedIcon}
        />
      </div>

      {/* Cần xử lý — toàn PK */}
      <SectionTitle
        action={
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="text-[13px] font-semibold text-np-link"
          >
            Xem tất cả
          </button>
        }
      >
        Cần xử lý phòng khám ({pendingTasks.total})
      </SectionTitle>
      <PendingTasksCard tasks={pendingTasks} role={data.user.role} navigate={navigate} />

      {/* Top 3 leaderboard mini */}
      <SectionTitle
        action={
          <button
            type="button"
            onClick={() => navigate("/ranking")}
            className="text-[13px] font-semibold text-np-link"
          >
            Xem đầy đủ
          </button>
        }
      >
        Top 3 nhân viên
      </SectionTitle>
      <Card className="overflow-hidden p-0">
        {top3.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Users size={28} className="mx-auto text-np-border-strong" />
            <div className="mt-2 text-[12px] font-medium text-np-text-muted">
              Chưa có xếp hạng
            </div>
          </div>
        ) : (
          top3.map((p, i) => (
            <div
              key={p.id}
              className={
                "flex items-center gap-3 px-4 py-3" +
                (i === top3.length - 1 ? "" : " np-divider")
              }
            >
              <Medal
                size={20}
                strokeWidth={2.2}
                className="flex-shrink-0"
                style={{
                  color:
                    p.rank === 1
                      ? "var(--color-np-rank-vang)"
                      : p.rank === 2
                      ? "var(--color-np-rank-bac)"
                      : "var(--color-np-rank-dong)",
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-bold text-np-ink">{p.name}</div>
                <div className="truncate text-[11px] text-np-text-muted">
                  {ROLE_LABEL[p.role as UserRole] ?? p.role}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-[13px] font-bold text-np-ink tabular-nums">
                  {fmtShort(p.revenue)}₫
                </div>
                <div className="text-[11px] font-semibold text-np-brand-ink">
                  Hoa hồng {fmtShort(p.commission)}₫
                </div>
              </div>
            </div>
          ))
        )}
      </Card>

    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────
// Shared subcomponents
// ─────────────────────────────────────────────────────────────────

function HeroCard({
  label,
  amount,
  subtitle,
  showInfoPopover = false,
  variant = "personal",
  trendPct = null,
}: {
  label: string;
  amount: number;
  subtitle?: string;
  showInfoPopover?: boolean;
  variant?: "personal" | "admin";
  trendPct?: number | null;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-np-card p-[22px] text-white"
      style={{
        background:
          variant === "admin"
            ? "linear-gradient(135deg, #1A1C1D 0%, #303030 100%)"
            : "linear-gradient(135deg, #1A8A7D 0%, #0F5F56 100%)",
      }}
    >
      {/* Dấu hiệu nhận diện phòng khám thay cho hình tròn trang trí cũ. Tràn khỏi
          mép phải và mép trên nên chỉ thấy một phần, đủ nhận ra mà không giành chỗ
          của con số. aria-hidden vì đây là hoa văn, không phải thông tin. */}
      <img
        src={monogram}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 top-2 h-[104px] w-auto select-none opacity-[0.24]"
      />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <div className="text-[11px] font-bold text-white/85">
            {label}
          </div>
          {showInfoPopover && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Cách tính hoa hồng"
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-white/90 transition-colors hover:bg-white/25"
                >
                  <Info size={12} strokeWidth={2.25} />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={8}
                className="w-[280px] rounded-np-card border border-np-border p-0 text-np-ink"
              >
                <div className="np-divider px-4 pb-3 pt-4">
                  <p className="text-[14px] font-bold text-np-ink">Cách tính hoa hồng</p>
                  <p className="mt-0.5 text-[12px] text-np-text-muted">
                    Hoa hồng dự tính của tháng này
                  </p>
                </div>
                <div className="px-4 py-3">
                  <div className="text-[11px] leading-relaxed text-np-text-muted">
                    Tạm tính theo doanh số và tỷ lệ hoa hồng. Chốt sau khi hoàn tất và được duyệt.
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        {variant === "personal" && trendPct != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">
            {trendPct >= 0 ? (
              <TrendingUp size={12} strokeWidth={2.25} />
            ) : (
              <TrendingDown size={12} strokeWidth={2.25} />
            )}{" "}
            {trendPct >= 0 ? "+" : ""}
            {trendPct}%
          </span>
        )}
      </div>
      <div className="mt-3.5 flex items-baseline gap-1">
        <span className="text-[36px] font-extrabold leading-none tracking-[-1px] tabular-nums">
          {fmtFull(amount)}
        </span>
        <span className="text-base font-bold text-white/80">VNĐ</span>
      </div>
      {subtitle && (
        <div className="mt-2.5 text-[12px] font-medium text-white/75">{subtitle}</div>
      )}
    </div>
  );
}

function PendingTasksCard({
  tasks,
  role,
  navigate,
}: {
  tasks: PendingTasks;
  role: string;
  navigate: (to: string) => void;
}) {
  type Item = {
    key: string;
    label: string;
    subtitle: string;
    count: number;
    icon: typeof ClipboardList;
    onClick: () => void;
  };
  const items: Item[] = [
    {
      key: "pending",
      label: "Đơn chờ xác nhận",
      subtitle: "Cần xác nhận hoặc nhắc lịch",
      count: tasks.pendingOrders,
      icon: ClipboardList,
      onClick: () => navigate("/orders?status=pending"),
    },
  ];
  // Late 15 chỉ task vận hành — Sale + TC (R-9-1). BS/KT/CEO không cần.
  if (role === "sale" || role === "tc") {
    items.push({
      key: "late15",
      label: "Khách trễ",
      subtitle: "Cần gọi xác nhận",
      count: tasks.customersLate15min,
      icon: Clock,
      onClick: () => navigate("/orders?filter=late"),
    });
  }
  items.push({
    key: "recall",
    label: "Đến hạn tái khám",
    subtitle: "Trong 7 ngày tới",
    count: tasks.customersRecallDue,
    icon: Calendar,
    onClick: () => navigate("/recalls"),
  });

  return (
    <Card className="overflow-hidden p-0">
      {items.map((it, i) => (
        <Row
          key={it.key}
          leading={<IconTile icon={it.icon} />}
          title={
            <span className="flex items-center gap-1.5">
              <span>
                <span className="font-bold text-np-ink">{it.count}</span> {it.label.toLowerCase()}
              </span>
            </span>
          }
          subtitle={it.subtitle}
          trailing={<Chev />}
          onClick={it.onClick}
          last={i === items.length - 1}
        />
      ))}
    </Card>
  );
}

/**
 * Tông cho dòng chênh lệch dưới ô chỉ số.
 *
 * Chỉ tô màu khi nội dung THẬT SỰ là mức tăng giảm (bắt đầu bằng + hoặc -).
 * Chuỗi khác, ví dụ "5 nhân viên", là nhãn đếm chứ không phải kết quả tốt xấu
 * nên để trung tính.
 */
function toneDelta(delta: string, tone?: "neutral" | "success"): BadgeTone {
  if (delta.startsWith("-")) return "critical";
  if (delta.startsWith("+")) return tone === "success" ? "success" : "info";
  return "neutral";
}

function MetricCard({
  label,
  value,
  delta,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  delta: string | null;
  tone?: "neutral" | "success";
  icon?: string;
}) {
  return (
    <div className="bg-white px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[12px] font-medium text-np-text-sub">{label}</span>
          <div className="mt-0.5 truncate text-[18px] font-extrabold tracking-[-0.3px] text-np-ink tabular-nums">
            {value}
          </div>
        </div>
        {icon && (
          <img
            src={icon}
            alt=""
            width={36}
            height={36}
            className="flex-shrink-0"
            aria-hidden="true"
          />
        )}
      </div>
      {/* Tông đọc từ chính con số, không đọc từ prop `tone`: thẻ Doanh số truyền
          cứng tone="success" nên trước đây mức giảm "-8%" vẫn hiện xanh lá, tức
          màu nói ngược hẳn nội dung. */}
      {delta != null && (
        <Badge tone={toneDelta(delta, tone)} className="mt-1.5">
          {delta}
        </Badge>
      )}
    </div>
  );
}
