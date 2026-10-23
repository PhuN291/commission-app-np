/**
 * Kiểm tra nhanh giờ Việt Nam và định dạng tiền, không cần bộ test.
 *
 * Phải chạy hai lần với hai múi giờ: máy dev đặt Asia/Ho_Chi_Minh, Vercel chạy UTC,
 * và lỗi cũ chỉ lộ ra ở UTC. Cả hai lần đều phải in "Đạt".
 *
 *   TZ=UTC npx tsx script/check-vn-time.ts
 *   TZ=Asia/Ho_Chi_Minh npx tsx script/check-vn-time.ts
 */
import {
  formatVnDateTime,
  isPastBy,
  minutesLate,
  parseVnDateTime,
  recentCycles,
  shiftCycle,
  vnCycleOf,
  vnCycleOfText,
  vnDateKey,
  vnDaysUntil,
  daysInCycle,
} from "../shared/vn-time";
import { isLate15min } from "../shared/status";
import { isWithinLastMonths } from "../shared/types";
import {
  formatMoney,
  formatMoneyShort,
  formatSignedMoney,
  formatMoneyNumber,
} from "../shared/money";

let failed = 0;
function eq(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failed += 1;
    console.error(`  Sai: ${label}\n    nhận ${JSON.stringify(actual)}\n    cần  ${JSON.stringify(expected)}`);
  }
}

const tz = process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log(`Múi giờ tiến trình: ${tz}`);

// 23:30 UTC ngày 31/10 là 06:30 sáng 01/11 ở Việt Nam: thuộc ngày 01/11, kỳ tháng 11.
const lateOct = new Date("2026-10-31T23:30:00Z");
eq("ngày Việt Nam của 23:30 UTC 31/10", vnDateKey(lateOct), "2026-11-01");
eq("kỳ của 23:30 UTC 31/10", vnCycleOf(lateOct), "2026-11");
eq("định dạng giờ Việt Nam", formatVnDateTime(lateOct), "01/11/2026 06:30");
// 16:59 UTC vẫn là 23:59 cùng ngày ở Việt Nam, chưa sang ngày mới.
eq("ngày Việt Nam của 16:59 UTC 31/10", vnDateKey(new Date("2026-10-31T16:59:00Z")), "2026-10-31");

// Giờ hẹn là giờ treo tường Việt Nam.
eq("28/02/2026 10:00 → 03:00 UTC", parseVnDateTime("28/02/2026", "10:00")?.toISOString(), "2026-02-28T03:00:00.000Z");
eq("ngày hẹn dạng yyyy-MM-dd", parseVnDateTime("2026-02-28", "10:00")?.toISOString(), "2026-02-28T03:00:00.000Z");
eq("createdAt dd/MM/yyyy HH:mm", parseVnDateTime("01/11/2026 06:30")?.toISOString(), "2026-10-31T23:30:00.000Z");
eq("chuỗi ISO có Z giữ nguyên", parseVnDateTime("2026-10-31T23:30:00.000Z")?.toISOString(), "2026-10-31T23:30:00.000Z");
eq("chỉ có ngày thì lấy 00:00", parseVnDateTime("01/11/2026")?.toISOString(), "2026-10-31T17:00:00.000Z");
eq("31/02 không có thật", parseVnDateTime("31/02/2026", "10:00"), null);
eq("giờ sai", parseVnDateTime("28/02/2026", "25:00"), null);
eq("chuỗi rỗng", parseVnDateTime("", "10:00"), null);
eq("kỳ từ createdAt", vnCycleOfText("01/11/2026 06:30"), "2026-11");
eq("kỳ từ createdAt lạ", vnCycleOfText("hôm qua"), null);

// Kỳ: số học thuần, qua năm phải đúng.
eq("lùi một kỳ qua năm", shiftCycle("2026-01", -1), "2025-12");
eq("tiến một kỳ qua năm", shiftCycle("2026-12", 1), "2027-01");
eq("sáu kỳ gần nhất", recentCycles(3, lateOct), ["2026-11", "2026-10", "2026-09"]);
eq("số ngày tháng 2/2028", daysInCycle("2028-02"), 29);

