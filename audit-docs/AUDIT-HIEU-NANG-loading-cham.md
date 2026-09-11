# Audit hiệu năng — App loading chậm (4-5s ở trang chủ)

Ngày: 2026-09-11
Triệu chứng: mở app chậm 4-5 giây, xảy ra **mọi lần** (không riêng lần đầu) và **đặc biệt nặng ở trang chủ (Dashboard)**. → loại trừ cold start Vercel/Neon là nguyên nhân chính; trọng tâm nằm ở kiến trúc gọi query của Dashboard.

---

## 1. Nguyên nhân chính — Dashboard gọi DB tuần tự + N+1 (mức ảnh hưởng: CAO)

File: [server/dashboard.ts](../server/dashboard.ts)

### 1.1 Chuỗi query tuần tự, không `Promise.all`

**Personal dashboard** (`getPersonalDashboard`, dòng 165-213) — role Sale/BS, gọi lần lượt:

1. `getUser` (dòng 166)
2. `getCommissionRecordsByUser` kỳ hiện tại (dòng 172)
3. `getOrdersByUser` (dòng 176)
4. `getCommissionRecordsByUser` kỳ trước (dòng 186) — gần giống bước 2 nhưng tách riêng
5. `getEffectiveCommissionRate` (dòng 193)
6. `buildPendingTasks` (dòng 212) → lại gọi thêm `getAllOrders()` + `getRecallWorklist()` bên trong

**Admin dashboard** (`getAdminDashboard`, dòng 216-278) — role KT/CEO, còn nặng hơn:

- `getUser`, `getAllUsers` (dòng 220), `getAllOrders` (dòng 221), `getAllCommissionRecordsByCycle` (dòng 232), rồi `buildPendingTasks` (dòng 275) gọi lại `getAllOrders()` **lần thứ 2**.

Không có bước nào trong 2 hàm trên dùng `Promise.all` dù phần lớn các query độc lập với nhau (không phụ thuộc kết quả của nhau).

### 1.2 N+1 query trong `getRecallWorklist`

