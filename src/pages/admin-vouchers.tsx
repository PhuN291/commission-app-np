import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Plus, Ticket, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import AppHeader from "@/components/app-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { useToast } from "@/hooks/use-toast";

// ── Types ──
type DiscountType = "percent" | "fixed";
type VoucherStatus = "active" | "expired" | "used_up";

interface Voucher {
  id: number;
  code: string;
  discountType: DiscountType;
  value: number;
  maxDiscount: number | null; // only for percent
  minOrder: number;
  usedCount: number;
  usageLimit: number;
  startDate: string;
  endDate: string;
  active: boolean;
}

// ── Helpers ──
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

function getVoucherStatus(v: Voucher): VoucherStatus {
  if (v.usedCount >= v.usageLimit) return "used_up";
  if (new Date(v.endDate) < new Date()) return "expired";
  return "active";
}

const STATUS_CONFIG: Record<VoucherStatus, { label: string; bg: string; text: string }> = {
  active:  { label: "Đang hoạt động", bg: "bg-[#e4f3d9]", text: "text-[#008060]" },
  expired: { label: "Hết hạn",        bg: "bg-[#f6f6f7]", text: "text-[#8c9196]" },
  used_up: { label: "Hết lượt",       bg: "bg-[#fef2f2]", text: "text-[#de3618]" },
};

// ── Mock data ──
const initialVouchers: Voucher[] = [
  { id: 1, code: "WELCOME20",  discountType: "percent", value: 20, maxDiscount: 500000,  minOrder: 1000000,  usedCount: 12, usageLimit: 50,  startDate: "2026-01-01", endDate: "2026-06-30", active: true },
  { id: 2, code: "FLAT100K",   discountType: "fixed",   value: 100000, maxDiscount: null, minOrder: 500000,   usedCount: 30, usageLimit: 30,  startDate: "2026-01-15", endDate: "2026-03-31", active: false },
  { id: 3, code: "VIP10",      discountType: "percent", value: 10, maxDiscount: 300000,  minOrder: 2000000,  usedCount: 5,  usageLimit: 100, startDate: "2026-02-01", endDate: "2026-12-31", active: true },
  { id: 4, code: "SUMMER50K",  discountType: "fixed",   value: 50000,  maxDiscount: null, minOrder: 300000,   usedCount: 45, usageLimit: 45,  startDate: "2026-03-01", endDate: "2026-04-01", active: false },
];


