# Audit content từng màn

Mục tiêu: chữ trong app ngắn, trung tính, dễ hiểu, đúng chuẩn app phổ biến. Audit trước, chốt giọng,
rồi mới sửa.

## Tiêu chí giọng

1. Ngắn nhất có thể. Ưu tiên danh từ, bỏ câu và chữ thừa.
2. Trung tính, khách quan. Không xưng bạn, không giọng cảm xúc, không giải thích dài.
3. Dễ hiểu, dùng từ quen thuộc.
4. Nhãn để dạng danh từ ngắn. Trạng thái rỗng để dạng "Chưa có ...".
5. Không viết tắt kiểu PK.
6. Số và cách tính phải khớp nghiệp vụ thật, nhất là hoa hồng.

Mức: CAO là sai hoặc gây hiểu nhầm, phải sửa. VỪA là cấn, nên sửa. THẤP là chỉnh cho gọn.

---

## Màn 1. Trang chủ

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Popover hoa hồng, công thức | "Doanh thu × Tỉ lệ hoa hồng" | Bỏ dòng công thức. Chỉ để "Tạm tính theo doanh số và tỉ lệ hoa hồng." Code thực tế tính trên lãi ròng, ghi công thức đúng sau khi CEO chốt cách tính | CAO |
| Popover, mô tả | "Hoa hồng tạm tính theo doanh thu trong kỳ" | "Hoa hồng dự tính của tháng này" | VỪA |
| Popover, dòng cuối | "sẽ chốt khi đơn chuyển trạng thái Hoàn tất và được duyệt chi trả cuối kỳ" | "Chốt sau khi hoàn tất và được duyệt" | VỪA |
| Top 3 nhân viên, vai trò | p.role thô, nhiều khả năng ra sale, tc, doctor | Nhãn tiếng Việt: Điều dưỡng, Trưởng ca, Bác sĩ | CAO |
| Metric admin | "Doanh số PK" | "Doanh số phòng khám" | VỪA |
| Section admin | "Cần xử lý PK" | "Cần xử lý phòng khám" | VỪA |
| Việc cần xử lý | "Khách đến ngày tái khám" | "Đến hạn tái khám" | THẤP |
| Top 3 rỗng | "Chưa có dữ liệu xếp hạng" | "Chưa có xếp hạng" | THẤP |
| Loading | "Đang tải dữ liệu..." | "Đang tải..." | THẤP |
| Metric đơn | nhãn "Đơn chốt", số "5 đơn" | nhãn "Đã chốt", số "5" | THẤP |

Ghi chú: "Hoa hồng tạm tính", "Doanh số", "Khách trễ", "Cần gọi xác nhận" giữ nguyên, đã ngắn và
trung tính. Điểm nặng nhất vẫn là ô công thức hoa hồng ghi sai cách tính, khớp cờ đỏ đang chờ CEO.

---

## Điểm CAO nên làm trước

Đây là các chỗ sai hoặc lộ chữ tiếng Anh, ưu tiên sửa:

- Trang chủ: ô công thức hoa hồng ghi "Doanh thu × Tỉ lệ" trong khi code tính trên lãi ròng. Chờ CEO
  chốt cách tính rồi ghi đúng.
- Trang chủ: Top 3 nhân viên có thể hiện vai trò bằng mã tiếng Anh.
- Tạo đơn: "Bạn sẽ nhận được thông báo khi khách check-in" lộ chữ check-in và xưng bạn.
- Chi tiết đơn: nút "Check-in" lộ tiếng Anh, nên là "Đón khách". Dòng "Sale - Điều dưỡng" thừa chữ.
- Chi tiết khách: dòng lịch sử tương tác có loại sự kiện chưa dịch, lộ mã tiếng Anh như order_refund.
- Nhân sự: "SĐT đã có user khác" lộ chữ user.
- Cài đặt: "Thưởng trên doanh số" sai nghiệp vụ, thực tế thưởng tính trên hoa hồng đạt mục tiêu. Cần
  kiểm lại và ghi đúng.
- Tổng quan: nhất quán một từ cho phiếu giảm giá, đang lẫn "voucher" và "phiếu giảm giá".

## Ghi chú chính tả và thuật ngữ

Thống nhất một kiểu cho toàn app: hóa (không hoá), hủy (không huỷ), kỳ (không kì), tỷ lệ (không tỉ
lệ), để đỡ lẫn. Cân nhắc chọn một từ giữa "voucher" và "phiếu giảm giá" rồi dùng nhất quán.

