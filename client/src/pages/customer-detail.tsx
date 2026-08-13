import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQuayLai } from "@/lib/use-back";
import { useLocation, useRoute } from "wouter";
import { authFetch, getCurrentUserId } from "@/lib/queryClient";
import {
  Calendar,
  Copy,
  Crown,
  Mail,
  MedicalServices,
  MessageSquare,
  Plus,
  StickyNote,
  X,
} from "@/components/np/icon";
import {
  ActivityLog,
  type ActivityEntry,
  CallResultSheet,
  type CallOutcome,
  Badge,
  Card,
  Chev,
  ContactActions,
  DetailHeader,
  HintLabel,
  NoteSection,
  NPButton,
  OrderStatusBadges,
  PageHeader,
  Row,
  Screen,
  SectionTitle,
  useTabNav,
  type BadgeTone,
} from "@/components/np";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Customer, Order } from "@shared/schema";
import {
  RECALL_OUTCOME_LABEL,
  type RecallOutcome,
} from "@shared/types";
import {
  APPOINTMENT_STATUSES,
  VISIT_STATUSES,
  type AppointmentStatusCode,
  type VisitStatusCode,
} from "@shared/status";

// 1 lượt tái khám (order_item) của khách — shape khớp GET /api/customers/:id .recallItems.
type RecallItem = {
  orderItemId: number;
  serviceName: string;
  recallDueDate: string; // "YYYY-MM-DD"
  recallStatus: string; // pending | scheduled | refused
  lastCall: { outcome: string; at: string } | null;
};

// 1 dòng lịch sử gọi (recall_logs) — shape khớp .recallLogs từ database.
type RecallLogEntry = {
  id: number;
  orderItemId: number;
  customerId: number;
  actorUserId: number;
  actorName: string;
  outcome: string;
  note: string | null;
  createdAt: string; // ISO
};

function fmtVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

// Nhật ký hành động khách hàng (ADR-003).
type CustomerEvent = {
  id: number;
  type: string;
  actorUserId: number | null;
  actorName: string | null;
  orderId: number | null;
  meta: {
    code?: string;
    serviceName?: string;
    tier?: string;
    fromStatus?: string;
    toStatus?: string;
    outcome?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    /** Các chỗ phụ trách vừa đổi, khoá là tên cột trong bảng orders. */
    assignees?: Record<string, number | null>;
  } | null;
  createdAt: string;
};

/**
 * Chữ trạng thái đọc thẳng từ nguồn dùng chung. Trước đây file tự khai một bảng
 * riêng nên cùng một đơn, dòng nhật ký ghi "Hoàn tất" còn nhãn ngay dưới ghi
 * "Hoàn thành". Hai tầng dùng chung mã `arrived` và `cancelled` với nghĩa khác
 * nhau, nên phải xem `tier` mới tra đúng bảng.
 */
function statusLabel(code: string | undefined, tier: string | undefined): string {
  if (!code) return "";
  if (tier === "visit") return VISIT_STATUSES[code as VisitStatusCode]?.label ?? code;
  if (tier === "appointment")
    return APPOINTMENT_STATUSES[code as AppointmentStatusCode]?.label ?? code;
  return (
    APPOINTMENT_STATUSES[code as AppointmentStatusCode]?.label ??
    VISIT_STATUSES[code as VisitStatusCode]?.label ??
    code
  );
}

// Kết quả gọi tái khám — 3 lựa chọn (giống màn "Tái khám cần gọi" /recalls).
/** Chiều cao thanh trên của DetailHeader: nút tròn 36px + lề dọc 2×10px. */
const DETAIL_HEADER_HEIGHT = 56;

/** "YYYY-MM-DD" -> "DD/MM/YYYY". Trả chuỗi gốc nếu định dạng lạ. */
function fmtRecallDate(s: string | null | undefined): string {
  if (!s) return "Chưa rõ";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

/** ISO -> "DD/MM lúc HH:mm" (ngày trước giờ, dễ đọc). Rỗng nếu không parse được. */
function fmtCallTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} lúc ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Số ngày từ hôm nay tới recallDueDate (dương = quá hạn). null nếu thiếu/lạ. */
function daysOverdue(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  if (Number.isNaN(due.getTime())) return null;
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - due.getTime()) / 86_400_000);
}

