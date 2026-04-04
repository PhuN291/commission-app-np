import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import AppHeader from "@/components/app-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { useToast } from "@/hooks/use-toast";

// ── Types (shared with list page) ──
type DiscountType = "percent" | "fixed";

interface VoucherData {
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

// ── Mock store (simple localStorage sync) ──
const STORAGE_KEY = "np_vouchers";

const defaultVouchers: VoucherData[] = [
  { id: 1, code: "WELCOME20", discountType: "percent", value: 20, maxDiscount: 500000, minOrder: 1000000, usedCount: 12, usageLimit: 50, startDate: "2026-01-01", endDate: "2026-06-30", active: true },
  { id: 2, code: "FLAT100K", discountType: "fixed", value: 100000, maxDiscount: null, minOrder: 500000, usedCount: 30, usageLimit: 30, startDate: "2026-01-15", endDate: "2026-03-31", active: false },
  { id: 3, code: "VIP10", discountType: "percent", value: 10, maxDiscount: 300000, minOrder: 2000000, usedCount: 5, usageLimit: 100, startDate: "2026-02-01", endDate: "2026-12-31", active: true },
  { id: 4, code: "SUMMER50K", discountType: "fixed", value: 50000, maxDiscount: null, minOrder: 300000, usedCount: 45, usageLimit: 45, startDate: "2026-03-01", endDate: "2026-04-01", active: false },
];

function loadVouchers(): VoucherData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultVouchers;
  } catch { return defaultVouchers; }
}