---

## Màn 2. Đơn hàng (orders)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Tiêu đề phụ | {n} đơn trong danh sách | {n} đơn | THẤP |
| Trạng thái rỗng | Không có đơn hàng nào | Chưa có đơn hàng | VỪA |
| Rỗng khi lọc hoàn tiền | Chưa có đơn hoàn tiền. | Chưa có đơn hoàn tiền | THẤP |

## Màn 3. Tạo đơn (order-create)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Tạo đơn xong, tiêu đề | Đã tạo đơn thành công! | Đã tạo đơn | VỪA |
| Tạo đơn xong, mô tả | Đơn {mã} đã được gửi tới lễ tân. Bạn sẽ nhận được thông báo khi khách check-in. | Đơn {mã} đã gửi tới lễ tân. Sẽ báo khi khách đến. | CAO |
| Dropdown tìm khách rỗng | Chưa có khách hàng nào | Chưa có khách hàng | THẤP |
| Hóa đơn công ty | Xuất hoá đơn công ty / Khách hàng cần hoá đơn công ty | Xuất hóa đơn công ty / Khách cần hóa đơn công ty | THẤP |

## Màn 4. Chi tiết đơn (order-detail)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Người phụ trách | Sale - Điều dưỡng | Điều dưỡng | CAO |
| Nút lịch hẹn khi Đã nhắc | Check-in | Đón khách | CAO |
| Badge khám hủy | BN bỏ về | Khách bỏ về | VỪA |
| Badge bỏ dịch vụ | BH từ chối | Bảo hiểm từ chối | VỪA |
| Badge bỏ dịch vụ | BN đổi ý | Khách đổi ý | VỪA |
| Badge bỏ dịch vụ | DV không thực hiện được | Dịch vụ không thực hiện được | VỪA |
| Hộp thoại đổi trạng thái | Bạn có chắc muốn chuyển trạng thái ... sang "X"? Thao tác này không thể hoàn tác. | Chuyển trạng thái ... sang "X"? Không thể hoàn tác. | VỪA |
| Hộp thoại dời lịch | Chọn ngày và giờ mới. Đơn hiện tại sẽ được đánh dấu "Dời lịch" và một đơn mới sẽ được tạo với trạng thái "Đã xác nhận". | Chọn ngày giờ mới. Đơn hiện tại chuyển "Dời lịch", tạo đơn mới ở trạng thái "Đã xác nhận". | VỪA |
| Ghi chú từ chối hoa hồng | Nhân viên sẽ được phép khiếu nại trong vòng 3 ngày sau khi bị từ chối. | Nhân viên có thể khiếu nại trong 3 ngày sau khi bị từ chối. | THẤP |

## Màn 5. Hoa hồng (income)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Số hoa hồng lớn (hero) | không có nhãn | Thêm nhãn "Thực nhận" | VỪA |
| Placeholder khiếu nại | Trình bày lý do khiếu nại để kế toán xem lại... | Lý do khiếu nại... | THẤP |
| Nút khiếu nại | Khiếu nại hoa hồng (Còn {n}h) | Khiếu nại (còn {n}h) | THẤP |
| Toast lỗi khiếu nại | Khoản hoa hồng không ở trạng thái cho phép | Hoa hồng không thể khiếu nại | THẤP |

## Màn 6. Khách hàng (customers)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Tiêu đề phụ | {n} khách hàng trong danh sách | {n} khách hàng | THẤP |
| Trạng thái rỗng | Không tìm thấy khách hàng nào | Không tìm thấy khách hàng | THẤP |
| Huy hiệu trễ tái khám | Quá {n} ngày | Trễ {n} ngày | VỪA |

## Màn 7. Chi tiết khách hàng (customer-detail)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Lịch sử tương tác, loại chưa dịch | mã sự kiện tiếng Anh thô, ví dụ order_refund | Dịch hết sang nhãn Việt, mặc định "Hoạt động" | CAO |
| Kết quả gọi tái khám | Đã đặt lịch lại | Đã đặt lịch | VỪA |
| Dòng timeline gọi | Gọi điện cho khách | Gọi điện | THẤP |
| Mục đơn hàng | Đơn hàng liên quan | Đơn hàng | THẤP |
| Huy hiệu lượt bị từ chối | Đã từ chối | Khách từ chối | THẤP |

