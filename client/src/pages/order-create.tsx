import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useQuayLai } from "@/lib/use-back";
import { useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  ContactsProduct,
  MedicalServices,
  Plus,
  PlusCircle,
  Receipt,
  Search,
  StickyNote,
  Ticket,
  Verified,
  X,
} from "@/components/np/icon";
import {
  Avatar,
  Card,
  Chev,
  DateTimeField,
  DETAIL_HEADER_BTN,
  DetailHeader,
  NoteSection,
  NPButton,
  Screen,
  SectionTitle,
  ServiceLines,
  ServicePickerSheet,
  giaDong,
  payloadDong,
  tenDayDu,
  type ServiceLine,
  useTabNav,
} from "@/components/np";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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

type SelectedCustomer = { id?: number; name: string; phone: string };

type AppliedVoucher = {
  code: string;
  discountType: string;
  value: number;
  amount: number;
  description: string | null;
};

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
                <Verified size={40} className="text-white" />
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
          <div className="mt-6 overflow-hidden border-y border-np-border bg-white">
            <div className="bg-np-ink px-4 py-3">
              <div className="text-[11px] font-bold text-white/55">
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
  const quayLai = useQuayLai("/orders");
  const searchString = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [selectedServices, setSelectedServices] = useState<ServiceLine[]>([]);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [prefilledFromUrl, setPrefilledFromUrl] = useState(false);
  const [prefilledCustomerFromUrl, setPrefilledCustomerFromUrl] = useState(false);

  const [notes, setNotes] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");

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

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers", customerSearch],
    queryFn: async () => {
      const url = customerSearch
        ? `/api/customers?q=${encodeURIComponent(customerSearch)}`
        : "/api/customers";
      const res = await authFetch(url);
      return res.json();
    },
    enabled: customerSheetOpen,
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

  // Dịch vụ khách này từng đặt, để chọn nhanh. Chỉ tải khi đã chọn khách và đang
  // mở hộp chọn dịch vụ, tránh gọi thừa mỗi lần mở màn.
  const { data: customerDetail } = useQuery<{ orders: { serviceCode: string | null }[] }>({
    queryKey: [`/api/customers/${selectedCustomer?.id}`],
    enabled: Boolean(selectedCustomer?.id) && serviceDialogOpen,
  });
  const recentServices = (() => {
    if (!customerDetail?.orders?.length) return [];
    const codes: string[] = [];
    for (const o of customerDetail.orders) {
      if (o.serviceCode && !codes.includes(o.serviceCode)) codes.push(o.serviceCode);
    }
    return codes
      .map((code) => allServices.find((sv) => sv.code === code))
      .filter((sv): sv is Service => Boolean(sv))
      .slice(0, 4);
  })();

  const getItemPrice = giaDong;
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
      if (!res.ok) {
        // 409 = số điện thoại đã có hồ sơ. Máy chủ trả kèm tên khách đang giữ số
        // đó nên in thẳng ra, người dùng biết ngay phải chọn ai.
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Không tạo được khách hàng");
      }
      return res.json();
    },
    onSuccess: (customer: Customer) => {
      setSelectedCustomer({ id: customer.id, name: customer.name, phone: customer.phone });
      setShowNewCustomerForm(false);
      // Đóng luôn hộp chọn khách: khách vừa tạo đã được chọn sẵn, để hộp mở thì
      // người dùng tưởng chưa xong và đi tìm lại đúng cái tên mình vừa nhập.
      setCustomerSheetOpen(false);
      setCustomerSearch("");
      setNewName("");
      setNewPhone("");
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: `Đã tạo khách hàng ${customer.name}` });
    },
    onError: (err: unknown) => {
      toast({
        title: "Không tạo được khách hàng",
        description: (err as { message?: string })?.message ?? "Kiểm tra mạng rồi thử lại.",
        variant: "destructive",
      });
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
      const serviceNames = selectedServices.map(tenDayDu).join(", ");

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
          // Chi tiết từng dịch vụ: bảng orders chỉ lưu được bản gộp, gửi kèm cái này
          // thì order_items mới có một dòng cho mỗi dịch vụ, sửa lại được về sau.
          services: selectedServices.map(payloadDong),
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

  // Lịch hẹn là bắt buộc: đơn không có ngày giờ thì không lên được danh sách tái
  // khám, cũng không ai biết khi nào cần gọi nhắc khách.
  const coLichHen = Boolean(appointmentDate && appointmentTime);
  const canSubmit =
    selectedCustomer && selectedServices.length > 0 && coLichHen && !createOrderMutation.isPending;

  const ctaLabel = createOrderMutation.isPending
    ? "Đang tạo..."
    : !selectedCustomer
      ? "Chọn khách hàng để tiếp tục"
      : selectedServices.length === 0
        ? "Thêm dịch vụ để tiếp tục"
        : !coLichHen
          ? "Chọn lịch hẹn để tiếp tục"
          : "Tạo đơn";

  const resetForm = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCustomerSheetOpen(false);
    setShowNewCustomerForm(false);
    setNewName("");
    setNewPhone("");
    setSelectedServices([]);
    setNotes("");
    setAppointmentDate("");
    setAppointmentTime("");
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
      <DetailHeader title="Tạo đơn hàng" onBack={quayLai} />

      <div className="min-h-full flow-root bg-np-bg">
        {/* Khách hàng */}
        <SectionTitle icon={ContactsProduct}>Khách hàng</SectionTitle>
        <Card className="p-0">
          {selectedCustomer ? (
            <div className="flex min-h-[60px] items-center gap-3 px-4 py-3">
              <Avatar name={selectedCustomer.name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-np-ink">
                  {selectedCustomer.name}
                </p>
                <p className="mt-0.5 text-[13px] text-np-text-muted">{selectedCustomer.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-np-text-muted transition-colors active:bg-np-surface-pressed"
                aria-label="Bỏ chọn khách hàng"
              >
                <X size={17} strokeWidth={2.25} />
              </button>
            </div>
          ) : (
            /* Chưa chọn thì chỉ một dòng, bấm mở hộp chọn. Ô tìm kiếm với danh sách
               thả xuống trước đây chiếm chỗ ngay cả khi không dùng, và danh sách bị
               kẹt trong khung hẹp nên khó lướt. */
            <button
              type="button"
              onClick={() => setCustomerSheetOpen(true)}
              className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-np-surface-sub"
            >
              <PlusCircle size={19} strokeWidth={2.25} className="flex-shrink-0 text-np-text-muted" />
              <span className="flex-1 text-[15px] font-semibold text-np-ink">Chọn khách hàng</span>
              <Chev />
            </button>
          )}
        </Card>

        {/* Dịch vụ */}
        <SectionTitle icon={MedicalServices}>Dịch vụ</SectionTitle>
        <Card className="space-y-3 p-4">
          <ServiceLines
            lines={selectedServices}
            onChangeQuantity={(dong, delta) =>
              updateQuantity(dong.service.id, dong.packageIdx, delta)
            }
            onRemove={(dong) => removeService(dong.service.id, dong.packageIdx)}
          />
          <button
            type="button"
            onClick={() => setServiceDialogOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-np-button border border-dashed border-np-border-strong py-3 text-[14px] font-semibold text-np-ink transition-colors hover:border-np-brand-ink hover:text-np-brand-ink"
          >
            <PlusCircle size={19} strokeWidth={2.25} className="text-np-text-muted" />
            Thêm dịch vụ
          </button>
        </Card>

        {/* Lịch hẹn đặt SAU dịch vụ: ngoài quầy, sale chốt dịch vụ xong mới xếp
            được lịch, vì giờ trống phụ thuộc dịch vụ nào và bác sĩ nào rảnh. Để
            trước thì ép nhập ngày giờ lúc chưa biết khách lấy gì. */}
        <SectionTitle icon={Calendar}>Lịch hẹn</SectionTitle>
        <Card className="p-4">
          <DateTimeField
            date={appointmentDate}
            onDateChange={setAppointmentDate}
            time={appointmentTime}
            onTimeChange={setAppointmentTime}
            min={new Date().toISOString().split("T")[0]}
          />
        </Card>

        {/* Ghi chú: mẫu chung của app. Chưa gửi lên máy chủ ở đây, chỉ giữ trong
            bản nháp đơn rồi đi kèm khi bấm Tạo đơn. */}
        <NoteSection
          icon={StickyNote}
          value={notes}
          placeholder="Yêu cầu riêng của khách, dặn dò khi thực hiện dịch vụ"
          onSave={(note) => setNotes(note)}
        />

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
              <p className="text-[11px] font-bold text-np-text-muted">
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
                        <span className="inline-flex items-center gap-1 rounded-np-badge bg-np-badge-neutral-bg px-2 py-[3px] text-[11px] font-semibold tabular-nums text-np-badge-neutral-fg">
                          <Ticket size={11} strokeWidth={2.5} />
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
                ? "bg-np-ink text-white hover:bg-np-ink-sub"
                : "cursor-not-allowed bg-np-surface-pressed text-np-text-muted",
            )}
          >
            {ctaLabel}
          </button>
        </div>
      </div>

      {/* Hộp chọn khách hàng: danh sách chiếm hết bề ngang và tự cuộn, dễ lướt hơn
          ô thả xuống cũ. Nút cộng ở góc phải chuyển sang khai báo khách mới ngay
          trong hộp, không phải rời màn. */}
      <Sheet
        open={customerSheetOpen}
        onOpenChange={(open) => {
          setCustomerSheetOpen(open);
          if (!open) {
            setShowNewCustomerForm(false);
            setCustomerSearch("");
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="mx-auto flex h-[85vh] max-w-[390px] flex-col rounded-t-np-sheet border-0 p-0 [&>button]:hidden"
        >
          <div className="np-divider px-4 pb-3 pt-3">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-np-surface-pressed" />
            <div className="flex items-center justify-between gap-3">
              {/* Đang khai khách mới thì nút trái là mũi tên quay lại danh sách, không
                  phải dấu X, để hai nút đầu hộp không cùng một hình mà khác việc. */}
              <button
                type="button"
                aria-label={showNewCustomerForm ? "Quay lại danh sách" : "Đóng"}
                onClick={() =>
                  showNewCustomerForm ? setShowNewCustomerForm(false) : setCustomerSheetOpen(false)
                }
                className={DETAIL_HEADER_BTN}
              >
                {showNewCustomerForm ? (
                  <ArrowLeft size={17} strokeWidth={2.25} />
                ) : (
                  <X size={17} strokeWidth={2.25} />
                )}
              </button>
              <SheetTitle className="text-[16px] font-bold text-np-ink">
                {showNewCustomerForm ? "Khách hàng mới" : "Chọn khách hàng"}
              </SheetTitle>
              {showNewCustomerForm ? (
                // Chỗ trống giữ cho tiêu đề vẫn nằm chính giữa.
                <div className="h-9 w-9 flex-shrink-0" />
              ) : (
                <button
                  type="button"
                  aria-label="Thêm khách hàng mới"
                  onClick={() => {
                    setShowNewCustomerForm(true);
                    setNewName(customerSearch);
                  }}
                  className={cn(DETAIL_HEADER_BTN, "text-np-text-sub")}
                >
                  <Plus size={17} strokeWidth={2.25} />
                </button>
              )}
            </div>
          </div>

          {showNewCustomerForm ? (
            <div className="space-y-3 p-4">
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
              <NPButton
                size="md"
                tone="primary"
                className="w-full justify-center"
                disabled={!newName || !newPhone || createCustomerMutation.isPending}
                onClick={() => createCustomerMutation.mutate({ name: newName, phone: newPhone })}
              >
                Lưu khách hàng
              </NPButton>
            </div>
          ) : (
            <>
              <div className="px-4 py-3">
                <div className="relative">
                  <Search
                    size={16}
                    strokeWidth={2.25}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-np-text-muted"
                  />
                  <Input
                    autoFocus
                    placeholder="Tìm tên hoặc số điện thoại..."
                    className="pl-9"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="scrollbar-hide flex-1 overflow-y-auto border-t border-np-surface-pressed pb-4">
                {customers.length > 0 ? (
                  customers.map((c, i) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer({ id: c.id, name: c.name, phone: c.phone });
                        setCustomerSheetOpen(false);
                        setCustomerSearch("");
                      }}
                      className={cn(
                        "flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-np-surface-sub",
                        i !== customers.length - 1 && "np-divider",
                      )}
                    >
                      <Avatar name={c.name} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-np-ink">{c.name}</p>
                        <p className="mt-0.5 text-[13px] text-np-text-muted">{c.phone}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-[13px] text-np-text-muted">
                    {customerSearch ? "Không tìm thấy khách hàng" : "Chưa có khách hàng"}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Hộp chọn dịch vụ      {/* Hộp chọn dịch vụ: đổi từ hộp thoại sang hộp trượt cho khớp hộp chọn khách,
          và để không tràn khỏi khung 390px như trước. */}
      <ServicePickerSheet
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
        services={allServices}
        recentServices={recentServices}
        isPackageSelected={isPackageSelected}
        onSelectPackage={selectPackage}
      />
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
