# Tính hoa hồng thật, bước 2: lắp công thức + cho màn Income hiện số thật

Bước 1 đã đổ nguyên liệu (mỗi đơn có dòng dịch vụ kèm giá vốn và dòng phân vai kèm phần
trăm). Bước này lắp công thức tính thật, sinh ra con số hoa hồng, và cho đúng một màn hiện
số thật: màn nhân viên xem hoa hồng của mình. Đây là lúc anh bấm thấy số nhảy đúng.

Nghiệm thu, anh tự bấm: đăng nhập bằng tài khoản Mai (số 0901234567, mã 123456), tạo một
đơn mới, rồi vào màn Thu nhập. Số hoa hồng hiện ra phải bằng phần trăm hạng nhân lãi của
đơn. Hiện giá vốn đang 0 nên lãi bằng tổng đơn, hoa hồng Sale của Mai sẽ là 5% của tổng
(hạng M2), khác số giả cũ là 3%.

Phạm vi: chỉ đổi màn Thu nhập sang số thật. Màn tổng quan và màn kế toán duyệt để bước sau.

---

## PROMPT BƯỚC 2 (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Bước trước, khi tạo đơn app đã sinh order_items (có giá vốn) và
order_role_assignments (có phần trăm snapshot) vào database, qua hàm ingestOrderDerived
trong server/ingest.ts. Nhưng CHƯA tính ra con số hoa hồng. Việc bước này: viết engine
tính hoa hồng thật theo công thức B4, sinh bản ghi commission_records, và cho ĐÚNG MỘT màn
là màn Income (nhân viên xem hoa hồng của mình) đọc số thật thay vì số mock.

Scope đóng. Làm đúng danh sách dưới.

CHỈ LÀM:

1. Viết engine tính hoa hồng, ví dụ hàm computeCommissionForOrder(order) trong
   server/ingest.ts (hoặc file server/commission-engine.ts mới, tùy chọn cho sạch). Logic
   theo công thức B4 R-1-1:

     total_listed = tổng (order_item.unitPrice × order_item.quantity) của mọi item
     total_paid   = total_listed − order.insuranceAmount − order.voucherAmount
     total_cost   = tổng (order_item.cost × order_item.quantity) CHỈ item có status='completed'
     net_profit   = total_paid − total_cost

   Với mỗi dòng trong order_role_assignments của đơn:
     amount = round( max(net_profit, 0) × pctAtTimeBp / 10000 )
   Sinh một bản ghi commission_records:
     orderId, roleAssignmentId, userId (từ role assignment), cycleId, baseNetProfit = net_profit,
     pctBp = pctAtTimeBp, amount, status = 'CHO_DUYET', createdAt = now.

   cycleId tính từ order.createdAt (định dạng chuỗi 'DD/MM/YYYY HH:mm') → lấy ra 'YYYY-MM'.
   Nếu parse lỗi thì dùng tháng hiện tại làm fallback.

   Chống trùng: nếu đơn đã có commission_records thì xoá hết dòng cũ của đơn rồi sinh lại
   (để chạy lại không nhân đôi).

2. Gọi computeCommissionForOrder(order) bên trong ingestOrderDerived, NGAY SAU khi đã tạo
   xong order_items và order_role_assignments. Như vậy tạo đơn xong là có luôn hoa hồng
   trong database. Vẫn giữ try/catch ở route để lỗi không làm hỏng tạo đơn.

3. Thêm helper đọc commission_records thật vào storage (IStorage + DbStorage), ví dụ
   getCommissionRecordsByUser(userId, cycleId) trả các bản ghi của user trong kỳ, và
   getCommissionRecordsByOrder(orderId) nếu cần. MemoryStorage để stub trả [] như các
   helper trước (rollback-only).

