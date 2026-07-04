# Vá khép đợt 2: hai lỗ còn lại

Hai việc nhỏ để khép đợt 2, đều là lộ và gán sai dữ liệu. Làm xong test rồi báo.

Lỗ 1: cửa cũ GET /api/income vẫn lấy cứng tài khoản "mai", nên ai đăng nhập cũng xem được
thu nhập và hoa hồng của Mai. Cửa này đã có bản thay thế là /api/income/me.

Lỗ 2: màn tạo đơn ở giao diện gửi cứng người phụ trách là số 1 (Mai). Nhân viên thường thì
máy chủ đã ép lại đúng người, nhưng trưởng ca và CEO tạo đơn sẽ bị gán nhầm về Mai, kéo hoa
hồng đổ nhầm.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Sau đợt bảo mật, còn hai chỗ lộ và gán sai dữ liệu cần dọn để khép đợt. CHỈ làm hai
việc dưới, không mở rộng.

VIỆC 1 — Xóa cửa cũ GET /api/income.
Trong server/routes.ts có route GET /api/income (đánh dấu deprecated) lấy cứng
storage.getUserByUsername("mai"), trả thu nhập và hoa hồng của Mai cho bất kỳ ai đăng nhập.
Bản thay thế là GET /api/income/me đã chạy và giao diện chỉ gọi /api/income/me. Xóa hẳn route
GET /api/income cũ. Kiểm tra không còn nơi nào trong client gọi /api/income không kèm /me.

VIỆC 2 — Màn tạo đơn gửi đúng người đăng nhập.
Trong client/src/pages/order-create.tsx, chỗ tạo đơn đang gửi userId cứng bằng 1. Đổi thành
userId lấy từ người đang đăng nhập bằng hàm getCurrentUserId() có sẵn trong @/lib/queryClient
(các trang khác đã import và dùng hàm này). Kết quả: nhân viên tạo đơn cho chính mình; trưởng
ca hoặc CEO tự tạo đơn thì đơn gán cho chính họ, không còn gán nhầm về Mai.

KHÔNG LÀM:
- KHÔNG thêm màn hay ô chọn người phụ trách cho trưởng ca/CEO tạo đơn hộ người khác. Việc đó
  để đợt sau khi làm giao diện chọn người.
- KHÔNG đụng logic ép userId phía máy chủ trong POST /api/orders (đã đúng).
- KHÔNG đụng phần khác.

KHÔNG LÀM HỎNG:
- Màn thu nhập vẫn chạy bình thường qua /api/income/me.
- Tạo đơn vẫn chạy, đơn gán đúng người đăng nhập.
- Giữ hình dạng dữ liệu API.

TEST (chạy và báo rõ):
1. npm run check (tsc) sạch.
2. Gọi GET /api/income (không kèm /me) trả về không còn dữ liệu của Mai (route đã xóa). Màn
   thu nhập vẫn hiện đúng qua /api/income/me.
3. Đăng nhập một điều dưỡng khác Mai (ví dụ Trang), tạo một đơn, kiểm đơn đó gán đúng cho
   Trang, không phải Mai.
4. Đăng nhập một trưởng ca hoặc CEO, tạo một đơn, kiểm đơn gán cho chính người đó, không phải Mai.
5. Dọn sạch đơn test sau khi kiểm.

TIÊU CHÍ HOÀN THÀNH: không còn cửa lộ thu nhập của Mai; đơn tạo ra luôn gán đúng người đang
đăng nhập. Báo lại kết quả test.
```

---

Xong hai việc này là khép đợt 2. Anh chạy test rồi dán kết quả, em đọc code kiểm như mọi lần.
Sau đó mình sang đợt 3, dọn nhất quán (gồm gộp tái khám, dọn Settings, bỏ màn giả, lọc danh
sách đơn và khách theo người).