## Màn 8. Dịch vụ (services)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Tiêu đề phụ | {n} dịch vụ có sẵn | {n} dịch vụ | THẤP |

## Màn 9. Chi tiết dịch vụ (service-detail)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Tiêu đề thẻ gói | {tên gói} ({n} chỉ số) | {tên gói} ({n} mục) | VỪA |
| Mô tả hộp thoại chọn gói | Vui lòng chọn gói để tạo đơn hàng | Chọn gói để tạo đơn | VỪA |
| Tiêu đề danh sách gói | Các gói dịch vụ ({n} gói) | Gói dịch vụ ({n}) | THẤP |
| Nút | Huỷ | Hủy | THẤP |

## Màn 10. Tái khám (recall-worklist)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Badge sắp tới | Sắp tới {n} ngày | Còn {n} ngày | VỪA |
| Trạng thái rỗng | Hiện không có lượt nào cần gọi | Chưa có lượt cần gọi | VỪA |
| Nhãn người phụ trách | Chăm: {tên} | Phụ trách: {tên} | VỪA |

## Màn 11. Xếp hạng (ranking)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Tiêu đề phụ | Vị trí của bạn trong tháng | Vị trí tháng này | VỪA |
| Nhãn thẻ hạng | Bạn đang ở | Bậc hiện tại | VỪA |
| Mô tả duy nhất trong bậc | Bạn là người duy nhất hiện tại trong bậc {bậc} | Duy nhất ở bậc {bậc} | VỪA |
| Tiêu đề đỉnh bậc | Đỉnh cao! | Bậc cao nhất | VỪA |
| Mô tả đỉnh bậc | Bạn đã đạt bậc cao nhất. Hãy giữ phong độ. | Đã đạt bậc cao nhất. | VỪA |
| Dòng đạt mục tiêu | Đã đạt mục tiêu tháng này! | Đã đạt mục tiêu tháng này | THẤP |
| Trạng thái rỗng | Chưa có dữ liệu xếp hạng cho kỳ này | Chưa có xếp hạng kỳ này | THẤP |
| Đánh dấu người dùng | (Bạn) | (Tôi) | THẤP |

## Màn 12. Thông báo (notifications)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Nút | Đã đọc tất cả | Đánh dấu đã đọc | VỪA |

## Màn 13. Nhân sự (admin-staff)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Toast lỗi trùng SĐT | SĐT đã có user khác | Số điện thoại đã dùng cho người khác | CAO |
| Subtitle trưởng ca | Bạn chỉ có quyền đánh dấu sắp nghỉ | Chỉ được đánh dấu sắp nghỉ | VỪA |
| Nút vùng nguy hiểm | Xóa nhân sự | Chuyển sang Đã nghỉ | VỪA |
| Toast trùng SĐT | SĐT trùng | Trùng số điện thoại | VỪA |
| Lỗi validate | SĐT không hợp lệ | Số điện thoại không hợp lệ | VỪA |
| Placeholder tìm | Tìm tên, SĐT... | Tìm tên, số điện thoại... | THẤP |
| Toast thêm | Thêm nhân sự thành công | Đã thêm nhân sự | THẤP |
| Toast cập nhật | Cập nhật thành công | Đã cập nhật | THẤP |
| Tiêu đề sheet | Thêm nhân sự mới | Thêm nhân sự | THẤP |
| Trạng thái rỗng | Không tìm thấy nhân sự nào | Không tìm thấy nhân sự | THẤP |

## Màn 14. Tỉ lệ hoa hồng (admin-commission-config)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Tiêu đề | Cấu hình hoa hồng | Tỷ lệ hoa hồng | VỪA |
| Banner quyền xem | (Bạn chỉ có quyền xem.) | (Chế độ xem.) | VỪA |
| Toast lưu | Đã lưu cấu hình | Đã lưu tỷ lệ | VỪA |
| Toast lỗi lưu | Lỗi lưu cấu hình | Không lưu được tỷ lệ | VỪA |
| Rỗng lịch sử | Chưa có thay đổi nào | Chưa có thay đổi | THẤP |

## Màn 15. Duyệt hoa hồng (admin-commission-approval)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Hộp thoại duyệt cả kỳ | Bạn sắp duyệt {n} khoản hoa hồng ... | Sắp duyệt {n} khoản hoa hồng ... | VỪA |
| Rỗng tab Duyệt | Không có khoản hoa hồng nào trong kỳ | Chưa có hoa hồng trong kỳ | THẤP |
| Rỗng tab Khiếu nại | Không có khiếu nại đang chờ xử lý | Chưa có khiếu nại chờ xử lý | THẤP |
| Rỗng điều chỉnh | Không có điều chỉnh chờ duyệt | Chưa có điều chỉnh chờ duyệt | THẤP |

