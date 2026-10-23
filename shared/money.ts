/**
 * Một định dạng tiền cho cả app: "142.500₫".
 *
 * Trước đây mỗi màn tự chép một hàm: chỗ ghi "₫", chỗ ghi "đ", chỗ ghi "VNĐ", số
 * gọn thì nơi "7.5 triệu" (chấm thập phân kiểu Anh), nơi "7,5tr", nơi "350k". Cùng
 * một khoản tiền đọc ở hai màn ra hai kiểu, người dùng tưởng là hai con số. Gom về
 * đây để máy chủ (câu thông báo, lý do mã giảm giá) và giao diện in giống nhau.
 *
 * Quy ước: chấm ngăn hàng nghìn, phẩy thập phân, ký hiệu ₫ viết liền sau số. Số âm
 * dùng dấu trừ U+2212 chứ không phải gạch nối, để dấu không bị ngắt dòng và rộng
 * bằng dấu cộng khi đặt hai dòng thưởng phạt cạnh nhau.
 *
 * Tự ngăn hàng nghìn bằng regex thay vì Intl.NumberFormat("vi-VN"): bản Node dựng
 * với small-icu không có dữ liệu vi-VN, rơi về kiểu Anh và in "142,500".
 */

export const MONEY_SYMBOL = "₫";
export const MINUS_SIGN = "−";

/** Tiền là số nguyên đồng; NaN hay Infinity lọt vào thì coi như 0 cho khỏi in chữ "NaN". */
function toDong(n: number): number {
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function groupThousands(abs: number): string {
  return String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Chỉ phần số, không ký hiệu: "142.500", "−5.400". Cho chỗ in số và đơn vị ở hai thẻ riêng. */
export function formatMoneyNumber(n: number): string {
  const v = toDong(n);
  return (v < 0 ? MINUS_SIGN : "") + groupThousands(Math.abs(v));
}

/** Đầy đủ: "142.500₫", âm là "−5.400₫". */
export function formatMoney(n: number): string {
  return formatMoneyNumber(n) + MONEY_SYMBOL;
}

/** Luôn có dấu cho khoản cộng trừ: "+54.000₫", "−5.400₫"; 0 thì không dấu. */
export function formatSignedMoney(n: number): string {
  return (toDong(n) > 0 ? "+" : "") + formatMoney(n);
}

/**
 * Số gọn, không ký hiệu: "7,5 triệu", "12 triệu", "1,2 tỷ". Dưới một triệu in đủ
 * ("350.000") vì viết đủ còn ngắn hơn "350 nghìn". Một chữ số thập phân khi dưới
 * 10, bỏ đuôi ",0"; từ 10 trở lên làm tròn hẳn, như Trang chủ và Xếp hạng vẫn làm,
 * để ô số liệu nửa màn hình không bị cắt chữ.
 */
export function formatMoneyShortNumber(n: number): string {
  const v = toDong(n);
  const abs = Math.abs(v);
  if (abs < 1_000_000) return formatMoneyNumber(v);

  const round = (x: number) => (x < 10 ? Math.round(x * 10) / 10 : Math.round(x));
  let value = round(abs / 1_000_000);
  let unit = "triệu";
  // 999,6 triệu làm tròn thành 1.000 triệu thì đọc là 1 tỷ cho đúng nghĩa.
  if (value >= 1000) {
    value = round(abs / 1_000_000_000);
    unit = "tỷ";
  }
  const whole = Math.floor(value);
  const tenth = Math.round((value - whole) * 10);
  const text = groupThousands(whole) + (tenth > 0 ? `,${tenth}` : "");
  return `${v < 0 ? MINUS_SIGN : ""}${text} ${unit}`;
}

/** Gọn: "7,5 triệu₫", "1,2 tỷ₫"; dưới một triệu in đủ "350.000₫". */
export function formatMoneyShort(n: number): string {
  return formatMoneyShortNumber(n) + MONEY_SYMBOL;
}
