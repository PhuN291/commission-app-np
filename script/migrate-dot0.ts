/**
 * Migration của Đợt 0, gom mọi thay đổi DB của đợt vào một file, mỗi việc một mục.
 *
 * Vì sao viết DDL tay thay vì `npm run db:push`: trong DB còn bảng mồ côi
 * appointments, transactions đã gỡ khỏi schema, drizzle-kit thấy vậy là dừng lại hỏi
 * xoá hay giữ qua TTY nên chạy không người trông là treo. Mọi câu đều chạy lại được
 * (IF NOT EXISTS, ON CONFLICT DO NOTHING, kiểm cột trước khi đổi tên), chạy lần hai
 * không hỏng gì. Câu SQL dùng được cả Postgres trong máy lẫn Neon.
 *
 * Chạy: npx tsx script/migrate-dot0.ts
 * Chạy trên Neon: DATABASE_URL=<chuỗi Neon> npx tsx script/migrate-dot0.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../server/db"; // tự nạp .env, không cần dotenv
import { SYSTEM_SETTING_DEFAULTS, SYSTEM_SETTING_DEFS, SYSTEM_SETTING_KEYS } from "../shared/system-settings";
import { parseVnDateTime } from "../shared/vn-time";

/** node-postgres trả { rows }, driver Neon có lúc trả thẳng mảng. */
function rowsOf<T = any>(r: any): T[] {
  return (r?.rows ?? r) as T[];
}

