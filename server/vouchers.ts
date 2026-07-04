import type { VoucherRow } from "@shared/schema";

export interface VoucherDiscountResult {
  ok: boolean;
  amount: number;     // số tiền giảm (VND)
  reason?: string;    // lý do không hợp lệ (chỉ khi ok=false)
}

/** Ngày hôm nay dạng 'YYYY-MM-DD' theo giờ máy chủ. */
function todayISO(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const fmtVND = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

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

  const today = todayISO(now);
  if (v.startDate && today < v.startDate) return { ok: false, amount: 0, reason: "Mã chưa tới ngày áp dụng" };
  if (v.endDate && today > v.endDate) return { ok: false, amount: 0, reason: "Mã đã hết hạn" };
  if (v.usageLimit > 0 && v.usedCount >= v.usageLimit) return { ok: false, amount: 0, reason: "Mã đã hết lượt sử dụng" };
  if (subtotal < v.minOrder) return { ok: false, amount: 0, reason: `Đơn tối thiểu ${fmtVND(v.minOrder)}` };
  if (serviceCount < v.minServices) return { ok: false, amount: 0, reason: `Cần tối thiểu ${v.minServices} dịch vụ` };

  let amount: number;
  if (v.discountType === "fixed") {
    amount = v.value;
  } else {
    amount = Math.round((subtotal * v.value) / 100);
    if (v.maxDiscount != null) amount = Math.min(amount, v.maxDiscount);
  }
  amount = Math.max(0, Math.min(amount, subtotal)); // không giảm quá tạm tính
  return { ok: true, amount };
}
