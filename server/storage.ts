import {
  type User, type InsertUser,
  type Service, type InsertService,
  type Appointment, type InsertAppointment,
  type Transaction, type InsertTransaction,
  type Order, type InsertOrder,
  type Customer, type InsertCustomer,
  type StaffMember, type InsertStaffMember,
  type StatusLog, type InsertStatusLog,
} from "@shared/schema";
import {
  type AppointmentStatusCode,
  type VisitStatusCode,
  APPOINTMENT_TRANSITIONS,
  VISIT_TRANSITIONS,
} from "@shared/status";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<Pick<User, "name" | "avatar">>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  getAllServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;

  getAllAppointments(): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: number, status: string): Promise<Appointment | undefined>;

  getAllTransactions(): Promise<Transaction[]>;
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;

  getAllCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerOrders(phone: string): Promise<Order[]>;
  searchCustomers(query: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;

  getAllOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByCode(code: string): Promise<Order | undefined>;
  getOrdersByUser(userId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderAppointmentStatus(id: number, status: AppointmentStatusCode, note?: string): Promise<Order | undefined>;
  updateOrderVisitStatus(id: number, status: VisitStatusCode, note?: string): Promise<Order | undefined>;

  getStatusLogs(orderId: number): Promise<StatusLog[]>;
  createStatusLog(log: InsertStatusLog): Promise<StatusLog>;

  getAllStaffMembers(): Promise<StaffMember[]>;
  createStaffMember(member: InsertStaffMember): Promise<StaffMember>;
}

export class MemoryStorage implements IStorage {
  private users: User[] = [];
  private services: Service[] = [];
  private appointments: Appointment[] = [];
  private transactions: Transaction[] = [];
  private orders: Order[] = [];
  private customers: Customer[] = [];
  private staffMembers: StaffMember[] = [];
  private statusLogs: StatusLog[] = [];

  private nextId = {
    users: 1,
    services: 1,
    appointments: 1,
    transactions: 1,
    orders: 1,
    customers: 1,
    staffMembers: 1,
    statusLogs: 1,
  };

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.nextId.users++,
      username: insertUser.username,
      password: insertUser.password,
      name: insertUser.name,
      role: insertUser.role ?? "Chuyên viên Tư vấn",
      department: insertUser.department ?? "Phòng Kinh Doanh",
      avatar: insertUser.avatar ?? null,
      targetRevenue: insertUser.targetRevenue ?? 50000000,
      currentRevenue: insertUser.currentRevenue ?? 0,
      commissionRate: insertUser.commissionRate ?? 5,
    };
    this.users.push(user);
    return user;
  }

  async updateUser(id: number, data: Partial<Pick<User, "name" | "avatar">>): Promise<User | undefined> {
    const user = this.users.find(u => u.id === id);
    if (!user) return undefined;
    if (data.name !== undefined) user.name = data.name;
    if (data.avatar !== undefined) user.avatar = data.avatar;
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.users];
  }

  async getAllServices(): Promise<Service[]> {
    return [...this.services];
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.find(s => s.id === id);
  }

  async createService(insertService: InsertService): Promise<Service> {
    const service: Service = {
      id: this.nextId.services++,
      code: insertService.code,
      title: insertService.title,
      description: insertService.description,
      price: insertService.price ?? 0,
      commissionRange: insertService.commissionRange,
      requiresDoctor: insertService.requiresDoctor ?? true,
      duration: insertService.duration,
      insurance: insertService.insurance ?? "Có hỗ trợ",
      category: insertService.category ?? null,
      diseaseType: insertService.diseaseType ?? null,
    };
    this.services.push(service);
    return service;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return [...this.appointments];
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.find(a => a.id === id);
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const appointment: Appointment = {
      id: this.nextId.appointments++,
      code: insertAppointment.code,
      patientName: insertAppointment.patientName,
      phone: insertAppointment.phone,
      serviceId: insertAppointment.serviceId,
      serviceName: insertAppointment.serviceName,
      time: insertAppointment.time,
      date: insertAppointment.date,
      status: insertAppointment.status ?? "Đang chờ",
    };
    this.appointments.push(appointment);
    return appointment;
  }

  async updateAppointmentStatus(id: number, status: string): Promise<Appointment | undefined> {
    const appointment = this.appointments.find(a => a.id === id);
    if (appointment) {
      appointment.status = status;
    }
    return appointment;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return [...this.transactions];
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    return this.transactions.filter(t => t.userId === userId);
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const transaction: Transaction = {
      id: this.nextId.transactions++,
      code: insertTransaction.code,
      serviceName: insertTransaction.serviceName,
      patientName: insertTransaction.patientName,
      date: insertTransaction.date,
      value: insertTransaction.value,
      commission: insertTransaction.commission,
      status: insertTransaction.status ?? "Đang chờ",
      userId: insertTransaction.userId,
    };
    this.transactions.push(transaction);
    return transaction;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return [...this.customers];
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.find(c => c.id === id);
  }

  async getCustomerOrders(phone: string): Promise<Order[]> {
    return this.orders.filter(o => o.phone === phone).sort((a, b) => b.id - a.id);
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    const q = query.toLowerCase();
    return this.customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const customer: Customer = {
      id: this.nextId.customers++,
      name: insertCustomer.name,
      phone: insertCustomer.phone,
      email: insertCustomer.email ?? null,
      address: insertCustomer.address ?? null,
      location: insertCustomer.location ?? null,
      createdAt: insertCustomer.createdAt ?? "",
    };
    this.customers.push(customer);
    return customer;
  }

  async getAllOrders(): Promise<Order[]> {
    return [...this.orders].sort((a, b) => b.id - a.id);
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.find(o => o.id === id);
  }

  async getOrderByCode(code: string): Promise<Order | undefined> {
    return this.orders.find(o => o.code === code);
  }

  async getOrdersByUser(userId: number): Promise<Order[]> {
    return this.orders.filter(o => o.userId === userId).sort((a, b) => b.id - a.id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const order: Order = {
      id: this.nextId.orders++,
      code: insertOrder.code,
      patientName: insertOrder.patientName,
      phone: insertOrder.phone,
      email: insertOrder.email ?? null,
      serviceName: insertOrder.serviceName,
      serviceCode: insertOrder.serviceCode,
      serviceCategory: insertOrder.serviceCategory ?? null,
      quantity: insertOrder.quantity ?? 1,
      unitPrice: insertOrder.unitPrice,
      totalPrice: insertOrder.totalPrice,
      commission: insertOrder.commission ?? 0,
      appointmentStatus: insertOrder.appointmentStatus ?? "pending",
      visitStatus: insertOrder.visitStatus ?? null,
      notes: insertOrder.notes ?? null,
      appointmentDate: insertOrder.appointmentDate ?? null,
      appointmentTime: insertOrder.appointmentTime ?? null,
      examType: insertOrder.examType ?? null,
      vatCompanyName: insertOrder.vatCompanyName ?? null,
      vatTaxCode: insertOrder.vatTaxCode ?? null,
      vatCompanyAddress: insertOrder.vatCompanyAddress ?? null,
      vatEmail: insertOrder.vatEmail ?? null,
      createdAt: insertOrder.createdAt,
      userId: insertOrder.userId,
    };
    this.orders.push(order);
    return order;
  }

  async updateOrderAppointmentStatus(id: number, newStatus: AppointmentStatusCode, note?: string): Promise<Order | undefined> {
    const order = this.orders.find(o => o.id === id);
    if (!order) return undefined;

    const currentStatus = order.appointmentStatus as AppointmentStatusCode;
    const validTransitions = APPOINTMENT_TRANSITIONS[currentStatus] || [];
    if (!validTransitions.includes(newStatus)) return undefined;

    const fromStatus = order.appointmentStatus;
    order.appointmentStatus = newStatus;

    // When arrived, auto-create visit status
    if (newStatus === "arrived") {
      order.visitStatus = "arrived";
    }

    // Log the transition
    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    await this.createStatusLog({
      orderId: id,
      tier: "appointment",
      fromStatus,
      toStatus: newStatus,
      timestamp,
      note: note ?? null,
    });

    return order;
  }

  async updateOrderVisitStatus(id: number, newStatus: VisitStatusCode, note?: string): Promise<Order | undefined> {
    const order = this.orders.find(o => o.id === id);
    if (!order || !order.visitStatus) return undefined;

    const currentStatus = order.visitStatus as VisitStatusCode;
    const validTransitions = VISIT_TRANSITIONS[currentStatus] || [];
    if (!validTransitions.includes(newStatus)) return undefined;

    const fromStatus = order.visitStatus;
    order.visitStatus = newStatus;

    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    await this.createStatusLog({
      orderId: id,
      tier: "visit",
      fromStatus,
      toStatus: newStatus,
      timestamp,
      note: note ?? null,
    });

    return order;
  }

  async getStatusLogs(orderId: number): Promise<StatusLog[]> {
    return this.statusLogs.filter(l => l.orderId === orderId).sort((a, b) => a.id - b.id);
  }

  async createStatusLog(insertLog: InsertStatusLog): Promise<StatusLog> {
    const log: StatusLog = {
      id: this.nextId.statusLogs++,
      orderId: insertLog.orderId,
      tier: insertLog.tier,
      fromStatus: insertLog.fromStatus,
      toStatus: insertLog.toStatus,
      timestamp: insertLog.timestamp,
      note: insertLog.note ?? null,
    };
    this.statusLogs.push(log);
    return log;
  }

  async getAllStaffMembers(): Promise<StaffMember[]> {
    return [...this.staffMembers].sort((a, b) => a.rank - b.rank);
  }

  async createStaffMember(insertMember: InsertStaffMember): Promise<StaffMember> {
    const member: StaffMember = {
      id: this.nextId.staffMembers++,
      name: insertMember.name,
      role: insertMember.role,
      revenue: insertMember.revenue ?? 0,
      commission: insertMember.commission ?? 0,
      rank: insertMember.rank ?? 0,
    };
    this.staffMembers.push(member);
    return member;
  }
}

export const storage = new MemoryStorage();
