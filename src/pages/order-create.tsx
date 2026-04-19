import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  X,
  Minus,
  User,
  Phone,
  Package,
  FileText,
  UserPlus,
  Stethoscope,
  CalendarDays,
  Clock,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Breadcrumb } from "@/components/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/app-header";
import { SERVICE_PACKAGES } from "@/pages/service-detail";
import type { Service, Customer } from "@shared/schema";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
}

interface SelectedService {
  service: Service;
  quantity: number;
  packageIdx?: number;
  packageInfo?: { name: string; price: number; commission: number };
}

interface SelectedCustomer {
  id?: number;
  name: string;
  phone: string;
}

export default function OrderCreate() {
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
  const [prefilledFromUrl, setPrefilledFromUrl] = useState(false);
  const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);

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
      const url = customerSearch ? `/api/customers?q=${encodeURIComponent(customerSearch)}` : "/api/customers";
      const res = await fetch(url);
      return res.json();
    },
    enabled: showCustomerResults,
  });

  const { data: allServices = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  useEffect(() => {
    if (prefilledFromUrl || allServices.length === 0) return;
    const params = new URLSearchParams(searchString);
    const serviceIdParam = params.get("serviceId");
    const packageIdxParam = params.get("packageIdx");

    if (serviceIdParam) {
      const sId = parseInt(serviceIdParam);
      const svc = allServices.find(s => s.id === sId);
      if (svc) {
        if (packageIdxParam !== null) {
          const pkgIdx = parseInt(packageIdxParam);
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

  const filteredServices = allServices.filter(s =>
    s.title.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const getItemPrice = (item: SelectedService) => item.packageInfo ? item.packageInfo.price : item.service.price;
  const totalPrice = selectedServices.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  const totalItems = selectedServices.reduce((sum, item) => sum + item.quantity, 0);

  const commissionEstimate = selectedServices.reduce((sum, item) => {
    if (item.packageInfo) return sum + item.packageInfo.commission * item.quantity;
    return sum + Math.round(getItemPrice(item) * item.quantity * 0.05);
  }, 0);

  const handleServiceDialogChange = (open: boolean) => {
    if (open) {
      setServiceSearch("");
      setExpandedServiceId(null);
    }
    setServiceDialogOpen(open);
  };

  const openServiceDialog = () => {
    handleServiceDialogChange(true);
  };

  const selectPackage = (service: Service, pkgIdx: number) => {
    const pkgs = SERVICE_PACKAGES[service.code];
    if (!pkgs || !pkgs[pkgIdx]) return;
    const pkg = pkgs[pkgIdx];
    const existing = selectedServices.find(s => s.service.id === service.id && s.packageIdx === pkgIdx);
    if (existing) {
      setSelectedServices(prev => prev.filter(s => !(s.service.id === service.id && s.packageIdx === pkgIdx)));
    } else {
      setSelectedServices(prev => [...prev, {
        service,
        quantity: 1,
        packageIdx: pkgIdx,
        packageInfo: { name: pkg.name, price: pkg.price, commission: pkg.commission },
      }]);
    }
    setServiceDialogOpen(false);
  };

  const isPackageSelected = (serviceId: number, pkgIdx: number) => {
    return selectedServices.some(s => s.service.id === serviceId && s.packageIdx === pkgIdx);
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
      const serviceNames = selectedServices.map(s => {
        if (s.packageInfo) {
          return `${s.service.title} - ${s.packageInfo.name}`;
        }
        return s.service.title;
      }).join(", ");

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
          unitPrice: selectedServices.length === 1 ? getItemPrice(mainService) : Math.round(totalPrice / totalItems),
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

  const removeService = (serviceId: number, packageIdx?: number) => {
    setSelectedServices(prev => prev.filter(s => !(s.service.id === serviceId && s.packageIdx === packageIdx)));
  };

  const updateQuantity = (serviceId: number, packageIdx: number | undefined, delta: number) => {
    setSelectedServices(prev => prev.map(s => {
      if (s.service.id === serviceId && s.packageIdx === packageIdx) {
        const newQty = Math.max(1, s.quantity + delta);
        return { ...s, quantity: newQty };
      }
      return s;
    }));
  };

  const canSubmit = selectedCustomer && selectedServices.length > 0 && !createOrderMutation.isPending;

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader activePage="orders" />
      <main className="flex-1 p-4 md:p-8 space-y-5 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[{ label: "Đơn hàng", href: "/orders" }, { label: "Tạo đơn hàng" }]} />
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/orders")} className="shrink-0 text-[#8c9196] hover:text-[#1a1c1d] transition-colors" data-testid="button-back-orders">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-[#1a1c1d]" data-testid="text-create-order-title">Tạo đơn hàng</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center gap-2">
                <User className="h-4 w-4 text-[#4a4d50]" />
                <h2 className="text-sm font-bold text-[#1a1c1d]">Khách hàng</h2>
              </div>
              <div className="px-4 sm:px-5 py-4">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between bg-[#f6f6f7] rounded-lg p-3">
                    <div>
                      <p className="text-sm font-bold text-[#1a1c1d]" data-testid="text-selected-customer">{selectedCustomer.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-[#8c9196] flex items-center gap-1"><Phone className="h-3 w-3" />{selectedCustomer.phone}</span>
                      </div>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="text-[#8c9196] hover:text-[#1a1c1d]" data-testid="button-remove-customer">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : showNewCustomerForm ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-[#1a1c1d]">Tạo khách hàng mới</p>
                    <Input
                      placeholder="Họ và tên *"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-[#f6f6f7] border-[#d2d5d8] rounded-lg h-9 text-sm"
                      data-testid="input-new-customer-name"
                    />
                    <Input
                      placeholder="Số điện thoại *"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="bg-[#f6f6f7] border-[#d2d5d8] rounded-lg h-9 text-sm"
                      data-testid="input-new-customer-phone"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-[#1a1c1d] hover:bg-[#2a2c2d] text-white font-bold"
                        disabled={!newName || !newPhone || createCustomerMutation.isPending}
                        onClick={() => createCustomerMutation.mutate({ name: newName, phone: newPhone })}
                        data-testid="button-save-new-customer"
                      >
                        Lưu khách hàng
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs border-[#d2d5d8]"
                        onClick={() => setShowNewCustomerForm(false)}
                        data-testid="button-cancel-new-customer"
                      >
                        Hủy
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative" ref={customerRef}>
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9196]" />
                      <Input
                        placeholder="Tìm tên hoặc số điện thoại khách hàng..."
                        className="pl-9 bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white transition-all rounded-lg h-9 text-sm"
                        value={customerSearch}
                        onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerResults(true); }}
                        onFocus={() => setShowCustomerResults(true)}
                        data-testid="input-search-customer"
                      />
                    </div>
                    {showCustomerResults && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#d2d5d8] rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                        <button
                          className="w-full text-left px-4 py-3 hover:bg-[#f6f6f7] transition-colors flex items-center gap-3 text-[#005bd3] border-b border-[#e3e3e3]"
                          onClick={() => { setShowNewCustomerForm(true); setShowCustomerResults(false); setNewName(customerSearch); setCustomerSearch(""); }}
                          data-testid="button-create-new-customer"
                        >
                          <div className="h-8 w-8 rounded-full bg-[#e3f1ff] flex items-center justify-center shrink-0">
                            <UserPlus className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium">Tạo khách hàng mới</span>
                        </button>
                        {customers.length > 0 ? (
                          customers.map(c => (
                            <button
                              key={c.id}
                              className="w-full text-left px-4 py-3 hover:bg-[#f6f6f7] transition-colors flex items-center gap-3 border-b border-[#e3e3e3] last:border-0"
                              onClick={() => { setSelectedCustomer({ id: c.id, name: c.name, phone: c.phone }); setShowCustomerResults(false); setCustomerSearch(""); }}
                              data-testid={`customer-result-${c.id}`}
                            >
                              <div className="h-8 w-8 rounded-full bg-[#f1f1f2] flex items-center justify-center text-[#4a4d50] shrink-0">
                                <User className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#1a1c1d] truncate">{c.name}</p>
                                <p className="text-[10px] text-[#8c9196]">{c.phone}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-[#8c9196]">
                            {customerSearch ? "Không tìm thấy khách hàng" : "Chưa có khách hàng nào"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#4a4d50]" />
                <h2 className="text-sm font-bold text-[#1a1c1d]">Ngày & giờ hẹn</h2>
              </div>
              <div className="px-4 sm:px-5 py-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#616161] mb-1.5 block">Ngày hẹn</label>
                  <Input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => { setAppointmentDate(e.target.value); setAppointmentTime(""); }}
                    min={new Date().toISOString().split("T")[0]}
                    className="bg-[#f6f6f7] border-[#d2d5d8] rounded-lg h-9 text-sm"
                    data-testid="input-appointment-date"
                  />
                </div>
                {appointmentDate && (
                  <div>
                    <label className="text-xs font-medium text-[#616161] mb-1.5 block">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Giờ hẹn
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"].map(time => (
                        <button
                          key={time}
                          type="button"
                          className={`h-8 rounded-lg text-xs font-medium border transition-all ${appointmentTime === time ? "bg-[#008060] text-white border-[#008060]" : "bg-[#f6f6f7] text-[#1a1c1d] border-[#d2d5d8] hover:border-[#008060] hover:text-[#008060]"}`}
                          onClick={() => setAppointmentTime(time)}
                          data-testid={`button-time-${time.replace(":", "")}`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center gap-2">
                <Package className="h-4 w-4 text-[#4a4d50]" />
                <h2 className="text-sm font-bold text-[#1a1c1d]">Dịch vụ</h2>
              </div>
              <div className="px-4 sm:px-5 py-4 space-y-4">
                {selectedServices.length > 0 && (
                  <div className="space-y-0 border border-[#e3e3e3] rounded-xl overflow-hidden">
                    {selectedServices.map((item, idx) => {
                      const itemKey = `${item.service.id}-${item.packageIdx ?? "base"}`;
                      const price = getItemPrice(item);
                      return (
                        <div key={itemKey} className={`p-3 ${idx > 0 ? "border-t border-[#e3e3e3]" : ""}`} data-testid={`selected-service-${itemKey}`}>
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-[#f1f1f2] flex items-center justify-center text-[#4a4d50] shrink-0 mt-0.5">
                              <Stethoscope className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1a1c1d]">
                                {item.service.title}
                              </p>
                              {item.packageInfo && (
                                <p className="text-xs text-[#008060] mt-0.5">{item.packageInfo.name}</p>
                              )}
                              <p className="text-xs text-[#8c9196] mt-0.5">{formatCurrency(price)}</p>
                            </div>
                            <button
                              onClick={() => removeService(item.service.id, item.packageIdx)}
                              className="text-[#8c9196] hover:text-[#1a1c1d] shrink-0 mt-0.5"
                              data-testid={`button-remove-service-${itemKey}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-2 ml-[52px]">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => updateQuantity(item.service.id, item.packageIdx, -1)}
                                className="h-7 w-7 rounded-md border border-[#d2d5d8] flex items-center justify-center text-[#616161] hover:bg-[#f6f6f7]"
                                data-testid={`button-decrease-${itemKey}`}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-sm font-bold text-[#1a1c1d] w-6 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.service.id, item.packageIdx, 1)}
                                className="h-7 w-7 rounded-md border border-[#d2d5d8] flex items-center justify-center text-[#616161] hover:bg-[#f6f6f7]"
                                data-testid={`button-increase-${itemKey}`}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <span className="text-sm font-bold text-[#1a1c1d]">{formatCurrency(price * item.quantity)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={openServiceDialog}
                  className="flex items-center gap-2 text-[#008060] hover:text-[#006e52] transition-colors py-2 text-sm font-medium"
                  data-testid="button-add-service"
                >
                  <Plus className="h-4 w-4" />
                  <span>Thêm dịch vụ</span>
                </button>
              </div>
            </Card>

            <Dialog open={serviceDialogOpen} onOpenChange={handleServiceDialogChange}>
              <DialogContent className="sm:max-w-lg p-0 gap-0 rounded-2xl overflow-hidden border-[#e1e3e5] shadow-xl">
                <DialogHeader className="px-5 pt-5 pb-3">
                  <DialogTitle className="text-base font-semibold text-[#1a1c1d]">Chọn dịch vụ</DialogTitle>
                </DialogHeader>

                <div className="px-5 pb-3">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9196]" />
                    <Input
                      placeholder="Tìm dịch vụ..."
                      className="pl-9 bg-[#f6f6f7] border-[#e1e3e5] focus:bg-white focus:border-[#008060] focus:ring-1 focus:ring-[#008060]/20 transition-all rounded-lg h-9 text-sm"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      data-testid="input-dialog-search-service"
                    />
                  </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto border-t border-[#e1e3e5]">
                  {filteredServices.length > 0 ? (
                    <div>
                      {filteredServices.map(s => {
                        const pkgs = SERVICE_PACKAGES[s.code] || [];
                        const isExpanded = expandedServiceId === s.id;
                        const selectedCount = pkgs.filter((_, i) => isPackageSelected(s.id, i)).length;
                        return (
                          <div key={s.id} className="border-b border-[#f1f1f1] last:border-0">
                            <button
                              className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-[#fafafa] transition-colors text-left ${isExpanded ? "bg-[#fafafa]" : ""}`}
                              onClick={() => setExpandedServiceId(isExpanded ? null : s.id)}
                              data-testid={`service-row-${s.id}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-[13px] font-semibold text-[#1a1c1d]">{s.title}</p>
                                  {selectedCount > 0 && (
                                    <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-[#008060] text-[10px] font-bold text-white">{selectedCount}</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#8c9196] mt-0.5">{pkgs.length > 0 ? `${pkgs.length} gói khả dụng` : "Chưa có gói"}</p>
                              </div>
                              <ChevronDown className={`h-4 w-4 text-[#8c9196] shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                            {isExpanded && pkgs.length > 0 && (
                              <div className="pb-2 px-3">
                                {pkgs.map((pkg, pkgIdx) => {
                                  const selected = isPackageSelected(s.id, pkgIdx);
                                  return (
                                    <button
                                      key={pkgIdx}
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all mb-1 last:mb-0 ${selected ? "bg-[#e8f5f0] ring-1 ring-[#008060]/30" : "bg-white hover:bg-[#f6f6f7] border border-[#e1e3e5]"}`}
                                      onClick={() => selectPackage(s, pkgIdx)}
                                      data-testid={`package-option-${s.id}-${pkgIdx}`}
                                    >
                                      <div className={`h-[18px] w-[18px] rounded flex items-center justify-center shrink-0 transition-colors ${selected ? "bg-[#008060]" : "border border-[#c4c7c9] bg-white"}`}>
                                        {selected && <Check className="h-3 w-3 text-white" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-[13px] ${selected ? "font-semibold text-[#1a1c1d]" : "font-medium text-[#303030]"}`}>{pkg.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[11px] text-[#616161]">{formatCurrency(pkg.price)}</span>
                                          <span className="text-[11px] text-[#8c9196]">·</span>
                                          <span className="text-[11px] text-[#008060] font-medium">HH {formatCurrency(pkg.commission)}</span>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-[#8c9196]">Không tìm thấy dịch vụ</div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#4a4d50]" />
                <h2 className="text-sm font-bold text-[#1a1c1d]">Ghi chú</h2>
              </div>
              <div className="px-4 sm:px-5 py-4">
                <textarea
                  placeholder="Thêm ghi chú cho đơn hàng..."
                  className="w-full bg-[#f6f6f7] border border-[#d2d5d8] rounded-lg p-3 text-sm resize-none h-20 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#008060] transition-all"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  data-testid="textarea-notes"
                />
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3]">
                <h2 className="text-sm font-bold text-[#1a1c1d]">Thanh toán</h2>
              </div>
              <div className="px-4 sm:px-5 py-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#616161]">Tạm tính ({totalItems} dịch vụ)</span>
                  <span className="text-[#1a1c1d] font-medium">{formatCurrency(totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#616161]">Giảm giá</span>
                  <span className="text-[#1a1c1d]">0 ₫</span>
                </div>
                <div className="border-t border-[#e3e3e3] pt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#1a1c1d]">Tổng cộng</span>
                  <span className="font-bold text-[#1a1c1d] text-base" data-testid="text-create-total">{formatCurrency(totalPrice)}</span>
                </div>
              </div>
            </Card>

            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3]">
                <h2 className="text-sm font-bold text-[#1a1c1d]">Hoa hồng ước tính</h2>
              </div>
              <div className="px-4 sm:px-5 py-4">
                <p className="text-xl font-bold text-[#008060]" data-testid="text-create-commission">{formatCurrency(commissionEstimate)}</p>
                <p className="text-xs text-[#8c9196] mt-1">5% giá trị đơn hàng</p>
              </div>
            </Card>

            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4">
                <label className="flex items-center gap-3 cursor-pointer" data-testid="checkbox-vat">
                  <div
                    onClick={() => setWantVat(!wantVat)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      wantVat ? "bg-[#008060] border-[#008060]" : "border-[#8c9196]"
                    }`}
                  >
                    {wantVat && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-sm font-bold text-[#1a1c1d]">Khách hàng in hoá đơn công ty</span>
                </label>
              </div>

              {wantVat && (
                <div className="px-4 sm:px-5 pb-4 space-y-4 border-t border-[#e3e3e3] pt-4">
                  <p className="text-xs text-[#8c9196]">Thông tin xuất hóa đơn</p>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-[#1a1c1d]">Tên công ty</label>
                    <Input
                      placeholder="Nhập tên công ty"
                      value={vatCompanyName}
                      onChange={(e) => setVatCompanyName(e.target.value)}
                      className="rounded-lg border-[#d2d5d8] text-sm h-10"
                      data-testid="input-vat-company"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-[#1a1c1d]">Mã số thuế</label>
                    <Input
                      placeholder="Nhập mã số thuế"
                      value={vatTaxCode}
                      onChange={(e) => setVatTaxCode(e.target.value)}
                      className="rounded-lg border-[#d2d5d8] text-sm h-10"
                      data-testid="input-vat-tax-code"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-[#1a1c1d]">Địa chỉ công ty</label>
                    <Input
                      placeholder="Nhập địa chỉ công ty"
                      value={vatCompanyAddress}
                      onChange={(e) => setVatCompanyAddress(e.target.value)}
                      className="rounded-lg border-[#d2d5d8] text-sm h-10"
                      data-testid="input-vat-address"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-[#1a1c1d]">Email nhận hóa đơn</label>
                    <Input
                      placeholder="Nhập email nhận hóa đơn"
                      value={vatEmail}
                      onChange={(e) => setVatEmail(e.target.value)}
                      className="rounded-lg border-[#d2d5d8] text-sm h-10"
                      data-testid="input-vat-email"
                    />
                  </div>
                </div>
              )}
            </Card>

            <Button
              className="w-full h-10 bg-[#008060] hover:bg-[#006e52] text-white font-bold text-sm rounded-xl shadow-sm"
              disabled={!canSubmit}
              onClick={() => createOrderMutation.mutate()}
              data-testid="button-submit-order"
            >
              {createOrderMutation.isPending ? "Đang tạo..." : "Tạo đơn hàng"}
            </Button>

            {(!selectedCustomer || selectedServices.length === 0) && (
              <div className="text-center">
                <p className="text-xs text-[#8c9196]">
                  {!selectedCustomer && "Vui lòng chọn khách hàng"}
                  {selectedCustomer && selectedServices.length === 0 && "Vui lòng thêm dịch vụ"}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
