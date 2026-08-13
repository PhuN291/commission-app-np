import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getCurrentUserId } from "@/lib/queryClient";
import { Check, Plus, ShoppingBag, SlidersHorizontal } from "@/components/np/icon";
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

const THU = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

/**
 * Tiêu đề nhóm ngày theo lúc tạo đơn: "Hôm nay", "Hôm qua", tên thứ trong vòng 7
 * ngày, xa hơn thì "DD/MM/YYYY".
 *
 * Dùng chữ cho mấy ngày gần vì đó là khoảng sale còn nhớ việc mình vừa làm, đọc
 * "Hôm qua" nhanh hơn phải trừ nhẩm ngày trong đầu.
 */
function nhomNgayTao(createdAt: string): string {
  const t = orderTimestamp(createdAt);
  if (!t) return "Không rõ ngày";
  const moc = new Date(t);
  moc.setHours(0, 0, 0, 0);
  const homNay = new Date();
  homNay.setHours(0, 0, 0, 0);
  const cach = Math.round((homNay.getTime() - moc.getTime()) / 86_400_000);
  if (cach === 0) return "Hôm nay";
  if (cach === 1) return "Hôm qua";
  if (cach > 1 && cach < 7) return THU[moc.getDay()];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(moc.getDate())}/${p(moc.getMonth() + 1)}/${moc.getFullYear()}`;
}

/** Giờ tạo đơn "HH:mm". Ngày đã nằm ở tiêu đề nhóm nên dòng đơn chỉ cần giờ. */
function gioTao(createdAt: string): string {
  const t = (createdAt ?? "").trim().split(" ")[1] ?? "";
  return /^\d{1,2}:\d{2}/.test(t) ? t.slice(0, 5) : "";
}

/**
 * Số dịch vụ của đơn. Bảng orders chỉ lưu một chuỗi tên nối bằng ", " (order_items
 * vẫn gộp chung một dòng), nên đếm bằng cách tách đúng chuỗi màn hình đang in.
 */
function soDichVu(serviceName: string): number {
  const n = (serviceName ?? "").split(",").filter((x) => x.trim()).length;
  return n || 1;
}

/**
 * Dấu chấm ngăn giữa tên khách, số dịch vụ và giờ.
 *
 * Dùng dấu chấm tròn "•" thay cho dấu chấm giữa "·" nhỏ xíu: ba mẩu thông tin nằm
 * liền nhau trên một dòng, dấu ngăn mờ quá thì đọc thành một câu dính liền.
 */
function Cham() {
  return <span className="mx-1.5 text-np-text-muted">•</span>;
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

  /**
   * Gom theo ngày tạo. Chỉ gom khi đang sắp theo thời gian: sắp theo giá trị thì
   * ngày nhảy loạn, mỗi nhóm một dòng, dải tiêu đề thành nhiễu chứ không giúp gì.
   */
  const gomTheoNgay = sortBy === "newest" || sortBy === "oldest";
  const nhomDon = useMemo(() => {
    if (!gomTheoNgay) return [{ ngay: null as string | null, items: filtered }];
    const ra: { ngay: string | null; items: typeof filtered }[] = [];
    for (const o of filtered) {
      const ngay = nhomNgayTao(o.createdAt);
      const cuoi = ra[ra.length - 1];
      if (cuoi && cuoi.ngay === ngay) cuoi.items.push(o);
      else ra.push({ ngay, items: [o] });
    }
    return ra;
  }, [filtered, gomTheoNgay]);

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
              {isRefundFilter ? "Chưa có đơn hoàn tiền" : "Chưa có đơn hàng"}
            </div>
          </div>
        ) : (
          nhomDon.map((nhom, ni) => (
            <div key={nhom.ngay ?? ni}>
              {nhom.ngay && (
                <div className="bg-np-surface-sub px-4 py-1.5 text-[12px] font-bold text-np-text-muted">
                  {nhom.ngay}
                </div>
              )}
              {nhom.items.map((o, i) => {
                const cuoiBang =
                  ni === nhomDon.length - 1 && i === nhom.items.length - 1;
                const gio = gioTao(o.createdAt);
                return (
                  <button
                    type="button"
                    key={o.id}
                    onClick={() => navigate(`/orders/${o.id}`)}
                    className={
                      "flex w-full flex-col px-4 py-3.5 text-left transition-colors active:bg-np-surface-pressed" +
                      (cuoiBang ? "" : " np-divider")
                    }
                  >
                    <div className="flex items-baseline justify-between gap-2.5">
                      <span className="truncate text-[15px] font-bold text-np-ink">{o.code}</span>
                      <span className="flex-shrink-0 text-[15px] font-extrabold text-np-ink tabular-nums">
                        {fmtVND(o.totalPrice)}
                      </span>
                    </div>
                    {/* Tên khách, số dịch vụ, giờ tạo dồn một dòng. Tên dịch vụ đầy đủ
                        dài tới cả trăm ký tự nên trước đây luôn bị cắt cụt, đếm số
                        vừa gọn vừa nói đúng đơn có mấy dịch vụ. */}
                    <div className="mt-0.5 flex items-baseline justify-between gap-2.5">
                      <span className="truncate text-[13px] font-medium text-np-text-sub">
                        {o.patientName}
                        <Cham />
                        {soDichVu(o.serviceName)} dịch vụ
                        {gio && (
                          <>
                            <Cham />
                            {gio}
                          </>
                        )}
                      </span>
                      <span className="flex-shrink-0 text-[12px] font-bold text-np-brand-ink tabular-nums">
                        +{fmtVND(o.commission)}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <OrderStatusBadges
                        appointmentStatus={o.appointmentStatus}
                        visitStatus={o.visitStatus}
                        refundType={o.refundType}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </Card>

    </Screen>
  );
}
