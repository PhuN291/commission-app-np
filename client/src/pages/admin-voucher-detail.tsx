import { useEffect, useMemo, useRef, useState } from "react";
import { useQuayLai } from "@/lib/use-back";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Card,
  DateTimeField,
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
import { authFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { VoucherRow } from "@shared/schema";

type DiscountType = "percent" | "fixed";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const fmtDate = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

export default function AdminVoucherDetail() {
  const { active, onTab } = useTabNav();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const quayLai = useQuayLai("/admin/vouchers");
  const queryClient = useQueryClient();
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
  const populatedRef = useRef(false);

  const { data: list = [] } = useQuery<VoucherRow[]>({
    queryKey: ["/api/admin/vouchers"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/vouchers");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !isNew,
  });

  const existingVoucher = useMemo(
    () => (isNew ? null : list.find((v) => v.id === Number(params.id)) ?? null),
    [isNew, list, params.id],
  );

  // Đổ dữ liệu vào form 1 lần khi voucher đã tải (không ghi đè khi user đang sửa).
  useEffect(() => {
    if (existingVoucher && !populatedRef.current) {
      populatedRef.current = true;
      setForm({
        code: existingVoucher.code,
        discountType: existingVoucher.discountType as DiscountType,
        value: existingVoucher.value.toString(),
        maxDiscount: existingVoucher.maxDiscount?.toString() ?? "",
        minOrder: existingVoucher.minOrder.toString(),
        usageLimit: existingVoucher.usageLimit.toString(),
        startDate: existingVoucher.startDate ?? "",
        endDate: existingVoucher.endDate ?? "",
        active: existingVoucher.active,
      });
    }
  }, [existingVoucher]);

  const saveMut = useMutation({
    mutationFn: async () => {
      // description + minServices không sửa ở form này → không gửi để PATCH giữ nguyên giá trị seed.
      const payload = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        value: Number(form.value) || 0,
        maxDiscount: form.discountType === "percent" ? Number(form.maxDiscount) || null : null,
        minOrder: Number(form.minOrder) || 0,
        usageLimit: Number(form.usageLimit) || 0,
        startDate: form.startDate,
        endDate: form.endDate,
        active: form.active,
      };
      const res = existingVoucher
        ? await authFetch(`/api/admin/vouchers/${existingVoucher.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await authFetch("/api/admin/vouchers", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Không lưu được voucher");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers"] });
      toast({
        title: existingVoucher ? "Đã cập nhật" : "Đã tạo voucher",
        description: `Voucher ${form.code.trim().toUpperCase()} đã được lưu.`,
      });
      navigate("/admin/vouchers");
    },
    onError: (e: unknown) => {
      toast({ title: "Lỗi", description: e instanceof Error ? e.message : "Không lưu được", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!form.code.trim() || !form.value || !form.usageLimit || !form.startDate || !form.endDate) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng điền đầy đủ các trường bắt buộc.",
        variant: "destructive",
      });
      return;
    }
    saveMut.mutate();
  };

  const getStatusBadge = (): { label: string; tone: BadgeTone } | null => {
    if (!existingVoucher) return null;
    if (existingVoucher.usageLimit > 0 && existingVoucher.usedCount >= existingVoucher.usageLimit)
      return { label: "Hết lượt", tone: "critical" };
    if (existingVoucher.endDate && new Date(existingVoucher.endDate) < new Date())
      return { label: "Hết hạn", tone: "muted" }; // đã đóng, cho chìm xuống
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
        onBack={quayLai}
      />

      <div className="min-h-full flow-root bg-np-bg">
        {status && (
          <div className="px-4 pt-4">
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
        )}

        {/* Mã code */}
        <SectionTitle>Mã</SectionTitle>
        <Card className="space-y-1.5 p-4">
          <Label className="text-[12px] font-semibold text-np-text-sub">Mã voucher</Label>
          <Input
            placeholder="Ví dụ: SUMMER30"
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
                placeholder={form.discountType === "percent" ? "Ví dụ: 20" : "Ví dụ: 100000"}
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
                  placeholder="Ví dụ: 500000"
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
              placeholder="Ví dụ: 500000"
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
              placeholder="Ví dụ: 50"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
            />
          </div>
        </Card>

        {/* Thời hạn */}
        <SectionTitle>Thời hạn hiệu lực</SectionTitle>
        <Card className="p-4">
          {/* Xếp dọc chứ không hai cột: lịch tháng bung ra cần đủ bề ngang, nhét
              vào nửa khung 390px thì ô ngày bị bóp còn hơn 160px. */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-np-text-sub">Bắt đầu</Label>
              <DateTimeField
                date={form.startDate}
                onDateChange={(v) => setForm({ ...form, startDate: v })}
                withTime={false}
                placeholder="Chọn ngày bắt đầu"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-np-text-sub">Kết thúc</Label>
              <DateTimeField
                date={form.endDate}
                onDateChange={(v) => setForm({ ...form, endDate: v })}
                withTime={false}
                min={form.startDate || undefined}
                placeholder="Chọn ngày kết thúc"
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
                {form.active ? "Đang bật" : "Đã tắt"}
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
                {existingVoucher.description && (
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-np-text-muted" />
                    {existingVoucher.description}
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-np-text-muted" />
                  Đơn tối thiểu {fmt(existingVoucher.minOrder)}₫
                  {existingVoucher.minServices > 0 ? `, từ ${existingVoucher.minServices} dịch vụ` : ""}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-np-text-muted" />
                  Đã dùng {existingVoucher.usedCount} / {existingVoucher.usageLimit} lượt
                </li>
                {existingVoucher.startDate && existingVoucher.endDate && (
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-np-text-muted" />
                    Hiệu lực: {fmtDate(existingVoucher.startDate)} → {fmtDate(existingVoucher.endDate)}
                  </li>
                )}
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
            disabled={saveMut.isPending}
            onClick={handleSave}
          >
            {saveMut.isPending ? "Đang lưu..." : existingVoucher ? "Lưu thay đổi" : "Tạo voucher"}
          </NPButton>
          <NPButton tone="ghost" size="lg" onClick={() => navigate("/admin/vouchers")}>
            Hủy
          </NPButton>
        </div>

      </div>
    </Screen>
  );
}
