import { Redirect, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Repeat,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  DetailHeader,
  PageHeader,
  Screen,
  SectionTitle,
  useTabNav,
  Badge,
} from "@/components/np";
import { authFetch, getCurrentUserId } from "@/lib/queryClient";
import { type UserRole } from "@shared/types";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
// Shape khớp GET /api/analytics/appointments
// ─────────────────────────────────────────────────────────────────

type Kpi = { value: number; changePct: number | null };

type AppointmentsAnalytics = {
  cycle: string;
  kpis: {
    tongLichHen: Kpi;
    tyLeDenKham: Kpi;
    tyLeKhongDen: Kpi;
    tyLeTaiKham: Kpi;
  };
  theoNgay: { ngay: number; tong: number; hoanThanh: number; khongDen: number }[];
  theoKhungGio: { khung: string; so: number }[];
  phanBoTrangThai: { code: string; ten: string; so: number }[];
  khongDen: { tyLe: number; xuHuong: { thang: string; tyLe: number }[] };
  taiKham: { canGoi: number; daDatLai: number; tuChoi: number; chuaLienHe: number };
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#D97706",
  CONFIRMED: "#34D399",
  IN_PROGRESS: "#1E40AF",
  COMPLETED: "#008060",
  NO_SHOW: "#D72C0D",
  CANCELLED: "#8C9196",
};

const NO_SHOW_TARGET = 5; // mục tiêu < 5%

/** "2026-06" → "Tháng 06/2026". */
function cycleLabel(cycle: string) {
  const [y, m] = cycle.split("-");
  return m && y ? `Tháng ${m}/${y}` : cycle;
}

