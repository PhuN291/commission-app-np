/**
 * Chạy seed MỘT lần lên DB đang trỏ bởi DATABASE_URL (idempotent — chỉ chèn khi rỗng).
 * Dùng cho production (Neon) vì auto-seed-on-boot đã tắt ở production.
 *
 * Cách chạy:  DATABASE_URL="<neon-pooled-url>" npm run seed
 */
import { seedDatabase } from "../server/seed";
import { pool } from "../server/db";

(async () => {
  console.log("→ Seeding database…");
  await seedDatabase();
  console.log("✓ Seed done.");
  await pool.end();
  process.exit(0);
})().catch((err) => {
  console.error("✗ Seed failed:", err);
  process.exit(1);
});
