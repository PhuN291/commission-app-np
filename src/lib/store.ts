import {
  type AppointmentStatusCode,
  type VisitStatusCode,
  APPOINTMENT_TRANSITIONS,
  VISIT_TRANSITIONS,
} from "@shared/status";

// ===== Types (mirrors shared/schema.ts but without drizzle) =====
export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  role: string;
  department: string;
  avatar: string | null;
  targetRevenue: number;
  currentRevenue: number;
  commissionRate: number;
}

export interface Service {
  id: number;
  code: string;
  title: string;
  description: string;
  price: number;
  commissionRange: string;
  requiresDoctor: boolean;
  duration: string;
  insurance: string;
  category: string | null;
  diseaseType: string | null;
}

export interface Appointment {
  id: number;
  code: string;
  patientName: string;
  phone: string;
  serviceId: number;
  serviceName: string;
  time: string;
  date: string;
  status: string;
}

export interface Transaction {
  id: number;
  code: string;
  serviceName: string;
  patientName: string;
  date: string;
  value: number;
  commission: number;
  status: string;
  userId: number;
}

export interface Order {
  id: number;
  code: string;
  patientName: string;
  phone: string;
  email: string | null;
  serviceName: string;
  serviceCode: string;
  serviceCategory: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  commission: number;
  appointmentStatus: string;
  visitStatus: string | null;
  notes: string | null;
  appointmentDate: string | null;
  appointmentTime: string | null;
  examType: string | null;
  vatCompanyName: string | null;
  vatTaxCode: string | null;
  vatCompanyAddress: string | null;
  vatEmail: string | null;
  createdAt: string;
  userId: number;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  location: string | null;
  createdAt: string;
}

export interface StaffMember {
  id: number;
  name: string;
  role: string;
  revenue: number;
  commission: number;
  rank: number;
}

export interface StatusLog {
  id: number;
  orderId: number;
  tier: string;
  fromStatus: string;
  toStatus: string;
  timestamp: string;
  note: string | null;
}

// ===== In-memory store =====
class MemoryStore {
  users: User[] = [];
  services: Service[] = [];
  appointments: Appointment[] = [];
  transactions: Transaction[] = [];
  orders: Order[] = [];
  customers: Customer[] = [];
  staffMembers: StaffMember[] = [];
  statusLogs: StatusLog[] = [];

  private nextId = {
    users: 1, services: 1, appointments: 1, transactions: 1,
    orders: 1, customers: 1, staffMembers: 1, statusLogs: 1,
  };

  createUser(d: Omit<User, "id">): User {
    const u = { ...d, id: this.nextId.users++ };
    this.users.push(u);
    return u;
  }

  createService(d: Omit<Service, "id">): Service {
    const s = { ...d, id: this.nextId.services++ };
    this.services.push(s);
    return s;
  }

  createAppointment(d: Omit<Appointment, "id">): Appointment {
    const a = { ...d, id: this.nextId.appointments++ };
    this.appointments.push(a);
    return a;
  }

  createTransaction(d: Omit<Transaction, "id">): Transaction {
    const t = { ...d, id: this.nextId.transactions++ };
    this.transactions.push(t);
    return t;
  }

  createOrder(d: Omit<Order, "id">): Order {
    const o = { ...d, id: this.nextId.orders++ };
    this.orders.push(o);
    return o;
  }

  createCustomer(d: Omit<Customer, "id">): Customer {
    const c = { ...d, id: this.nextId.customers++ };
    this.customers.push(c);
    return c;
  }

  createStaffMember(d: Omit<StaffMember, "id">): StaffMember {
    const m = { ...d, id: this.nextId.staffMembers++ };
    this.staffMembers.push(m);
    return m;
  }

  createStatusLog(d: Omit<StatusLog, "id">): StatusLog {
    const l = { ...d, id: this.nextId.statusLogs++ };
    this.statusLogs.push(l);
    return l;
  }

