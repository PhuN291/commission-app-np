# Brief dự án: NP Chat Hub

Tài liệu nội bộ 1PDM Agency. Dùng để team nắm toàn cảnh trước khi vào việc.
Cập nhật ngày 30/07/2026. Người chịu trách nhiệm sản phẩm: Nguyễn Đức Phú.

---

## 1. Dự án này giải quyết chuyện gì

Phòng khám Đa khoa Kỹ thuật cao Nguyên Phương ở Đồng Nai sắp khai trương. Khách sẽ nhắn tin qua năm kênh cùng lúc: Livechat trên website, Zalo OA, Zalo cá nhân, Messenger và TikTok. Nếu để bốn nhân viên tư vấn trả lời rời rạc trên máy cá nhân như cách làm phổ biến, phòng khám sẽ gặp hai vấn đề ngay từ tuần đầu.

Thứ nhất là mất tệp khách. Lịch sử chat nằm trên điện thoại từng người, ai nghỉ việc là mất luôn quan hệ khách hàng của người đó.

Thứ hai là không giám sát được. Quản lý không biết khách chờ bao lâu mới có người trả lời, không biết ai đang bỏ sót khách, cũng không biết chất lượng tư vấn ra sao.

NP Chat Hub là công cụ nội bộ gom toàn bộ hội thoại từ năm kênh về một hộp thư duy nhất, phân công người phụ trách, và nối vào app hoa hồng đã có sẵn của phòng khám.

## 2. Bối cảnh khách hàng

Nguyên Phương là phòng khám đa khoa, thế mạnh là tầm soát và xét nghiệm: ung thư, tim mạch, tiểu đường, tuyến giáp, gan thận. Ngoài ra có khám sức khỏe tổng quát nam và nữ, khám thai, tiền hôn nhân, khám sức khỏe doanh nghiệp, lấy mẫu xét nghiệm tại nhà, và nhận bảo hiểm y tế cả tuần từ thứ hai tới chủ nhật. Giờ mở cửa 8 giờ tới 19 giờ.

Đội trực chat lúc khai trương có bốn người. Phòng khám không thu cọc giữ lịch.

Quy trình khám của họ: khách đặt lịch qua website, Zalo, Facebook hoặc hotline, tới nơi đưa mã hẹn cho lễ tân, khám nhanh và nhận kết quả qua điện thoại, sau đó bác sĩ gọi lại đọc kết quả và tư vấn.

## 3. Sản phẩm gồm những gì

Năm màn, hai vai trò.

**Màn Tin nhắn** là màn chính, nhân viên sống ở đây gần như cả ngày. Gồm ba cột: danh sách hàng đợi bên trái, danh sách hội thoại ở giữa, khung chat, cộng panel hồ sơ khách trượt ra khi cần.

**Màn Kênh** quản lý các tài khoản đã kết nối, hiện trạng thái từng tài khoản.

**Màn Báo cáo** hiện số liệu vận hành theo khoảng thời gian chọn được.

**Kho phương tiện** chứa ảnh và file dùng chung như bảng giá, hướng dẫn chuẩn bị trước xét nghiệm.

**Màn Cài đặt** chia theo vai: admin quản lý thành viên và tag, nhân viên chỉ chỉnh thông tin cá nhân và âm thanh thông báo.

Về phân quyền, admin thấy đủ bốn mục điều hướng và làm được mọi thứ. Nhân viên chỉ thấy màn Tin nhắn, Kho phương tiện và phần cài đặt cá nhân, không thấy màn Kênh và Báo cáo, chỉ xem được hội thoại của mình cộng hội thoại chưa ai nhận.

## 4. Vị trí trong hệ sinh thái Nguyên Phương

Đây là phần quan trọng nhất với dev, vì nó quyết định cái gì build và cái gì gọi API.

Hệ sinh thái có bốn phần. **NP Chat Hub** sở hữu hội thoại, tin nhắn, phân công người phụ trách, tag, và kho phương tiện. **App hoa hồng** là lõi thương mại, sở hữu khách hàng, lịch hẹn, dịch vụ và giá, đơn hàng, y lệnh tái khám, hoa hồng. **HIS** là hệ thống của phòng khám, sở hữu hồ sơ y tế, kết quả xét nghiệm, xác thực bảo hiểm và quy trình khám. **Gateway Zalo cá nhân** là một service riêng chỉ lo việc kết nối và giữ phiên các nick Zalo cá nhân.

Quy tắc phân định cho mọi yêu cầu phát sinh về sau: nếu là dữ liệu y tế hoặc quy trình khám thì thuộc HIS; nếu là khách, lịch hẹn hoặc tiền thì thuộc app hoa hồng; Chat Hub chỉ giữ những gì sinh ra từ hội thoại.

