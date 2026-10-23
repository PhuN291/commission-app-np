/**
 * Giờ Việt Nam dùng chung cho máy chủ, giao diện và script.
 *
 * Vì sao không dùng getHours(), getMonth(), setHours(0) của Date: chúng đọc theo
 * múi giờ của tiến trình. Máy dev đặt Asia/Ho_Chi_Minh nên chạy đúng, nhưng Vercel
 * chạy UTC: từ 00:00 tới 07:00 sáng giờ Việt Nam ở đó vẫn là hôm qua, đơn tạo lúc
 * 06:30 ngày 01/11 rơi về kỳ tháng 10, lịch hẹn 09:00 bị hiểu thành 16:00 nên
 * cảnh báo trễ hẹn bắn muộn 7 tiếng.
 *
 * Việt Nam cố định UTC+7, không đổi giờ mùa hè, nên cộng thẳng 7 tiếng rồi đọc
 * bằng getUTC* là ra giờ treo tường, không cần Intl hay thư viện múi giờ, và kết
 * quả giống nhau dù tiến trình chạy ở múi giờ nào.
 */

export const VN_UTC_OFFSET_MINUTES = 7 * 60;
const VN_OFFSET_MS = VN_UTC_OFFSET_MINUTES * 60_000;
const DAY_MS = 86_400_000;

/** Một thời điểm: Date hoặc số mili giây epoch (như Date.now()). */
export type Instant = Date | number;

/** Giờ treo tường Việt Nam của một thời điểm. month đếm từ 1; weekday 0 là Chủ Nhật. */
export type VnParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

function toMs(at: Instant): number {
  return typeof at === "number" ? at : at.getTime();
}

const p2 = (n: number) => String(n).padStart(2, "0");

export function vnParts(at: Instant = Date.now()): VnParts {
  const d = new Date(toMs(at) + VN_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: d.getUTCDay(),
  };
}

/**
 * Giờ treo tường Việt Nam → thời điểm thật. Tháng, ngày tràn thì cuộn sang như
 * Date (tháng 0 là tháng 12 năm trước, ngày 0 là ngày cuối tháng trước), để các
 * phép lùi tháng ra cùng kết quả với setMonth() trước đây.
 */
export function vnInstant(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - VN_OFFSET_MS);
}

/** Ngày theo lịch Việt Nam, dạng "YYYY-MM-DD" (dạng của cột date và ô chọn ngày). */
export function vnDateKey(at: Instant = Date.now()): string {
  const t = vnParts(at);
  return `${t.year}-${p2(t.month)}-${p2(t.day)}`;
}

/** Kỳ hoa hồng "YYYY-MM" chứa thời điểm này theo lịch Việt Nam, cùng dạng cycle_id. */
export function vnCycleOf(at: Instant = Date.now()): string {
  const t = vnParts(at);
  return `${t.year}-${p2(t.month)}`;
}

/** Tiến hoặc lùi `offset` tháng từ một kỳ "YYYY-MM". Thuần số học nên không dính múi giờ. */
export function shiftCycle(cycle: string, offset: number): string {
  const [y, m] = cycle.split("-").map(Number);
  const idx = y * 12 + ((m || 1) - 1) + offset;
  const month = ((idx % 12) + 12) % 12;
  return `${(idx - month) / 12}-${p2(month + 1)}`;
}

/** `count` kỳ gần nhất tính từ kỳ chứa `from`, mới nhất đứng đầu. */
export function recentCycles(count: number, from: Instant = Date.now()): string[] {
  const start = vnCycleOf(from);
  return Array.from({ length: count }, (_, i) => shiftCycle(start, -i));
}

/** Số ngày của tháng trong kỳ "YYYY-MM". */
export function daysInCycle(cycle: string): number {
  const [y, m] = cycle.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate(); // ngày 0 của tháng sau là ngày cuối tháng này
}

const DMY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::\d{2})?)?$/;
const YMD = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?$/;
const HM = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;
// Có Z hoặc +07:00 ở đuôi là chuỗi ISO tự mang múi giờ, để Date tự đọc.
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;