  updateOrderAppointmentStatus(id: number, newStatus: AppointmentStatusCode, note?: string): Order | undefined {
    const order = this.orders.find(o => o.id === id);
    if (!order) return undefined;
    const current = order.appointmentStatus as AppointmentStatusCode;
    if (!APPOINTMENT_TRANSITIONS[current]?.includes(newStatus)) return undefined;
    const fromStatus = order.appointmentStatus;
    order.appointmentStatus = newStatus;
    if (newStatus === "arrived") order.visitStatus = "arrived";
    const ts = nowTimestamp();
    this.createStatusLog({ orderId: id, tier: "appointment", fromStatus, toStatus: newStatus, timestamp: ts, note: note ?? null });
    return order;
  }

  updateOrderVisitStatus(id: number, newStatus: VisitStatusCode, note?: string): Order | undefined {
    const order = this.orders.find(o => o.id === id);
    if (!order || !order.visitStatus) return undefined;
    const current = order.visitStatus as VisitStatusCode;
    if (!VISIT_TRANSITIONS[current]?.includes(newStatus)) return undefined;
    const fromStatus = order.visitStatus;
    order.visitStatus = newStatus;
    const ts = nowTimestamp();
    this.createStatusLog({ orderId: id, tier: "visit", fromStatus, toStatus: newStatus, timestamp: ts, note: note ?? null });
    return order;
  }
}