/** "2026-02" → "T2" (nhãn trục xu hướng). */
function monthLabel(thang: string) {
  const m = thang.split("-")[1];
  return m ? `T${Number(m)}` : thang;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export default function AnalyticsAppointments() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();

  // Chặn vai: chỉ quản lý (ceo/tc/kt) xem; vai khác về trang chủ.
  const role = (typeof window !== "undefined"
    ? localStorage.getItem("np_role")
    : null) as UserRole | null;
  const canView = role === "ceo" || role === "tc" || role === "kt";
  if (typeof window !== "undefined" && !canView) {
    return <Redirect to="/" />;
  }

  const { data, isLoading } = useQuery<AppointmentsAnalytics>({
    queryKey: ["/api/analytics/appointments", getCurrentUserId()],
    enabled: canView,
    queryFn: async () => {
      const res = await authFetch("/api/analytics/appointments");
      if (!res.ok) throw new Error("fetch_failed");
      return res.json();
    },
  });

  if (isLoading || !data) {
    return (
      <Screen activeTab={active} onTab={onTab} noHeader>
        <DetailHeader title="Lịch hẹn" onBack={() => navigate("/")} trailing={<div />} />
        <div className="flex flex-1 items-center justify-center py-20">
          {isLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
          ) : (
            <p className="text-np-text-muted">Chưa có dữ liệu lịch hẹn</p>
          )}
        </div>
      </Screen>
    );
  }

  const { kpis, theoNgay, theoKhungGio, phanBoTrangThai, khongDen, taiKham } = data;

  const lineData = theoNgay.map((d) => ({
    day: String(d.ngay).padStart(2, "0"),
    total: d.tong,
    completed: d.hoanThanh,
    noShow: d.khongDen,
  }));
  const hourData = theoKhungGio.map((h) => ({ hour: h.khung, count: h.so }));
  const maxHourly = Math.max(...hourData.map((h) => h.count), 0);
  const donutData = phanBoTrangThai.map((s) => ({
    name: s.ten,
    value: s.so,
    color: STATUS_COLORS[s.code] ?? "#8C9196",
  }));
  const totalStatus = donutData.reduce((s, d) => s + d.value, 0);
  const trendData = khongDen.xuHuong.map((x) => ({ month: monthLabel(x.thang), rate: x.tyLe }));

  // Đồng hồ tỷ lệ không đến
  const noShowRate = khongDen.tyLe;
  const gaugeAngle = Math.min((noShowRate / 15) * 180, 180);
  const gaugeColor =
    noShowRate <= 5
      ? "var(--color-np-brand-ink)"
      : noShowRate <= 10
        ? "var(--color-np-warning)"
        : "var(--color-np-danger)";

  // Khối tái khám
  const taiKhamRows = [
    { label: "Cần gọi", value: taiKham.canGoi, color: "var(--color-np-brand-ink)" },
    { label: "Đã đặt lại", value: taiKham.daDatLai, color: "#008060" },
    { label: "Chưa liên hệ", value: taiKham.chuaLienHe, color: "#D97706" },
    { label: "Từ chối", value: taiKham.tuChoi, color: "#D72C0D" },
  ];
  const taiKhamMax = Math.max(...taiKhamRows.map((r) => r.value), 0);
  const taiKhamTong = taiKhamRows.reduce((s, r) => s + r.value, 0);

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Lịch hẹn" onBack={() => navigate("/")} trailing={<div />} />

      <div className="bg-np-surface-sub pb-5">
        <PageHeader
          title="Lịch hẹn"
          subtitle="Xu hướng và tỷ lệ hoàn thành"
          action={<Badge tone="neutral">{cycleLabel(data.cycle)}</Badge>}
        />

        {/* KPI */}
        <div className="grid grid-cols-2 gap-2.5 px-4">
          <KpiCard
            title="Tổng lịch hẹn"
            display={kpis.tongLichHen.value.toLocaleString("vi-VN")}
            changePct={kpis.tongLichHen.changePct}
            icon={Calendar}
          />
          <KpiCard
            title="Tỷ lệ đến khám"
            display={`${kpis.tyLeDenKham.value}%`}
            changePct={kpis.tyLeDenKham.changePct}
            icon={CheckCircle2}
          />
          <KpiCard
            title="Tỷ lệ không đến"
            display={`${kpis.tyLeKhongDen.value}%`}
            changePct={kpis.tyLeKhongDen.changePct}
            icon={XCircle}
            invertChange
            warn={kpis.tyLeKhongDen.value > NO_SHOW_TARGET}
          />
          <KpiCard
            title="Tỷ lệ tái khám"
            display={`${kpis.tyLeTaiKham.value}%`}
            changePct={kpis.tyLeTaiKham.changePct}
            icon={Repeat}
            note="Theo lượt đến hạn trong kỳ"
          />
        </div>

        {/* Xu hướng theo ngày */}
        <SectionTitle>Xu hướng theo ngày</SectionTitle>
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <LegendItem color="var(--color-np-brand-ink)" label="Tổng" />
            <LegendItem color="#34D399" label="Hoàn thành" />
            <LegendItem color="var(--color-np-danger)" label="Không đến" dashed />
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-np-border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                  axisLine={{ stroke: "var(--color-np-border)" }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [
                    value,
                    name === "total" ? "Tổng" : name === "completed" ? "Hoàn thành" : "Không đến",
                  ]}
                  labelFormatter={(label) => `Ngày ${label}`}
                />
                <Line type="monotone" dataKey="total" stroke="var(--color-np-brand-ink)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="completed" stroke="#34D399" strokeWidth={1.5} dot={false} />
                <Line
                  type="monotone"
                  dataKey="noShow"
                  stroke="var(--color-np-danger)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Phân bố theo khung giờ */}
        <SectionTitle>Phân bố theo khung giờ</SectionTitle>
        <Card className="p-4">
          {hourData.length === 0 ? (
            <Empty>Chưa có lịch hẹn đặt giờ trong kỳ</Empty>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-np-border)" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 9, fill: "var(--color-np-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} lịch`, "Số lượng"]} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={32}>
                    {hourData.map((entry, i) => (
                      <Cell key={i} fill={entry.count === maxHourly && maxHourly > 0 ? "var(--color-np-brand-ink)" : "#A7F3D0"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Phân bố trạng thái */}
        <SectionTitle>Phân bố trạng thái</SectionTitle>
        <Card className="p-4">
          {totalStatus === 0 ? (
            <Empty>Chưa có lịch hẹn trong kỳ</Empty>
          ) : (
            <>
              <div className="flex items-center justify-center">
                <div className="h-[160px] w-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData.filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {donutData.filter((d) => d.value > 0).map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number, name: string) => [
                          `${value} (${((value / totalStatus) * 100).toFixed(1)}%)`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {donutData.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="flex-1 text-[13px] text-np-ink">{s.name}</span>
                    <span className="text-[13px] font-bold text-np-ink tabular-nums">{s.value}</span>
                    <span className="w-10 text-right text-[11px] text-np-text-muted">
                      {((s.value / totalStatus) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Phân tích không đến */}
        <SectionTitle>Phân tích không đến</SectionTitle>
        <Card className="space-y-4 p-4">
          <div className="flex flex-col items-center">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
              Tỷ lệ hiện tại
            </p>
            <div className="relative h-[100px] w-[200px]">
              <svg viewBox="0 0 200 110" className="h-full w-full">
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--color-np-border)" strokeWidth="14" strokeLinecap="round" />
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke={gaugeColor}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${(gaugeAngle / 180) * 251} 251`}
                />
              </svg>
              <div className="absolute bottom-0 left-0 right-0 text-center">
                <p className="text-[28px] font-extrabold tabular-nums" style={{ color: gaugeColor }}>
                  {noShowRate}%
                </p>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-np-text-muted">
              Mục tiêu &lt; {NO_SHOW_TARGET}%{" "}
              <span className={cn("font-bold", noShowRate <= NO_SHOW_TARGET ? "text-np-brand-ink" : "text-np-danger")}>
                ({noShowRate <= NO_SHOW_TARGET ? "Đạt" : "Chưa đạt"})
              </span>
            </p>
          </div>

          <div className="border-t border-np-surface-pressed pt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
              Xu hướng 6 tháng
            </p>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-np-border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 15]}
                    tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, "Không đến"]} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="var(--color-np-danger)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-np-danger)", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Tái khám */}
        <SectionTitle>Tái khám</SectionTitle>
        <Card className="space-y-3 p-4">
          <p className="text-[11px] leading-snug text-np-text-muted">
            Đếm theo lượt tái khám đến hạn trong kỳ (khác Tổng lịch hẹn tính theo đơn tạo trong kỳ).
          </p>
          {taiKhamTong === 0 ? (
            <Empty>Chưa có lượt tái khám đến hạn trong kỳ</Empty>
          ) : (
            <>
              {taiKhamRows.map((r) => (
                <div key={r.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[12px] text-np-text-sub">{r.label}</span>
                    <span className="text-[13px] font-bold text-np-ink tabular-nums">{r.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-np-surface-sub">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${taiKhamMax > 0 ? (r.value / taiKhamMax) * 100 : 0}%`, backgroundColor: r.color }}
                    />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-np-surface-pressed pt-2">
                <span className="text-[12px] font-bold text-np-text-sub">Tỷ lệ đặt lại</span>
                <span className="text-[15px] font-bold text-np-brand-ink">{kpis.tyLeTaiKham.value}%</span>
              </div>
            </>
          )}
        </Card>

        <div className="h-5" />
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

const tooltipStyle = {
  background: "var(--color-np-ink)",
  border: "none",
  borderRadius: 10,
  fontSize: 12,
  color: "#fff",
  padding: "6px 10px",
} as const;

function ChangePill({ pct, invert }: { pct: number | null; invert?: boolean }) {
  if (pct === null) {
    return (
      <span className="rounded-full bg-np-surface-sub px-1.5 py-0.5 text-[10px] font-bold text-np-text-muted">
        -
      </span>
    );
  }
  const up = pct >= 0;
  const good = invert ? !up : up; // không đến: giảm là tốt
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
        good ? "bg-np-brand-soft text-np-brand-ink" : "bg-np-danger-bg text-np-danger",
      )}
    >
      {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {up ? "+" : ""}
      {pct}%
    </div>
  );
}

function KpiCard({
  title,
  display,
  changePct,
  icon: Icon,
  note,
  invertChange,
  warn,
}: {
  title: string;
  display: string;
  changePct: number | null;
  icon: LucideIcon;
  note?: string;
  invertChange?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-np-card bg-white p-3.5">
      <div className="mb-2 flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            warn ? "bg-np-danger-bg" : "bg-np-brand-soft",
          )}
        >
          <Icon size={18} strokeWidth={2} className={warn ? "text-np-danger" : "text-np-brand-ink"} />
        </div>
        <ChangePill pct={changePct} invert={invertChange} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">{title}</p>
      <p className={cn("mt-0.5 text-[20px] font-extrabold tabular-nums", warn ? "text-np-danger" : "text-np-ink")}>
        {display}
      </p>
      {note && <p className="mt-1 text-[10px] leading-tight text-np-text-muted">{note}</p>}
    </div>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-0.5 w-5 rounded-full"
        style={{
          backgroundColor: dashed ? "transparent" : color,
          borderTop: dashed ? `1px dashed ${color}` : undefined,
        }}
      />
      <span className="text-[11px] text-np-text-muted">{label}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-8 text-center text-[13px] text-np-text-muted">{children}</div>;
}
