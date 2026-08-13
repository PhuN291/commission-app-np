import { useState } from "react";
import {
  Check,
  CheckCircle,
  ChevronDown,
  MedicalServices,
  Minus,
  Plus,
  Search,
  X,
} from "@/components/np/icon";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SERVICE_PACKAGES } from "@/pages/service-detail";
import type { Service } from "@shared/schema";
import { DETAIL_HEADER_BTN } from "./detail-header";

/** Một dòng dịch vụ đã chọn trên đơn. */
export type ServiceLine = {
  service: Service;
  quantity: number;
  /** Chỉ số gói trong SERVICE_PACKAGES. Bỏ trống = dùng giá gốc của dịch vụ. */
  packageIdx?: number;
  packageInfo?: { name: string; price: number; commission: number };
};

/** Đơn giá của một dòng: giá gói nếu có, không thì giá gốc dịch vụ. */
export function giaDong(line: ServiceLine): number {
  return line.packageInfo ? line.packageInfo.price : line.service.price;
}

/** Khoá phân biệt hai dòng: cùng dịch vụ nhưng khác gói vẫn là hai dòng. */
export function khoaDong(line: ServiceLine): string {
  return `${line.service.id}-${line.packageIdx ?? "base"}`;
}

/**
 * Tên đầy đủ của một dòng: "Nội soi tiêu hóa - Gói cơ bản", hoặc chỉ tên dịch vụ
 * khi không chọn gói.
 *
 * Quy ước ghép tên này là thứ DUY NHẤT cho phép suy ngược từ đơn đã lưu ra đúng
 * gói đã chọn, nên phải nằm một chỗ. Trước đây màn tạo đơn ghép tay tại chỗ gửi
 * đơn, ai sửa dấu nối ở đó là màn sửa dịch vụ hết dò ra gói.
 */
export function tenDayDu(line: ServiceLine): string {
  return line.packageInfo ? `${line.service.title} - ${line.packageInfo.name}` : line.service.title;
}

/** Một dòng đã chọn → đúng hình dạng PATCH /api/orders/:id/services nhận. */
export function payloadDong(line: ServiceLine) {
  return {
    serviceCode: line.service.code,
    serviceName: tenDayDu(line),
    serviceCategory: line.service.category ?? null,
    quantity: line.quantity,
    unitPrice: giaDong(line),
  };
}

/** Dòng dịch vụ đã lưu trên đơn, đủ để dựng lại lựa chọn cũ. */
type DongDaLuu = {
  serviceId: number;
  serviceName: string;
  quantity: number;
  unitPrice: number;
};

/**
 * Dựng lại danh sách chọn từ dịch vụ đã lưu trên đơn, để mở ra sửa là thấy đúng
 * thứ đang có chứ không phải nhập lại từ đầu.
 *
 * Dò dịch vụ theo mã trước, không ra mới dò theo tên: đơn cũ có thể lưu serviceId
 * bằng 0 khi lúc nhận đơn chưa khớp được dịch vụ. Dịch vụ đã bị xoá khỏi danh mục
 * thì bỏ qua dòng đó, giữ lại cũng không sửa được vì không còn giá để tính.
 */
export function dungLaiDong(items: DongDaLuu[], services: Service[]): ServiceLine[] {
  const ra: ServiceLine[] = [];
  for (const it of items) {
    // Đơn tạo trước khi order_items tách theo từng dịch vụ chỉ có MỘT dòng mang
    // cái tên đã nối bằng ", ", số lượng cộng dồn và đơn giá bình quân. Tách lại
    // theo tên rồi lấy giá thật trong danh mục: giá bình quân của hai dịch vụ
    // khác giá không đúng với dịch vụ nào cả, lưu lại là sai tiền.
    const manh = it.serviceName.split(", ").filter(Boolean);
    const gop = manh.length > 1;
    for (const ten of manh) {
      const sv = gop
        ? services.find((s) => ten === s.title || ten.startsWith(`${s.title} - `))
        : (services.find((s) => s.id === it.serviceId) ??
          services.find((s) => ten === s.title || ten.startsWith(`${s.title} - `)));
      if (!sv) continue;
      const pkgs = SERVICE_PACKAGES[sv.code] ?? [];
      const dau = `${sv.title} - `;
      const tenGoi = ten.startsWith(dau) ? ten.slice(dau.length) : null;
      const idx = tenGoi ? pkgs.findIndex((p) => p.name === tenGoi) : -1;
      ra.push({
        service: sv,
        // Dòng gộp không giữ được số lượng của từng dịch vụ, đành về 1 và để người
        // dùng chỉnh, thay vì bịa ra con số nhìn như thật.
        quantity: gop ? 1 : Math.max(1, it.quantity),
        packageIdx: idx >= 0 ? idx : undefined,
        packageInfo: idx >= 0 ? pkgs[idx] : undefined,
      });
    }
  }
  return ra;
}

function fmtVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

/**
 * Danh sách dịch vụ đã chọn, sửa được số lượng và bỏ từng dòng.
 *
 * Tách khỏi màn tạo đơn để màn chi tiết đơn dùng lại y hệt: hai chỗ cùng sửa một
 * thứ mà mỗi chỗ một kiểu thì người dùng phải học hai lần, và mỗi lần chỉnh giao
 * diện lại phải nhớ sửa cả hai.
 */
export function ServiceLines({
  lines,
  onChangeQuantity,
  onRemove,
  className,
}: {
  lines: ServiceLine[];
  onChangeQuantity: (line: ServiceLine, delta: number) => void;
  onRemove: (line: ServiceLine) => void;
  className?: string;
}) {
  if (lines.length === 0) return null;
  return (
    <div className={cn("overflow-hidden rounded-np-card border border-np-border", className)}>
      {lines.map((item, idx) => {
        const price = giaDong(item);
        return (
          <div
            key={khoaDong(item)}
            className={cn("p-3", idx > 0 && "border-t border-np-surface-pressed")}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-np-button bg-np-surface-sub text-np-text-sub">
                <MedicalServices size={20} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-np-ink">{item.service.title}</p>
                {item.packageInfo && (
                  <p className="mt-0.5 text-[12px] text-np-brand-ink">{item.packageInfo.name}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="mt-0.5 flex-shrink-0 text-np-text-muted hover:text-np-ink"
                aria-label={`Bỏ ${item.service.title}`}
              >
                <X size={16} strokeWidth={2.25} />
              </button>
            </div>
            {/* Ô số lượng có khung riêng, nút giảm/tăng dồn về phải; dòng dưới ghi
                rõ đơn giá nhân số lượng bằng thành tiền, để người đọc kiểm được
                con số chứ không phải nhẩm. */}
            <div className="mt-2.5 flex items-center justify-between gap-3 rounded-np-button border border-np-border px-3 py-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-np-text-muted">Số lượng</p>
                <p className="text-[15px] font-bold tabular-nums text-np-ink">{item.quantity}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangeQuantity(item, -1)}
                  className="flex h-8 w-9 items-center justify-center rounded-np-button bg-np-surface-sub text-np-text-sub transition-colors active:bg-np-surface-pressed"
                  aria-label="Giảm"
                >
                  <Minus size={15} strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  onClick={() => onChangeQuantity(item, 1)}
                  className="flex h-8 w-9 items-center justify-center rounded-np-button bg-np-surface-sub text-np-ink transition-colors active:bg-np-surface-pressed"
                  aria-label="Tăng"
                >
                  <Plus size={15} strokeWidth={2.25} />
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium tabular-nums text-np-link">
                {fmtVND(price)} × {item.quantity}
              </span>
              <span className="text-[15px] font-bold tabular-nums text-np-ink">
                {fmtVND(price * item.quantity)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Hộp chọn dịch vụ: tìm theo tên, gom theo nhóm, mỗi dịch vụ xổ ra các gói.
 *
 * Dùng chung cho màn tạo đơn và màn sửa dịch vụ của đơn đã tạo.
 */
export function ServicePickerSheet({
  open,
  onOpenChange,
  services,
  recentServices = [],
  isPackageSelected,
  onSelectPackage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  /** Dịch vụ khách từng đặt, xếp lên đầu để chọn lại nhanh. */
  recentServices?: Service[];
  isPackageSelected: (serviceId: number, pkgIdx: number) => boolean;
  onSelectPackage: (service: Service, pkgIdx: number) => void;
}) {
  const [tim, setTim] = useState("");
  const [moId, setMoId] = useState<number | null>(null);

  const loc = tim
    ? services.filter((sv) => sv.title.toLowerCase().includes(tim.trim().toLowerCase()))
    : services;

  const theoNhom: { category: string; items: Service[] }[] = [];
  for (const sv of loc) {
    const category = sv.category || "Khác";
    const nhom = theoNhom.find((g) => g.category === category);
    if (nhom) nhom.items.push(sv);
    else theoNhom.push({ category, items: [sv] });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setTim("");
      }}
    >
      <SheetContent
        side="bottom"
        className="mx-auto flex h-[85vh] max-w-[390px] flex-col gap-0 rounded-t-np-sheet border-0 p-0 [&>button]:hidden"
      >
        <div className="np-divider px-4 pb-3 pt-3">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-np-surface-pressed" />
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => onOpenChange(false)}
              className={DETAIL_HEADER_BTN}
            >
              <X size={17} strokeWidth={2.25} />
            </button>
            <SheetTitle className="text-[16px] font-bold text-np-ink">Chọn dịch vụ</SheetTitle>
            <div className="h-9 w-9 flex-shrink-0" />
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="relative">
            <Search
              size={16}
              strokeWidth={2.25}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-np-text-muted"
            />
            <Input
              placeholder="Tìm dịch vụ..."
              className="pl-9"
              value={tim}
              onChange={(e) => setTim(e.target.value)}
            />
          </div>
        </div>

        <div className="scrollbar-hide flex-1 overflow-y-auto border-t border-np-surface-pressed pb-4">
          {/* Dịch vụ khách từng đặt, đứng đầu để chọn lại nhanh. Ẩn khi đang tìm
              kiếm vì lúc đó người dùng đã biết mình cần gì. */}
          {!tim && recentServices.length > 0 && (
            <>
              <p className={GROUP_LABEL}>Khách từng đặt</p>
              {recentServices.map((sv) => (
                <ServiceRow
                  key={`recent-${sv.id}`}
                  service={sv}
                  expanded={moId === sv.id}
                  onToggle={() => setMoId(moId === sv.id ? null : sv.id)}
                  isPackageSelected={isPackageSelected}
                  onSelectPackage={onSelectPackage}
                />
              ))}
            </>
          )}

          {theoNhom.length > 0 ? (
            theoNhom.map((nhom) => (
              <div key={nhom.category}>
                <p className={GROUP_LABEL}>{nhom.category}</p>
                {nhom.items.map((sv) => (
                  <ServiceRow
                    key={sv.id}
                    service={sv}
                    expanded={moId === sv.id}
                    onToggle={() => setMoId(moId === sv.id ? null : sv.id)}
                    isPackageSelected={isPackageSelected}
                    onSelectPackage={onSelectPackage}
                  />
                ))}
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-[13px] text-np-text-muted">
              Không tìm thấy dịch vụ
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Nhãn nhóm trong hộp chọn. Nhỏ và xám trên dải nền xám nên đọc ra ngay là NHÃN,
 * không tranh chỗ với tên dịch vụ bên dưới. Trước đây nhãn 13px đậm màu đen đứng
 * trên tên dịch vụ 15px, tức nhỏ hơn chính thứ nó đứng đầu, nhìn như lỗi chữ.
 */
const GROUP_LABEL = "bg-np-surface-sub px-4 py-1.5 text-[12px] font-bold text-np-text-muted";

/** Một dịch vụ trong hộp chọn: bấm để xổ danh sách gói bên dưới. */
function ServiceRow({
  service,
  expanded,
  onToggle,
  isPackageSelected,
  onSelectPackage,
}: {
  service: Service;
  expanded: boolean;
  onToggle: () => void;
  isPackageSelected: (serviceId: number, pkgIdx: number) => boolean;
  onSelectPackage: (service: Service, pkgIdx: number) => void;
}) {
  const pkgs = SERVICE_PACKAGES[service.code] || [];
  const selectedCount = pkgs.filter((_, i) => isPackageSelected(service.id, i)).length;
  return (
    <div className="np-divider last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-np-surface-sub",
          expanded && "bg-np-surface-sub",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold text-np-ink">{service.title}</p>
            {selectedCount > 0 && (
              <CheckCircle
                size={16}
                className="flex-shrink-0 text-np-brand-ink"
                aria-label={`Đã chọn ${selectedCount} gói`}
              />
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-np-text-muted">
            {pkgs.length > 0 ? `${pkgs.length} gói khả dụng` : "Chưa có gói"}
          </p>
        </div>
        <ChevronDown
          size={16}
          strokeWidth={2.25}
          className={cn(
            "flex-shrink-0 text-np-text-muted transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded && pkgs.length > 0 && (
        <div className="px-3 pb-2">
          {pkgs.map((pkg, pkgIdx) => {
            const selected = isPackageSelected(service.id, pkgIdx);
            return (
              <button
                key={pkgIdx}
                type="button"
                onClick={() => onSelectPackage(service, pkgIdx)}
                className={cn(
                  "mb-1 flex w-full items-center gap-3 rounded-np-button px-3 py-2.5 text-left transition-all last:mb-0",
                  selected
                    ? "border border-np-brand-ink bg-np-brand-soft"
                    : "border border-np-border bg-white active:bg-np-surface-sub",
                )}
              >
                <div
                  className={cn(
                    "flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded transition-colors",
                    selected ? "bg-np-brand-ink" : "border border-np-border-strong bg-white",
                  )}
                >
                  {selected && <Check size={12} strokeWidth={3} className="text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-np-ink">{pkg.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px]">
                    <span className="tabular-nums text-np-text-sub">{fmtVND(pkg.price)}</span>
                    <span className="text-np-text-muted">·</span>
                    <span className="font-medium tabular-nums text-np-brand-ink">
                      Hoa hồng {fmtVND(pkg.commission)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
