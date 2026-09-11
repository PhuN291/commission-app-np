/**
 * Analytics tổng quan — tính toàn bộ số liệu màn "Phân tích tổng quan" từ dữ liệu
 * thật (orders, order_items, commission_records, customers, services) theo kỳ.
 *
 * Quy ước (thống nhất với màn thu nhập + bảng xếp hạng):
 * - Kỳ 'YYYY-MM' lấy từ order.createdAt ('DD/MM/YYYY HH:mm'), cùng cách như engine.
 * - Doanh thu thực thu 1 đơn: CHỈ đơn khám xong (visitStatus='completed');
 *   = totalListed - insuranceAmount - voucherAmount - refundAmount.
 * - Hoa hồng gross: tổng amount commission_records có status thuộc GROSS (loại
 *   từ chối/hủy/truy thu) — dùng isGrossCommission().
 * - Tiền là số nguyên đồng.
 */

import type { Order } from "@shared/schema";
import { isGrossCommission } from "@shared/types";
import { deriveOrderStatus, ORDER_STATUS_LABEL, type OrderStatusCode } from "@shared/status";
import { storage } from "./storage";

/** order.createdAt ('DD/MM/YYYY HH:mm') → 'YYYY-MM'; null nếu định dạng lạ. */
export function orderCycle(createdAt: string | null): string | null {
  try {
    const datePart = (createdAt ?? "").trim().split(" ")[0]; // 'DD/MM/YYYY'
    const [, mm, yyyy] = datePart.split("/");
    if (yyyy && mm && /^\d{4}$/.test(yyyy) && /^\d{1,2}$/.test(mm)) {
      return `${yyyy}-${mm.padStart(2, "0")}`;
    }
  } catch {
    // rơi xuống null
  }
  return null;
}

