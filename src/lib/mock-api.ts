import { store } from "./store";
import type { AppointmentStatusCode, VisitStatusCode } from "@shared/status";
import { APPOINTMENT_TRANSITIONS, VISIT_TRANSITIONS } from "@shared/status";

function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function err(status: number, message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleRequest(url: string, init?: RequestInit): Promise<Response | null> {
  const method = (init?.method ?? "GET").toUpperCase();
  const path = url.startsWith("/") ? url : new URL(url).pathname;

  if (!path.startsWith("/api/")) return null;

  const body = init?.body ? JSON.parse(init.body as string) : {};

  // GET /api/user
  if (method === "GET" && path === "/api/user") {
    const user = store.users.find(u => u.username === "mai");
    if (!user) return err(404, "User not found");
    const { password: _, ...safe } = user;
    return ok(safe);
  }

  // PATCH /api/user
  if (method === "PATCH" && path === "/api/user") {
    const user = store.users.find(u => u.username === "mai");
    if (!user) return err(404, "User not found");
    if (body.name !== undefined) user.name = body.name;
    if (body.avatar !== undefined) user.avatar = body.avatar;
    const { password: _, ...safe } = user;
    return ok(safe);
  }

  // GET /api/users
  if (method === "GET" && path === "/api/users") {
    return ok(store.users.map(({ password: _, ...u }) => u));
  }

  // GET /api/users/:id
  const userMatch = path.match(/^\/api\/users\/(\d+)$/);
  if (method === "GET" && userMatch) {
    const user = store.users.find(u => u.id === Number(userMatch[1]));
    if (!user) return err(404, "User not found");
    const { password: _, ...safe } = user;
    return ok(safe);
  }

  // GET /api/services
  if (method === "GET" && path === "/api/services") {
    return ok(store.services);
  }

  // POST /api/services
  if (method === "POST" && path === "/api/services") {
    const s = store.createService({ ...body });
    return new Response(JSON.stringify(s), { status: 201, headers: { "Content-Type": "application/json" } });
  }

  // GET /api/appointments
  if (method === "GET" && path === "/api/appointments") {
    return ok(store.appointments);
  }

  // POST /api/appointments
  if (method === "POST" && path === "/api/appointments") {
    const a = store.createAppointment({ ...body });
    return new Response(JSON.stringify(a), { status: 201, headers: { "Content-Type": "application/json" } });
  }

  // PATCH /api/appointments/:id/status
  const apptStatusMatch = path.match(/^\/api\/appointments\/(\d+)\/status$/);
  if (method === "PATCH" && apptStatusMatch) {
    const appt = store.appointments.find(a => a.id === Number(apptStatusMatch[1]));
    if (!appt) return err(404, "Appointment not found");
    appt.status = body.status;
    return ok(appt);
  }

  // GET /api/transactions
  if (method === "GET" && path === "/api/transactions") {
    return ok(store.transactions);
  }

  // POST /api/transactions
  if (method === "POST" && path === "/api/transactions") {
    const t = store.createTransaction({ ...body });
    return new Response(JSON.stringify(t), { status: 201, headers: { "Content-Type": "application/json" } });
  }

  // GET /api/orders
  if (method === "GET" && path === "/api/orders") {
    return ok([...store.orders].sort((a, b) => b.id - a.id));
  }

  // GET /api/orders/:id
  const orderMatch = path.match(/^\/api\/orders\/(\d+)$/);
  if (method === "GET" && orderMatch) {
    const order = store.orders.find(o => o.id === Number(orderMatch[1]));
    if (!order) return err(404, "Order not found");
    return ok(order);
  }

  // POST /api/orders
  if (method === "POST" && path === "/api/orders") {
    const o = store.createOrder({ ...body });
    return new Response(JSON.stringify(o), { status: 201, headers: { "Content-Type": "application/json" } });
  }

  // PATCH /api/orders/:id/appointment-status
  const orderApptMatch = path.match(/^\/api\/orders\/(\d+)\/appointment-status$/);
  if (method === "PATCH" && orderApptMatch) {
    const id = Number(orderApptMatch[1]);
    const { status, note } = body;
    const order = store.orders.find(o => o.id === id);
    if (!order) return err(404, "Order not found");
    const current = order.appointmentStatus as AppointmentStatusCode;
    if (!APPOINTMENT_TRANSITIONS[current]?.includes(status)) {
      return err(400, `Cannot transition from ${current} to ${status}`);
    }
    const updated = store.updateOrderAppointmentStatus(id, status, note);
    if (!updated) return err(400, "Failed to update status");
    return ok(updated);
  }

  // PATCH /api/orders/:id/visit-status
  const orderVisitMatch = path.match(/^\/api\/orders\/(\d+)\/visit-status$/);
  if (method === "PATCH" && orderVisitMatch) {
    const id = Number(orderVisitMatch[1]);
    const { status, note } = body;
    const order = store.orders.find(o => o.id === id);
    if (!order || !order.visitStatus) return err(404, "Order not found or visit not started");
    const current = order.visitStatus as VisitStatusCode;
    if (!VISIT_TRANSITIONS[current]?.includes(status)) {
      return err(400, `Cannot transition from ${current} to ${status}`);
    }
    const updated = store.updateOrderVisitStatus(id, status, note);
    if (!updated) return err(400, "Failed to update visit status");
    return ok(updated);
  }

  // POST /api/orders/:id/reschedule
  const rescheduleMatch = path.match(/^\/api\/orders\/(\d+)\/reschedule$/);
  if (method === "POST" && rescheduleMatch) {
    const id = Number(rescheduleMatch[1]);
    const { appointmentDate, appointmentTime } = body;
    const order = store.orders.find(o => o.id === id);
    if (!order) return err(404, "Order not found");
    const updated = store.updateOrderAppointmentStatus(id, "rescheduled", `Dời sang ${appointmentDate} ${appointmentTime}`);
    if (!updated) return err(400, "Cannot reschedule this order");
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = String(now.getFullYear()).slice(2);
    const rand = String(Math.floor(Math.random() * 900) + 100);
    const newOrder = store.createOrder({
      code: `#NP${y}${m}${d}${rand}`,
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
      visitStatus: null,
      notes: `Dời lịch từ đơn ${order.code}`,
      appointmentDate,
      appointmentTime,
      examType: order.examType,
      vatCompanyName: order.vatCompanyName,
      vatTaxCode: order.vatTaxCode,
      vatCompanyAddress: order.vatCompanyAddress,
      vatEmail: order.vatEmail,
      createdAt: `${d}/${m}/20${y} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      userId: order.userId,
    });
    return ok({ originalOrder: updated, newOrder });
  }

  // GET /api/orders/:id/status-logs
  const statusLogsMatch = path.match(/^\/api\/orders\/(\d+)\/status-logs$/);
  if (method === "GET" && statusLogsMatch) {
    const id = Number(statusLogsMatch[1]);
    const logs = store.statusLogs.filter(l => l.orderId === id).sort((a, b) => a.id - b.id);
    return ok(logs);
  }

  // GET /api/customers
  if (method === "GET" && path.startsWith("/api/customers") && !path.match(/\/api\/customers\/\d+/)) {
    const q = new URL(url, "http://x").searchParams.get("q");
    if (q) {
      const ql = q.toLowerCase();
      return ok(store.customers.filter(c =>
        c.name.toLowerCase().includes(ql) || c.phone.includes(ql) || (c.email ?? "").toLowerCase().includes(ql)
      ));
    }
    return ok(store.customers);
  }

  // GET /api/customers/:id
  const customerMatch = path.match(/^\/api\/customers\/(\d+)$/);
  if (method === "GET" && customerMatch) {
    const id = Number(customerMatch[1]);
    const customer = store.customers.find(c => c.id === id);
    if (!customer) return err(404, "Customer not found");
    const customerOrders = store.orders.filter(o => o.phone === customer.phone).sort((a, b) => b.id - a.id);
    const active = customerOrders.filter(o => o.appointmentStatus !== "cancelled");
    return ok({
      customer,
      orders: customerOrders,
      stats: {
        totalSpent: active.reduce((s, o) => s + o.totalPrice, 0),
        orderCount: active.length,
        customerSince: customer.createdAt,
      },
      lastOrder: customerOrders[0] ?? null,
    });
  }

  // POST /api/customers
  if (method === "POST" && path === "/api/customers") {
    const c = store.createCustomer({ ...body });
    return new Response(JSON.stringify(c), { status: 201, headers: { "Content-Type": "application/json" } });
  }

  // GET /api/staff
  if (method === "GET" && path === "/api/staff") {
    return ok([...store.staffMembers].sort((a, b) => a.rank - b.rank));
  }

  // GET /api/income
  if (method === "GET" && path === "/api/income") {
    const user = store.users.find(u => u.username === "mai");
    if (!user) return err(404, "User not found");
    const { password: _, ...safeUser } = user;
    const txs = store.transactions.filter(t => t.userId === user.id);
    const completed = txs.filter(t => t.status === "Hoàn tất");
    const pending = txs.filter(t => t.status !== "Hoàn tất");
    return ok({
      user: safeUser,
      transactions: txs,
      summary: {
        estimatedCommission: txs.reduce((s, t) => s + t.commission, 0),
        actualCommission: completed.reduce((s, t) => s + t.commission, 0),
        pendingCommission: pending.reduce((s, t) => s + t.commission, 0),
        totalRevenue: user.currentRevenue,
        totalDeals: txs.length,
        completedDeals: completed.length,
      },
      kpiMilestones: [
        { label: "Mốc 1", target: 15000000, bonus: 500000, reached: user.currentRevenue >= 15000000 },
        { label: "Mốc 2", target: 30000000, bonus: 1500000, reached: user.currentRevenue >= 30000000 },
        { label: "Mốc 3", target: 40000000, bonus: 3000000, reached: user.currentRevenue >= 40000000 },
        { label: "Mốc 4", target: 50000000, bonus: 5000000, reached: user.currentRevenue >= 50000000 },
      ],
    });
  }

  // GET /api/dashboard
  if (method === "GET" && path === "/api/dashboard") {
    const user = store.users.find(u => u.username === "mai");
    if (!user) return err(404, "User not found");
    const { password: _, ...safeUser } = user;
    const userOrders = store.orders.filter(o => o.userId === user.id).sort((a, b) => b.id - a.id);
    return ok({
      user: safeUser,
      recentOrders: userOrders.slice(0, 4),
      pendingOrdersCount: userOrders.filter(o => o.appointmentStatus === "pending").length,
      leaderboard: [...store.staffMembers].sort((a, b) => a.rank - b.rank),
    });
  }

  // GET /api/search
  if (method === "GET" && path === "/api/search") {
    const q = (new URL(url, "http://x").searchParams.get("q") ?? "").trim().toLowerCase();
    if (!q) return ok({ services: [], customers: [], orders: [] });
    return ok({
      services: store.services.filter(s => s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.category ?? "").toLowerCase().includes(q)).slice(0, 5),
      customers: store.customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email ?? "").toLowerCase().includes(q)).slice(0, 5),
      orders: store.orders.filter(o => o.code.toLowerCase().includes(q) || o.patientName.toLowerCase().includes(q) || o.serviceName.toLowerCase().includes(q)).slice(0, 5),
    });
  }

  return null;
}

export function installMockApi() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    const result = await handleRequest(url, init ?? (input instanceof Request ? { method: input.method, body: init?.body } : undefined));
    if (result !== null) return result;
    return originalFetch(input, init);
  };
}