// ── Component ──
export default function AdminVouchers() {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [, navigate] = useLocation();

  // ── Filtering ──
  const filtered = vouchers.filter((v) => {
    const status = getVoucherStatus(v);
    const matchesSearch = v.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Handlers ──
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
      })
    );
  };

  const formatValue = (v: Voucher) =>
    v.discountType === "percent" ? `${v.value}%` : `${fmt(v.value)} ₫`;

  // ── Render ──
  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] flex flex-col">
      <AppHeader activePage="admin-vouchers" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[{ label: "Quản lý" }, { label: "Voucher" }]} />

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1a1c1d]" data-testid="text-vouchers-title">
            Quản lý Voucher
          </h1>
          <Button
            className="rounded-lg h-8 bg-[#1a1c1d] hover:bg-[#2a2c2d] text-white text-xs px-4 font-bold shadow-sm shrink-0"
            onClick={() => navigate("/admin/vouchers/new")}
            data-testid="button-add-voucher"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Tạo voucher
          </Button>
        </div>

        <Card className="border-[#d2d5d8] shadow-sm bg-white overflow-hidden rounded-xl">
          {/* Search */}
          <div className="p-4 border-b border-[#e3e3e3]">
            <div className="relative w-full md:w-96">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9196]" />
              <Input
                placeholder="Tìm theo mã code..."
                className="pl-9 bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white transition-all rounded-lg h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-voucher"
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center px-3 py-2 border-b border-[#e3e3e3] overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-0.5 shrink-0">
              {([
                { key: "all", label: "Tất cả" },
                { key: "active", label: "Hoạt động" },
                { key: "expired", label: "Hết hạn" },
                { key: "used_up", label: "Hết lượt" },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-full transition-all whitespace-nowrap font-medium ${
                    statusFilter === tab.key
                      ? "bg-[#e7e7e7] text-[#1a1c1d] font-semibold"
                      : "text-[#616161] hover:text-[#1a1c1d]"
                  }`}
                  data-testid={`filter-tab-${tab.key}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#f6f6f7]">
                <TableRow className="hover:bg-transparent border-b-[#d2d5d8]">
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-4">Mã code</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-4">Loại</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-4 text-right">Giá trị</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-4 text-right">Giảm tối đa</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-4 text-right">Đơn tối thiểu</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-4">Thời hạn</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-4 text-center">Đã dùng</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-4 text-center">Trạng thái</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-4 text-center">Bật/Tắt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => {
                  const status = getVoucherStatus(v);
                  const sc = STATUS_CONFIG[status];
                  return (
                    <TableRow
                      key={v.id}
                      className="border-b-[#d2d5d8] hover:bg-[#f6f6f7] cursor-pointer"
                      onClick={() => navigate(`/admin/vouchers/${v.id}`)}
                      data-testid={`row-voucher-${v.id}`}
                    >
                      <TableCell className="px-4 py-3">
                        <p className="text-sm font-bold text-[#1a1c1d]">{v.code}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge className="bg-[#e7e7e7] text-[#1a1c1d] border-transparent text-[10px] font-bold">
                          {v.discountType === "percent" ? "%" : "VNĐ"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <p className="text-sm font-bold text-[#008060] tabular-nums">{formatValue(v)}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <p className="text-sm text-[#616161] tabular-nums">
                          {v.maxDiscount ? `${fmt(v.maxDiscount)} ₫` : "—"}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <p className="text-sm text-[#616161] tabular-nums">{fmt(v.minOrder)} ₫</p>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-xs text-[#616161] flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-[#8c9196] shrink-0" />
                          {v.startDate} – {v.endDate}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <p className="text-sm tabular-nums text-[#1a1c1d]">
                          {v.usedCount}/{v.usageLimit}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <Badge className={`${sc.bg} ${sc.text} border-transparent text-[10px] font-bold`}>
                          {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={v.active}
                          onCheckedChange={() => toggleActive(v.id)}
                          data-testid={`switch-voucher-${v.id}`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-[#e3e3e3]">
            {filtered.map((v) => {
              const status = getVoucherStatus(v);
              const sc = STATUS_CONFIG[status];
              const desc = v.discountType === "percent"
                ? `${v.value}% off${v.maxDiscount ? ` · tối đa ${fmt(v.maxDiscount)} ₫` : ""}`
                : `${fmt(v.value)} ₫ off`;
              return (
                <div
                  key={v.id}
                  className="px-4 py-3.5 hover:bg-[#f6f6f7] active:bg-[#ebebed] transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/vouchers/${v.id}`)}
                  data-testid={`card-voucher-${v.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1a1c1d]">{v.code}</p>
                      <p className="text-xs text-[#616161] mt-0.5">{desc}</p>
                      <p className="text-xs text-[#8c9196] mt-0.5">
                        {v.usedCount}/{v.usageLimit} lượt · đơn tối thiểu {fmt(v.minOrder)} ₫
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`${sc.bg} ${sc.text} border-transparent text-[10px] font-bold`}>
                        {sc.label}
                      </Badge>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={v.active}
                          onCheckedChange={() => toggleActive(v.id)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty */}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Ticket className="h-10 w-10 text-[#d2d5d8] mx-auto mb-3" />
              <p className="text-sm text-[#8c9196]">Không tìm thấy voucher nào</p>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-[#d2d5d8] bg-white">
            <p className="text-xs text-[#8c9196]" data-testid="text-voucher-count">
              Hiển thị {filtered.length}/{vouchers.length} voucher
            </p>
          </div>
        </Card>
      </main>

    </div>
  );
}
