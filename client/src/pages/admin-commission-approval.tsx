import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Banknote,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
} from "lucide-react";
import {
  Badge,
  Card,
  Chips,
  DetailHeader,
  NPButton,
  PageHeader,
  Screen,
  SectionTitle,
  useTabNav,
  type BadgeTone,
  type ChipItem,
} from "@/components/np";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import DateRangeFilter, { getPresetRange } from "@/components/date-range-filter";
import { cn } from "@/lib/utils";

type ApprovalStatus = "confirmed" | "paid";

interface OrderDetail {
  id: number;
  code: string;
  date: string;
  totalBill: number;
  netProfit: number;
  commissionRate: number;
  commissionAmount: number;
}

interface StaffCommission {
  id: number;
  name: string;
  role: string;
  orderCount: number;
  totalCommission: number;
  status: ApprovalStatus;
  orders: OrderDetail[];
}

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; tone: BadgeTone }> = {
  confirmed: { label: "Chờ chi", tone: "attention" },
  paid: { label: "Đã chi", tone: "success" },
};

const ROLE_OPTIONS = ["all", "Bác sĩ", "Điều dưỡng", "Lễ tân", "CSKH"];

const STATUS_CHIPS: ChipItem[] = [
  { key: "all", label: "Tất cả" },
  { key: "confirmed", label: "Chờ chi" },
  { key: "paid", label: "Đã chi" },
];

const initialData: StaffCommission[] = [
  {
    id: 1,
    name: "BS. Nguyễn Văn An",
    role: "Bác sĩ",
    orderCount: 3,
    totalCommission: 775_000,
    status: "confirmed",
    orders: [
      { id: 5, code: "#NP260214002", date: "2026-03-20", totalBill: 7_000_000, netProfit: 4_500_000, commissionRate: 5, commissionAmount: 350_000 },
      { id: 6, code: "#NP260215001", date: "2026-03-25", totalBill: 4_500_000, netProfit: 3_000_000, commissionRate: 5, commissionAmount: 225_000 },
      { id: 7, code: "#NP260220001", date: "2026-03-28", totalBill: 4_000_000, netProfit: 2_600_000, commissionRate: 5, commissionAmount: 200_000 },
    ],
  },
  {
    id: 2,
    name: "BS. Trần Thị Bình",
    role: "Bác sĩ",
    orderCount: 2,
    totalCommission: 185_000,
    status: "confirmed",
    orders: [
      { id: 2, code: "#NP260213002", date: "2026-03-18", totalBill: 1_200_000, netProfit: 800_000, commissionRate: 5, commissionAmount: 60_000 },
      { id: 4, code: "#NP260214001", date: "2026-03-22", totalBill: 2_500_000, netProfit: 1_600_000, commissionRate: 5, commissionAmount: 125_000 },
    ],
  },
  {
    id: 3,
    name: "ĐD. Lê Minh Châu",
    role: "Điều dưỡng",
    orderCount: 2,
    totalCommission: 65_000,
    status: "confirmed",
    orders: [
      { id: 1, code: "#NP260213001", date: "2026-03-15", totalBill: 500_000, netProfit: 350_000, commissionRate: 3, commissionAmount: 25_000 },
      { id: 3, code: "#NP260213003", date: "2026-03-19", totalBill: 800_000, netProfit: 520_000, commissionRate: 3, commissionAmount: 40_000 },
    ],
  },
  {
    id: 4,
    name: "LT. Hoàng Văn Em",
    role: "Lễ tân",
    orderCount: 1,
    totalCommission: 17_500,
    status: "paid",
    orders: [
      { id: 8, code: "#NP260225001", date: "2026-03-25", totalBill: 350_000, netProfit: 230_000, commissionRate: 1, commissionAmount: 17_500 },
    ],
  },
];

