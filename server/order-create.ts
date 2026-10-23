/**
 * Tạo đơn từ app và dời lịch: hai đường sinh ra đơn mới, mỗi đường một transaction.
 *
 * Đơn, dòng dịch vụ, người hưởng, khoản hoa hồng và lượt dùng voucher cùng commit
 * hoặc cùng hủy (TD-40). Lỗi ở bước nào thì trả lỗi tiếng Việt và không lưu gì, thay
 * vì để lại một đơn thiếu dòng hay thiếu hoa hồng mà màn hình vẫn báo thành công.
 */
import { z } from "zod";
import { and, eq, lt, or, sql } from "drizzle-orm";
import {
  commissionRecords,
  orderItems,
  orderRoleAssignments,
  orders,
  vouchers,
  type Order,
  type User,
} from "@shared/schema";
import { canCreateOrder } from "@shared/types";
import { formatVnDate, formatVnDateTime, parseVnDateTime, vnDateKey } from "@shared/vn-time";
import { db } from "./db";
import type { DbTx } from "./db-tx";
import { storage } from "./storage";
import { chuyenTrangThaiLichHen } from "./storage.db";
import { ingestOrderDerived, type ChiTietDichVu } from "./ingest";
import { KHOAN_CHUA_DUYET, type NguoiHuong } from "./commission-engine";
import { computeVoucherDiscount } from "./vouchers";
import { capMaDon, danhSachDongSchema, giaDongTuDanhMuc, tomTatDong } from "./order-lines";

/** Lỗi do dữ liệu hoặc nghiệp vụ, route trả nguyên `message` cho người dùng. */
export class LoiNghiepVu extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const chuTuyChon = z.string().trim().nullish();

/**
 * Thân POST /api/orders. Không có trường tiền nào: mã đơn, giờ tạo, đơn giá, tổng,
 * số giảm và hoa hồng đều do máy chủ tính. App cũ còn gửi các trường đó thì zod bỏ đi.
 */
export const taoDonSchema = z.object({
  patientName: z.string().trim().min(1, "Thiếu tên khách hàng"),
  phone: z.string().trim().min(1, "Thiếu số điện thoại khách hàng"),
  email: chuTuyChon,
  notes: z.string().nullish(),
  appointmentDate: chuTuyChon,
  appointmentTime: chuTuyChon,
  examType: chuTuyChon,
  vatCompanyName: chuTuyChon,
  vatTaxCode: chuTuyChon,
  vatCompanyAddress: chuTuyChon,
  vatEmail: chuTuyChon,
  voucherCode: chuTuyChon,
  // Chỉ Trưởng ca, CEO được tạo hộ người khác; vai khác gửi gì cũng thành chính mình.
  userId: z.number().int().positive().nullish(),
  services: danhSachDongSchema,
});
export type TaoDonInput = z.infer<typeof taoDonSchema>;

/** Đọc lại đơn trong transaction sau khi engine đã ghi orders.commission. */
async function docDon(tx: DbTx, id: number): Promise<Order> {
  const rows = await tx.select().from(orders).where(eq(orders.id, id)).limit(1);
  return rows[0];
}

