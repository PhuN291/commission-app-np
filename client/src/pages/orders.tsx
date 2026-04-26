import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calendar, Plus, ShoppingBag } from "lucide-react";
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
import { APPOINTMENT_FILTER_TABS } from "@shared/status";
import type { Order } from "@shared/schema";

function fmtVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

export default function Orders() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const searchParams = new URLSearchParams(window.location.search);
  const initialFilter = searchParams.get("status") === "pending" ? "pending" : "all";
  const [activeFilter, setActiveFilter] = useState(initialFilter);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !q ||
          o.patientName.toLowerCase().includes(q) ||
          o.code.toLowerCase().includes(q) ||
          o.serviceName.toLowerCase().includes(q);
        if (!matchesSearch) return false;
        if (activeFilter === "all") return true;
        return o.appointmentStatus === activeFilter;
      }),
    [orders, searchTerm, activeFilter],
  );

  const chipItems: ChipItem[] = useMemo(
    () =>
      APPOINTMENT_FILTER_TABS.map((tab) => ({
        key: tab.value,
        label: tab.label,
        count:
          tab.value === "all"
            ? orders.length
            : orders.filter((o) => o.appointmentStatus === tab.value).length,
      })),
    [orders],
  );

  return (
    <Screen activeTab={active} onTab={onTab} notifCount={3} onBell={() => navigate("/notifications")}>
      <PageHeader
        title="Đơn hàng"
        subtitle={`${filtered.length} đơn trong danh sách`}
        action={
          <NPButton tone="primary" size="sm" icon={Plus} onClick={() => navigate("/orders/new")}>
            Tạo đơn
          </NPButton>
        }
      />

      <SearchField
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Tìm mã đơn, tên khách, dịch vụ..."
      />

      <Chips items={chipItems} active={activeFilter} onChange={setActiveFilter} />

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <ShoppingBag size={36} className="mx-auto text-np-border-strong" />
            <div className="mt-2.5 text-[13px] font-medium text-np-text-muted">
              Không có đơn hàng nào
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
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] font-medium text-np-text-muted">{o.createdAt}</span>
                <span className="text-[12px] font-semibold text-np-text-muted">{o.code}</span>
              </div>
              <div className="flex items-center justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold text-np-ink">{o.patientName}</div>
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
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <OrderStatusBadges
                  appointmentStatus={o.appointmentStatus}
                  visitStatus={o.visitStatus}
                />
                {(o.appointmentDate || o.appointmentTime) && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-np-text-muted">
                    <Calendar size={11} strokeWidth={2.25} />
                    {[o.appointmentDate, o.appointmentTime].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </Card>

      <div className="h-5" />
    </Screen>
  );
}