Chat Hub đọc và ghi dữ liệu khách, lịch hẹn, dịch vụ qua API của app hoa hồng, không tự tạo bảng khách riêng. Đăng nhập dùng chung danh tính với app hoa hồng qua số điện thoại và mã xác thực.

## 5. Cách tiếp cận kỹ thuật

Bốn kênh chính thức gồm Livechat, Zalo OA, Messenger và TikTok đều có API chính thức, build mới bằng stack của mình là Node, Express, Drizzle, React.

Riêng Zalo cá nhân không có API chính thức. Phương án đã chốt là fork mã nguồn mở ZCRM (github.com/locphamnguyen/ZaloCRM), lấy phần engine kết nối Zalo là thứ đáng giá nhất của repo đó, đóng gói thành một gateway chạy cô lập. Toàn bộ giao diện, CRM và lịch hẹn của ZCRM thì bỏ, chỉ giữ lõi kết nối. Repo phát hành theo giấy phép AGPL-3.0, dùng nội bộ cho một phòng khám thì không phát sinh vấn đề, nhưng nếu sau này 1PDM muốn đóng gói bán ra ngoài thì phải xem lại.

Trước khi nhập bất kỳ dòng code nào của ZCRM, cần một lượt audit bảo mật: soi mọi lời gọi mạng ra ngoài, tìm cửa hậu và secret lộ, kiểm cơ chế tự cập nhật, xác minh thư viện zca-js là bản gốc từ npm. Gateway chạy trong container riêng, chặn kết nối ra ngoài trừ Zalo và storage của mình.

## 6. Điều kiện chặn trước khi tích hợp

App hoa hồng hiện đang di trú dữ liệu dở dang: một nửa màn còn đọc dữ liệu giả trong bộ nhớ, nên cùng một con số hiện khác nhau tùy màn, và mất sạch khi khởi động lại server. Ngoài ra còn lỗ bảo mật: mã OTP mặc định vẫn vào được, nhiều endpoint không cần đăng nhập mà trả về dữ liệu khách kèm dịch vụ y tế, phiên đăng nhập không hết hạn.

Cắm Chat Hub vào lúc này là nhân đôi diện tiếp xúc của một hệ đang hở. Thứ tự bắt buộc: app hoa hồng xong di trú dữ liệu và vá bảo mật trước, sau đó mới mở API cho Chat Hub.

## 7. Việc trên đường găng

Ba việc sau có thời gian chờ duyệt không nén được, nộp muộn ngày nào thì khai trương thiếu kênh ngày đó.

Xác thực Zalo OA, ngành y tế cần kèm giấy phép hoạt động khám chữa bệnh. Nộp hồ sơ Meta App Review xin quyền messaging cho Messenger, kèm xác minh doanh nghiệp. Đăng ký developer trên TikTok Shop Partner Center.

Song song, dev cần bắt đầu hai việc dài ngày là ổn định app hoa hồng và audit ZCRM.

## 8. Đang chờ quyết

Mốc khai trương chưa có. Đây là câu chi phối mọi thứ còn lại: nếu chỉ còn bốn tới sáu tuần thì kế hoạch năm kênh không kịp, phải cắt xuống hai kênh cho ngày đầu và bổ sung sau.

App hoa hồng đã có API nhận đơn và trả dữ liệu khách chưa, schema ra sao. Dev kiểm là biết.

App hoa hồng có ràng buộc một số điện thoại gắn với một thiết bị. Nếu Chat Hub dùng chung cơ chế đăng nhập mà phòng khám có máy tính dùng chung ở quầy thì sẽ vướng, cần xem lại.

## 9. Tài liệu liên quan

Các tài liệu chi tiết nằm trong thư mục audit-docs của repo app hoa hồng.

`BA-PLAN-NP-Chat-Hub.html` là kế hoạch tổng thể theo quy trình BA, gồm mục tiêu đo được, stakeholder, sổ giả định, rủi ro và lộ trình.

`PHAN-TICH-NGHIEP-VU-NP-Chat-Hub.html` là bản chốt phạm vi: làm gì, không làm gì, và ranh giới với các hệ thống khác.

`AUDIT-TUNG-MAN-NP-Chat-Hub.html` là audit nghiệp vụ từng màn, ghi rõ sửa gì cắt gì bổ sung gì kèm lý do.

`BAN-DO-HE-SINH-THAI-va-vi-tri-ChatHub.md` là phân tích vị trí Chat Hub trong hệ sinh thái, dựa trên việc đọc trực tiếp mã nguồn app hoa hồng.

`PLAN-fork-ZCRM-gateway-Zalo.md` là kế hoạch fork ZCRM, gồm giữ gì bỏ gì và điều kiện tiên quyết về bảo mật.

Bản thiết kế giao diện nằm trên Claude Design, file NP Slack Style.