/** Kỳ liền trước của một kỳ 'YYYY-MM'. */
function prevCycleOf(cycle: string): string {
  const [y, m] = cycle.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Số ngày trong tháng của kỳ. */
function daysInCycle(cycle: string): number {
  const [y, m] = cycle.split("-").map(Number);
  return new Date(y, m, 0).getDate(); // ngày 0 của tháng sau = ngày cuối tháng này
}

/** Ngày trong tháng từ createdAt ('DD/MM/...'); null nếu lạ. */
function dayOfOrder(createdAt: string | null): number | null {
  const dd = (createdAt ?? "").trim().split(" ")[0].split("/")[0];
  const n = Number(dd);
  return Number.isFinite(n) && n >= 1 && n <= 31 ? n : null;
}

/**
 * Doanh thu thực thu 1 đơn (0 nếu chưa khám xong).
 *
 * totalListed chỉ được ghi bởi ingestOrderDerived nên đơn tạo trước đó để 0. Lấy
 * thẳng cột đó thì đơn cũ có hoàn tiền ra số ÂM (đơn 1: 0 - 200.000), kéo doanh thu
 * cả kỳ và giá trị trung bình đơn xuống âm theo. Rơi về totalPrice khi chưa có.
 */
export function orderRealRevenue(o: Order): number {
  if (o.visitStatus !== "completed") return 0;
  const goc = o.totalListed > 0 ? o.totalListed : o.totalPrice;
  return Math.max(0, goc - o.insuranceAmount - o.voucherAmount - o.refundAmount);
}

/** Tăng trưởng % so kỳ trước; null khi kỳ trước = 0 (không có nền so sánh). */
function trendPct(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

/** Làm tròn 1 chữ số thập phân (cho %). */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Bốn KPI gốc của 1 kỳ (chưa kèm % thay đổi). */
function cycleKpis(allOrders: Order[], cycle: string) {
  const inCycle = allOrders.filter((o) => orderCycle(o.createdAt) === cycle);
  const completed = inCycle.filter((o) => o.visitStatus === "completed");
  const doanhThuThucThu = completed.reduce((s, o) => s + orderRealRevenue(o), 0);
  const soDonHoanThanh = completed.length;
  const giaTriTbDon = soDonHoanThanh > 0 ? Math.round(doanhThuThucThu / soDonHoanThanh) : 0;
  const tongDonTao = inCycle.length;
  const tyLeChot = tongDonTao > 0 ? round1((soDonHoanThanh / tongDonTao) * 100) : 0;
  return { doanhThuThucThu, soDonHoanThanh, giaTriTbDon, tyLeChot };
}

export async function getAnalyticsOverview(cycle: string) {
  const allOrders = await storage.getAllOrders();
  const allServices = await storage.getAllServices();
  const prevCycle = prevCycleOf(cycle);

  // ── 1. KPI kèm % thay đổi so kỳ trước ──
  const cur = cycleKpis(allOrders, cycle);
  const prev = cycleKpis(allOrders, prevCycle);
  const kpis = {
    doanhThuThucThu: { value: cur.doanhThuThucThu, changePct: trendPct(cur.doanhThuThucThu, prev.doanhThuThucThu) },
    soDonHoanThanh: { value: cur.soDonHoanThanh, changePct: trendPct(cur.soDonHoanThanh, prev.soDonHoanThanh) },
    giaTriTbDon: { value: cur.giaTriTbDon, changePct: trendPct(cur.giaTriTbDon, prev.giaTriTbDon) },
    tyLeChot: { value: cur.tyLeChot, changePct: trendPct(cur.tyLeChot, prev.tyLeChot) },
  };

  const completedCur = allOrders.filter((o) => orderCycle(o.createdAt) === cycle && o.visitStatus === "completed");
  const completedPrev = allOrders.filter((o) => orderCycle(o.createdAt) === prevCycle && o.visitStatus === "completed");

  // ── 2. Doanh thu theo ngày (kỳ này vs cùng ngày kỳ trước) ──
  const nDays = daysInCycle(cycle);
  const curByDay = new Array(32).fill(0);
  const prevByDay = new Array(32).fill(0);
  for (const o of completedCur) {
    const d = dayOfOrder(o.createdAt);
    if (d) curByDay[d] += orderRealRevenue(o);
  }
  for (const o of completedPrev) {
    const d = dayOfOrder(o.createdAt);
    if (d) prevByDay[d] += orderRealRevenue(o);
  }
  const doanhThuTheoNgay = [];
  for (let d = 1; d <= nDays; d++) {
    doanhThuTheoNgay.push({ ngay: d, doanhThu: curByDay[d], doanhThuKyTruoc: prevByDay[d] });
  }

  // ── order_items của các đơn khám xong trong kỳ (1 truy vấn batched) ──
  const completedIds = completedCur.map((o) => o.id);
  const items = await storage.getOrderItemsForOrders(completedIds);
  const catById = new Map(allServices.map((s) => [s.id, s.category]));

  // ── 3. Doanh thu theo dịch vụ (theo dòng order_items: unitPrice × quantity) ──
  const svRev = new Map<number, { serviceName: string; doanhThu: number }>();
  for (const it of items) {
    const rev = it.unitPrice * it.quantity;
    const cur = svRev.get(it.serviceId);
    if (cur) cur.doanhThu += rev;
    else svRev.set(it.serviceId, { serviceName: it.serviceName, doanhThu: rev });
  }
  const totalSvRev = Array.from(svRev.values()).reduce((s, v) => s + v.doanhThu, 0);
  const doanhThuTheoDichVu = Array.from(svRev.values())
    .map((v) => ({ serviceName: v.serviceName, doanhThu: v.doanhThu, tyTrong: totalSvRev > 0 ? round1((v.doanhThu / totalSvRev) * 100) : 0 }))
    .sort((a, b) => b.doanhThu - a.doanhThu);

  // ── 4. Dịch vụ bán chạy (top) + dịch vụ chậm (không phát sinh trong kỳ) ──
  const dichVuBanChay = doanhThuTheoDichVu.slice(0, 5);
  const soldIds = new Set(svRev.keys());
  const dichVuCham = allServices
    .filter((s) => !soldIds.has(s.id))
    .map((s) => ({ serviceName: s.title, doanhThu: 0 }));

  // ── commission_records của kỳ (cho hoa hồng theo nhân viên + tổng) ──
  const crCycle = await storage.getAllCommissionRecordsByCycle(cycle);
  const grossByUser = new Map<number, number>();
  for (const r of crCycle) {
    if (isGrossCommission(r.status)) grossByUser.set(r.userId, (grossByUser.get(r.userId) ?? 0) + r.amount);
  }

  // ── 5. Doanh thu theo nhân viên (người tạo đơn) + tổng hoa hồng ──
  const revByUser = new Map<number, number>();
  for (const o of completedCur) revByUser.set(o.userId, (revByUser.get(o.userId) ?? 0) + orderRealRevenue(o));
  const userIdSet = new Set<number>();
  revByUser.forEach((_v, k) => userIdSet.add(k));
  grossByUser.forEach((_v, k) => userIdSet.add(k));
  const doanhThuTheoNhanVien = [];
  for (const uid of Array.from(userIdSet)) {
    const doanhThu = revByUser.get(uid) ?? 0;
    const hoaHong = grossByUser.get(uid) ?? 0;
    if (doanhThu === 0 && hoaHong === 0) continue; // bỏ người không phát sinh gì trong kỳ
    const u = await storage.getUser(uid);
    doanhThuTheoNhanVien.push({ userId: uid, name: u?.name ?? "?", role: u?.role ?? "?", doanhThu, hoaHong });
  }
  doanhThuTheoNhanVien.sort((a, b) => b.doanhThu - a.doanhThu);

  // ── 6. Doanh thu theo nhóm dịch vụ (category của service từng dòng) ──
  const nhomRev = new Map<string, number>();
  for (const it of items) {
    const cat = catById.get(it.serviceId) || "Khác";
    nhomRev.set(cat, (nhomRev.get(cat) ?? 0) + it.unitPrice * it.quantity);
  }
  const doanhThuTheoNhom = Array.from(nhomRev.entries())
    .map(([nhom, doanhThu]) => ({ nhom, doanhThu }))
    .sort((a, b) => b.doanhThu - a.doanhThu);

  // ── 7. Khách mới vs quay lại (theo số điện thoại) ──
  const ordersByPhone = new Map<string, number>();
  for (const o of allOrders) ordersByPhone.set(o.phone, (ordersByPhone.get(o.phone) ?? 0) + 1);
  const phonesInCycle = new Set(allOrders.filter((o) => orderCycle(o.createdAt) === cycle).map((o) => o.phone));
  let moi = 0;
  let quayLai = 0;
  for (const ph of Array.from(phonesInCycle)) {
    if ((ordersByPhone.get(ph) ?? 0) >= 2) quayLai++;
    else moi++;
  }
  const khach = { moi, quayLai };

  // ── 8. Hoàn tiền: tổng + dịch vụ bị hoàn nhiều nhất ──
  const inCycleOrders = allOrders.filter((o) => orderCycle(o.createdAt) === cycle);
  const tongHoanTien = inCycleOrders.reduce((s, o) => s + o.refundAmount, 0);
  const cycleItems = await storage.getOrderItemsForOrders(inCycleOrders.map((o) => o.id));
  const refundBySv = new Map<number, { serviceName: string; hoanTien: number }>();
  for (const it of cycleItems) {
    if (it.refundedAmount > 0) {
      const cur = refundBySv.get(it.serviceId);
      if (cur) cur.hoanTien += it.refundedAmount;
      else refundBySv.set(it.serviceId, { serviceName: it.serviceName, hoanTien: it.refundedAmount });
    }
  }
  const hoanTien = {
    tong: tongHoanTien,
    dichVu: Array.from(refundBySv.values()).sort((a, b) => b.hoanTien - a.hoanTien),
  };

  // ── 9. Hoa hồng gross của kỳ + tỷ lệ trên doanh thu thực thu ──
  const hoaHongGross = crCycle.filter((r) => isGrossCommission(r.status)).reduce((s, r) => s + r.amount, 0);
  const hoaHong = {
    tong: hoaHongGross,
    tyLeTrenDoanhThu: cur.doanhThuThucThu > 0 ? round1((hoaHongGross / cur.doanhThuThucThu) * 100) : 0,
  };

  return {
    cycle,
    kpis,
    doanhThuTheoNgay,
    doanhThuTheoDichVu,
    dichVuBanChay,
    dichVuCham,
    doanhThuTheoNhanVien,
    doanhThuTheoNhom,
    khach,
    hoanTien,
    hoaHong,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Phân tích LỊCH HẸN (không gồm phần theo bác sĩ — chờ iHOS gán bác sĩ)
// ═══════════════════════════════════════════════════════════════════

/** Tỷ lệ % (0 nếu mẫu = 0), làm tròn 1 chữ số. */
function pct(n: number, d: number): number {
  return d > 0 ? round1((n / d) * 100) : 0;
}

/** Giờ (0-23) từ appointmentTime "HH:mm"; null nếu thiếu/lạ. */
function parseHour(time: string | null): number | null {
  if (!time) return null;
  const hh = Number(String(time).split(":")[0]);
  return Number.isFinite(hh) && hh >= 0 && hh <= 23 ? hh : null;
}

/** Đếm trạng thái lịch hẹn của 1 nhóm đơn (theo định nghĩa thống kê đã chốt). */
function apptCounts(orders: Order[]) {
  return {
    tong: orders.length,
    // Đến khám = đã check-in: appointmentStatus 'arrived' HOẶC visitStatus khác null.
    denKham: orders.filter((o) => o.appointmentStatus === "arrived" || o.visitStatus != null).length,
    hoanThanh: orders.filter((o) => o.visitStatus === "completed").length,
    khongDen: orders.filter((o) => o.appointmentStatus === "no_show").length,
    huy: orders.filter((o) => o.appointmentStatus === "cancelled" || o.visitStatus === "cancelled").length,
  };
}

export async function getAnalyticsAppointments(cycle: string) {
  const allOrders = await storage.getAllOrders();
  const prevCycle = prevCycleOf(cycle);
  const inCycle = allOrders.filter((o) => orderCycle(o.createdAt) === cycle);
  const inPrev = allOrders.filter((o) => orderCycle(o.createdAt) === prevCycle);
  const cur = apptCounts(inCycle);
  const prev = apptCounts(inPrev);

  // Lượt tái khám (order_item có recallDueDate) — gom theo THÁNG của recallDueDate = kỳ.
  const recallAll = await storage.getRecallItemsWithLogFlag();
  const recallInCycle = recallAll.filter((r) => r.recallDueDate && r.recallDueDate.slice(0, 7) === cycle);
  const recallPrev = recallAll.filter((r) => r.recallDueDate && r.recallDueDate.slice(0, 7) === prevCycle);
  const taiKhamRate = (items: typeof recallAll) =>
    pct(items.filter((r) => r.recallStatus === "scheduled").length, items.length);

  // ── 1. KPI kèm % thay đổi so kỳ trước ──
  const kpis = {
    tongLichHen: { value: cur.tong, changePct: trendPct(cur.tong, prev.tong) },
    tyLeDenKham: {
      value: pct(cur.denKham, cur.tong),
      changePct: trendPct(pct(cur.denKham, cur.tong), pct(prev.denKham, prev.tong)),
    },
    tyLeKhongDen: {
      value: pct(cur.khongDen, cur.tong),
      changePct: trendPct(pct(cur.khongDen, cur.tong), pct(prev.khongDen, prev.tong)),
    },
    tyLeTaiKham: {
      value: taiKhamRate(recallInCycle),
      changePct: trendPct(taiKhamRate(recallInCycle), taiKhamRate(recallPrev)),
    },
  };

  // ── 2. Theo ngày: tổng / hoàn thành / không đến ──
  const nDays = daysInCycle(cycle);
  const dTong = new Array(32).fill(0);
  const dHT = new Array(32).fill(0);
  const dKD = new Array(32).fill(0);
  for (const o of inCycle) {
    const d = dayOfOrder(o.createdAt);
    if (!d) continue;
    dTong[d]++;
    if (o.visitStatus === "completed") dHT[d]++;
    if (o.appointmentStatus === "no_show") dKD[d]++;
  }
  const theoNgay = [];
  for (let d = 1; d <= nDays; d++) {
    theoNgay.push({ ngay: d, tong: dTong[d], hoanThanh: dHT[d], khongDen: dKD[d] });
  }

  // ── 3. Theo khung giờ hẹn (gom theo giờ; bỏ đơn không có giờ) ──
  const gioMap = new Map<number, number>();
  for (const o of inCycle) {
    const h = parseHour(o.appointmentTime);
    if (h == null) continue;
    gioMap.set(h, (gioMap.get(h) ?? 0) + 1);
  }
  const theoKhungGio = Array.from(gioMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([h, so]) => ({ khung: `${String(h).padStart(2, "0")}-${String(h + 1).padStart(2, "0")}`, so }));

  // ── 4. Phân bố trạng thái (deriveOrderStatus → 6 nhóm dùng được) ──
  const STATUS_ORDER: OrderStatusCode[] = ["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "NO_SHOW", "CANCELLED"];
  const statusCount = new Map<string, number>();
  for (const o of inCycle) {
    const s = deriveOrderStatus(o.appointmentStatus, o.visitStatus);
    statusCount.set(s, (statusCount.get(s) ?? 0) + 1);
  }
  const phanBoTrangThai = STATUS_ORDER.map((code) => ({
    code,
    ten: ORDER_STATUS_LABEL[code],
    so: statusCount.get(code) ?? 0,
  }));

  // ── 5. Không đến: tỷ lệ kỳ này + xu hướng 6 kỳ gần nhất ──
  const cyclesDesc: string[] = [];
  let c = cycle;
  for (let i = 0; i < 6; i++) {
    cyclesDesc.push(c);
    c = prevCycleOf(c);
  }
  const xuHuong = cyclesDesc
    .reverse()
    .map((cc) => {
      const cnt = apptCounts(allOrders.filter((o) => orderCycle(o.createdAt) === cc));
      return { thang: cc, tyLe: pct(cnt.khongDen, cnt.tong) };
    });
  const khongDen = { tyLe: pct(cur.khongDen, cur.tong), xuHuong };

  // ── 6. Tái khám: cần gọi / đã đặt lại / từ chối / chưa liên hệ (lượt trong kỳ) ──
  const taiKham = {
    canGoi: recallInCycle.filter((r) => r.recallStatus === "pending").length,
    daDatLai: recallInCycle.filter((r) => r.recallStatus === "scheduled").length,
    tuChoi: recallInCycle.filter((r) => r.recallStatus === "refused").length,
    chuaLienHe: recallInCycle.filter((r) => r.recallStatus === "pending" && !r.hasLog).length,
  };

  return { cycle, kpis, theoNgay, theoKhungGio, phanBoTrangThai, khongDen, taiKham };
}
