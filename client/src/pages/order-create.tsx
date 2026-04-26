import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import {
  Check,
  ChevronDown,
  Minus,
  Plus,
  Search,
  Stethoscope,
  User,
  UserPlus,
  X,
} from "lucide-react";
import {
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { SERVICE_PACKAGES } from "@/pages/service-detail";
import type { Customer, Service } from "@shared/schema";

function fmtVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

const TIME_SLOTS = [
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00",
];

type SelectedService = {
  service: Service;
  quantity: number;
  packageIdx?: number;
  packageInfo?: { name: string; price: number; commission: number };
};

type SelectedCustomer = { id?: number; name: string; phone: string };

export default function OrderCreate() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);
  const [prefilledFromUrl, setPrefilledFromUrl] = useState(false);

  const [notes, setNotes] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");

  const [wantVat, setWantVat] = useState(false);
  const [vatCompanyName, setVatCompanyName] = useState("");
  const [vatTaxCode, setVatTaxCode] = useState("");
  const [vatCompanyAddress, setVatCompanyAddress] = useState("");
  const [vatEmail, setVatEmail] = useState("");

  const customerRef = useRef<HTMLDivElement>(null);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers", customerSearch],
    queryFn: async () => {
      const url = customerSearch
        ? `/api/customers?q=${encodeURIComponent(customerSearch)}`
        : "/api/customers";
      const res = await fetch(url);
      return res.json();
    },
    enabled: showCustomerResults,
  });

  const { data: allServices = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });

  useEffect(() => {
    if (prefilledFromUrl || allServices.length === 0) return;
    const params = new URLSearchParams(searchString);
    const serviceIdParam = params.get("serviceId");
    const packageIdxParam = params.get("packageIdx");
    if (serviceIdParam) {
      const sId = parseInt(serviceIdParam, 10);
      const svc = allServices.find((s) => s.id === sId);
      if (svc) {
        if (packageIdxParam !== null) {
          const pkgIdx = parseInt(packageIdxParam, 10);
          const pkgs = SERVICE_PACKAGES[svc.code];
          if (pkgs && pkgs[pkgIdx]) {
            const pkg = pkgs[pkgIdx];
            setSelectedServices([{
              service: svc,
              quantity: 1,
              packageIdx: pkgIdx,
              packageInfo: { name: pkg.name, price: pkg.price, commission: pkg.commission },
            }]);
          }
        } else {
          setSelectedServices([{ service: svc, quantity: 1 }]);
        }
        setPrefilledFromUrl(true);
      }
    }
  }, [allServices, searchString, prefilledFromUrl]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredServices = allServices.filter(
    (s) =>
      s.title.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(serviceSearch.toLowerCase()),
  );

  const getItemPrice = (item: SelectedService) =>
    item.packageInfo ? item.packageInfo.price : item.service.price;
  const totalPrice = selectedServices.reduce(
    (sum, item) => sum + getItemPrice(item) * item.quantity,
    0,
  );
  const totalItems = selectedServices.reduce((sum, item) => sum + item.quantity, 0);
  const commissionEstimate = selectedServices.reduce((sum, item) => {
    if (item.packageInfo) return sum + item.packageInfo.commission * item.quantity;
    return sum + Math.round(getItemPrice(item) * item.quantity * 0.05);
  }, 0);

  const isPackageSelected = (serviceId: number, pkgIdx: number) =>
    selectedServices.some((s) => s.service.id === serviceId && s.packageIdx === pkgIdx);

  const selectPackage = (service: Service, pkgIdx: number) => {
    const pkgs = SERVICE_PACKAGES[service.code];
    if (!pkgs || !pkgs[pkgIdx]) return;
    const pkg = pkgs[pkgIdx];
    const existing = selectedServices.find(
      (s) => s.service.id === service.id && s.packageIdx === pkgIdx,
    );
    if (existing) {
      setSelectedServices((prev) =>
        prev.filter((s) => !(s.service.id === service.id && s.packageIdx === pkgIdx)),
      );
    } else {
      setSelectedServices((prev) => [
        ...prev,
        {
          service,
          quantity: 1,
          packageIdx: pkgIdx,
          packageInfo: { name: pkg.name, price: pkg.price, commission: pkg.commission },
        },
      ]);
    }
    setServiceDialogOpen(false);
  };

  const removeService = (serviceId: number, packageIdx?: number) => {
    setSelectedServices((prev) =>
      prev.filter((s) => !(s.service.id === serviceId && s.packageIdx === packageIdx)),
    );
  };

  const updateQuantity = (serviceId: number, packageIdx: number | undefined, delta: number) => {
    setSelectedServices((prev) =>
      prev.map((s) => {
        if (s.service.id === serviceId && s.packageIdx === packageIdx) {
          return { ...s, quantity: Math.max(1, s.quantity + delta) };
        }
        return s;
      }),
    );
  };

  const createCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (customer: Customer) => {
      setSelectedCustomer({ id: customer.id, name: customer.name, phone: customer.phone });
      setShowNewCustomerForm(false);
      setNewName("");
      setNewPhone("");
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Đã tạo khách hàng mới" });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer || selectedServices.length === 0) throw new Error("Missing data");
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = String(now.getFullYear()).slice(2);
      const rand = String(Math.floor(Math.random() * 900) + 100);
      const code = `#NP${year}${month}${day}${rand}`;
      const timeStr = `${day}/${month}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const mainService = selectedServices[0];
      const serviceNames = selectedServices
        .map((s) => (s.packageInfo ? `${s.service.title} - ${s.packageInfo.name}` : s.service.title))
        .join(", ");

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          patientName: selectedCustomer.name,
          phone: selectedCustomer.phone,
          email: null,
          serviceName: serviceNames,
          serviceCode: mainService.service.code,
          quantity: totalItems,
          unitPrice:
            selectedServices.length === 1
              ? getItemPrice(mainService)
              : Math.round(totalPrice / totalItems),
          totalPrice,
          commission: commissionEstimate,
          appointmentStatus: "pending",
          notes: notes || null,
          appointmentDate: appointmentDate || null,
          appointmentTime: appointmentTime || null,
          vatCompanyName: wantVat && vatCompanyName ? vatCompanyName : null,
          vatTaxCode: wantVat && vatTaxCode ? vatTaxCode : null,
          vatCompanyAddress: wantVat && vatCompanyAddress ? vatCompanyAddress : null,
          vatEmail: wantVat && vatEmail ? vatEmail : null,
          createdAt: timeStr,
          userId: 1,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Đã tạo đơn hàng", description: `Mã đơn: ${order.code}` });
      navigate(`/orders/${order.id}`);
    },
    onError: () => {
      toast({ title: "Lỗi", description: "Không thể tạo đơn hàng", variant: "destructive" });
    },
  });

  const canSubmit = selectedCustomer && selectedServices.length > 0 && !createOrderMutation.isPending;

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Tạo đơn hàng" onBack={() => navigate("/orders")} />

      <div className="bg-np-surface-sub">
        {/* Khách hàng */}
        <SectionTitle>Khách hàng</SectionTitle>
        <Card className="p-4">
          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-lg bg-np-surface-sub p-3">
              <div>
                <p className="text-[14px] font-bold text-np-ink">{selectedCustomer.name}</p>
                <p className="mt-0.5 text-[12px] text-np-text-muted">{selectedCustomer.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-np-text-muted hover:text-np-ink"
                aria-label="Bỏ chọn"
              >
                <X size={16} strokeWidth={2.25} />
              </button>
            </div>
          ) : showNewCustomerForm ? (
            <div className="space-y-3">
              <p className="text-[14px] font-medium text-np-ink">Tạo khách hàng mới</p>
              <Input
                placeholder="Họ và tên *"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder="Số điện thoại *"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <NPButton
                  size="sm"
                  tone="primary"
                  disabled={!newName || !newPhone || createCustomerMutation.isPending}
                  onClick={() => createCustomerMutation.mutate({ name: newName, phone: newPhone })}
                >
                  Lưu khách hàng
                </NPButton>
                <NPButton size="sm" tone="ghost" onClick={() => setShowNewCustomerForm(false)}>
                  Hủy
                </NPButton>
              </div>
            </div>
          ) : (
            <div className="relative" ref={customerRef}>
              <div className="relative">
                <Search
                  size={16}
                  strokeWidth={2.25}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-np-text-muted"
                />
                <Input
                  placeholder="Tìm tên hoặc số điện thoại..."
                  className="pl-9"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerResults(true);
                  }}
                  onFocus={() => setShowCustomerResults(true)}
                />
              </div>
              {showCustomerResults && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-np-card border border-np-border bg-white shadow-lg">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 border-b border-np-surface-pressed px-4 py-3 text-left text-np-link transition-colors hover:bg-np-surface-sub"
                    onClick={() => {
                      setShowNewCustomerForm(true);
                      setShowCustomerResults(false);
                      setNewName(customerSearch);
                      setCustomerSearch("");
                    }}
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#E3F1FF]">
                      <UserPlus size={16} strokeWidth={2.25} />
                    </div>
                    <span className="text-[14px] font-medium">Tạo khách hàng mới</span>
                  </button>
                  {customers.length > 0 ? (
                    customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex w-full items-center gap-3 border-b border-np-surface-pressed px-4 py-3 text-left transition-colors last:border-0 hover:bg-np-surface-sub"
                        onClick={() => {
                          setSelectedCustomer({ id: c.id, name: c.name, phone: c.phone });
                          setShowCustomerResults(false);
                          setCustomerSearch("");
                        }}
                      >
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-np-surface-sub text-np-text-sub">
                          <User size={16} strokeWidth={2.25} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-np-ink">{c.name}</p>
                          <p className="text-[11px] text-np-text-muted">{c.phone}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-[13px] text-np-text-muted">
                      {customerSearch ? "Không tìm thấy khách hàng" : "Chưa có khách hàng nào"}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Ngày & giờ hẹn */}
        <SectionTitle>Ngày & giờ hẹn</SectionTitle>
        <Card className="space-y-4 p-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-np-text-sub">Ngày hẹn</label>
            <Input
              type="date"
              value={appointmentDate}
              onChange={(e) => {
                setAppointmentDate(e.target.value);
                setAppointmentTime("");
              }}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          {appointmentDate && (
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-np-text-sub">Giờ hẹn</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setAppointmentTime(time)}
                    className={`h-8 rounded-np-button border text-[12px] font-medium transition-all ${
                      appointmentTime === time
                        ? "border-np-brand-ink bg-np-brand-ink text-white"
                        : "border-np-border-strong bg-np-surface-sub text-np-ink hover:border-np-brand-ink hover:text-np-brand-ink"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Dịch vụ */}
        <SectionTitle>Dịch vụ</SectionTitle>
        <Card className="space-y-4 p-4">
          {selectedServices.length > 0 && (
            <div className="overflow-hidden rounded-np-card border border-np-border">
              {selectedServices.map((item, idx) => {
                const itemKey = `${item.service.id}-${item.packageIdx ?? "base"}`;
                const price = getItemPrice(item);
                return (
                  <div
                    key={itemKey}
                    className={`p-3 ${idx > 0 ? "border-t border-np-surface-pressed" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-np-surface-sub text-np-text-sub">
                        <Stethoscope size={20} strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-np-ink">{item.service.title}</p>
                        {item.packageInfo && (
                          <p className="mt-0.5 text-[12px] text-np-brand-ink">{item.packageInfo.name}</p>
                        )}
                        <p className="mt-0.5 text-[12px] text-np-text-muted">{fmtVND(price)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeService(item.service.id, item.packageIdx)}
                        className="mt-0.5 flex-shrink-0 text-np-text-muted hover:text-np-ink"
                        aria-label="Bỏ dịch vụ"
                      >
                        <X size={16} strokeWidth={2.25} />
                      </button>
                    </div>
                    <div className="ml-[52px] mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.service.id, item.packageIdx, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-np-border-strong text-np-text-sub hover:bg-np-surface-sub"
                          aria-label="Giảm"
                        >
                          <Minus size={14} strokeWidth={2.25} />
                        </button>
                        <span className="w-6 text-center text-[14px] font-bold text-np-ink">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.service.id, item.packageIdx, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-np-border-strong text-np-text-sub hover:bg-np-surface-sub"
                          aria-label="Tăng"
                        >
                          <Plus size={14} strokeWidth={2.25} />
                        </button>
                      </div>
                      <span className="text-[14px] font-bold text-np-ink tabular-nums">
                        {fmtVND(price * item.quantity)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setServiceSearch("");
              setExpandedServiceId(null);
              setServiceDialogOpen(true);
            }}
            className="flex items-center gap-2 py-2 text-[14px] font-medium text-np-brand-ink transition-colors hover:text-np-brand-hover"
          >
            <Plus size={16} strokeWidth={2.25} />
            Thêm dịch vụ
          </button>
        </Card>

        {/* Ghi chú */}
        <SectionTitle>Ghi chú</SectionTitle>
        <Card className="p-4">
          <textarea
            placeholder="Thêm ghi chú cho đơn hàng..."
            className="h-20 w-full resize-none rounded-np-button border border-np-border-strong bg-np-surface-sub p-3 text-[14px] text-np-ink transition-all focus:bg-white focus:outline-none focus:ring-1 focus:ring-np-brand-ink"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Card>

        {/* Thanh toán */}
        <SectionTitle>Thanh toán</SectionTitle>
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-np-text-sub">Tạm tính ({totalItems} dịch vụ)</span>
            <span className="font-medium text-np-ink tabular-nums">{fmtVND(totalPrice)}</span>
          </div>
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-np-text-sub">Giảm giá</span>
            <span className="text-np-ink tabular-nums">0₫</span>
          </div>
          <div className="flex items-center justify-between border-t border-np-border pt-3">
            <span className="text-[14px] font-bold text-np-ink">Tổng cộng</span>
            <span className="text-[16px] font-bold text-np-ink tabular-nums">{fmtVND(totalPrice)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-np-border pt-3">
            <span className="text-[13px] font-medium text-np-text-sub">Hoa hồng ước tính</span>
            <span className="text-[16px] font-extrabold text-np-brand-ink tabular-nums">
              {fmtVND(commissionEstimate)}
            </span>
          </div>
        </Card>

        {/* VAT */}
        <SectionTitle>Hóa đơn công ty</SectionTitle>
        <Card className="p-4">
          <button
            type="button"
            onClick={() => setWantVat(!wantVat)}
            className="flex cursor-pointer items-center gap-3"
          >
            <div
              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                wantVat ? "border-np-brand-ink bg-np-brand-ink" : "border-np-text-muted"
              }`}
            >
              {wantVat && <Check size={12} strokeWidth={3} className="text-white" />}
            </div>
            <span className="text-[14px] font-bold text-np-ink">
              Khách hàng in hoá đơn công ty
            </span>
          </button>
          {wantVat && (
            <div className="mt-4 space-y-4 border-t border-np-border pt-4">
              <VatField label="Tên công ty" value={vatCompanyName} onChange={setVatCompanyName} placeholder="Nhập tên công ty" />
              <VatField label="Mã số thuế" value={vatTaxCode} onChange={setVatTaxCode} placeholder="Nhập mã số thuế" />
              <VatField label="Địa chỉ công ty" value={vatCompanyAddress} onChange={setVatCompanyAddress} placeholder="Nhập địa chỉ công ty" />
              <VatField label="Email nhận hóa đơn" value={vatEmail} onChange={setVatEmail} placeholder="Nhập email nhận hóa đơn" />
            </div>
          )}
        </Card>

        {/* Submit */}
        <div className="px-4 pt-5">
          <NPButton
            tone="primary"
            size="lg"
            className="w-full justify-center"
            disabled={!canSubmit}
            onClick={() => createOrderMutation.mutate()}
          >
            {createOrderMutation.isPending ? "Đang tạo..." : "Tạo đơn hàng"}
          </NPButton>
          {(!selectedCustomer || selectedServices.length === 0) && (
            <p className="mt-2 text-center text-[12px] text-np-text-muted">
              {!selectedCustomer && "Vui lòng chọn khách hàng"}
              {selectedCustomer && selectedServices.length === 0 && "Vui lòng thêm dịch vụ"}
            </p>
          )}
        </div>

        <div className="h-5" />
      </div>

      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="sm:max-w-lg overflow-hidden rounded-np-card p-0">
          <DialogHeader className="px-5 pb-3 pt-5">
            <DialogTitle className="text-[16px] font-semibold text-np-ink">
              Chọn dịch vụ
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-3">
            <div className="relative">
              <Search
                size={16}
                strokeWidth={2.25}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-np-text-muted"
              />
              <Input
                placeholder="Tìm dịch vụ..."
                className="pl-9"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto border-t border-np-border">
            {filteredServices.length > 0 ? (
              filteredServices.map((s) => {
                const pkgs = SERVICE_PACKAGES[s.code] || [];
                const isExpanded = expandedServiceId === s.id;
                const selectedCount = pkgs.filter((_, i) => isPackageSelected(s.id, i)).length;
                return (
                  <div key={s.id} className="border-b border-np-surface-pressed last:border-0">
                    <button
                      type="button"
                      className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-np-surface-sub ${
                        isExpanded ? "bg-np-surface-sub" : ""
                      }`}
                      onClick={() => setExpandedServiceId(isExpanded ? null : s.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-np-ink">{s.title}</p>
                          {selectedCount > 0 && (
                            <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-np-brand-ink px-1 text-[10px] font-bold text-white">
                              {selectedCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-np-text-muted">
                          {pkgs.length > 0 ? `${pkgs.length} gói khả dụng` : "Chưa có gói"}
                        </p>
                      </div>
                      <ChevronDown
                        size={16}
                        strokeWidth={2.25}
                        className={`flex-shrink-0 text-np-text-muted transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isExpanded && pkgs.length > 0 && (
                      <div className="px-3 pb-2">
                        {pkgs.map((pkg, pkgIdx) => {
                          const selected = isPackageSelected(s.id, pkgIdx);
                          return (
                            <button
                              key={pkgIdx}
                              type="button"
                              onClick={() => selectPackage(s, pkgIdx)}
                              className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all last:mb-0 ${
                                selected
                                  ? "bg-np-brand-soft ring-1 ring-np-brand-ink/30"
                                  : "border border-np-border bg-white hover:bg-np-surface-sub"
                              }`}
                            >
                              <div
                                className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded transition-colors ${
                                  selected
                                    ? "bg-np-brand-ink"
                                    : "border border-np-border-strong bg-white"
                                }`}
                              >
                                {selected && <Check size={12} strokeWidth={3} className="text-white" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-[13px] ${
                                    selected
                                      ? "font-semibold text-np-ink"
                                      : "font-medium text-np-ink-sub"
                                  }`}
                                >
                                  {pkg.name}
                                </p>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <span className="text-[11px] text-np-text-sub">
                                    {fmtVND(pkg.price)}
                                  </span>
                                  <span className="text-[11px] text-np-text-muted">·</span>
                                  <span className="text-[11px] font-medium text-np-brand-ink">
                                    HH {fmtVND(pkg.commission)}
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
              })
            ) : (
              <div className="p-8 text-center text-[14px] text-np-text-muted">
                Không tìm thấy dịch vụ
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}

function VatField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[14px] font-bold text-np-ink">{label}</label>
      <Input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