export default function AdminCommissionApproval() {
  const { active: navActive, onTab: onNavTab } = useTabNav();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [data, setData] = useState<StaffCommission[]>(initialData);

  const [dateRange, setDateRange] = useState("last_30_days");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const dateFiltered = useMemo(() => {
    const { from, to } = getPresetRange(dateRange);
    return data.filter((s) =>
      s.orders.some((o) => {
        const d = new Date(o.date);
        d.setHours(0, 0, 0, 0);
        return d >= from && d <= to;
      }),
    );
  }, [data, dateRange]);

  const filtered = useMemo(() => {
    return dateFiltered.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (roleFilter !== "all" && s.role !== roleFilter) return false;
      return true;
    });
  }, [dateFiltered, statusFilter, roleFilter]);

  const allSelectableIds = filtered.map((s) => s.id);
  const allSelected =
    allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedIds.has(id));
  const canPay = filtered.filter((s) => selectedIds.has(s.id) && s.status === "confirmed");

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allSelectableIds));
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkPaid = () => {
    const ids = canPay.map((s) => s.id);
    setData((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status: "paid" as ApprovalStatus } : s)),
    );
    setSelectedIds(new Set());
    toast({
      title: "Đã đánh dấu chi trả",
      description: `${ids.length} nhân viên đã được ghi nhận chi trả hoa hồng.`,
    });
  };

  const totalConfirmed = dateFiltered
    .filter((s) => s.status === "confirmed")
    .reduce((sum, s) => sum + s.totalCommission, 0);
  const totalPaid = dateFiltered
    .filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + s.totalCommission, 0);
  const totalAll = dateFiltered.reduce((sum, s) => sum + s.totalCommission, 0);

  const statusChips: ChipItem[] = STATUS_CHIPS.map((t) => ({
    ...t,
    count:
      t.key === "all"
        ? dateFiltered.length
        : dateFiltered.filter((s) => s.status === t.key).length,
  }));

  const roleChips: ChipItem[] = ROLE_OPTIONS.map((r) => ({
    key: r,
    label: r === "all" ? "Tất cả chức danh" : r,
    count: r === "all" ? dateFiltered.length : dateFiltered.filter((s) => s.role === r).length,
  }));

  return (
    <Screen activeTab={navActive} onTab={onNavTab} noHeader>
      <DetailHeader title="Duyệt hoa hồng" onBack={() => navigate("/")} />

      <div className="bg-np-surface-sub pb-5">
        <PageHeader
          title="Duyệt hoa hồng"
          subtitle="Tổng hợp và chi trả"
          action={
            <NPButton
              size="sm"
              tone="ghost"
              icon={FileSpreadsheet}
              onClick={() => toast({ title: "Xuất Excel", description: "Đang chuẩn bị file..." })}
            >
              Xuất
            </NPButton>
          }
        />

        <div className="px-4 pb-2">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 px-4 pt-2">
          <div className="rounded-np-card bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
              Tổng
            </p>
            <p className="mt-1 text-[15px] font-extrabold text-np-brand-ink tabular-nums">
              {fmt(totalAll)}₫
            </p>
          </div>
          <div className="rounded-np-card bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
              Chờ chi
            </p>
            <p className="mt-1 text-[15px] font-extrabold text-np-warning tabular-nums">
              {fmt(totalConfirmed)}₫
            </p>
          </div>
          <div className="rounded-np-card bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
              Đã chi
            </p>
            <p className="mt-1 text-[15px] font-extrabold text-np-text-muted tabular-nums">
              {fmt(totalPaid)}₫
            </p>
          </div>
        </div>

        <SectionTitle>Lọc theo trạng thái</SectionTitle>
        <Chips items={statusChips} active={statusFilter} onChange={setStatusFilter} />

        <SectionTitle>Lọc theo chức danh</SectionTitle>
        <Chips items={roleChips} active={roleFilter} onChange={setRoleFilter} />

        {/* Bulk action */}
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              className="data-[state=checked]:border-np-brand-ink data-[state=checked]:bg-np-brand-ink"
            />
            <span className="text-[12px] text-np-text-muted">
              {selectedIds.size > 0 ? `Đã chọn ${selectedIds.size}` : "Chọn tất cả"}
            </span>
          </div>
          <NPButton
            size="sm"
            tone="primary"
            icon={Banknote}
            disabled={canPay.length === 0}
            onClick={handleMarkPaid}
          >
            Đã chi {canPay.length > 0 ? `(${canPay.length})` : ""}
          </NPButton>
        </div>

        {/* List */}
        <div className="px-0 pt-3">
          <Card className="overflow-hidden p-0">
            {filtered.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <ClipboardList size={36} className="mx-auto text-np-border-strong" />
                <div className="mt-2.5 text-[13px] font-medium text-np-text-muted">
                  Không có dữ liệu commission
                </div>
              </div>
            ) : (
              filtered.map((s, i) => {
                const sc = STATUS_CONFIG[s.status];
                const isExpanded = expandedIds.has(s.id);
                return (
                  <div
                    key={s.id}
                    className={i === filtered.length - 1 ? "" : "border-b border-np-surface-pressed"}
                  >
                    <div className="flex items-start gap-3 px-4 py-3.5">
                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(s.id)}
                          onCheckedChange={() => toggleSelect(s.id)}
                          className="data-[state=checked]:border-np-brand-ink data-[state=checked]:bg-np-brand-ink"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleExpand(s.id)}
                        className="flex min-w-0 flex-1 items-start gap-2 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[14px] font-bold text-np-ink">
                              {s.name}
                            </span>
                            <Badge tone="neutral">{s.role}</Badge>
                          </div>
                          <div className="mt-0.5 flex items-center gap-3 text-[12px]">
                            <span className="text-np-text-muted tabular-nums">
                              {s.orderCount} đơn
                            </span>
                            <span className="font-bold text-np-brand-ink tabular-nums">
                              {fmt(s.totalCommission)}₫
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <Badge tone={sc.tone}>{sc.label}</Badge>
                          <ChevronDown
                            size={16}
                            className={cn(
                              "text-np-text-muted transition-transform",
                              isExpanded && "rotate-180",
                            )}
                          />
                        </div>
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="ml-10 space-y-2 border-l-2 border-np-border-strong pb-3 pl-3 pr-4">
                        {s.orders.map((o) => (
                          <div
                            key={o.id}
                            className="rounded-lg bg-np-surface-sub px-3 py-2.5 text-[12px]"
                          >
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/orders/${o.id}`);
                                }}
                                className="font-bold text-np-ink hover:text-np-brand-ink hover:underline"
                              >
                                {o.code}
                              </button>
                              <span className="text-np-text-muted">{o.date}</span>
                            </div>
                            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
                              <KV label="Bill" value={`${fmt(o.totalBill)}₫`} />
                              <KV label="Net" value={`${fmt(o.netProfit)}₫`} />
                              <KV label="Rate" value={`${o.commissionRate}%`} />
                              <KV
                                label="HH"
                                value={`${fmt(o.commissionAmount)}₫`}
                                valueClass="font-bold text-np-brand-ink"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </Card>
        </div>

        <div className="px-4 pt-2 text-[11px] text-np-text-muted">
          {filtered.length}/{data.length} nhân viên · Tổng hoa hồng hiển thị:{" "}
          <span className="font-bold text-np-ink tabular-nums">
            {fmt(filtered.reduce((sum, s) => sum + s.totalCommission, 0))}₫
          </span>
        </div>

        <div className="h-5" />
      </div>
    </Screen>
  );
}

function KV({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-np-text-muted">{label}</span>
      <span className={cn("tabular-nums text-np-ink", valueClass)}>{value}</span>
    </div>
  );
}