function nowTimestamp() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${d}/${m}/${now.getFullYear()} ${h}:${min}`;
}

export const store = new MemoryStore();

// ===== Seed =====
function seed() {
  store.createService({ code: "DV-001", title: "Thủ thuật y khoa", description: "Thực hiện các thủ thuật can thiệp lâm sàng nhanh chóng theo chỉ định của bác sĩ.", price: 350000, commissionRange: "50.000 - 200.000", requiresDoctor: true, duration: "15-30 phút", insurance: "Có hỗ trợ", category: "Thủ thuật", diseaseType: "Tổng quát" });
  store.createService({ code: "DV-002", title: "Nội soi tiêu hóa", description: "Thực hiện nội soi dạ dày, đại tràng bằng công nghệ hiện đại, không đau, phát hiện sớm ung thư.", price: 2500000, commissionRange: "150.000 - 500.000", requiresDoctor: true, duration: "45-60 phút", insurance: "Có hỗ trợ", category: "Nội soi", diseaseType: "Tiêu hóa" });
  store.createService({ code: "DV-003", title: "Xét nghiệm chất gây nghiện", description: "Kiểm tra nhanh và chính xác sự hiện diện của các chất kích thích trong cơ thể.", price: 200000, commissionRange: "30.000 - 100.000", requiresDoctor: false, duration: "10-20 phút", insurance: "Không hỗ trợ", category: "Xét nghiệm", diseaseType: "Chất kích thích" });
  store.createService({ code: "DV-004", title: "Khám sức khỏe Nam/Nữ giới", description: "Gói khám sức khỏe chuyên biệt được thiết kế riêng cho các đặc điểm sinh lý của Nam giới và Nữ giới.", price: 800000, commissionRange: "100.000 - 300.000", requiresDoctor: true, duration: "30-45 phút", insurance: "Có hỗ trợ", category: "Khám tổng quát", diseaseType: "Tổng quát" });
  store.createService({ code: "DV-005", title: "Chẩn đoán Lupus", description: "Xét nghiệm chuyên biệt chẩn đoán bệnh tự miễn Lupus ban đỏ hệ thống và các bệnh lý liên quan.", price: 600000, commissionRange: "80.000 - 250.000", requiresDoctor: true, duration: "20-30 phút", insurance: "Có hỗ trợ", category: "Chẩn đoán", diseaseType: "Miễn dịch" });
  store.createService({ code: "DV-006", title: "Sàng lọc lây nhiễm từ Mẹ sang Thai nhi", description: "Kiểm tra các tác nhân gây bệnh truyền nhiễm có thể lây sang bé trong quá trình mang thai.", price: 1500000, commissionRange: "120.000 - 400.000", requiresDoctor: true, duration: "15-25 phút", insurance: "Có hỗ trợ", category: "Sàng lọc", diseaseType: "Sinh sản" });
  store.createService({ code: "DV-007", title: "Tầm soát Tim mạch chuyên sâu", description: "Đánh giá chức năng tim, mạch máu và tầm soát nguy cơ đột quỵ, xơ vữa động mạch bằng kỹ thuật hiện đại.", price: 4500000, commissionRange: "200.000 - 600.000", requiresDoctor: true, duration: "60-90 phút", insurance: "Có hỗ trợ", category: "Tầm soát", diseaseType: "Tim mạch" });
  store.createService({ code: "DV-008", title: "Gói khám tổng quát", description: "Tổng hợp các gói khám Bạc, Vàng, Kim cương giúp tầm soát sức khỏe toàn diện từ cơ bản đến cao cấp.", price: 3500000, commissionRange: "300.000 - 1.500.000", requiresDoctor: false, duration: "120-180 phút", insurance: "Có hỗ trợ", category: "Khám tổng quát", diseaseType: "Tổng quát" });
  store.createService({ code: "DV-009", title: "Kiểm tra chức năng Gan", description: "Xét nghiệm virus viêm gan và đánh giá men gan, chức năng giải độc gan định kỳ.", price: 350000, commissionRange: "40.000 - 150.000", requiresDoctor: true, duration: "15-20 phút", insurance: "Có hỗ trợ", category: "Xét nghiệm", diseaseType: "Gan" });
  store.createService({ code: "DV-010", title: "Khám Tiền hôn nhân", description: "Kiểm tra sức khỏe sinh sản và di truyền cho các cặp đôi trước khi xây dựng tổ ấm.", price: 2000000, commissionRange: "150.000 - 450.000", requiresDoctor: false, duration: "60-90 phút", insurance: "Không hỗ trợ", category: "Khám tổng quát", diseaseType: "Sinh sản" });

  const mainUser = store.createUser({ username: "mai", password: "password123", name: "Nguyễn Thị Mai", role: "Chuyên viên Tư vấn", department: "Phòng Kinh Doanh", avatar: null, targetRevenue: 50000000, currentRevenue: 35000000, commissionRate: 5 });

  store.createAppointment({ code: "#NP260226001", patientName: "Trần Văn An", phone: "0901234567", serviceId: 7, serviceName: "Siêu âm Doppler Tim", time: "08:30", date: "26/02/2026", status: "Hoàn tất" });
  store.createAppointment({ code: "#NP260226002", patientName: "Lê Thị Bình", phone: "0912345678", serviceId: 8, serviceName: "Xét nghiệm Tổng quát", time: "09:15", date: "26/02/2026", status: "Đang chờ" });
  store.createAppointment({ code: "#NP260226003", patientName: "Phạm Hồng Chương", phone: "0923456789", serviceId: 4, serviceName: "Khám Nội tổng quát", time: "10:00", date: "26/02/2026", status: "Đang chờ" });
  store.createAppointment({ code: "#NP260226004", patientName: "Nguyễn Thị Diệu", phone: "0934567890", serviceId: 2, serviceName: "Nội soi dạ dày", time: "14:30", date: "26/02/2026", status: "Đã hủy" });
  store.createAppointment({ code: "#NP260226005", patientName: "Hoàng Văn Em", phone: "0945678901", serviceId: 9, serviceName: "Chụp X-Quang phổi", time: "15:45", date: "26/02/2026", status: "Đang chờ" });

  store.createTransaction({ code: "XN-0982", serviceName: "Xét nghiệm Tổng quát", patientName: "Trần Văn A", date: "22/02/2026 10:15", value: 1200000, commission: 60000, status: "Hoàn tất", userId: mainUser.id });
  store.createTransaction({ code: "SA-0981", serviceName: "Siêu âm Doppler Tim", patientName: "Lê Thị B", date: "22/02/2026 09:30", value: 500000, commission: 25000, status: "Hoàn tất", userId: mainUser.id });
  store.createTransaction({ code: "KS-0980", serviceName: "Khám Sức khỏe Định kỳ", patientName: "Phạm Văn C", date: "21/02/2026 16:45", value: 2500000, commission: 125000, status: "Đang chờ", userId: mainUser.id });
  store.createTransaction({ code: "XN-0979", serviceName: "Xét nghiệm NIPT", patientName: "Hoàng Đình D", date: "21/02/2026 14:20", value: 6500000, commission: 325000, status: "Hoàn tất", userId: mainUser.id });

  store.createOrder({ code: "#NP260213001", patientName: "Trần Văn An", phone: "0901234567", email: "tranvanan@gmail.com", serviceName: "Siêu âm Doppler Tim", serviceCode: "DV-007", serviceCategory: "Tim mạch", quantity: 1, unitPrice: 500000, totalPrice: 500000, commission: 25000, appointmentStatus: "arrived", visitStatus: "completed", notes: "", appointmentDate: "26/02/2026", appointmentTime: "08:30", examType: "Khám tại phòng khám", vatCompanyName: null, vatTaxCode: null, vatCompanyAddress: null, vatEmail: null, createdAt: "13/02/2026 08:30", userId: mainUser.id });
  store.createOrder({ code: "#NP260213002", patientName: "Lê Thị Bình", phone: "0912345678", email: "lethibinh@gmail.com", serviceName: "Xét nghiệm Tổng quát", serviceCode: "DV-008", serviceCategory: "Xét nghiệm", quantity: 1, unitPrice: 1200000, totalPrice: 1200000, commission: 60000, appointmentStatus: "arrived", visitStatus: "completed", notes: "Khách VIP", appointmentDate: "26/02/2026", appointmentTime: "09:15", examType: "Lấy mẫu tại nhà", vatCompanyName: null, vatTaxCode: null, vatCompanyAddress: null, vatEmail: null, createdAt: "13/02/2026 09:15", userId: mainUser.id });
  store.createOrder({ code: "#NP260213003", patientName: "Phạm Hồng Chương", phone: "0923456789", email: null, serviceName: "Khám sức khỏe Nam/Nữ giới", serviceCode: "DV-004", serviceCategory: "Khám tổng quát", quantity: 1, unitPrice: 800000, totalPrice: 800000, commission: 40000, appointmentStatus: "pending", visitStatus: null, notes: null, appointmentDate: "28/02/2026", appointmentTime: "10:00", examType: "Khám tại phòng khám", vatCompanyName: null, vatTaxCode: null, vatCompanyAddress: null, vatEmail: null, createdAt: "13/02/2026 10:00", userId: mainUser.id });
  store.createOrder({ code: "#NP260214001", patientName: "Nguyễn Thị Diệu", phone: "0934567890", email: "nguyendieu@gmail.com", serviceName: "Nội soi tiêu hóa", serviceCode: "DV-002", serviceCategory: "Nội soi", quantity: 1, unitPrice: 2500000, totalPrice: 2500000, commission: 125000, appointmentStatus: "cancelled", visitStatus: null, notes: "Khách hủy do bận", appointmentDate: null, appointmentTime: null, examType: null, vatCompanyName: null, vatTaxCode: null, vatCompanyAddress: null, vatEmail: null, createdAt: "14/02/2026 14:30", userId: mainUser.id });
  store.createOrder({ code: "#NP260214002", patientName: "Hoàng Văn Em", phone: "0945678901", email: null, serviceName: "Gói khám tổng quát", serviceCode: "DV-008", serviceCategory: "Khám tổng quát", quantity: 2, unitPrice: 3500000, totalPrice: 7000000, commission: 350000, appointmentStatus: "arrived", visitStatus: "in_progress", notes: null, appointmentDate: "20/02/2026", appointmentTime: "15:45", examType: "Khám tại phòng khám", vatCompanyName: null, vatTaxCode: null, vatCompanyAddress: null, vatEmail: null, createdAt: "14/02/2026 15:45", userId: mainUser.id });
  store.createOrder({ code: "#NP260215001", patientName: "Vũ Minh Phúc", phone: "0956789012", email: "vuminhphuc@gmail.com", serviceName: "Tầm soát Tim mạch chuyên sâu", serviceCode: "DV-007", serviceCategory: "Tim mạch", quantity: 1, unitPrice: 4500000, totalPrice: 4500000, commission: 225000, appointmentStatus: "confirmed", visitStatus: null, notes: null, appointmentDate: "01/03/2026", appointmentTime: "09:00", examType: "Khám tại phòng khám", vatCompanyName: null, vatTaxCode: null, vatCompanyAddress: null, vatEmail: null, createdAt: "15/02/2026 09:00", userId: mainUser.id });
  store.createOrder({ code: "#NP260220001", patientName: "Đặng Thu Hương", phone: "0967890123", email: "danghuong@gmail.com", serviceName: "Khám Tiền hôn nhân", serviceCode: "DV-010", serviceCategory: "Khám tổng quát", quantity: 2, unitPrice: 2000000, totalPrice: 4000000, commission: 200000, appointmentStatus: "reminded", visitStatus: null, notes: null, appointmentDate: "22/02/2026", appointmentTime: "10:30", examType: "Khám tại phòng khám", vatCompanyName: null, vatTaxCode: null, vatCompanyAddress: null, vatEmail: null, createdAt: "20/02/2026 10:30", userId: mainUser.id });
  store.createOrder({ code: "#NP260225001", patientName: "Bùi Quang Hải", phone: "0978901234", email: null, serviceName: "Kiểm tra chức năng Gan", serviceCode: "DV-009", serviceCategory: "Xét nghiệm", quantity: 1, unitPrice: 350000, totalPrice: 350000, commission: 17500, appointmentStatus: "no_show", visitStatus: null, notes: "Khám lần đầu", appointmentDate: null, appointmentTime: null, examType: "Lấy mẫu tại nhà", vatCompanyName: null, vatTaxCode: null, vatCompanyAddress: null, vatEmail: null, createdAt: "25/02/2026 08:00", userId: mainUser.id });

  store.createStatusLog({ orderId: 1, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "13/02/2026 09:00", note: null });
  store.createStatusLog({ orderId: 1, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "25/02/2026 18:00", note: "Đã gọi nhắc lịch" });
  store.createStatusLog({ orderId: 1, tier: "appointment", fromStatus: "reminded", toStatus: "arrived", timestamp: "26/02/2026 08:25", note: null });
  store.createStatusLog({ orderId: 1, tier: "visit", fromStatus: "arrived", toStatus: "in_progress", timestamp: "26/02/2026 08:35", note: null });
  store.createStatusLog({ orderId: 1, tier: "visit", fromStatus: "in_progress", toStatus: "completed", timestamp: "26/02/2026 09:10", note: null });
  store.createStatusLog({ orderId: 2, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "14/02/2026 10:00", note: null });
  store.createStatusLog({ orderId: 2, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "25/02/2026 17:00", note: null });
  store.createStatusLog({ orderId: 2, tier: "appointment", fromStatus: "reminded", toStatus: "arrived", timestamp: "26/02/2026 09:10", note: null });
  store.createStatusLog({ orderId: 2, tier: "visit", fromStatus: "arrived", toStatus: "in_progress", timestamp: "26/02/2026 09:20", note: null });
  store.createStatusLog({ orderId: 2, tier: "visit", fromStatus: "in_progress", toStatus: "completed", timestamp: "26/02/2026 10:00", note: null });
  store.createStatusLog({ orderId: 4, tier: "appointment", fromStatus: "pending", toStatus: "cancelled", timestamp: "14/02/2026 15:00", note: "Khách hủy do bận" });
  store.createStatusLog({ orderId: 5, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "15/02/2026 08:00", note: null });
  store.createStatusLog({ orderId: 5, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "19/02/2026 16:00", note: null });
  store.createStatusLog({ orderId: 5, tier: "appointment", fromStatus: "reminded", toStatus: "arrived", timestamp: "20/02/2026 15:40", note: null });
  store.createStatusLog({ orderId: 5, tier: "visit", fromStatus: "arrived", toStatus: "in_progress", timestamp: "20/02/2026 15:50", note: null });
  store.createStatusLog({ orderId: 6, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "16/02/2026 10:00", note: null });
  store.createStatusLog({ orderId: 7, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "20/02/2026 11:00", note: null });
  store.createStatusLog({ orderId: 7, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "21/02/2026 18:00", note: "Đã nhắn tin Zalo" });
  store.createStatusLog({ orderId: 8, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "25/02/2026 09:00", note: null });
  store.createStatusLog({ orderId: 8, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "10/03/2026 17:00", note: null });
  store.createStatusLog({ orderId: 8, tier: "appointment", fromStatus: "reminded", toStatus: "no_show", timestamp: "11/03/2026 10:00", note: "Không liên lạc được" });

  store.createCustomer({ name: "Trần Văn An", phone: "0901234567", email: "tranvanan@gmail.com", address: "123 Nguyễn Huệ, Quận 1", location: "TP. Hồ Chí Minh", createdAt: "01/01/2026" });
  store.createCustomer({ name: "Lê Thị Bình", phone: "0912345678", email: "lethibinh@gmail.com", address: "456 Lê Lợi, Quận 3", location: "TP. Hồ Chí Minh", createdAt: "05/01/2026" });
  store.createCustomer({ name: "Phạm Hồng Chương", phone: "0923456789", email: null, address: "789 Trần Hưng Đạo, Quận 5", location: "TP. Hồ Chí Minh", createdAt: "10/01/2026" });
  store.createCustomer({ name: "Nguyễn Thị Diệu", phone: "0934567890", email: "nguyendieu@gmail.com", address: "12 Hoàng Diệu, Hải Châu", location: "Đà Nẵng", createdAt: "12/01/2026" });
  store.createCustomer({ name: "Hoàng Văn Em", phone: "0945678901", email: null, address: "34 Nguyễn Trãi, Ba Đình", location: "Hà Nội", createdAt: "15/01/2026" });
  store.createCustomer({ name: "Vũ Minh Phúc", phone: "0956789012", email: "vuminhphuc@gmail.com", address: "56 Lý Thường Kiệt, Tân Bình", location: "TP. Hồ Chí Minh", createdAt: "20/01/2026" });
  store.createCustomer({ name: "Đặng Thu Hương", phone: "0967890123", email: "danghuong@gmail.com", address: "78 Pasteur, Quận 1", location: "TP. Hồ Chí Minh", createdAt: "25/01/2026" });
  store.createCustomer({ name: "Bùi Quang Hải", phone: "0978901234", email: null, address: "90 Hai Bà Trưng, Hoàn Kiếm", location: "Hà Nội", createdAt: "01/02/2026" });

  store.createStaffMember({ name: "Trần Hữu Đạt", role: "BS. Trưởng Khoa", revenue: 85000000, commission: 4250000, rank: 1 });
  store.createStaffMember({ name: "Lê Hoàng Yến", role: "CV. Tư vấn", revenue: 42000000, commission: 2100000, rank: 2 });
  store.createStaffMember({ name: "Nguyễn Thị Mai", role: "CV. Tư vấn", revenue: 35000000, commission: 1750000, rank: 3 });
  store.createStaffMember({ name: "Phạm Quốc Bảo", role: "BS. Chuyên khoa", revenue: 28000000, commission: 1400000, rank: 4 });
  store.createStaffMember({ name: "Võ Thanh Tâm", role: "CV. Tư vấn", revenue: 22000000, commission: 1100000, rank: 5 });
  store.createStaffMember({ name: "Đỗ Ngọc Hân", role: "ĐD. Trưởng", revenue: 18000000, commission: 900000, rank: 6 });
  store.createStaffMember({ name: "Lý Minh Tuấn", role: "CV. Tư vấn", revenue: 15000000, commission: 750000, rank: 7 });
  store.createStaffMember({ name: "Huỳnh Thị Lan", role: "ĐD. Chăm sóc", revenue: 12000000, commission: 600000, rank: 8 });
}

seed();
