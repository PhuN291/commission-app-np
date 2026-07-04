# Đợt 3 mẩu 1: gộp hai hệ tái khám về một

Đây là mẩu đầu của đợt 3. Hiện có hai hệ tái khám chạy song song, không biết nhau. Việc mẩu
này: gộp tất cả về hệ database theo từng lượt, bỏ hệ cũ trong bộ nhớ.

Quyết định đã chốt: màn chi tiết khách hiển thị tái khám theo danh sách từng lượt (mỗi dịch vụ
một dòng, gọi và đánh dấu riêng), giống màn danh sách gọi nhưng lọc theo một khách. Bỏ trạng
thái bỏ qua của hệ cũ vì không nơi nào dùng.

Bài test quan trọng nhất: gọi một lượt tái khám ở màn chi tiết khách, mở màn danh sách gọi thấy
lượt đó đã xử lý; và ngược lại. Hai màn cùng một nguồn, cùng trạng thái, bền sau restart.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: App có HAI hệ tái khám chạy song song.
- Hệ cũ: server/recalls.ts lưu in-memory theo khách (trạng thái pending/done/skipped + nhật ký
  gọi), mất khi restart. Dùng ở: GET /api/customers (badge trạng thái), GET /api/customers/:id
  (trả recallStatus + recallLogs), server/notifications.ts (lọc theo trạng thái). Ghi qua POST
  /api/customers/:id/recall-log và POST /api/customers/:id/recall-skip. Client dùng ở màn chi
  tiết khách (RecallSection + hộp thoại ghi cuộc gọi).
- Hệ mới: database theo từng lượt order_item (cột recallDueDate + recallStatus pending/scheduled/
  refused) và bảng recall_logs đã có sẵn. Dùng ở: GET /api/recalls/worklist, GET /api/customers/:id
  (chỉ lấy ngày tái khám gần nhất). Ghi qua POST /api/recalls/item/:orderItemId/log. Client dùng
  ở màn danh sách gọi (recall-worklist.tsx).
Việc mẩu này: gộp tất cả về hệ mới database, bỏ hệ cũ. CHỈ làm phần tái khám.

Làm theo thứ tự, test xong phần này mới sang phần sau. Nếu gặp mâu thuẫn, dừng và hỏi.

PHẦN 1 — Thêm thao tác đọc tái khám theo khách trên database.
Thêm vào storage (IStorage + DbStorage, MemoryStorage stub):
- getRecallItemsForCustomer(customerId): trả các lượt order_item của khách (ghép theo số điện
  thoại như getRecallWorklist đang làm) có recallDueDate, mỗi lượt gồm orderItemId, tên dịch vụ,
  ngày hẹn, recallStatus, và lần gọi gần nhất nếu có. Sắp theo ngày hẹn tăng dần.
- getRecallLogsForCustomer(customerId): trả toàn bộ dòng trong bảng recall_logs của khách (mọi
  lượt), sắp mới nhất trước.
Dùng lại cách ghép order_item theo phone đã có trong getRecallWorklist để nhất quán.

PHẦN 2 — GET /api/customers/:id trả tái khám từ database.
Thay phần đang lấy recallStatus + recallLogs từ server/recalls.ts bằng: danh sách lượt tái khám
(getRecallItemsForCustomer) + lịch sử gọi (getRecallLogsForCustomer). Giữ nguyên nextRecallDueAt
(đã lấy từ database). Bỏ mọi lời gọi getRecallStatus và getRecallLogs ở route này.
Test: mở chi tiết một khách, dữ liệu tái khám khớp database; restart server vẫn còn.

PHẦN 3 — Màn chi tiết khách hiển thị danh sách lượt và gọi theo lượt.
Trong client/src/pages/customer-detail.tsx, đổi mục Lịch tái khám (RecallSection) thành danh sách
các lượt tái khám của khách lấy từ GET /api/customers/:id ở phần 2. Mỗi lượt là một dòng gồm tên
dịch vụ, ngày hẹn, nhãn trạng thái thời gian (quá hạn, hôm nay, sắp tới) và nút gọi, dùng lại
đúng kiểu thẻ và nhãn đã dựng ở recall-worklist.tsx. Nút gọi mở hộp thoại kết quả như màn danh
sách gọi và ghi qua POST /api/recalls/item/:orderItemId/log. Hiển thị lịch sử gọi từ recallLogs.
Bỏ phần gọi POST /api/customers/:id/recall-log cũ.
CHỈ đổi mục Lịch tái khám, KHÔNG đụng các mục khác của màn chi tiết khách.
Test: mở chi tiết khách có lượt tái khám, thấy danh sách lượt; bấm gọi một lượt, chọn kết quả là
đã đặt lịch lại, lượt đó đổi trạng thái; mở màn danh sách gọi thấy lượt đó đã rời danh sách.

