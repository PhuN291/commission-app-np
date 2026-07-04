/**
 * Customers list — filter "Cần follow-up" align với B4 R-8-5.
 *
 * Filter logic:
 * - "Tất cả": tất cả KH
 * - "Cần follow-up": Customer.nextRecallDueAt <= now (overdue + due today, strict)
 * - "VIP": từ CUSTOMER_TAGS hardcoded (giữ nguyên)
 *
 * TODO Phase 2 (B4 R-9-1 vòng 14): Filter customers theo primaryAssignedUserId
 * cho NV/BS. Hiện NV thấy mọi customer (tạm thời, đợi schema migration).
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getCurrentUserId } from "@/lib/queryClient";
import { BadgeCheck, Plus, Users as UsersIcon } from "lucide-react";
import {
  Avatar,
  Badge,
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
import { CUSTOMER_TAGS } from "@/lib/mock-crm";
import type { Customer, Order } from "@shared/schema";
import type { RecallStatus } from "@shared/types";

/** Khách trong list kèm trạng thái recall (API /api/customers bổ sung). */
type CustomerRow = Customer & { recallStatus?: RecallStatus };

function fmtShort(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + " tr";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return String(n);
}

/**
 * "Sắp tái khám" — nextRecallDueAt nằm trong [hôm nay, hôm nay + 7 ngày] (chưa trễ).
 * "Trễ lịch tái khám" — nextRecallDueAt < hôm nay (đã trễ).
 *
 * Cùng base field per B4 R-8-5 (Customer.nextRecallDueAt).
 */
const RECALL_UPCOMING_WINDOW_DAYS = 7;

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isUpcomingRecall(customer: Customer): boolean {
  if (!customer.nextRecallDueAt) return false;
  const due = new Date(customer.nextRecallDueAt).getTime();
  const today = startOfToday();
  return due >= today && due <= today + RECALL_UPCOMING_WINDOW_DAYS * 86_400_000;
}

function isOverdueRecall(customer: Customer): boolean {
  if (!customer.nextRecallDueAt) return false;
  return new Date(customer.nextRecallDueAt).getTime() < startOfToday();
}

/** Tính số ngày quá hạn (-N = future). */
function daysOverdue(dueAt: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(dueAt);
  dueDay.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((today.getTime() - dueDay.getTime()) / dayMs);
}

export default function Customers() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  // Mở sẵn chip theo ?filter= (vd Dashboard link ?filter=follow_up). Giá trị lạ → "all".
  const initialFilter = (() => {
    const f = new URLSearchParams(window.location.search).get("filter");
    return f === "follow_up" || f === "overdue" || f === "vip" ? f : "all";
  })();
  const [activeFilter, setActiveFilter] = useState(initialFilter);

  const { data: customers = [], isLoading } = useQuery<CustomerRow[]>({
    queryKey: ["/api/customers", getCurrentUserId()],
  });
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/orders", getCurrentUserId()] });

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
      if (activeFilter === "follow_up") return isUpcomingRecall(c);
      if (activeFilter === "overdue") return isOverdueRecall(c);
      if (activeFilter === "vip") return vipIds.has(c.id);
      return true;
    });
  }, [customers, searchTerm, activeFilter, vipIds]);

  const chips: ChipItem[] = useMemo(
    () => [
      { key: "all", label: "Tất cả", count: customers.length },
      {
        key: "follow_up",
        label: "Sắp tái khám",
        count: customers.filter(isUpcomingRecall).length,
      },
      {
        key: "overdue",
        label: "Trễ lịch tái khám",
        count: customers.filter(isOverdueRecall).length,
      },
      { key: "vip", label: "VIP", count: vipIds.size },
    ],
    [customers, vipIds],
  );

  return (
    <Screen activeTab={active} onTab={onTab}>
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
                leading={<Avatar name={c.name} size={40} />}
                title={
                  <span className="flex flex-wrap items-center gap-1.5">
                    {c.name}
                    {tags.includes("VIP") && (
                      <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-bold text-[#B45309]">
                        VIP
                      </span>
                    )}
                    <RecallBadge customer={c} />
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

/**
 * Badge urgency hiển thị bên cạnh tên KH khi recall đã quá hạn / đến hạn hôm nay.
 * Future date không show. Reused trong customer-detail.tsx có thể.
 */
function RecallBadge({ customer }: { customer: CustomerRow }) {
  if (!customer.nextRecallDueAt) return null;
  const overdue = daysOverdue(new Date(customer.nextRecallDueAt));

  // Đã nhắc: hạ "Quá N ngày" xuống xám + thêm huy chương xanh "Đã nhắc".
  if (customer.recallStatus === "done") {
    return (
      <>
        {overdue > 0 && <Badge tone="neutral">Quá {overdue} ngày</Badge>}
        <Badge tone="success">
          <BadgeCheck size={13} strokeWidth={2.5} />
          Đã nhắc
        </Badge>
      </>
    );
  }

  if (overdue > 0) {
    return <Badge tone="critical">Quá {overdue} ngày</Badge>;
  }
  if (overdue === 0) {
    return <Badge tone="attention">Đến hạn hôm nay</Badge>;
  }
  return null;
}
