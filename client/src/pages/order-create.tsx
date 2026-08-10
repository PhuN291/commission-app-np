import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import {
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Minus,
  Plus,
  Receipt,
  Search,
  Stethoscope,
  Ticket,
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { authFetch, getCurrentUserId } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { SERVICE_PACKAGES } from "@/pages/service-detail";
import type { Customer, Order, Service, VoucherRow } from "@shared/schema";

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

type AppliedVoucher = {
  code: string;
  discountType: string;
  value: number;
  amount: number;
  description: string | null;
};

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' cho thẻ ngày hẹn. */
function fmtDatePill(s: string): string {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return d && m && y ? `${d}/${m}/${y}` : s;
}

/** Nhãn giảm giá hiển thị ở thẻ voucher: '-5%' hoặc '-100k'. */
function voucherBadge(v: VoucherRow): string {
  if (v.discountType === "fixed") {
    return v.value >= 1000 ? `-${Math.round(v.value / 1000)}k` : `-${v.value}`;
  }
  return `-${v.value}%`;
}

/** Ngày hẹn → 'DD/MM/YYYY · HH:mm'; nhận cả 'YYYY-MM-DD' lẫn 'DD/MM/YYYY'. */
function fmtAppt(dateStr: string | null, timeStr: string | null): string {
  if (!dateStr) return "Chưa đặt lịch";
  const s = dateStr.trim();
  let dd = 0;
  let mm = 0;
  let yyyy = 0;
  if (s.includes("/")) {
    [dd, mm, yyyy] = s.split("/").map(Number);
  } else if (s.includes("-")) {
    [yyyy, mm, dd] = s.split("-").map(Number);
  }
  const datePart =
    dd && mm && yyyy
      ? `${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${yyyy}`
      : dateStr;
  return timeStr ? `${datePart} · ${timeStr}` : datePart;
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="flex-shrink-0 text-[13px] text-np-text-muted">{label}</span>
      <span className="text-right text-[13px] font-bold text-np-ink">{value}</span>
    </div>
  );
}

