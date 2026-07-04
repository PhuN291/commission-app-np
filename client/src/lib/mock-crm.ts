export interface CustomerTag {
  name: string;
  bgActive: string;
  textActive: string;
  bgInactive: string;
  textInactive: string;
  borderInactive: string;
}

export const AVAILABLE_TAGS: CustomerTag[] = [
  { name: "VIP", bgActive: "#bbe5b3", textActive: "#008060", bgInactive: "transparent", textInactive: "#008060", borderInactive: "#bbe5b3" },
  { name: "Tiềm năng", bgActive: "#b4e1fa", textActive: "#005bd3", bgInactive: "transparent", textInactive: "#005bd3", borderInactive: "#b4e1fa" },
  { name: "Cần tái khám", bgActive: "#ffd6a4", textActive: "#8a6116", bgInactive: "transparent", textInactive: "#8a6116", borderInactive: "#ffd6a4" },
  { name: "Đã giới thiệu người khác", bgActive: "#e3d0ff", textActive: "#6d28d9", bgInactive: "transparent", textInactive: "#6d28d9", borderInactive: "#e3d0ff" },
  { name: "Khó tính", bgActive: "#fead9a", textActive: "#8a1c1c", bgInactive: "transparent", textInactive: "#8a1c1c", borderInactive: "#fead9a" },
];

export const CUSTOMER_TAGS: Record<number, string[]> = {
  1: ["VIP", "Đã giới thiệu người khác"],
  2: ["Tiềm năng"],
  3: ["Cần tái khám", "Khó tính"],
  4: ["VIP"],
  5: ["Tiềm năng", "Cần tái khám"],
  6: ["VIP", "Đã giới thiệu người khác"],
  7: ["Tiềm năng"],
  8: ["Cần tái khám"],
};

export type InteractionType = "Gọi điện" | "Nhắn tin" | "Gặp trực tiếp" | "Khám xong";

export interface InteractionEntry {
  id: number;
  date: string;
  type: InteractionType;
  note: string;
  performer: string;
}

export const CUSTOMER_INTERACTIONS: Record<number, InteractionEntry[]> = {
  1: [
    { id: 101, date: "05/03/2026 14:30", type: "Gọi điện", note: "Hỏi thăm sau khám tổng quát. Khách hài lòng với kết quả.", performer: "Nguyễn Thị Mai" },
    { id: 102, date: "03/03/2026 09:15", type: "Khám xong", note: "Hoàn tất nội soi tiêu hóa. Kết quả bình thường.", performer: "BS. Trần Hữu Đạt" },
    { id: 103, date: "28/02/2026 16:00", type: "Nhắn tin", note: "Gửi lịch hẹn khám nội soi qua Zalo.", performer: "Nguyễn Thị Mai" },
    { id: 104, date: "25/02/2026 10:00", type: "Gặp trực tiếp", note: "Tư vấn gói khám tổng quát Kim cương. Khách đồng ý đặt lịch.", performer: "Nguyễn Thị Mai" },
  ],
  2: [
    { id: 201, date: "04/03/2026 11:00", type: "Nhắn tin", note: "Nhắc lịch tái khám theo định kỳ. Khách xác nhận.", performer: "Nguyễn Thị Mai" },
    { id: 202, date: "01/03/2026 08:30", type: "Gọi điện", note: "Tư vấn gói khám sức khỏe nữ giới. Khách cần suy nghĩ thêm.", performer: "Nguyễn Thị Mai" },
    { id: 203, date: "20/02/2026 14:00", type: "Khám xong", note: "Hoàn tất xét nghiệm chức năng gan. Chỉ số bình thường.", performer: "BS. Phạm Quốc Bảo" },
  ],
  3: [
    { id: 301, date: "02/03/2026 15:30", type: "Gọi điện", note: "Khách hỏi về kết quả xét nghiệm. Đã gửi qua email.", performer: "Nguyễn Thị Mai" },
    { id: 302, date: "27/02/2026 09:00", type: "Khám xong", note: "Xét nghiệm chất gây nghiện. Cần tái khám sau 1 tháng.", performer: "BS. Trần Hữu Đạt" },
    { id: 303, date: "25/02/2026 16:45", type: "Gặp trực tiếp", note: "Khách đến làm xét nghiệm. Khó chịu với thời gian chờ.", performer: "Nguyễn Thị Mai" },
    { id: 304, date: "20/02/2026 10:30", type: "Nhắn tin", note: "Gửi thông tin chuẩn bị trước khi xét nghiệm.", performer: "Nguyễn Thị Mai" },
    { id: 305, date: "15/02/2026 11:00", type: "Gọi điện", note: "Tư vấn dịch vụ xét nghiệm. Khách đặt lịch hẹn.", performer: "Nguyễn Thị Mai" },
  ],
  4: [
    { id: 401, date: "04/03/2026 10:00", type: "Gọi điện", note: "Hỏi thăm sức khỏe sau khám. Khách rất hài lòng.", performer: "Nguyễn Thị Mai" },
    { id: 402, date: "28/02/2026 14:30", type: "Khám xong", note: "Khám sức khỏe nữ giới gói Vàng. Mọi chỉ số tốt.", performer: "BS. Phạm Quốc Bảo" },
    { id: 403, date: "22/02/2026 09:00", type: "Gặp trực tiếp", note: "Khách VIP đến khám định kỳ. Tiếp đón ưu tiên.", performer: "Nguyễn Thị Mai" },
  ],
  5: [
    { id: 501, date: "01/03/2026 13:00", type: "Nhắn tin", note: "Gửi kết quả xét nghiệm qua Zalo. Khách đã nhận.", performer: "Nguyễn Thị Mai" },
    { id: 502, date: "25/02/2026 08:00", type: "Khám xong", note: "Khám tiền hôn nhân. Cần bổ sung xét nghiệm Lupus.", performer: "BS. Trần Hữu Đạt" },
    { id: 503, date: "20/02/2026 15:00", type: "Gọi điện", note: "Tư vấn gói khám tiền hôn nhân cho cặp đôi.", performer: "Nguyễn Thị Mai" },
  ],
  6: [
    { id: 601, date: "05/03/2026 09:30", type: "Gặp trực tiếp", note: "Khách VIP đến tái khám. Giới thiệu thêm 2 người bạn.", performer: "Nguyễn Thị Mai" },
    { id: 602, date: "01/03/2026 11:00", type: "Khám xong", note: "Tầm soát tim mạch chuyên sâu. Kết quả bình thường.", performer: "BS. Trần Hữu Đạt" },
    { id: 603, date: "25/02/2026 14:00", type: "Gọi điện", note: "Đặt lịch tầm soát tim mạch. Khách chọn gói cao nhất.", performer: "Nguyễn Thị Mai" },
    { id: 604, date: "20/02/2026 10:00", type: "Nhắn tin", note: "Gửi chương trình khuyến mãi tháng 3.", performer: "Nguyễn Thị Mai" },
  ],
  7: [
    { id: 701, date: "03/03/2026 16:00", type: "Gọi điện", note: "Hỏi thăm sau khám tiền hôn nhân. Khách hài lòng.", performer: "Nguyễn Thị Mai" },
    { id: 702, date: "22/02/2026 10:30", type: "Khám xong", note: "Khám tiền hôn nhân cho cặp đôi. Kết quả tốt.", performer: "BS. Phạm Quốc Bảo" },
    { id: 703, date: "15/02/2026 09:00", type: "Gặp trực tiếp", note: "Tư vấn gói khám tiền hôn nhân. Khách đặt lịch ngay.", performer: "Nguyễn Thị Mai" },
  ],
  8: [
    { id: 801, date: "02/03/2026 11:00", type: "Nhắn tin", note: "Gửi nhắc lịch tái khám kiểm tra chức năng gan.", performer: "Nguyễn Thị Mai" },
    { id: 802, date: "25/02/2026 08:00", type: "Khám xong", note: "Kiểm tra chức năng gan. Chỉ số men gan cao, cần theo dõi.", performer: "BS. Phạm Quốc Bảo" },
    { id: 803, date: "20/02/2026 14:30", type: "Gọi điện", note: "Tư vấn dịch vụ kiểm tra chức năng gan.", performer: "Nguyễn Thị Mai" },
  ],
};

