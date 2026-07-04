# Đợt 1: khâu hoa hồng về một mối

Đây là đợt lớn nhất vì đụng tiền lương. Một prompt toàn diện cho cả đợt, làm theo sáu phần
có thứ tự, test sau mỗi phần.

Bài test quan trọng nhất sau khi xong: kế toán duyệt một hoa hồng ở màn duyệt, nhân viên mở
màn thu nhập thấy đúng hoa hồng đó đã chuyển sang đã duyệt. Hai màn cùng một con số, cùng một
trạng thái. Đó là bằng chứng tiền đã về một mối.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Hoa hồng đang có HAI nguồn. Nguồn thật là bảng commission_records trong database,
do commission-engine sinh khi tạo đơn; màn thu nhập và trang chủ đã đọc nguồn này. Nguồn giả
là store in-memory trong server/commission.ts (tính cứng 3/2/5% trên tổng giá, trạng thái
ngẫu nhiên); màn duyệt của kế toán, màn chi tiết đơn, và thông báo vẫn còn đọc nguồn giả này.
Hậu quả: kế toán duyệt một số, lương chi một số khác. Việc đợt này: gom tất cả về nguồn thật
trong database, bỏ nguồn giả. CHỈ làm phần hoa hồng.

Làm theo thứ tự, test xong phần này mới sang phần sau.

PHẦN 1 — Thêm thao tác hoa hồng trên database.
Đọc server/commission.ts để biết các hàm mà route đang gọi (duyệt một CR, từ chối, duyệt cả
đơn, duyệt cả kỳ, gửi khiếu nại, giải quyết khiếu nại, đếm theo trạng thái, liệt kê theo kỳ).
Thêm các hàm tương đương vào storage (IStorage + DbStorage) chạy trên bảng commission_records
thật, dùng transaction. Giữ đúng quy tắc trạng thái trong B4 (chờ duyệt, được duyệt, từ chối,
khiếu nại, truy thu). Nếu cần lưu nội dung khiếu nại, thêm một bảng nhỏ commission_complaints.
MemoryStorage để stub.

PHẦN 2 — Màn duyệt của kế toán đọc ghi database.
Đổi mọi endpoint /api/admin/commission-approval/* sang dùng các hàm database ở phần 1, bỏ gọi
server/commission.ts. Bỏ hàm ensureAllCRsGenerated (nó vá nguồn giả). Giữ y nguyên hình dạng
dữ liệu trả về để giao diện không phải sửa.
Test: kế toán mở màn duyệt thấy hoa hồng thật của các đơn (do engine sinh), bấm duyệt một cái
thì trạng thái đổi trong database; restart vẫn còn.

PHẦN 3 — Màn chi tiết đơn đọc database.
GET /api/orders/:id trả danh sách dịch vụ từ bảng order_items thật và hoa hồng từ
commission_records thật. Bỏ ensureItems và ensureCRs (nguồn giả).
Test: mở chi tiết một đơn, dịch vụ và hoa hồng khớp với database và khớp màn thu nhập của
cùng người.

PHẦN 4 — Thông báo đọc database.
server/notifications.ts sinh thông báo hoa hồng từ commission_records thật, bỏ ensureCRs.
Test: thông báo về hoa hồng hiện đúng số thật.

PHẦN 5 — Thưởng phạt thật.
Nối bảng adjustments thật: kế toán tạo, duyệt hoặc hủy theo quy tắc B4; màn thu nhập và màn
duyệt đọc từ bảng này. Bỏ phần sinh thưởng phạt giả theo chẵn lẻ mã nhân viên. Khoản truy thu
suy ra từ commission_records ở trạng thái truy thu, không dùng dữ liệu giả; khi chưa có thì
không cộng số giả vào thu nhập.
Test: thưởng phạt hiển thị là dữ liệu thật, không còn theo chẵn lẻ id.

PHẦN 6 — Dọn.
Sau khi mọi nơi đã đọc database, bỏ các file đồ giả không còn dùng: server/commission.ts,
server/orderItems.ts, phần sinh giả trong server/adjustments.ts và server/clawbacks.ts. Bảo
đảm không còn chỗ nào import chúng.
Test: npm run check sạch, app chạy, grep không còn tham chiếu file giả.

KHÔNG LÀM (thuộc đợt sau):
- KHÔNG đụng đăng nhập, phân quyền, bảo mật. Đó là đợt 2.
- KHÔNG đụng tái khám. Đó là đợt 3.
- KHÔNG đụng cổng nhận đơn đa nguồn, iHOS, website. Đó là đợt 4.
- KHÔNG sửa engine tính hoa hồng, màn thu nhập, trang chủ. Chúng đã đúng, là nguồn để các
  phần khác noi theo.
- KHÔNG đụng client trừ khi hình dạng dữ liệu buộc phải đổi; nếu buộc thì đổi tối thiểu.

KHÔNG LÀM HỎNG:
- Giữ hình dạng dữ liệu các API để giao diện không vỡ.
- Tiền là số nguyên đồng, làm tròn ở bước cuối.
- Mọi thao tác đổi trạng thái hoặc sinh khoản delta phải chạy trong transaction.
- Đi đúng thứ tự sáu phần, test xong mới đi tiếp. Nếu gặp mâu thuẫn, dừng và hỏi.

TEST XƯƠNG SỐNG (làm cuối, báo kết quả rõ):
Đăng nhập kế toán, vào màn duyệt, duyệt một hoa hồng của nhân viên Mai. Đăng nhập Mai, vào
màn thu nhập, thấy đúng hoa hồng đó đã chuyển sang đã duyệt. Hai màn cùng một con số và cùng
một trạng thái. Restart server, quyết định duyệt vẫn còn.

TIÊU CHÍ HOÀN THÀNH: chỉ còn một nguồn hoa hồng là database; màn duyệt, chi tiết đơn, thông
báo, thu nhập, trang chủ cùng đọc nó; đồ giả đã bỏ; restart không mất quyết định duyệt. Báo
lại kết quả test từng phần và test xương sống.
```

---

Đây là đợt nặng, Claude Code nên làm tuần tự và test từng phần. Xong, anh chạy bài test xương
sống rồi dán kết quả, em kiểm như mọi lần.
