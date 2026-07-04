# Đợt 3 mẩu 2: lọc đơn và khách theo người, dọn nốt tái khám

Mẩu này làm hai nhóm việc liên quan nhau. Một là phân quyền đọc theo người (hoãn từ đợt bảo
mật): nhân viên chỉ thấy đơn và khách của mình, quản lý thấy hết. Hai là dọn nốt ba điểm tái
khám phát hiện khi review mẩu 1.

Nền đã sẵn: khi tạo đơn, khách chưa có người chăm được tự gán người tạo đơn làm người chăm
(ingest.ts). Nên khách có đơn đều đã có người chăm, lọc theo người sẽ không làm nhân viên thấy
danh sách rỗng.

Quyết định đã chốt: cuộc gọi tái khám hiện cả ở dòng thời gian tương tác của khách.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Sau khi bắt buộc đăng nhập ở đợt bảo mật, dữ liệu chỉ còn trong nội bộ nhưng mọi nhân
viên vẫn thấy đơn và khách của nhau. Việc mẩu này: lọc đọc theo người (nhân viên chỉ thấy của
mình, quản lý thấy hết), và dọn ba điểm tái khám còn lại. Quy ước vai: sale và doctor là nhân
viên thường; tc, kt, ceo là quản lý thấy hết.

Quan trọng về bảo mật: luôn lọc theo người đang đăng nhập lấy từ token (req.currentUser), KHÔNG
theo tham số userId client gửi lên (client có thể sửa).

Làm theo thứ tự, test xong phần này mới sang phần sau. Nếu gặp mâu thuẫn, dừng và hỏi.

PHẦN A — Lọc danh sách đơn và chi tiết đơn theo người.
- GET /api/orders: nếu người đăng nhập là sale hoặc doctor, chỉ trả đơn có userId bằng id của
  họ (dùng getOrdersByUser); nếu là tc/kt/ceo, trả tất cả như cũ.
- GET /api/orders/:id: nếu là sale/doctor và đơn không phải của họ thì trả 403; tc/kt/ceo xem
  mọi đơn. Giữ nguyên phần hoa hồng trong đơn đã lọc theo người.
- GET /api/orders/:id/status-logs (nếu có): áp cùng quy tắc chủ đơn.
Test: đăng nhập một điều dưỡng, danh sách đơn chỉ có đơn của họ; mở đơn người khác bị 403; trưởng
ca thấy mọi đơn.

PHẦN B — Lọc danh sách khách và chi tiết khách theo người chăm.
- GET /api/customers: sale/doctor chỉ trả khách có primaryAssignedUserId bằng id của họ; tc/kt/ceo
  trả tất cả. Khách chưa có người chăm thì chỉ quản lý thấy.
- GET /api/customers/:id: sale/doctor chỉ xem khách mình chăm, không thì 403; tc/kt/ceo xem hết.
Test: điều dưỡng thấy danh sách khách mình chăm; mở khách người khác bị 403; trưởng ca thấy hết.

PHẦN C — Lọc tìm kiếm toàn cục theo người.
- GET /api/search: với sale/doctor, chỉ trả đơn của họ và khách họ chăm; tc/kt/ceo trả đầy đủ.
Test: điều dưỡng tìm kiếm không ra đơn hay khách của người khác.

PHẦN D — Badge tái khám tắt khi đã xử lý xong.
Trong storage getNextRecallDueForCustomer, chỉ tính ngày tái khám gần nhất trên các lượt còn ở
trạng thái pending (đang chờ gọi), bỏ qua lượt đã scheduled hoặc refused. Khi khách xử lý hết
các lượt thì hàm trả null, badge cần gọi tự tắt. Danh sách lượt ở chi tiết khách vẫn hiện đủ mọi
lượt như cũ (không đổi getRecallItemsForCustomer).
Test: khách chỉ có một lượt, gọi xong chọn đã đặt lịch lại, badge tái khám ở danh sách khách tắt.

PHẦN E — Thông báo tái khám lọc theo người chăm.
Trong notifications, thông báo tái khám chỉ gửi cho người chăm gốc của khách nếu người xem là
sale hoặc doctor (khách có primaryAssignedUserId bằng id họ); tc, kt, ceo vẫn nhận đầy đủ.
Test: điều dưỡng chỉ nhận thông báo tái khám của khách mình chăm.

PHẦN F — Ghi cuộc gọi tái khám vào dòng thời gian tương tác.
Khi ghi một cuộc gọi tái khám (logRecallCall hoặc route POST /api/recalls/item/:orderItemId/log),
ngoài việc lưu vào bảng recall_logs như hiện tại, ghi thêm một sự kiện loại recall_call vào nhật
ký tương tác của khách (logCustomerEvent), kèm kết quả gọi. Mục Lịch sử tương tác ở màn chi tiết
khách đã có sẵn cách hiển thị loại sự kiện recall_call.
Test: gọi một lượt tái khám, mở màn chi tiết khách thấy cuộc gọi đó xuất hiện cả ở Lịch sử tương
tác lẫn Lịch sử gọi.

KHÔNG LÀM (thuộc mẩu hoặc đợt sau):
- KHÔNG đụng Settings (mẩu 3), không đụng các màn giả (mẩu 4), không đụng hoa hồng, không đụng đa nguồn.
- KHÔNG xử lý trường hợp hai khách trùng số điện thoại (trường hợp biên, để sau).
- KHÔNG tách phần code trùng lặp giữa hai màn tái khám (để dọn sau).

KHÔNG LÀM HỎNG:
- Khách có đơn đều đã có người chăm nên nhân viên vẫn thấy khách của mình, không rỗng.
- Quản lý tc, kt, ceo vẫn thấy mọi đơn và khách như trước.
- Lọc dựa trên người trong token, không dựa tham số client.
- Màn danh sách gọi tái khám và hai chiều đồng bộ vẫn chạy như mẩu 1.
- Giữ hình dạng dữ liệu API để giao diện không vỡ.

TEST XƯƠNG SỐNG (làm cuối, báo kết quả rõ):
1. Đăng nhập một điều dưỡng (ví dụ Trang): danh sách đơn chỉ có đơn của Trang, danh sách khách
   chỉ có khách Trang chăm; mở đơn hoặc khách của người khác bị 403; tìm kiếm không lộ của người khác.
2. Đăng nhập trưởng ca: thấy mọi đơn và khách.
3. Một khách gọi tái khám xong, badge cần gọi ở danh sách khách tắt.
4. Cuộc gọi tái khám hiện cả ở dòng thời gian tương tác lẫn lịch sử gọi của khách.
5. Điều dưỡng chỉ nhận thông báo tái khám của khách mình chăm.

TIÊU CHÍ HOÀN THÀNH: nhân viên chỉ đọc được đơn và khách của mình, quản lý thấy hết, lọc theo
token; badge tái khám tắt khi xử lý xong; cuộc gọi tái khám vào cả hai nơi; thông báo tái khám
theo người chăm. Báo lại kết quả test từng phần và test xương sống.
```

---

Xong mẩu này, đợt 3 còn hai mẩu: dọn Settings (nối kì lương và auto rule vào database, thu gọn
nhóm trống) và dọn các màn giả. Anh chạy bài test xương sống rồi dán kết quả, em đọc code kiểm.
