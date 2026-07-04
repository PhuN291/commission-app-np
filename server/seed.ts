import { storage } from "./storage";
import type { InsertVoucher } from "@shared/schema";
import { db } from "./db";
import { autoRules, payCycleSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Seed cài đặt mặc định Auto Rule + Kì lương (idempotent). Chạy độc lập, không tạo
 * trùng khi seed lại (guard theo key auto_rule + theo dòng singleton pay_cycle).
 */
async function seedSettings() {
  const rule = await db.select().from(autoRules).where(eq(autoRules.key, "target_bonus")).limit(1);
  if (rule.length === 0) {
    await db.insert(autoRules).values({ key: "target_bonus", active: true, targetPct: 100, bonusPct: 5 });
  }
  const pc = await db.select().from(payCycleSettings).limit(1);
  if (pc.length === 0) {
    await db.insert(payCycleSettings).values({ deadlineDay: 5, capWarningPct: 10 });
  }
}

/**
 * Seed mã giảm giá. Chạy độc lập với seed users (DB cũ vẫn được seed voucher).
 * Idempotent: bỏ qua nếu đã có voucher trong DB.
 */
async function seedVouchers() {
  const existing = await storage.listVouchers();
  if (existing.length > 0) return;

  const rows: InsertVoucher[] = [
    { code: "TAIKHAM5", discountType: "percent", value: 5, maxDiscount: null, minOrder: 0, minServices: 0, description: "Khách tái khám trong 30 ngày", usedCount: 0, usageLimit: 0, startDate: "2026-01-01", endDate: "2026-12-31", active: true },
    { code: "COMBO10", discountType: "percent", value: 10, maxDiscount: null, minOrder: 0, minServices: 2, description: "Đơn từ 2 dịch vụ trở lên", usedCount: 0, usageLimit: 0, startDate: "2026-01-01", endDate: "2026-12-31", active: true },
    { code: "WELCOME20", discountType: "percent", value: 20, maxDiscount: 500000, minOrder: 1000000, minServices: 0, description: "Giảm 20% cho khách hàng mới", usedCount: 12, usageLimit: 50, startDate: "2026-01-01", endDate: "2026-06-30", active: true },
    { code: "VIP10", discountType: "percent", value: 10, maxDiscount: 300000, minOrder: 2000000, minServices: 0, description: "Ưu đãi khách VIP", usedCount: 5, usageLimit: 100, startDate: "2026-02-01", endDate: "2026-12-31", active: true },
    { code: "FLAT100K", discountType: "fixed", value: 100000, maxDiscount: null, minOrder: 500000, minServices: 0, description: "Giảm thẳng 100.000đ", usedCount: 30, usageLimit: 30, startDate: "2026-01-15", endDate: "2026-03-31", active: false },
  ];
  for (const r of rows) await storage.createVoucher(r);
}

/**
 * Gắn recall_due_date vào order_items của vài đơn demo, để ngày tái khám hiện trên
 * hồ sơ khách được tính từ ca khám thật: MIN(order_items.recall_due_date) — không phải
 * seed cứng customer.next_recall_due_at.
 *
 * Idempotent + chạy độc lập early-return guard (DB cũ cũng được nâng cấp): dùng sự tồn
 * tại của đơn sentinel #NP260613001 (do hàm này tạo) làm cờ "đã seed".
 */
async function seedRecallItems() {
  if (await storage.getOrderByCode("#NP260613001")) return; // đã seed → bỏ qua

  const users = await storage.getAllUsers();
  const mainUser = users.find((u) => u.role === "sale") ?? users[0];
  if (!mainUser) return; // chưa có user → để lần seed sau

  const services = await storage.getAllServices();
  const svcId = (code: string) => services.find((s) => s.code === code)?.id ?? 1;

  // Gắn 1 order_item kèm recallDueDate vào đơn (tìm theo code), bỏ qua nếu không có đơn.
  async function addRecallItem(orderCode: string, recallDueDate: string) {
    const order = await storage.getOrderByCode(orderCode);
    if (!order) return;
    await storage.createOrderItem({
      orderId: order.id,
      serviceId: svcId(order.serviceCode),
      serviceName: order.serviceName,
      quantity: 1,
      unitPrice: order.unitPrice,
      cost: 0,
      status: "completed",
      skippedReason: null,
      performedByUserId: null,
      recallDueDate,
      refundedAmount: 0,
    });
  }

  // Trần Văn An (0901234567): đơn cũ y lệnh tái khám xa (15/09) + đơn mới tái khám gần
  // (25/06) → hồ sơ phải hiện ngày GẦN NHẤT = 25/06/2026.
  await addRecallItem("#NP260213001", "2026-09-15");
  const follow = await storage.createOrder({
    code: "#NP260613001",
    patientName: "Trần Văn An",
    phone: "0901234567",
    email: "tranvanan@gmail.com",
    serviceName: "Tái khám Tim mạch",
    serviceCode: "DV-007",
    serviceCategory: "Tim mạch",
    quantity: 1,
    unitPrice: 600000,
    totalPrice: 600000,
    commission: 30000,
    appointmentStatus: "confirmed",
    notes: "",
    appointmentDate: "25/06/2026",
    appointmentTime: "09:00",
    examType: "Khám tại phòng khám",
    createdAt: "13/06/2026 09:00",
    userId: mainUser.id,
  });
  await storage.createOrderItem({
    orderId: follow.id,
    serviceId: svcId("DV-007"),
    serviceName: "Tái khám Tim mạch",
    quantity: 1,
    unitPrice: 600000,
    cost: 0,
    status: "completed",
    skippedReason: null,
    performedByUserId: null,
    recallDueDate: "2026-06-25",
    refundedAmount: 0,
  });

  // Lê Thị Bình (0912345678): 1 đơn có y lệnh tái khám đã quá hạn (08/06) → minh hoạ
  // đếm "tái khám đến hạn" trên Dashboard + notif nhắc tái khám.
  await addRecallItem("#NP260213002", "2026-06-08");

  console.log("Seeded recall order_items — ngày tái khám nay tính từ order_items.");
}

/**
 * Gán nhân viên chăm gốc cho vài khách demo để thử lọc quyền worklist tái khám.
 * Idempotent (chỉ set khi đang null) + chạy độc lập early-return guard (nâng cấp DB cũ).
 * Trần Văn An (0901234567) ← Mai (sale). Lê Thị Bình (0912345678) ← Trang (sale khác)
 * để Mai không thấy lượt của Bình, còn trưởng ca thấy hết.
 */
async function seedRecallAssignees() {
  const users = await storage.getAllUsers();
  const customers = await storage.getAllCustomers();
  const userByName = (username: string) => users.find((u) => u.username === username);
  const custByPhone = (phone: string) => customers.find((c) => c.phone === phone);

  const pairs: Array<{ phone: string; username: string }> = [
    { phone: "0901234567", username: "mai" }, // Trần Văn An ← Mai
    { phone: "0912345678", username: "trang" }, // Lê Thị Bình ← Trang
  ];
  for (const { phone, username } of pairs) {
    const cust = custByPhone(phone);
    const user = userByName(username);
    if (cust && user && !cust.primaryAssignedUserId) {
      await storage.setCustomerPrimaryAssignee(cust.id, user.id);
    }
  }
}

/**
 * Seed thưởng/phạt thật + 1 truy thu thật cho Mai (demo Phần 5 — dữ liệu thật, không
 * còn theo chẵn/lẻ id). Idempotent: chỉ tạo khi Mai chưa có trong kỳ hiện tại.
 */
async function seedRealAdjustmentsAndClawback() {
  const users = await storage.getAllUsers();
  const mai = users.find((u) => u.username === "mai");
  if (!mai) return;
  const ceo = users.find((u) => u.role === "ceo");
  const now = new Date();
  const cycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Thưởng/phạt APPROVED — chỉ seed nếu Mai chưa có adjustment nào trong kỳ.
  const existingAdj = (await storage.listAllAdjustmentsForCycle(cycle)).filter((a) => a.userId === mai.id);
  if (existingAdj.length === 0) {
    await storage.createAdjustment({
      userId: mai.id, cycleId: cycle, type: "thuong", amount: 200_000,
      reason: "Đạt chỉ tiêu tháng", source: "auto_rule", status: "APPROVED",
      createdByUserId: ceo?.id ?? null, approvedByUserId: ceo?.id ?? null, approvedAt: now,
      parentAdjustmentId: null,
    });
    await storage.createAdjustment({
      userId: mai.id, cycleId: cycle, type: "phat", amount: -150_000,
      reason: "Tư vấn sai gói cho khách hàng 1234", source: "manual", status: "APPROVED",
      createdByUserId: ceo?.id ?? null, approvedByUserId: ceo?.id ?? null, approvedAt: now,
      parentAdjustmentId: null,
    });
  }

  // Truy thu — 1 CR CLAWBACK_PENDING cho Mai nếu chưa có.
  const existingCb = await storage.listClawbacksForUser(mai.id, cycle);
  if (existingCb.length === 0) {
    const maiOrders = await storage.getOrdersByUser(mai.id);
    const ord = maiOrders[0];
    if (ord) {
      await storage.createCommissionRecord({
        orderId: ord.id, roleAssignmentId: null, userId: mai.id, cycleId: cycle,
        baseNetProfit: 0, pctBp: 0, amount: -30_000, status: "CLAWBACK_PENDING",
        parentCrId: null, rejectedAt: null,
        rejectedReason: "Refund 1 phần đơn cũ, kì gốc đã chốt lương",
      });
    }
  }
}

export async function seedDatabase() {
  try {
    // Voucher seed chạy độc lập (idempotent) — DB cũ đã có users vẫn được seed mã.
    await seedVouchers();
    // Cài đặt mặc định Auto Rule + Kì lương (idempotent) — chạy cả trên DB đã có users.
    await seedSettings();

    const existingUsers = await storage.getAllUsers();
    if (existingUsers.length > 0) {
      // DB đã có users: vẫn nâng cấp recall items + người chăm gốc + thưởng/phạt (idempotent).
      await seedRecallItems();
      await seedRecallAssignees();
      await seedRealAdjustmentsAndClawback();
      return;
    }

    await storage.createService({ code: "DV-001", title: "Thủ thuật y khoa", description: "Thực hiện các thủ thuật can thiệp lâm sàng nhanh chóng theo chỉ định của bác sĩ.", price: 350000, commissionRange: "50.000 - 200.000", requiresDoctor: true, duration: "15-30 phút", insurance: "Có hỗ trợ", category: "Thủ thuật", diseaseType: "Tổng quát" });
    await storage.createService({ code: "DV-002", title: "Nội soi tiêu hóa", description: "Thực hiện nội soi dạ dày, đại tràng bằng công nghệ hiện đại, không đau, phát hiện sớm ung thư.", price: 2500000, commissionRange: "150.000 - 500.000", requiresDoctor: true, duration: "45-60 phút", insurance: "Có hỗ trợ", category: "Nội soi", diseaseType: "Tiêu hóa" });
    await storage.createService({ code: "DV-003", title: "Xét nghiệm chất gây nghiện", description: "Kiểm tra nhanh và chính xác sự hiện diện của các chất kích thích trong cơ thể.", price: 200000, commissionRange: "30.000 - 100.000", requiresDoctor: false, duration: "10-20 phút", insurance: "Không hỗ trợ", category: "Xét nghiệm", diseaseType: "Chất kích thích" });
    await storage.createService({ code: "DV-004", title: "Khám sức khỏe Nam/Nữ giới", description: "Gói khám sức khỏe chuyên biệt được thiết kế riêng cho các đặc điểm sinh lý của Nam giới và Nữ giới.", price: 800000, commissionRange: "100.000 - 300.000", requiresDoctor: true, duration: "30-45 phút", insurance: "Có hỗ trợ", category: "Khám tổng quát", diseaseType: "Tổng quát" });
    await storage.createService({ code: "DV-005", title: "Chẩn đoán Lupus", description: "Xét nghiệm chuyên biệt chẩn đoán bệnh tự miễn Lupus ban đỏ hệ thống và các bệnh lý liên quan.", price: 600000, commissionRange: "80.000 - 250.000", requiresDoctor: true, duration: "20-30 phút", insurance: "Có hỗ trợ", category: "Chẩn đoán", diseaseType: "Miễn dịch" });
    await storage.createService({ code: "DV-006", title: "Sàng lọc lây nhiễm từ Mẹ sang Thai nhi", description: "Kiểm tra các tác nhân gây bệnh truyền nhiễm có thể lây sang bé trong quá trình mang thai.", price: 1500000, commissionRange: "120.000 - 400.000", requiresDoctor: true, duration: "15-25 phút", insurance: "Có hỗ trợ", category: "Sàng lọc", diseaseType: "Sinh sản" });
    await storage.createService({ code: "DV-007", title: "Tầm soát Tim mạch chuyên sâu", description: "Đánh giá chức năng tim, mạch máu và tầm soát nguy cơ đột quỵ, xơ vữa động mạch bằng kỹ thuật hiện đại.", price: 4500000, commissionRange: "200.000 - 600.000", requiresDoctor: true, duration: "60-90 phút", insurance: "Có hỗ trợ", category: "Tầm soát", diseaseType: "Tim mạch" });
    await storage.createService({ code: "DV-008", title: "Gói khám tổng quát", description: "Tổng hợp các gói khám Bạc, Vàng, Kim cương giúp tầm soát sức khỏe toàn diện từ cơ bản đến cao cấp.", price: 3500000, commissionRange: "300.000 - 1.500.000", requiresDoctor: false, duration: "120-180 phút", insurance: "Có hỗ trợ", category: "Khám tổng quát", diseaseType: "Tổng quát" });
    await storage.createService({ code: "DV-009", title: "Kiểm tra chức năng Gan", description: "Xét nghiệm virus viêm gan và đánh giá men gan, chức năng giải độc gan định kỳ.", price: 350000, commissionRange: "40.000 - 150.000", requiresDoctor: true, duration: "15-20 phút", insurance: "Có hỗ trợ", category: "Xét nghiệm", diseaseType: "Gan" });
    await storage.createService({ code: "DV-010", title: "Khám Tiền hôn nhân", description: "Kiểm tra sức khỏe sinh sản và di truyền cho các cặp đôi trước khi xây dựng tổ ấm.", price: 2000000, commissionRange: "150.000 - 450.000", requiresDoctor: false, duration: "60-90 phút", insurance: "Không hỗ trợ", category: "Khám tổng quát", diseaseType: "Sinh sản" });

    // ── Test users đa role để verify permission matrix B5-2 ─────────
    // Login với SĐT các phone bên dưới + OTP `123456` (dev override).

    const mainUser = await storage.createUser({
      username: "mai",
      password: "",
      phone: "0901234567",
      name: "Nguyễn Thị Mai",
      role: "sale",
      ranking: "M2",
      department: "Phòng Kinh Doanh",
      targetRevenue: 50000000,
      currentRevenue: 35000000,
      commissionRate: 5,
      monthlyTargetHh: 5000000,
      monthlyTargetOrders: 30,
    });

    // CEO — full quyền admin
    const ceoUser = await storage.createUser({
      username: "phu",
      password: "",
      phone: "0900000001",
      name: "Phú Nguyễn",
      role: "ceo",
      department: "Ban Giám đốc",
      ranking: null,
      monthlyTargetHh: 0,
      monthlyTargetOrders: 0,
    });

    // ── Seed default commission tiers (B4 R-1-2) ──────────────────
    // Sale: M0=2%, M1=3%, M2=5%, M3=8%
    // TC: flat 2%
    // Doctor: L1=3%, L2=5%, L3=8%
    const tierDefaults: Array<{ role: string; ranking: string | null; percentBp: number }> = [
      { role: "sale", ranking: "M0", percentBp: 200 },
      { role: "sale", ranking: "M1", percentBp: 300 },
      { role: "sale", ranking: "M2", percentBp: 500 },
      { role: "sale", ranking: "M3", percentBp: 800 },
      { role: "tc", ranking: null, percentBp: 200 },
      { role: "doctor", ranking: "L1", percentBp: 300 },
      { role: "doctor", ranking: "L2", percentBp: 500 },
      { role: "doctor", ranking: "L3", percentBp: 800 },
    ];
    for (const t of tierDefaults) {
      await storage.upsertCommissionTier({ ...t, createdByUserId: ceoUser.id });
    }

    // TC — view + mark offboarding
    await storage.createUser({
      username: "tuyet",
      password: "",
      phone: "0900000002",
      name: "Lê Thị Tuyết",
      role: "tc",
      department: "Phòng Khám",
      ranking: null,
      monthlyTargetHh: 0,
      monthlyTargetOrders: 0,
    });

    // BS — có iHOS User ID (required)
    await storage.createUser({
      username: "bsminh",
      password: "",
      phone: "0900000003",
      name: "Trần Minh",
      role: "doctor",
      ranking: "L2",
      ihosUserId: "iHOS-12345",
      department: "Phòng Khám",
      monthlyTargetHh: 8000000,
      monthlyTargetOrders: 40,
    });

    // Sale pending offboarding — test handover warning
    await storage.createUser({
      username: "trang",
      password: "",
      phone: "0900000004",
      name: "Hoàng Thị Trang",
      role: "sale",
      ranking: "M0",
      department: "Phòng Kinh Doanh",
      status: "pending_offboarding",
      offboardingDate: "2026-05-30",
      monthlyTargetHh: 3000000,
      monthlyTargetOrders: 15,
    });

    // KT (Diễm) — duyệt CR + tạo adjustment, không có HH per đơn (R-1-2)
    await storage.createUser({
      username: "diem",
      password: "",
      phone: "0900000006",
      name: "Trần Diễm",
      role: "kt",
      department: "Phòng Kế toán",
      ranking: null,
      monthlyTargetHh: 0,
      monthlyTargetOrders: 0,
    });

    // Sale offboarded — chỉ hiện ở tab "Đã nghỉ"
    await storage.createUser({
      username: "linh",
      password: "",
      phone: "0900000005",
      name: "Phạm Thị Linh",
      role: "sale",
      ranking: "M1",
      department: "Phòng Kinh Doanh",
      status: "offboarded",
      offboardingDate: "2026-04-15",
      monthlyTargetHh: 0,
      monthlyTargetOrders: 0,
    });

    // Order 1: arrived + visit completed
    // Order 1: REFUND_PARTIAL demo (B5-3 Section 2 — strikethrough giá + badge)
    await storage.createOrder({ code: "#NP260213001", patientName: "Trần Văn An", phone: "0901234567", email: "tranvanan@gmail.com", serviceName: "Siêu âm Doppler Tim", serviceCode: "DV-007", serviceCategory: "Tim mạch", quantity: 1, unitPrice: 500000, totalPrice: 500000, commission: 25000, appointmentStatus: "arrived", visitStatus: "completed", notes: "", appointmentDate: "26/02/2026", appointmentTime: "08:30", examType: "Khám tại phòng khám", createdAt: "13/02/2026 08:30", userId: mainUser.id, refundAmount: 200000, refundType: "partial", refundReason: "Khách yêu cầu hoàn 1 dịch vụ" });
    // Order 2: arrived + visit completed
    await storage.createOrder({ code: "#NP260213002", patientName: "Lê Thị Bình", phone: "0912345678", email: "lethibinh@gmail.com", serviceName: "Xét nghiệm Tổng quát", serviceCode: "DV-008", serviceCategory: "Xét nghiệm", quantity: 1, unitPrice: 1200000, totalPrice: 1200000, commission: 60000, appointmentStatus: "arrived", visitStatus: "completed", notes: "Khách VIP", appointmentDate: "26/02/2026", appointmentTime: "09:15", examType: "Lấy mẫu tại nhà", createdAt: "13/02/2026 09:15", userId: mainUser.id });
    // Order 3: pending (mới tạo)
    await storage.createOrder({ code: "#NP260213003", patientName: "Phạm Hồng Chương", phone: "0923456789", serviceName: "Khám sức khỏe Nam/Nữ giới", serviceCode: "DV-004", serviceCategory: "Khám tổng quát", quantity: 1, unitPrice: 800000, totalPrice: 800000, commission: 40000, appointmentStatus: "pending", appointmentDate: "28/02/2026", appointmentTime: "10:00", examType: "Khám tại phòng khám", createdAt: "13/02/2026 10:00", userId: mainUser.id });
    // Order 4: cancelled
    // Order 4: REFUND_FULL demo — strikethrough toàn đơn
    await storage.createOrder({ code: "#NP260214001", patientName: "Nguyễn Thị Diệu", phone: "0934567890", email: "nguyendieu@gmail.com", serviceName: "Nội soi tiêu hóa", serviceCode: "DV-002", serviceCategory: "Nội soi", quantity: 1, unitPrice: 2500000, totalPrice: 2500000, commission: 125000, appointmentStatus: "cancelled", notes: "Khách hủy do bận", createdAt: "14/02/2026 14:30", userId: mainUser.id, refundAmount: 2500000, refundType: "full", refundReason: "Khách hủy lịch trước khi khám" });
    // Order 5: arrived + visit in_progress
    await storage.createOrder({ code: "#NP260214002", patientName: "Hoàng Văn Em", phone: "0945678901", serviceName: "Gói khám tổng quát", serviceCode: "DV-008", serviceCategory: "Khám tổng quát", quantity: 2, unitPrice: 3500000, totalPrice: 7000000, commission: 350000, appointmentStatus: "arrived", visitStatus: "in_progress", appointmentDate: "20/02/2026", appointmentTime: "15:45", examType: "Khám tại phòng khám", createdAt: "14/02/2026 15:45", userId: mainUser.id });
    // Order 6: confirmed
    await storage.createOrder({ code: "#NP260215001", patientName: "Vũ Minh Phúc", phone: "0956789012", email: "vuminhphuc@gmail.com", serviceName: "Tầm soát Tim mạch chuyên sâu", serviceCode: "DV-007", serviceCategory: "Tim mạch", quantity: 1, unitPrice: 4500000, totalPrice: 4500000, commission: 225000, appointmentStatus: "confirmed", appointmentDate: "01/03/2026", appointmentTime: "09:00", examType: "Khám tại phòng khám", createdAt: "15/02/2026 09:00", userId: mainUser.id });
    // Order 7: reminded
    await storage.createOrder({ code: "#NP260220001", patientName: "Đặng Thu Hương", phone: "0967890123", email: "danghuong@gmail.com", serviceName: "Khám Tiền hôn nhân", serviceCode: "DV-010", serviceCategory: "Khám tổng quát", quantity: 2, unitPrice: 2000000, totalPrice: 4000000, commission: 200000, appointmentStatus: "reminded", appointmentDate: "22/02/2026", appointmentTime: "10:30", examType: "Khám tại phòng khám", createdAt: "20/02/2026 10:30", userId: mainUser.id });
    // Order 8: no_show
    await storage.createOrder({ code: "#NP260225001", patientName: "Bùi Quang Hải", phone: "0978901234", serviceName: "Kiểm tra chức năng Gan", serviceCode: "DV-009", serviceCategory: "Xét nghiệm", quantity: 1, unitPrice: 350000, totalPrice: 350000, commission: 17500, appointmentStatus: "no_show", notes: "Khám lần đầu", examType: "Lấy mẫu tại nhà", createdAt: "25/02/2026 08:00", userId: mainUser.id });

    // Seed status logs for orders that went through multiple steps
    await storage.createStatusLog({ orderId: 1, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "13/02/2026 09:00", note: null });
    await storage.createStatusLog({ orderId: 1, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "25/02/2026 18:00", note: "Đã gọi nhắc lịch" });
    await storage.createStatusLog({ orderId: 1, tier: "appointment", fromStatus: "reminded", toStatus: "arrived", timestamp: "26/02/2026 08:25", note: null });
    await storage.createStatusLog({ orderId: 1, tier: "visit", fromStatus: "arrived", toStatus: "in_progress", timestamp: "26/02/2026 08:35", note: null });
    await storage.createStatusLog({ orderId: 1, tier: "visit", fromStatus: "in_progress", toStatus: "completed", timestamp: "26/02/2026 09:10", note: null });
    await storage.createStatusLog({ orderId: 2, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "14/02/2026 10:00", note: null });
    await storage.createStatusLog({ orderId: 2, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "25/02/2026 17:00", note: null });
    await storage.createStatusLog({ orderId: 2, tier: "appointment", fromStatus: "reminded", toStatus: "arrived", timestamp: "26/02/2026 09:10", note: null });
    await storage.createStatusLog({ orderId: 2, tier: "visit", fromStatus: "arrived", toStatus: "in_progress", timestamp: "26/02/2026 09:20", note: null });
    await storage.createStatusLog({ orderId: 2, tier: "visit", fromStatus: "in_progress", toStatus: "completed", timestamp: "26/02/2026 10:00", note: null });
    await storage.createStatusLog({ orderId: 4, tier: "appointment", fromStatus: "pending", toStatus: "cancelled", timestamp: "14/02/2026 15:00", note: "Khách hủy do bận" });
    await storage.createStatusLog({ orderId: 5, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "15/02/2026 08:00", note: null });
    await storage.createStatusLog({ orderId: 5, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "19/02/2026 16:00", note: null });
    await storage.createStatusLog({ orderId: 5, tier: "appointment", fromStatus: "reminded", toStatus: "arrived", timestamp: "20/02/2026 15:40", note: null });
    await storage.createStatusLog({ orderId: 5, tier: "visit", fromStatus: "arrived", toStatus: "in_progress", timestamp: "20/02/2026 15:50", note: null });
    await storage.createStatusLog({ orderId: 6, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "16/02/2026 10:00", note: null });
    await storage.createStatusLog({ orderId: 7, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "20/02/2026 11:00", note: null });
    await storage.createStatusLog({ orderId: 7, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "21/02/2026 18:00", note: "Đã nhắn tin Zalo" });
    await storage.createStatusLog({ orderId: 8, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "25/02/2026 09:00", note: null });
    await storage.createStatusLog({ orderId: 8, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "10/03/2026 17:00", note: null });
    await storage.createStatusLog({ orderId: 8, tier: "appointment", fromStatus: "reminded", toStatus: "no_show", timestamp: "11/03/2026 10:00", note: "Không liên lạc được" });

    // Ngày tái khám KHÔNG seed cứng trên customer nữa (để null). Giá trị hiện trên
    // hồ sơ được tính từ ca khám thật: MIN(order_items.recall_due_date) — xem
    // seedRecallItems() bên dưới gắn recallDueDate vào item của vài đơn demo.
    await storage.createCustomer({ name: "Trần Văn An", phone: "0901234567", email: "tranvanan@gmail.com", address: "123 Nguyễn Huệ, Quận 1", location: "TP. Hồ Chí Minh", createdAt: "01/01/2026" });
    await storage.createCustomer({ name: "Lê Thị Bình", phone: "0912345678", email: "lethibinh@gmail.com", address: "456 Lê Lợi, Quận 3", location: "TP. Hồ Chí Minh", createdAt: "05/01/2026" });
    await storage.createCustomer({ name: "Phạm Hồng Chương", phone: "0923456789", address: "789 Trần Hưng Đạo, Quận 5", location: "TP. Hồ Chí Minh", createdAt: "10/01/2026" });
    await storage.createCustomer({ name: "Nguyễn Thị Diệu", phone: "0934567890", email: "nguyendieu@gmail.com", address: "12 Hoàng Diệu, Hải Châu", location: "Đà Nẵng", createdAt: "12/01/2026" });
    await storage.createCustomer({ name: "Hoàng Văn Em", phone: "0945678901", address: "34 Nguyễn Trãi, Ba Đình", location: "Hà Nội", createdAt: "15/01/2026" });
    await storage.createCustomer({ name: "Vũ Minh Phúc", phone: "0956789012", email: "vuminhphuc@gmail.com", address: "56 Lý Thường Kiệt, Tân Bình", location: "TP. Hồ Chí Minh", createdAt: "20/01/2026" });
    await storage.createCustomer({ name: "Đặng Thu Hương", phone: "0967890123", email: "danghuong@gmail.com", address: "78 Pasteur, Quận 1", location: "TP. Hồ Chí Minh", createdAt: "25/01/2026" });
    await storage.createCustomer({ name: "Bùi Quang Hải", phone: "0978901234", address: "90 Hai Bà Trưng, Hoàn Kiếm", location: "Hà Nội", createdAt: "01/02/2026" });

    await storage.createStaffMember({ name: "Trần Hữu Đạt", role: "BS. Trưởng Khoa", revenue: 85000000, commission: 4250000, rank: 1 });
    await storage.createStaffMember({ name: "Lê Hoàng Yến", role: "CV. Tư vấn", revenue: 42000000, commission: 2100000, rank: 2 });
    await storage.createStaffMember({ name: "Nguyễn Thị Mai", role: "CV. Tư vấn", revenue: 35000000, commission: 1750000, rank: 3 });
    await storage.createStaffMember({ name: "Phạm Quốc Bảo", role: "BS. Chuyên khoa", revenue: 28000000, commission: 1400000, rank: 4 });
    await storage.createStaffMember({ name: "Võ Thanh Tâm", role: "CV. Tư vấn", revenue: 22000000, commission: 1100000, rank: 5 });
    await storage.createStaffMember({ name: "Đỗ Ngọc Hân", role: "ĐD. Trưởng", revenue: 18000000, commission: 900000, rank: 6 });
    await storage.createStaffMember({ name: "Lý Minh Tuấn", role: "CV. Tư vấn", revenue: 15000000, commission: 750000, rank: 7 });
    await storage.createStaffMember({ name: "Huỳnh Thị Lan", role: "ĐD. Chăm sóc", revenue: 12000000, commission: 600000, rank: 8 });

    // DB mới: tạo recall items + gán người chăm gốc sau khi đã có đơn/khách mẫu.
    await seedRecallItems();
    await seedRecallAssignees();
    await seedRealAdjustmentsAndClawback();

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}
