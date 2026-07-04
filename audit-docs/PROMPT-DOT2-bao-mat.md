# Đợt 2: bịt bảo mật

Đợt này đụng nền đăng nhập, rủi ro vỡ cao, nên làm theo thứ tự sáu phần, test xong phần này
mới sang phần sau. Anh đã chốt: mã đăng nhập tạm đổi thành 062026 dùng cho mọi môi trường tới
khi có Zalo OA; phiên đăng nhập giữ 24 giờ.

Bài test quan trọng nhất sau khi xong: mở một cửa dữ liệu khách mà không đăng nhập thì bị chặn,
đăng nhập rồi mới vào được; một nhân viên không sửa được đơn của người khác.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: App đang hở bảo mật nặng. server/index.ts không có lớp kiểm đăng nhập chung; chỉ các
route admin mới gắn requireRole (server/permissions.ts), còn lại như danh sách khách kèm số điện
thoại, chi tiết khách, tìm kiếm toàn cục, danh sách nhân viên, tạo và sửa đơn đều gọi được không
cần đăng nhập. Token đăng nhập (server/auth.ts) không có hạn dùng. getCurrentUser không kiểm tài
khoản đã nghỉ hay bị khóa. OTP có mã cứng 123456 và còn trả mã ra response. Logger in cả nội dung
response ra console. Việc đợt này: bịt các lỗ hổng đó. CHỈ làm bảo mật.

Làm theo thứ tự, test xong phần này mới sang phần sau. Nếu gặp mâu thuẫn, dừng và hỏi.

PHẦN 1 — Lớp kiểm đăng nhập chung + phiên hết hạn + chặn tài khoản nghỉ hoặc khóa.
- Thêm một middleware áp cho mọi đường dẫn bắt đầu bằng /api, đặt sau express.json và trước khi
  đăng ký route. Middleware lấy token Bearer, tra ra user, gắn vào req.currentUser. Nếu không có
  token hợp lệ thì trả 401. Whitelist cho qua không cần token: POST /api/auth/request-otp và
  POST /api/auth/verify-otp. Không áp middleware này cho đường dẫn không phải /api (vite, static,
  asset client) để không chặn nhầm giao diện.
- Token hết hạn sau 24 giờ kể từ lúc cấp. Trong getCurrentUser (server/permissions.ts), nếu token
  quá 24 giờ thì xóa token đó và coi như chưa đăng nhập (trả null để middleware trả 401). Thêm
  hằng TOKEN_TTL_MS = 24 giờ ở server/auth.ts.
- Trong getCurrentUser, sau khi tra ra user: nếu user.status là offboarded (đã nghỉ) thì trả null;
  nếu user.lockedUntil còn hiệu lực thì trả null. Tài khoản pending_offboarding vẫn cho vào.
- requireRole giữ nguyên cách dùng; nó vẫn gọi getCurrentUser nên tự hưởng các kiểm tra trên.
Test: không gắn token, gọi GET /api/customers bị 401. Đăng nhập xong gọi lại thì được. Sửa tay
một token cho issuedAt lùi quá 24 giờ thì bị 401. Đặt một user status offboarded thì token cũ của
họ bị 401.

PHẦN 2 — Thu hồi token khi cho nghỉ việc.
Khi đánh dấu nghỉ việc hoặc xóa mềm một nhân viên (các route mark-offboarding và soft-delete),
xóa mọi token đang có của user đó trong tokens Map để họ mất phiên ngay.
Test: đăng nhập một NV, cho NV đó nghỉ ở màn quản trị, NV đó gọi API liền bị 401.

PHẦN 3 — Bỏ hardcode user và chặn sửa đơn của người khác.
- GET /api/user và PATCH /api/user đang hardcode user "mai". Đổi sang dùng req.currentUser.
- Chặn IDOR trên các route sửa đơn: PATCH /api/orders/:id/appointment-status, /visit-status,
  /notes, và POST /api/orders/:id/reschedule. Chỉ cho thao tác nếu đơn thuộc người đang đăng nhập
  (order.userId === currentUser.id) hoặc người đăng nhập là trưởng ca hoặc CEO. Nếu không thì 403.
Test: NV A đăng nhập, thử đổi trạng thái một đơn của NV B bị 403. Trưởng ca đổi được mọi đơn.

