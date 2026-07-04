# G1a, chia nhỏ giải quyết từng cái một

Thay vì giao Claude Code 8 việc một lúc, mình chẻ G1a thành 3 bước nhỏ. Mỗi bước
giao máy một lần, anh bấm test, đậu rồi mới sang bước kế. Sai ở đâu biết ngay ở đó,
và lùi lại dễ.

Lộ trình:

- Bước 1 (dưới đây): dựng database và tạo sẵn các bảng. App vẫn chạy như cũ.
- Bước 2 (đưa sau khi bước 1 đậu): chuyển app sang ghi vào database thật. Đây là bước
  có test quan trọng nhất, tạo đơn rồi restart đơn còn nguyên.
- Bước 3 (đưa sau khi bước 2 đậu): dọn cấu hình để chạy mượt khi lên production.

Bước này mang lại gì cho khách: chưa thấy gì trên màn hình, đây là phần móng. Nhưng
không có móng này thì dữ liệu đơn và hoa hồng của phòng khám vẫn bay mất mỗi lần
restart, mọi thứ làm sau đều vô nghĩa. Phần khách cảm nhận được rõ là ở G1b và G2.

Điều kiện trước khi chạy: phải có database Postgres và biến `DATABASE_URL`. Trên
Replit, tạo Postgres trong tab Database là nó tự set. Nếu thiếu, máy sẽ báo và mình
tạo trước rồi chạy lại.

Schema chi tiết tham chiếu: `audit-docs/G1-G2-SPEC-nen-du-lieu-va-engine-HH.md` mục 3.2.

---

## PROMPT BƯỚC 1 (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: App NP Commission đang chạy in-memory (server/storage.ts MemoryStorage,
server/db.ts rỗng). Việc của bước này CHỈ là dựng kết nối Postgres và tạo sẵn các bảng.
KHÔNG chuyển app sang dùng database trong bước này. Sau bước này app vẫn chạy y hệt cũ
(vẫn in-memory), chỉ khác là database đã có sẵn và các bảng đã được tạo, chờ bước sau.

Đây là bước nhỏ, scope đóng. Làm đúng danh sách dưới, không hơn.

CHỈ LÀM:

1. Cài: pg, @types/pg (devDependency), drizzle-kit (devDependency).

2. Tạo server/db.ts:
   import { Pool } from "pg";
   import { drizzle } from "drizzle-orm/node-postgres";
   import * as schema from "@shared/schema";
   if (!process.env.DATABASE_URL) throw new Error("Thiếu DATABASE_URL");
   export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
   export const db = drizzle(pool, { schema });

3. Tạo drizzle.config.ts ở thư mục gốc:
   import { defineConfig } from "drizzle-kit";
   export default defineConfig({
     schema: "./shared/schema.ts",
     out: "./drizzle",
     dialect: "postgresql",
     dbCredentials: { url: process.env.DATABASE_URL! },
   });

4. Mở rộng shared/schema.ts (chỉ thêm, không xoá gì):
   a. Bảng orders: thêm các cột mới, tất cả nullable hoặc có default để không phá dữ
      liệu cũ: customerId int nullable, source text default 'manual', idempotencyKey
      text nullable unique, saleUserId int nullable, insuranceAmount int default 0,
      voucherAmount int default 0, totalListed int default 0, netProfit int default 0,
      confirmedAt timestamp nullable, completedAt timestamp nullable. KHÔNG đụng các cột
      đang có.
   b. Bảng services: thêm defaultCost int default 0.
   c. Thêm 5 bảng mới đúng theo SPEC mục 3.2: order_items, order_role_assignments,
      commission_records, adjustments, audit_logs. Mỗi bảng định nghĩa pgTable + insert
      schema + type, cùng phong cách các bảng đang có. Chỉ định nghĩa, chưa nối vào logic.

5. Thêm script vào package.json: "db:push": "drizzle-kit push".

6. Chạy npm run db:push để tạo bảng trên Postgres.

7. Thêm dòng .env vào .gitignore (nếu chưa có).

KHÔNG LÀM (để các bước sau):
- KHÔNG sửa server/storage.ts, vẫn để export const storage = new MemoryStorage().
- KHÔNG viết DbStorage trong bước này.
- KHÔNG đụng server/routes.ts, server/seed.ts.
- KHÔNG đụng bất kỳ file nào trong client/.
- KHÔNG đụng các store mock (commission.ts, orderItems.ts, adjustments.ts, clawbacks.ts).
- KHÔNG đụng đăng nhập, OTP, phân quyền.
- KHÔNG xoá cột cũ nào.

TEST SAU KHI LÀM (chạy và báo kết quả từng dòng):
1. npm run check (tsc) không lỗi type.
2. npm run db:push chạy thành công, không lỗi.
3. Kết nối vào Postgres, liệt kê bảng, phải thấy đủ: users, services, customers, orders,
   commission_tiers, appointments, transactions, status_logs, staff_members, order_items,
   order_role_assignments, commission_records, adjustments, audit_logs.
4. Khởi động app (npm run dev), đăng nhập bằng SĐT mẫu và xem danh sách đơn, khách như
   bình thường (app vẫn chạy in-memory, đây là điều mong đợi ở bước này).

TIÊU CHÍ HOÀN THÀNH: các bảng đã được tạo trong Postgres, app vẫn chạy y như trước,
chưa có gì thay đổi với người dùng. Báo lại danh sách bảng đã tạo.
```

---

Sau khi máy chạy xong bước 1 và 4 mục test đều đậu, anh báo em. Em viết tiếp prompt
bước 2 (chuyển app sang ghi database thật, có bài test tạo đơn rồi restart đơn còn nguyên).