export async function taoDonTuApp(input: TaoDonInput, actor: User): Promise<Order> {
  const giaDong = giaDongTuDanhMuc(input.services, await storage.getAllServices());
  if (!giaDong.ok) throw new LoiNghiepVu(400, giaDong.message);
  const tom = tomTatDong(giaDong.lines);

  let chuDonId = actor.id;
  if ((actor.role === "tc" || actor.role === "ceo") && input.userId && input.userId !== actor.id) {
    const nv = await storage.getUser(input.userId);
    if (!nv || nv.status === "offboarded") {
      throw new LoiNghiepVu(400, "Không tìm thấy nhân viên đứng tên đơn, hoặc người này đã nghỉ việc");
    }
    // Cùng luật với người tự tạo đơn: tạo hộ không được thành lối cho đơn đứng tên Kế toán.
    if (!canCreateOrder(nv.role)) {
      throw new LoiNghiepVu(400, `${nv.name} không thuộc vai được đứng tên đơn`);
    }
    chuDonId = nv.id;
  }

  const now = new Date();
  return db.transaction(async (tx) => {
    // Mã giảm giá kiểm lại ở đây với tạm tính máy chủ vừa tính, không dùng số giảm
    // điện thoại đã hiện. Khoá dòng mã tới hết transaction để hai đơn cùng lúc không
    // cùng lấy lượt cuối của một mã có giới hạn.
    let voucherCode: string | null = null;
    let voucherAmount = 0;
    if (input.voucherCode) {
      const ma = input.voucherCode.toUpperCase();
      const v = (await tx.select().from(vouchers).where(eq(vouchers.code, ma)).limit(1).for("update"))[0];
      if (!v) throw new LoiNghiepVu(422, `Mã giảm giá ${ma} không tồn tại`);
      const kq = computeVoucherDiscount(v, tom.subtotal, giaDong.lines.length, now);
      if (!kq.ok) throw new LoiNghiepVu(422, kq.reason ?? "Mã giảm giá không áp dụng được cho đơn này");
      const tang = await tx
        .update(vouchers)
        .set({ usedCount: sql`${vouchers.usedCount} + 1` })
        .where(and(eq(vouchers.id, v.id), or(eq(vouchers.usageLimit, 0), lt(vouchers.usedCount, vouchers.usageLimit))))
        .returning({ id: vouchers.id });
      if (tang.length === 0) throw new LoiNghiepVu(422, "Mã đã hết lượt sử dụng");
      voucherCode = v.code;
      voucherAmount = kq.amount;
    }

    const code = await capMaDon(tx, now);
    const [order] = await tx
      .insert(orders)
      .values({
        code,
        patientName: input.patientName,
        phone: input.phone,
        email: input.email || null,
        serviceName: tom.serviceName,
        serviceCode: tom.serviceCode,
        serviceCategory: tom.serviceCategory,
        quantity: tom.quantity,
        unitPrice: tom.unitPrice,
        // Tạm tính trước giảm, như mọi đơn từ trước tới nay; số giảm nằm ở voucherAmount.
        totalPrice: tom.subtotal,
        totalListed: tom.subtotal,
        commission: 0, // engine ghi lại ngay bên dưới
        appointmentStatus: "pending",
        notes: input.notes?.trim() || null,
        appointmentDate: input.appointmentDate || null,
        appointmentTime: input.appointmentTime || null,
        examType: input.examType || null,
        vatCompanyName: input.vatCompanyName || null,
        vatTaxCode: input.vatTaxCode || null,
        vatCompanyAddress: input.vatCompanyAddress || null,
        vatEmail: input.vatEmail || null,
        // Giờ máy chủ theo lịch Việt Nam, không theo đồng hồ điện thoại: kỳ hoa hồng
        // của đơn suy ra từ cột này.
        createdAt: formatVnDateTime(now),
        userId: chuDonId,
        source: "manual",
        voucherCode,
        voucherAmount,
      })
      .returning();
    await ingestOrderDerived(order, giaDong.lines, tx);
    return docDon(tx, order.id);
  });
}

/**
 * Dời lịch: đơn cũ sang Dời lịch, đơn mới mang lịch mới, cùng một transaction.
 *
 * Khoản chưa duyệt của đơn cũ chuyển sang CANCEL (chuyenTrangThaiLichHen lo). Người
 * đã có khoản chốt ở đơn cũ (duyệt, từ chối, khiếu nại) không nhận thêm khoản ở đơn
 * mới, nên một lịch hẹn không bao giờ ra hai lần tiền.
 *
 * Đơn mới chép lại đúng các dòng dịch vụ và giá của đơn cũ, kể cả mã giảm giá: đây
 * vẫn là lượt đặt khách đã chốt giá, chỉ đổi ngày. Lượt dùng mã không tăng lần nữa.
 */
