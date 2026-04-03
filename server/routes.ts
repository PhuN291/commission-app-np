import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAppointmentSchema, insertServiceSchema, insertTransactionSchema, insertOrderSchema, insertCustomerSchema } from "@shared/schema";
import { seedDatabase } from "./seed";
import { APPOINTMENT_TRANSITIONS, VISIT_TRANSITIONS, type AppointmentStatusCode, type VisitStatusCode } from "@shared/status";

const VALID_STATUSES = ["Hoàn tất", "Đang chờ", "Đã hủy"];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedDatabase();

  app.get("/api/user", async (_req, res) => {
    try {
      const user = await storage.getUserByUsername("mai");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/user", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("mai");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { name, avatar } = req.body;
      const updated = await storage.updateUser(user.id, { name, avatar });
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.get("/api/users", async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const safeUsers = allUsers.map(({ password, ...u }) => u);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/services", async (_req, res) => {
    try {
      const allServices = await storage.getAllServices();
      res.json(allServices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      const parsed = insertServiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid service data", errors: parsed.error.errors });
      }
      const service = await storage.createService(parsed.data);
      res.status(201).json(service);
    } catch (error) {
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.get("/api/appointments", async (_req, res) => {
    try {
      const allAppointments = await storage.getAllAppointments();
      res.json(allAppointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const parsed = insertAppointmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid appointment data", errors: parsed.error.errors });
      }
      const appointment = await storage.createAppointment(parsed.data);
      res.status(201).json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.patch("/api/appointments/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
      }
      const appointment = await storage.updateAppointmentStatus(id, status);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update appointment status" });
    }
  });

  app.get("/api/transactions", async (_req, res) => {
    try {
      const allTransactions = await storage.getAllTransactions();
      res.json(allTransactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const parsed = insertTransactionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid transaction data", errors: parsed.error.errors });
      }
      const transaction = await storage.createTransaction(parsed.data);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.get("/api/orders", async (_req, res) => {
    try {
      const allOrders = await storage.getAllOrders();
      res.json(allOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const parsed = insertOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid order data", errors: parsed.error.errors });
      }
      const order = await storage.createOrder(parsed.data);
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Update appointment status
  app.patch("/api/orders/:id/appointment-status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, note } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      const currentStatus = order.appointmentStatus as AppointmentStatusCode;
      const validTransitions = APPOINTMENT_TRANSITIONS[currentStatus] || [];
      if (!validTransitions.includes(status)) {
        return res.status(400).json({ message: `Cannot transition from ${currentStatus} to ${status}` });
      }
      const updated = await storage.updateOrderAppointmentStatus(id, status, note);
      if (!updated) {
        return res.status(400).json({ message: "Failed to update status" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update appointment status" });
    }
  });

  // Update visit status
  app.patch("/api/orders/:id/visit-status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, note } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const order = await storage.getOrder(id);
      if (!order || !order.visitStatus) {
        return res.status(404).json({ message: "Order not found or visit not started" });
      }
      const currentStatus = order.visitStatus as VisitStatusCode;
      const validTransitions = VISIT_TRANSITIONS[currentStatus] || [];
      if (!validTransitions.includes(status)) {
        return res.status(400).json({ message: `Cannot transition from ${currentStatus} to ${status}` });
      }
      const updated = await storage.updateOrderVisitStatus(id, status, note);
      if (!updated) {
        return res.status(400).json({ message: "Failed to update visit status" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update visit status" });
    }
  });

  // Reschedule: set current order to rescheduled, create new order
  app.post("/api/orders/:id/reschedule", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { appointmentDate, appointmentTime } = req.body;
      if (!appointmentDate || !appointmentTime) {
        return res.status(400).json({ message: "New appointment date and time required" });
      }
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      // Mark current as rescheduled
      const updated = await storage.updateOrderAppointmentStatus(id, "rescheduled" as AppointmentStatusCode, `Dời sang ${appointmentDate} ${appointmentTime}`);
      if (!updated) {
        return res.status(400).json({ message: "Cannot reschedule this order" });
      }
      // Create new order with status confirmed
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = String(now.getFullYear()).slice(2);
      const rand = String(Math.floor(Math.random() * 900) + 100);
      const code = `#NP${year}${month}${day}${rand}`;
      const timeStr = `${day}/${month}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const newOrder = await storage.createOrder({
        code,
        patientName: order.patientName,
        phone: order.phone,
        email: order.email,
        serviceName: order.serviceName,
        serviceCode: order.serviceCode,
        serviceCategory: order.serviceCategory,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        totalPrice: order.totalPrice,
        commission: order.commission,
        appointmentStatus: "confirmed",
        notes: `Dời lịch từ đơn ${order.code}`,
        appointmentDate,
        appointmentTime,
        examType: order.examType,
        vatCompanyName: order.vatCompanyName,
        vatTaxCode: order.vatTaxCode,
        vatCompanyAddress: order.vatCompanyAddress,
        vatEmail: order.vatEmail,
        createdAt: timeStr,
        userId: order.userId,
      });
      res.json({ originalOrder: updated, newOrder });
    } catch (error) {
      res.status(500).json({ message: "Failed to reschedule" });
    }
  });

  // Get status logs for an order
  app.get("/api/orders/:id/status-logs", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const logs = await storage.getStatusLogs(id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch status logs" });
    }
  });

  app.get("/api/customers", async (req, res) => {
    try {
      const q = req.query.q as string | undefined;
      if (q && q.length > 0) {
        const results = await storage.searchCustomers(q);
        return res.json(results);
      }
      const all = await storage.getAllCustomers();
      res.json(all);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      const customerOrders = await storage.getCustomerOrders(customer.phone);
      const totalSpent = customerOrders
        .filter(o => o.appointmentStatus !== "cancelled")
        .reduce((sum, o) => sum + o.totalPrice, 0);
      const orderCount = customerOrders.filter(o => o.appointmentStatus !== "cancelled").length;
      const lastOrder = customerOrders.length > 0 ? customerOrders[0] : null;

      res.json({
        customer,
        orders: customerOrders,
        stats: {
          totalSpent,
          orderCount,
          customerSince: customer.createdAt,
        },
        lastOrder,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const parsed = insertCustomerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid customer data", errors: parsed.error.errors });
      }
      const customer = await storage.createCustomer(parsed.data);
      res.status(201).json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.get("/api/staff", async (_req, res) => {
    try {
      const staff = await storage.getAllStaffMembers();
      res.json(staff);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.get("/api/income", async (_req, res) => {
    try {
      const user = await storage.getUserByUsername("mai");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...safeUser } = user;
      const allTransactions = await storage.getTransactionsByUser(user.id);

      const completedTx = allTransactions.filter(t => t.status === "Hoàn tất");
      const pendingTx = allTransactions.filter(t => t.status !== "Hoàn tất");

      const estimatedCommission = allTransactions.reduce((sum, t) => sum + t.commission, 0);
      const actualCommission = completedTx.reduce((sum, t) => sum + t.commission, 0);
      const pendingCommission = pendingTx.reduce((sum, t) => sum + t.commission, 0);

      const kpiMilestones = [
        { label: "Mốc 1", target: 15000000, bonus: 500000, reached: user.currentRevenue >= 15000000 },
        { label: "Mốc 2", target: 30000000, bonus: 1500000, reached: user.currentRevenue >= 30000000 },
        { label: "Mốc 3", target: 40000000, bonus: 3000000, reached: user.currentRevenue >= 40000000 },
        { label: "Mốc 4", target: 50000000, bonus: 5000000, reached: user.currentRevenue >= 50000000 },
      ];

      res.json({
        user: safeUser,
        transactions: allTransactions,
        summary: {
          estimatedCommission,
          actualCommission,
          pendingCommission,
          totalRevenue: user.currentRevenue,
          totalDeals: allTransactions.length,
          completedDeals: completedTx.length,
        },
        kpiMilestones,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch income data" });
    }
  });

  app.get("/api/dashboard", async (_req, res) => {
    try {
      const user = await storage.getUserByUsername("mai");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...safeUser } = user;
      const userOrders = await storage.getOrdersByUser(user.id);
      const staff = await storage.getAllStaffMembers();
      const recentOrders = userOrders.slice(0, 4);
      const pendingOrdersCount = userOrders.filter(o => o.appointmentStatus === "pending").length;

      res.json({
        user: safeUser,
        recentOrders,
        pendingOrdersCount,
        leaderboard: staff,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const q = (req.query.q as string || "").trim().toLowerCase();
      if (!q) {
        return res.json({ services: [], customers: [], orders: [] });
      }

      const allServices = await storage.getAllServices();
      const allCustomers = await storage.getAllCustomers();
      const allOrders = await storage.getAllOrders();

      const services = allServices
        .filter(s => s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.category || "").toLowerCase().includes(q))
        .slice(0, 5);

      const customers = allCustomers
        .filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email || "").toLowerCase().includes(q))
        .slice(0, 5);

      const orders = allOrders
        .filter(o => o.code.toLowerCase().includes(q) || o.patientName.toLowerCase().includes(q) || o.serviceName.toLowerCase().includes(q))
        .slice(0, 5);

      res.json({ services, customers, orders });
    } catch (error) {
      res.status(500).json({ message: "Failed to search" });
    }
  });

  return httpServer;
}
