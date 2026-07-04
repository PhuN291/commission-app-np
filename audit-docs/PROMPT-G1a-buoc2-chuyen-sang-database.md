# G1a bước 2: chuyển app sang ghi vào database thật

Bước 1 đã xong và đậu 4/4 test (database và 14 bảng đã tạo, app vẫn chạy in-memory).
Bước 2 này là phần có ý nghĩa nhất với khách: sau khi xong, dữ liệu đơn và khách không
còn bay mất mỗi lần tắt mở. Đây là lần đầu app trở nên đáng tin để lưu việc thật.

Cách nghiệm thu, anh tự bấm được: tạo một đơn mới, tắt server rồi mở lại, đăng nhập lại,
đơn vừa tạo phải còn nguyên. Trước bước này, tắt mở là mất sạch.

Một điều để anh không bối rối khi test: ở bước này chỉ có ĐƠN và KHÁCH và NHÂN VIÊN là
được lưu thật. Riêng con số hoa hồng vẫn là số giả tạm và vẫn có thể đổi sau khi restart,
vì phần hoa hồng để dành cho G2. Anh chỉ cần kiểm cái đơn còn hay không, đừng bận tâm số
hoa hồng lúc này.

---

## PROMPT BƯỚC 2 (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Bước trước đã tạo database Postgres và các bảng (server/db.ts có sẵn Pool +
drizzle, .env có DATABASE_URL). Nhưng app vẫn đang chạy in-memory: server/storage.ts
export một MemoryStorage lưu mọi thứ trong mảng RAM, mất khi restart. Việc của bước này
là viết một bản lưu trữ chạy trên database thật và chuyển app sang dùng nó, để dữ liệu
còn nguyên sau khi restart. KHÔNG đổi gì khác.

Scope đóng. Làm đúng danh sách dưới.

CHỈ LÀM:

1. Viết class DbStorage implements IStorage (interface đã có trong server/storage.ts),
   đặt trong file mới server/storage.db.ts. Dùng db từ server/db.ts (Drizzle). Implement
   ĐẦY ĐỦ mọi method của IStorage bằng Drizzle query, thay vì thao tác trên mảng.

   Cách làm chuẩn: đọc kỹ class MemoryStorage hiện có, giữ NGUYÊN hành vi từng method,
   chỉ đổi nguồn dữ liệu từ mảng sang truy vấn database. Cụ thể các điểm phải giữ đúng:
   - Bỏ cơ chế nextId thủ công. Dùng cột serial tự tăng của database. Khi insert, dùng
     .returning() để lấy bản ghi vừa tạo trả về.
   - getAllOrders, getOrdersByUser, getCustomerOrders: sắp xếp giảm dần theo id như cũ.
   - getAllStaffMembers: sắp xếp tăng dần theo rank như cũ.
   - searchCustomers: tìm gần đúng theo tên, số điện thoại, email (dùng ilike).
   - updateOrderAppointmentStatus và updateOrderVisitStatus: GIỮ NGUYÊN việc kiểm tra
     chuyển trạng thái hợp lệ qua APPOINTMENT_TRANSITIONS / VISIT_TRANSITIONS, vẫn ghi
     statusLog, vẫn tự đặt visitStatus = 'arrived' khi appointment chuyển sang 'arrived'.
     Bê đúng logic từ MemoryStorage, chỉ đổi đọc ghi sang database.
   - getEffectiveCommissionRate: lấy đúng dòng tier còn hiệu lực tại thời điểm at, tức
     role và ranking khớp, effectiveFrom <= at, và (effectiveTo null hoặc effectiveTo > at).
   - upsertCommissionTier: chạy trong một transaction, đánh dấu dòng đang active cùng
     role và ranking thành effectiveTo = now, rồi chèn dòng mới. Như logic cũ.

2. Trong server/storage.ts, đổi dòng cuối export: thay vì
   export const storage = new MemoryStorage();
   thành import DbStorage từ ./storage.db và export const storage = new DbStorage();
   GIỮ NGUYÊN class MemoryStorage trong file (không xoá) để có thể quay lui nếu cần.

3. KHÔNG cần sửa server/seed.ts. Nó đã có sẵn cơ chế chống nhân đôi (đầu hàm kiểm tra nếu
   đã có user thì return). Khi storage là DbStorage, seed tự ghi vào database, và lần
   restart sau sẽ thấy đã có user nên bỏ qua. Chỉ cần đảm bảo DbStorage.getAllUsers và
   các createX hoạt động đúng.

KHÔNG LÀM (để các bước/giai đoạn sau):
- KHÔNG đụng bất kỳ file nào trong client/.
- KHÔNG sửa logic trong server/routes.ts (interface IStorage giữ nguyên nên routes không
  cần đổi).
- KHÔNG đụng các store mock: server/commission.ts, orderItems.ts, adjustments.ts,
  clawbacks.ts. Chúng vẫn chạy in-memory ở bước này. Nghĩa là hoa hồng và CR vẫn là số
  giả và vẫn mất khi restart. Đó là chấp nhận được, sẽ thay ở G2.
- KHÔNG viết engine tính hoa hồng (G2).
- KHÔNG đụng đăng nhập, OTP, phân quyền (G3).
- KHÔNG đổi schema, KHÔNG thêm bảng (đã xong ở bước 1).

LƯU Ý KHÔNG LÀM HỎNG:
- Giữ đúng chữ ký mọi method của IStorage để routes không vỡ.
- Giữ đúng hành vi state machine khi đổi trạng thái đơn, nếu không các nút đổi trạng thái
  trên giao diện sẽ hỏng.
- Không xoá MemoryStorage, để rollback nhanh bằng cách đổi lại export.
- Dữ liệu test in-memory cũ sẽ không tự chuyển sang database, đó là bình thường. App bắt
  đầu lưu thật từ bước này trở đi.

TEST SAU KHI LÀM (chạy và báo kết quả từng dòng):
1. npm run check (tsc) không lỗi type.
2. Khởi động app (npm run dev). Lần đầu database rỗng nên seed chạy, tạo 7 user, services,
   customers, commission_tiers. Đăng nhập bằng SĐT mẫu, xem danh sách đơn và khách.
3. Tạo một đơn mới qua màn tạo đơn, thấy đơn xuất hiện trong danh sách đơn.
4. QUAN TRỌNG NHẤT: tắt server (Ctrl+C) rồi chạy lại npm run dev, đăng nhập lại. Đơn vừa
   tạo ở bước 3 PHẢI CÒN NGUYÊN. Đây là bằng chứng đã lưu database thật.
5. Restart thêm một lần nữa, kiểm tra số lượng user vẫn là 7 (seed KHÔNG nhân đôi thành 14).
6. Tạo một khách hàng mới, restart, khách đó vẫn còn.

NẾU GẶP MÂU THUẪN giữa các ràng buộc trên (ví dụ phải đụng một file ngoài danh sách mới
chạy được), DỪNG LẠI và hỏi trước khi làm, đừng tự mở rộng phạm vi.

TIÊU CHÍ HOÀN THÀNH: app nhìn từ phía người dùng vẫn y như trước, nhưng đơn và khách và
nhân viên giờ lưu trong database thật, còn nguyên sau khi restart. Báo lại kết quả 6 mục
test, đặc biệt mục 4.
```

---

Sau khi máy chạy xong và mục test số 4 đậu (tạo đơn, restart, đơn còn nguyên), anh báo em.
Em viết bước 3, là bước dọn cấu hình để chạy mượt khi lên production, rồi mình khép G1a và
chuyển sang G1b (mở rộng màn nhập đơn) cùng G2 (engine tính hoa hồng thật).