function OrderCreatedView({
  order,
  onViewDetail,
  onCreateAnother,
  onClose,
}: {
  order: Order;
  onViewDetail: () => void;
  onCreateAnother: () => void;
  onClose: () => void;
}) {
  const services = order.serviceName.split(", ").filter(Boolean);
  const discount = order.voucherAmount ?? 0;
  const net = Math.max(0, order.totalPrice - discount);
  return (
    <Screen noChrome>
      <div className="flex h-full flex-col px-5 pb-6 pt-3">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-full text-np-ink transition-colors hover:bg-np-surface-sub"
          >
            <X size={22} strokeWidth={2.25} />
          </button>
        </div>

        <div className="scrollbar-hide flex-1 overflow-y-auto">
          {/* Check + chấm trang trí */}
          <div className="relative mx-auto mt-2 mb-6 h-28 w-28">
            <span className="absolute left-1 top-6 h-2.5 w-2.5 rotate-12 rounded-[3px] bg-[#D89B1F]" />
            <span className="absolute right-0 top-3 h-2.5 w-2.5 rounded-[3px] bg-[#8B5CF6]" />
            <span className="absolute right-2 bottom-6 h-2 w-2 rounded-[2px] bg-[#3B6EF5]" />
            <span className="absolute left-4 bottom-2 h-2.5 w-2.5 rotate-45 rounded-[3px] bg-[#B5651D]" />
            <span className="absolute right-6 top-0 h-2.5 w-2.5 rotate-45 rounded-[3px] bg-np-brand" />
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-np-brand-soft">
              <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-np-brand">
                <Check size={44} strokeWidth={3} className="text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-center text-[24px] font-extrabold tracking-[-0.5px] text-np-ink">
            Đã tạo đơn
          </h1>
          <p className="mx-auto mt-2 max-w-[310px] text-center text-[14px] leading-relaxed text-np-text-muted">
            Đơn {order.code} đã gửi tới lễ tân. Sẽ báo khi khách đến.
          </p>

          {/* Thẻ tóm tắt */}
          <div className="mt-6 overflow-hidden rounded-np-card border border-np-border bg-white">
            <div className="bg-np-ink px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.8px] text-white/55">
                Mã đơn
              </div>
              <div className="text-[18px] font-extrabold tracking-[0.5px] text-white">{order.code}</div>
            </div>
            <div className="px-4 py-3">
              <SummaryLine label="Khách hàng" value={order.patientName} />
              <div className="py-1.5">
                <div className="mb-1.5 text-[13px] text-np-text-muted">
                  Dịch vụ ({services.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {services.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-np-button bg-np-brand-soft px-2.5 py-1 text-[12px] font-semibold text-np-brand-ink"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <SummaryLine label="Lịch hẹn" value={fmtAppt(order.appointmentDate, order.appointmentTime)} />
              {discount > 0 && (
                <SummaryLine
                  label={order.voucherCode ? `Giảm giá (${order.voucherCode})` : "Giảm giá"}
                  value={`-${fmtVND(discount)}`}
                />
              )}
              <div className="my-3 border-t border-np-surface-pressed" />
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-np-ink">Tổng</span>
                <span className="text-[18px] font-extrabold text-np-ink tabular-nums">
                  {fmtVND(net)}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between rounded-np-button bg-np-success-bg px-3 py-2">
                <span className="text-[13px] font-semibold text-np-success">Hoa hồng ghi nhận</span>
                <span className="text-[14px] font-extrabold text-np-success tabular-nums">
                  +{fmtVND(order.commission)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-4">
          <NPButton tone="dark" className="w-full justify-center" onClick={onViewDetail}>
            Xem chi tiết đơn
          </NPButton>
          <NPButton tone="ghost" className="w-full justify-center" onClick={onCreateAnother}>
            Tạo đơn khác
          </NPButton>
        </div>
      </div>
    </Screen>
  );
}

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
  const [prefilledCustomerFromUrl, setPrefilledCustomerFromUrl] = useState(false);

  const [notes, setNotes] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [voucherInput, setVoucherInput] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherAmount, setVoucherAmount] = useState(0);
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);
  const [voucherBusy, setVoucherBusy] = useState(false);

  const [wantVat, setWantVat] = useState(false);
  const [vatCompanyName, setVatCompanyName] = useState("");
  const [vatTaxCode, setVatTaxCode] = useState("");
  const [vatCompanyAddress, setVatCompanyAddress] = useState("");
  const [vatEmail, setVatEmail] = useState("");

  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const customerRef = useRef<HTMLDivElement>(null);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers", customerSearch],
    queryFn: async () => {
      const url = customerSearch
        ? `/api/customers?q=${encodeURIComponent(customerSearch)}`
        : "/api/customers";
      const res = await authFetch(url);
      return res.json();
    },
    enabled: showCustomerResults,
  });

  const { data: allServices = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const { data: vouchers = [] } = useQuery<VoucherRow[]>({ queryKey: ["/api/vouchers"] });

  // ?customerId= (mở từ màn chi tiết khách) → tự chọn sẵn khách vào đơn.
  // Tách hẳn khỏi phần prefill dịch vụ bên dưới: phần đó chờ tải xong danh sách dịch vụ
  // rồi mới chạy, dùng chung cờ sẽ khoá lẫn nhau.
  const prefillCustomerId = (() => {
    const raw = new URLSearchParams(searchString).get("customerId");
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  })();

  // Endpoint trả object bọc { customer, orders, stats, ... } nên đọc data.customer.
  const { data: prefillCustomer } = useQuery<{ customer: Customer }>({
    queryKey: [`/api/customers/${prefillCustomerId}`, getCurrentUserId()],
    enabled: prefillCustomerId > 0 && !prefilledCustomerFromUrl,
  });

  useEffect(() => {
    if (prefilledCustomerFromUrl) return;
    const c = prefillCustomer?.customer;
    // Gọi lỗi hoặc không có khách thì bỏ qua, người dùng tự chọn khách như cũ.
    if (!c) return;
    setSelectedCustomer({ id: c.id, name: c.name, phone: c.phone });
    setPrefilledCustomerFromUrl(true);
  }, [prefillCustomer, prefilledCustomerFromUrl]);

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

  // Voucher giảm net → hoa hồng ước tính giảm theo tỉ lệ (khớp hướng engine trừ voucher).
  const discountedTotal = Math.max(0, totalPrice - voucherAmount);
  const commissionAfter =
    totalPrice > 0 ? Math.round((commissionEstimate * discountedTotal) / totalPrice) : 0;

  const clearVoucher = () => {
    setVoucherCode("");
    setVoucherAmount(0);
    setAppliedVoucher(null);
  };

  const applyVoucher = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    if (selectedServices.length === 0) {
      toast({ title: "Chưa có dịch vụ", description: "Thêm dịch vụ trước khi áp mã", variant: "destructive" });
      return;
    }
    setVoucherBusy(true);
    try {
      const res = await authFetch("/api/vouchers/validate", {
        method: "POST",
        body: JSON.stringify({ code, subtotal: totalPrice, serviceCount: selectedServices.length }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Không áp được mã", description: data.error, variant: "destructive" });
        return;
      }
      setVoucherCode(data.code);
      setVoucherAmount(data.amount);
      setAppliedVoucher(data);
      setVoucherInput("");
      toast({ title: `Đã áp mã ${data.code}`, description: `Giảm ${fmtVND(data.amount)}` });
    } catch {
      toast({ title: "Lỗi", description: "Không kiểm tra được mã", variant: "destructive" });
    } finally {
      setVoucherBusy(false);
    }
  };

  // Đơn đổi (thêm/bớt dịch vụ) → kiểm tra lại mã đã áp, cập nhật số tiền giảm
  // hoặc gỡ mã nếu không còn đủ điều kiện. voucherCode cố ý không nằm trong deps
  // để tránh chạy lại ngay sau khi áp mã.
  useEffect(() => {
    if (!voucherCode) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/vouchers/validate", {
          method: "POST",
          body: JSON.stringify({ code: voucherCode, subtotal: totalPrice, serviceCount: selectedServices.length }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          clearVoucher();
          toast({ title: "Mã không còn áp dụng", description: data.error, variant: "destructive" });
        } else {
          setVoucherAmount(data.amount);
          setAppliedVoucher(data);
        }
      } catch {
        /* giữ nguyên nếu lỗi mạng tạm thời */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPrice, selectedServices.length]);

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
      const res = await authFetch("/api/customers", {
        method: "POST",
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

      const res = await authFetch("/api/orders", {
        method: "POST",
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
          totalPrice, // giá gốc (gross) — engine trừ voucherAmount để ra net + hoa hồng
          commission: commissionAfter,
          voucherAmount,
          voucherCode: voucherCode || null,
          appointmentStatus: "pending",
          notes: notes || null,
          appointmentDate: appointmentDate || null,
          appointmentTime: appointmentTime || null,
          vatCompanyName: wantVat && vatCompanyName ? vatCompanyName : null,
          vatTaxCode: wantVat && vatTaxCode ? vatTaxCode : null,
          vatCompanyAddress: wantVat && vatCompanyAddress ? vatCompanyAddress : null,
          vatEmail: wantVat && vatEmail ? vatEmail : null,
          createdAt: timeStr,
          userId: Number(getCurrentUserId()),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (order: Order) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers"] });
      setCreatedOrder(order);
    },
    onError: () => {
      toast({ title: "Lỗi", description: "Không thể tạo đơn hàng", variant: "destructive" });
    },
  });

  const canSubmit = selectedCustomer && selectedServices.length > 0 && !createOrderMutation.isPending;

  const ctaLabel = createOrderMutation.isPending
    ? "Đang tạo..."
    : !selectedCustomer
      ? "Chọn khách hàng để tiếp tục"
      : selectedServices.length === 0
        ? "Thêm dịch vụ để tiếp tục"
        : "Tạo đơn";

  const resetForm = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setShowCustomerResults(false);
    setShowNewCustomerForm(false);
    setNewName("");
    setNewPhone("");
    setSelectedServices([]);
    setServiceSearch("");
    setExpandedServiceId(null);
    setNotes("");
    setAppointmentDate("");
    setAppointmentTime("");
    setShowTimePicker(false);
    setVoucherInput("");
    clearVoucher();
    setWantVat(false);
    setVatCompanyName("");
    setVatTaxCode("");
    setVatCompanyAddress("");
    setVatEmail("");
  };

  if (createdOrder) {
    return (
      <OrderCreatedView
        order={createdOrder}
        onViewDetail={() => navigate(`/orders/${createdOrder.id}`)}
        onCreateAnother={() => {
          resetForm();
          setCreatedOrder(null);
        }}
        onClose={() => navigate("/orders")}
      />
    );
  }

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Tạo đơn hàng" onBack={() => navigate("/orders")} />

      <div className="bg-np-surface-sub">
        {/* Khách hàng */}
        <SectionTitle icon={User}>Khách hàng</SectionTitle>
        <Card className="p-4">
          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-np-card border border-np-border bg-np-surface-sub p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-np-brand-soft text-np-brand-ink">
                  <User size={18} strokeWidth={2.25} />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-np-ink">{selectedCustomer.name}</p>
                  <p className="mt-0.5 text-[12px] text-np-text-muted">{selectedCustomer.phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-np-text-muted hover:bg-white hover:text-np-ink"
                aria-label="Bỏ chọn"
              >
                <X size={16} strokeWidth={2.25} />
              </button>
            </div>
          ) : showNewCustomerForm ? (
            <div className="space-y-3">
              <p className="text-[14px] font-bold text-np-ink">Thêm khách hàng mới</p>
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
            <div className="space-y-2.5">
              <div className="relative" ref={customerRef}>
                <Search
                  size={16}
                  strokeWidth={2.25}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-np-text-muted"
                />
                <Input
                  placeholder="Tìm tên hoặc số điện thoại..."
                  className="pl-9 pr-9"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerResults(true);
                  }}
                  onFocus={() => setShowCustomerResults(true)}
                />
                <ChevronDown
                  size={16}
                  strokeWidth={2.25}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-np-text-muted"
                />
                {showCustomerResults && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-np-card border border-np-border bg-white shadow-lg">
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
                        {customerSearch ? "Không tìm thấy khách hàng" : "Chưa có khách hàng"}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNewCustomerForm(true);
                  setShowCustomerResults(false);
                  setNewName(customerSearch);
                  setCustomerSearch("");
                }}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-np-link hover:underline"
              >
                <UserPlus size={15} strokeWidth={2.25} />
                Thêm khách hàng mới
              </button>
            </div>
          )}
        </Card>

        {/* Lịch hẹn */}
        <SectionTitle icon={Calendar}>Lịch hẹn</SectionTitle>
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {/* NGÀY */}
            <label className="relative flex cursor-pointer flex-col rounded-np-button border border-np-border-strong bg-np-surface-sub px-3.5 py-3 transition-colors hover:border-np-brand-ink">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
                <Calendar size={13} strokeWidth={2.4} />
                Ngày
              </span>
              <span
                className={cn(
                  "mt-1 text-[15px] font-bold tabular-nums",
                  appointmentDate ? "text-np-ink" : "text-np-text-muted",
                )}
              >
                {appointmentDate ? fmtDatePill(appointmentDate) : "Chọn ngày"}
              </span>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => {
                  setAppointmentDate(e.target.value);
                  setAppointmentTime("");
                }}
                onClick={(e) => {
                  // input ẩn opacity-0 không tự mở lịch khi tap → gọi showPicker() trong user-gesture.
                  const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
                  try {
                    el.showPicker?.();
                  } catch {
                    /* trình duyệt cũ: vẫn focus + gõ tay được */
                  }
                }}
                min={new Date().toISOString().split("T")[0]}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Chọn ngày hẹn"
              />
            </label>
            {/* GIỜ */}
            <button
              type="button"
              onClick={() => setShowTimePicker((v) => !v)}
              className={cn(
                "flex flex-col rounded-np-button border px-3.5 py-3 text-left transition-colors",
                showTimePicker
                  ? "border-np-brand-ink bg-np-brand-soft text-np-brand-ink"
                  : "border-np-border-strong bg-np-surface-sub hover:border-np-brand-ink",
              )}
            >
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
                <Clock size={13} strokeWidth={2.4} />
                Giờ
              </span>
              <span
                className={cn(
                  "mt-1 text-[15px] font-bold tabular-nums",
                  appointmentTime ? "text-np-ink" : "text-np-text-muted",
                )}
              >
                {appointmentTime || "Chọn giờ"}
              </span>
            </button>
          </div>
          {showTimePicker && (
            <div className="mt-3 grid grid-cols-4 gap-2 border-t border-np-border pt-3">
              {TIME_SLOTS.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => {
                    setAppointmentTime(time);
                    setShowTimePicker(false);
                  }}
                  className={cn(
                    "h-8 rounded-np-button border text-[12px] font-medium transition-all",
                    appointmentTime === time
                      ? "border-np-brand-ink bg-np-brand-soft text-np-brand-ink"
                      : "border-np-border bg-np-surface-sub text-np-ink hover:border-np-brand-ink hover:text-np-brand-ink",
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Dịch vụ */}
        <SectionTitle icon={Stethoscope}>Dịch vụ</SectionTitle>
        <Card className="space-y-3 p-4">
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
                      <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-np-button bg-np-surface-sub text-np-text-sub">
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
                          className="flex h-7 w-7 items-center justify-center rounded-np-button border border-np-border-strong text-np-text-sub hover:bg-np-surface-sub"
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
                          className="flex h-7 w-7 items-center justify-center rounded-np-button border border-np-border-strong text-np-text-sub hover:bg-np-surface-sub"
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
            className="flex w-full items-center justify-center gap-2 rounded-np-button border border-dashed border-np-border-strong py-3 text-[14px] font-semibold text-np-ink transition-colors hover:border-np-brand-ink hover:text-np-brand-ink"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-np-ink text-white">
              <Plus size={13} strokeWidth={2.75} />
            </span>
            Thêm dịch vụ
          </button>
        </Card>

        {/* Ghi chú */}
        <SectionTitle icon={FileText} action={<span className="text-[12px] font-medium text-np-text-muted">Tùy chọn</span>}>
          Ghi chú
        </SectionTitle>
        <Card className="p-4">
          <textarea
            placeholder="Thêm ghi chú cho đơn hàng..."
            className="h-20 w-full resize-none rounded-np-button border border-np-border-strong bg-np-surface-sub p-3 text-[14px] text-np-ink transition-all focus:bg-white focus:outline-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Card>

        {/* Giảm giá */}
        <SectionTitle icon={Ticket}>Giảm giá</SectionTitle>
        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nhập mã giảm giá"
              className="flex-1 uppercase placeholder:normal-case"
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyVoucher(voucherInput);
                }
              }}
            />
            <NPButton
              tone="dark"
              disabled={voucherBusy || !voucherInput.trim()}
              onClick={() => applyVoucher(voucherInput)}
            >
              {voucherBusy ? "..." : "Áp dụng"}
            </NPButton>
          </div>

          {vouchers.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.4px] text-np-text-muted">
                Mã khả dụng
              </p>
              <div className="scrollbar-hide -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-0.5">
                {vouchers.map((v) => {
                  const selected = voucherCode === v.code;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => (selected ? clearVoucher() : applyVoucher(v.code))}
                      className={cn(
                        "flex w-[150px] flex-shrink-0 flex-col gap-2 rounded-np-card border p-3 text-left transition-all",
                        selected
                          ? "border-np-brand-ink bg-np-brand-soft text-np-brand-ink"
                          : "border-np-border bg-white hover:border-np-brand-ink/40",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 rounded-np-badge bg-np-ink px-2 py-0.5 text-[12px] font-extrabold tabular-nums text-white">
                          <Ticket size={11} strokeWidth={2.5} className="text-white/70" />
                          {voucherBadge(v)}
                        </span>
                        {selected ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-np-brand-ink text-white">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-np-brand-ink">Chọn</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-np-ink">{v.code}</p>
                        {v.description && (
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-np-text-muted">
                            {v.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Thanh toán */}
        <SectionTitle icon={Receipt}>Thanh toán</SectionTitle>
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-np-text-sub">Tạm tính ({totalItems} dịch vụ)</span>
            <span className="font-medium text-np-ink tabular-nums">{fmtVND(totalPrice)}</span>
          </div>
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-np-text-sub">
              Giảm giá{appliedVoucher ? ` (${appliedVoucher.code})` : ""}
            </span>
            <span
              className={cn(
                "tabular-nums",
                voucherAmount > 0 ? "font-semibold text-np-danger" : "text-np-ink",
              )}
            >
              {voucherAmount > 0 ? `-${fmtVND(voucherAmount)}` : "0₫"}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-np-border pt-3">
            <span className="text-[14px] font-bold text-np-ink">Tổng cộng</span>
            <span className="text-[18px] font-extrabold text-np-ink tabular-nums">
              {fmtVND(discountedTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-np-button bg-np-success-bg px-3 py-2.5">
            <span className="text-[13px] font-semibold text-np-success">Hoa hồng ước tính</span>
            <span className="text-[15px] font-extrabold text-np-success tabular-nums">
              +{fmtVND(commissionAfter)}
            </span>
          </div>
        </Card>

        {/* Xuất hoá đơn công ty */}
        <SectionTitle icon={Building2}>Xuất hóa đơn công ty</SectionTitle>
        <Card className="p-4">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-[14px] font-bold text-np-ink">
              Khách cần hóa đơn công ty
            </span>
            <Switch checked={wantVat} onCheckedChange={setWantVat} />
          </label>
          {wantVat && (
            <div className="mt-4 space-y-4 border-t border-np-border pt-4">
              <VatField label="Tên công ty" value={vatCompanyName} onChange={setVatCompanyName} placeholder="Nhập tên công ty" />
              <VatField label="Mã số thuế" value={vatTaxCode} onChange={setVatTaxCode} placeholder="Nhập mã số thuế" />
              <VatField label="Địa chỉ công ty" value={vatCompanyAddress} onChange={setVatCompanyAddress} placeholder="Nhập địa chỉ công ty" />
              <VatField label="Email nhận hóa đơn" value={vatEmail} onChange={setVatEmail} placeholder="Nhập email nhận hóa đơn" />
            </div>
          )}
        </Card>

        {/* chừa chỗ cho thanh nút cố định (cao ~92px) + đệm, tránh che mất section cuối */}
        <div className="h-[100px]" />
      </div>

      {/* Thanh nút cố định: absolute neo theo FRAME (relative), ngồi ngay trên TabBar
          (h-64, absolute). Không cuộn theo, không lệch pad nên không hở/che content. */}
      <div className="absolute inset-x-0 bottom-[64px] z-20">
        {/* scrim cho content tan dần vào thanh thay vì cắt cứng */}
        <div className="pointer-events-none h-4 bg-gradient-to-t from-np-surface-sub to-transparent" />
        <div className="border-t border-np-border bg-white px-4 pb-4 pt-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => createOrderMutation.mutate()}
            className={cn(
              "h-12 w-full rounded-np-button text-[15px] font-bold transition-colors",
              canSubmit
                ? "bg-np-brand text-white hover:bg-np-brand-hover"
                : "cursor-not-allowed bg-np-surface-pressed text-np-text-muted",
            )}
          >
            {ctaLabel}
          </button>
        </div>
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
                              className={`mb-1 flex w-full items-center gap-3 rounded-np-button px-3 py-2.5 text-left transition-all last:mb-0 ${
                                selected
                                  ? "border border-np-brand-ink bg-np-brand-soft text-np-brand-ink"
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
