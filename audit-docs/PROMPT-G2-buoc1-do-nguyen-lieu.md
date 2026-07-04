# Tính hoa hồng thật, bước 1: đổ nguyên liệu

G1a đã xong (database thật, đơn lưu còn nguyên sau restart). Giờ sang phần tính hoa hồng.
Việc lớn, chẻ ba bước. Đây là bước 1.

Bước 1 làm gì, nói đời thường: hiện khi tạo đơn, app chỉ lưu cái đơn, không ghi lại từng
dịch vụ kèm giá vốn, cũng không ghi ai là người ăn hoa hồng trên đơn. Bước này bổ sung
đúng hai thứ đó vào database, để bước sau cái máy tính tiền có nguyên liệu mà tính. Chưa
tính tiền ở bước này.

Bước này chạy ngầm phía sau, người dùng chưa thấy gì đổi trên màn hình. Nghiệm thu bằng
cách bắt máy chỉ cho xem trong database: tạo một đơn mới thì có sinh ra các dòng dịch vụ
và dòng phân vai tương ứng không, và tắt mở lại còn nguyên không.

Vì sao cần input thật từ anh (G0): bước này lấy giá vốn từ danh mục dịch vụ, mà giá vốn
đó hiện đang để 0 vì chưa ai nhập. Phần trăm hoa hồng cũng đang dùng số tạm đã seed. Máy
sẽ chạy đúng cấu trúc với số tạm này. Khi anh chốt giá vốn và phần trăm thật với CEO rồi
nhập vào, con số tự khớp thực tế, không phải sửa code.

---

## PROMPT BƯỚC 1 (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: App đã lưu database thật (DbStorage). Schema đã có sẵn các bảng order_items và
order_role_assignments (tạo ở G1a, chưa dùng). Hiện POST /api/orders chỉ lưu order, không
sinh dữ liệu phụ. Việc bước này: khi tạo đơn, sinh thêm order_items và order_role_assignments
vào database. KHÔNG tính hoa hồng, KHÔNG đụng giao diện, KHÔNG đụng các màn.

Đây là bước đặt nền cho engine. Scope đóng.

CHỈ LÀM:

1. Tạo một cổng nhận đơn dùng chung, ví dụ file server/ingest.ts với hàm
   ingestOrderDerived(order) nhận một Order vừa tạo và sinh dữ liệu phụ cho nó. Mục đích
   là sau này webhook iHOS và đồng bộ website đều gọi lại hàm này, không phải viết lại.

   Hàm làm 3 việc:

   a. Sinh order_items: lookup service theo order.serviceCode (storage.getAllServices rồi
      tìm theo code, hoặc thêm helper). Tạo MỘT order_item:
        - orderId = order.id
        - serviceId = service tìm được (nếu không tìm thấy service theo code, bỏ qua việc
          tạo item, log cảnh báo, KHÔNG làm hỏng việc tạo đơn)
        - serviceName = order.serviceName
        - quantity = order.quantity
        - unitPrice = order.unitPrice
        - cost = service.defaultCost (hiện thường là 0, đúng như mong đợi cho tới khi
          CEO/KT nhập giá vốn thật)
        - status = 'completed'
        - performedByUserId = null (bác sĩ để bước sau)
        - refundedAmount = 0
      (Ghi chú: đơn hiện gửi gộp nhiều dịch vụ vào một order. Bước này tạm tạo một item
      đại diện từ thông tin đơn. Bước 3 khi mở rộng màn nhập sẽ gửi chi tiết từng dịch vụ
      và tạo nhiều item. Cổng nhận đơn giữ nguyên, chỉ nguồn item phong phú hơn.)

   b. Sinh order_role_assignments cho hai vai, mỗi vai một dòng:
        - Vai Sale: userId = order.userId. rankingSnapshot = ranking của user đó.
          pctAtTimeBp = storage.getEffectiveCommissionRate('sale', user.ranking, now).
        - Vai TC: tìm user role='tc' status='active' (nếu có). userId = user TC đó.
          rankingSnapshot = null. pctAtTimeBp =
          storage.getEffectiveCommissionRate('tc', null, now).
          Nếu không có TC active thì bỏ qua dòng TC (đơn vẫn có dòng Sale).
        - assignedAt = now. endedAt = null. assignedByUserId = null.

   c. Cập nhật vài cột phái sinh trên order cho nhất quán (không bắt buộc cho engine nhưng
      nên có): saleUserId = order.userId; customerId = id của customer khớp order.phone
      nếu tìm thấy; totalListed = order.totalPrice. KHÔNG đụng các cột cũ khác.

