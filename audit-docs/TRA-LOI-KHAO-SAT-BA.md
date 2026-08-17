# Trả lời khảo sát BA (Khao-sat-App.xlsx)

Bản nháp để anh và CEO xem lại trước khi điền vào file của BA. Nguyên tắc: câu nào em xác nhận
được từ code thật thì trả lời chắc; câu nào là chính sách hoặc số vận hành thì đánh dấu CẦN ANH
hoặc CẦN CEO, không bịa.

Điểm cần nói thẳng với BA ngay đầu: phạm vi hiện tại là Staff App tính hoa hồng. App chưa nối HIS,
chưa xử lý quỹ BHYT, không có LIS hay trả kết quả xét nghiệm. Nhiều câu về BHYT, HIS, LIS vì thế là
chưa có hoặc ngoài phạm vi đợt này. Nói rõ để BA định giá đúng khối lượng thật.

## Sheet 1: 31 đề mục

| STT | Trả lời | Nguồn |
|---|---|---|
| 1. Vấn đề gốc | Minh bạch và tự động hóa tính hoa hồng cho nhân viên y tế, giảm nhập tay và tranh cãi số liệu. Câu chữ chính thức anh chốt | CẦN ANH |
| 2. Scope chốt, KPI, baseline | Chưa có KPI cam kết chính thức. Scope: quản lý đơn dịch vụ, tính hoa hồng đa vai, duyệt và chi theo kỳ. BA đề nghị tự làm phần KPI, nên để họ làm | CẦN ANH + BA |
| 3. Quyết định đã và chưa chốt | Đã chốt: vòng đời đơn, tách người tạo và người phụ trách, khách vãng lai thì hoa hồng sale bằng 0. Chưa chốt: cơ sở tính hoa hồng, phần trăm theo vai và bậc, ngưỡng thăng bậc, hoa hồng trên BHYT, thu hồi khi xuất toán. Ranh giới: app không xử lý BHYT, chỉ tính hoa hồng | Code + CẦN CEO |
| 4. Giai đoạn | Dev, gần nghiệm thu nội bộ, chưa go-live, chưa pilot cơ sở nào. Đang chuẩn bị bản chạy thử trên Vercel | Code |
| 5. Module đã xong, đang, chưa | Xong phần lõi: đơn, hoa hồng, duyệt, khách, tái khám, voucher, nhân sự, phân quyền, báo cáo, đăng nhập OTP. Chưa: nối HIS, gán bác sĩ vào đơn, OTP Zalo thật, giá vốn, ngưỡng bậc. Chi tiết ở file tổng quan nghiệp vụ | Code |
| 6. Timeline, mốc trễ | Mốc và tiến độ | CẦN ANH |
| 7. Lịch sử đổi scope | Đã qua nhiều đợt: sửa tính tiền, vá bảo mật, dọn phần cũ, làm phân tích, rà chữ, làm lại giao diện. Anh bổ sung mốc lớn | CẦN ANH |
| 8. Demo, tài khoản staging | Sắp có. Bản Vercel đang deploy. Sau khi xong sẽ gửi URL, tài khoản staff test và mã đăng nhập tạm, kèm khóa truy cập | Code |
| 9. Tài liệu context | Đã có sẵn để gửi ngay: file markdown tổng quan nghiệp vụ, đặc tả vòng đời đơn, khung nghiệm thu, mô hình dữ liệu (schema) | Đã có |
| 10. Rule hoa hồng cấu hình được không, ở đâu | Có. Qua màn quản trị Cấu hình hoa hồng, lưu ở database có lịch sử hiệu lực. Không hard-code trong code | Code |
| 11. Phần trăm hay số cố định theo dịch vụ | Hiện là phần trăm theo VAI và BẬC, tính trên lãi ròng của đơn. KHÔNG phải số tiền cố định theo từng dịch vụ. Đây là điểm khác với giả định trong câu hỏi | Code |
| 12. Vòng đời trạng thái hoa hồng | Có. Tạm tính khi có đơn, chờ duyệt khi đơn hoàn thành, chính thức để chi khi duyệt, và có thu hồi. Gom theo kỳ tháng. Không phải chỉ tính lúc xem | Code |
| 13. Đơn có dịch vụ BHYT, bóc tách quỹ | Hiện không. App chỉ hiển thị giá dịch vụ. Có cột số tiền bảo hiểm để sẵn nhưng đang bằng 0, chờ HIS. Chưa bóc tách quỹ BHYT hay đồng chi trả | Code |
| 14. API HIS đã tích hợp | Chưa nối HIS. Có sẵn cột nguồn đơn, mã định danh HIS, chống nhận trùng. Trạng thái tích hợp | Code + CẦN CEO |
| 15. Cơ chế đồng bộ | Chưa nối. Thiết kế dự kiến theo webhook, có cổng nhận đơn chống trùng. Chốt khi làm HIS | Code |
| 16. Chuẩn XML giám định BHYT, vendor | Ngoài phạm vi Staff App hiện tại | CẦN CEO |
| 17. Master data mã dịch vụ map 1-1 HIS-BHYT | App có mã dịch vụ riêng. Mapping với HIS và danh mục BHYT chưa làm, chờ HIS | Code + CẦN CEO |
| 18. Bảng giá map hay sync với HIS | Hiện giá nhập trong app, chưa sync HIS. Đổi giá thì sửa trong danh mục dịch vụ. Cách lấy giá và quản lý đổi giá khi nối HIS cần chốt | Code + CẦN CEO |
| 19. Quy trình tính hoa hồng, báo cáo chi trả | Có engine tính theo đơn, gom theo kỳ tháng, có màn duyệt và màn thu nhập cá nhân. Báo cáo chi tiết để chi lương có một phần, cần xác nhận đủ chưa khi nghiệm thu | Code |
| 20. PIC từng nhóm | Nghiệp vụ: anh Phú. Kỹ thuật: Long dev. Tài chính: CEO hoặc kế toán. Anh xác nhận | CẦN ANH |
| 21. Dịch vụ BHYT có tính hoa hồng không | Chưa chốt chính sách. Code hiện trừ phần bảo hiểm khỏi cơ sở tính, tức phần BHYT không được hoa hồng, nhưng đây là mặc định code chứ chưa phải quyết định của CEO | CẦN CEO |
| 22. Xuất toán BHYT xử lý hoa hồng đã chi | Chưa chốt. App có cơ chế thu hồi nhưng chưa gắn luồng BHYT | CẦN CEO |
| 23. Voucher cấu hình ở đâu, áp BHYT, cộng dồn | Cấu hình ở màn quản trị Voucher, có điều kiện áp và giới hạn lượt. Chưa có khái niệm BHYT trong đơn nên chưa đặt ra. Quy tắc cộng dồn cần xác nhận | Code + CẦN ANH |
| 24. Hoàn tiền, hủy, sửa tay hoa hồng | Dùng bản ghi điều chỉnh và thu hồi, không sửa đè. Có nhật ký thao tác (audit log) | Code |
| 25. Tỷ lệ nhân viên dùng app | Chưa go-live nên chưa có số thật | CẦN ANH |
| 26. Luồng thực tế tại quầy, chỗ nhập 2 lần | Anh mô tả luồng thật ở phòng khám | CẦN ANH |
| 27. Phân hệ đánh giá, khiếu nại | Khiếu nại hoa hồng có, cửa sổ 3 ngày. Đánh giá dịch vụ hay nhân viên thì chưa có | Code |
| 28. Sale xem thông tin gì của bệnh nhân | Xem khách hàng: tên, số điện thoại, địa chỉ, lịch sử đơn tại phòng khám. Không xem lịch sử chẩn đoán hay khám chữa bệnh, vì đó thuộc HIS, app không có | Code |
| 29. Gói dịch vụ chuẩn | Dịch vụ có phân nhóm. Chưa có gói combo đóng sẵn. Cần xác nhận nhu cầu | Code + CẦN ANH |
| 30. LIS, kết quả xét nghiệm | App không có, không nối LIS hay máy xét nghiệm. Ngoài phạm vi | Code |
| 31. Luồng trả kết quả, bác sĩ ký duyệt | App không xử lý trả kết quả xét nghiệm. Có quản lý khách hàng ở mức cơ bản nhưng không nằm trong luồng trả kết quả. Trả kết quả là hệ thống riêng | Code |

