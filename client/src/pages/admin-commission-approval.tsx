import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ChevronDown, ChevronRight, Banknote, ClipboardList, ListFilter, Check, FileSpreadsheet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import AppHeader from "@/components/app-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import DateRangeFilter, { getPresetRange } from "@/components/date-range-filter";

// ── Types ──
type ApprovalStatus = "confirmed" | "paid";

interface OrderDetail {
  id: number; // matches real order ID in DB
  code: string;
  date: string;
  totalBill: number;
  netProfit: number;
  commissionRate: number; // percent
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

// ── Helpers ──
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; bg: string; text: string }> = {
  confirmed: { label: "Chốt", bg: "bg-[#fff8e1]", text: "text-[#b8860b]" },
  paid:      { label: "Đã chi", bg: "bg-[#f6f6f7]", text: "text-[#8c9196]" },
};

const ROLE_STYLE = "bg-[#e7e7e7] text-[#1a1c1d]";

const ROLE_OPTIONS = ["Bác sĩ", "Điều dưỡng", "Lễ tân", "CSKH"];

const STATUS_TABS: { key: ApprovalStatus | null; label: string }[] = [
  { key: null, label: "Tất cả" },
  { key: "confirmed", label: "Chốt" },
  { key: "paid", label: "Đã chi" },
];

// ── Mock data — order IDs & codes map to real orders in DB ──

const initialData: StaffCommission[] = [
  {
    id: 1, name: "BS. Nguyễn Văn An", role: "Bác sĩ", orderCount: 3, totalCommission: 775000, status: "confirmed",
    orders: [
      { id: 5, code: "#NP260214002", date: "2026-03-20", totalBill: 7000000, netProfit: 4500000, commissionRate: 5, commissionAmount: 350000 },
      { id: 6, code: "#NP260215001", date: "2026-03-25", totalBill: 4500000, netProfit: 3000000, commissionRate: 5, commissionAmount: 225000 },
      { id: 7, code: "#NP260220001", date: "2026-03-28", totalBill: 4000000, netProfit: 2600000, commissionRate: 5, commissionAmount: 200000 },
    ],
  },
  {
    id: 2, name: "BS. Trần Thị Bình", role: "Bác sĩ", orderCount: 2, totalCommission: 185000, status: "confirmed",
    orders: [
      { id: 2, code: "#NP260213002", date: "2026-03-18", totalBill: 1200000, netProfit: 800000, commissionRate: 5, commissionAmount: 60000 },
      { id: 4, code: "#NP260214001", date: "2026-03-22", totalBill: 2500000, netProfit: 1600000, commissionRate: 5, commissionAmount: 125000 },
    ],
  },
  {
    id: 3, name: "ĐD. Lê Minh Châu", role: "Điều dưỡng", orderCount: 2, totalCommission: 65000, status: "confirmed",
    orders: [
      { id: 1, code: "#NP260213001", date: "2026-03-15", totalBill: 500000, netProfit: 350000, commissionRate: 3, commissionAmount: 25000 },
      { id: 3, code: "#NP260213003", date: "2026-03-19", totalBill: 800000, netProfit: 520000, commissionRate: 3, commissionAmount: 40000 },
    ],
  },
  {
    id: 4, name: "LT. Hoàng Văn Em", role: "Lễ tân", orderCount: 1, totalCommission: 17500, status: "paid",
    orders: [
      { id: 8, code: "#NP260225001", date: "2026-03-25", totalBill: 350000, netProfit: 230000, commissionRate: 1, commissionAmount: 17500 },
    ],
  },
];

