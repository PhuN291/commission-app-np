/**
 * Universal search modal — search xuyên Đơn hàng / Khách hàng / Dịch vụ.
 *
 * Pattern: bottom Sheet full-height, hiển thị 3 result sections (max 5 mỗi loại).
 * Debounce input 250ms để không spam server. Backend: GET /api/search?q=...
 *
 * Wire up: Screen wrapper tự manage state khi page không override onSearch prop.
 * Mọi page dùng <Screen /> tự động có search.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Loader2,
  Package,
  Search,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { authFetch } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
// Types matching /api/search response
// ─────────────────────────────────────────────────────────────────

type SearchService = {
  id: number;
  code: string;
  title: string;
  category?: string | null;
  price: number;
};

type SearchCustomer = {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
};

type SearchOrder = {
  id: number;
  code: string;
  patientName: string;
  serviceName: string;
  totalPrice: number;
};

type SearchResults = {
  services: SearchService[];
  customers: SearchCustomer[];
  orders: SearchOrder[];
};

const EMPTY: SearchResults = { services: [], customers: [], orders: [] };

const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

type SearchSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FilterTab = "all" | "orders" | "customers" | "services";

const TABS: Array<{ key: FilterTab; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "orders", label: "Đơn hàng" },
  { key: "customers", label: "Khách hàng" },
  { key: "services", label: "Dịch vụ" },
];

export function SearchSheet({ open, onOpenChange }: SearchSheetProps) {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<FilterTab>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce input 250ms.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Fetch khi debouncedQ thay đổi.
  useEffect(() => {
    if (!debouncedQ) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    authFetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`)
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((data: SearchResults) => {
        if (!cancelled) setResults(data);
      })
      .catch(() => {
        if (!cancelled) setResults(EMPTY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  // Auto-focus input khi mở. Reset state khi đóng.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    } else {
      setQ("");
      setDebouncedQ("");
      setResults(EMPTY);
      setTab("all");
    }
  }, [open]);

  // Filter theo tab — chỉ render section được chọn (hoặc cả 3 nếu "all").
  const showOrders = tab === "all" || tab === "orders";
  const showCustomers = tab === "all" || tab === "customers";
  const showServices = tab === "all" || tab === "services";

  // Count per tab (cho badge số). Tổng = sum khi "all".
  const counts = {
    all: results.orders.length + results.customers.length + results.services.length,
    orders: results.orders.length,
    customers: results.customers.length,
    services: results.services.length,
  };
  const visibleCount =
    (showOrders ? results.orders.length : 0) +
    (showCustomers ? results.customers.length : 0) +
    (showServices ? results.services.length : 0);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="mx-auto flex h-[100dvh] max-w-[390px] flex-col gap-0 border-0 bg-white p-0 [&>button]:hidden"
      >
        <SheetTitle className="sr-only">Tìm kiếm</SheetTitle>

        {/* Header với input + close */}
        <div className="border-b border-np-surface-pressed bg-white px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Đóng"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-np-text-sub transition-colors hover:bg-np-surface-sub"
            >
              <ArrowLeft size={20} strokeWidth={2.25} />
            </button>
            <div className="relative flex-1">
              <Search
                size={16}
                strokeWidth={2.25}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-np-text-muted"
              />
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm đơn hàng, khách hàng, dịch vụ..."
                className="h-9 w-full rounded-np-button bg-np-surface-sub pl-9 pr-9 text-[14px] font-medium text-np-ink placeholder:text-np-text-muted focus:outline-none focus:ring-2 focus:ring-np-brand-ink/30"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label="Xóa"
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-np-text-muted transition-colors hover:bg-np-surface-pressed"
                >
                  <X size={14} strokeWidth={2.25} />
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs — active = black pill */}
          <div className="scrollbar-hide -mx-3 mt-2 flex gap-1 overflow-x-auto px-3 pb-0.5">
            {TABS.map((t) => {
              const active = tab === t.key;
              const c = counts[t.key];
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                    active
                      ? "bg-np-ink text-white"
                      : "text-np-text-sub hover:bg-np-surface-sub",
                  )}
                >
                  {t.label}
                  {debouncedQ && c > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                        active ? "bg-white/20" : "bg-np-surface-pressed text-np-text-muted",
                      )}
                    >
                      {c}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results scroll area */}
        <div className="scrollbar-hide flex-1 overflow-y-auto">
          {!debouncedQ ? (
            <EmptyHint />
          ) : loading ? (
            <div className="flex items-center justify-center py-12 text-np-text-muted">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : visibleCount === 0 ? (
            <NoResults q={debouncedQ} tab={tab} />
          ) : (
            <div className="divide-y divide-np-surface-pressed">
              {showOrders && results.orders.length > 0 && (
                <Section
                  title="Đơn hàng"
                  count={results.orders.length}
                  icon={Package}
                  hideHeader={tab === "orders"}
                >
                  {results.orders.map((o) => (
                    <ResultRow
                      key={`o-${o.id}`}
                      title={o.code}
                      subtitle={`${o.patientName} · ${o.serviceName}`}
                      meta={`${fmtVND(o.totalPrice)}đ`}
                      onClick={() => go(`/orders/${o.id}`)}
                    />
                  ))}
                </Section>
              )}
              {showCustomers && results.customers.length > 0 && (
                <Section
                  title="Khách hàng"
                  count={results.customers.length}
                  icon={User}
                  hideHeader={tab === "customers"}
                >
                  {results.customers.map((c) => (
                    <ResultRow
                      key={`c-${c.id}`}
                      title={c.name}
                      subtitle={c.phone + (c.email ? ` · ${c.email}` : "")}
                      onClick={() => go(`/customers/${c.id}`)}
                    />
                  ))}
                </Section>
              )}
              {showServices && results.services.length > 0 && (
                <Section
                  title="Dịch vụ"
                  count={results.services.length}
                  icon={Stethoscope}
                  hideHeader={tab === "services"}
                >
                  {results.services.map((s) => (
                    <ResultRow
                      key={`s-${s.id}`}
                      title={s.title}
                      subtitle={`${s.code}${s.category ? " · " + s.category : ""}`}
                      meta={`${fmtVND(s.price)}đ`}
                      onClick={() => go(`/services/${s.id}`)}
                    />
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function Section({
  title,
  count,
  icon: Icon,
  children,
  hideHeader,
}: {
  title: string;
  count: number;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  children: React.ReactNode;
  hideHeader?: boolean;
}) {
  return (
    <div>
      {!hideHeader && (
        <div className="flex items-center gap-1.5 bg-np-surface-sub px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.5px] text-np-text-muted">
          <Icon size={12} strokeWidth={2.25} />
          <span>{title}</span>
          <span className="ml-auto tabular-nums">{count}</span>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

function ResultRow({
  title,
  subtitle,
  meta,
  onClick,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 border-b border-np-surface-pressed px-4 py-3 text-left transition-colors active:bg-np-surface-pressed",
        "last:border-b-0",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-np-ink">{title}</div>
        <div className="mt-0.5 truncate text-[12px] text-np-text-muted">{subtitle}</div>
      </div>
      {meta && (
        <span className="flex-shrink-0 text-[12px] font-bold tabular-nums text-np-text-sub">
          {meta}
        </span>
      )}
    </button>
  );
}

function EmptyHint() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Search size={32} strokeWidth={1.5} className="text-np-text-muted" />
      <div className="text-[13px] font-medium text-np-text-muted">
        Nhập từ khóa để tìm kiếm
      </div>
    </div>
  );
}

function NoResults({ q, tab }: { q: string; tab: FilterTab }) {
  const tabLabel = TABS.find((t) => t.key === tab)?.label.toLowerCase();
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Search size={32} strokeWidth={1.5} className="text-np-text-muted" />
      <div className="text-[13px] font-medium text-np-ink">
        Không tìm thấy kết quả cho
      </div>
      <div className="rounded-np-button bg-np-surface-sub px-3 py-1 text-[12px] font-semibold text-np-text-sub">
        “{q}”
      </div>
      <div className="text-[11px] text-np-text-muted">
        {tab === "all"
          ? "Thử từ khóa khác xem nhé."
          : `Không có ${tabLabel} nào khớp. Thử tab "Tất cả".`}
      </div>
    </div>
  );
}
