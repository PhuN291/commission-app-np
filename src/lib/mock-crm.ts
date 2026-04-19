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
  { name: "Tiem nang", bgActive: "#b4e1fa", textActive: "#005bd3", bgInactive: "transparent", textInactive: "#005bd3", borderInactive: "#b4e1fa" },
  { name: "Can tai kham", bgActive: "#ffd6a4", textActive: "#8a6116", bgInactive: "transparent", textInactive: "#8a6116", borderInactive: "#ffd6a4" },
  { name: "Da gioi thieu nguoi khac", bgActive: "#e3d0ff", textActive: "#6d28d9", bgInactive: "transparent", textInactive: "#6d28d9", borderInactive: "#e3d0ff" },
  { name: "Kho tinh", bgActive: "#fead9a", textActive: "#8a1c1c", bgInactive: "transparent", textInactive: "#8a1c1c", borderInactive: "#fead9a" },
];

export const CUSTOMER_TAGS: Record<number, string[]> = {
  1: ["VIP", "Da gioi thieu nguoi khac"],
  2: ["Tiem nang"],
  3: ["Can tai kham", "Kho tinh"],
  4: ["VIP"],
  5: ["Tiem nang", "Can tai kham"],
  6: ["VIP", "Da gioi thieu nguoi khac"],
  7: ["Tiem nang"],
  8: ["Can tai kham"],
};

export type InteractionType = "Goi dien" | "Nhan tin" | "Gap truc tiep" | "Kham xong";

export interface InteractionEntry {
  id: number;
  date: string;
  type: InteractionType;
  note: string;
  performer: string;
}

