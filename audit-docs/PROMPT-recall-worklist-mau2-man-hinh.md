# Danh sách tái khám cần gọi, mẩu 2: dựng màn cho nhân viên bấm

Mẩu 1 đã làm xong ruột phía sau (hai cổng dữ liệu /api/recalls/worklist và
/api/recalls/item/:id/log đã chạy và test đậu). Mẩu này dựng cái màn để nhân viên bấm, nối
vào ruột đó. Đây là lần đầu đụng giao diện, nên bám đúng phong cách app hiện có.

Nghiệm thu, anh tự bấm: đăng nhập Mai, ở trang chủ bấm ô khách đến tái khám, ra danh sách các
lượt của khách Mai chăm. Bấm gọi một lượt, chọn kết quả là đã đặt lịch lại hay chưa bắt máy
hay khách từ chối, lưu. Đã đặt lịch thì lượt rời danh sách, chưa bắt máy thì còn lại.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Phần ruột danh sách tái khám đã xong ở mẩu trước. Có sẵn hai endpoint:
- GET /api/recalls/worklist: trả các lượt cần gọi của người đang đăng nhập (nhân viên thấy
  khách mình chăm, trưởng ca thấy hết). Mỗi lượt có orderItemId, customerId, customerName,
  phone, serviceName, recallDueDate, assigneeUserId, tên người chăm, và lần gọi gần nhất.
- POST /api/recalls/item/:orderItemId/log: body gồm outcome ('scheduled' | 'no_answer' |
  'refused' | 'other') và note. Ghi nhận kết quả gọi và đổi trạng thái lượt.
Việc mẩu này: dựng màn danh sách tái khám trên giao diện, gọi hai endpoint trên. CHỈ làm
phía client.

TRƯỚC KHI CODE, đọc để bám đúng phong cách app:
- client/src/pages/order-create.tsx và client/src/pages/customer-detail.tsx để thấy cách
  dùng Screen, Card, SectionTitle, NPButton, DetailHeader, cách gọi API qua authFetch, cách
  mở dialog bottom sheet, cách hiển thị tiền và badge.
- client/src/components/np để biết các component dùng lại.
- client/src/App.tsx để biết cách khai báo route.
Dùng lại đúng các component và lớp màu sẵn có (np-brand, np-danger, np-warning, np-surface),
mobile-first. KHÔNG tự chế kiểu mới.

CHỈ LÀM:

1. Tạo trang mới client/src/pages/recall-worklist.tsx, khai báo route /recalls trong
   App.tsx (bọc ProtectedRoute như các trang khác).

2. Màn gồm:
   - Tiêu đề màn Tái khám cần gọi, có nút quay lại (DetailHeader giống màn tạo đơn).
   - Một danh sách lấy từ GET /api/recalls/worklist. Mỗi lượt là một thẻ Card gồm: tên
     khách (đậm), tên dịch vụ tái khám, ngày hẹn, một nhãn trạng thái thời gian tính từ
     recallDueDate so với hôm nay (quá hạn thì nền đỏ chữ đỏ ghi Trễ N ngày, đúng hôm nay
     thì nền vàng ghi Hôm nay, còn lại ghi Sắp tới N ngày), tên người chăm, và một nút Gọi
     màu np-brand.
   - Sắp xếp theo thứ tự server trả về (quá hạn nhiều nhất lên đầu).
   - Nếu danh sách rỗng, hiện trạng thái trống lịch sự, ví dụ Hiện không có lượt nào cần gọi.
   - Có thể thêm ba chip lọc nhanh Quá hạn, Hôm nay, Sắp tới tính phía client từ
     recallDueDate. Phần này không bắt buộc, làm nếu gọn.

3. Bấm nút Gọi mở một bottom sheet (dùng Dialog như customer-detail đang dùng) tiêu đề
   Kết quả gọi và tên khách, bên trong gồm:
   - Một hàng hai nút: Gọi điện là thẻ a href tel cộng số điện thoại để mở máy quay số; Nhắn
     Zalo là thẻ a href mở https://zalo.me/ cộng số điện thoại đã chuẩn hoá.
   - Ba lựa chọn kết quả: Đã đặt lịch lại (ứng với outcome scheduled), Chưa bắt máy (no_answer),
     Khách từ chối (refused). Chọn một.
   - Một ô ghi chú không bắt buộc.
   - Nút Lưu kết quả: gọi POST /api/recalls/item/:orderItemId/log với outcome và note đã
     chọn, sau khi xong thì đóng sheet và tải lại danh sách (invalidate query worklist).

4. Nối lối vào: trong màn trang chủ (client/src/pages/dashboard.tsx), ô khách đến ngày tái
   khám trong phần cần xử lý, cho bấm vào điều hướng tới /recalls. Giữ nguyên cách ô đó hiển
   thị, chỉ thêm hành động điều hướng.

KHÔNG LÀM (để mẩu sau):
- KHÔNG đụng server, hai endpoint đã có.
- KHÔNG sửa phần Lịch tái khám trong màn chi tiết khách lúc này (nó đang chạy hệ cũ, để mẩu
  sau hợp nhất). Tránh làm vỡ màn đó.
- KHÔNG làm Zalo tự động gửi, mẩu này nút Zalo chỉ mở cửa sổ chat với số khách.

LƯU Ý KHÔNG LÀM HỎNG:
- Số điện thoại khi ghép vào link tel và zalo phải bỏ khoảng trắng và ký tự lạ.
- Trang phải chịu được danh sách rỗng và trường thiếu, không trắng màn.
- Giữ đúng cách xác thực gọi API như các trang khác (authFetch kèm token).

TEST SAU KHI LÀM (chạy và báo kết quả từng dòng, kèm ảnh chụp màn nếu được):
1. npm run check (tsc) không lỗi.
2. Đăng nhập Mai (0901234567, mã 123456), vào trang chủ, bấm ô khách đến tái khám, chuyển
   sang màn danh sách, thấy các lượt của khách Mai chăm.
3. Bấm Gọi một lượt, sheet hiện đúng tên khách, có nút gọi điện và nút Zalo, ba lựa chọn kết quả.
4. Chọn Đã đặt lịch lại rồi Lưu, lượt đó biến khỏi danh sách.
5. Bấm Gọi lượt khác, chọn Chưa bắt máy rồi Lưu, lượt đó vẫn còn trong danh sách.
6. Đăng nhập một tài khoản trưởng ca, mở màn danh sách, thấy nhiều lượt hơn (cả khách của
   nhân viên khác).

NẾU GẶP MÂU THUẪN giữa các ràng buộc, DỪNG LẠI và hỏi trước khi tự mở rộng phạm vi.

TIÊU CHÍ HOÀN THÀNH: nhân viên mở được màn danh sách tái khám từ trang chủ, gọi và đánh dấu
kết quả ngay trên đó, danh sách cập nhật đúng theo kết quả, bám đúng phong cách app. Báo lại
kèm ảnh chụp màn danh sách và sheet kết quả gọi.
```

---

Sau khi xong và anh tự bấm thấy màn chạy đúng, còn một mẩu dọn cuối là hợp nhất phần tái khám
trong màn chi tiết khách về cùng cơ chế mới, để cả app một mối, và cân nhắc siết quyền thao
tác cho đúng người chăm. Em làm sau khi anh duyệt màn này.
