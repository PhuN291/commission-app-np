import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, ClipboardList, Gift, Info, TrendingUp, Trophy } from "lucide-react";
import {
  Avatar,
  Badge,
  Card,
  Chev,
  IconTile,
  NPProgress,
  OrderStatusBadges,
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

type DashboardOrder = {
  id: number;
  code: string;
  serviceName: string;
  serviceCode: string;
  patientName: string;
  totalPrice: number;
  commission: number;
  appointmentStatus: string;
  visitStatus: string | null;
  createdAt: string;
};

type DashboardData = {
  user: {
    id: number;
    name: string;
    role: string;
    department: string;
    avatar: string | null;
    targetRevenue: number;
    currentRevenue: number;
    commissionRate: number;
  };
  recentOrders: DashboardOrder[];
  pendingOrdersCount: number;
};

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
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + " tr";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
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

export default function Dashboard() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<DashboardData>({ queryKey: ["/api/dashboard"] });

  if (isLoading || !data) {
    return (
      <Screen activeTab={active} onTab={onTab}>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
            <p className="text-np-sub text-np-text-muted">Đang tải dữ liệu...</p>
          </div>
        </div>
      </Screen>
    );
  }

  const { user, recentOrders, pendingOrdersCount } = data;
  const commission = user.currentRevenue * (user.commissionRate / 100);
  const rank = getRank(user.currentRevenue);
  const rankProgress = rank.next
    ? ((user.currentRevenue - rank.min) / (rank.nextMin - rank.min)) * 100
    : 100;
  const remaining = rank.next ? rank.nextMin - user.currentRevenue : 0;
  const targetPct = Math.round((user.currentRevenue / user.targetRevenue) * 100);
  const firstName = user.name.split(" ").slice(-1)[0];
  const totalDeals = recentOrders.length;
  const completedDeals = recentOrders.filter((o) => o.visitStatus === "completed").length;

  return (
    <Screen activeTab={active} onTab={onTab} notifCount={3} onBell={() => navigate("/notifications")}>
      <PageHeader
        title="Trang chủ"
        subtitle={`${getGreeting()}, ${firstName}`}
      />

      {/* Hero: Hoa hồng tạm tính */}
      <div className="px-4 pb-2">
        <div
          className="relative overflow-hidden rounded-np-card p-[22px] text-white"
          style={{ background: "linear-gradient(135deg, #1A8A7D 0%, #0F5F56 100%)" }}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-white/85">
                Hoa hồng tạm tính
              </div>
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
                  <div className="border-b border-np-surface-pressed px-4 pb-3 pt-4">
                    <p className="text-[14px] font-bold text-np-ink">Cách tính hoa hồng</p>
                    <p className="mt-0.5 text-[12px] text-np-text-muted">
                      Hoa hồng tạm tính theo doanh thu trong kỳ
                    </p>
                  </div>
                  <div className="space-y-3 px-4 py-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
                        Công thức
                      </p>
                      <p className="mt-1 text-[13px] font-semibold text-np-ink">
                        Doanh thu × Tỉ lệ hoa hồng
                      </p>
                    </div>
                    <div className="border-t border-np-surface-pressed pt-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
                        Tỉ lệ theo cấp bậc
                      </p>
                      <ul className="mt-1.5 space-y-1 text-[12px] text-np-text-sub">
                        <li className="flex justify-between">
                          <span>Đồng (dưới 20 triệu)</span>
                          <span className="font-bold text-np-ink tabular-nums">3%</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Bạc (20–50 triệu)</span>
                          <span className="font-bold text-np-ink tabular-nums">5%</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Vàng (50–100 triệu)</span>
                          <span className="font-bold text-np-ink tabular-nums">6%</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Kim cương (trên 100 triệu)</span>
                          <span className="font-bold text-np-ink tabular-nums">8%</span>
                        </li>
                      </ul>
                    </div>
                    <div className="border-t border-np-surface-pressed pt-3 text-[11px] leading-relaxed text-np-text-muted">
                      Hoa hồng hiển thị là <span className="font-bold text-np-ink">tạm tính</span>
                      , sẽ chốt khi đơn chuyển trạng thái "Hoàn tất" và được duyệt chi trả cuối kỳ.
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">
              <TrendingUp size={12} strokeWidth={2.25} /> +12.5%
            </span>
          </div>
          <div className="mt-3.5 flex items-baseline gap-1">
            <span className="text-[36px] font-extrabold leading-none tracking-[-1px] tabular-nums">
              {fmtFull(commission)}
            </span>
            <span className="text-base font-bold text-white/80">VNĐ</span>
          </div>
          <div className="mt-2.5 text-[12px] font-medium text-white/75">
            Dựa trên {totalDeals} đơn hàng · Tỉ lệ {user.commissionRate}%
          </div>
        </div>
      </div>

      {/* Quick metrics */}
      <div className="grid grid-cols-2 gap-2.5 px-4 pt-3">
        <MetricCard label="Doanh số" value={fmtShort(user.currentRevenue)} delta="+8.2%" tone="success" />
        <MetricCard label="Đã chốt" value={`${completedDeals}/${totalDeals}`} delta={`${targetPct}% KPI`} />
      </div>

      {/* Cần xử lý */}
      <SectionTitle
        action={
          <button type="button" onClick={() => navigate("/orders")} className="text-[13px] font-semibold text-np-link">
            Xem tất cả
          </button>
        }
      >
        Cần xử lý
      </SectionTitle>
      <Card className="overflow-hidden p-0">
        <Row
          leading={<IconTile icon={ClipboardList} />}
          title={`${pendingOrdersCount} đơn chờ xử lý`}
          subtitle="Cần xác nhận hoặc nhắc lịch"
          trailing={<Chev />}
          onClick={() => navigate("/orders?status=pending")}
        />
        <Row
          leading={<IconTile icon={Bell} />}
          title="3 khách cần tái khám"
          subtitle="Trong 7 ngày tới"
          trailing={<Chev />}
          onClick={() => navigate("/customers")}
          last
        />
      </Card>

      {/* Thành tích tháng */}
      <SectionTitle>Thành tích tháng</SectionTitle>
      <Card className="p-4">
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-[14px]"
            style={{ width: 52, height: 52, background: rank.bg }}
          >
            <Trophy size={26} strokeWidth={2.2} style={{ color: rank.color }} />
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
                  Lên {rank.next}: HH {RANK_REWARDS[rank.next].commission}%
                  {RANK_REWARDS[rank.next].bonus > 0
                    ? ` · thưởng ${fmtFull(RANK_REWARDS[rank.next].bonus)}₫`
                    : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Đơn gần đây */}
      <SectionTitle
        action={
          <button type="button" onClick={() => navigate("/orders")} className="text-[13px] font-semibold text-np-link">
            Xem tất cả
          </button>
        }
      >
        Đơn gần đây
      </SectionTitle>
      <Card className="overflow-hidden p-0">
        {recentOrders.map((o, i) => (
          <Row
            key={o.id}
            onClick={() => navigate(`/orders/${o.id}`)}
            leading={<Avatar name={o.patientName} size={38} />}
            title={o.patientName}
            subtitle={`${o.serviceName} · ${o.createdAt}`}
            meta={
              <div className="mt-1.5">
                <OrderStatusBadges appointmentStatus={o.appointmentStatus} visitStatus={o.visitStatus} />
              </div>
            }
            trailing={
              <div className="flex-shrink-0 text-right">
                <div className="text-[14px] font-bold text-np-ink tabular-nums">
                  {fmtShort(o.totalPrice)}₫
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-np-brand-ink">
                  +{fmtShort(o.commission)}₫
                </div>
              </div>
            }
            last={i === recentOrders.length - 1}
          />
        ))}
      </Card>

      <div className="h-5" />
    </Screen>
  );
}

function MetricCard({
  label,
  value,
  delta,
  tone = "neutral",
}: {
  label: string;
  value: string;
  delta: string;
  tone?: "neutral" | "success";
}) {
  return (
    <div className="rounded-np-card bg-white px-3.5 pb-3 pt-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.8px] text-np-text-muted">
          {label}
        </span>
      </div>
      <div className="mt-1.5 text-[22px] font-extrabold tracking-[-0.4px] text-np-ink tabular-nums">
        {value}
      </div>
      <Badge tone={tone === "success" ? "success" : "neutral"} className="mt-1">
        {delta}
      </Badge>
    </div>
  );
}
