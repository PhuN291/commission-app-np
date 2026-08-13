import { useMemo, useState } from "react";
import { useQuayLai } from "@/lib/use-back";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Ticket } from "@/components/np/icon";
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
import { authFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { VoucherRow } from "@shared/schema";

type VoucherStatus = "active" | "expired" | "used_up";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const fmtDate = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

function getVoucherStatus(v: VoucherRow): VoucherStatus {
  if (v.usageLimit > 0 && v.usedCount >= v.usageLimit) return "used_up";
  if (v.endDate && new Date(v.endDate) < new Date()) return "expired";
  return "active";
}

const STATUS_TONE: Record<VoucherStatus, { label: string; tone: BadgeTone }> = {
  active: { label: "Đang hoạt động", tone: "success" },
  expired: { label: "Hết hạn", tone: "muted" }, // đã đóng, cho chìm xuống
  used_up: { label: "Hết lượt", tone: "critical" },
};

export default function AdminVouchers() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const quayLai = useQuayLai("/");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: vouchers = [] } = useQuery<VoucherRow[]>({
    queryKey: ["/api/admin/vouchers"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/vouchers");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, active: nextActive }: { id: number; active: boolean }) => {
      const res = await authFetch(`/api/admin/vouchers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: nextActive }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers"] });
      toast({
        title: vars.active ? "Đã bật voucher" : "Đã tắt voucher",
      });
    },
    onError: () => toast({ title: "Lỗi", description: "Không cập nhật được voucher", variant: "destructive" }),
  });

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

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Voucher" onBack={quayLai} />

      <div className="min-h-full flow-root bg-np-bg">
        <PageHeader
          title="Quản lý Voucher"
          action={
            <NPButton tone="primary" size="sm" icon={Plus} onClick={() => navigate("/admin/vouchers/new")}>
              Tạo mới
            </NPButton>
          }
        />

        <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Tìm theo mã..." />
        <Chips items={chips} active={statusFilter} onChange={setStatusFilter} />

        <Card className="overflow-hidden p-0">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Ticket size={36} className="mx-auto text-np-border-strong" />
              <div className="mt-2.5 text-[13px] font-medium text-np-text-muted">
                Không tìm thấy voucher
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
                    (i === filtered.length - 1 ? "" : " np-divider")
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
                        {v.startDate && v.endDate && (
                          <span className="flex items-center gap-1">
                            <CalendarDays size={11} strokeWidth={2.25} />
                            {fmtDate(v.startDate)} → {fmtDate(v.endDate)}
                          </span>
                        )}
                        <span className="tabular-nums">
                          {v.usageLimit > 0 ? `${v.usedCount}/${v.usageLimit} lượt` : `${v.usedCount} lượt · không giới hạn`}
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
                      <Switch
                        checked={v.active}
                        disabled={toggleMut.isPending}
                        onCheckedChange={() => toggleMut.mutate({ id: v.id, active: !v.active })}
                      />
                    </label>
                  </div>
                </div>
              );
            })
          )}
        </Card>

      </div>
    </Screen>
  );
}
