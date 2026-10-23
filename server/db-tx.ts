import { db } from "./db";

/**
 * Transaction drizzle đang mở. Những bước cùng một lần ghi tiền (đơn, dòng dịch vụ,
 * người hưởng, khoản hoa hồng, lượt voucher) nhận nó làm tham số thay vì tự gọi `db`,
 * vì đọc qua `db` là đọc trên kết nối khác, không thấy dòng chưa commit của nhau.
 */
export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