## Màn 16. Voucher (admin-vouchers)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Ngày hiệu lực | dạng 2026-01-01 | Định dạng dd/mm/yyyy | THẤP |
| Trạng thái rỗng | Không tìm thấy voucher nào | Không tìm thấy voucher | THẤP |

## Màn 17. Chi tiết voucher (admin-voucher-detail)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Mô tả công tắc | Voucher đang được kích hoạt / đang bị vô hiệu hóa | Đang bật / Đã tắt | VỪA |
| Ngày hiệu lực | dạng 2026-01-01 | Định dạng dd/mm/yyyy | THẤP |
| Placeholder | vd: ... | VD: ... | THẤP |

## Màn 18. Cài đặt (admin-settings)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Nhãn ô tỉ lệ thưởng | Thưởng trên doanh số | Kiểm lại nghiệp vụ. Thưởng tính trên hoa hồng đạt mục tiêu, không phải doanh số. Sửa nhãn cho đúng | CAO |
| Banner chế độ xem | Bạn đang ở chế độ xem. Chỉ CEO mới chỉnh sửa được. | Chế độ xem. Chỉ CEO chỉnh sửa được. | VỪA |
| Tiêu đề nhóm | Cấu hình | Thiết lập | VỪA |
| Nhãn accordion | Kì lương | Kỳ lương | THẤP |
| Link mục 1 | Phần trăm hoa hồng | Tỷ lệ hoa hồng | THẤP |
| Toast lỗi lưu | Không lưu được, thử lại | Không lưu được | THẤP |

## Màn 19. Tổng quan (analytics-overview)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Ghi chú doanh thu | Theo giá niêm yết của từng dịch vụ. Tổng có thể khác ô Doanh thu thực thu (đã trừ bảo hiểm và voucher). | Theo giá niêm yết từng dịch vụ. Tổng có thể khác mục Doanh thu thực thu, đã trừ bảo hiểm và phiếu giảm giá. | CAO |
| Thẻ KPI | Giá trị TB / đơn | Giá trị trung bình mỗi đơn | VỪA |
| Rỗng hoàn tiền | Không có hoàn tiền trong kỳ | Chưa có hoàn tiền trong kỳ | THẤP |

## Màn 20. Lịch hẹn (analytics-appointments)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Nhãn tỉ lệ | tỉ lệ, Tỉ lệ | tỷ lệ, Tỷ lệ, đồng bộ toàn app | THẤP |
| Rỗng khung giờ | Chưa có lịch hẹn có giờ hẹn trong kỳ | Chưa có lịch hẹn đặt giờ trong kỳ | THẤP |

## Màn 21. Đăng nhập (login)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Dòng đã gửi mã | qua Zalo OA | qua Zalo | VỪA |
| Lỗi số chưa đăng ký | SĐT chưa có trong hệ thống. Liên hệ quản lý. | Số điện thoại chưa có trong hệ thống. Liên hệ quản lý. | VỪA |
| Lỗi số sai định dạng | SĐT không hợp lệ. Vd: 0901234567 | Số điện thoại không hợp lệ. Ví dụ: 0901234567 | VỪA |
| Lỗi OTP hết hạn | OTP đã hết hạn. Vui lòng gửi lại. | Mã OTP đã hết hạn. Gửi lại. | VỪA |
| Chân trang | Liên hệ phòng IT nhận hỗ trợ nhanh | Liên hệ phòng kỹ thuật khi cần hỗ trợ | VỪA |
| Lỗi gửi OTP | Lỗi gửi OTP, thử lại | Không gửi được mã OTP. Thử lại. | THẤP |
| Nút quay lại | Đổi SĐT | Đổi số điện thoại | THẤP |
| Tên thiết bị | Browser / Unknown OS | Trình duyệt / Không rõ hệ điều hành | THẤP |

## Màn 22. Không tìm thấy (not-found)

| Vị trí | Chữ hiện tại | Đề xuất | Mức |
|---|---|---|---|
| Mô tả | Trang bạn tìm không tồn tại. | Không tìm thấy trang. | VỪA |