/** Nhãn trạng thái thời gian theo số ngày quá hạn (giống worklist). */
function timeLabel(days: number | null): { text: string; tone: BadgeTone } {
  if (days == null) return { text: "Chưa rõ", tone: "neutral" };
  if (days > 0) return { text: `Trễ ${days} ngày`, tone: "critical" };
  if (days === 0) return { text: "Hôm nay", tone: "attention" };
  // Chưa tới hạn là đang chạy đúng tiến độ, không phải nhãn trung tính.
  return { text: `Sắp tới ${-days} ngày`, tone: "info" };
}

/**
 * Tên cột phụ trách trong bảng orders → chữ người dùng đọc.
 *
 * Phải khớp với hằng PHU_TRACH ở màn chi tiết đơn: cùng một chỗ mà hai màn gọi
 * hai tên thì người đọc nhật ký không biết mình vừa sửa cái gì.
 */
const PHU_TRACH_LABEL: Record<string, string> = {
  indicatedByUserId: "Chỉ định",
  performedByUserId: "Thực hiện",
  saleUserId: "Tư vấn",
};

/**
 * Một dòng nhật ký viết như một câu: "Phú Nguyễn gọi điện". Nên `action` luôn bắt
 * đầu bằng động từ thường, phần tên người đứng trước do nơi hiển thị ghép vào.
 */
function eventView(
  e: CustomerEvent,
  orderCode?: string,
): { action: string; detail: string | null } {
  const m = e.meta ?? {};
  const code = orderCode ?? m.code;
  switch (e.type) {
    case "call":
      return { action: "gọi điện", detail: null };
    case "sms":
      return { action: "nhắn tin", detail: null };
    case "email":
      return { action: "gửi email", detail: null };
    case "note_updated":
      return { action: "cập nhật ghi chú", detail: null };
    case "note_cleared":
      return { action: "xóa ghi chú", detail: null };
    case "order_created":
      return {
        action: code ? `tạo đơn ${code}` : "tạo đơn",
        detail: m.serviceName ?? null,
      };
    case "order_updated": {
      // Cùng một loại sự kiện dùng cho ba việc: sửa lịch hẹn, đổi người phụ trách
      // và đổi dịch vụ. Phân biệt bằng meta để câu nhật ký nói đúng việc vừa làm;
      // thiếu nhánh nào là việc đó bị kể thành việc khác.
      const lich = m.appointmentDate
        ? `${m.appointmentDate}${m.appointmentTime ? ` ${m.appointmentTime}` : ""}`
        : null;
      if (lich) {
        return { action: code ? `sửa lịch hẹn ${code}` : "sửa lịch hẹn", detail: lich };
      }
      if (m.assignees) {
        const cho = Object.keys(m.assignees)
          .map((k) => PHU_TRACH_LABEL[k])
          .filter(Boolean);
        return {
          action: code ? `đổi người phụ trách đơn ${code}` : "đổi người phụ trách",
          detail: cho.length > 0 ? cho.join(", ") : null,
        };
      }
      return {
        action: code ? `đổi dịch vụ đơn ${code}` : "đổi dịch vụ",
        detail: m.serviceName ?? null,
      };
    }
    case "status_change": {
      const from = statusLabel(m.fromStatus, m.tier);
      const to = statusLabel(m.toStatus, m.tier);
      const what = m.tier === "visit" ? "ca khám" : "lịch hẹn";
      return {
        action: code ? `cập nhật ${what} ${code}` : `cập nhật ${what}`,
        detail: from && to ? `${from} → ${to}` : null,
      };
    }
    case "recall_call":
      return {
        action: "gọi nhắc lịch",
        detail: m.outcome ? (RECALL_OUTCOME_LABEL[m.outcome as RecallOutcome] ?? null) : null,
      };
    case "order_refund":
      return {
        action: code ? `hoàn tiền đơn ${code}` : "hoàn tiền đơn",
        detail: m.serviceName ?? null,
      };
    case "order_completed":
      return {
        action: code ? `hoàn tất đơn ${code}` : "hoàn tất đơn",
        detail: m.serviceName ?? null,
      };
    case "order_cancelled":
      return {
        action: code ? `hủy đơn ${code}` : "hủy đơn",
        detail: m.serviceName ?? null,
      };
    case "appointment_reminded":
      return { action: "nhắc lịch hẹn", detail: null };
    default:
      // Loại sự kiện chưa có nhãn: nói chung chung, không để lộ mã tiếng Anh.
      return { action: "có hoạt động", detail: null };
  }
}