File: [server/storage.db.ts:742-810](../server/storage.db.ts#L742-L810)

Đây là điểm nặng nhất, gồm nhiều round-trip DB liên tiếp:

- 1 query JOIN `orderItems` + `orders` + `customers` — join theo cột `phone` (không phải khóa chính/FK chuẩn) nên phải tự dedupe bằng `Set` ở tầng JS (dòng 764-768).
- **N+1 thật sự**: loop từng `assigneeId` gọi `this.getUser(uid)` riêng lẻ (dòng 776-779) thay vì 1 query `inArray(assigneeIds)` — nếu có N nhân viên liên quan, tốn N round-trip DB tuần tự.
- Thêm 1 query `recallLogs` (`inArray(itemIds)`).
- "Lần gọi gần nhất theo item", dedupe, sort — toàn bộ làm bằng tay trong JS (Map/Set) thay vì để SQL GROUP BY / window function xử lý.

### 1.3 `getAllOrders()` bị gọi 2 lần trùng lặp trong cùng 1 request

- Personal: 1 lần trong `buildPendingTasks` (dòng 74).
- Admin: 1 lần ở dòng 221 + 1 lần nữa trong `buildPendingTasks` (dòng 74) → **2 lần full table scan** cho cùng 1 request.

File: [server/storage.db.ts:281-283](../server/storage.db.ts#L281-283) — `getAllOrders` là `SELECT * FROM orders ORDER BY id DESC`, không filter, không LIMIT → quét toàn bảng mỗi lần gọi.

### Vì sao cộng dồn ra đúng 4-5 giây

Ước tính ~8-12 round-trip DB tuần tự (chưa tính N+1 của recall worklist theo số nhân viên) × 100-300ms/round-trip (latency thật tới Neon qua pooler, có thể khác region với Vercel function) = dễ dàng cộng dồn thành 3-5 giây. Không phải do 1 query nặng, mà do **kiến trúc gọi nối tiếp + N+1** — mỗi query tự nó nhanh (<200ms) nhưng số lượng nhân lên.

### Đề xuất sửa (ưu tiên cao nhất)

1. Gộp các query độc lập trong `getPersonalDashboard`/`getAdminDashboard` bằng `Promise.all` — giảm ngay phần lớn thời gian vì nhiều query không phụ thuộc nhau.
2. Sửa N+1 trong `getRecallWorklist`: thay loop `getUser()` bằng 1 query `inArray(assigneeIds)`.
3. Bỏ gọi `getAllOrders()` trùng lặp — fetch 1 lần, tái dùng cho cả `buildPendingTasks` và phần còn lại của hàm.
4. Về lâu dài: đẩy các phép tính aggregate (sum theo cycle, group theo user...) xuống SQL thay vì kéo cả bảng về rồi filter/reduce bằng JS.

---

## 2. DB driver không tối ưu cho serverless (mức ảnh hưởng: TRUNG BÌNH — chủ yếu ảnh hưởng cold start)

File: [server/db.ts](../server/db.ts)

```ts
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

- Dùng `pg` `Pool` (kết nối TCP/TLS thông thường qua `node-postgres`) thay vì `@neondatabase/serverless` — driver HTTP/WebSocket mà Neon khuyến nghị riêng cho môi trường serverless.
- Pool không set `max`, `idleTimeoutMillis`, `connectionTimeoutMillis` — dùng default của `pg` (`max: 10`, `idleTimeoutMillis: 10000`). Mỗi Vercel function instance nguội tạo pool riêng, không tái sử dụng giữa các instance khác nhau.
- Điểm tốt: connection string đã trỏ đúng Neon pooled endpoint (`-pooler` trong host).
- Vì user xác nhận **mọi lần đều chậm** (không chỉ lần đầu), phần này không phải nguyên nhân chính của 4-5s hiện tại, nhưng vẫn đáng sửa vì ảnh hưởng cold start và rủi ro chạm giới hạn connection của Neon khi traffic tăng.

### Đề xuất

Chuyển sang `@neondatabase/serverless` khi có điều kiện — không khẩn cấp bằng mục 1.

---

## 3. Frontend load toàn bộ 1 bundle (mức ảnh hưởng: CAO cho lần đầu, thấp hơn cho các lần sau nhờ cache)

File: [client/src/App.tsx:6-28](../client/src/App.tsx#L6-L28)

- Cả 22 trang (kể cả trang admin ít dùng: `AdminStaff`, `AdminCommissionConfig`, `AdminVouchers`...) được `import` eager (static) — không có `React.lazy()` nào trong toàn bộ `client/src` (grep xác nhận 0 kết quả).
- [vite.config.ts](../vite.config.ts) không cấu hình `build.rollupOptions.output.manualChunks` — không tách vendor chunk (React, ~20 gói Radix UI, `framer-motion`, `date-fns`...) khỏi app code.
- Hệ quả: user phải tải toàn bộ JS của cả app (kể cả các trang họ không có quyền/không dùng tới) ngay khi mở trang chủ.

### Đề xuất

- Thêm `React.lazy()` + route-based code splitting trong `App.tsx`, đặc biệt cho các trang admin.
- Cấu hình `manualChunks` trong `vite.config.ts` để tách vendor bundle, tận dụng browser cache giữa các lần deploy.

---

## 4. Các vấn đề phụ khác (mức ảnh hưởng: THẤP-TRUNG BÌNH)

- **React Query refetch thừa**: [client/src/lib/queryClient.ts:134](../client/src/lib/queryClient.ts#L134) set `refetchOnMount: "always"` — mỗi lần mount lại một trang sẽ luôn gọi lại API nền dù `staleTime: Infinity`. Không chặn UI (có cache hiển thị ngay) nhưng tăng tải server/DB không cần thiết.
- **Thiếu pagination**: `getAllOrders`/`getAllUsers` ([storage.db.ts:281](../server/storage.db.ts#L281), [172](../server/storage.db.ts#L172)) và endpoint `GET /api/orders`, `GET /api/customers` ([server/routes.ts:651](../server/routes.ts#L651), [1062](../server/routes.ts#L1062)) đều trả toàn bộ danh sách không giới hạn — càng nhiều dữ liệu theo thời gian, càng chậm dần dù kiến trúc không đổi.
- **Serverless bundle gộp toàn bộ Express app** ([script/build-serverless.ts:9-25](../script/build-serverless.ts#L9-L25)) vào 1 function — chấp nhận được với quy mô hiện tại, không phải ưu tiên sửa.
- **Static assets**: đã kiểm tra, nhỏ (ảnh lớn nhất ~52KB) — không phải nguyên nhân.

---

## Tổng kết thứ tự ưu tiên sửa

| # | Việc cần làm | Tác động | File chính |
| --- | --- | --- | --- |
| 1 | `Promise.all` hoá các query độc lập trong `getPersonalDashboard`/`getAdminDashboard` | Cao | `server/dashboard.ts` |
| 2 | Sửa N+1 trong `getRecallWorklist` (batch `getUser` bằng `inArray`) | Cao | `server/storage.db.ts` |
| 3 | Bỏ gọi `getAllOrders()` trùng lặp trong cùng request | Trung bình-Cao | `server/dashboard.ts` |
| 4 | Thêm `React.lazy()` + `manualChunks` cho frontend | Cao (lần đầu) | `client/src/App.tsx`, `vite.config.ts` |
| 5 | Thêm pagination cho các list API/query lớn | Trung bình (tăng dần theo dữ liệu) | `server/storage.db.ts`, `server/routes.ts` |
| 6 | Đổi driver DB sang `@neondatabase/serverless` | Trung bình (cold start) | `server/db.ts` |
| 7 | Xem lại `refetchOnMount: "always"` | Thấp | `client/src/lib/queryClient.ts` |

---

## Tiến độ triển khai

Quy ước: mỗi bước = 1 commit riêng trên `feature/np-ui-v4`, dừng lại review trước khi sang bước kế tiếp. Không gộp nhiều bước vào 1 commit để dễ revert nếu có vấn đề.

| Bước | Nội dung | Gộp từ mục ưu tiên | Trạng thái | Commit |
| --- | --- | --- | --- | --- |
| 1 | Refactor `dashboard.ts`: `Promise.all` hoá query độc lập + bỏ gọi `getAllOrders()` trùng lặp | #1 + #3 | ✅ Xong (chờ review) | `ec1e26e` |
| 2 | Sửa N+1 trong `getRecallWorklist` (batch `getUser` bằng `inArray` + chạy song song với query `recallLogs`) | #2 | ✅ Xong (chờ review) | `a0d70c7` |
| 3 | Code splitting frontend: `React.lazy()` cho các trang không phải Login/Dashboard + `manualChunks` tách vendor-react/vendor-radix | #4 | ✅ Xong (chờ review) | `7b738d0` |
| 4 | Thêm pagination cho list API/query lớn | #5 | ⏸️ Tạm hoãn | — |
| 5 | Đổi driver DB sang `@neondatabase/serverless` (bỏ `pg`) | #6 | ✅ Xong (chờ review) | (chưa commit) |
| 6 | Xem lại `refetchOnMount: "always"` | #7 | ⬜ Chưa làm | — |

### Ghi chú bước 4 — vì sao tạm hoãn

Khảo sát cho thấy `getAllOrders()`/`getAllUsers()` được gọi ở gần như mọi module (`analytics.ts`, `dashboard.ts`, `ranking.ts`, `notifications.ts`, `income.ts`, các đoạn join trong `routes.ts`) để tính **aggregate trong bộ nhớ** (KPI, leaderboard, tổng doanh thu...) — không thể phân trang các hàm này mà không viết lại thành SQL aggregate riêng.

Với `GET /api/orders`/`GET /api/customers`: an toàn hơn cho trang list-view (`orders.tsx`, `customers.tsx`), nhưng client hiện tự filter/search/sort trên toàn bộ mảng nhận về — cần dời logic đó lên server trước khi phân trang, nếu không sẽ lọc sai theo trang.

**Rủi ro cụ thể nếu làm ẩu**: `customers.tsx` gọi `/api/orders` (toàn bộ, không lọc) chỉ để tự tính tổng chi tiêu/số đơn theo từng khách hàng trên client. Phân trang `/api/orders` mà không có endpoint aggregate riêng cho customer stats sẽ khiến trang Customers hiển thị **sai** số liệu chi tiêu.

Quyết định: dữ liệu hiện tại chưa đủ lớn để pagination tạo khác biệt rõ rệt ngay bây giờ (đây là việc phòng ngừa cho tương lai, không phải fix cho vấn đề 4-5s hiện tại — vấn đề đó đã được giải quyết ở bước 1-3). Tạm hoãn để tránh rủi ro sai số liệu, ưu tiên bước 5 (đổi DB driver). Sẽ quay lại khi dữ liệu orders/customers tăng đủ lớn để cần thiết.

Trạng thái: ⬜ Chưa làm · 🔄 Đang làm · ✅ Xong  · ✔️ Đã review & merge