export async function doiLichDon(
  id: number,
  appointmentDate: string,
  appointmentTime: string,
  actor: User,
): Promise<{ originalOrder: Order; newOrder: Order }> {
  // Ngày giờ mới thành giờ hẹn của đơn mới: không đọc được thì đơn không bao giờ hiện
  // trễ hẹn, ngày đã qua thì đơn mới vừa tạo đã trễ.
  const henMoi = parseVnDateTime(appointmentDate, appointmentTime);
  if (!henMoi) throw new LoiNghiepVu(400, "Ngày hoặc giờ hẹn mới không hợp lệ");
  if (vnDateKey(henMoi) < vnDateKey()) throw new LoiNghiepVu(400, "Ngày hẹn mới không được trước hôm nay");
  const danhMuc = await storage.getAllServices();
  return db.transaction(async (tx) => {
    const cu = (await tx.select().from(orders).where(eq(orders.id, id)).limit(1).for("update"))[0];
    if (!cu) throw new LoiNghiepVu(404, "Không tìm thấy đơn hàng");

    const daDoi = await chuyenTrangThaiLichHen(tx, cu, "rescheduled", `Dời sang ${formatVnDate(henMoi)} ${appointmentTime}`, {
      actorUserId: actor.id,
      source: "app",
    });
    if (!daDoi) throw new LoiNghiepVu(400, "Đơn ở trạng thái này không dời lịch được");

    const khoanCu = await tx
      .select({ status: commissionRecords.status, userId: commissionRecords.userId, role: orderRoleAssignments.role })
      .from(commissionRecords)
      .innerJoin(orderRoleAssignments, eq(commissionRecords.roleAssignmentId, orderRoleAssignments.id))
      .where(eq(commissionRecords.orderId, cu.id));
    const daChotO: NguoiHuong[] = khoanCu
      .filter((k) => k.status !== "CANCEL" && !(KHOAN_CHUA_DUYET as readonly string[]).includes(k.status))
      .map((k) => ({ role: k.role, userId: k.userId }));

    const dongCu = await tx.select().from(orderItems).where(eq(orderItems.orderId, cu.id)).orderBy(orderItems.id);
    const chiTiet: ChiTietDichVu[] = [];
    for (const it of dongCu) {
      const sv = danhMuc.find((s) => s.id === it.serviceId);
      if (!sv) continue; // dòng cũ không khớp danh mục; ingest rơi về bản gộp của đơn nếu không còn dòng nào
      chiTiet.push({
        serviceCode: sv.code,
        serviceName: it.serviceName,
        serviceCategory: sv.category ?? null,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      });
    }

    // Mã đơn và createdAt mang ngày giờ Việt Nam, kể cả khi máy chủ chạy UTC.
    const now = new Date();
    const code = await capMaDon(tx, now);
    const [moi] = await tx
      .insert(orders)
      .values({
        code,
        patientName: cu.patientName,
        phone: cu.phone,
        email: cu.email,
        serviceName: cu.serviceName,
        serviceCode: cu.serviceCode,
        serviceCategory: cu.serviceCategory,
        quantity: cu.quantity,
        unitPrice: cu.unitPrice,
        totalPrice: cu.totalPrice,
        totalListed: cu.totalListed,
        commission: 0,
        appointmentStatus: "confirmed",
        notes: `Dời lịch từ đơn ${cu.code}`,
        appointmentDate,
        appointmentTime,
        examType: cu.examType,
        vatCompanyName: cu.vatCompanyName,
        vatTaxCode: cu.vatTaxCode,
        vatCompanyAddress: cu.vatCompanyAddress,
        vatEmail: cu.vatEmail,
        createdAt: formatVnDateTime(now),
        userId: cu.userId,
        source: cu.source,
        insuranceAmount: cu.insuranceAmount,
        voucherCode: cu.voucherCode,
        voucherAmount: cu.voucherAmount,
        // Dời lịch đẻ ra đơn mới thay cho đơn cũ, người phụ trách phải theo sang,
        // không thì mỗi lần khách dời hẹn là ba ô này trắng lại từ đầu.
        saleUserId: cu.saleUserId,
        indicatedByUserId: cu.indicatedByUserId,
        performedByUserId: cu.performedByUserId,
      })
      .returning();
    await ingestOrderDerived(moi, chiTiet, tx, { daChotO });
    return { originalOrder: daDoi, newOrder: await docDon(tx, moi.id) };
  });
}
