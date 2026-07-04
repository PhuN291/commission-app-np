# Danh sách tái khám cần gọi, mẩu 1: ruột phía sau

Mục tiêu cả việc: nhân viên không bỏ sót lượt nhắc tái khám nào. Việc này gồm một màn mới và
phần ruột phía sau. Mẩu 1 này làm ruột, chưa có màn. Mẩu 2 sẽ dựng màn cho anh bấm.

Quyết định đã chốt với PM:
- Khách do điều dưỡng nào chăm thì tự thuộc về người đó, người đó lo gọi nhắc tái khám.
- Trưởng ca thấy hết toàn phòng khám.
- Mỗi lượt tái khám có trạng thái riêng, gọi xong lượt này không che lượt khác.
- Chưa bắt máy thì lượt vẫn còn để mai gọi lại.

Nghiệm thu mẩu này ở tầng dữ liệu (chưa có màn): bắt máy chỉ cho xem cổng dữ liệu danh sách
trả đúng các lượt cần gọi, lọc đúng theo người xem, và khi đánh dấu đã đặt lịch thì lượt đó
rời danh sách, còn chưa bắt máy thì vẫn nằm lại.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: App cần một danh sách tái khám cần gọi để nhân viên không sót lượt nào. Hiện ngày
tái khám đã lấy từ order_items.recallDueDate (đã sửa ở bước trước). Nhưng trạng thái đã gọi
đang giữ theo từng khách trong bộ nhớ tạm (server/recalls.ts), không theo từng lượt, và chưa
có khái niệm người chăm gốc. Mẩu này làm phần ruột phía sau cho danh sách tái khám. KHÔNG làm
giao diện trong mẩu này.

Scope đóng, chỉ server.

CHỈ LÀM:

1. Schema (thêm cột và bảng, rồi chạy db:push):
   a. customers: thêm cột primaryAssignedUserId (integer, nullable) — nhân viên chăm gốc.
   b. order_items: thêm cột recallStatus (text, default 'pending') — trạng thái lượt tái
      khám của item đó. Giá trị: 'pending' còn cần gọi, 'scheduled' đã đặt lịch lại,
      'refused' khách từ chối.
   c. Thêm bảng recall_logs: id serial, orderItemId integer, customerId integer,
      actorUserId integer, outcome text ('scheduled' | 'no_answer' | 'refused' | 'other'),
      note text nullable, createdAt timestamp default now. Kèm insert schema + type.

2. Gán người chăm gốc: trong server/ingest.ts hàm ingestOrderDerived, sau khi tìm customer
   theo số điện thoại của đơn, nếu customer đó chưa có primaryAssignedUserId thì set bằng
   order.userId (nhân viên tạo đơn). Nếu đã có thì giữ nguyên người cũ. Bọc an toàn, không
   làm hỏng tạo đơn.

3. Helper trong storage (IStorage + DbStorage; MemoryStorage stub trả mảng rỗng hoặc no-op):
   a. getRecallWorklist(viewerUserId, viewerRole): trả danh sách các lượt cần gọi. Một lượt
      là một order_item có recallDueDate khác null và recallStatus = 'pending'. Ghép với đơn
      để ra số điện thoại, ghép tiếp với customer để ra tên khách và người chăm gốc. Lọc
      theo quyền: nếu viewerRole là 'sale' hoặc 'doctor' thì chỉ trả lượt của khách có
      primaryAssignedUserId bằng viewerUserId; nếu là 'tc', 'kt', 'ceo' thì trả tất cả. Mỗi
      lượt trả về: orderItemId, customerId, customerName, phone, serviceName, recallDueDate,
      assigneeUserId và tên người chăm, lần gọi gần nhất (outcome và thời gian, lấy từ
      recall_logs nếu có). Sắp xếp quá hạn nhiều nhất lên đầu, tính theo recallDueDate so với
      hôm nay.
   b. logRecallCall(input: orderItemId, actorUserId, outcome, note): ghi một dòng vào
      recall_logs. Đổi recallStatus của order_item theo outcome: 'scheduled' thì set
      'scheduled', 'refused' thì set 'refused', còn 'no_answer' hoặc 'other' thì giữ
      'pending' (để mai còn gọi lại). Trả về dòng log vừa tạo.

