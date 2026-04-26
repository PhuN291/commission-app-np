import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  Badge,
  Card,
  DetailHeader,
  NPButton,
  Screen,
  SectionTitle,
  useTabNav,
  type BadgeTone,
} from "@/components/np";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  } catch {
    return defaultVouchers;
  }
}

function saveVouchers(data: VoucherData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

export default function AdminVoucherDetail() {
  const { active, onTab } = useTabNav();
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
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng điền đầy đủ các trường bắt buộc.",
        variant: "destructive",
      });
      return;
    }

    const all = loadVouchers();
    const entry: VoucherData = {
      id: existingVoucher?.id ?? Math.max(0, ...all.map((v) => v.id)) + 1,
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      value: Number(form.value) || 0,
      maxDiscount: form.discountType === "percent" ? Number(form.maxDiscount) || null : null,
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

  const getStatusBadge = (): { label: string; tone: BadgeTone } | null => {
    if (!existingVoucher) return null;
    if (existingVoucher.usedCount >= existingVoucher.usageLimit)
      return { label: "Hết lượt", tone: "critical" };
    if (new Date(existingVoucher.endDate) < new Date())
      return { label: "Hết hạn", tone: "neutral" };
    return { label: "Đang hoạt động", tone: "success" };
  };

  const status = getStatusBadge();

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader
        title={isNew ? "Tạo voucher" : form.code || "Voucher"}
        subtitle={
          existingVoucher
            ? `Đã dùng ${existingVoucher.usedCount}/${existingVoucher.usageLimit} lượt`
            : undefined
        }
        onBack={() => navigate("/admin/vouchers")}
      />

      <div className="bg-np-surface-sub pb-5">
        {status && (
          <div className="px-4 pt-4">
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
        )}

        {/* Mã code */}
        <SectionTitle>Mã code</SectionTitle>
        <Card className="space-y-1.5 p-4">
          <Label className="text-[12px] font-semibold text-np-text-sub">Mã voucher</Label>
          <Input
            placeholder="vd: SUMMER30"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="font-mono"
          />
          <p className="text-[11px] text-np-text-muted">
            Khách hàng sẽ nhập mã này khi thanh toán.
          </p>
        </Card>

        {/* Giá trị giảm */}
        <SectionTitle>Giá trị giảm</SectionTitle>
        <Card className="space-y-4 p-4">
          <div className="flex overflow-hidden rounded-np-button border border-np-border-strong">
            {(
              [
                { value: "percent", label: "Phần trăm (%)" },
                { value: "fixed", label: "Số tiền cố định (₫)" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, discountType: opt.value, maxDiscount: "" })}
                className={cn(
                  "flex-1 py-2.5 text-[12px] font-bold transition-colors",
                  form.discountType === opt.value
                    ? "bg-np-ink text-white"
                    : "bg-white text-np-text-sub hover:bg-np-surface-sub",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-np-text-sub">
              {form.discountType === "percent" ? "Phần trăm giảm giá" : "Số tiền giảm"}
            </Label>
            <div className="relative">
              <Input
                type="number"
                placeholder={form.discountType === "percent" ? "vd: 20" : "vd: 100000"}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="pr-10"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-medium text-np-text-muted">
                {form.discountType === "percent" ? "%" : "₫"}
              </span>
            </div>
          </div>

          {form.discountType === "percent" && (
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-np-text-sub">Giảm tối đa</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="vd: 500000"
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-medium text-np-text-muted">
                  ₫
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Điều kiện */}
        <SectionTitle>Điều kiện áp dụng</SectionTitle>
        <Card className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-np-text-sub">Đơn tối thiểu (₫)</Label>
            <Input
              type="number"
              placeholder="vd: 500000"
              value={form.minOrder}
              onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-np-text-sub">
              Giới hạn số lần dùng
            </Label>
            <Input
              type="number"
              placeholder="vd: 50"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
            />
          </div>
        </Card>

        {/* Thời hạn */}
        <SectionTitle>Thời hạn hiệu lực</SectionTitle>
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-np-text-sub">Bắt đầu</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-np-text-sub">Kết thúc</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Trạng thái */}
        <SectionTitle>Trạng thái</SectionTitle>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-bold text-np-ink">Kích hoạt voucher</p>
              <p className="mt-0.5 text-[12px] text-np-text-muted">
                {form.active ? "Voucher đang được kích hoạt" : "Voucher đang bị vô hiệu hóa"}
              </p>
            </div>
            <Switch
              checked={form.active}
              onCheckedChange={(checked) => setForm({ ...form, active: checked })}
            />
          </div>
        </Card>

        {/* Summary (edit only) */}
        {existingVoucher && (
          <>
            <SectionTitle>Tóm tắt</SectionTitle>
            <Card className="p-4">
              <ul className="space-y-1.5 text-[13px] text-np-text-sub">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-np-text-muted" />
                  {existingVoucher.discountType === "percent"
                    ? `Giảm ${existingVoucher.value}%${existingVoucher.maxDiscount ? `, tối đa ${fmt(existingVoucher.maxDiscount)}₫` : ""}`
                    : `Giảm ${fmt(existingVoucher.value)}₫`}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-np-text-muted" />
                  Đơn tối thiểu {fmt(existingVoucher.minOrder)}₫
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-np-text-muted" />
                  Đã dùng {existingVoucher.usedCount} / {existingVoucher.usageLimit} lượt
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-np-text-muted" />
                  Hiệu lực: {existingVoucher.startDate} — {existingVoucher.endDate}
                </li>
              </ul>
            </Card>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3 px-4 pt-5">
          <NPButton
            tone="primary"
            size="lg"
            className="flex-1 justify-center"
            onClick={handleSave}
          >
            {existingVoucher ? "Lưu thay đổi" : "Tạo voucher"}
          </NPButton>
          <NPButton tone="ghost" size="lg" onClick={() => navigate("/admin/vouchers")}>
            Hủy
          </NPButton>
        </div>

        <div className="h-5" />
      </div>
    </Screen>
  );
}