function saveVouchers(data: VoucherData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

// ── Component ──
export default function AdminVoucherDetail() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = !params.id || params.id === "new";

  const [form, setForm] = useState({
    code: "",
    discountType: "percent" as DiscountType,
    value: "",
    maxDiscount: "",
    minOrder: "",
    usageLimit: "",
    startDate: "",
    endDate: "",
    active: true,
  });
  const [existingVoucher, setExistingVoucher] = useState<VoucherData | null>(null);

  useEffect(() => {
    if (!isNew) {
      const all = loadVouchers();
      const found = all.find((v) => v.id === Number(params.id));
      if (found) {
        setExistingVoucher(found);
        setForm({
          code: found.code,
          discountType: found.discountType,
          value: found.value.toString(),
          maxDiscount: found.maxDiscount?.toString() ?? "",
          minOrder: found.minOrder.toString(),
          usageLimit: found.usageLimit.toString(),
          startDate: found.startDate,
          endDate: found.endDate,
          active: found.active,
        });
      }
    }
  }, [isNew, params.id]);

  const handleSave = () => {
    if (!form.code.trim() || !form.value || !form.usageLimit || !form.startDate || !form.endDate) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng điền đầy đủ các trường bắt buộc.", variant: "destructive" });
      return;
    }

    const all = loadVouchers();
    const entry: VoucherData = {
      id: existingVoucher?.id ?? Math.max(0, ...all.map((v) => v.id)) + 1,
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      value: Number(form.value) || 0,
      maxDiscount: form.discountType === "percent" ? (Number(form.maxDiscount) || null) : null,
      minOrder: Number(form.minOrder) || 0,
      usedCount: existingVoucher?.usedCount ?? 0,
      usageLimit: Number(form.usageLimit) || 0,
      startDate: form.startDate,
      endDate: form.endDate,
      active: form.active,
    };

    const updated = existingVoucher
      ? all.map((v) => (v.id === existingVoucher.id ? entry : v))
      : [...all, entry];
    saveVouchers(updated);

    toast({
      title: existingVoucher ? "Đã cập nhật" : "Đã tạo voucher",
      description: `Voucher ${entry.code} đã được lưu.`,
    });
    navigate("/admin/vouchers");
  };

  const getStatus = () => {
    if (!existingVoucher) return null;
    if (existingVoucher.usedCount >= existingVoucher.usageLimit) return { label: "Hết lượt", bg: "bg-[#fef2f2]", text: "text-[#de3618]" };
    if (new Date(existingVoucher.endDate) < new Date()) return { label: "Hết hạn", bg: "bg-[#f6f6f7]", text: "text-[#8c9196]" };
    return { label: "Đang hoạt động", bg: "bg-[#e4f3d9]", text: "text-[#008060]" };
  };

  const status = getStatus();

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader activePage="admin-vouchers" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-3xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[
          { label: "Quản lý" },
          { label: "Voucher", href: "/admin/vouchers" },
          { label: isNew ? "Tạo mới" : form.code || "Chi tiết" },
        ]} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => navigate("/admin/vouchers")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#1a1c1d]">
                  {isNew ? "Tạo voucher" : form.code}
                </h1>
                {status && (
                  <Badge className={`${status.bg} ${status.text} border-transparent text-[10px] font-bold`}>
                    {status.label}
                  </Badge>
                )}
              </div>
              {existingVoucher && (
                <p className="text-xs text-[#8c9196] mt-0.5">
                  Đã dùng {existingVoucher.usedCount}/{existingVoucher.usageLimit} lượt
                </p>
              )}
            </div>
          </div>
          <Button
            className="rounded-lg h-9 bg-[#1a1c1d] hover:bg-[#2a2c2d] text-white text-sm px-5 font-bold"
            onClick={handleSave}
            data-testid="button-save-voucher"
          >
            Lưu
          </Button>
        </div>

        {/* ── Section: Mã & Loại ── */}
        <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
          <CardContent className="p-5 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#4a4d50]">Mã code</Label>
              <Input
                placeholder="vd: SUMMER30"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-10 text-sm"
                data-testid="input-voucher-code"
              />
              <p className="text-[11px] text-[#8c9196]">Khách hàng sẽ nhập mã này khi thanh toán.</p>
            </div>
          </CardContent>
        </Card>

        {/* ── Section: Giá trị giảm ── */}
        <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
          <div className="px-5 pt-5 pb-2">
            <p className="text-sm font-bold text-[#1a1c1d]">Giá trị giảm</p>
          </div>
          <CardContent className="px-5 pb-5 space-y-4">
            {/* Discount type toggle */}
            <div className="flex rounded-lg border border-[#d2d5d8] overflow-hidden">
              {([
                { value: "percent" as DiscountType, label: "Phần trăm (%)" },
                { value: "fixed" as DiscountType, label: "Số tiền cố định (₫)" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm({ ...form, discountType: opt.value, maxDiscount: "" })}
                  className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                    form.discountType === opt.value
                      ? "bg-[#e7e7e7] text-[#1a1c1d]"
                      : "bg-white text-[#616161] hover:bg-[#f6f6f7]"
                  }`}
                  data-testid={`toggle-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#4a4d50]">
                {form.discountType === "percent" ? "Phần trăm giảm giá" : "Số tiền giảm"}
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder={form.discountType === "percent" ? "vd: 20" : "vd: 100000"}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-10 text-sm pr-10"
                  data-testid="input-voucher-value"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#8c9196] font-medium">
                  {form.discountType === "percent" ? "%" : "₫"}
                </span>
              </div>
            </div>

            {form.discountType === "percent" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#4a4d50]">Giảm tối đa</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="vd: 500000"
                    value={form.maxDiscount}
                    onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                    className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-10 text-sm pr-8"
                    data-testid="input-voucher-max-discount"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#8c9196] font-medium">₫</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Section: Điều kiện ── */}
        <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
          <div className="px-5 pt-5 pb-2">
            <p className="text-sm font-bold text-[#1a1c1d]">Điều kiện áp dụng</p>
          </div>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#4a4d50]">Đơn tối thiểu (₫)</Label>
              <Input
                type="number"
                placeholder="vd: 500000"
                value={form.minOrder}
                onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-10 text-sm"
                data-testid="input-voucher-min-order"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#4a4d50]">Giới hạn số lần dùng</Label>
              <Input
                type="number"
                placeholder="vd: 50"
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-10 text-sm"
                data-testid="input-voucher-limit"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Section: Thời hạn ── */}
        <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
          <div className="px-5 pt-5 pb-2">
            <p className="text-sm font-bold text-[#1a1c1d]">Thời hạn hiệu lực</p>
          </div>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#4a4d50]">Ngày bắt đầu</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-10 text-sm"
                  data-testid="input-voucher-start"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#4a4d50]">Ngày kết thúc</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-10 text-sm"
                  data-testid="input-voucher-end"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section: Trạng thái ── */}
        <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#1a1c1d]">Trạng thái voucher</p>
                <p className="text-xs text-[#8c9196] mt-0.5">
                  {form.active ? "Voucher đang được kích hoạt" : "Voucher đang bị vô hiệu hóa"}
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
                data-testid="switch-voucher-active"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Summary (edit only) ── */}
        {existingVoucher && (
          <Card className="border-[#d2d5d8] shadow-sm rounded-xl bg-white">
            <div className="px-5 pt-5 pb-2">
              <p className="text-sm font-bold text-[#1a1c1d]">Tóm tắt</p>
            </div>
            <CardContent className="px-5 pb-5">
              <ul className="space-y-1.5 text-sm text-[#616161]">
                <li className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#616161] shrink-0" />
                  {existingVoucher.discountType === "percent"
                    ? `Giảm ${existingVoucher.value}%${existingVoucher.maxDiscount ? `, tối đa ${fmt(existingVoucher.maxDiscount)} ₫` : ""}`
                    : `Giảm ${fmt(existingVoucher.value)} ₫`
                  }
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#616161] shrink-0" />
                  Đơn tối thiểu {fmt(existingVoucher.minOrder)} ₫
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#616161] shrink-0" />
                  Đã dùng {existingVoucher.usedCount} / {existingVoucher.usageLimit} lượt
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#616161] shrink-0" />
                  Hiệu lực: {existingVoucher.startDate} – {existingVoucher.endDate}
                </li>
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Bottom actions */}
        <div className="flex gap-3 pb-6">
          <Button
            className="flex-1 rounded-lg h-10 bg-[#1a1c1d] hover:bg-[#2a2c2d] text-white text-sm font-bold"
            onClick={handleSave}
          >
            Lưu
          </Button>
          <Button
            variant="outline"
            className="rounded-lg h-10 text-sm font-bold border-[#d2d5d8]"
            onClick={() => navigate("/admin/vouchers")}
          >
            Hủy
          </Button>
        </div>
      </main>
    </div>
  );
}