2. Gọi cổng nhận đơn trong route POST /api/orders, ngay sau khi storage.createOrder trả về
   order. Tức là: tạo order như cũ, rồi gọi await ingestOrderDerived(order), rồi trả response
   như cũ. Nếu cổng nhận đơn lỗi, KHÔNG được làm hỏng việc tạo đơn: bọc trong try/catch, log
   lỗi, vẫn trả đơn đã tạo.

3. Có thể thêm vào storage interface một helper đọc order_items và order_role_assignments
   theo orderId (ví dụ getOrderItems(orderId), getRoleAssignments(orderId)) để bước sau và
   để test dùng. Implement trong DbStorage. Đây là phần được phép đụng storage.

KHÔNG LÀM (để bước sau):
- KHÔNG tính hoa hồng, KHÔNG sinh commission_records (đó là bước 2).
- KHÔNG đụng bất kỳ file nào trong client/.
- KHÔNG sửa các màn hay các route đọc hoa hồng. Các store mock (commission.ts, orderItems.ts,
  adjustments.ts, clawbacks.ts) GIỮ NGUYÊN, vẫn chạy song song. Màn hình vẫn hiển thị số cũ.
- KHÔNG gán vai bác sĩ (chưa có cơ chế chọn bác sĩ, để bước 3).
- KHÔNG đụng đăng nhập, phân quyền.
- KHÔNG sửa schema, KHÔNG thêm bảng.

LƯU Ý KHÔNG LÀM HỎNG:
- Việc tạo đơn phải luôn thành công kể cả khi sinh dữ liệu phụ gặp lỗi (try/catch quanh
  cổng nhận đơn).
- Không đổi response của POST /api/orders (giao diện đang dựa vào nó).
- Lookup service và customer phải chịu được trường hợp không tìm thấy, không được ném lỗi
  làm gãy tạo đơn.

TEST SAU KHI LÀM (chạy và báo kết quả từng dòng):
1. npm run check (tsc) không lỗi.
2. Khởi động app, đăng nhập, tạo một đơn mới qua màn tạo đơn như bình thường. Đơn tạo
   thành công, giao diện không có gì khác lạ.
3. Truy vấn database, với đơn vừa tạo: bảng order_items có một dòng đúng dịch vụ và giá
   vốn lấy từ danh mục; bảng order_role_assignments có dòng vai 'sale' đúng người tạo đơn,
   kèm phần trăm hoa hồng snapshot, và dòng vai 'tc' nếu có trưởng ca active.
4. Restart server, đăng nhập lại, các dòng order_items và order_role_assignments của đơn
   đó VẪN CÒN.
5. Tạo thêm một đơn nữa để xác nhận lặp lại ổn định, không nhân đôi sai.

NẾU GẶP MÂU THUẪN giữa các ràng buộc, DỪNG LẠI và hỏi trước khi tự mở rộng phạm vi.

TIÊU CHÍ HOÀN THÀNH: tạo đơn xong là database có sẵn nguyên liệu gồm các dòng dịch vụ kèm
giá vốn và các dòng phân vai kèm phần trăm hoa hồng, còn nguyên sau restart. Giao diện và
con số hoa hồng người dùng nhìn thấy CHƯA đổi, đúng như mong đợi ở bước này. Báo lại nội
dung order_items và order_role_assignments của một đơn mẫu để xác nhận.
```

---

Sau khi máy chạy xong và mục test 3 với 4 đậu (database có nguyên liệu, còn sau restart),
anh báo em. Em viết bước 2, là lắp công thức tính hoa hồng thật và cho các màn hiện số thật.
Đó là bước anh bấm thấy hoa hồng nhảy đúng.