4. API (đặt cùng khu route, gate quyền bằng requireRole):
   a. GET /api/recalls/worklist (requireRole ['sale','doctor','tc','kt','ceo']): lấy
      viewer từ req.currentUser, gọi getRecallWorklist(viewer.id, viewer.role), trả danh sách.
   b. POST /api/recalls/item/:orderItemId/log (requireRole ['sale','doctor','tc','kt','ceo']):
      nhận body gồm outcome và note, validate outcome thuộc bốn giá trị cho phép, gọi
      logRecallCall, trả kết quả.

5. Cập nhật ô đếm trên trang chủ: trong server/dashboard.ts, customersRecallDue đổi thành đếm
   số lượt trong worklist của người đang xem đã tới hạn hoặc quá hạn tính tới hôm nay. Dùng
   cùng nguồn với getRecallWorklist để hai chỗ khớp nhau.

6. Seed: với các order_items đã được seed có recallDueDate từ bước trước, đảm bảo recallStatus
   = 'pending'. Gán primaryAssignedUserId cho vài khách demo, ví dụ khách Trần Văn An
   (0901234567) chăm bởi nhân viên Mai, để thử lọc theo quyền.

KHÔNG LÀM (để mẩu sau):
- KHÔNG làm giao diện, KHÔNG đụng client.
- KHÔNG xoá server/recalls.ts cũ và KHÔNG đụng phần tái khám trong màn chi tiết khách ở mẩu
  này, để màn đó không vỡ. Việc thống nhất nó về cơ chế mới làm ở mẩu dựng màn.
- KHÔNG đụng tính hoa hồng, đăng nhập.
- KHÔNG nối Zalo trong mẩu này (để mẩu màn, vì gắn với nút trên giao diện).

LƯU Ý KHÔNG LÀM HỎNG:
- Gán người chăm gốc phải an toàn, không làm hỏng tạo đơn.
- Lọc quyền phải đúng: nhân viên chỉ thấy lượt của khách mình chăm, trưởng ca thấy hết.
- Các truy vấn phải chịu được khách không có người chăm, đơn không có item, trả rỗng không lỗi.

TEST SAU KHI LÀM (chạy và báo kết quả từng dòng):
1. npm run check (tsc) không lỗi.
2. db:push tạo cột và bảng thành công.
3. Gọi GET /api/recalls/worklist bằng token nhân viên Mai: chỉ thấy lượt của khách Mai chăm.
4. Gọi cùng API bằng token trưởng ca: thấy tất cả các lượt.
5. Gọi POST log với outcome 'scheduled' cho một lượt, rồi gọi lại worklist: lượt đó đã rời
   danh sách (status chuyển scheduled).
6. Gọi POST log với outcome 'no_answer' cho một lượt khác, gọi lại worklist: lượt đó vẫn còn
   trong danh sách (giữ pending).
7. Restart server, dữ liệu trạng thái và log vẫn còn vì lưu database.

NẾU GẶP MÂU THUẪN giữa các ràng buộc, DỪNG LẠI và hỏi trước khi tự mở rộng phạm vi.

TIÊU CHÍ HOÀN THÀNH: cổng dữ liệu danh sách tái khám trả đúng các lượt cần gọi, lọc đúng theo
người xem, đánh dấu kết quả đổi trạng thái đúng, và còn nguyên sau restart. Báo lại nội dung
worklist của Mai và của trưởng ca để đối chiếu khác nhau đúng theo quyền.
```

---

Sau khi xong và test 3 đến 6 đậu, anh báo em. Mẩu kế là dựng màn danh sách cho nhân viên bấm,
gồm nút gọi và nút nhắn Zalo, nối từ ô trên trang chủ, và ráp nốt phần tái khám trong màn chi
tiết khách về cùng cơ chế mới.
