import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { CalendarDays, Plus, Ticket } from "lucide-react";
import {
  Badge,
  Card,
  Chips,
  DetailHeader,
  NPButton,
  PageHeader,
  Screen,
  SearchField,
  type BadgeTone,
  type ChipItem,
  useTabNav,
} from "@/components/np";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type DiscountType = "percent" | "fixed";
type VoucherStatus = "active" | "expired" | "used_up";

interface Voucher {
  id: number;
  code: string;
  discountType: DiscountType;
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  usedCount: number;
  usageLimit: number;
  startDate: string;
  endDate: string;
  active: boolean;
}

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

function getVoucherStatus(v: Voucher): VoucherStatus {
  if (v.usedCount >= v.usageLimit) return "used_up";
  if (new Date(v.endDate) < new Date()) return "expired";
  return "active";
}

const STATUS_TONE: Record<VoucherStatus, { label: string; tone: BadgeTone }> = {
  active: { label: "Đang hoạt động", tone: "success" },
  expired: { label: "Hết hạn", tone: "neutral" },
  used_up: { label: "Hết lượt", tone: "critical" },
};

const initialVouchers: Voucher[] = [
  { id: 1, code: "WELCOME20", discountType: "percent", value: 20, maxDiscount: 500000, minOrder: 1000000, usedCount: 12, usageLimit: 50, startDate: "2026-01-01", endDate: "2026-06-30", active: true },
  { id: 2, code: "FLAT100K", discountType: "fixed", value: 100000, maxDiscount: null, minOrder: 500000, usedCount: 30, usageLimit: 30, startDate: "2026-01-15", endDate: "2026-03-31", active: false },
  { id: 3, code: "VIP10", discountType: "percent", value: 10, maxDiscount: 300000, minOrder: 2000000, usedCount: 5, usageLimit: 100, startDate: "2026-02-01", endDate: "2026-12-31", active: true },
  { id: 4, code: "SUMMER50K", discountType: "fixed", value: 50000, maxDiscount: null, minOrder: 300000, usedCount: 45, usageLimit: 45, startDate: "2026-03-01", endDate: "2026-04-01", active: false },
];

export default function AdminVouchers() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return vouchers.filter((v) => {
      const status = getVoucherStatus(v);
      if (q && !v.code.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      return true;
    });
  }, [vouchers, searchTerm, statusFilter]);

  const chips: ChipItem[] = [
    { key: "all", label: "Tất cả", count: vouchers.length },
    { key: "active", label: "Hoạt động", count: vouchers.filter((v) => getVoucherStatus(v) === "active").length },
    { key: "expired", label: "Hết hạn", count: vouchers.filter((v) => getVoucherStatus(v) === "expired").length },
    { key: "used_up", label: "Hết lượt", count: vouchers.filter((v) => getVoucherStatus(v) === "used_up").length },
  ];

  const toggleActive = (id: number) => {
    setVouchers((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        const next = { ...v, active: !v.active };
        toast({
          title: next.active ? "Đã bật voucher" : "Đã tắt voucher",
          description: `${v.code} đã được ${next.active ? "kích hoạt" : "vô hiệu hóa"}.`,
        });
        return next;
      }),
    );
  };

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Voucher" onBack={() => navigate("/")} />

      <div className="bg-np-surface-sub pb-5">
        <PageHeader
          title="Quản lý Voucher"
          subtitle={`${filtered.length} / ${vouchers.length} voucher`}
          action={
            <NPButton tone="primary" size="sm" icon={Plus} onClick={() => navigate("/admin/vouchers/new")}>
              Tạo mới
            </NPButton>
          }
        />

        <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Tìm theo mã code..." />
        <Chips items={chips} active={statusFilter} onChange={setStatusFilter} />

        <Card className="overflow-hidden p-0">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Ticket size={36} className="mx-auto text-np-border-strong" />
              <div className="mt-2.5 text-[13px] font-medium text-np-text-muted">
                Không tìm thấy voucher nào
              </div>
            </div>
          ) : (
            filtered.map((v, i) => {
              const status = getVoucherStatus(v);
              const sc = STATUS_TONE[status];
              const valueStr =
                v.discountType === "percent" ? `${v.value}%` : `${fmt(v.value)}₫`;
              return (
                <div
                  key={v.id}
                  className={
                    "px-4 py-3.5 transition-colors active:bg-np-surface-pressed" +
                    (i === filtered.length - 1 ? "" : " border-b border-np-surface-pressed")
                  }
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/vouchers/${v.id}`)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[15px] font-bold text-np-ink">{v.code}</span>
                        <span className="text-[15px] font-extrabold text-np-brand-ink tabular-nums">
                          -{valueStr}
                        </span>
                      </div>
                      <div className="mt-1 text-[12px] text-np-text-sub">
                        {v.discountType === "percent" && v.maxDiscount
                          ? `Giảm tối đa ${fmt(v.maxDiscount)}₫ · `
                          : ""}
                        Đơn tối thiểu {fmt(v.minOrder)}₫
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-np-text-muted">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={11} strokeWidth={2.25} />
                          {v.startDate} — {v.endDate}
                        </span>
                        <span className="tabular-nums">
                          {v.usedCount}/{v.usageLimit} lượt
                        </span>
                      </div>
                    </div>
                    <Badge tone={sc.tone} className="flex-shrink-0">
                      {sc.label}
                    </Badge>
                  </button>
                  <div
                    className="mt-2 flex items-center justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-np-text-sub">
                      <span>{v.active ? "Đang bật" : "Đã tắt"}</span>
                      <Switch checked={v.active} onCheckedChange={() => toggleActive(v.id)} />
                    </label>
                  </div>
                </div>
              );
            })
          )}
        </Card>

        <div className="h-5" />
      </div>
    </Screen>
  );
}