export type ReminderStatus = "upcoming" | "overdue" | "done";

export interface Reminder {
  id: number;
  content: string;
  dueDate: string;
  status: ReminderStatus;
}

export const CUSTOMER_REMINDERS: Record<number, Reminder[]> = {
  1: [
    { id: 1001, content: "Gọi hỏi thăm sau khám nội soi", dueDate: "10/03/2026", status: "upcoming" },
  ],
  2: [
    { id: 1002, content: "Nhắc lịch tái khám định kỳ", dueDate: "15/03/2026", status: "upcoming" },
  ],
  3: [
    { id: 1003, content: "Gọi hỏi thăm sau khám - hạn 28/02/2026", dueDate: "28/02/2026", status: "overdue" },
    { id: 1004, content: "Nhắc tái khám xét nghiệm sau 1 tháng", dueDate: "27/03/2026", status: "upcoming" },
  ],
  4: [
    { id: 1005, content: "Gửi kết quả khám chi tiết qua email", dueDate: "01/03/2026", status: "done" },
  ],
  5: [
    { id: 1006, content: "Nhắc bổ sung xét nghiệm Lupus", dueDate: "05/03/2026", status: "overdue" },
  ],
  6: [
    { id: 1007, content: "Cảm ơn và gửi quà khách VIP giới thiệu", dueDate: "08/03/2026", status: "upcoming" },
  ],
  7: [
    { id: 1008, content: "Hỏi thăm về kế hoạch cưới, tư vấn thêm dịch vụ", dueDate: "20/03/2026", status: "upcoming" },
  ],
  8: [
    { id: 1009, content: "Gọi nhắc tái khám kiểm tra men gan", dueDate: "25/03/2026", status: "upcoming" },
    { id: 1010, content: "Gửi hướng dẫn chế độ ăn cho người men gan cao", dueDate: "02/03/2026", status: "overdue" },
  ],
};

/**
 * @deprecated Use `Customer.nextRecallDueAt <= now` (B4 R-8-5).
 * Filter "Cần follow-up" trong customers.tsx đã chuyển sang real field.
 */
export const FOLLOW_UP_CUSTOMER_IDS: number[] = [];

/**
 * @deprecated "Khách rớt" mock — bỏ khỏi UI customers.tsx.
 */
export const NEW_THIS_MONTH_IDS: number[] = [];