/**
 * Ngày giờ app lưu dạng chữ → thời điểm thật, hiểu là giờ Việt Nam.
 *
 * Các dạng đang có trong dữ liệu:
 * - "dd/MM/yyyy": ngày hẹn của đơn cũ và đơn dời lịch;
 * - "yyyy-MM-dd": ngày hẹn đặt từ màn Tạo đơn (ô chọn ngày gửi thẳng dạng này);
 * - "dd/MM/yyyy HH:mm": createdAt của đơn và timestamp của status_logs;
 * - chuỗi ISO có Z hoặc +07:00 thì theo đúng múi giờ ghi trong chuỗi.
 * `timeStr` ("HH:mm") là giờ hẹn tách cột riêng; có thì nó thắng giờ nằm trong
 * `dateStr`. Không có giờ thì lấy 00:00. Sai định dạng hoặc ngày không có thật
 * (31/02, giờ 25) trả null để nơi gọi bỏ qua thay vì tính nhầm sang ngày khác.
 */
export function parseVnDateTime(
  dateStr: string | null | undefined,
  timeStr?: string | null,
): Date | null {
  const s = (dateStr ?? "").trim();
  if (!s) return null;
  if (ISO_WITH_ZONE.test(s) && !timeStr) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  let year: number, month: number, day: number;
  let hour = 0;
  let minute = 0;
  const dmy = s.match(DMY);
  const ymd = dmy ? null : s.match(YMD);
  if (dmy) {
    [day, month, year] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
    if (dmy[4] != null) [hour, minute] = [Number(dmy[4]), Number(dmy[5])];
  } else if (ymd) {
    [year, month, day] = [Number(ymd[1]), Number(ymd[2]), Number(ymd[3])];
    if (ymd[4] != null) [hour, minute] = [Number(ymd[4]), Number(ymd[5])];
  } else {
    return null;
  }

  const t = (timeStr ?? "").trim();
  if (t) {
    const hm = t.match(HM);
    if (!hm) return null;
    [hour, minute] = [Number(hm[1]), Number(hm[2])];
  }

  if (year < 1900 || month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59) return null;
  const at = vnInstant(year, month, day, hour, minute);
  // Date.UTC cuộn 31/02 thành 03/03; đọc lại mà lệch ngày nghĩa là ngày không có thật.
  if (vnParts(at).day !== day) return null;
  return at;
}

/**
 * Kỳ "YYYY-MM" của một ngày lưu dạng chữ (createdAt "dd/MM/yyyy HH:mm" của đơn).
 * null khi chuỗi lạ, để nơi gọi tự chọn loại bỏ hay rơi về kỳ hiện tại.
 */
export function vnCycleOfText(text: string | null | undefined): string | null {
  const at = parseVnDateTime(text);
  return at ? vnCycleOf(at) : null;
}

/** Thời điểm → "dd/MM/yyyy HH:mm" giờ Việt Nam, dạng app ghi createdAt đơn và status_logs. */
export function formatVnDateTime(at: Instant = Date.now()): string {
  const t = vnParts(at);
  return `${p2(t.day)}/${p2(t.month)}/${t.year} ${p2(t.hour)}:${p2(t.minute)}`;
}

/** Thời điểm → "dd/MM/yyyy" theo lịch Việt Nam. */
export function formatVnDate(at: Instant = Date.now()): string {
  const t = vnParts(at);
  return `${p2(t.day)}/${p2(t.month)}/${t.year}`;
}

/** Số thứ tự ngày (tính từ 01/01/1970) của thời điểm theo lịch Việt Nam, để trừ ra số ngày. */
function vnDayNumber(at: Instant): number {
  return Math.floor((toMs(at) + VN_OFFSET_MS) / DAY_MS);
}

/**
 * Còn bao nhiêu ngày lịch nữa tới ngày "YYYY-MM-DD" (hạn tái khám, ngày nghỉ việc),
 * tính theo lịch Việt Nam: 0 là hôm nay, âm là đã qua. null khi chuỗi không phải ngày.
 */
export function vnDaysUntil(dateKey: string | null | undefined, now: Instant = Date.now()): number | null {
  const m = (dateKey ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const target = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS;
  return target - vnDayNumber(now);
}

/**
 * Đã trễ bao nhiêu phút so với giờ hẹn, làm tròn xuống: dương là đã quá giờ,
 * âm là còn sớm. Dùng cho chữ hiển thị như "trễ 20 phút".
 */
export function minutesLate(scheduled: Instant, now: Instant = Date.now()): number {
  return Math.floor((toMs(now) - toMs(scheduled)) / 60_000);
}

/**
 * Đã quá giờ hẹn HƠN `minutes` phút chưa. So bằng mili giây thay vì minutesLate()
 * để mốc "đúng 15 phút 00 giây" vẫn chưa tính là trễ, như cách đếm từ trước tới giờ.
 */
export function isPastBy(scheduled: Instant, minutes: number, now: Instant = Date.now()): boolean {
  return toMs(now) - toMs(scheduled) > minutes * 60_000;
}