PHẦN 4 — OTP.
- Đổi mã đăng nhập tạm từ 123456 thành 062026, và cho nó hợp lệ ở MỌI môi trường (không còn giới
  hạn chỉ dev), như lối đăng nhập tạm tới khi nối Zalo OA. Đặt thành hằng có tên rõ ràng kèm chú
  thích TODO bỏ khi có kênh gửi OTP thật.
- Bỏ trả mã OTP ra response (xóa debug_otp). Không in mã OTP ra log ở môi trường production.
- Báo lỗi trung tính khi số chưa đăng ký: request-otp trả thông điệp chung kiểu "Nếu số có trong
  hệ thống, mã đã được gửi", không tiết lộ số đó có tồn tại không, để chống dò danh sách số.
- Thêm giới hạn tần suất xin OTP theo số điện thoại, ví dụ tối đa 5 lần trong 1 giờ, lưu in-memory.
Test: gõ 062026 đăng nhập được. Response của request-otp không chứa mã. Gọi request-otp với số
lạ trả thông điệp trung tính, không phải 404 lộ thông tin.

PHẦN 5 — Ngừng in dữ liệu nhạy cảm ra log.
Logger trong server/index.ts đang nối cả nội dung JSON response vào dòng log. Bỏ phần in nội dung
response cho các route /api (chỉ giữ method, path, mã trạng thái, thời gian). Đảm bảo không in
token, số điện thoại, dữ liệu khách ra log.
Test: gọi vài API, xem log không còn lộ token hay dữ liệu khách.

PHẦN 6 — Client tối thiểu.
Trong lớp gọi API của client (authFetch trong client/src/lib/queryClient): khi nhận 401, xóa token
đã lưu và đưa người dùng về màn đăng nhập. Chỉ làm tối thiểu, không đụng giao diện khác.
Test: để phiên hết hạn rồi thao tác, app tự đưa về màn đăng nhập thay vì lỗi trắng.

KHÔNG LÀM (thuộc đợt sau):
- KHÔNG đụng tái khám, kể cả việc kiểm người chăm cho recall-log và events. Đó là đợt 3 làm cùng
  lúc hợp nhất tái khám.
- KHÔNG lọc danh sách khách theo người chăm lúc này. Sau khi đã bắt buộc đăng nhập thì dữ liệu chỉ
  còn trong nội bộ, việc lọc theo người chăm để đợt 3.
- KHÔNG đụng Settings, không đụng đa nguồn, không sửa logic hoa hồng đã đúng.

KHÔNG LÀM HỎNG:
- Năm nhân viên vẫn đăng nhập bằng 062026 và dùng app bình thường.
- Middleware chỉ áp cho /api, không chặn nhầm giao diện hay tài nguyên client.
- Hai route đăng nhập phải luôn qua được khi chưa có token.
- Token vẫn lưu in-memory như hiện tại; mất khi restart là chấp nhận được, chỉ cần đăng nhập lại.
- Mọi thay đổi đi đúng thứ tự sáu phần, test xong mới đi tiếp.

TEST XƯƠNG SỐNG (làm cuối, báo kết quả rõ):
1. Không đăng nhập, gọi GET /api/customers và GET /api/search bị 401.
2. Đăng nhập bằng 062026 thành công; response request-otp không chứa mã.
3. Đăng nhập một điều dưỡng, thử đổi trạng thái đơn của điều dưỡng khác bị 403; đơn của mình thì
   đổi được; trưởng ca đổi được mọi đơn.
4. Token quá 24 giờ thì bị buộc đăng nhập lại.
5. Cho một nhân viên nghỉ việc, token của họ mất tác dụng ngay.
6. Log không còn in token hay dữ liệu khách.

TIÊU CHÍ HOÀN THÀNH: mọi cửa API đều cần đăng nhập trừ hai cửa đăng nhập; phiên hết hạn sau 24
giờ; tài khoản nghỉ hoặc khóa không vào được; nhân viên không sửa được đơn người khác; OTP không
lộ mã, mã tạm là 062026; log không lộ dữ liệu nhạy cảm. Báo lại kết quả test từng phần và test
xương sống.
```

---

Đây là đợt nặng và đụng nền đăng nhập. Claude Code nên làm tuần tự, test từng phần. Đặc biệt
Phần 1 dễ làm vỡ cả app nếu middleware áp sai phạm vi, cần test kỹ trước khi đi tiếp. Xong, anh
chạy bài test xương sống rồi dán kết quả, em đọc code kiểm như mọi lần.