export const CUSTOMER_INTERACTIONS: Record<number, InteractionEntry[]> = {
  1: [
    { id: 101, date: "05/03/2026 14:30", type: "Goi dien", note: "Hoi tham sau kham tong quat. Khach hai long voi ket qua.", performer: "Nguyen Thi Mai" },
    { id: 102, date: "03/03/2026 09:15", type: "Kham xong", note: "Hoan tat noi soi tieu hoa. Ket qua binh thuong.", performer: "BS. Tran Huu Dat" },
    { id: 103, date: "28/02/2026 16:00", type: "Nhan tin", note: "Gui lich hen kham noi soi qua Zalo.", performer: "Nguyen Thi Mai" },
    { id: 104, date: "25/02/2026 10:00", type: "Gap truc tiep", note: "Tu van goi kham tong quat Kim cuong. Khach dong y dat lich.", performer: "Nguyen Thi Mai" },
  ],
  2: [
    { id: 201, date: "04/03/2026 11:00", type: "Nhan tin", note: "Nhac lich tai kham theo dinh ky. Khach xac nhan.", performer: "Nguyen Thi Mai" },
    { id: 202, date: "01/03/2026 08:30", type: "Goi dien", note: "Tu van goi kham suc khoe nu gioi. Khach can suy nghi them.", performer: "Nguyen Thi Mai" },
    { id: 203, date: "20/02/2026 14:00", type: "Kham xong", note: "Hoan tat xet nghiem chuc nang gan. Chi so binh thuong.", performer: "BS. Pham Quoc Bao" },
  ],
  3: [
    { id: 301, date: "02/03/2026 15:30", type: "Goi dien", note: "Khach hoi ve ket qua xet nghiem. Da gui qua email.", performer: "Nguyen Thi Mai" },
    { id: 302, date: "27/02/2026 09:00", type: "Kham xong", note: "Xet nghiem chat gay nghien. Can tai kham sau 1 thang.", performer: "BS. Tran Huu Dat" },
    { id: 303, date: "25/02/2026 16:45", type: "Gap truc tiep", note: "Khach den lam xet nghiem. Kho chiu voi thoi gian cho.", performer: "Nguyen Thi Mai" },
    { id: 304, date: "20/02/2026 10:30", type: "Nhan tin", note: "Gui thong tin chuan bi truoc khi xet nghiem.", performer: "Nguyen Thi Mai" },
    { id: 305, date: "15/02/2026 11:00", type: "Goi dien", note: "Tu van dich vu xet nghiem. Khach dat lich hen.", performer: "Nguyen Thi Mai" },
  ],
  4: [
    { id: 401, date: "04/03/2026 10:00", type: "Goi dien", note: "Hoi tham suc khoe sau kham. Khach rat hai long.", performer: "Nguyen Thi Mai" },
    { id: 402, date: "28/02/2026 14:30", type: "Kham xong", note: "Kham suc khoe nu gioi goi Vang. Moi chi so tot.", performer: "BS. Pham Quoc Bao" },
    { id: 403, date: "22/02/2026 09:00", type: "Gap truc tiep", note: "Khach VIP den kham dinh ky. Tiep don uu tien.", performer: "Nguyen Thi Mai" },
  ],
  5: [
    { id: 501, date: "01/03/2026 13:00", type: "Nhan tin", note: "Gui ket qua xet nghiem qua Zalo. Khach da nhan.", performer: "Nguyen Thi Mai" },
    { id: 502, date: "25/02/2026 08:00", type: "Kham xong", note: "Kham tien hon nhan. Can bo sung xet nghiem Lupus.", performer: "BS. Tran Huu Dat" },
    { id: 503, date: "20/02/2026 15:00", type: "Goi dien", note: "Tu van goi kham tien hon nhan cho cap doi.", performer: "Nguyen Thi Mai" },
  ],
  6: [
    { id: 601, date: "05/03/2026 09:30", type: "Gap truc tiep", note: "Khach VIP den tai kham. Gioi thieu them 2 nguoi ban.", performer: "Nguyen Thi Mai" },
    { id: 602, date: "01/03/2026 11:00", type: "Kham xong", note: "Tam soat tim mach chuyen sau. Ket qua binh thuong.", performer: "BS. Tran Huu Dat" },
    { id: 603, date: "25/02/2026 14:00", type: "Goi dien", note: "Dat lich tam soat tim mach. Khach chon goi cao nhat.", performer: "Nguyen Thi Mai" },
    { id: 604, date: "20/02/2026 10:00", type: "Nhan tin", note: "Gui chuong trinh khuyen mai thang 3.", performer: "Nguyen Thi Mai" },
  ],
  7: [
    { id: 701, date: "03/03/2026 16:00", type: "Goi dien", note: "Hoi tham sau kham tien hon nhan. Khach hai long.", performer: "Nguyen Thi Mai" },
    { id: 702, date: "22/02/2026 10:30", type: "Kham xong", note: "Kham tien hon nhan cho cap doi. Ket qua tot.", performer: "BS. Pham Quoc Bao" },
    { id: 703, date: "15/02/2026 09:00", type: "Gap truc tiep", note: "Tu van goi kham tien hon nhan. Khach dat lich ngay.", performer: "Nguyen Thi Mai" },
  ],
  8: [
    { id: 801, date: "02/03/2026 11:00", type: "Nhan tin", note: "Gui nhac lich tai kham kiem tra chuc nang gan.", performer: "Nguyen Thi Mai" },
    { id: 802, date: "25/02/2026 08:00", type: "Kham xong", note: "Kiem tra chuc nang gan. Chi so men gan cao, can theo doi.", performer: "BS. Pham Quoc Bao" },
    { id: 803, date: "20/02/2026 14:30", type: "Goi dien", note: "Tu van dich vu kiem tra chuc nang gan.", performer: "Nguyen Thi Mai" },
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
    { id: 1001, content: "Goi hoi tham sau kham noi soi", dueDate: "10/03/2026", status: "upcoming" },
  ],
  2: [
    { id: 1002, content: "Nhac lich tai kham dinh ky", dueDate: "15/03/2026", status: "upcoming" },
  ],
  3: [
    { id: 1003, content: "Goi hoi tham sau kham - han 28/02/2026", dueDate: "28/02/2026", status: "overdue" },
    { id: 1004, content: "Nhac tai kham xet nghiem sau 1 thang", dueDate: "27/03/2026", status: "upcoming" },
  ],
  4: [
    { id: 1005, content: "Gui ket qua kham chi tiet qua email", dueDate: "01/03/2026", status: "done" },
  ],
  5: [
    { id: 1006, content: "Nhac bo sung xet nghiem Lupus", dueDate: "05/03/2026", status: "overdue" },
  ],
  6: [
    { id: 1007, content: "Cam on va gui qua khach VIP gioi thieu", dueDate: "08/03/2026", status: "upcoming" },
  ],
  7: [
    { id: 1008, content: "Hoi tham ve ke hoach cuoi, tu van them dich vu", dueDate: "20/03/2026", status: "upcoming" },
  ],
  8: [
    { id: 1009, content: "Goi nhac tai kham kiem tra men gan", dueDate: "25/03/2026", status: "upcoming" },
    { id: 1010, content: "Gui huong dan che do an cho nguoi men gan cao", dueDate: "02/03/2026", status: "overdue" },
  ],
};

export const FOLLOW_UP_CUSTOMER_IDS = [3, 5, 8];

export const NEW_THIS_MONTH_IDS = [6, 7, 8];
