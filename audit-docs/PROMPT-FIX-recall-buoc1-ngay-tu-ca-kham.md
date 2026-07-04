# Sửa logic tái khám, bước 1: ngày tái khám tính từ ca khám

Hiện ngày tái khám lưu cứng một ô trên hồ sơ khách (customers.nextRecallDueAt), nhồi sẵn lúc
seed. Cột đúng là order_items.recallDueDate gắn theo từng dịch vụ thì đang bỏ trống. Bước này
đổi nguồn: ngày tái khám lấy gốc từ ca khám, con số trên hồ sơ khách thì tính ra. Giao diện
giữ nguyên, chỉ đổi ruột.

Nghiệm thu, anh tự bấm: vào hồ sơ một khách có ca khám kèm ngày tái khám, thấy đúng ngày đó
hiện ở mục Lịch tái khám như cũ. Khách có nhiều ca nhiều lịch thì hiện cái gần nhất. Khách
không có ca nào kèm tái khám thì hiện Chưa có thông tin tái khám.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: App tính tái khám sai chỗ. Ngày tái khám đang đọc từ customers.nextRecallDueAt,
một ô lưu cứng trên hồ sơ khách, seed sẵn. Cột đúng là order_items.recallDueDate (gắn từng
dịch vụ trong ca khám) thì chưa được dùng. Việc bước này: đổi nguồn ngày tái khám sang tính
từ order_items, giữ nguyên giao diện và hình dạng dữ liệu API trả ra.

Scope đóng. Chỉ động tới logic phía server.

CHỈ LÀM:

1. Thêm helper trong storage (IStorage + DbStorage), ví dụ
   getNextRecallDueForCustomer(customerId): trả ngày tái khám gần nhất sắp tới của khách,
   tính như sau:
   - Tìm customer theo id để lấy số điện thoại.
   - Lấy các đơn của khách đó (orders có cùng phone).
   - Lấy các order_items của các đơn đó, lọc những item có recallDueDate khác null.
   - Trả về giá trị recallDueDate nhỏ nhất (gần nhất). Nếu không có thì trả null.
   - Trả kèm tên dịch vụ của item đó nếu tiện (để dành cho sau), nhưng không bắt buộc.
   MemoryStorage để stub trả null như các helper trước.

2. Trong route chi tiết khách (GET /api/customers/:id, server/routes.ts):
   - Gọi helper trên, gán giá trị derive vào trường nextRecallDueAt của object customer
     trước khi trả về. Tức là ghi đè customer.nextRecallDueAt bằng ngày tính từ ca khám.
   - Giữ nguyên recallStatus và recallLogs đang trả như cũ (vẫn lấy từ store in-memory hiện
     tại, bước này KHÔNG đụng phần trạng thái và lịch sử cuộc gọi).
   - Hình dạng dữ liệu trả ra phải y hệt cũ để giao diện không phải sửa.

3. Trong server/notifications.ts hàm genFromRecalls: thay chỗ đang đọc c.nextRecallDueAt
   bằng giá trị tính từ helper getNextRecallDueForCustomer cho từng khách. Phần còn lại giữ
   nguyên.

4. Trong server/dashboard.ts: ô đếm customersRecallDue hiện đang để 0. Đổi thành đếm số
   khách có ngày tái khám tính được và đã tới hạn hoặc quá hạn tính tới hôm nay. Dùng cùng
   helper. Nếu để đơn giản, đếm khách có getNextRecallDueForCustomer khác null và nhỏ hơn
   hoặc bằng hôm nay.

5. Seed lại để demo chạy: trong server/seed.ts, sau khi tạo các đơn mẫu, tạo thêm một vài
   order_items gắn vào đơn của khách Trần Văn An (số 0901234567) và một khách nữa, đặt
   recallDueDate cho các item đó để thấy luồng mới. Đồng thời thôi nhồi cứng nextRecallDueAt
   trên customer khi seed (để null), để chứng minh con số hiện ra là tính từ ca khám chứ
   không phải seed cứng.

KHÔNG LÀM (để mẩu sau hoặc giai đoạn khác):
- KHÔNG đụng bất kỳ file nào trong client. Giao diện giữ nguyên.
- KHÔNG đụng trạng thái và lịch sử cuộc gọi nhắc (server/recalls.ts vẫn in-memory ở bước
  này). Việc chuyển nó sang database là mẩu kế.
- KHÔNG tính hoa hồng, KHÔNG đụng đăng nhập, KHÔNG thêm bảng mới vào schema (cột
  order_items.recallDueDate đã có sẵn).

LƯU Ý KHÔNG LÀM HỎNG:
- Hình dạng dữ liệu route chi tiết khách phải y như cũ, chỉ đổi giá trị nextRecallDueAt.
- Helper phải chịu được khách không có đơn hoặc đơn không có item, trả null chứ không lỗi.
- Ngày tái khám là kiểu ngày, so sánh theo ngày, không lệ thuộc giờ.

TEST SAU KHI LÀM (chạy và báo kết quả từng dòng):
1. npm run check (tsc) không lỗi.
2. Khởi động app, vào hồ sơ khách Trần Văn An. Mục Lịch tái khám hiện đúng ngày tái khám
   lấy từ order_item đã seed, không phải số cứng cũ.
3. Một khách có hai đơn kèm hai ngày tái khám khác nhau, hồ sơ hiện ngày gần nhất.
4. Một khách không có item nào kèm tái khám, hồ sơ hiện Chưa có thông tin tái khám.
5. Restart server, các giá trị trên vẫn đúng vì lấy từ database.

NẾU GẶP MÂU THUẪN giữa các ràng buộc, DỪNG LẠI và hỏi trước khi tự mở rộng phạm vi.

TIÊU CHÍ HOÀN THÀNH: ngày tái khám hiện trên hồ sơ khách được tính từ ca khám thật, giao
diện không đổi, còn đúng sau restart. Báo lại ngày tái khám của một khách mẫu kèm cho biết
nó lấy từ order_item nào.
```

---

Sau khi xong và test 2 đậu, anh báo em. Mẩu kế là chuyển trạng thái và lịch sử cuộc gọi nhắc
từ bộ nhớ tạm sang database, để khỏi mất khi restart, vẫn giữ theo khách cho thực dụng.
