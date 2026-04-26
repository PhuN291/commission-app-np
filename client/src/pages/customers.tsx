import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Users as UsersIcon } from "lucide-react";
import {
  Avatar,
  Card,
  Chev,
  Chips,
  NPButton,
  PageHeader,
  Row,
  Screen,
  SearchField,
  useTabNav,
  type ChipItem,
} from "@/components/np";
import {
  CUSTOMER_TAGS,
  FOLLOW_UP_CUSTOMER_IDS,
  NEW_THIS_MONTH_IDS,
} from "@/lib/mock-crm";
import type { Customer, Order } from "@shared/schema";

function fmtVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

function fmtShort(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + " tr";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return String(n);
}

export default function Customers() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/orders"] });

  const statsByPhone = useMemo(() => {
    const map = new Map<string, { orderCount: number; totalSpent: number }>();
    orders.forEach((o) => {
      const prev = map.get(o.phone) ?? { orderCount: 0, totalSpent: 0 };
      map.set(o.phone, {
        orderCount: prev.orderCount + 1,
        totalSpent: prev.totalSpent + o.totalPrice,
      });
    });
    return map;
  }, [orders]);

  const vipIds = useMemo(
    () =>
      new Set(
        Object.entries(CUSTOMER_TAGS)
          .filter(([, tags]) => tags.includes("VIP"))
          .map(([id]) => parseInt(id, 10)),
      ),
    [],
  );

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return customers.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (activeFilter === "follow_up") return FOLLOW_UP_CUSTOMER_IDS.includes(c.id);
      if (activeFilter === "vip") return vipIds.has(c.id);
      if (activeFilter === "dropped") return NEW_THIS_MONTH_IDS.includes(c.id);
      return true;
    });
  }, [customers, searchTerm, activeFilter, vipIds]);

  const chips: ChipItem[] = [
    { key: "all", label: "Tất cả", count: customers.length },
    { key: "follow_up", label: "Cần follow-up", count: FOLLOW_UP_CUSTOMER_IDS.length },
    { key: "vip", label: "VIP", count: vipIds.size },
    { key: "dropped", label: "Khách rớt", count: NEW_THIS_MONTH_IDS.length },
  ];

  return (
    <Screen activeTab={active} onTab={onTab} notifCount={3}>
      <PageHeader
        title="Khách hàng"
        subtitle={`${customers.length} khách hàng trong danh sách`}
        action={
          <NPButton tone="primary" size="sm" icon={Plus}>
            Thêm
          </NPButton>
        }
      />

      <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Tìm khách hàng..." />
      <Chips items={chips} active={activeFilter} onChange={setActiveFilter} />

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <UsersIcon size={36} className="mx-auto text-np-border-strong" />
            <div className="mt-2.5 text-[13px] font-medium text-np-text-muted">
              Không tìm thấy khách hàng nào
            </div>
          </div>
        ) : (
          filtered.map((c, i) => {
            const stats = statsByPhone.get(c.phone) ?? { orderCount: 0, totalSpent: 0 };
            const tags = CUSTOMER_TAGS[c.id] || [];
            return (
              <Row
                key={c.id}
                onClick={() => navigate(`/customers/${c.id}`)}
                leading={
                  <Avatar name={c.name} size={40} />
                }
                title={
                  <span className="flex items-center gap-1.5">
                    {c.name}
                    {tags.includes("VIP") && (
                      <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-bold text-[#B45309]">
                        VIP
                      </span>
                    )}
                  </span>
                }
                subtitle={`${c.phone} · ${c.location || "Chưa cập nhật"}`}
                trailing={
                  <div className="flex items-center gap-1.5">
                    <div className="text-right">
                      <div className="text-[13px] font-bold text-np-ink tabular-nums">
                        {fmtShort(stats.totalSpent)}₫
                      </div>
                      <div className="text-[11px] text-np-text-muted">{stats.orderCount} đơn</div>
                    </div>
                    <Chev />
                  </div>
                }
                last={i === filtered.length - 1}
              />
            );
          })
        )}
      </Card>

      <div className="h-5" />
    </Screen>
  );
}
