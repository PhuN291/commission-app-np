/**
 * Dịch một dòng nhật ký thành câu tiếng Việt, dùng chung cho màn chi tiết khách
 * và màn chi tiết đơn.
 *
 * Vì sao tách ra khỏi trang: hai màn cùng đọc bảng customer_events, để mỗi màn
 * tự viết câu thì cùng một sự kiện lại kể hai kiểu, mà sửa chữ phải nhớ sửa hai
 * chỗ. Vì sao KHÔNG đặt trong np/activity-log.tsx: file đó là thành phần giao
 * diện dùng chung, đang phục vụ cả nhật ký gọi tái khám, nhét từ vựng nghiệp vụ
 * đơn hàng vào là làm bẩn thư viện giao diện.
 *
 * Chuỗi hiển thị cố ý nằm ở client chứ không ở máy chủ: app này từng rải chữ
 * người dùng thấy khắp cả server lẫn shared lẫn client, rà lại một đợt copy là
 * phải quét ba nơi.
 */

import {
  APPOINTMENT_STATUSES,
  VISIT_STATUSES,
  type AppointmentStatusCode,
  type VisitStatusCode,
} from "@shared/status";
import { RECALL_OUTCOME_LABEL, type RecallOutcome } from "@shared/types";

/** Một dòng nhật ký lấy về từ máy chủ. */
export type ActivityEvent = {
  id: number | string;
  type: string;
  actorName: string | null;
  orderId?: number | null;
  meta: {
    code?: string;
    serviceName?: string;
    tier?: string;
    fromStatus?: string;
    toStatus?: string;
    outcome?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    /** Ghi chú kèm theo lần đổi trạng thái, chỉ status_logs mới có. */
    note?: string | null;
    /** Các chỗ phụ trách vừa đổi, khoá là tên cột trong bảng orders. */
    assignees?: Record<string, number | null>;
  } | null;
  createdAt: string;
};

/**
 * Tên cột phụ trách trong bảng orders → chữ người dùng đọc.
 *
 * Màn chi tiết đơn đọc luôn bảng này cho nhãn ba dòng Phụ trách, nên câu nhật ký
 * và nhãn trên màn không thể lệch nhau.
 */
export const PHU_TRACH_LABEL: Record<string, string> = {
  indicatedByUserId: "Chỉ định",
  performedByUserId: "Thực hiện",
  saleUserId: "Tư vấn",
};

/**
 * Chữ trạng thái đọc thẳng từ nguồn dùng chung. Trước đây mỗi màn tự khai một
 * bảng riêng nên cùng một đơn, dòng nhật ký ghi "Hoàn tất" còn nhãn ngay dưới
 * ghi "Hoàn thành". Hai tầng dùng chung mã `arrived` và `cancelled` với nghĩa
 * khác nhau, nên phải xem `tier` mới tra đúng bảng.
 */
export function statusLabel(code: string | undefined, tier: string | undefined): string {
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

type TuyChon = {
  /** Mã đơn tra được từ nơi gọi, dùng khi meta không mang sẵn. */
  orderCode?: string;
  /**
   * Đang đứng trong trang của chính đơn đó. Bật lên thì câu bỏ mã đơn đi: đứng
   * trong đơn #NP01 mà dòng nào cũng đuôi "#NP01" là thừa và làm câu dài ra.
   */
  trongDon?: boolean;
};

/**
 * Một dòng nhật ký viết như một câu: "Phú Nguyễn gọi điện". Nên `action` luôn bắt
 * đầu bằng động từ thường, phần tên người đứng trước do nơi hiển thị ghép vào.
 */
export function eventView(
  e: ActivityEvent,
  opts: TuyChon = {},
): { action: string; detail: string | null } {
  const m = e.meta ?? {};
  const code = opts.trongDon ? undefined : (opts.orderCode ?? m.code);
  switch (e.type) {
    case "call":
      return { action: "gọi điện", detail: null };
    case "sms":
      return { action: "nhắn tin", detail: null };
    case "email":
      return { action: "gửi email", detail: null };
    case "note_updated":
      return { action: code ? `cập nhật ghi chú đơn ${code}` : "cập nhật ghi chú", detail: null };
    case "note_cleared":
      return { action: code ? `xóa ghi chú đơn ${code}` : "xóa ghi chú", detail: null };
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
      // Ghi chú của người thao tác đi sau mũi tên trạng thái, ví dụ lý do hủy.
      const buoc = from && to ? `${from} → ${to}` : null;
      const ghiChu = m.note?.trim() || null;
      return {
        action: code ? `cập nhật ${what} ${code}` : `cập nhật ${what}`,
        detail: [buoc, ghiChu].filter(Boolean).join(". ") || null,
      };
    }
    case "recall_call":
      return {
        action: "gọi nhắc lịch",
        detail: m.outcome ? (RECALL_OUTCOME_LABEL[m.outcome as RecallOutcome] ?? null) : null,
      };
    default:
      // Loại sự kiện chưa có nhãn: nói chung chung, không để lộ mã tiếng Anh.
      return { action: "có hoạt động", detail: null };
  }
}
