import { useQuayLai } from "@/lib/use-back";
import { Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "@/components/np/icon";
import { ArrowDownRight, ArrowUpRight, Layers } from "@/components/np/icon";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Badge,
  Card,
  DetailHeader,
  PageHeader,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";
import { authFetch, getCurrentUserId } from "@/lib/queryClient";
import { ROLE_LABEL, type UserRole } from "@shared/types";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
// Shape khớp GET /api/analytics/overview
// ─────────────────────────────────────────────────────────────────

type Kpi = { value: number; changePct: number | null };

type AnalyticsOverview = {
  cycle: string;
  kpis: {
    doanhThuThucThu: Kpi;
    soDonHoanThanh: Kpi;
    giaTriTbDon: Kpi;
    tyLeChot: Kpi;
  };
  doanhThuTheoNgay: { ngay: number; doanhThu: number; doanhThuKyTruoc: number }[];
  doanhThuTheoDichVu: { serviceName: string; doanhThu: number; tyTrong: number }[];
  dichVuBanChay: { serviceName: string; doanhThu: number; tyTrong: number }[];
  dichVuCham: { serviceName: string; doanhThu: number }[];
  doanhThuTheoNhanVien: { userId: number; name: string; role: string; doanhThu: number; hoaHong: number }[];
  doanhThuTheoNhom: { nhom: string; doanhThu: number }[];
  khach: { moi: number; quayLai: number };
  hoanTien: { tong: number; dichVu: { serviceName: string; hoanTien: number }[] };
  hoaHong: { tong: number; tyLeTrenDoanhThu: number };
};

const BAR_COLORS = ["#1A8A7D", "#22A594", "#34D399", "#6EE7B7", "#A7F3D0", "#D1FAE5"];

const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

function fmtShort(n: number) {
  // Triệu/tỷ giữ 1 chữ số thập phân, dấu phẩy kiểu VN (vd 7,3tr · 1,2tỷ); nghìn giữ nguyên.
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(".", ",") + "tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + "tr";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

/** Nhãn trục Y biểu đồ — số nguyên triệu/tỷ cho gọn (giữ như cũ, không thập phân). */
function fmtAxis(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(0) + "tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + "tr";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

/** "2026-06" → "Tháng 06/2026". */
function cycleLabel(cycle: string) {
  const [y, m] = cycle.split("-");
  return m && y ? `Tháng ${m}/${y}` : cycle;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export default function AnalyticsOverview() {
  const { active, onTab } = useTabNav();
  const quayLai = useQuayLai("/");

  // Chặn vai: chỉ quản lý (ceo/tc/kt) xem; vai khác về trang chủ (như admin-settings).
  const role = (typeof window !== "undefined"
    ? localStorage.getItem("np_role")
    : null) as UserRole | null;
  const canView = role === "ceo" || role === "tc" || role === "kt";
  if (typeof window !== "undefined" && !canView) {
    return <Redirect to="/" />;
  }

  const { data, isLoading } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/analytics/overview", getCurrentUserId()],
    enabled: canView,
    queryFn: async () => {
      const res = await authFetch("/api/analytics/overview");
      if (!res.ok) throw new Error("fetch_failed");
      return res.json();
    },
  });

  if (isLoading || !data) {
    return (
      <Screen activeTab={active} onTab={onTab} noHeader>
        <DetailHeader title="Phân tích tổng quan" onBack={quayLai} trailing={<div />} />
        <div className="flex flex-1 items-center justify-center py-20">
          {isLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
          ) : (
            <p className="text-np-text-muted">Chưa có dữ liệu phân tích</p>
          )}
        </div>
      </Screen>
    );
  }

  const { kpis, doanhThuTheoNgay, doanhThuTheoDichVu, dichVuBanChay, dichVuCham } = data;
  const { doanhThuTheoNhanVien, doanhThuTheoNhom, khach, hoanTien, hoaHong } = data;

  const lineData = doanhThuTheoNgay.map((d) => ({
    day: String(d.ngay).padStart(2, "0"),
    current: d.doanhThu,
    previous: d.doanhThuKyTruoc,
  }));

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Phân tích tổng quan" onBack={quayLai} trailing={<div />} />

      <div className="min-h-full flow-root bg-np-bg">
        <PageHeader
          title="Tổng quan"
          subtitle="Doanh thu và chỉ số chính"
          action={<Badge tone="neutral">{cycleLabel(data.cycle)}</Badge>}
        />

        {/* KPI cards — số thật theo kỳ */}
        <div className="np-divide bg-white">
          <KpiCard
            title="Doanh thu thực thu"
            display={fmtVND(kpis.doanhThuThucThu.value)}
            changePct={kpis.doanhThuThucThu.changePct}
          />
          <KpiCard
            title="Số đơn hoàn thành"
            display={kpis.soDonHoanThanh.value.toLocaleString("vi-VN")}
            changePct={kpis.soDonHoanThanh.changePct}
          />
          <KpiCard
            title="Giá trị trung bình mỗi đơn"
            display={fmtVND(kpis.giaTriTbDon.value)}
            changePct={kpis.giaTriTbDon.changePct}
          />
          <KpiCard
            title="Tỷ lệ chốt"
            display={`${kpis.tyLeChot.value}%`}
            changePct={kpis.tyLeChot.changePct}
            note="Đơn khám xong / tổng đơn tạo trong kỳ"
          />
        </div>

        {/* Line chart — doanh thu theo ngày, kỳ này vs kỳ trước */}
        <SectionTitle>Doanh thu theo thời gian</SectionTitle>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-5 rounded-full bg-np-brand-ink" />
              <span className="text-[11px] text-np-text-muted">Kỳ hiện tại</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-0 w-5" style={{ borderTop: "1px dashed var(--color-np-border-strong)" }} />
              <span className="text-[11px] text-np-text-muted">Kỳ trước</span>
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-np-border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                  axisLine={{ stroke: "var(--color-np-border)" }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tickFormatter={fmtAxis}
                  tick={{ fontSize: 10, fill: "var(--color-np-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-np-ink)",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "#fff",
                    padding: "8px 12px",
                  }}
                  formatter={(value: number, name: string) => [
                    fmtVND(value),
                    name === "current" ? "Kỳ hiện tại" : "Kỳ trước",
                  ]}
                  labelFormatter={(label) => `Ngày ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke="var(--color-np-brand-ink)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "var(--color-np-brand-ink)", stroke: "#fff", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="var(--color-np-border-strong)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Doanh thu theo dịch vụ — giá niêm yết theo dòng dịch vụ */}
        <SectionTitle>Doanh thu theo dịch vụ</SectionTitle>
        <Card className="p-4">
          <ListedNote />
          <RevenueBars items={doanhThuTheoDichVu.map((s) => ({ label: s.serviceName, value: s.doanhThu, sub: `${s.tyTrong}%` }))} />
        </Card>

        {/* Dịch vụ bán chạy */}
        <SectionTitle>Dịch vụ bán chạy</SectionTitle>
        <Card className="overflow-hidden p-0">
          {dichVuBanChay.length === 0 ? (
            <Empty />
          ) : (
            dichVuBanChay.map((s, i) => (
              <div
                key={s.serviceName + i}
                className={
                  "flex items-center gap-3 px-4 py-3" +
                  (i === dichVuBanChay.length - 1 ? "" : " np-divider")
                }
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-np-surface-sub text-[13px] font-bold text-np-text-sub">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-np-ink">{s.serviceName}</p>
                  <p className="text-[11px] text-np-text-muted tabular-nums">{s.tyTrong}% doanh thu</p>
                </div>
                <span className="flex-shrink-0 text-[14px] font-bold text-np-ink tabular-nums">
                  {fmtShort(s.doanhThu)}đ
                </span>
              </div>
            ))
          )}
        </Card>

        {/* Dịch vụ chậm — không phát sinh trong kỳ */}
        {dichVuCham.length > 0 && (
          <Card className="mt-2.5 p-4">
            <p className="mb-2 text-[12px] font-semibold text-np-text-sub">
              Dịch vụ chưa phát sinh trong kỳ ({dichVuCham.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {dichVuCham.map((s) => (
                <span
                  key={s.serviceName}
                  className="rounded-full border border-np-border bg-np-surface-sub px-2.5 py-1 text-[11px] text-np-text-muted"
                >
                  {s.serviceName}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Doanh thu theo nhân viên */}
        <SectionTitle>Doanh thu theo nhân viên</SectionTitle>
        <Card className="overflow-hidden p-0">
          {doanhThuTheoNhanVien.length === 0 ? (
            <Empty />
          ) : (
            doanhThuTheoNhanVien.map((nv, i) => (
              <div
                key={nv.userId}
                className={
                  "flex items-center gap-3 px-4 py-3" +
                  (i === doanhThuTheoNhanVien.length - 1 ? "" : " np-divider")
                }
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-np-ink">{nv.name}</p>
                  <p className="text-[11px] text-np-text-muted">
                    {ROLE_LABEL[nv.role as UserRole] ?? nv.role}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[14px] font-bold text-np-ink tabular-nums">{fmtShort(nv.doanhThu)}đ</p>
                  <p className="text-[11px] text-np-text-muted tabular-nums">Hoa hồng {fmtShort(nv.hoaHong)}đ</p>
                </div>
              </div>
            ))
          )}
        </Card>

        {/* Doanh thu theo nhóm dịch vụ */}
        <SectionTitle>Doanh thu theo nhóm dịch vụ</SectionTitle>
        <Card className="p-4">
          <ListedNote />
          <RevenueBars items={doanhThuTheoNhom.map((g) => ({ label: g.nhom, value: g.doanhThu }))} />
        </Card>

        {/* Khách */}
        <SectionTitle>Khách trong kỳ</SectionTitle>
        <div className="np-divide bg-white">
          <StatCard label="Khách mới" value={khach.moi.toLocaleString("vi-VN")} />
          <StatCard label="Khách quay lại" value={khach.quayLai.toLocaleString("vi-VN")} />
        </div>

        {/* Hoàn tiền */}
        <SectionTitle>Hoàn tiền</SectionTitle>
        <Card className="p-4">
          <div className="mb-1 flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-np-text-muted">
              Tổng tiền hoàn trong kỳ
            </p>
            <p className="text-[20px] font-extrabold text-np-ink tabular-nums">{fmtVND(hoanTien.tong)}</p>
          </div>
          {hoanTien.dichVu.length === 0 ? (
            <p className="mt-2 text-center text-[12px] italic text-np-text-muted">
              Chưa có hoàn tiền trong kỳ
            </p>
          ) : (
            <div className="mt-3 space-y-2 border-t border-np-surface-pressed pt-3">
              {hoanTien.dichVu.map((s) => (
                <div key={s.serviceName} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] text-np-ink">{s.serviceName}</span>
                  <span className="flex-shrink-0 text-[13px] font-bold text-np-danger tabular-nums">
                    {fmtShort(s.hoanTien)}đ
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Hoa hồng */}
        <SectionTitle>Hoa hồng</SectionTitle>
        <div className="np-divide bg-white">
          <StatCard label="Tổng hoa hồng" value={fmtShort(hoaHong.tong) + "đ"} />
          <StatCard label="Tỷ lệ trên doanh thu" value={`${hoaHong.tyLeTrenDoanhThu}%`} />
        </div>

      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function ChangePill({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="rounded-full bg-np-surface-sub px-1.5 py-0.5 text-[10px] font-bold text-np-text-muted">
        -
      </span>
    );
  }
  const isPositive = pct >= 0;
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
        // Đọc token badge cho khớp bộ màu chung, thay vì cặp brand và danger
        // riêng của pill này.
        isPositive
          ? "bg-np-badge-success-bg text-np-badge-success-fg"
          : "bg-np-badge-critical-bg text-np-badge-critical-fg",
      )}
    >
      {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {isPositive ? "+" : ""}
      {pct}%
    </div>
  );
}

function KpiCard({
  title,
  display,
  changePct,
  note,
}: {
  title: string;
  display: string;
  changePct: number | null;
  note?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 bg-white px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-np-text-muted">{title}</p>
        <h3 className="mt-0.5 text-[22px] font-extrabold tracking-[-0.4px] text-np-ink tabular-nums">
          {display}
        </h3>
        {note && <p className="mt-1 text-[11px] leading-tight text-np-text-muted">{note}</p>}
      </div>
      <ChangePill pct={changePct} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-white px-4 py-3.5">
      <p className="text-[11px] font-bold text-np-text-muted">{label}</p>
      <h3 className="text-[20px] font-extrabold tracking-[-0.4px] text-np-ink tabular-nums">
        {value}
      </h3>
    </div>
  );
}

/** Bars doanh thu (dùng cho theo dịch vụ + theo nhóm). */
function RevenueBars({ items }: { items: { label: string; value: number; sub?: string }[] }) {
  if (items.length === 0) return <Empty />;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={it.label + i}>
          <div className="mb-1 flex items-center justify-between">
            <span className="truncate text-[13px] font-medium text-np-ink">{it.label}</span>
            <div className="flex flex-shrink-0 items-center gap-2 tabular-nums">
              <span className="text-[12px] font-bold text-np-ink">{fmtShort(it.value)}đ</span>
              {it.sub && <span className="text-[11px] font-medium text-np-text-muted">{it.sub}</span>}
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-np-surface-sub">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${max > 0 ? (it.value / max) * 100 : 0}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Ghi chú: doanh thu theo giá niêm yết, khác doanh thu thực thu. */
function ListedNote() {
  return (
    <p className="mb-3 flex items-start gap-1.5 text-[11px] leading-snug text-np-text-muted">
      <Layers size={13} className="mt-0.5 flex-shrink-0" />
      Theo giá niêm yết từng dịch vụ. Tổng có thể khác mục Doanh thu thực thu, đã trừ bảo hiểm và phiếu giảm giá.
    </p>
  );
}

function Empty() {
  return <div className="px-4 py-8 text-center text-[13px] text-np-text-muted">Chưa có dữ liệu trong kỳ</div>;
}
