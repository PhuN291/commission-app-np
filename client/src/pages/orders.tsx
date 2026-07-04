import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getCurrentUserId } from "@/lib/queryClient";
import { Calendar, Check, Plus, ShoppingBag, SlidersHorizontal } from "lucide-react";
import {
  Card,
  Chips,
  NPButton,
  OrderStatusBadges,
  PageHeader,
  Screen,
  SearchField,
  useTabNav,
  type ChipItem,
} from "@/components/np";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  ORDER_FILTER_TABS,
  deriveOrderStatus,
  isLate15min,
  isRescheduled,
  type OrderStatusCode,
} from "@shared/status";
import type { Order } from "@shared/schema";

function fmtVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

/** 'DD/MM/YYYY HH:mm' → ms epoch (0 nếu lỗi). Cho lọc theo ngày + sắp xếp. */
function orderTimestamp(createdAt: string): number {
  const [datePart, timePart] = (createdAt ?? "").trim().split(" ");
  const [dd, mm, yyyy] = (datePart ?? "").split("/").map(Number);
  const [hh, min] = (timePart ?? "").split(":").map(Number);
  if (!dd || !mm || !yyyy) return 0;
  const d = new Date(yyyy, mm - 1, dd, hh || 0, min || 0);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * Ngày khách hẹn → "Hôm nay/Hôm qua/Ngày mai HH:mm"; ngày khác chuẩn hoá "DD/MM/YYYY HH:mm".
 * Nhận cả 'DD/MM/YYYY' lẫn 'YYYY-MM-DD' (dữ liệu đang lẫn 2 kiểu).
 */
function appointmentLabel(dateStr: string | null, timeStr: string | null): string {
  const time = timeStr ? ` ${timeStr}` : "";
  if (!dateStr) return timeStr ?? "";
  const s = dateStr.trim();
  let dd = 0;
  let mm = 0;
  let yyyy = 0;
  if (s.includes("/")) {
    [dd, mm, yyyy] = s.split("/").map(Number);
  } else if (s.includes("-")) {
    [yyyy, mm, dd] = s.split("-").map(Number);
  }
  if (!dd || !mm || !yyyy) return `${dateStr}${time}`;
  const day = new Date(yyyy, mm - 1, dd).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((day - today.getTime()) / 86_400_000);
  if (diff === 0) return `Hôm nay${time}`;
  if (diff === -1) return `Hôm qua${time}`;
  if (diff === 1) return `Ngày mai${time}`;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(dd)}/${pad(mm)}/${yyyy}${time}`;
}

const DATE_OPTIONS = [
  { value: "all", label: "Mọi lúc" },
  { value: "today", label: "Hôm nay" },
  { value: "7d", label: "7 ngày qua" },
  { value: "30d", label: "30 ngày qua" },
  { value: "month", label: "Tháng này" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "value_desc", label: "Giá trị cao → thấp" },
  { value: "value_asc", label: "Giá trị thấp → cao" },
];

type FilterValue = OrderStatusCode | "all" | "late";

export default function Orders() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // ?filter=late → Khách trễ; ?status=pending → DRAFT (backward-compat)
  const searchParams = new URLSearchParams(window.location.search);
  const initialFilter: FilterValue =
    searchParams.get("filter") === "late"
      ? "late"
      : searchParams.get("status") === "pending"
        ? "DRAFT"
        : "all";
  const [activeFilter, setActiveFilter] = useState<FilterValue>(initialFilter);
  const [dateFilter, setDateFilter] = useState("all"); // đã áp dụng (lọc danh sách)
  const [sortBy, setSortBy] = useState("newest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftDate, setDraftDate] = useState("all"); // bản nháp trong panel, bấm Lọc mới áp dụng
  const [draftSort, setDraftSort] = useState("newest");

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders", getCurrentUserId()],
  });

  const filtered = useMemo(() => {
    const now = Date.now();
    const startOfDay = () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };
    const startOfMonth = () => {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };
    const dateCutoff =
      dateFilter === "today"
        ? startOfDay()
        : dateFilter === "7d"
          ? now - 7 * 86_400_000
          : dateFilter === "30d"
            ? now - 30 * 86_400_000
            : dateFilter === "month"
              ? startOfMonth()
              : null;

    const list = orders.filter((o) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        o.patientName.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q) ||
        o.serviceName.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (activeFilter === "late") {
        if (!isLate15min(o)) return false;
      } else if (activeFilter !== "all") {
        if (deriveOrderStatus(o.appointmentStatus, o.visitStatus) !== activeFilter) return false;
      }
      if (dateCutoff !== null && orderTimestamp(o.createdAt) < dateCutoff) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "value_desc") return b.totalPrice - a.totalPrice;
      if (sortBy === "value_asc") return a.totalPrice - b.totalPrice;
      const ta = orderTimestamp(a.createdAt);
      const tb = orderTimestamp(b.createdAt);
      return sortBy === "oldest" ? ta - tb : tb - ta;
    });
  }, [orders, searchTerm, activeFilter, dateFilter, sortBy]);

  const chipItems: ChipItem[] = useMemo(() => {
    const tabs: ChipItem[] = ORDER_FILTER_TABS.map((tab) => ({
      key: tab.value,
      label: tab.label,
      count:
        tab.value === "all"
          ? orders.length
          : orders.filter(
              (o) => deriveOrderStatus(o.appointmentStatus, o.visitStatus) === tab.value,
            ).length,
    }));
    // Chèn "Khách trễ" ngay sau "Tất cả" (cùng logic isLate15min với Dashboard).
    tabs.splice(1, 0, {
      key: "late",
      label: "Khách trễ",
      count: orders.filter(isLate15min).length,
    });
    return tabs;
  }, [orders]);

  const isRefundFilter =
    activeFilter === "REFUND_FULL" || activeFilter === "REFUND_PARTIAL";
  const activeFilterCount =
    (dateFilter !== "all" ? 1 : 0) + (sortBy !== "newest" ? 1 : 0);
  const draftFilterCount =
    (draftDate !== "all" ? 1 : 0) + (draftSort !== "newest" ? 1 : 0);

  return (
    <Screen activeTab={active} onTab={onTab}>
      <PageHeader
        title="Đơn hàng"
        subtitle={`${filtered.length} đơn trong danh sách`}
        action={
          <NPButton tone="primary" size="sm" icon={Plus} onClick={() => navigate("/orders/new")}>
            Tạo đơn
          </NPButton>
        }
      />

      {/* Tìm kiếm + nút bộ lọc */}
      <div className="mx-4 flex items-center gap-2">
        <SearchField
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Tìm mã đơn, tên khách, dịch vụ..."
          className="mx-0 flex-1"
        />
        <button
          type="button"
          onClick={() => {
            setDraftDate(dateFilter);
            setDraftSort(sortBy);
            setFilterOpen(true);
          }}
          aria-label="Bộ lọc"
          className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-np-button border border-np-border-strong bg-white text-np-ink transition-colors active:bg-np-surface-pressed"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={2.25} />
          {activeFilterCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-np-brand-ink" />
          )}
        </button>
      </div>

      {/* Panel bộ lọc */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-[390px] rounded-t-2xl border-0 p-5 pt-3">
          {/* Thanh kéo */}
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-np-surface-pressed" />

          {/* Header: Đặt lại · Bộ lọc · (X của sheet ở góc phải) */}
          <div className="relative mb-5 flex items-center justify-center">
            {draftFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDraftDate("all");
                  setDraftSort("newest");
                  setDateFilter("all");
                  setSortBy("newest");
                }}
                className="absolute left-0 text-[13px] font-semibold text-np-link"
              >
                Đặt lại
              </button>
            )}
            <SheetTitle className="text-[16px] font-bold text-np-ink">Bộ lọc</SheetTitle>
          </div>

          {/* Lọc theo ngày — chip */}
          <div className="mb-2 text-[13px] font-semibold text-np-text-sub">Lọc theo ngày</div>
          <div className="flex flex-wrap gap-2">
            {DATE_OPTIONS.map((opt) => {
              const sel = draftDate === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraftDate(opt.value)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                    sel
                      ? "border-np-ink bg-np-ink text-white"
                      : "border-np-border-strong bg-white text-np-text-sub",
                  )}
                >
                  {sel && <Check size={13} strokeWidth={2.75} />}
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Sắp xếp — danh sách radio */}
          <div className="mb-2 mt-5 text-[13px] font-semibold text-np-text-sub">Sắp xếp</div>
          <div className="overflow-hidden rounded-xl border border-np-surface-pressed">
            {SORT_OPTIONS.map((opt, i) => {
              const sel = draftSort === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraftSort(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3 text-left text-[14px] transition-colors",
                    i > 0 && "border-t border-np-surface-pressed",
                    sel ? "bg-np-surface-sub font-semibold text-np-ink" : "text-np-text-sub",
                  )}
                >
                  <span>{opt.label}</span>
                  <span
                    className={cn(
                      "flex h-[18px] w-[18px] items-center justify-center rounded-full border-2",
                      sel ? "border-np-ink" : "border-np-border-strong",
                    )}
                  >
                    {sel && <span className="h-2 w-2 rounded-full bg-np-ink" />}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              setDateFilter(draftDate);
              setSortBy(draftSort);
              setFilterOpen(false);
            }}
            className="mt-6 h-12 w-full rounded-np-button bg-np-ink font-bold text-white transition-colors active:bg-np-ink-sub"
          >
            Lọc{draftFilterCount > 0 ? ` (${draftFilterCount})` : ""}
          </button>
        </SheetContent>
      </Sheet>

      <Chips
        items={chipItems}
        active={activeFilter}
        onChange={(v) => setActiveFilter(v as FilterValue)}
      />

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <ShoppingBag size={36} className="mx-auto text-np-border-strong" />
            <div className="mt-2.5 text-[13px] font-medium text-np-text-muted">
              {isRefundFilter ? "Chưa có đơn hoàn tiền." : "Không có đơn hàng nào"}
            </div>
          </div>
        ) : (
          filtered.map((o, i) => (
            <button
              type="button"
              key={o.id}
              onClick={() => navigate(`/orders/${o.id}`)}
              className={
                "flex w-full flex-col gap-1.5 px-4 py-3.5 text-left transition-colors active:bg-np-surface-pressed" +
                (i === filtered.length - 1 ? "" : " border-b border-np-surface-pressed")
              }
            >
              <div className="flex items-center justify-between gap-2">
                {o.appointmentDate || o.appointmentTime ? (
                  <span className="flex items-center gap-1 text-[12px] font-medium text-np-text-muted">
                    <Calendar size={12} strokeWidth={2.25} />
                    {appointmentLabel(o.appointmentDate, o.appointmentTime)}
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-[12px] font-semibold text-np-text-muted">{o.code}</span>
              </div>
              <div className="flex items-center justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold text-np-ink">
                    {o.patientName}
                    {isRescheduled(o.appointmentStatus) && (
                      <span className="ml-1.5 text-[11px] font-medium text-np-text-muted">
                        (đã dời lịch)
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[13px] font-medium text-np-text-sub">
                    {o.serviceName}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-[15px] font-extrabold text-np-ink tabular-nums">
                    {fmtVND(o.totalPrice)}
                  </div>
                  <div className="mt-0.5 text-[12px] font-bold text-np-brand-ink">
                    +{fmtVND(o.commission)}
                  </div>
                </div>
              </div>
              <div className="mt-0.5">
                <OrderStatusBadges
                  appointmentStatus={o.appointmentStatus}
                  visitStatus={o.visitStatus}
                />
              </div>
            </button>
          ))
        )}
      </Card>

      <div className="h-5" />
    </Screen>
  );
}