## Sheet 2: Sổ vấn đề, gợi ý từ những gì đã phát hiện

Đây là vấn đề thật em đã thấy khi đọc code, nêu ra cho minh bạch:

- Cơ sở tính hoa hồng đang là lãi ròng nhưng CEO chưa chốt chính thức. Rủi ro sai chính sách gốc.
- Số tiền bảo hiểm chưa có nguồn nhập, đang bằng 0, chờ HIS. Phần trừ BHYT chưa có hiệu lực thật.
- Trang xếp hạng đang chạy dữ liệu giả, chưa tính từ đơn thật.
- Tám trạng thái đơn sinh từ hai tầng kỹ thuật, chưa đối chiếu luồng thật của phòng khám.
- Phần trăm hoa hồng, ngưỡng thăng bậc, giá vốn chưa có số chính thức từ CEO.
- Đăng nhập đang dùng mã tạm, Zalo OA chưa nối, chưa đủ an toàn để go-live.

## Sheet 3: Tài liệu

Đã có sẵn, gửi được ngay:

- File markdown tổng quan nghiệp vụ (đúng cái BA xin ở câu 9).
- Đặc tả vòng đời đơn hàng.
- Khung nghiệm thu.
- Mô hình dữ liệu (schema, coi như ERD).

Chưa có, cần làm hoặc cần anh và CEO:

- Tài khoản staging: có sau khi deploy xong.
- BRD/SRS chính thức: chưa có. Có đặc tả nghiệp vụ và mockup thay thế.
- Sơ đồ kiến trúc: em vẽ nhanh được (React, Express, Postgres).
- Đặc tả API HIS: chưa, vì chưa nối HIS.
- Quy chế hoa hồng nội bộ bằng văn bản: CẦN CEO.
- Danh mục dịch vụ có mã và giá: xuất từ app được.
- Kế hoạch, timeline, biên bản họp: CẦN ANH.