PHẦN 4 — Badge danh sách khách và thông báo lấy từ database.
- GET /api/customers: badge trạng thái tái khám suy từ database (khách còn lượt pending còn hạn
  thì coi là cần gọi), bỏ getRecallStatus.
- server/notifications.ts: điều kiện sinh thông báo tái khám dựa trên còn lượt pending trong
  database, bỏ getRecallStatus. Phần ngày tái khám giữ nguyên (đã từ database).
Test: danh sách khách và thông báo phản ánh đúng trạng thái sau khi gọi một lượt.

PHẦN 5 — Chặn ghi đè lượt của người khác (quyền theo người chăm).
Ở POST /api/recalls/item/:orderItemId/log: lấy khách của lượt, nếu người đăng nhập là điều dưỡng
hoặc bác sĩ thì chỉ cho ghi khi khách do chính họ chăm (customer.primaryAssignedUserId bằng id
người đăng nhập); trưởng ca, kế toán, CEO ghi được mọi lượt. Sai thì trả 403. Đây là phần kiểm
quyền đã hoãn từ đợt bảo mật, làm cùng đây.
Test: điều dưỡng ghi lượt của khách người khác bị 403; khách mình thì được; trưởng ca ghi mọi lượt.

PHẦN 6 — Dọn hệ cũ.
- Bỏ route POST /api/customers/:id/recall-log và POST /api/customers/:id/recall-skip.
- Xóa server/recalls.ts và bỏ mọi import nó ở server/routes.ts và server/notifications.ts.
- Bỏ khái niệm trạng thái bỏ qua của hệ cũ (không nơi nào dùng).
Test: npm run check sạch, grep không còn tham chiếu server/recalls.ts.

KHÔNG LÀM (thuộc mẩu hoặc đợt sau):
- KHÔNG lọc danh sách khách và đơn theo người chăm ở mẩu này (đó là mẩu 2).
- KHÔNG đụng Settings, hoa hồng, đa nguồn.
- KHÔNG đổi các mục khác của màn chi tiết khách ngoài mục tái khám.
- KHÔNG tạo bảng mới, bảng recall_logs đã có sẵn.

KHÔNG LÀM HỎNG:
- Màn danh sách gọi tái khám vẫn chạy như cũ.
- Ngày tái khám trên trang khách và chi tiết khách vẫn đúng.
- Dữ liệu tái khám bền sau restart (đã ở database).
- Giữ hình dạng dữ liệu API để giao diện không vỡ; nếu buộc đổi thì đổi tối thiểu.

TEST XƯƠNG SỐNG (làm cuối, báo kết quả rõ):
1. Đăng nhập một điều dưỡng, mở chi tiết một khách của mình có lượt tái khám, gọi một lượt và
   chọn đã đặt lịch lại.
2. Mở màn danh sách gọi tái khám, thấy lượt vừa xử lý đã rời danh sách.
3. Làm ngược lại: gọi một lượt ở màn danh sách, mở chi tiết khách thấy lượt đó đã cập nhật.
4. Restart server, trạng thái và lịch sử gọi vẫn còn.
5. Điều dưỡng thử ghi lượt của khách người khác bị chặn.

TIÊU CHÍ HOÀN THÀNH: chỉ còn một hệ tái khám là database theo từng lượt; chi tiết khách, màn
danh sách gọi, thông báo cùng đọc nó; hệ cũ trong bộ nhớ đã bỏ; restart không mất dữ liệu; điều
dưỡng không ghi đè lượt của người khác. Báo lại kết quả test từng phần và test xương sống.
```

---

Đây là mẩu nặng nhất của đợt 3 vì đụng cả server lẫn giao diện chi tiết khách. Xong, anh chạy
bài test xương sống rồi dán kết quả, em đọc code kiểm như mọi lần. Sau mẩu này còn ba mẩu: lọc
đơn và khách theo người, dọn Settings, dọn các màn giả.
