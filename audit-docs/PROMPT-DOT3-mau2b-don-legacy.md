# Đợt 3 mẩu 2b: dọn hai nhánh tàn dư transactions và appointments

Đây là phần còn lại của mẩu 2. Bản review của máy đề xuất "scope theo người" cho /api/transactions
và /api/appointments. Nhưng đọc code thật cho thấy hai nhánh này là tàn dư từ bộ khung mẫu, không
phải nghiệp vụ NP, và không nơi nào trong giao diện dùng. Nên việc đúng là xóa, không phải scope.

Bằng chứng đã kiểm:
- Giao diện không gọi /api/transactions hay /api/appointments ở bất kỳ đâu (grep rỗng).
- Bảng appointments không có cột chủ sở hữu, không thể lọc theo người.
- Hàm getTransactionsByUser đã mồ côi sau khi xóa cửa /api/income.
- NP thật dùng orders, order_items, commission_records; lịch hẹn nằm sẵn trong đơn (cột ngày giờ
  hẹn của orders). Hai bảng transactions, appointments chỉ còn route chết cộng dữ liệu seed demo.

CẢNH BÁO BẪY QUAN TRỌNG, đọc kỹ trước khi xóa:
Có hai thứ tên gần giống nhau nhưng KHÁC HẲN. Chỉ xóa cái thứ nhất, GIỮ NGUYÊN cái thứ hai.
- XÓA: bảng appointments (lịch hẹn của bộ khung mẫu) và bảng transactions.
- GIỮ: trạng thái lịch hẹn của ĐƠN HÀNG. Cụ thể giữ nguyên, tuyệt đối không đụng:
  cột orders.appointmentStatus, hàm updateOrderAppointmentStatus, kiểu AppointmentStatusCode
  (trong shared/status.ts), hằng APPOINTMENT_TRANSITIONS, và route PATCH /api/orders/:id/appointment-status.
  Đây là nghiệp vụ thật của đơn, không liên quan bảng appointments.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Hai bảng transactions và appointments là tàn dư từ bộ khung mẫu ban đầu, không thuộc
nghiệp vụ phòng khám. Giao diện không gọi /api/transactions hay /api/appointments ở đâu cả; bảng
appointments không có cột chủ sở hữu; hàm getTransactionsByUser đã không còn ai dùng sau khi xóa
route /api/income. NP dùng orders, order_items, commission_records thay thế. Việc mẩu này: xóa
sạch hai nhánh này để dọn code chết và bịt chỗ đang trả dữ liệu cho mọi người. CHỈ làm việc này.

CẢNH BÁO BẪY: phân biệt bảng appointments (XÓA) với trạng thái lịch hẹn của ĐƠN (GIỮ). Tuyệt đối
KHÔNG đụng: cột orders.appointmentStatus, hàm updateOrderAppointmentStatus, kiểu AppointmentStatusCode
(shared/status.ts), hằng APPOINTMENT_TRANSITIONS, route PATCH /api/orders/:id/appointment-status.
Mấy thứ này là nghiệp vụ đơn, không liên quan bảng appointments.

Trước khi xóa, tự grep xác nhận giao diện không gọi hai route này và không file nào ngoài
routes/seed/storage dùng tới chúng. Nếu phát hiện có nơi đang dùng thật, DỪNG và báo.

Làm, theo đúng các điểm sau:

1. shared/schema.ts: xóa bảng appointments và transactions cùng kiểu và schema kèm theo:
   Appointment, InsertAppointment, insertAppointmentSchema, Transaction, InsertTransaction,
   insertTransactionSchema.

2. server/routes.ts:
   - Xóa import insertAppointmentSchema và insertTransactionSchema (giữ các import schema khác).
   - Xóa năm route: GET /api/appointments, POST /api/appointments, PATCH /api/appointments/:id/status,
     GET /api/transactions, POST /api/transactions.
   - Xóa hằng VALID_STATUSES (chỉ route appointments dùng, sau khi xóa route thì nó mồ côi).
     LƯU Ý: không nhầm với APPOINTMENT_TRANSITIONS dùng cho trạng thái đơn, cái đó giữ.

3. server/storage.ts (interface IStorage và lớp MemoryStorage) và server/storage.db.ts (lớp DbStorage):
   - Xóa các hàm: getAllAppointments, getAppointment, createAppointment, updateAppointmentStatus,
     getAllTransactions, getTransactionsByUser, createTransaction.
   - Xóa import kiểu Appointment, InsertAppointment, Transaction, InsertTransaction ở đầu hai file.
   - Trong storage.db.ts: bỏ appointments và transactions khỏi dòng import bảng (users, services,
     appointments, transactions, orders, ...), và sửa lại bình luận đầu file đang liệt kê hai bảng này.
   - Trong MemoryStorage: bỏ hai mảng private appointments và transactions, và bỏ hai khóa
     appointments và transactions trong bộ đếm nextId.
   - GIỮ updateOrderAppointmentStatus (đây là của đơn, không phải bảng appointments).

4. server/seed.ts: bỏ phần tạo năm lịch hẹn mẫu (createAppointment) và bốn giao dịch mẫu
   (createTransaction).

KHÔNG LÀM:
- KHÔNG đụng orders, order_items, commission_records, hay bất cứ phần hoa hồng nào.
- KHÔNG đụng trạng thái lịch hẹn của đơn (xem cảnh báo bẫy ở trên).
- KHÔNG drop bảng vật lý trong database (không chạy migration xóa bảng). Chỉ bỏ trong mã. Bảng cũ
  nằm lại trong database không sao.
- KHÔNG đụng Settings, màn giả, hay phần khác.

KHÔNG LÀM HỎNG:
- Trình biên dịch sạch sau khi xóa.
- App vẫn khởi động, seed vẫn chạy không lỗi.
- Các màn đơn hàng, thu nhập, trang chủ, khách hàng, tái khám vẫn chạy bình thường.
- Tạo đơn và đổi trạng thái đơn vẫn hoạt động (vì trạng thái lịch hẹn của đơn được giữ nguyên).

TEST (chạy và báo rõ):
1. npm run check (tsc) sạch.
2. grep toàn dự án không còn /api/transactions, /api/appointments, getAllTransactions,
   getAllAppointments, getTransactionsByUser, createAppointment, createTransaction, VALID_STATUSES.
3. grep xác nhận VẪN CÒN: orders.appointmentStatus, updateOrderAppointmentStatus, AppointmentStatusCode,
   route PATCH /api/orders/:id/appointment-status.
4. Khởi động server không lỗi, seed chạy xong.
5. Đăng nhập, mở các màn đơn hàng, thu nhập, trang chủ, khách hàng: hiển thị đúng như trước.
6. Tạo một đơn mới và đổi trạng thái một đơn: vẫn hoạt động.

TIÊU CHÍ HOÀN THÀNH: hai nhánh transactions và appointments đã bị gỡ khỏi route, storage, seed và
schema; không còn tham chiếu; trạng thái lịch hẹn của đơn còn nguyên; trình biên dịch sạch; các
màn thật vẫn chạy. Báo lại kết quả test từng mục.
```

---

Xong việc này là khép mẩu 2. Đợt 3 còn hai mẩu: dọn Settings và bỏ các màn giả. Anh chạy xong dán
kết quả, em đọc code kiểm như mọi lần.
