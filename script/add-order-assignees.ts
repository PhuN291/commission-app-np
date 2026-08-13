/**
 * Thêm 2 cột phụ trách cho bảng orders: indicated_by_user_id (Chỉ định) và
 * performed_by_user_id (Thực hiện). Chỗ Tư vấn dùng lại cột sale_user_id có sẵn.
 *
 * Vì sao viết DDL tay thay vì `npm run db:push`: trong DB còn vài bảng mồ côi đã
 * bị gỡ khỏi schema, drizzle-kit thấy vậy là dừng lại hỏi xoá hay giữ, mà nó hỏi
 * qua TTY nên chạy trong phiên này là treo. IF NOT EXISTS cho chạy lại nhiều lần
 * mà không hỏng gì.
 *
 * Chạy: npx tsx script/add-order-assignees.ts
 * Chạy trên Neon: DATABASE_URL=<chuỗi Neon> npx tsx script/add-order-assignees.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../server/db"; // tự nạp .env, không cần dotenv

await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS indicated_by_user_id integer`);
await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS performed_by_user_id integer`);

// Đơn cũ chưa có ai ở chỗ Tư vấn, trong khi chủ đơn (user_id) chính là người đã
// tư vấn bán dịch vụ đó. Điền một lần cho dữ liệu cũ khỏi trống trơn; đơn tạo qua
// app từ nay đã tự set sale_user_id lúc nhận đơn nên không cần chạy lại.
const bu: any = await db.execute(sql`
  UPDATE orders SET sale_user_id = user_id WHERE sale_user_id IS NULL
`);
console.log("Đã điền Tư vấn cho", bu.rowCount ?? 0, "đơn cũ");

const r: any = await db.execute(sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'orders'
    AND column_name IN ('sale_user_id', 'indicated_by_user_id', 'performed_by_user_id')
  ORDER BY column_name
`);
console.log("Cột phụ trách hiện có:", (r.rows ?? r).map((x: any) => x.column_name));
process.exit(0);