// ── Component ──
export default function AdminCommissionApproval() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [data, setData] = useState<StaffCommission[]>(initialData);

  // ── Filters ──
  const [dateRange, setDateRange] = useState("last_30_days");
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [showFilterRow, setShowFilterRow] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"role" | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // ── Date-only filtered (for summary cards — NOT affected by tabs or role) ──
  const dateFiltered = useMemo(() => {
    const { from, to } = getPresetRange(dateRange);
    return data.filter((s) => {
      const hasOrderInRange = s.orders.some((o) => {
        const d = new Date(o.date);
        d.setHours(0, 0, 0, 0);
        return d >= from && d <= to;
      });
      return hasOrderInRange;
    });
  }, [data, dateRange]);

  // ── Full filtered (for table — includes status tab + role filter) ──
  const filtered = useMemo(() => {
    return dateFiltered.filter((s) => {
      if (statusFilter !== null && s.status !== statusFilter) return false;
      if (roleFilter !== null && s.role !== roleFilter) return false;
      return true;
    });
  }, [dateFiltered, statusFilter, roleFilter]);

  // ── Derived ──
  const allSelectableIds = filtered.map((s) => s.id);
  const allSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedIds.has(id));

  // Which selected rows can be marked paid (confirmed → paid)
  const canPay = filtered.filter((s) => selectedIds.has(s.id) && s.status === "confirmed");

  // ── Handlers ──
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allSelectableIds));
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleMarkPaid = () => {
    const ids = canPay.map((s) => s.id);
    setData((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status: "paid" as ApprovalStatus } : s))
    );
    setSelectedIds(new Set());
    toast({
      title: "Đã đánh dấu chi trả",
      description: `${ids.length} nhân viên đã được ghi nhận chi trả hoa hồng.`,
    });
  };

  // ── Summary stats (based on dateFiltered — NOT affected by status tabs) ──
  const totalConfirmed = dateFiltered.filter((s) => s.status === "confirmed").reduce((sum, s) => sum + s.totalCommission, 0);
  const totalPaid = dateFiltered.filter((s) => s.status === "paid").reduce((sum, s) => sum + s.totalCommission, 0);
  const totalAll = dateFiltered.reduce((sum, s) => sum + s.totalCommission, 0);

  // ── Render ──
  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] flex flex-col">
      <AppHeader activePage="admin-commission-approval" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[{ label: "Quản lý" }, { label: "Tổng hợp hoa hồng" }]} />

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-lg font-bold text-[#1a1c1d]">Tổng hợp hoa hồng</h1>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg h-9 border-[#d2d5d8] text-sm px-3.5 font-medium shadow-sm"
              onClick={() => toast({ title: "Xuất Excel", description: "Đang chuẩn bị file Excel..." })}
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              Xuất Excel
            </Button>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl p-4">
            <p className="text-xs text-[#8c9196] font-medium">Tổng hoa hồng</p>
            <p className="text-xl font-bold text-[#008060] mt-1 tabular-nums">{fmt(totalAll)} ₫</p>
          </Card>
          <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl p-4">
            <p className="text-xs text-[#8c9196] font-medium">Hoa hồng chờ duyệt</p>
            <p className="text-xl font-bold text-[#b8860b] mt-1 tabular-nums">{fmt(totalConfirmed)} ₫</p>
          </Card>
          <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl p-4">
            <p className="text-xs text-[#8c9196] font-medium">Đã chi</p>
            <p className="text-xl font-bold text-[#8c9196] mt-1 tabular-nums">{fmt(totalPaid)} ₫</p>
          </Card>
        </div>

        {/* ── Filters + Actions ── */}
        <Card className="border-[#d2d5d8] shadow-sm bg-white overflow-hidden rounded-xl">
          {/* ── Section 1: Status tabs + filter toggle ── */}
          <div className="flex items-center bg-white px-3 py-2 border-b border-[#e3e3e3]">
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-0.5 shrink-0 w-max">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.label}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-4 py-1.5 text-sm rounded-full transition-all whitespace-nowrap ${
                      statusFilter === tab.key
                        ? "bg-[#e7e7e7] text-[#1a1c1d] font-semibold"
                        : "text-[#616161] hover:text-[#1a1c1d] font-medium"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center border-l border-[#e3e3e3] pl-3 ml-2 shrink-0">
              <button
                onClick={() => { setShowFilterRow(!showFilterRow); if (showFilterRow) setOpenDropdown(null); }}
                className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${
                  showFilterRow
                    ? "border-[#1a1c1d] bg-[#f0f0f0] text-[#1a1c1d]"
                    : "border-[#e3e3e3] bg-white text-[#616161] hover:text-[#1a1c1d] hover:border-[#c0c0c0]"
                }`}
              >
                <ListFilter className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Section 2: Expandable filter row ── */}
          {showFilterRow && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[#e3e3e3] relative z-30">
              {/* Role pill dropdown */}
              <div className="relative shrink-0 z-50">
                <button
                  onClick={() => setOpenDropdown(openDropdown === "role" ? null : "role")}
                  className={`relative z-50 flex items-center gap-1.5 px-4 py-2 text-sm rounded-full border transition-all whitespace-nowrap ${
                    roleFilter
                      ? "border-[#1a1c1d] bg-[#f0f0f0] text-[#1a1c1d] font-semibold"
                      : "border-[#d2d5d8] bg-white text-[#616161] hover:border-[#c0c0c0]"
                  }`}
                >
                  {roleFilter || "Chức danh"}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === "role" ? "rotate-180" : ""}`} />
                </button>
                {openDropdown === "role" && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                    <div className="absolute top-full left-0 mt-1 bg-white border border-[#e3e3e3] rounded-xl shadow-lg py-1 z-50 min-w-[200px]">
                      <button
                        onClick={() => { setRoleFilter(null); setOpenDropdown(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#f6f6f7] transition-colors flex items-center justify-between"
                      >
                        <span>Tất cả</span>
                        {roleFilter === null && <Check className="h-4 w-4 text-[#008060]" />}
                      </button>
                      {ROLE_OPTIONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => { setRoleFilter(r); setOpenDropdown(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#f6f6f7] transition-colors flex items-center justify-between"
                        >
                          <span>{r}</span>
                          {roleFilter === r && <Check className="h-4 w-4 text-[#008060]" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Section 3: Action buttons ── */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#e3e3e3]">
            <Button
              size="sm"
              className="rounded-lg h-8 bg-[#008060] hover:bg-[#006e52] text-white text-xs px-4 font-bold shadow-sm disabled:opacity-40"
              disabled={canPay.length === 0}
              onClick={handleMarkPaid}
            >
              <Banknote className="h-3.5 w-3.5 mr-1.5" />
              Đánh dấu đã chi{canPay.length > 0 && ` (${canPay.length})`}
            </Button>

            <p className="text-xs text-[#8c9196] ml-auto hidden sm:block">
              {filtered.length}/{data.length} nhân viên
            </p>
          </div>

          {/* ── Desktop Table ── */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#f6f6f7]">
                <TableRow className="hover:bg-transparent border-b-[#d2d5d8]">
                  <TableHead className="w-10 px-4 h-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      className="data-[state=checked]:bg-[#008060] data-[state=checked]:border-[#008060]"
                    />
                  </TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-4 w-8" />
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-4">Nhân viên</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-4 text-center">Số đơn</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-4 text-right">Tổng hoa hồng</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-4 text-center">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const sc = STATUS_CONFIG[s.status];
                  const isExpanded = expandedIds.has(s.id);
                  return (
                    <>
                      <TableRow
                        key={s.id}
                        className="border-b-[#d2d5d8] hover:bg-[#f6f6f7] cursor-pointer"
                        onClick={() => toggleExpand(s.id)}
                      >
                        <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(s.id)}
                            onCheckedChange={() => toggleSelect(s.id)}
                            className="data-[state=checked]:bg-[#008060] data-[state=checked]:border-[#008060]"
                          />
                        </TableCell>
                        <TableCell className="px-1 py-3">
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-[#8c9196]" />
                            : <ChevronRight className="h-4 w-4 text-[#8c9196]" />
                          }
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-[#1a1c1d]">{s.name}</p>
                            <Badge className={`${ROLE_STYLE} border-transparent text-[10px] font-bold`}>
                              {s.role}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <p className="text-sm tabular-nums text-[#1a1c1d]">{s.orderCount}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <p className="text-sm font-bold text-[#008060] tabular-nums">{fmt(s.totalCommission)} ₫</p>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <Badge className={`${sc.bg} ${sc.text} border-transparent text-[10px] font-bold`}>
                            {sc.label}
                          </Badge>
                        </TableCell>
                      </TableRow>

                      {/* Expanded order details */}
                      {isExpanded && (
                        <TableRow key={`${s.id}-detail`} className="bg-[#fafafa] hover:bg-[#fafafa]">
                          <TableCell colSpan={6} className="p-0">
                            <div className="px-6 py-3 ml-10 border-l-2 border-[#d2d5d8]">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-[#8c9196] border-b border-[#e3e3e3]">
                                    <th className="text-left pb-2 font-semibold">Mã đơn</th>
                                    <th className="text-left pb-2 font-semibold">Ngày</th>
                                    <th className="text-right pb-2 font-semibold">Tổng bill</th>
                                    <th className="text-right pb-2 font-semibold">Net profit</th>
                                    <th className="text-right pb-2 font-semibold">% Rate</th>
                                    <th className="text-right pb-2 font-semibold">Hoa hồng</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {s.orders.map((o) => (
                                    <tr key={o.id} className="border-b border-[#f0f0f0] last:border-0">
                                      <td className="py-2">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); navigate(`/orders/${o.id}`); }}
                                          className="font-bold text-[#1a1c1d] hover:text-[#008060] hover:underline transition-colors"
                                        >
                                          {o.code}
                                        </button>
                                      </td>
                                      <td className="py-2 text-[#616161]">{o.date}</td>
                                      <td className="py-2 text-right tabular-nums text-[#1a1c1d]">{fmt(o.totalBill)} ₫</td>
                                      <td className="py-2 text-right tabular-nums text-[#1a1c1d]">{fmt(o.netProfit)} ₫</td>
                                      <td className="py-2 text-right tabular-nums text-[#616161]">{o.commissionRate}%</td>
                                      <td className="py-2 text-right tabular-nums font-bold text-[#008060]">{fmt(o.commissionAmount)} ₫</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="md:hidden divide-y divide-[#e3e3e3]">
            {filtered.map((s) => {
              const sc = STATUS_CONFIG[s.status];
              const isExpanded = expandedIds.has(s.id);
              return (
                <div key={s.id}>
                  <div
                    className="px-4 py-3.5 hover:bg-[#f6f6f7] active:bg-[#ebebed] transition-colors cursor-pointer"
                    onClick={() => toggleExpand(s.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(s.id)}
                          onCheckedChange={() => toggleSelect(s.id)}
                          className="data-[state=checked]:bg-[#008060] data-[state=checked]:border-[#008060]"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-[#1a1c1d] truncate">{s.name}</p>
                          <Badge className={`${ROLE_STYLE} border-transparent text-[10px] font-bold shrink-0`}>
                            {s.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-[#8c9196]">{s.orderCount} đơn</p>
                          <p className="text-xs font-bold text-[#008060] tabular-nums">{fmt(s.totalCommission)} ₫</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`${sc.bg} ${sc.text} border-transparent text-[10px] font-bold`}>
                          {sc.label}
                        </Badge>
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-[#8c9196]" />
                          : <ChevronRight className="h-4 w-4 text-[#8c9196]" />
                        }
                      </div>
                    </div>
                  </div>

                  {/* Expanded mobile detail */}
                  {isExpanded && (
                    <div className="px-4 pb-3 ml-7 border-l-2 border-[#d2d5d8] mx-4 space-y-2.5">
                      {s.orders.map((o) => (
                        <div key={o.id} className="bg-[#fafafa] rounded-lg px-3 py-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/orders/${o.id}`); }}
                              className="font-bold text-[#1a1c1d] hover:text-[#008060] hover:underline transition-colors"
                            >
                              {o.code}
                            </button>
                            <span className="text-[#8c9196]">{o.date}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1.5">
                            <div className="flex justify-between">
                              <span className="text-[#8c9196]">Tổng bill</span>
                              <span className="tabular-nums text-[#1a1c1d]">{fmt(o.totalBill)} ₫</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#8c9196]">Net profit</span>
                              <span className="tabular-nums text-[#1a1c1d]">{fmt(o.netProfit)} ₫</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#8c9196]">Rate</span>
                              <span className="tabular-nums text-[#616161]">{o.commissionRate}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#8c9196]">Hoa hồng</span>
                              <span className="tabular-nums font-bold text-[#008060]">{fmt(o.commissionAmount)} ₫</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <ClipboardList className="h-10 w-10 text-[#d2d5d8] mx-auto mb-3" />
              <p className="text-sm text-[#8c9196]">Không có dữ liệu commission</p>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-[#d2d5d8] bg-white">
            <p className="text-xs text-[#8c9196]">
              {filtered.length}/{data.length} nhân viên · Tổng hoa hồng:{" "}
              <span className="font-bold text-[#1a1c1d]">
                {fmt(filtered.reduce((sum, s) => sum + s.totalCommission, 0))} ₫
              </span>
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
