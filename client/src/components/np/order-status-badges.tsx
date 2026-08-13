import {
  APPOINTMENT_STATUSES,
  VISIT_STATUSES,
  type AppointmentStatusCode,
  type VisitStatusCode,
} from "@shared/status";
import type { CRStatus } from "@shared/types";
import { Badge, type BadgeTone } from "./badge";

/**
 * Trạng thái lịch hẹn ứng với tông nào.
 *
 * Nguyên tắc phân nhóm: màu trả lời câu hỏi "tôi có phải làm gì không", không
 * phải "đơn này đang ở bước mấy". Ba bước đang chạy trơn tru (đã xác nhận, đã
 * nhắc, đã đến) cùng dùng info vì với người trực chúng giống nhau: không phải
 * làm gì thêm. Chữ trên badge lo phần phân biệt chi tiết.
 *
 * Trước đây cả ba bước đó VÀ đơn đã hủy đều dùng neutral, nên đơn chết nhìn y
 * hệt đơn đang chạy, quét danh sách không lọc được bằng mắt.
 */
export const APPT_TONE: Record<AppointmentStatusCode, BadgeTone> = {
  pending: "attention", // chờ ai đó xác nhận
  confirmed: "info",
  reminded: "info",
  arrived: "info",
  no_show: "critical", // khách không tới, mất chỗ
  cancelled: "muted", // đã đóng, cho chìm xuống
  rescheduled: "attention", // phải xếp lại lịch
};

export const VISIT_TONE: Record<VisitStatusCode, BadgeTone> = {
  arrived: "attention", // chờ khám, đang đợi người gọi vào
  in_progress: "info",
  completed: "success",
  cancelled: "critical", // khách bỏ về giữa chừng
};

/**
 * Trạng thái bản ghi hoa hồng ứng với tông nào.
 *
 * Trước đây hai màn Thu nhập và Chi tiết đơn mỗi màn chép một chuỗi ternary y hệt
 * nhau, cùng ép kiểu `as any` nên TypeScript không bắt được tên tông sai, và cùng
 * để nhánh mặc định là neutral khiến "Chờ duyệt" nhìn như nhãn vô trạng thái.
 */
export const CR_TONE: Record<CRStatus, BadgeTone> = {
  TAM_TINH: "neutral", // mới tính nháp, chưa vào quy trình
  CHO_DUYET: "info", // đang chạy, chờ kế toán duyệt
  DUOC_DUYET: "success",
  TU_CHOI: "critical",
  KHIEU_NAI: "attention", // cần người xử lý khiếu nại
  CLAWBACK_PENDING: "attention", // sắp bị truy thu, cần theo dõi
  CANCEL: "muted", // đã đóng lại
};

type OrderStatusBadgesProps = {
  appointmentStatus?: string;
  visitStatus?: string | null;
  /** 'none' | 'partial' | 'full'. Khác 'none' thì thêm nhãn Hoàn tiền. */
  refundType?: string | null;
};

/**
 * Bộ nhãn trạng thái của một đơn, dùng chung ở danh sách đơn, chi tiết đơn và
 * chi tiết khách.
 *
 * Đơn có hoàn tiền chỉ thêm một nhãn đỏ, KHÔNG dựng khối cảnh báo riêng: số tiền
 * hoàn đã nằm sẵn ở phần Tổng cộng, khối cảnh báo chỉ nói lại đúng thứ đó bằng
 * chữ to. Không tách hoàn một phần với hoàn toàn phần thành hai nhãn: đọc số tiền
 * ở phần Tổng cộng là rõ, hai nhãn gần giống nhau chỉ tổ phải căng mắt phân biệt.
 */
export function OrderStatusBadges({
  appointmentStatus,
  visitStatus,
  refundType,
}: OrderStatusBadgesProps) {
  const a = appointmentStatus
    ? APPOINTMENT_STATUSES[appointmentStatus as AppointmentStatusCode]
    : null;
  const v = visitStatus ? VISIT_STATUSES[visitStatus as VisitStatusCode] : null;
  const apptTone = appointmentStatus ? APPT_TONE[appointmentStatus as AppointmentStatusCode] : "neutral";
  const visitTone = visitStatus ? VISIT_TONE[visitStatus as VisitStatusCode] : "neutral";
  return (
    <div className="inline-flex flex-wrap gap-1">
      {a && <Badge tone={apptTone ?? "neutral"}>{a.label}</Badge>}
      {v && <Badge tone={visitTone ?? "neutral"}>{v.label}</Badge>}
      {refundType && refundType !== "none" && <Badge tone="critical">Hoàn tiền</Badge>}
    </div>
  );
}