4. Đổi màn Income đọc số thật. Trong server/income.ts hàm getIncomeForUser: thay phần đang
   dùng ensureCRs (mock từ server/commission.ts) bằng đọc commission_records thật qua helper
   mới, lọc theo userId và cycle. Gom theo đơn để giữ đúng hình dạng dữ liệu mà màn đang cần
   (mỗi nhóm là một đơn, lookup order để lấy code và tên dịch vụ). Tính totalHh từ các bản
   ghi thật.
   Phần adjustments và clawbacks trong màn này TẠM giữ nguyên nguồn mock như hiện tại (sẽ
   thay ở bước thưởng/phạt sau). Chỉ đổi phần hoa hồng gốc sang thật.

5. Vá chỗ dời lịch: trong server/routes.ts, đường POST /api/orders/:id/reschedule có tạo
   đơn mới bằng storage.createOrder. Thêm gọi await ingestOrderDerived(newOrder) sau khi tạo,
   bọc try/catch giống POST /api/orders, để đơn dời lịch cũng có nguyên liệu và hoa hồng.

KHÔNG LÀM (để bước sau):
- KHÔNG đổi màn Dashboard (server/dashboard.ts) và màn duyệt hoa hồng của kế toán
  (/api/admin/commission-approval) và màn chi tiết đơn (/api/orders/:id). Chúng VẪN đọc mock
  ở bước này. Chấp nhận tạm việc các màn này lệch số với màn Income.
- KHÔNG xoá các file mock (commission.ts, orderItems.ts, adjustments.ts, clawbacks.ts).
  Chúng còn được các màn chưa đổi dùng tới. Dọn ở bước cuối.
- KHÔNG đụng client/ (giao diện màn Income tự hiển thị theo dữ liệu server trả, không cần
  sửa front-end).
- KHÔNG gán vai bác sĩ, KHÔNG làm thưởng/phạt, KHÔNG đụng đăng nhập/phân quyền.

LƯU Ý KHÔNG LÀM HỎNG:
- Việc tạo đơn phải luôn thành công kể cả khi tính hoa hồng lỗi (giữ try/catch quanh ingest).
- Giữ đúng hình dạng dữ liệu mà màn Income đang cần, nếu không front-end sẽ vỡ.
- Số tiền là số nguyên VND, làm tròn nửa lên ở bước cuối khi ghi amount.
- Đơn cũ (seed và đơn tạo trước bước 1) không có nguyên liệu nên sẽ không có hoa hồng thật.
  Đó là bình thường, test bằng đơn tạo mới.

TEST SAU KHI LÀM (chạy và báo kết quả từng dòng):
1. npm run check (tsc) không lỗi.
2. Khởi động app, đăng nhập tài khoản Mai (0901234567), tạo một đơn mới.
3. Truy vấn database: đơn đó có các dòng commission_records, mỗi vai một dòng, amount =
   phần trăm × lãi. Kiểm tay một dòng: ví dụ đơn tổng 9.000.000, giá vốn 0, bảo hiểm 0 →
   net_profit = 9.000.000; Sale Mai M2 (500bp) → amount = 450.000; TC (200bp) → amount =
   180.000.
4. Vào màn Thu nhập của Mai: thấy hoa hồng của đơn vừa tạo, số khớp với tính tay ở bước 3
   (Sale 5%, không phải 3% như trước).
5. Restart server, số hoa hồng của đơn đó vẫn còn.
6. Tạo đơn qua đường dời lịch một đơn cũ, xác nhận đơn mới cũng có commission_records.

NẾU GẶP MÂU THUẪN giữa các ràng buộc, DỪNG LẠI và hỏi trước khi tự mở rộng phạm vi.

TIÊU CHÍ HOÀN THÀNH: tạo đơn xong, database có bản ghi hoa hồng tính đúng theo công thức,
và màn Thu nhập của nhân viên hiện đúng con số đó (phần trăm theo hạng, trên lãi ròng). Các
màn khác tạm còn số cũ, sẽ đổi ở bước sau. Báo lại commission_records của một đơn mẫu kèm
phép tính tay để đối chiếu.
```

---

Sau khi xong và mục test 4 đậu (màn Thu nhập hiện số thật, Sale ra 5% đúng tính tay), anh
báo em. Em viết mẩu kế: đổi màn tổng quan và màn kế toán duyệt sang số thật, rồi dọn phần
giả. Khép xong là cả app dùng chung một con số hoa hồng thật.