/** Số dòng nhật ký hiện sẵn. Phần còn lại nằm sau nút "Xem thêm". */
const EVENT_PREVIEW = 5;

/** Số lượt gọi hé sẵn trong mục Tái khám, phần còn lại nằm trong hộp. */
const LOG_PREVIEW = 2;

export default function CustomerDetail() {
  const { active, onTab } = useTabNav();
  const [, params] = useRoute("/customers/:id");
  const [, navigate] = useLocation();
  const quayLai = useQuayLai("/customers");
  const customerId = params?.id ? parseInt(params.id, 10) : 0;

  const {
    data: customerData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{
    customer: Customer;
    medicalNoteByName: string | null;
    orders: Order[];
    stats: { orderCount: number; totalSpent: number; statsMonths: number; customerSince: string };
    recallItems: RecallItem[];
    recallLogs: RecallLogEntry[];
    events: CustomerEvent[];
  }>({
    queryKey: [`/api/customers/${customerId}`, getCurrentUserId()],
    enabled: customerId > 0,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Hộp "Kết quả gọi" cho 1 lượt tái khám (item). item=null khi đóng.
  const [callSheet, setCallSheet] = useState<{
    item: RecallItem | null;
    outcome: CallOutcome;
    note: string;
  }>({ item: null, outcome: "scheduled", note: "" });
  const closeCallSheet = () => setCallSheet({ item: null, outcome: "scheduled", note: "" });

  const logRecallMut = useMutation({
    mutationFn: async (input: { orderItemId: number; outcome: CallOutcome; note: string }) => {
      const res = await authFetch(`/api/recalls/item/${input.orderItemId}/log`, {
        method: "POST",
        body: JSON.stringify({ outcome: input.outcome, note: input.note || undefined }),
      });
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã ghi nhận kết quả gọi" });
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] }); // cập nhật badge ở list ngay
      queryClient.invalidateQueries({ queryKey: ["/api/recalls/worklist", getCurrentUserId()] }); // worklist đồng bộ
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", getCurrentUserId()] }); // đếm tái khám trang chủ
      closeCallSheet();
    },
    // Máy chủ trả lý do cụ thể (ví dụ không phụ trách khách này), trước đây bị vứt
    // nên người dùng bấm Lưu mãi mà không biết vì sao hỏng.
    onError: (err: unknown) =>
      toast({
        title: "Không lưu được kết quả gọi",
        description:
          (err as { message?: string })?.message ?? "Kiểm tra mạng rồi bấm Lưu kết quả lần nữa.",
        variant: "destructive",
      }),
  });

  const openCallSheet = (item: RecallItem) =>
    setCallSheet({ item, outcome: "scheduled", note: "" });

  // Nhật ký tương tác mặc định thu gọn, tránh kéo trang dài mấy nghìn pixel.


  // Tên khách đặt cỡ lớn trong thân trang nên không bao giờ bị cắt. Khi người đọc
  // cuộn qua khỏi nó, tên mới hiện lên thanh trên để vẫn biết đang xem ai.
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [titleScrolledOut, setTitleScrolledOut] = useState(false);
  useEffect(() => {
    const el = titleRef.current;
    // Vùng cuộn là khung trong Screen, không phải cửa sổ trình duyệt.
    const root = el?.closest(".scrollbar-hide");
    if (!el || !root) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      // Coi là khuất khi đáy tiêu đề đã chui lên trên mép dưới của thanh.
      const offset = el.getBoundingClientRect().bottom - root.getBoundingClientRect().top;
      setTitleScrolledOut(offset < DETAIL_HEADER_HEIGHT);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    root.addEventListener("scroll", onScroll, { passive: true });
    // Tên dài gom lại hay xuống dòng khi bề rộng khung đổi (xoay máy, kéo cửa
    // sổ), làm đáy tiêu đề dịch chỗ mà không sinh sự kiện cuộn nào. Phải chủ
    // động đo lại, không thì tên kẹt ở trạng thái cũ tới lần cuộn kế tiếp.
    const ro = new ResizeObserver(onScroll);
    ro.observe(el);
    return () => {
      root.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [customerData]);

  const vipMut = useMutation({
    mutationFn: async (isVip: boolean) => {
      const res = await authFetch(`/api/customers/${customerId}/vip`, {
        method: "PATCH",
        body: JSON.stringify({ isVip }),
      });
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: (_data, isVip) => {
      toast({ title: isVip ? "Đã đánh dấu khách VIP" : "Đã bỏ đánh dấu VIP" });
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: () =>
      toast({
        title: "Không cập nhật được nhãn khách VIP",
        description: "Kiểm tra mạng rồi bấm lại nhãn.",
        variant: "destructive",
      }),
  });

  const noteMut = useMutation({
    mutationFn: async (note: string) => {
      const res = await authFetch(`/api/customers/${customerId}/medical-note`, {
        method: "PATCH",
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw await res.json().catch(() => ({}));
      return res.json();
    },
    onSuccess: (_data, note) => {
      // Gõ rỗng rồi Lưu là XOÁ ghi chú (máy chủ đặt về null), báo "đã lưu" thì
      // người dùng tưởng hồ sơ còn nguyên.
      toast({ title: note.trim() ? "Đã lưu ghi chú" : "Đã xóa ghi chú" });
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}`] });
    },
    onError: () =>
      toast({
        title: "Không lưu được ghi chú",
        description: "Nội dung vẫn còn trong hộp soạn, kiểm tra mạng rồi bấm Lưu lần nữa.",
        variant: "destructive",
      }),
  });

  // Ghi nhật ký thao tác gọi/nhắn/email rồi cập nhật timeline.
  const logAction = (type: "call" | "sms" | "email") => {
    authFetch(`/api/customers/${customerId}/events`, {
      method: "POST",
      body: JSON.stringify({ type }),
    })
      .then(() => queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}`] }))
      .catch(() => {});
  };

  // getQueryFn ném Error("404: ...") nên nhận ra bằng tiền tố mã trạng thái.
  const khongTimThayKhach = /^404\b/.test((error as { message?: string })?.message ?? "");

  if (isLoading || !customerData) {
    return (
      <Screen activeTab={active} onTab={onTab} noHeader>
        <DetailHeader title="Khách hàng" onBack={quayLai} trailing={<div />} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-20 text-center">
          {isLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand border-t-transparent" />
          ) : isError ? (
            // Máy chủ trả 404 khi khách không còn. Trước đây gộp chung với lỗi mạng
            // nên người mở đường dẫn của khách đã xóa cứ bị bảo kiểm tra mạng rồi
            // bấm Thử lại mãi không xong. getQueryFn ném Error dạng "404: ...".
            khongTimThayKhach ? (
              <>
                <p className="text-[15px] font-semibold text-np-ink">Không tìm thấy khách hàng</p>
                <p className="text-[13px] text-np-text-muted">
                  Khách này có thể đã bị xóa. Bấm nút quay lại để về danh sách khách.
                </p>
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-np-ink">Không tải được dữ liệu</p>
                <p className="text-[13px] text-np-text-muted">
                  Kiểm tra kết nối mạng rồi bấm Thử lại.
                </p>
                <NPButton tone="ghost" size="sm" onClick={() => refetch()}>
                  Thử lại
                </NPButton>
              </>
            )
          ) : (
            <p className="text-[15px] text-np-text-muted">Không tìm thấy khách hàng</p>
          )}
        </div>
      </Screen>
    );
  }

  const { customer, orders, stats } = customerData;
  const hasNote = (customer.medicalNote ?? "").trim().length > 0;
  // Mục Lịch sử gọi đã in đầy đủ từng lượt gọi nhắc lịch, nên nhật ký tương tác
  // chỉ giữ những việc khác để không kể lại lần thứ ba.
  const otherEvents = customerData.events.filter((e) => e.type !== "recall_call");
  // Mặc định chỉ hiện vài dòng gần nhất, phần còn lại mờ dần rồi ẩn sau nút.

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      {/* Thanh trên chỉ còn hai nút tròn. Tên khách nằm cỡ lớn ngay dưới, chỉ trồi
          lên thanh khi người đọc đã cuộn qua khỏi nó. */}
      <DetailHeader
        title={customer.name}
        titleVisible={titleScrolledOut}
        onBack={quayLai}
      />

      {/* Tiêu đề trang dùng chung PageHeader nên cỡ chữ khớp mọi màn khác */}
      <PageHeader
        titleRef={titleRef}
        title={customer.name}
        // Tên khách không được xuống dòng: nút Tạo đơn nằm cạnh nên cột tiêu đề chỉ
        // còn 240px, mà tên 4 chữ dài nhất ở cỡ 26px cần tới 300px. Hạ về 20px thì
        // tên dài nhất chiếm 228px, còn dư chỗ. truncate là lưới an toàn cho tên lạ.
        titleClassName="truncate text-[20px] tracking-[-0.3px]"
        // Chỉ còn ngày thành khách. Nơi ở đã nằm trong mục Thông tin liên hệ nên bỏ
        // ở đây cho khỏi lặp. Ngày tạo trong cơ sở dữ liệu có thể là chuỗi rỗng,
        // khi đó bỏ luôn dòng phụ chứ không để "Khách hàng từ" cụt lủn.
        subtitle={
          stats.customerSince ? `Khách hàng từ ${stats.customerSince}` : undefined
        }
        className="bg-white"
        action={
          <NPButton
            tone="primary"
            size="sm"
            icon={Plus}
            onClick={() => navigate(`/orders/new?customerId=${customer.id}`)}
            className="flex-shrink-0"
          >
            Tạo đơn
          </NPButton>
        }
      >
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {/* Có ghi chú là thuộc tính, không phải việc ai đó phải xử lý, nên
              neutral. Để attention thì nó trùng hệt nhãn VIP đứng ngay cạnh. */}
          {hasNote && (
            <Badge>
              <StickyNote size={12} />
              Có ghi chú
            </Badge>
          )}
          {/* Chip nhìn thấy chỉ cao 20px cho bằng Badge bên cạnh, nhưng ngón tay cần
              44px mới bấm không trượt. Nên phần đệm nằm ở thẻ button (py-3) rồi bù
              lại bằng lề âm (-my-3): hộp bấm cao 44px mà bố cục không xê dịch.
              Bật dùng tông attention, tắt dùng muted, khớp nhãn VIP ở danh sách
              khách. Vương miện mới là thứ nhận diện, màu chỉ phụ hoạ. */}
          <button
            type="button"
            onClick={() => vipMut.mutate(!customer.isVip)}
            disabled={vipMut.isPending}
            aria-pressed={customer.isVip}
            aria-label={customer.isVip ? "Bỏ đánh dấu khách VIP" : "Đánh dấu khách VIP"}
            className="group -my-3 inline-flex cursor-pointer items-center py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap rounded-np-badge px-2 py-[3px] text-[11px] font-semibold leading-[1.3] tracking-[0.1px] transition-colors",
                // Về đúng hai tông trong hệ: bật là attention, tắt là muted.
                // Trước đây nền vàng đặc với hex #92400E gõ tay, nằm ngoài bộ màu,
                // và chuỗi class thì chép tay từ Badge nên sửa Badge không kéo theo.
                customer.isVip
                  ? "bg-np-badge-attention-bg text-np-badge-attention-fg group-hover:brightness-95"
                  : "bg-np-badge-muted-bg text-np-badge-muted-fg group-hover:brightness-95",
              )}
            >
              <Crown size={13} fill={customer.isVip ? "currentColor" : "none"} />
              {customer.isVip ? "Khách VIP" : "Đánh dấu khách VIP"}
            </span>
          </button>
        </div>
      </PageHeader>

      {/* pt-2.5 + gỡ mt của con đầu: nếu không, lề trên của tiêu đề mục đầu tiên bị
          gộp ra ngoài khối này (margin collapsing) nên mục đầu mất dải xám ngăn cách
          trong khi mọi mục sau đều có. */}
      <div className="min-h-full flow-root bg-np-bg">

        {/* Hai số liệu tách thành hai khối riêng, ngăn nhau bằng dải nền, thay vì
            xếp chung một danh sách. Nhãn kèm luôn mốc thời gian vì mục không còn
            tiêu đề để nói giúp. */}
        <Card>
          <Row
            title={
              <HintLabel hint={`Tổng chi tiêu trong ${stats.statsMonths} tháng gần nhất, không tính đơn đã hủy`}>
                Chi tiêu
              </HintLabel>
            }
            trailing={
              <span className="text-[15px] font-semibold text-np-ink tabular-nums">
                {fmtVND(stats.totalSpent)}
              </span>
            }
            last
          />
        </Card>
        <Card className="mt-2.5">
          <Row
            title={
              <HintLabel hint={`Tổng số đơn trong ${stats.statsMonths} tháng gần nhất, không tính đơn đã hủy`}>
                Số đơn
              </HintLabel>
            }
            trailing={
              <span className="text-[15px] font-semibold text-np-ink tabular-nums">
                {stats.orderCount} đơn
              </span>
            }
            last
          />
        </Card>

        {/* Thông tin liên hệ gộp luôn các nút liên lạc: số điện thoại và email nằm
            trong hộp chi tiết, mở ra mới thấy giá trị kèm việc làm được với nó.
            Nhờ vậy hàng nút và mục liên hệ không còn là hai chỗ rời nói cùng một
            chuyện. Mục này đứng ngay đầu trang vì gọi khách là việc hay làm nhất. */}
        <SectionTitle>Thông tin liên hệ</SectionTitle>
        <Card className="space-y-3.5 px-4 py-3.5">
          <ContactActions phone={customer.phone} email={customer.email} customerId={customer.id} />
          <div>
            <div className="text-[12px] font-medium text-np-text-muted">Địa chỉ</div>
            <div className="mt-0.5 text-[15px] leading-[1.45] text-np-ink">
              {[customer.address, customer.location].filter(Boolean).join(", ") ||
                "Chưa cập nhật"}
            </div>
          </div>
        </Card>

        {/* Lịch tái khám — danh sách từng lượt order_item (database), gọi như màn /recalls.
            Đặt TRÊN thông tin liên hệ: cảnh báo trễ tái khám là việc cần xử lý ngay. */}
        <SectionTitle>Lịch tái khám</SectionTitle>
        <RecallSection
          items={customerData.recallItems}
          logs={customerData.recallLogs}
          onCall={openCallSheet}
        />

        {/* Lịch sử khám bệnh — chờ API HIS */}
        <SectionTitle>Lịch sử khám bệnh</SectionTitle>
        <MedicalHistorySection customerId={customerId} />
        {/* Ghi chú bệnh nhân: dị ứng thuốc, tiền sử bệnh, lưu ý khi chăm sóc.
            Dùng mẫu chung của app, xem tại chỗ và sửa trong hộp riêng. */}
        <NoteSection
          value={customer.medicalNote ?? ""}
          placeholder="Dị ứng thuốc, tiền sử bệnh, lưu ý khi chăm sóc"
          saving={noteMut.isPending}
          onSave={(note) => noteMut.mutateAsync(note)}
        />

        {/* Lịch sử tương tác — nhật ký hành động tự ghi nhận (ADR-003).
            Bỏ sự kiện gọi nhắc lịch: mục Lịch sử gọi ngay phía trên đã in đủ từng
            lượt kèm dịch vụ, ghi chú và người gọi, nên để lại đây là kể lần thứ ba
            cùng một việc. */}
        <SectionTitle>Lịch sử tương tác</SectionTitle>
        <ActivityLog
          entries={otherEvents.map((e) => {
            const orderCode = e.orderId
              ? customerData.orders.find((o) => o.id === e.orderId)?.code
              : undefined;
            const v = eventView(e, orderCode);
            return {
              id: e.id,
              at: e.createdAt,
              actor: e.actorName ?? "Hệ thống",
              action: v.action,
              detail: v.detail,
            };
          })}
          preview={EVENT_PREVIEW}
          moreTitle="Lịch sử tương tác"
        />

        {/* Đơn hàng. Không đặt nút tạo đơn ở đây: hàng tác vụ phía trên đã có, và
            bản ở đây quên kèm mã khách nên người dùng phải chọn lại khách. */}
        <SectionTitle>Đơn hàng</SectionTitle>
        <Card className="overflow-hidden p-0">
          {orders.length === 0 ? (
            <EmptyBlock>Chưa có đơn hàng nào</EmptyBlock>
          ) : (
            orders.map((o, i) => (
              <Row
                key={o.id}
                onClick={() => navigate(`/orders/${o.id}`)}
                title={o.code}
                subtitle={
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={13} strokeWidth={2.25} className="flex-shrink-0" />
                    {o.createdAt.split(" ")[0]}
                  </span>
                }
                meta={
                  <div className="mt-1">
                    <OrderStatusBadges
                      appointmentStatus={o.appointmentStatus}
                      visitStatus={o.visitStatus}
                      refundType={o.refundType}
                    />
                  </div>
                }
                trailing={
                  <div className="flex-shrink-0 text-right text-[15px] font-semibold text-np-ink tabular-nums">
                    {fmtVND(o.totalPrice)}
                  </div>
                }
                last={i === orders.length - 1}
              />
            ))
          )}
        </Card>

      </div>

      {/* Kết quả gọi 1 lượt tái khám (giống màn /recalls) */}
      <CallResultSheet
        open={!!callSheet.item}
        onClose={closeCallSheet}
        customerId={customer.id}
        customerName={customer.name}
        phone={customer.phone}
        serviceName={callSheet.item?.serviceName ?? ""}
        saving={logRecallMut.isPending}
        onSave={({ outcome, note }) =>
          callSheet.item &&
          logRecallMut.mutate({ orderItemId: callSheet.item.orderItemId, outcome, note })
        }
      />
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────
// RecallSection — B4 R-8-5 + R-8-6
// ─────────────────────────────────────────────────────────────────

function RecallSection({
  items,
  logs,
  onCall,
}: {
  items: RecallItem[];
  logs: RecallLogEntry[];
  onCall: (item: RecallItem) => void;
}) {
  // Tên dịch vụ theo orderItemId — để gắn vào dòng lịch sử gọi (đa lượt).
  const serviceByItem = new Map(items.map((it) => [it.orderItemId, it.serviceName]));

  if (items.length === 0 && logs.length === 0) {
    return (
      <Card>
        <EmptyBlock>Chưa có lịch tái khám</EmptyBlock>
      </Card>
    );
  }

  return (
    <>
      {/* Một khối trắng liền, các lượt ngăn nhau bằng vạch mảnh. Trước đây mỗi lượt
          là một thẻ rời trôi trên nền xám, đọc như nhiều mục riêng biệt chứ không
          phải một danh sách. */}
      <Card>
      {items.map((it, i) => {
        const label = timeLabel(daysOverdue(it.recallDueDate));
        const statusChip =
          it.recallStatus === "scheduled"
            ? { text: RECALL_OUTCOME_LABEL.scheduled, tone: "success" as BadgeTone }
            : it.recallStatus === "refused"
              // Khách từ chối tái khám là mất doanh thu, không phải nhãn thường.
              ? { text: "Khách từ chối", tone: "critical" as BadgeTone }
              : null;
        return (
          <div
            key={it.orderItemId}
            className={cn(
              "px-4 py-3.5",
              !(i === items.length - 1 && logs.length === 0) &&
                "np-divider",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold text-np-ink">
                    {it.serviceName || "Dịch vụ tái khám"}
                  </span>
                  {/* Lượt chưa xử lý: nhãn thời gian; đã xử lý: nhãn trạng thái */}
                  {statusChip ? (
                    <Badge tone={statusChip.tone}>{statusChip.text}</Badge>
                  ) : (
                    <Badge tone={label.tone}>{label.text}</Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[13px] text-np-text-sub">
                  <Calendar size={14} strokeWidth={2.25} className="flex-shrink-0" />
                  Hẹn {fmtRecallDate(it.recallDueDate)}
                </div>
                {/* Khi nhãn phía trên đã nói kết quả gọi thì đây chỉ ghi thời điểm,
                    không lặp lại đúng chữ đó lần thứ hai cách nhau 20px. */}
                {it.lastCall && (
                  <div className="mt-0.5 text-[13px] text-np-text-sub">
                    {statusChip
                      ? `Đã gọi ${fmtCallTime(it.lastCall.at)}`
                      : `${RECALL_OUTCOME_LABEL[it.lastCall.outcome as RecallOutcome] ?? it.lastCall.outcome}${
                          fmtCallTime(it.lastCall.at) ? ` · ${fmtCallTime(it.lastCall.at)}` : ""
                        }`}
                  </div>
                )}
              </div>
              <NPButton
                tone="primary"
                size="sm"
                onClick={() => onCall(it)}
                className="flex-shrink-0 self-center"
              >
                Hành động
              </NPButton>
            </div>
          </div>
        );
      })}

      {/* Lịch sử gọi không nằm thẳng trong mục nữa: 9 lượt gọi đổ ra tại chỗ làm
          mục Tái khám dài gấp mấy lần phần cần nhìn. Nay chỉ còn một nút, cần tra
          mới mở. */}
      {logs.length > 0 && (
        <div className="border-t border-np-surface-pressed">
          <ActivityLog
            entries={logs.map((log) => callEntry(log, serviceByItem.get(log.orderItemId)))}
            preview={LOG_PREVIEW}
            moreLabel={`Xem lịch sử gọi (${logs.length})`}
            moreTitle={`Lịch sử gọi (${logs.length})`}
          />
        </div>
      )}
      </Card>

    </>
  );
}

/**
 * Lịch sử khám bệnh lấy từ HIS. HIS chưa sẵn sàng nên chỉ dựng khung: bấm nút mới
 * tải, tránh gọi sang HIS mỗi lần mở trang và không lưu bệnh án trong app.
 *
 * Khi HIS xong: thay khối rỗng bằng useQuery gọi endpoint HIS rồi map vào chỗ
 * đánh dấu bên dưới, giao diện giữ nguyên.
 */
function MedicalHistorySection({ customerId }: { customerId: number }) {
  const [opened, setOpened] = useState(false);
  // Khi nối HIS: const { data, isLoading } = useQuery({ queryKey: [`/api/his/medical-history/${customerId}`], enabled: opened });
  const records: { id: string; date: string; title: string; detail: string }[] = [];

  if (!opened) {
    return (
      <Card className="px-4 py-3.5">
        <NPButton
          tone="ghost"
          size="sm"
          icon={MedicalServices}
          onClick={() => setOpened(true)}
          className="w-full justify-center"
        >
          Xem lịch sử khám bệnh
        </NPButton>
      </Card>
    );
  }

  return (
    <Card>
      {records.length === 0 ? (
        <EmptyBlock>Chưa nối hệ thống bệnh án</EmptyBlock>
      ) : (
        // Chỗ đổ dữ liệu HIS khi nối xong.
        records.map((r, i) => (
          <div
            key={r.id}
            className={cn("px-4 py-3.5", i !== records.length - 1 && "np-divider")}
          >
            <div className="text-[15px] font-semibold text-np-ink">{r.title}</div>
            <div className="mt-0.5 text-[12px] text-np-text-muted">{r.date}</div>
            <div className="mt-0.5 text-[13px] text-np-text-sub">{r.detail}</div>
          </div>
        ))
      )}
    </Card>
  );
}

/** Một lượt gọi tái khám. Dùng chung cho bản hé xem trong mục và hộp xem đầy đủ. */
/**
 * Một lượt gọi tái khám viết thành câu cho nhật ký chung: kết quả gọi nằm trong
 * phần chữ đậm vì đó là thứ người dùng dò, ghi chú đẩy xuống phần nhạt.
 */
function callEntry(log: RecallLogEntry, serviceName?: string): ActivityEntry {
  const ketQua = RECALL_OUTCOME_LABEL[log.outcome as RecallOutcome] ?? log.outcome;
  return {
    id: log.id,
    at: log.createdAt,
    actor: log.actorName,
    action: `gọi ${serviceName ?? "tái khám"}, ${ketQua.charAt(0).toLowerCase()}${ketQua.slice(1)}`,
    // Ghi chú là chữ người dùng tự gõ, đứng sau dấu chấm nên hoa chữ đầu cho liền câu.
    detail: log.note ? log.note.charAt(0).toUpperCase() + log.note.slice(1) : undefined,
  };
}

/** Khối rỗng dùng chung cho mọi mục, để bốn chỗ rỗng không ra bốn kiểu khác nhau. */
function EmptyBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-8 text-center text-[13px] text-np-text-muted">{children}</div>
  );
}

