# Prompt cho Claude Code: sửa content UI theo audit

## Nhiệm vụ

Sửa chữ hiển thị (content) trong app theo file `audit-docs/AUDIT-CONTENT-tung-man.md`. File đó liệt kê
đầy đủ theo từng màn: vị trí, chữ hiện tại, đề xuất mới, và mức ưu tiên. Đọc kỹ file đó trước, đó là
nguồn chính thức.

## Nguyên tắc

- Chỉ sửa chuỗi chữ mà người dùng nhìn thấy. Không đổi logic, không đổi tên biến, không đổi cấu trúc
  component, không đụng style.
- Giữ nguyên các biến nội suy trong chuỗi như tên khách, mã đơn, số ngày, số giờ.
- Không tự ý sửa chữ ngoài danh sách trong file audit. Chỗ nào file ghi giữ nguyên thì để nguyên.
- Tuyệt đối không dùng dấu gạch dài trong bất kỳ chữ nào.
- Sau khi sửa, chạy `npm run check` (tsc) phải sạch, không lỗi.

## Thứ tự làm

Làm theo mức trong file: nhóm CAO trước, rồi VỪA, rồi THẤP. Sau mỗi nhóm dừng lại để tự rà một lượt.

## Mấy chỗ đặc biệt, không phải thay chữ đơn thuần

1. Nhãn trạng thái và badge dùng chung. Nhiều chuỗi như "Check-in", "BN bỏ về", "BH từ chối", "BN đổi
   ý", "DV không thực hiện được" nằm trong các bảng nhãn dùng chung ở `shared/status.ts` và
   `shared/types.ts`. Sửa ngay tại file gốc đó để áp cho mọi nơi, đừng hard-code lặp ở từng màn.

2. Vai trò ở Top 3 Trang chủ (`client/src/pages/dashboard.tsx`). Kiểm chỗ render `p.role`. Nếu đang in
   ra mã tiếng Anh như sale, tc, doctor thì map qua `ROLE_LABEL` (import từ `@shared/types`) để hiện
   Điều dưỡng, Trưởng ca, Bác sĩ, Kế toán, CEO.

3. Loại sự kiện ở Chi tiết khách hàng (`client/src/pages/customer-detail.tsx`). Nhánh hiển thị lịch sử
   tương tác đang để lọt mã tiếng Anh như order_refund cho các loại chưa dịch. Thêm nhãn tiếng Việt cho
   mọi loại sự kiện, loại nào chưa có nhãn thì mặc định hiện "Hoạt động".

4. Ô công thức hoa hồng ở Trang chủ (popover trong `dashboard.tsx`). Bỏ hẳn dòng "Công thức" và
   "Doanh thu × Tỉ lệ hoa hồng" vì tính sai. Popover chỉ còn: tiêu đề "Cách tính hoa hồng", mô tả "Hoa
   hồng dự tính của tháng này", và một dòng "Tạm tính theo doanh số và tỉ lệ hoa hồng. Chốt sau khi
   hoàn tất và được duyệt."

5. Chính tả thống nhất. Trong các chuỗi hiển thị, dùng một kiểu: hóa (không hoá), hủy (không huỷ), kỳ
   (không kì), tỷ (không tỉ). Chỉ sửa trong chuỗi chữ, không đụng tên biến hay code.

6. Chữ tắt SĐT trong mọi chuỗi hiển thị đổi thành "số điện thoại".

## KHÔNG sửa lần này, chờ chốt nghiệp vụ

Nhãn "Thưởng trên doanh số" ở màn Cài đặt (`admin-settings.tsx`) giữ nguyên. Đang chờ CEO xác nhận
tiền thưởng tính trên doanh số hay trên hoa hồng, chốt xong mới sửa nhãn cho đúng. Đừng đổi.

## Xong thì báo lại

Liệt kê ngắn gọn đã sửa những file nào, và xác nhận `npm run check` sạch.