// Số ngày tới hạn theo lịch Việt Nam.
eq("hạn hôm nay", vnDaysUntil("2026-11-01", lateOct), 0);
eq("hạn hôm qua", vnDaysUntil("2026-10-31", lateOct), -1);
eq("hạn ngày mai", vnDaysUntil("2026-11-02", lateOct), 1);

// Trễ hẹn: hẹn 10:00 sáng 28/02 giờ Việt Nam.
const appt = parseVnDateTime("28/02/2026", "10:00")!;
eq("trễ 20 phút", minutesLate(appt, new Date("2026-02-28T03:20:30Z")), 20);
eq("còn sớm 5 phút", minutesLate(appt, new Date("2026-02-28T02:55:00Z")), -5);
eq("đúng 15 phút chưa tính trễ", isPastBy(appt, 15, new Date("2026-02-28T03:15:00Z")), false);
eq("15 phút 1 giây là trễ", isPastBy(appt, 15, new Date("2026-02-28T03:15:01Z")), true);
const order = { appointmentDate: "28/02/2026", appointmentTime: "10:00", appointmentStatus: "confirmed", visitStatus: null };
eq("đơn trễ sau 16 phút", isLate15min(order, 15, new Date("2026-02-28T03:16:00Z")), true);
eq("đơn chưa trễ sau 10 phút", isLate15min(order, 15, new Date("2026-02-28T03:10:00Z")), false);
eq("ngưỡng 30 phút", isLate15min(order, 30, new Date("2026-02-28T03:20:00Z")), false);
eq("đã đến thì không trễ", isLate15min({ ...order, visitStatus: "arrived" }, 15, new Date("2026-02-28T05:00:00Z")), false);
eq("đơn đặt từ màn Tạo đơn (yyyy-MM-dd)", isLate15min({ ...order, appointmentDate: "2026-02-28" }, 15, new Date("2026-02-28T03:16:00Z")), true);

// Thống kê 12 tháng: đơn tạo 01/11/2025 vẫn nằm trong 12 tháng tính tới 01/11/2026.
eq("trong 12 tháng", isWithinLastMonths("01/11/2025 08:00", 12, lateOct), true);
eq("ngoài 12 tháng", isWithinLastMonths("31/10/2025 23:00", 12, lateOct), false);

// Tiền.
eq("tiền đầy đủ", formatMoney(142500), "142.500₫");
eq("tiền 0", formatMoney(0), "0₫");
eq("tiền âm", formatMoney(-5400), "−5.400₫");
eq("chỉ phần số", formatMoneyNumber(1250000), "1.250.000");
eq("có dấu cộng", formatSignedMoney(54000), "+54.000₫");
eq("có dấu trừ", formatSignedMoney(-5400), "−5.400₫");
eq("gọn triệu", formatMoneyShort(7_500_000), "7,5 triệu₫");
eq("gọn triệu chẵn", formatMoneyShort(12_000_000), "12 triệu₫");
eq("gọn dưới triệu in đủ", formatMoneyShort(350_000), "350.000₫");
eq("gọn tỷ", formatMoneyShort(1_234_000_000), "1,2 tỷ₫");
eq("gọn làm tròn lên tỷ", formatMoneyShort(999_960_000), "1 tỷ₫");
eq("gọn trên trăm triệu", formatMoneyShort(123_456_789), "123 triệu₫");
eq("gọn từ 10 triệu bỏ thập phân", formatMoneyShort(12_345_678), "12 triệu₫");
eq("gọn 9,96 triệu làm tròn lên 10", formatMoneyShort(9_960_000), "10 triệu₫");
eq("gọn âm", formatMoneyShort(-2_500_000), "\u22122,5 triệu₫");

if (failed > 0) {
  console.error(`Không đạt: ${failed} chỗ sai (múi giờ ${tz})`);
  process.exit(1);
}
console.log(`Đạt (múi giờ ${tz})`);
