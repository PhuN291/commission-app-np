# Ranh giới design-ref và app thật (chống đẻ thêm khi áp code)

Mục tiêu: khi áp thiết kế vào code, chỉ làm đẹp những gì app thật ĐÃ CÓ. Mọi thứ design-ref có mà
app thật chưa có phải coi là tính năng tương lai, cần backend và quyết định riêng, KHÔNG để tự đẻ ra
khi sửa giao diện.

Nguồn: subagent đọc đối chiếu design-ref/*.jsx (mockup, dữ liệu giả trong design-ref/mock.js) với
app thật (client/src/pages, shared/schema.ts, App.tsx).

## Kết luận nhanh

Hai lần chỉnh nền tảng vừa rồi trên Claude Design không đẻ thêm gì (chỉ đổi màu chữ phụ, tiền, chữ
HH, badge, nền thẻ). Nhưng design-ref nói chung khác app thật rất nhiều. Nếu bê nguyên xi sẽ phát
sinh hàng loạt màn và trường dữ liệu chưa có. Danh sách dưới đây là ranh giới phải tôn trọng.

## Nhóm A: màn hoặc luồng design-ref có, app thật KHÔNG có route

- Onboarding (3 slide giới thiệu). App không có.
- Cài đặt cá nhân (hồ sơ, bảo mật, ngân hàng, giao diện, ngôn ngữ, không làm phiền, sinh trắc). App
  chỉ có /admin/settings là cấu hình hệ thống, không phải cài đặt cá nhân.
- Chế độ offline, màn "Không có kết nối", đồng bộ khi có mạng. App không có.
- Chuyển chi nhánh, đa chi nhánh (CN Quận 1, Thảo Điền, Phú Mỹ Hưng). App không có khái niệm chi
  nhánh ở đâu cả, schema không có.
- Drawer menu kéo từ trái (có mục Lịch hẹn, Báo cáo, chi nhánh). App điều hướng bằng tab bar và
  sheet "Thêm", header không có nút hamburger.
- Tạo đơn nhiều bước (bước 2 Thanh toán, bước 3 màn Thành công kiểu hóa đơn với nút Gửi cho khách /
  In hóa đơn / Nhắn lễ tân). App tạo đơn một trang, success đơn giản.
- Chi tiết hoa hồng / Lịch sử chi trả (payout theo tháng, YTD, ngày chi 05 hàng tháng). App không
  có khái niệm payout; hoa hồng thật là duyệt theo kỳ.
- Màn Tìm kiếm toàn cục riêng (Thao tác nhanh, Tìm gần đây, có cả "Rút hoa hồng"). App chưa có.

## Nhóm B: thành phần hoặc trường design-ref có, app thật và schema KHÔNG có

- Mốc thưởng KPI nhiều bậc (Mốc 1/2/3/4 với target và tiền thưởng riêng). App chỉ có một thanh
  progress target, schema chỉ có một rule thưởng target, không có nhiều mốc.
- Phân loại khách VIP / Thường / Follow-up / Mới. Schema customers không có cột tag; tag hiện tại là
  mock với bộ nhãn khác (VIP, Tiềm năng, Cần tái khám, Đã giới thiệu, Khó tính).
- Tài khoản ngân hàng cá nhân của nhân viên. Không có.
- Đăng nhập kiểu mật khẩu, OTP qua SMS chủ động, ghi nhớ đăng nhập, quên mật khẩu, Face ID. App
  dùng Zalo OTP, có khóa thiết bị, không mật khẩu. Tuyệt đối không copy form login của design-ref.
- Giao diện sáng tối, đa ngôn ngữ, chế độ không làm phiền, bật tắt thông báo đẩy và email tóm tắt,
  bảo mật 2 lớp. Chưa có hệ nào.
- Phương thức thanh toán (tiền mặt, chuyển khoản, thẻ, chia nhiều đợt, đặt cọc). Schema orders không
  có. Giảm giá nhanh dạng phần trăm tĩnh (-5/-10/-15) cũng phá mô hình voucher thật.
- Rút hoa hồng tự phục vụ. Không có.
- Ghi chú nội bộ về khách, lần khám gần nhất, khối "Chuẩn bị" ở chi tiết dịch vụ. Chưa có field.
- Vài thứ nhỏ: delta tăng giảm hạng, sparkline xu hướng hoa hồng, nút gọi/email trực tiếp.

## Nhóm C: cùng màn nhưng khác cấu trúc

- Điều hướng: design-ref có hamburger và drawer; app dùng tab bar cộng sheet "Thêm" là cây quản trị
  phân quyền theo vai. Tab "Hoa hồng" của app ẩn với kế toán và CEO.
- Tạo đơn: design-ref 3 bước có stepper; app một trang.
- Chọn dịch vụ: design-ref bottom sheet; app dialog giữa màn.
- Màn Hoa hồng: design-ref có hero tạm tính, 2 thẻ Đã nhận và Chờ duyệt, KPI nhiều mốc; app có hero
  net, một progress, danh sách khoản theo đơn, điều chỉnh, truy thu.
- Login: như nhóm B.

## App thật đã có, đừng tưởng thiếu

Địa chỉ khách, mã và thời lượng dịch vụ, xuất hóa đơn công ty (tên, mã số thuế, địa chỉ, email,
app thật còn đầy đủ hơn design-ref), phần trăm xu hướng ở trang chủ, tiến trình lên hạng ở trang
chủ, cột examType trong schema (nhưng UI tạo đơn chưa nhập).

## Nguyên tắc áp dụng (bắt buộc)

1. Chỉ làm UI cho các màn app thật đã có route trong App.tsx. Không tạo màn mới từ design-ref.
2. Trong mỗi màn, chỉ chỉnh phần đã tồn tại (màu, chữ, khoảng cách, bố cục của khối đã có). Không
   thêm khối gắn với dữ liệu hoặc tính năng app chưa có.
3. Mọi mục ở nhóm A và B nếu sau này muốn làm thì mở thành yêu cầu riêng, làm backend và schema
   trước, không gộp vào việc làm đẹp giao diện.
4. Khi ra lệnh cho Claude Code áp code, luôn ghi rõ "không thêm tính năng hay trường dữ liệu mới,
   chỉ đổi cách hiển thị thứ đã có" và em đọc lại code để chặn phát sinh.
