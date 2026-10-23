import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQuayLai } from "@/lib/use-back";
import { useLocation, useParams } from "wouter";
import {
  BadgePercent,
  CheckCircle2,
  Clock,
  Hash,
  MedicalServices,
  Minus,
  Package,
  Plus,
  Shield,
  ShoppingCart,
  UserRound,
} from "@/components/np/icon";
import {
  Badge,
  Card,
  DetailHeader,
  NPButton,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Service } from "@shared/schema";
import { formatMoney } from "@/lib/format";
import { canCreateOrder, type UserRole } from "@shared/types";
import {
  SERVICE_PACKAGES,
  type PackageMarker,
  type ServicePackage,
} from "@shared/service-packages";

// Bảng gói đã chuyển sang shared để máy chủ tự tính giá; giữ lối import cũ cho các
// màn đang lấy bảng gói từ đây.
export { SERVICE_PACKAGES };
export type { PackageMarker, ServicePackage };

export default function ServiceDetail() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const quayLai = useQuayLai("/services");
  const params = useParams<{ id: string }>();
  const serviceId = parseInt(params.id || "0");
  const [expandedMarkers, setExpandedMarkers] = useState<Record<string, boolean>>({});
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [selectedPackageIdx, setSelectedPackageIdx] = useState<number | null>(null);
  // Kế toán không tạo đơn (máy chủ cũng chặn), nên ẩn hẳn nút thay vì để bấm rồi báo lỗi.
  const role = (typeof window !== "undefined" ? localStorage.getItem("np_role") : null) as UserRole | null;
  const coTheTaoDon = canCreateOrder(role);

  const { data: allServices = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const service = allServices.find((s) => s.id === serviceId);
  const packages = service ? SERVICE_PACKAGES[service.code] || [] : [];

  const toggleMarker = (pkgIdx: number, mIdx: number) => {
    const key = `${pkgIdx}-${mIdx}`;
    setExpandedMarkers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCreateOrder = () => {
    if (packages.length > 0) {
      setSelectedPackageIdx(null);
      setPackageDialogOpen(true);
    } else if (service) {
      navigate(`/orders/new?serviceId=${service.id}`);
    }
  };

  const confirmPackageAndNavigate = () => {
    if (selectedPackageIdx !== null && service) {
      navigate(`/orders/new?serviceId=${service.id}&packageIdx=${selectedPackageIdx}`);
    }
  };

  if (isLoading) {
    return (
      <Screen activeTab={active} onTab={onTab} noHeader>
        <DetailHeader title="Dịch vụ" onBack={quayLai} />
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
        </div>
      </Screen>
    );
  }

  if (!service) {
    return (
      <Screen activeTab={active} onTab={onTab} noHeader>
        <DetailHeader title="Dịch vụ" onBack={quayLai} />
        <div className="flex flex-1 flex-col items-center justify-center py-20">
          <p className="text-np-text-muted">Không tìm thấy dịch vụ</p>
          <button
            type="button"
            onClick={() => navigate("/services")}
            className="mt-3 text-[14px] font-medium text-np-brand-ink hover:underline"
          >
            Quay lại danh sách
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title={service.title} onBack={quayLai} />

      <div className="min-h-full flow-root bg-np-bg pb-24">
        {/* Hero */}
        <div className="bg-white px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-np-card bg-np-surface-sub">
              <MedicalServices size={24} strokeWidth={2.2} className="text-np-text-sub" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[18px] font-bold text-np-ink">{service.title}</h2>
                <span className="flex items-center gap-1 rounded bg-np-surface-sub px-1.5 py-0.5 text-[10px] font-bold text-np-text-muted">
                  <Hash size={10} /> {service.code}
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-np-text-sub">
                {service.description}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-np-surface-sub px-3 py-2.5">
              <div className="flex items-center gap-1 text-[11px] text-np-text-muted">
                <Package size={12} strokeWidth={2.25} /> Giá dịch vụ
              </div>
              <div className="mt-1 text-[15px] font-bold text-np-ink">{formatMoney(service.price)}</div>
            </div>
            <div className="rounded-lg bg-np-brand-soft px-3 py-2.5">
              <div className="flex items-center gap-1 text-[11px] text-np-brand-ink">
                <BadgePercent size={12} strokeWidth={2.25} /> Hoa hồng
              </div>
              <div className="mt-1 text-[15px] font-bold text-np-brand-ink">
                {service.commissionRange}₫
              </div>
            </div>
          </div>
        </div>

        {/* Thông tin chi tiết */}
        <SectionTitle>Thông tin chi tiết</SectionTitle>
        <Card className="space-y-3 p-4">
          <InfoLine
            icon={<UserRound size={15} strokeWidth={2.25} />}
            label="Chỉ định"
            trailing={
              <Badge>
                {service.requiresDoctor ? "Bác sĩ" : "Kỹ thuật viên"}
              </Badge>
            }
          />
          <InfoLine
            icon={<Clock size={15} strokeWidth={2.25} />}
            label="Thời gian"
            trailing={<span className="text-[13px] font-bold text-np-ink">{service.duration}</span>}
          />
          <InfoLine
            icon={<Shield size={15} strokeWidth={2.25} />}
            label="Bảo hiểm"
            trailing={
              // Bảo hiểm là thuộc tính cố định của dịch vụ. Tô đỏ khi không hỗ trợ là báo
              // động giả trên màn tra cứu, người xem tưởng có gì đó hỏng.
              <Badge tone={service.insurance === "Có hỗ trợ" ? "success" : "neutral"}>
                {service.insurance}
              </Badge>
            }
          />
        </Card>

        {/* Packages */}
        {packages.length > 0 && (
          <>
            <SectionTitle>Gói dịch vụ ({packages.length})</SectionTitle>
            <div className="space-y-3 px-0">
              {packages.map((pkg, pkgIdx) => (
                <Card key={pkgIdx} className="overflow-hidden p-0">
                  <div className="bg-np-surface-sub px-4 py-3.5">
                    <h4 className="text-[14px] font-bold text-np-ink">
                      {pkg.name} ({pkg.markers.length} mục)
                    </h4>
                    <p className="mt-1 text-[12px] leading-relaxed text-np-text-sub">
                      {pkg.description}
                    </p>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="flex items-center gap-1 text-[12px]">
                        <Package size={12} strokeWidth={2.25} className="text-np-text-muted" />
                        <span className="text-np-text-muted">Giá:</span>
                        <span className="font-bold text-np-ink">{formatMoney(pkg.price)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[12px]">
                        <BadgePercent size={12} strokeWidth={2.25} className="text-np-brand-ink" />
                        <span className="text-np-brand-ink">Hoa hồng:</span>
                        <span className="font-bold text-np-brand-ink">{formatMoney(pkg.commission)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {pkg.markers.map((marker, mIdx) => {
                      const isExpanded = expandedMarkers[`${pkgIdx}-${mIdx}`];
                      return (
                        <div
                          key={mIdx}
                          className={
                            mIdx === pkg.markers.length - 1
                              ? ""
                              : "np-divider"
                          }
                        >
                          <button
                            type="button"
                            onClick={() => marker.description && toggleMarker(pkgIdx, mIdx)}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                              marker.description
                                ? "cursor-pointer hover:bg-np-surface-sub"
                                : "cursor-default"
                            }`}
                          >
                            {marker.description && isExpanded ? (
                              <Minus size={16} className="flex-shrink-0 text-np-brand-ink" />
                            ) : (
                              <Plus size={16} className="flex-shrink-0 text-np-brand-ink" />
                            )}
                            <span className="text-[14px] text-np-ink">{marker.name}</span>
                          </button>
                          {isExpanded && marker.description && (
                            <div className="px-4 pb-3 pl-11">
                              <p className="text-[12px] leading-relaxed text-np-text-sub">
                                {marker.description}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

      </div>

      {/* Sticky CTA */}
      {coTheTaoDon && (
        <div className="absolute bottom-[64px] left-0 right-0 z-20 border-t border-np-border bg-white p-3">
          <NPButton
            tone="primary"
            size="lg"
            className="w-full justify-center"
            icon={ShoppingCart}
            onClick={handleCreateOrder}
          >
            Tạo đơn hàng
          </NPButton>
        </div>
      )}

      <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
        <DialogContent className="overflow-hidden rounded-np-card p-0 sm:max-w-md">
          <DialogHeader className="px-5 pb-0 pt-5">
            <DialogTitle className="text-[16px] font-bold text-np-ink">Chọn gói dịch vụ</DialogTitle>
            <p className="mt-1 text-[12px] text-np-text-muted">Chọn gói để tạo đơn</p>
          </DialogHeader>
          <div className="mt-4 max-h-[50vh] overflow-y-auto border-t border-np-border">
            {packages.map((pkg, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPackageIdx(idx)}
                className={`w-full np-divider px-5 py-4 text-left transition-colors last:border-0 ${
                  selectedPackageIdx === idx ? "bg-np-brand-soft" : "hover:bg-np-surface-sub"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      selectedPackageIdx === idx
                        ? "border-np-brand-ink bg-np-brand-ink"
                        : "border-np-border-strong"
                    }`}
                  >
                    {selectedPackageIdx === idx && (
                      <CheckCircle2 size={14} className="text-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-np-ink">{pkg.name}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-np-text-sub">
                      {pkg.description}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[12px]">
                      <span>
                        <span className="text-np-text-muted">Giá: </span>
                        <span className="font-bold text-np-ink">{formatMoney(pkg.price)}</span>
                      </span>
                      <span>
                        <span className="text-np-brand-ink">Hoa hồng: </span>
                        <span className="font-bold text-np-brand-ink">{formatMoney(pkg.commission)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 border-t border-np-border bg-white px-5 py-4">
            <NPButton
              tone="primary"
              className="flex-1 justify-center"
              disabled={selectedPackageIdx === null}
              onClick={confirmPackageAndNavigate}
            >
              Tạo đơn hàng
            </NPButton>
            <NPButton tone="ghost" onClick={() => setPackageDialogOpen(false)}>
              Hủy
            </NPButton>
          </div>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}

function InfoLine({
  icon,
  label,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  trailing: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[12px] text-np-text-muted">
        {icon}
        <span>{label}</span>
      </div>
      {trailing}
    </div>
  );
}