async function coCot(table: string, column: string): Promise<boolean> {
  const r = await db.execute(sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = ${table} AND column_name = ${column}
  `);
  return rowsOf(r).length > 0;
}

// ════════════════════════════════════════════════════════════════════
// B. Cấu hình hệ thống, nhật ký lưu DB, cột người và nguồn cho status_logs
// ════════════════════════════════════════════════════════════════════

// ── B1. system_settings + system_settings_history ──────────────────
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by_user_id integer
  )
`);
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS system_settings_history (
    id serial PRIMARY KEY,
    key text NOT NULL,
    old_value jsonb,
    new_value jsonb NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now(),
    changed_by_user_id integer
  )
`);
await db.execute(sql`
  CREATE INDEX IF NOT EXISTS system_settings_history_key_idx
  ON system_settings_history (key, changed_at DESC)
`);

// Ngày chốt và ngưỡng cảnh báo đã có người lưu ở bảng Kì lương cũ: chép sang TRƯỚC
// khi điền mặc định, không thì mặc định chiếm chỗ và giá trị đã sửa mất. Giữ cả mốc
// và người sửa cuối để màn Cài đặt vẫn hiện đúng ai đổi lần cuối.
const coBangKyLuong = rowsOf<{ ok: boolean }>(
  await db.execute(sql`SELECT to_regclass('pay_cycle_settings') IS NOT NULL AS ok`),
)[0]?.ok;
if (coBangKyLuong) {
  const ngay = SYSTEM_SETTING_DEFS.period_close_day;
  const tran = SYSTEM_SETTING_DEFS.rate_warning_cap_percent;
  await db.execute(sql`
    INSERT INTO system_settings (key, value, updated_at, updated_by_user_id)
    SELECT 'period_close_day', to_jsonb(p.deadline_day), p.updated_at, p.updated_by_user_id
    FROM (SELECT * FROM pay_cycle_settings ORDER BY id LIMIT 1) p
    WHERE p.deadline_day BETWEEN ${ngay.min} AND ${ngay.max}
    ON CONFLICT (key) DO NOTHING
  `);
  await db.execute(sql`
    INSERT INTO system_settings (key, value, updated_at, updated_by_user_id)
    SELECT 'rate_warning_cap_percent', to_jsonb(p.cap_warning_pct), p.updated_at, p.updated_by_user_id
    FROM (SELECT * FROM pay_cycle_settings ORDER BY id LIMIT 1) p
    WHERE p.cap_warning_pct BETWEEN ${tran.min} AND ${tran.max}
    ON CONFLICT (key) DO NOTHING
  `);
}
for (const key of SYSTEM_SETTING_KEYS) {
  await db.execute(sql`
    INSERT INTO system_settings (key, value)
    VALUES (${key}, ${JSON.stringify(SYSTEM_SETTING_DEFAULTS[key])}::jsonb)
    ON CONFLICT (key) DO NOTHING
  `);
}

// ── B2. audit_logs: nhật ký thật thay bản trong bộ nhớ ─────────────
// DB mới (chưa từng db:push) thì tạo luôn đúng hình cuối.
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id serial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    actor_user_id integer,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id integer,
    before jsonb,
    after jsonb,
    source text NOT NULL DEFAULT 'app'
  )
`);
// Bảng cũ đặt tên actor_id; đổi cho cùng tên actor_user_id với các bảng nhật ký khác.
if ((await coCot("audit_logs", "actor_id")) && !(await coCot("audit_logs", "actor_user_id"))) {
  await db.execute(sql`ALTER TABLE audit_logs RENAME COLUMN actor_id TO actor_user_id`);
}
await db.execute(sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_id integer`);
// Thêm created_at chưa kèm default: kèm default thì Postgres điền giờ chạy script cho
// mọi dòng cũ, mất mốc thật đang nằm ở cột `timestamp`.
await db.execute(sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at timestamptz`);
if (await coCot("audit_logs", "timestamp")) {
  // Cột cũ không múi giờ, default now() của nó ghi giờ treo tường theo múi giờ của
  // phiên, nên đọc lại theo đúng múi giờ phiên mới ra mốc thật.
  await db.execute(sql`
    UPDATE audit_logs SET created_at = "timestamp" AT TIME ZONE current_setting('TimeZone')
    WHERE created_at IS NULL
  `);
  await db.execute(sql`ALTER TABLE audit_logs DROP COLUMN "timestamp"`);
}
await db.execute(sql`UPDATE audit_logs SET created_at = now() WHERE created_at IS NULL`);
await db.execute(sql`ALTER TABLE audit_logs ALTER COLUMN created_at SET DEFAULT now()`);
await db.execute(sql`ALTER TABLE audit_logs ALTER COLUMN created_at SET NOT NULL`);
await db.execute(sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app'`);
await db.execute(sql`
  CREATE INDEX IF NOT EXISTS audit_logs_entity_idx
  ON audit_logs (entity_type, entity_id, created_at DESC)
`);

// ── B3. status_logs: ai đổi, đổi từ đâu, mốc tuyệt đối ─────────────
await db.execute(sql`ALTER TABLE status_logs ADD COLUMN IF NOT EXISTS source text`);
await db.execute(sql`ALTER TABLE status_logs ADD COLUMN IF NOT EXISTS actor_user_id integer`);
await db.execute(sql`ALTER TABLE status_logs ADD COLUMN IF NOT EXISTS created_at timestamptz`);
// Mốc của dòng cũ lấy từ cột chữ "dd/MM/yyyy HH:mm" giờ Việt Nam. Parse bằng cùng hàm
// app đang dùng thay vì to_timestamp: to_timestamp đọc theo múi giờ phiên, mà phiên
// trên Neon là UTC, sẽ lệch 7 tiếng. source, actor_user_id của dòng cũ để NULL vì
// thật sự không biết ai đổi.
const chuaCoMoc = rowsOf<{ id: number; timestamp: string }>(
  await db.execute(sql`SELECT id, "timestamp" FROM status_logs WHERE created_at IS NULL ORDER BY id`),
);
let dienMoc = 0;
const khongDocDuoc: number[] = [];
for (const r of chuaCoMoc) {
  const at = parseVnDateTime(r.timestamp);
  if (!at) {
    khongDocDuoc.push(r.id);
    continue;
  }
  await db.execute(sql`UPDATE status_logs SET created_at = ${at.toISOString()}::timestamptz WHERE id = ${r.id}`);
  dienMoc++;
}
// Default đặt SAU khi điền, cùng lý do như audit_logs.created_at ở trên.
await db.execute(sql`ALTER TABLE status_logs ALTER COLUMN created_at SET DEFAULT now()`);
await db.execute(sql`ALTER TABLE status_logs ALTER COLUMN source SET DEFAULT 'app'`);

// ── B4. In kết quả để người chạy thấy ngay giá trị đã chép và cột đã đổi ──
const caiDat = rowsOf<{ key: string; value: unknown }>(
  await db.execute(sql`SELECT key, value FROM system_settings ORDER BY key`),
);
console.log("Cấu hình hệ thống:", Object.fromEntries(caiDat.map((r) => [r.key, r.value])));
const cotAudit = rowsOf<{ column_name: string }>(
  await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'audit_logs' ORDER BY ordinal_position
  `),
);
console.log("Cột audit_logs:", cotAudit.map((r) => r.column_name));
console.log(
  `status_logs: điền mốc cho ${dienMoc} dòng cũ` +
    (khongDocDuoc.length ? `, không đọc được giờ ở dòng ${khongDocDuoc.join(", ")}` : ""),
);

// ════════════════════════════════════════════════════════════════════
// D. Vai Kế toán trưởng (ktt): tài khoản test Hạnh
// ════════════════════════════════════════════════════════════════════

// users.role là text, không có CHECK hay enum, nên vai mới không cần đổi cấu trúc.
// Seed chỉ chạy khi bảng users rỗng, DB đã có dữ liệu thì phải chèn tay ở đây. Cùng
// giá trị server/seed.ts truyền cho storage.createUser; created_at ghi giờ UTC không
// múi vì đó là cách drizzle ghi Date vào cột timestamp, đặt now() trần thì Postgres
// trong máy ghi theo múi giờ phiên và lệch so với các dòng app tạo.
// ON CONFLICT chỉ bắt trùng SĐT: trùng username hay lệch bộ đếm id thì phải báo lỗi
// ra chứ không lặng lẽ bỏ qua rồi in như đã có tài khoản.
// Bảng users trống (DB mới, chưa khởi động server lần nào) thì để seed tạo: chèn Hạnh
// vào đây là bảng hết trống, seed tưởng DB đã có dữ liệu nên bỏ qua toàn bộ nhân sự,
// dịch vụ và đơn mẫu mà không báo gì.
const usersTrong = !rowsOf(await db.execute(sql`SELECT 1 FROM users LIMIT 1`)).length;
await db.execute(sql`
  INSERT INTO users (
    username, password, phone, name, role, department, ranking, ihos_user_id,
    status, offboarding_date, monthly_target_hh, monthly_target_orders,
    target_revenue, current_revenue, commission_rate, created_at, created_by_user_id
  )
  SELECT
    'hanh', '', '0900000007', 'Nguyễn Thị Minh Hạnh', 'ktt', 'Phòng Kế toán', NULL, NULL,
    'active', NULL, 0, 0,
    50000000, 0, 5, now() AT TIME ZONE 'UTC', NULL
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE phone = '0900000007')
    AND EXISTS (SELECT 1 FROM users)
  ON CONFLICT (phone) DO NOTHING
`);
const hanh = rowsOf<{ id: number; name: string; role: string; status: string }>(
  await db.execute(sql`SELECT id, name, role, status FROM users WHERE phone = '0900000007'`),
)[0];
console.log(
  hanh
    ? `Kế toán trưởng: ${hanh.name} (id ${hanh.id}, vai ${hanh.role}, ${hanh.status})` +
        (hanh.role !== "ktt" ? `. Số 0900000007 đã có người ở vai khác, không đổi.` : "")
    : usersTrong
      ? "Kế toán trưởng: bảng users trống, để seed tạo cùng các tài khoản khác"
      : "Kế toán trưởng: chưa tạo được tài khoản 0900000007",
);

// ════════════════════════════════════════════════════════════════════
// C. Dọn tiền sai do engine cũ để lại (không đổi cấu trúc bảng)
// ════════════════════════════════════════════════════════════════════

// Từ nay hủy lịch, không đến, dời lịch chuyển khoản chưa duyệt sang CANCEL trong cùng
// lần đổi trạng thái. Đơn đã ở các trạng thái đó từ trước thì khoản vẫn Chờ duyệt và
// vẫn được cộng ở Trang chủ, đơn dời lịch còn bị tính hai lần (đơn cũ lẫn đơn mới).
// Khoản đã duyệt, từ chối, khiếu nại giữ nguyên: đó là quyết định của Kế toán.
const huyKhoan = rowsOf<{ id: number; order_id: number; status_cu: string; amount: number }>(
  await db.execute(sql`
    WITH cu AS (
      SELECT id, status FROM commission_records
      WHERE status IN ('TAM_TINH', 'CHO_DUYET')
        AND order_id IN (
          SELECT id FROM orders WHERE appointment_status IN ('cancelled', 'no_show', 'rescheduled')
        )
      FOR UPDATE
    )
    UPDATE commission_records cr SET status = 'CANCEL'
    FROM cu WHERE cr.id = cu.id
    RETURNING cr.id, cr.order_id, cu.status AS status_cu, cr.amount
  `),
);

// Đơn do CEO, Kế toán, Trưởng ca, Bác sĩ tạo từng được gán vai Sale, tra bảng tỷ lệ
// Sale theo bậc của họ không ra gì nên sinh khoản 0₫ nằm trong bảng duyệt. Engine mới
// không gán vai đó nữa; xoá khoản 0₫ chưa ai quyết và vai Sale không còn khoản nào.
// Chỉ đụng khoản đúng 0₫ nên khoản có tiền thật của người đã đổi vai vẫn còn.
const xoaKhoan0 = rowsOf<{ id: number; order_id: number; user_id: number; status: string }>(
  await db.execute(sql`
    DELETE FROM commission_records cr
    USING order_role_assignments a, users u
    WHERE cr.role_assignment_id = a.id
      AND a.role = 'sale' AND u.id = a.user_id AND u.role <> 'sale'
      AND cr.status IN ('TAM_TINH', 'CHO_DUYET', 'CANCEL') AND cr.amount = 0
    RETURNING cr.id, cr.order_id, cr.user_id, cr.status
  `),
);
const xoaVai = rowsOf<{ id: number; order_id: number; user_id: number }>(
  await db.execute(sql`
    DELETE FROM order_role_assignments a
    USING users u
    WHERE u.id = a.user_id AND a.role = 'sale' AND u.role <> 'sale'
      AND NOT EXISTS (SELECT 1 FROM commission_records cr WHERE cr.role_assignment_id = a.id)
    RETURNING a.id, a.order_id, a.user_id
  `),
);

// orders.commission giờ là hoa hồng của chủ đơn lấy từ khoản thật (capNhatHoaHongDon
// trong server/commission-engine.ts). Tính lại cho đơn vừa bị đụng ở trên; đơn khác
// giữ số cũ tới lần sửa dịch vụ kế tiếp để không làm nhảy số của đơn không có lỗi.
const donDung = Array.from(new Set(xoaKhoan0.map((r) => Number(r.order_id))));
const capNhatDon = rowsOf<{ id: number }>(
  await db.execute(sql`
    UPDATE orders o SET commission = COALESCE((
      SELECT SUM(cr.amount) FROM commission_records cr
      WHERE cr.order_id = o.id AND cr.user_id = o.user_id
        AND cr.status IN ('TAM_TINH', 'CHO_DUYET', 'DUOC_DUYET', 'KHIEU_NAI')
    ), 0)
    WHERE o.appointment_status IN ('cancelled', 'no_show', 'rescheduled')
      ${donDung.length ? sql`OR o.id IN (${sql.join(donDung.map((id) => sql`${id}`), sql`, `)})` : sql``}
    RETURNING o.id
  `),
);
console.log(
  `Hoa hồng: hủy ${huyKhoan.length} khoản chờ duyệt của đơn đã hủy, không đến, dời lịch; ` +
    `xoá ${xoaKhoan0.length} khoản 0₫ và ${xoaVai.length} vai Sale gán nhầm; ` +
    `tính lại hoa hồng hiển thị của ${capNhatDon.length} đơn`,
);

// Mục này đổi tiền của đơn ngoài luồng duyệt, nên mỗi đơn bị đụng có một dòng nhật ký
// ghi lại khoản nào đổi từ trạng thái gì, khoản và vai nào bị xoá. Chạy lại thì ba danh
// sách trên rỗng, không sinh thêm dòng.
type DongDon = {
  huy: { id: number; status: string; amount: number }[];
  xoaKhoan: { id: number; userId: number; status: string }[];
  xoaVai: { id: number; userId: number; role: string }[];
};
const theoDon = new Map<number, DongDon>();
const donCua = (id: number): DongDon => {
  const k = Number(id);
  if (!theoDon.has(k)) theoDon.set(k, { huy: [], xoaKhoan: [], xoaVai: [] });
  return theoDon.get(k)!;
};
for (const r of huyKhoan) donCua(r.order_id).huy.push({ id: r.id, status: r.status_cu, amount: r.amount });
for (const r of xoaKhoan0) donCua(r.order_id).xoaKhoan.push({ id: r.id, userId: r.user_id, status: r.status });
for (const r of xoaVai) donCua(r.order_id).xoaVai.push({ id: r.id, userId: r.user_id, role: "sale" });
for (const [orderId, d] of Array.from(theoDon)) {
  await db.execute(sql`
    INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before, after, source)
    VALUES (
      NULL, 'order.commission_cleanup', 'order', ${orderId},
      ${JSON.stringify({ commissionRecords: d.huy, deletedRecords: d.xoaKhoan, deletedAssignments: d.xoaVai })}::jsonb,
      ${JSON.stringify({ cancelledRecordIds: d.huy.map((x) => x.id) })}::jsonb,
      'migration'
    )
  `);
}
if (theoDon.size) console.log(`Nhật ký: ghi ${theoDon.size} dòng order.commission_cleanup`);

// ════════════════════════════════════════════════════════════════════
// E. Chữ hiển thị trong dữ liệu sẵn có
// ════════════════════════════════════════════════════════════════════

// Mô tả mã giảm giá in thẳng ra màn chi tiết mã. Seed đã đổi sang "₫" nhưng seed không
// chạy lại trên DB đã có dữ liệu, nên dòng cũ còn "đ". Chỉ đổi đúng chuỗi seed cũ để
// không đè mô tả CEO đã tự sửa.
const doiMoTa = rowsOf<{ code: string }>(
  await db.execute(sql`
    UPDATE vouchers SET description = 'Giảm thẳng 100.000₫'
    WHERE code = 'FLAT100K' AND description = 'Giảm thẳng 100.000đ'
    RETURNING code
  `),
);
console.log(`Mô tả mã giảm giá: sửa đơn vị tiền ở ${doiMoTa.length} mã`);

// Mục mới của Đợt 0 thêm phía trên dòng này: process.exit cắt kết nối DB đang mở,
// câu nào đứng sau nó sẽ không chạy.
process.exit(0);
