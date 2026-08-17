import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, authFetch, getCurrentUserId } from "@/lib/queryClient";
import { useQuayLai } from "@/lib/use-back";
import { useLocation, useRoute } from "wouter";
import type { LucideIcon } from "@/components/np/icon";
import {
  AssignmentInd,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CancelScheduleSend,
  ChevronLeft,
  ChevronRight,
  Clock,
  ContactsProduct,
  EditSquare,
  EyeOff,
  FileText,
  History,
  LogIn,
  MapPin,
  MedicalServices,
  MoreHorizontal,
  Play,
  PlusCircle,
  Receipt,
  Stethoscope,
  StickyNote,
  SupportAgent,
  UserCog,
  UserX,
  Verified,
  X,
} from "@/components/np/icon";
import {
  ActivityLog,
  Avatar,
  Card,
  CommissionRow,
  ComplaintSheet,
  loiKhieuNai,
  Chev,
  ContactActions,
  DateTimeField,
  DetailHeader,
  DETAIL_HEADER_BTN,
  NoteSection,
  NPButton,
  OrderStatusBadges,
  PersonPicker,
  type PickablePerson,
  ServiceLines,
  ServicePickerSheet,
  dungLaiDong,
  giaDong,
  payloadDong,
  type ServiceLine,
  Row,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";
import { Badge as NPBadge } from "@/components/np/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { eventView, type ActivityEvent } from "@/lib/activity-text";
import { useToast } from "@/hooks/use-toast";
import {
  APPOINTMENT_BUTTONS,
  APPOINTMENT_STATUSES,
  VISIT_BUTTONS,
  VISIT_STATUSES,
  type AppointmentStatusCode,
  type StatusButton,
  type VisitStatusCode,
} from "@shared/status";
import type { Customer, Order, Service } from "@shared/schema";
import {
  ROLE_LABEL,
  SKIPPED_REASON_LABEL,
  type CRStatus,
  type OrderItemStatus,
  type SkippedReason,
  type UserRole,
} from "@shared/types";
import { Textarea } from "@/components/ui/textarea";
import { SERVICE_PACKAGES } from "@/pages/service-detail";

// ─────────────────────────────────────────────────────────────────
// Extended types from /api/orders/:id
// ─────────────────────────────────────────────────────────────────

type APIOrderItem = {
  id: string;
  orderId: number;
  serviceId: number;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  /** Thành tiền cả dòng (đơn giá nhân số lượng). */
  price: number;
  cost: number;
  status: OrderItemStatus;
  skippedReason: SkippedReason | null;
  refundedAmount: number;
};

type APICommissionRecord = {
  id: string;
  orderId: number;
  role: "sale" | "tc" | "doctor";
  userId: number;
  amount: number;
  status: CRStatus;
  createdAt: number;
  rejectedAt: number | null;
  rejectedReason: string | null;
  /** Khiếu nại đã gửi cho khoản này, null nếu chưa gửi. */
  complaint: { id: string; content: string; createdAt: number } | null;
};

type OrderWithDetails = Order & {
  items: APIOrderItem[];
  crs: APICommissionRecord[];
};

/** Nhân viên trả về từ GET /api/users, đủ dùng cho mục Phụ trách. */
type StaffOption = {
  id: number;
  name: string;
  role: UserRole;
  status: string;
};

/**
 * Ba chỗ phụ trách trên đơn, đúng thứ tự đọc: ai chỉ định, ai làm, ai tư vấn.
 *
 * `cot` là tên cột trong bảng orders. Chỗ Tư vấn dùng lại cột saleUserId có sẵn
 * chứ không đẻ cột mới, vì nó vốn đã mang đúng nghĩa đó.
 *
 * `uuTien` là vai được xếp lên đầu hộp chọn, chỉ để đỡ phải cuộn, KHÔNG chặn:
 * phòng khám nhỏ hay kiêm nhiệm, khoá cứng theo vai là có ngày không chọn được ai.
 */
const PHU_TRACH = [
  { cot: "indicatedByUserId", nhan: "Chỉ định", icon: AssignmentInd, uuTien: "doctor" },
  { cot: "performedByUserId", nhan: "Thực hiện", icon: Stethoscope, uuTien: "doctor" },
  { cot: "saleUserId", nhan: "Tư vấn", icon: SupportAgent, uuTien: "sale" },
] as const;

type PhuTrachCot = (typeof PHU_TRACH)[number]["cot"];


/** Ngày trên đơn ('DD/MM/YYYY' hoặc 'YYYY-MM-DD') → 'YYYY-MM-DD' cho ô chọn ngày. */
function toInputDate(v: string | null): string {
  const s = (v ?? "").trim();
  if (!s) return "";
  if (s.includes("-")) return s.slice(0, 10);
  const [dd, mm, yyyy] = s.split("/");
  return dd && mm && yyyy ? `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}` : "";
}

function fmtVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

/**
 * Moi câu lỗi của server ra khỏi Error do apiRequest ném.
 *
 * apiRequest gói lại thành chuỗi "400: {json}", nên đọc thẳng e.message là ra một
 * câu lộn xộn có cả mã số lẫn dấu ngoặc. Không moi được thì trả null để chỗ gọi
 * dùng câu dự phòng của nó.
 */
function docLoi(e: unknown): string | null {
  const raw = (e as { message?: string })?.message ?? "";
  const than = raw.slice(raw.indexOf(":") + 1).trim();
  try {
    const j = JSON.parse(than);
    return typeof j?.message === "string" ? j.message : null;
  } catch {
    // Không phải JSON của server thì đây là lỗi tầng mạng ("Failed to fetch").
    // In nguyên văn ra toast chỉ làm người dùng hoang mang, để chỗ gọi tự chọn câu.
    return null;
  }
}

/** Số dòng nhật ký hé sẵn, phần còn lại nằm sau nút "Xem thêm". */
const LOG_PREVIEW = 5;

const BUTTON_ICONS: Record<StatusButton["icon"], LucideIcon> = {
  check: Verified,
  "calendar-check": CalendarCheck,
  "log-in": LogIn,
  "cancel-schedule": CancelScheduleSend,
  calendar: Calendar,
  "eye-off": EyeOff,
  play: Play,
  "check-circle": Verified,
  "user-x": UserX,
};

export default function OrderDetail() {
  const { active, onTab } = useTabNav();
  const [, params] = useRoute("/orders/:id");
  const [, navigate] = useLocation();
  const quayLai = useQuayLai("/orders");
  const orderId = params?.id ? parseInt(params.id, 10) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: "", description: "", action: () => {} });

  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [suaLichOpen, setSuaLichOpen] = useState(false);
  const [ngayMoi, setNgayMoi] = useState("");
  const [gioMoi, setGioMoi] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);

  // Permission + identity (B5-3 Section 2 + R-9-1)
  const role = (typeof window !== "undefined" ? localStorage.getItem("np_role") : null) as UserRole | null;
  const currentUserId = parseInt(
    (typeof window !== "undefined" ? localStorage.getItem("np_user_id") : null) ?? "0",
    10,
  );
  const canRejectCR = role === "kt";

  // Per-section edit state — null = không edit, key xác định section nào đang edit.

  // Reject CR dialog state (KT only)
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; cr: APICommissionRecord | null; reason: string }>({
    open: false,
    cr: null,
    reason: "",
  });

  // Khiếu nại dialog state (NV/BS only)
  const [complaintDialog, setComplaintDialog] = useState<{ open: boolean; cr: APICommissionRecord | null; content: string }>({
    open: false,
    cr: null,
    content: "",
  });

  // Namespace queryKey theo userId để tránh React Query cache leak khi switch user
  // (staleTime: Infinity + key shared across users → user B đọc cache user A).
  const uid = getCurrentUserId();
  const { data: order, isLoading } = useQuery<OrderWithDetails>({
    queryKey: [`/api/orders/${orderId}`, uid],
    enabled: orderId > 0,
  });
  const { data: allOrders = [] } = useQuery<Order[]>({ queryKey: ["/api/orders", uid] });
  const { data: allCustomers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers", uid] });
  const { data: nhatKy = [] } = useQuery<ActivityEvent[]>({
    queryKey: [`/api/orders/${orderId}/history`, uid],
    enabled: orderId > 0,
  });
  // Lấy nguyên danh sách nhân viên thay vì gọi lẻ từng người: mục Phụ trách có
  // ba chỗ, và bấm vào chỗ nào cũng cần đủ danh sách để chọn.
  const { data: nhanSu = [] } = useQuery<StaffOption[]>({ queryKey: ["/api/users", uid] });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`, uid] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders", uid] });
    queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/history`, uid] });
  };

  // Người đã nghỉ vẫn còn trong danh sách để hiện đúng tên trên đơn cũ, nhưng
  // không cho gán mới, nên lọc riêng cho hộp chọn.
  const nhanSuTheoId = useMemo(() => new Map(nhanSu.map((n) => [n.id, n])), [nhanSu]);
  const nhanSuChonDuoc = useMemo(
    () => nhanSu.filter((n) => n.status !== "offboarded"),
    [nhanSu],
  );

  /** Đang mở hộp chọn cho chỗ nào. null = không mở. */
  const [dangChonPhuTrach, setDangChonPhuTrach] = useState<PhuTrachCot | null>(null);

  // ── Sửa dịch vụ ─────────────────────────────────────────────────
  const { data: dsDichVu = [] } = useQuery<Service[]>({ queryKey: ["/api/services", uid] });
  const [suaDvOpen, setSuaDvOpen] = useState(false);
  const [chonDvOpen, setChonDvOpen] = useState(false);
  /** Bản nháp, chỉ ghi xuống máy chủ khi bấm Lưu. */
  const [dongNhap, setDongNhap] = useState<ServiceLine[]>([]);

  const moSuaDichVu = () => {
    setDongNhap(dungLaiDong(order?.items ?? [], dsDichVu));
    setSuaDvOpen(true);
  };

  const chonGoi = (service: Service, pkgIdx: number) => {
    setDongNhap((truoc) => {
      const co = truoc.find((x) => x.service.id === service.id && x.packageIdx === pkgIdx);
      if (co) return truoc.filter((x) => !(x.service.id === service.id && x.packageIdx === pkgIdx));
      const pkg = SERVICE_PACKAGES[service.code]?.[pkgIdx];
      if (!pkg) return truoc;
      return [
        ...truoc,
        {
          service,
          quantity: 1,
          packageIdx: pkgIdx,
          packageInfo: { name: pkg.name, price: pkg.price, commission: pkg.commission },
        },
      ];
    });
    setChonDvOpen(false);
  };

  const tongNhap = dongNhap.reduce((s, x) => s + giaDong(x) * x.quantity, 0);

  const suaDichVu = useMutation({
    mutationFn: async (lines: ServiceLine[]) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/services`, {
        services: lines.map(payloadDong),
      });
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      setSuaDvOpen(false);
      // Hoa hồng được sinh lại ở trạng thái chờ duyệt nên phải nói rõ, không thì
      // người dùng tưởng chỉ đổi mỗi tên dịch vụ.
      toast({
        title: "Đã cập nhật dịch vụ",
        description: "Bảng kê hoa hồng của đơn đã được tính lại và chờ duyệt.",
      });
    },
    onError: (e: Error) => {
      toast({
        title: "Lỗi",
        description: docLoi(e) ?? "Không cập nhật được dịch vụ",
        variant: "destructive",
      });
    },
  });

  // Đúng luật của server (routes.ts, layDonTheoQuyen): chủ đơn, trưởng ca, CEO.
  // Kế toán mở được đơn nhưng không sửa được, nên phải khoá ngay ở giao diện chứ
  // không để bấm thoải mái rồi mới nhận về một câu từ chối.
  const suaPhuTrachDuoc =
    order?.userId === currentUserId || role === "tc" || role === "ceo";

  /**
   * Id đang hiển thị ở một chỗ phụ trách.
   *
   * Lúc còn đang gửi thì lấy theo giá trị vừa bấm chứ không đợi máy chủ trả lời:
   * hộp chọn đóng ngay khi bấm, nếu dòng vẫn in tên cũ thêm một hai giây thì người
   * dùng tưởng bấm hụt và bấm lại, thành ra bắn hai lượt cập nhật.
   */
  const idPhuTrach = (cot: PhuTrachCot): number | null => {
    const dangGui = suaPhuTrach.isPending ? suaPhuTrach.variables : null;
    if (dangGui && cot in dangGui) return dangGui[cot] ?? null;
    return order?.[cot] ?? null;
  };

  /** Tên in trên dòng phụ trách. null = chưa gán ai, in ô trống có dấu cộng. */
  const tenPhuTrach = (id: number | null): string | null => {
    if (id == null) return null;
    const nguoi = nhanSuTheoId.get(id);
    if (nguoi) return nguoi.name;
    // Có id mà chưa tra ra tên: hoặc danh sách nhân viên chưa về, hoặc người đó
    // đã bị gỡ khỏi hệ thống. Cả hai đều KHÔNG được in "Chọn người", vì như vậy
    // là nói dối rằng ô này còn trống.
    return nhanSu.length === 0 ? "Đang tải" : `Nhân viên ${id}`;
  };

  const suaPhuTrach = useMutation({
    mutationFn: async (patch: Partial<Record<PhuTrachCot, number | null>>) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/assignees`, patch);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Đã cập nhật người phụ trách" });
    },
    onError: (e: Error) => {
      toast({
        title: "Lỗi",
        // Server nói rõ lý do (đã nghỉ việc, không có quyền), in thẳng ra thay vì
        // nuốt đi rồi hiện một câu chung chung.
        description: docLoi(e) ?? "Không cập nhật được người phụ trách",
        variant: "destructive",
      });
    },
  });

  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/appointment-status`, { status, note });
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Đã cập nhật trạng thái lịch hẹn" });
    },
    onError: () => {
      toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái", variant: "destructive" });
    },
  });

  const updateVisitStatus = useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/visit-status`, { status, note });
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Đã cập nhật trạng thái khám" });
    },
    onError: () => {
      toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái khám", variant: "destructive" });
    },
  });

  /**
   * Sửa ngày giờ hẹn ngay trên đơn. Khác nút "Dời lịch": chỗ đó hủy đơn này rồi
   * tạo đơn mới, dùng khi khách xin đổi sau lúc đã xác nhận. Còn đây là sửa lại
   * thông tin mình vừa nhập sai hoặc bổ sung lịch cho đơn chưa có.
   */
  /**
   * Khách đã bước vào phòng khám là ca đã chạy: sửa lịch hay đổi dịch vụ lúc đó
   * không còn khớp với việc thật ở quầy. Máy chủ cũng chặn y hệt, đây chỉ là lớp
   * giao diện cho người dùng biết trước.
   */
  const suaDuoc = ["pending", "confirmed", "reminded"].includes(
    order?.appointmentStatus ?? "",
  );

  const suaLichHen = useMutation({
    mutationFn: async (v: { appointmentDate: string; appointmentTime: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/appointment`, v);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      setSuaLichOpen(false);
      toast({ title: "Đã cập nhật lịch hẹn" });
    },
    onError: (err: unknown) => {
      toast({
        title: "Không cập nhật được lịch hẹn",
        description: (err as { message?: string })?.message ?? "Kiểm tra mạng rồi thử lại.",
        variant: "destructive",
      });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async (notes: string) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/notes`, { notes });
      return res.json();
    },
    onSuccess: (_data, notes) => {
      invalidateAll();
      // Gõ rỗng rồi Lưu là xóa ghi chú, báo "đã lưu" thì người dùng tưởng còn nguyên.
      toast({ title: notes.trim() ? "Đã lưu ghi chú" : "Đã xóa ghi chú" });
    },
    onError: () => {
      toast({
        title: "Không lưu được ghi chú",
        description: "Kiểm tra mạng rồi bấm Lưu lần nữa.",
        variant: "destructive",
      });
    },
  });

  const rescheduleOrder = useMutation({
    mutationFn: async ({ appointmentDate, appointmentTime }: { appointmentDate: string; appointmentTime: string }) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/reschedule`, { appointmentDate, appointmentTime });
      return res.json();
    },
    onSuccess: (data) => {
      invalidateAll();
      toast({ title: "Đã dời lịch", description: `Đơn mới: ${data.newOrder.code}` });
      setRescheduleDialog(false);
      navigate(`/orders/${data.newOrder.id}`);
    },
    onError: () => {
      toast({ title: "Lỗi", description: "Không thể dời lịch", variant: "destructive" });
    },
  });

  // Reject CR — KT only
  const rejectCRMutation = useMutation({
    mutationFn: async (input: { crId: string; reason: string }) => {
      const res = await authFetch(`/api/orders/${orderId}/cr/${input.crId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: input.reason }),
      });
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã từ chối hoa hồng" });
      invalidateAll();
      setRejectDialog({ open: false, cr: null, reason: "" });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi", description: err?.error || "Không thể từ chối", variant: "destructive" });
    },
  });

  // Khiếu nại CR — Sale/Doctor + ownership + 3-day window
  const complaintMutation = useMutation({
    mutationFn: async (input: { crId: string; content: string }) => {
      const res = await authFetch(`/api/orders/${orderId}/cr/${input.crId}/complaint`, {
        method: "POST",
        body: JSON.stringify({ content: input.content }),
      });
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã gửi khiếu nại", description: "Kế toán sẽ xem lại trong 1-2 ngày." });
      invalidateAll();
      setComplaintDialog({ open: false, cr: null, content: "" });
    },
    onError: (err: unknown) => {
      toast({ title: "Lỗi", description: loiKhieuNai(err), variant: "destructive" });
    },
  });

  const handleAppointmentAction = (btn: StatusButton) => {
    if (btn.targetStatus === "rescheduled") {
      setNewDate("");
      setNewTime("");
      setRescheduleDialog(true);
      return;
    }
    if (btn.needsConfirmation) {
      const info = APPOINTMENT_STATUSES[btn.targetStatus as AppointmentStatusCode];
      setConfirmDialog({
        open: true,
        title: `Xác nhận: ${info?.label || btn.label}`,
        description: `Chuyển trạng thái lịch hẹn sang "${info?.label}"? Không thể hoàn tác.`,
        action: () => {
          updateAppointmentStatus.mutate({ status: btn.targetStatus });
          setConfirmDialog((p) => ({ ...p, open: false }));
        },
      });
    } else {
      updateAppointmentStatus.mutate({ status: btn.targetStatus });
    }
  };

  const handleVisitAction = (btn: StatusButton) => {
    if (btn.needsConfirmation) {
      const info = VISIT_STATUSES[btn.targetStatus as VisitStatusCode];
      setConfirmDialog({
        open: true,
        title: `Xác nhận: ${info?.label || btn.label}`,
        description: `Chuyển trạng thái khám sang "${info?.label}"? Không thể hoàn tác.`,
        action: () => {
          updateVisitStatus.mutate({ status: btn.targetStatus });
          setConfirmDialog((p) => ({ ...p, open: false }));
        },
      });
    } else {
      updateVisitStatus.mutate({ status: btn.targetStatus });
    }
  };

  if (isLoading || !order) {
    return (
      <Screen activeTab={active} onTab={onTab} noHeader>
        <DetailHeader title="Đơn hàng" onBack={quayLai} />
        <div className="flex flex-1 items-center justify-center py-20">
          {isLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
          ) : (
            <p className="text-np-text-muted">Không tìm thấy đơn hàng</p>
          )}
        </div>
      </Screen>
    );
  }

  const appointmentStatus = order.appointmentStatus as AppointmentStatusCode;
  const visitStatus = order.visitStatus as VisitStatusCode | null;
  const appointmentButtons = APPOINTMENT_BUTTONS[appointmentStatus] || [];
  const visitButtons = visitStatus ? VISIT_BUTTONS[visitStatus] || [] : [];
  // Nhóm khám bệnh có dòng nào không, để biết dòng nào là dòng cuối của cả hộp.
  const soDongKhamBenh = visitStatus ? visitButtons.length : 0;

  const currentIndex = allOrders.findIndex((o) => o.id === orderId);
  const prevOrder = currentIndex > 0 ? allOrders[currentIndex - 1] : null;
  const nextOrder = currentIndex < allOrders.length - 1 ? allOrders[currentIndex + 1] : null;
  const matchedCustomer = allCustomers.find((c) => c.phone === order.phone);
  const ratePct = order.totalPrice > 0 ? ((order.commission / order.totalPrice) * 100).toFixed(1) : "0";


  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader
        // Nhãn trạng thái đứng cạnh mã đơn: liếc thanh đầu là biết đơn đang ở đâu,
        // không phải cuộn xuống. Mã đơn co lại nhường chỗ chứ nhãn không bị bóp.
        title={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 truncate">{order.code}</span>
            <span className="flex-shrink-0">
              <OrderStatusBadges
                appointmentStatus={order.appointmentStatus}
                visitStatus={order.visitStatus}
                refundType={order.refundType}
              />
            </span>
          </span>
        }
        subtitle={`Tạo ${order.createdAt}`}
        onBack={quayLai}
        trailing={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => prevOrder && navigate(`/orders/${prevOrder.id}`)}
              disabled={!prevOrder}
              aria-label="Đơn trước"
              className={DETAIL_HEADER_BTN}
            >
              <ChevronLeft size={18} strokeWidth={2.25} className="text-np-ink" />
            </button>
            <button
              type="button"
              onClick={() => nextOrder && navigate(`/orders/${nextOrder.id}`)}
              disabled={!nextOrder}
              aria-label="Đơn sau"
              className={DETAIL_HEADER_BTN}
            >
              <ChevronRight size={18} strokeWidth={2.25} className="text-np-ink" />
            </button>
          </div>
        }
      />

      <div className="min-h-full flow-root bg-np-bg">

        {/* Phụ trách: ba chỗ cố định, mỗi chỗ đúng một người, bấm vào để đổi.
            Không in chức danh cạnh tên vì nhãn bên trái đã nói rõ vai trò trên ca
            này rồi, thêm chức danh nữa là hai thông tin gần giống nhau chen chỗ. */}
        <SectionTitle icon={UserCog}>Phụ trách</SectionTitle>
        {/* Không overflow-hidden: bảng chọn là thẻ nổi thò ra ngoài đáy thẻ này. */}
        <Card className="p-0">
          {PHU_TRACH.map((o, i) => {
            const id = idPhuTrach(o.cot);
            const nguoi = id != null ? nhanSuTheoId.get(id) : undefined;
            const dangMo = dangChonPhuTrach === o.cot;
            return (
              <div key={o.cot} className="relative">
                <PhuTrachRow
                  icon={o.icon}
                  label={o.nhan}
                  name={tenPhuTrach(id)}
                  onOpen={
                    suaPhuTrachDuoc
                      ? () => setDangChonPhuTrach(dangMo ? null : o.cot)
                      : undefined
                  }
                  onClear={
                    suaPhuTrachDuoc && id != null
                      ? () => suaPhuTrach.mutate({ [o.cot]: null })
                      : undefined
                  }
                  last={i === PHU_TRACH.length - 1}
                />
                {/* Thẻ nổi mở ngay dưới đúng dòng vừa bấm, đè lên nội dung phía
                    dưới thay vì đẩy trang dài ra: chọn một cái tên là việc nhỏ,
                    không đáng để cả trang nhảy chỗ. */}
                {dangMo && (
                  <>
                    {/* Bấm ra ngoài là đóng. Nền trong suốt nên không tối màn hình. */}
                    <button
                      type="button"
                      aria-label="Đóng bảng chọn"
                      onClick={() => setDangChonPhuTrach(null)}
                      className="fixed inset-0 z-10 cursor-default"
                    />
                    <PersonPicker
                      value={id}
                      current={
                        nguoi
                          ? { id: nguoi.id, name: nguoi.name, roleLabel: ROLE_LABEL[nguoi.role] }
                          : null
                      }
                      people={sapXepTheoVai(nhanSuChonDuoc, o.uuTien)}
                      onSelect={(idMoi) => {
                        suaPhuTrach.mutate({ [o.cot]: idMoi });
                        setDangChonPhuTrach(null);
                      }}
                      className="absolute left-4 right-4 top-full z-20 -mt-1"
                    />
                  </>
                )}
              </div>
            );
          })}
        </Card>

        {/* Khách hàng */}
        <SectionTitle icon={ContactsProduct}>Khách hàng</SectionTitle>
        <Card className="overflow-hidden p-0">
          <Row
            leading={<Avatar name={order.patientName} size={44} />}
            title={order.patientName}
            subtitle={`Mã khách hàng: ${String(order.id).padStart(4, "0")}`}
            trailing={matchedCustomer ? <Chev /> : undefined}
            onClick={matchedCustomer ? () => navigate(`/customers/${matchedCustomer.id}`) : undefined}
          />
          {order.examType && <InfoRow icon={MapPin} label="Hình thức" value={order.examType} last />}
          {/* Gọi và nhắn ngay từ màn đơn, không phải nhảy sang màn khách. Số điện
              thoại và email nằm trong hộp chi tiết nên không cần hai dòng riêng. */}
          <div className="border-t border-np-surface-pressed px-4 py-3.5">
            <ContactActions
              phone={order.phone}
              email={order.email}
              customerId={matchedCustomer?.id}
            />
          </div>
        </Card>

        {/* Dịch vụ — multi-item với mark UI cho BS/KT/CEO */}
        <SectionTitle
          icon={MedicalServices}
          action={
            suaDuoc && suaPhuTrachDuoc ? (
              <button
                type="button"
                aria-label="Sửa dịch vụ"
                onClick={moSuaDichVu}
                className="-my-2 flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-np-text-sub transition-colors active:bg-np-surface-pressed"
              >
                <EditSquare size={18} fill="none" />
              </button>
            ) : undefined
          }
        >
          Dịch vụ ({order.items?.length ?? 1})
        </SectionTitle>
        <Card className="overflow-hidden p-0">
          {(order.items ?? []).map((item, i) => (
            <ItemRow
              key={item.id}
              item={item}
              isFullRefund={order.refundType === "full"}
              last={i === (order.items?.length ?? 1) - 1}
            />
          ))}

          {/* Tổng cộng */}
          <div className="flex flex-col gap-1.5 px-4 py-3">
            <div className="flex justify-between text-[13px] font-medium text-np-text-sub">
              <span>Tạm tính</span>
              <span className={"tabular-nums " + (order.refundType === "full" ? "line-through opacity-60" : "")}>
                {fmtVND(order.totalPrice)}
              </span>
            </div>
            {order.refundType === "partial" && (
              <div className="flex justify-between text-[13px] font-medium text-np-danger">
                <span>Hoàn tiền</span>
                <span className="tabular-nums">-{fmtVND(order.refundAmount)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-np-border pt-2 text-[15px] font-extrabold text-np-ink">
              <span>Tổng cộng</span>
              <span
                className={
                  "tabular-nums " + (order.refundType === "full" ? "line-through opacity-60" : "")
                }
              >
                {fmtVND(order.totalPrice - (order.refundType === "partial" ? order.refundAmount : 0))}
              </span>
            </div>
          </div>
        </Card>

        {/* Bảng kê hoa hồng — CR per role với reject (KT) + khiếu nại (NV) */}
        {order.crs && order.crs.length > 0 && (
          <>
            <SectionTitle icon={Receipt}>Bảng kê hoa hồng</SectionTitle>
            <Card className="overflow-hidden p-0">
              {order.crs.map((cr, i) => (
                <CommissionRow
                  key={cr.id}
                  cr={{ ...cr, daKhieuNai: !!cr.complaint }}
                  currentUserId={currentUserId}
                  showRole
                  complaint={cr.complaint}
                  onComplaint={() => setComplaintDialog({ open: true, cr, content: "" })}
                  actions={
                    canRejectCR && cr.status === "CHO_DUYET" ? (
                      <NPButton
                        tone="dark"
                        size="sm"
                        onClick={() => setRejectDialog({ open: true, cr, reason: "" })}
                      >
                        Từ chối hoa hồng
                      </NPButton>
                    ) : undefined
                  }
                  last={i === order.crs.length - 1}
                />
              ))}
            </Card>
          </>
        )}

        {/* Lịch hẹn: luôn hiện, kể cả đơn chưa có lịch. Trước đây khối này ẩn khi
            trống nên đơn thiếu lịch không có chỗ nào để bổ sung. */}
        <SectionTitle
          icon={Calendar}
          action={
            suaDuoc ? (
              <button
                type="button"
                aria-label="Sửa lịch hẹn"
                onClick={() => {
                  setNgayMoi(toInputDate(order.appointmentDate));
                  setGioMoi(order.appointmentTime ?? "");
                  setSuaLichOpen(true);
                }}
                className="-my-2 flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-np-text-sub transition-colors active:bg-np-surface-pressed"
              >
                <EditSquare size={18} fill="none" />
              </button>
            ) : undefined
          }
        >
          Lịch hẹn
        </SectionTitle>
        <Card className="overflow-hidden p-0">
          {order.appointmentDate || order.appointmentTime ? (
            <>
              <InfoRow
                icon={CalendarDays}
                label="Ngày hẹn"
                value={order.appointmentDate || "Chưa có"}
                last={false}
              />
              <InfoRow
                icon={Clock}
                label="Giờ hẹn"
                value={order.appointmentTime || "Chưa có"}
                last
              />
            </>
          ) : suaDuoc ? (
            <button
              type="button"
              onClick={() => {
                setNgayMoi("");
                setGioMoi("");
                setSuaLichOpen(true);
              }}
              className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-np-surface-sub"
            >
              <PlusCircle size={19} strokeWidth={2.25} className="flex-shrink-0 text-np-text-muted" />
              <span className="flex-1 text-[15px] font-semibold text-np-ink">Thêm lịch hẹn</span>
              <Chev />
            </button>
          ) : (
            <div className="px-4 py-6 text-center text-[13px] text-np-text-muted">
              Đơn này không có lịch hẹn
            </div>
          )}
        </Card>

        {/* Lịch sử đơn: gộp chuyển trạng thái với các thay đổi khác (lịch hẹn,
            dịch vụ, người phụ trách, ghi chú). Máy chủ đã trộn, khử trùng và xếp
            mới nhất trước, ở đây chỉ dịch sang câu tiếng Việt. */}
        {nhatKy.length > 0 && (
          <>
            <SectionTitle icon={History}>Lịch sử đơn</SectionTitle>
            <ActivityLog
              entries={nhatKy.map((e) => {
                const v = eventView(e, { trongDon: true });
                return {
                  id: e.id,
                  at: e.createdAt,
                  actor: e.actorName,
                  action: v.action,
                  detail: v.detail,
                };
              })}
              preview={LOG_PREVIEW}
              unitLabel="hoạt động"
              moreTitle="Lịch sử đơn"
            />
          </>
        )}

        {/* Ghi chú đơn: dùng mẫu chung của app, xem tại chỗ và sửa trong hộp riêng. */}
        <NoteSection
          icon={StickyNote}
          value={order.notes ?? ""}
          placeholder="Yêu cầu riêng của khách, dặn dò khi thực hiện dịch vụ"
          saving={updateNotes.isPending}
          onSave={(note) => updateNotes.mutateAsync(note.trim())}
        />

        {/* Spacer để content cuối không bị che bởi action bar absolute */}
        {(appointmentButtons.length > 0 || visitButtons.length > 0) && <div className="h-[88px]" />}

      </div>

      {/* Compact action bar — absolute pin trên TabBar, luôn visible */}
      {(appointmentButtons.length > 0 || visitButtons.length > 0) &&
        (() => {
          const allActions: Array<StatusButton & { tier: "appointment" | "visit" }> = [
            ...appointmentButtons.map((b) => ({ ...b, tier: "appointment" as const })),
            ...(visitStatus ? visitButtons.map((b) => ({ ...b, tier: "visit" as const })) : []),
          ];
          const primary = allActions.find((b) => b.variant === "default") ?? allActions[0];
          const hasMore = allActions.length > 1;
          const PrimaryIcon = BUTTON_ICONS[primary.icon];
          const handle = (a: typeof primary) =>
            a.tier === "appointment" ? handleAppointmentAction(a) : handleVisitAction(a);

          return (
            <div className="absolute bottom-[64px] left-0 right-0 z-20 border-t border-np-border bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2">
                <NPButton
                  size="lg"
                  tone={
                    primary.variant === "destructive"
                      ? "dark"
                      : primary.variant === "outline"
                      ? "ghost"
                      : "primary"
                  }
                  icon={PrimaryIcon}
                  className="flex-1 justify-center"
                  onClick={() => handle(primary)}
                  disabled={updateAppointmentStatus.isPending || updateVisitStatus.isPending}
                >
                  {primary.label}
                </NPButton>
                {hasMore && (
                  <button
                    type="button"
                    aria-label="Hành động khác"
                    onClick={() => setActionsSheetOpen(true)}
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-np-button border border-np-border-strong bg-white text-np-ink transition-colors hover:bg-np-surface-sub"
                  >
                    <MoreHorizontal size={20} strokeWidth={2.25} />
                  </button>
                )}
              </div>
            </div>
          );
        })()}

      {/* Confirm dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((p) => ({ ...p, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.action}>Xác nhận</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule dialog */}
      {/* Sửa lịch hẹn tại chỗ. Bọc nút trong div vì SheetContent giấu mọi <button>
          là con trực tiếp (luật dành cho nút đóng mặc định). */}
      <Sheet open={suaLichOpen} onOpenChange={setSuaLichOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-[390px] rounded-t-np-sheet border-0 p-5 pt-3 [&>button]:hidden"
        >
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-np-surface-pressed" />
          <SheetTitle className="mb-4 text-[16px] font-bold text-np-ink">
            {order.appointmentDate || order.appointmentTime ? "Sửa lịch hẹn" : "Thêm lịch hẹn"}
          </SheetTitle>

          <DateTimeField
            date={ngayMoi}
            onDateChange={setNgayMoi}
            time={gioMoi}
            onTimeChange={setGioMoi}
            timeAs="inline"
            min={new Date().toISOString().split("T")[0]}
          />

          <div className="mt-5">
            <NPButton
              tone="primary"
              size="lg"
              disabled={!ngayMoi || !gioMoi || suaLichHen.isPending}
              onClick={() =>
                suaLichHen.mutate({
                  appointmentDate: ngayMoi.split("-").reverse().join("/"),
                  appointmentTime: gioMoi,
                })
              }
              className="w-full justify-center"
            >
              {suaLichHen.isPending ? "Đang lưu..." : "Lưu lịch hẹn"}
            </NPButton>
            <button
              type="button"
              onClick={() => setSuaLichOpen(false)}
              className="mt-2 h-10 w-full text-[14px] font-bold text-np-text-sub"
            >
              Hủy
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sửa dịch vụ. Hộp cao cố định 85% màn hình vì danh sách dài ngắn tùy đơn,
          để hộp co giãn theo nội dung thì nút Lưu nhảy chỗ mỗi lần thêm bớt. */}
      <Sheet open={suaDvOpen} onOpenChange={setSuaDvOpen}>
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
                onClick={() => setSuaDvOpen(false)}
                className={DETAIL_HEADER_BTN}
              >
                <X size={17} strokeWidth={2.25} />
              </button>
              <SheetTitle className="text-[16px] font-bold text-np-ink">Sửa dịch vụ</SheetTitle>
              <div className="h-9 w-9 flex-shrink-0" />
            </div>
          </div>

          <div className="scrollbar-hide flex-1 space-y-3 overflow-y-auto p-4">
            <ServiceLines
              lines={dongNhap}
              onChangeQuantity={(dong, delta) =>
                setDongNhap((truoc) =>
                  truoc.map((x) =>
                    x.service.id === dong.service.id && x.packageIdx === dong.packageIdx
                      ? { ...x, quantity: Math.max(1, x.quantity + delta) }
                      : x,
                  ),
                )
              }
              onRemove={(dong) =>
                setDongNhap((truoc) =>
                  truoc.filter(
                    (x) => !(x.service.id === dong.service.id && x.packageIdx === dong.packageIdx),
                  ),
                )
              }
            />

            <button
              type="button"
              onClick={() => setChonDvOpen(true)}
              className="flex min-h-[52px] w-full items-center gap-3 rounded-np-card border border-dashed border-np-border-strong px-4 py-3 text-left transition-colors active:bg-np-surface-sub"
            >
              <PlusCircle size={19} strokeWidth={2.25} className="flex-shrink-0 text-np-text-muted" />
              <span className="flex-1 text-[15px] font-semibold text-np-ink">Thêm dịch vụ</span>
              <Chev />
            </button>

            {dongNhap.length === 0 && (
              <p className="px-1 text-[13px] text-np-text-muted">
                Đơn phải có ít nhất một dịch vụ.
              </p>
            )}

            {/* Nói trước hậu quả ngay trong hộp, không đợi lưu xong mới báo: đổi
                dịch vụ là đổi tiền, hoa hồng đã duyệt của đơn sẽ bị tính lại. */}
            <p className="px-1 text-[13px] leading-[1.5] text-np-text-muted">
              Lưu thay đổi sẽ tính lại bảng kê hoa hồng của đơn và đưa về chờ duyệt.
            </p>
          </div>

          <div className="np-divider-top flex-shrink-0 border-t border-np-border bg-white p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-[14px] font-medium text-np-text-sub">Tạm tính</span>
              <span className="text-[17px] font-extrabold tabular-nums text-np-ink">
                {fmtVND(tongNhap)}
              </span>
            </div>
            <NPButton
              tone="primary"
              size="lg"
              disabled={dongNhap.length === 0 || suaDichVu.isPending}
              onClick={() => suaDichVu.mutate(dongNhap)}
              className="w-full justify-center"
            >
              {suaDichVu.isPending ? "Đang lưu..." : "Lưu dịch vụ"}
            </NPButton>
          </div>
        </SheetContent>
      </Sheet>

      <ServicePickerSheet
        open={chonDvOpen}
        onOpenChange={setChonDvOpen}
        services={dsDichVu}
        isPackageSelected={(serviceId, pkgIdx) =>
          dongNhap.some((x) => x.service.id === serviceId && x.packageIdx === pkgIdx)
        }
        onSelectPackage={chonGoi}
      />

      <Dialog open={rescheduleDialog} onOpenChange={setRescheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dời lịch hẹn</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-[13px] text-np-text-sub">
              Chọn ngày giờ mới. Đơn hiện tại chuyển "Dời lịch", tạo đơn mới ở trạng thái "Đã xác nhận".
            </p>
            <DateTimeField
              date={newDate}
              onDateChange={setNewDate}
              time={newTime}
              onTimeChange={setNewTime}
              timeAs="inline"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <DialogFooter>
            <NPButton tone="ghost" onClick={() => setRescheduleDialog(false)}>
              Hủy bỏ
            </NPButton>
            <NPButton
              tone="primary"
              disabled={!newDate || !newTime || rescheduleOrder.isPending}
              onClick={() => {
                const formattedDate = newDate.split("-").reverse().join("/");
                rescheduleOrder.mutate({ appointmentDate: formattedDate, appointmentTime: newTime });
              }}
            >
              {rescheduleOrder.isPending ? "Đang xử lý..." : "Xác nhận dời lịch"}
            </NPButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overflow actions sheet */}
      <Sheet open={actionsSheetOpen} onOpenChange={setActionsSheetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-[390px] gap-0 rounded-t-np-sheet border-0 bg-white p-0"
        >
          <div className="flex justify-center pt-2">
            <div className="h-1 w-9 rounded-full bg-np-border-strong" />
          </div>
          <SheetHeader className="px-5 pb-3 pt-3 text-left">
            <SheetTitle className="text-[17px] font-bold tracking-[-0.1px] text-np-ink">
              Hành động
            </SheetTitle>
          </SheetHeader>
          {/* Chỉ chữ và icon, không khối màu: hộp này là danh sách việc chọn một,
              tô nền cho từng dòng thành ra mỗi dòng đều đòi được bấm trước.
              Việc không lùi lại được thì để chữ đỏ thay vì nền đen. */}
          <div className="pb-6">
            {appointmentButtons.map((btn, i) => {
              const Icon = BUTTON_ICONS[btn.icon];
              const nangNe = btn.variant === "destructive";
              return (
                <button
                  key={`sheet-appt-${btn.targetStatus}`}
                  type="button"
                  onClick={() => {
                    setActionsSheetOpen(false);
                    handleAppointmentAction(btn);
                  }}
                  disabled={updateAppointmentStatus.isPending}
                  className={cn(
                    "flex min-h-[54px] w-full items-center gap-3 px-5 text-[15px] font-semibold transition-colors active:bg-np-surface-sub disabled:opacity-50",
                    // Không kẻ vạch dưới dòng cuối cùng của cả hộp.
                    !(i === appointmentButtons.length - 1 && !soDongKhamBenh) && "np-divider",
                    nangNe ? "text-np-danger" : "text-np-ink",
                  )}
                >
                  <Icon
                    size={20}
                    strokeWidth={2.25}
                    className={cn("flex-shrink-0", nangNe ? "text-np-danger" : "text-np-text-sub")}
                  />
                  {btn.label}
                </button>
              );
            })}
            {visitStatus &&
              visitButtons.map((btn, i) => {
                const Icon = BUTTON_ICONS[btn.icon];
                const nangNe = btn.variant === "destructive";
                return (
                  <button
                    key={`sheet-visit-${btn.targetStatus}`}
                    type="button"
                    onClick={() => {
                      setActionsSheetOpen(false);
                      handleVisitAction(btn);
                    }}
                    disabled={updateVisitStatus.isPending}
                    className={cn(
                      "flex min-h-[54px] w-full items-center gap-3 px-5 text-[15px] font-semibold transition-colors active:bg-np-surface-sub disabled:opacity-50",
                      i !== visitButtons.length - 1 && "np-divider",
                      nangNe ? "text-np-danger" : "text-np-ink",
                    )}
                  >
                    <Icon
                      size={20}
                      strokeWidth={2.25}
                      className={cn("flex-shrink-0", nangNe ? "text-np-danger" : "text-np-text-sub")}
                    />
                    {btn.label}
                  </button>
                );
              })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Reject CR dialog (KT only) */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((p) => ({ ...p, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối hoa hồng</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-[13px] text-np-text-sub">
              Hoa hồng {rejectDialog.cr ? ROLE_LABEL[rejectDialog.cr.role as UserRole] : ""}{" "}
              ·{" "}
              <span className="font-bold text-np-ink">
                {rejectDialog.cr ? fmtVND(rejectDialog.cr.amount) : ""}
              </span>
            </p>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-np-text-sub">
                Lý do từ chối
              </label>
              <Textarea
                placeholder="Ví dụ: Số đơn không khớp với số liệu hệ thống..."
                value={rejectDialog.reason}
                onChange={(e) => setRejectDialog((p) => ({ ...p, reason: e.target.value }))}
              />
            </div>
            <p className="text-[11px] leading-relaxed text-np-text-muted">
              Nhân viên có thể khiếu nại trong 3 ngày sau khi bị từ chối.
            </p>
          </div>
          <DialogFooter>
            <NPButton tone="ghost" onClick={() => setRejectDialog({ open: false, cr: null, reason: "" })}>
              Hủy
            </NPButton>
            <NPButton
              tone="dark"
              disabled={!rejectDialog.reason || rejectDialog.reason.length < 2 || rejectCRMutation.isPending}
              onClick={() =>
                rejectDialog.cr &&
                rejectCRMutation.mutate({ crId: rejectDialog.cr.id, reason: rejectDialog.reason })
              }
            >
              {rejectCRMutation.isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
            </NPButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ComplaintSheet
        open={complaintDialog.open}
        onOpenChange={(open) => setComplaintDialog((p) => ({ ...p, open }))}
        cr={complaintDialog.cr}
        content={complaintDialog.content}
        onContentChange={(v) => setComplaintDialog((p) => ({ ...p, content: v }))}
        saving={complaintMutation.isPending}
        onSubmit={() =>
          complaintDialog.cr &&
          complaintMutation.mutate({
            crId: complaintDialog.cr.id,
            content: complaintDialog.content,
          })
        }
      />
    </Screen>
  );
}

function ItemRow({
  item,
  isFullRefund,
  last,
}: {
  item: APIOrderItem;
  isFullRefund: boolean;
  last?: boolean;
}) {
  // Status display-only — populate qua iHOS webhook (Phase 2). KHÔNG có manual mark
  // ở app HH vì status là trạng thái khám thực tế, không phải data entry user-side.
  const isStruck = item.status === "skipped" || isFullRefund;
  return (
    <div
      className={
        "px-4 py-3.5" + (last ? "" : " np-divider")
      }
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className={"text-[14px] font-bold " + (isStruck ? "text-np-text-muted line-through" : "text-np-ink")}>
            {item.serviceName}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.status === "completed" && <NPBadge tone="success">Hoàn thành</NPBadge>}
            {item.status === "skipped" && (
              <NPBadge tone="critical">
                Bỏ qua{item.skippedReason ? ` · ${SKIPPED_REASON_LABEL[item.skippedReason]}` : ""}
              </NPBadge>
            )}
            {item.status === "planned" && <NPBadge tone="attention">Chưa thực hiện</NPBadge>}
          </div>
        </div>
        <div className={"flex-shrink-0 text-[14px] font-bold tabular-nums " + (isStruck ? "text-np-text-muted line-through" : "text-np-ink")}>
          {fmtVND(item.price)}
        </div>
      </div>
    </div>
  );
}


/**
 * Một dòng phụ trách: nhãn vai bên trái, người được gán bên phải.
 *
 * Bố cục nhãn-trái/người-phải chứ không phải danh sách người xếp dọc: ba chỗ này
 * là ba câu hỏi cố định (ai chỉ định, ai làm, ai tư vấn), nhìn cột nhãn bên trái
 * là biết ngay chỗ nào còn trống, thứ mà một danh sách tên thuần không nói được.
 */
/**
 * Một dòng phụ trách: nhãn vai bên trái, người được gán bên phải.
 *
 * Bố cục nhãn-trái/người-phải chứ không phải danh sách người xếp dọc: ba chỗ này
 * là ba câu hỏi cố định (ai chỉ định, ai làm, ai tư vấn), nhìn cột nhãn bên trái
 * là biết ngay chỗ nào còn trống, thứ mà một danh sách tên thuần không nói được.
 *
 * Người đã gán hiện thành CHIP xám có dấu X: bỏ ra là việc một chạm ngay tại dòng,
 * không phải mở bảng chọn rồi mới tìm chỗ gỡ.
 */
function PhuTrachRow({
  icon: Icon,
  label,
  name,
  onOpen,
  onClear,
  last,
}: {
  icon: LucideIcon;
  label: string;
  name: string | null;
  /** Bỏ trống thì dòng chỉ để xem, dùng cho vai không có quyền sửa đơn. */
  onOpen?: () => void;
  onClear?: () => void;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[56px] w-full items-center gap-3 px-4 py-2",
        !last && "np-divider",
      )}
    >
      <Icon size={18} fill="none" className="flex-shrink-0 text-np-text-muted" />
      {/* Nhãn không co: tên dài mà bóp nhãn xuống hai dòng thì dòng phình cao,
          ba dòng lệch nhịp nhau. Phần bị cắt bớt phải là tên, không phải nhãn. */}
      <span className="flex-shrink-0 text-[14px] text-np-text-sub">{label}</span>

      {name ? (
        <div className="flex min-w-0 flex-1 justify-end">
          <div className="flex min-w-0 items-center gap-1 rounded-np-button bg-np-surface-sub py-1 pl-1 pr-1">
            <button
              type="button"
              onClick={onOpen}
              disabled={!onOpen}
              className="flex min-w-0 items-center gap-2 pr-1 text-left"
            >
              <Avatar name={name} size={24} className="flex-shrink-0" />
              <span className="truncate text-[14px] font-semibold text-np-ink">{name}</span>
            </button>
            {onClear && (
              <button
                type="button"
                aria-label={`Bỏ ${name}`}
                onClick={onClear}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-np-text-muted transition-colors active:bg-np-surface-pressed"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          // Vòng tròn nét đứt: chỗ trống trông ra "còn thiếu người" chứ không phải
          // "mục này không có nội dung".
          className="flex flex-1 items-center justify-end gap-2"
        >
          <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full border border-dashed border-np-border-strong">
            <PlusCircle size={13} className="text-np-text-muted" />
          </span>
          <span className="text-[14px] text-np-text-muted">Chọn người</span>
        </button>
      )}
    </div>
  );
}

/**
 * Xếp người hợp vai lên đầu hộp chọn, phần còn lại giữ nguyên thứ tự.
 *
 * Chỉ sắp lại chứ không lọc bỏ: chọn bác sĩ thì thấy bác sĩ trước, nhưng ca nào
 * điều dưỡng làm thay thì vẫn chọn được, không phải đi sửa code.
 */
function sapXepTheoVai(ds: StaffOption[], uuTien: UserRole): PickablePerson[] {
  const diem = (n: StaffOption) => (n.role === uuTien ? 0 : 1);
  return [...ds]
    .sort((a, b) => diem(a) - diem(b))
    .map((n) => ({ id: n.id, name: n.name, roleLabel: ROLE_LABEL[n.role] ?? n.role }));
}

function InfoRow({
  icon: Icon,
  label,
  value,
  last,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        last ? "" : "np-divider"
      }`}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-np-surface-sub">
        <Icon size={15} strokeWidth={2.25} className="text-np-text-sub" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-np-text-muted">
          {label}
        </div>
        <div className="mt-0.5 truncate text-[14px] font-semibold text-np-ink">{value || "-"}</div>
      </div>
    </div>
  );
}

function KeyVal({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start gap-2 text-[13px]">
      <span className="w-28 flex-shrink-0 text-np-text-muted">{label}:</span>
      <span className={`font-medium text-np-ink ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}
