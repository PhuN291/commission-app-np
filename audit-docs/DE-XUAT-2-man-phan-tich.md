# Đề xuất hai màn phân tích bằng số thật

Bối cảnh: giữ lại hai màn Phân tích tổng quan và Phân tích lịch hẹn, làm lại bằng số thật từ
dữ liệu app. Bỏ bốn màn còn lại (phân tích bác sĩ, phân tích bệnh nhân, trợ lý AI, hiệu suất
cá nhân).

Nguyên tắc em theo: phòng khám nhỏ, đang cần tối ưu để hết lỗ, nên mỗi chỉ số phải trả lời được
một câu hỏi và dẫn tới một hành động. Không bày chỉ số cho đẹp. Mỗi chỉ số dưới đây em ghi rõ lấy
từ dữ liệu nào và dùng để quyết định gì.

---

## Một điều phải nói trước: muốn nhìn để tối ưu LỢI NHUẬN thì cần giá vốn

App đang ghi doanh thu đầy đủ, nhưng giá vốn từng dịch vụ hiện để 0. Nếu không có giá vốn thật,
hai màn này chỉ phân tích được doanh thu, không tính được lãi. Mà tối ưu kinh doanh thì phải nhìn
lãi, không phải doanh thu. Vì vậy việc CEO nhập giá vốn từng dịch vụ là điều kiện để màn phân tích
có giá trị thật. Đây đúng là việc anh đã biết cần làm. Nếu chưa có giá vốn, em sẽ làm màn theo
doanh thu trước, chừa sẵn chỗ cho lãi khi có giá vốn.

---

## Màn 1: Phân tích tổng quan (sức khỏe kinh doanh)

Cho CEO và quản lý nhìn một màn biết tháng này khỏe hay yếu, tiền đang chảy vào đâu, nên đẩy gì
cắt gì. Mọi số theo kỳ tháng, luôn kèm so với tháng trước để thấy xu hướng.

Nhóm số chính, hàng đầu màn:

1. Doanh thu thực thu. Tổng tiền khách thật sự trả (giá niêm yết trừ bảo hiểm trừ voucher) của các
   đơn đã khám xong. Câu hỏi: tháng này thu được bao nhiêu, tăng hay giảm. Có sẵn dữ liệu.
2. Lợi nhuận gộp. Doanh thu thực thu trừ giá vốn dịch vụ. Câu hỏi: lãi thật bao nhiêu. Cần giá vốn.
3. Tổng hoa hồng chi và tỷ lệ hoa hồng trên doanh thu. Câu hỏi: chi cho bán hàng có đang ăn mòn
   lãi không. Có sẵn.
4. Số đơn hoàn thành và giá trị trung bình mỗi đơn. Câu hỏi: bán được nhiều ít, mỗi khách chi bao
   nhiêu, có nên bán kèm để tăng giá trị đơn. Có sẵn.
5. Tỷ lệ chốt. Số đơn khám xong chia tổng đơn tạo trong kỳ. Câu hỏi: trong số khách đặt, bao nhiêu
   thật sự đến khám và chi tiền. Có sẵn (suy từ trạng thái đơn).

Nhóm bảng và biểu đồ, phần dưới:

6. Dịch vụ bán chạy và dịch vụ ế. Xếp dịch vụ theo doanh thu và theo số lượt. Câu hỏi: dịch vụ nào
   kéo tiền để đẩy mạnh, dịch vụ nào không ai mua để cân nhắc bỏ. Có sẵn (từ dịch vụ trong đơn).
7. Doanh thu theo nhân viên. Câu hỏi: ai mang tiền về, ai cần hỗ trợ. Có sẵn.
8. Doanh thu theo nhóm dịch vụ. Câu hỏi: mảng nào đang là thế mạnh, mảng nào yếu. Có sẵn (nhóm
   dịch vụ trên đơn).
9. Khách mới so với khách quay lại. Câu hỏi: phòng khám đang sống nhờ kéo khách mới hay giữ được
   khách cũ. Có sẵn (đếm theo số đơn mỗi số điện thoại), cần chốt định nghĩa khách quay lại.
10. Hoàn tiền. Tổng tiền đã hoàn và dịch vụ hay bị hoàn nhất. Câu hỏi: đang mất tiền vì hoàn ở đâu.
    Có sẵn.

---

## Màn 2: Phân tích lịch hẹn (vận hành)

Cho quản lý tối ưu việc lấp đầy lịch và giảm thất thoát khách đã đặt. Đây là chỗ ra tiền nhanh
nhất với phòng khám nhỏ: khách đã đặt mà không đến là mất doanh thu gần như miễn phí để cứu.

1. Phễu lịch hẹn. Đếm khách rơi qua từng bước: đặt lịch, xác nhận, đã nhắc, đến khám, khám xong;
   và các nhánh rớt: không đến, hủy, dời lịch. Câu hỏi: khách rụng nhiều nhất ở khâu nào để chặn
   đúng chỗ. Có sẵn (trạng thái lịch hẹn và khám).
2. Tỷ lệ khách đến. Số đến chia số đã đặt, kèm tỷ lệ không đến. Câu hỏi: bao nhiêu phần trăm khách
   đặt rồi bỏ, có cần nhắc lịch qua Zalo không. Có sẵn.
3. Tỷ lệ hủy và dời lịch. Câu hỏi: lịch có bất ổn không, có phải đổi cách xếp lịch. Có sẵn.
4. Khách trễ giờ đang chờ xử lý. Đơn quá giờ hẹn mà chưa đến. Câu hỏi: ngay lúc này có ai cần gọi
   gấp. Có sẵn (app đã có cách tính đơn trễ).
5. Lịch theo ngày trong tuần và khung giờ. Giờ nào ngày nào đông hay vắng. Câu hỏi: nên xếp nhân
   sự lúc nào, có nên mở thêm khung giờ đông hay dồn khách giờ vắng. Có sẵn (ngày giờ hẹn trên đơn).
6. Tái khám. Số khách đến hạn tái khám, tỷ lệ gọi thành công (đã đặt lại trên tổng cần gọi), và bao
   nhiêu khách thật sự quay lại. Câu hỏi: phòng khám có đang tận dụng khách cũ không, vì kéo khách
   cũ quay lại rẻ hơn nhiều so với tìm khách mới. Có sẵn (nhật ký gọi tái khám và trạng thái lượt).

---

## Dữ liệu cần bổ sung để hai màn thật sự hữu ích

1. Giá vốn từng dịch vụ. Bắt buộc nếu muốn nhìn lợi nhuận chứ không chỉ doanh thu. CEO nhập.
2. Định nghĩa khách quay lại. Cần chốt: khách có từ hai đơn trở lên tính là quay lại, hay theo mốc
   thời gian. Để tính đúng chỉ số khách mới và khách cũ.
3. Nguồn khách. Nếu muốn biết kênh nào ra khách (tự đến, website, iHOS), cần đảm bảo mỗi đơn ghi
   đúng nguồn. Hiện đa số đang là tự nhập. Phần này gắn với đợt đa nguồn sau.

---

## Đề xuất thứ tự làm

Em đề xuất chốt trước danh sách chỉ số anh muốn cho mỗi màn, rồi mới dựng. Với tình hình hiện tại,
em khuyên bắt đầu bằng các chỉ số ra hành động ngay và đã có đủ dữ liệu: doanh thu thực thu, dịch
vụ bán chạy và ế, tỷ lệ chốt, tỷ lệ khách đến và không đến, hiệu quả tái khám. Phần lợi nhuận chừa
chỗ, bật lên khi có giá vốn.
