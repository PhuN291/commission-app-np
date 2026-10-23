import type { VoucherRow } from "@shared/schema";
import { formatMoney } from "@shared/money";
import { vnDateKey } from "@shared/vn-time";

export interface VoucherDiscountResult {
  ok: boolean;
  amount: number;     // số tiền giảm (VND)
  reason?: string;    // lý do không hợp lệ (chỉ khi ok=false)
}

/**
 * Tính số tiền giảm + kiểm tra điều kiện áp dụng voucher.
 * subtotal: tạm tính (VND) trước giảm; serviceCount: số dòng dịch vụ trong đơn.
 * Trả { ok:false, reason } khi không đạt điều kiện, { ok:true, amount } khi hợp lệ.
 */
export function computeVoucherDiscount(
  v: VoucherRow,
  subtotal: number,
  serviceCount: number,
  now: Date = new Date(),
): VoucherDiscountResult {
  if (!v.active) return { ok: false, amount: 0, reason: "Mã đã ngừng áp dụng" };

  // Ngày bắt đầu, kết thúc của mã là ngày lịch Việt Nam. Lấy theo giờ máy thì trên
  // Vercel (UTC) mã hết hạn 31/12 vẫn dùng được tới 07:00 sáng 01/01.
  const today = vnDateKey(now);
  if (v.startDate && today < v.startDate) return { ok: false, amount: 0, reason: "Mã chưa tới ngày áp dụng" };
  if (v.endDate && today > v.endDate) return { ok: false, amount: 0, reason: "Mã đã hết hạn" };
  if (v.usageLimit > 0 && v.usedCount >= v.usageLimit) return { ok: false, amount: 0, reason: "Mã đã hết lượt sử dụng" };
  const thieu = lyDoKhongDuDieuKien(v, subtotal, serviceCount);
  if (thieu) return { ok: false, amount: 0, reason: thieu };

  return { ok: true, amount: tienGiamTheoMa(v, subtotal) };
}

/**
 * Điều kiện theo nội dung đơn (tạm tính, số dịch vụ), không xét mã còn bật, hạn dùng
 * hay số lượt. Sửa dịch vụ của đơn đã dùng mã kiểm lại phần này: lượt và hạn đã xét lúc
 * tạo đơn, nhưng bớt dịch vụ thì đơn có thể không còn là đơn mà mã nhắm tới.
 */
export function lyDoKhongDuDieuKien(v: VoucherRow, subtotal: number, serviceCount: number): string | null {
  if (subtotal < v.minOrder) return `Đơn tối thiểu ${formatMoney(v.minOrder)}`;
  if (serviceCount < v.minServices) return `Cần tối thiểu ${v.minServices} dịch vụ`;
  return null;
}

/**
 * Số tiền giảm của mã trên một tạm tính, không xét điều kiện áp dụng. Tách riêng để
 * lúc sửa dịch vụ của đơn đã dùng mã thì tính lại được số giảm theo tạm tính mới:
 * lượt dùng đã trừ lúc tạo đơn, kiểm lại hạn dùng hay số lượt lúc đó là sai.
 */
export function tienGiamTheoMa(v: VoucherRow, subtotal: number): number {
  let amount: number;
  if (v.discountType === "fixed") {
    amount = v.value;
  } else {
    amount = Math.round((subtotal * v.value) / 100);
    if (v.maxDiscount != null) amount = Math.min(amount, v.maxDiscount);
  }
  return Math.max(0, Math.min(amount, subtotal)); // không giảm quá tạm tính
}
