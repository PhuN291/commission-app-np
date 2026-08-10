# Prompt hoàn thiện thiết kế NP Chat Hub (dán vào Claude Design)

Dùng để chỉnh chính file ZCRM NP Redesign hiện có, kéo nó về khớp BA Plan đã chốt. Dán toàn bộ phần dưới đường kẻ vào Claude Design. Làm từng nhóm một, xong nhóm nào review nhóm đó.

---

Đây là bản chỉnh để khớp plan đã chốt: tool nội bộ cho Phòng khám Nguyên Phương, inbox gom năm kênh về một chỗ, lõi dữ liệu khách và đơn và lịch hẹn nằm ở app hoa hồng (không có kho khách riêng). Giữ nguyên phong cách hiện tại và design system NP. Chỉ sửa và thêm theo đúng danh sách dưới.

## Giữ nguyên, không đụng
- Bố cục inbox bốn cột, mật độ thông tin, bộ lọc bên trái, panel khách bên phải.
- Cơ chế phân công (Nhận khách, Sale phụ trách), tag, tìm kiếm.
- Thẻ số liệu ở dashboard, brand Nguyên Phương, hướng neutral-first, chữ hai độ đậm.

## Sửa để khớp plan

1. Đa kênh. Thay cụm tab Cá nhân / Nhóm / Chính / Khác bằng bộ lọc kênh: Tất cả, Livechat website, Zalo OA, Zalo cá nhân, Messenger, TikTok. Mỗi hội thoại trong danh sách có một badge nhỏ màu theo kênh. Trong panel khách, trường Nguồn hiển thị đúng kênh thay vì cố định Zalo.

2. Banner cửa sổ trả lời theo kênh, đặt ngay dưới header khung chat, ba trạng thái: xanh còn khung, vàng sắp hết, đỏ hết khung. Quy tắc từng kênh: Zalo OA 48 giờ, Messenger 24 giờ và tự gắn Human Agent mở lên 7 ngày, TikTok Shop 7 ngày, Livechat và Zalo cá nhân nhắn tự do. Khi đỏ thì khóa ô nhập kèm câu hướng dẫn, không cho gửi rồi lỗi.

3. Bỏ khỏi nav và bộ lọc: Bạn bè, Nhóm, Quét nhóm, Tệp khách hàng, và tab hội thoại Nhóm. Tắt Gợi ý AI trong khung chat ở bản này, để lại làm sau.

4. Màn Khách hàng đọc dữ liệu từ app hoa hồng, không phải kho riêng. Ghi chú nhỏ trên màn: đồng bộ từ app hoa hồng. Bỏ các khái niệm nick chăm và đa nick khỏi hồ sơ khách, thay bằng kênh đã nhắn và người phụ trách. Giữ quota tin trong ngày nhưng chỉ áp cho kênh Zalo cá nhân.

5. Panel khách bên phải: pipeline, lịch hẹn, lịch sử đơn đọc và ghi qua app hoa hồng. Nút tạo lịch hẹn ghi thẳng vào app hoa hồng. Thêm ô cảnh báo an toàn (dị ứng, lưu ý) hiển thị nổi bật màu đỏ nếu có.

6. Màn giám sát cho quản lý, phục vụ mục tiêu giám sát chất lượng. Chế độ Quản lý team: xem mọi hội thoại của mọi nhân viên, thời gian phản hồi trung bình theo từng người, và cảnh báo hội thoại chưa gán hoặc để khách chờ quá ngưỡng.

## Thêm màn mới

7. Màn Kênh, quản lý kết nối năm kênh, mỗi kênh một thẻ cùng khung: Zalo OA kèm quota tin ngoài khung, Messenger và Instagram gộp một thẻ Meta kèm trạng thái duyệt app, TikTok Shop, Livechat website, và từng tài khoản Zalo cá nhân kèm trạng thái phiên, nút tắt khẩn cấp và quét QR kết nối lại. Đây là kênh Zalo cá nhân chạy qua gateway cô lập nên nhấn mạnh trạng thái phiên và kill-switch.

8. Hành động quản trị khi nhân viên nghỉ: nút gán lại toàn bộ khách của một người cho người khác, phục vụ mục tiêu giữ tệp khách.

## Mobile

Thiết kế bản mobile cho dashboard, inbox, khung chat, khách hàng và màn kênh. Nguyên tắc: không nhồi bốn cột vào màn nhỏ, đi theo từng chặng, danh sách rồi vào khung chat rồi panel khách trượt lên từ dưới. Có thanh điều hướng dưới cùng. Hành động chính như gửi và tạo đơn nằm trong tầm ngón cái, vùng chạm tối thiểu 44px. Banner cửa sổ trả lời và người phụ trách luôn thấy.

## Thứ tự làm

Làm nhóm sửa 1 và 2 trước (đa kênh và banner), vì đó là lệch cốt lõi. Dừng cho tôi review rồi mới sang nhóm 3 tới 6. Màn mới 7 và 8 làm sau cùng trên desktop, rồi mới làm toàn bộ mobile. Nếu thiếu thông tin thì hỏi trước khi tự chế.
