# Phân tích nghiệp vụ: luồng đa nguồn (nhập tay + website + iHOS)

Ngày: 11/06/2026 | Vai: BA + tư vấn nghiệp vụ | PM: Nguyễn Đức Phú
Mục đích: thiết kế cho chặt cách app hoa hồng nhận đơn từ ba nguồn và tính tiền đúng, không
sót, không trùng. Tài liệu này là đề xuất của mình để CEO khách hàng duyệt, không phải yêu
cầu sẵn có từ khách (khách chưa vận hành).

Cách đọc các nhãn:
- [GIẢ ĐỊNH]: mình tạm giả định theo chuẩn ngành, cần kiểm lại khi khách chạy thật.
- [CHỜ CEO CHỐT]: quyết định kinh doanh, phải có CEO khách hàng quyết.
- [CHỜ iHOS]: phụ thuộc nhà cung cấp iHOS trả lời kỹ thuật.

---

## 1. Vì sao trước đây thấy thiếu thiếu

Tài liệu cũ (B1, B2) thiết kế theo một giả định ngầm: mọi đơn đẻ ra từ iHOS. Nhân viên tạo
đơn ngay trên iHOS, app hoa hồng chỉ ngồi nhận webhook. Một nguồn duy nhất nên không có
chuyện ghép hay trùng.

Định hướng mới của anh có ba nơi cùng đẻ đơn:
- Nhân viên nhập tay đơn ngay trong app hoa hồng (từ lead Facebook, Zalo).
- Khách tự đặt lịch trên website, đơn chảy về app.
- iHOS ghi nhận ca khám thật.

Ba nguồn này nói về cùng một lần khám của cùng một khách, nhưng đến từ ba chỗ khác nhau,
vào ba thời điểm khác nhau. Phần nối ba mảnh đó thành một đơn duy nhất để tính tiền, tài
liệu cũ chưa hề có. Đó chính là chỗ thiếu.

---

## 2. Mô hình đề xuất: một đơn, ba mảnh dữ liệu

Nguyên tắc gốc để hết rối: phân biệt nơi ĐẶT CHỖ và nơi KHÁM THẬT.

- Đặt chỗ (booking): nhân viên nhập tay hoặc khách đặt web. Đây là dự kiến: khách là ai, dự
  định làm dịch vụ gì, ai là người bán. Chưa phải tiền thật.
- Khám thật: iHOS. Đây là sự thật cuối: thực tế làm dịch vụ gì, ai làm, giá vốn bao nhiêu,
  bảo hiểm trả bao nhiêu, hoàn tất hay hủy.
- App hoa hồng: ghép mảnh đặt chỗ với mảnh khám thật thành một đơn, rồi tính tiền trên cái
  thật.

Nói ngắn: đặt chỗ cho biết ai bán, iHOS cho biết làm gì và tốn gì. Hoa hồng tính trên cái
iHOS xác nhận, còn ai được hưởng thì dựa vào mảnh đặt chỗ.

[GIẢ ĐỊNH] iHOS là nơi khám thật và là nguồn sự thật cuối về dịch vụ, giá vốn, bảo hiểm, ai
thực hiện. Cần CEO và phía iHOS xác nhận đúng là mọi ca khám đều đi qua iHOS.

---

## 3. Các kịch bản khách, đầy đủ

Đây là mọi đường một khách có thể đi, và ai ăn hoa hồng bán ở mỗi đường.

### KB1. Nhân viên kéo khách rồi lên đơn tay (đường chính)
Nhân viên tư vấn qua Facebook hoặc Zalo, chốt được khách, vào app lên đơn đặt chỗ (khách,
dịch vụ dự kiến, ngày hẹn). Khách tới, iHOS ghi nhận khám. App ghép đơn tay với ca iHOS.
Người bán là nhân viên đã lên đơn. Hoa hồng bán về người đó.

### KB2. Khách tự đặt lịch trên website
Khách vào web tự đặt, đơn sync về app, chưa gắn nhân viên nào. Khách tới khám, iHOS ghi
nhận. App ghép đơn web với ca iHOS. Vì không ai bỏ công kéo, hoa hồng bán về ai là [CHỜ CEO
CHỐT], xem mục 6 quyết định D1.

### KB3. Khách tự đến, không đặt trước (walk-in)
Khách tự tới phòng khám, không qua nhân viên, không qua web. iHOS ghi nhận ca khám và đẩy
sang app. App không có mảnh đặt chỗ nào để ghép, nên tạo đơn mới từ dữ liệu iHOS. Không có
người bán. Hoa hồng bán theo chính sách D1.

### KB4. Khách cũ tự quay lại
Khách từng khám, nay tự quay lại (qua web hoặc walk-in). [CHỜ CEO CHỐT] D2: có tính hoa hồng
cho nhân viên đã chăm khách lần đầu không, hay coi như khách của phòng khám. Chuẩn ngành
thường có khái niệm nhân viên chăm gốc, nhưng phải CEO quyết vì nó ảnh hưởng chia tiền.

### KB5. Nhân viên A tư vấn, nhân viên B lên đơn hoặc chốt
Tài liệu cũ chốt tại NP không có chuyện này, một đơn một người bán là người lên đơn. Em giữ
nguyên, nhưng đánh dấu [GIẢ ĐỊNH] vì khi vận hành thật có thể phát sinh, cần cơ chế một
người bán rõ ràng để tránh tranh chấp.

---

## 4. Bảng nguồn sự thật

Mỗi mẩu dữ liệu để tính hoa hồng, tin nguồn nào.

| Dữ liệu | Nguồn sự thật | Ghi chú |
|---|---|---|
| Dịch vụ thực sự làm | iHOS | Đặt chỗ chỉ là dự kiến, có thể đổi khi khám |
| Giá vốn từng dịch vụ | iHOS, hoặc danh mục dịch vụ nếu iHOS không gửi | Thiếu giá vốn thì không tính được lãi |
| Tiền bảo hiểm chi trả | iHOS | Trừ khỏi phần khách trả |
| Voucher giảm giá | iHOS, hoặc web nếu voucher phát từ web | [CHỜ CEO CHỐT] D3: voucher phát ở đâu |
| Ai thực hiện (bác sĩ) | iHOS | Gắn vai bác sĩ |
| Ai bán (Sale) | Mảnh đặt chỗ: đơn tay hoặc đơn web | iHOS không biết ai bán |
| Trưởng ca | App, theo lịch ca lúc tạo đơn | Phương án lịch ca |
| Phần trăm hoa hồng theo hạng | App, chốt tại lúc tạo đơn | Đổi hạng sau không ảnh hưởng đơn cũ |
| Danh mục dịch vụ và giá niêm yết | Website | Đồng bộ sang app để khỏi nhập tay |

Quy tắc khi các nguồn nói khác nhau: tin iHOS cho mọi thứ thuộc về ca khám thật (làm gì, ai
làm, tốn gì, bảo hiểm). Tin mảnh đặt chỗ cho ai bán. Đây là [GIẢ ĐỊNH] cốt lõi, CEO duyệt.

---

## 5. Ghép đơn và chống trùng

Đây là phần dễ sai nhất. Cùng một ca khám có thể để lại dấu ở hai hoặc ba nguồn. Nếu app
không nhận ra là cùng một ca, nó sẽ thành nhiều đơn và tính hoa hồng nhiều lần.

Cách ghép đề xuất, theo thứ tự ưu tiên:

1. Mã chung tốt nhất. App tạo một mã đơn khi đặt chỗ, nhân viên hoặc lễ tân nhập mã đó vào
   iHOS khi khách tới, iHOS trả lại mã trong dữ liệu gửi về. App ghép theo mã. Đây là cách
   chắc nhất. [CHỜ iHOS] iHOS có cho nhập và trả lại một mã tham chiếu không.

2. Nếu không có mã chung. Ghép theo số điện thoại khách cộng ngày khám. Nếu trùng một khách
   một ngày thì coi là cùng ca. Rủi ro: một khách khám hai lần trong ngày sẽ nhập nhằng.

3. Khi ghép mờ, không chắc. App không tự gộp, mà đánh dấu nghi ngờ và để một người (lễ tân
   hoặc kế toán) xác nhận thủ công. Thà hỏi còn hơn gộp sai làm mất tiền của ai đó.

Chống trùng kỹ thuật: mỗi tín hiệu từ iHOS có một mã sự kiện riêng, app ghi lại đã xử lý
chưa, nhận lại lần hai thì bỏ qua. Xử lý theo thời gian sự kiện chứ không theo thứ tự nhận,
phòng khi tín hiệu đến lộn xộn.

---

## 6. Quyết định nghiệp vụ cần CEO khách hàng chốt

Đây là các ngã ba chỉ CEO quyết được. Em để sẵn đề xuất cho mỗi cái.

- D1. Hoa hồng bán khi không có nhân viên kéo (khách đặt web, khách walk-in). Đề xuất: không
  có người bán thì không chi hoa hồng bán, phần đó phòng khám giữ. Hoặc nếu muốn khuyến khích
  trực web, gán cho nhân viên trực tiếp nhận và xử lý đơn đó. [CHỜ CEO CHỐT]

- D2. Khách cũ tự quay lại thì hoa hồng có về nhân viên chăm gốc không. Đề xuất: có, để
  khuyến khích chăm khách, nhưng giới hạn thời gian, ví dụ trong sáu tháng kể từ lần khám
  trước. [CHỜ CEO CHỐT]

- D3. Voucher phát hành ở đâu và ai chịu phần giảm đó. Đề xuất: voucher trừ vào phần khách
  trả, hoa hồng tính trên số thực thu, như tài liệu cũ. [CHỜ CEO CHỐT]

- D4. Khi khách đặt web rồi nhân viên có gọi tư vấn chốt lại không. Nếu có thì đơn web đó có
  thể chuyển thành có người bán. Đề xuất: nếu nhân viên chủ động chăm và chốt đơn web thì
  tính cho họ. [CHỜ CEO CHỐT]

- D5. Trưởng ca có ăn hoa hồng trên đơn web và walk-in không (đơn không qua nhân viên bán).
  Đề xuất: trưởng ca ăn theo ca trực bất kể đơn từ nguồn nào, vì họ vẫn giám sát ca đó. [CHỜ
  CEO CHỐT]

- D6. Dịch vụ thực tế khác dịch vụ đặt trước. Khách đặt web dịch vụ A, tới nơi làm B. Tính
  hoa hồng theo B (cái thật làm). Đề xuất: theo B. Cần xác nhận vì ảnh hưởng người bán có
  được tính khi khách đổi hẳn dịch vụ. [CHỜ CEO CHỐT]

---

## 7. Edge case phải phủ

Gộp các tình huống đã có trong tài liệu cũ và các tình huống mới phát sinh do đa nguồn.

Từ tài liệu cũ, giữ nguyên:
- Khách không đến (no-show) sau giờ hẹn thì tự hủy, hoa hồng bằng 0.
- Hủy trước khám, không có hoa hồng.
- Hoàn tiền toàn phần sau khi đã chi lương thì truy thu kỳ sau.
- Hoàn tiền một phần thì tính lại lãi và điều chỉnh hoa hồng mọi vai.
- Dịch vụ bỏ dở giữa chừng thì không tính, nhưng bác sĩ đã bắt đầu vẫn giữ vai.
- Một bác sĩ làm nhiều dịch vụ thì ăn một lần.
- Lãi âm do bảo hiểm cộng voucher cao thì hoa hồng bằng 0.
- Bảo hiểm trả muộn hoặc bị từ chối sau vài tháng, xử lý điều chỉnh.
- Nhân viên nghỉ việc giữa kỳ, bàn giao đơn.
- Đơn vắt qua hai tháng, tính theo tháng tạo đơn.
- Hạng nhân viên đổi giữa kỳ, đơn cũ giữ phần trăm cũ.
- Nhiều bác sĩ vượt mức cảnh báo, chỉ cảnh báo không chặn.
- Khiếu nại hoa hồng bị từ chối trong ba ngày.

Mới phát sinh do đa nguồn, cần thiết kế:
- Khách đặt web nhưng không đến. Đơn web treo, dọn thế nào, có làm rối danh sách không.
- Khách đặt web một đằng, tới khám đổi dịch vụ một nẻo. Ghép và tính theo cái thật.
- iHOS gửi ca khám mà app không tìm thấy đơn đặt chỗ nào để ghép (walk-in). Tạo đơn mới,
  không người bán.
- App có đơn đặt chỗ nhưng iHOS không bao giờ gửi ca khám (khách đặt rồi không tới, hoặc khám
  chỗ khác). Đơn đặt chỗ treo, không sinh hoa hồng.
- Hai nhân viên cùng lên đơn tay cho cùng một khách một ngày (nhầm). Phát hiện trùng.
- Khách vừa đặt web vừa được nhân viên gọi chốt. Tránh thành hai đơn, và quyết ai ăn (D4).
- iHOS sửa lại ca khám sau khi đã gửi (đổi dịch vụ, đổi bác sĩ). App nhận cập nhật và tính
  lại.
- Website đổi giá hoặc danh mục dịch vụ trong lúc đơn đang mở. Lấy giá tại thời điểm nào.
- Mất đồng bộ: web sync trễ, iHOS webhook rớt. Cơ chế đối soát cuối ngày và chạy lại.

---

## 8. Câu hỏi kỹ thuật gửi nhà cung cấp iHOS

Đây là đường găng. Anh muốn nối iHOS tự động ngay, mà iHOS là nguồn sự thật chính, nên chưa
có mấy câu trả lời này thì em chưa thiết kế chính xác phần ghép và đồng bộ được.

1. iHOS gửi tự động sang hệ ngoài bằng cách nào: webhook đẩy sang, hay app phải gọi API hỏi?
2. Gửi được những sự kiện nào: khách tới, bắt đầu khám, khám xong, hoàn tiền, hủy, sửa đơn?
3. Mỗi sự kiện kèm dữ liệu gì: mã đơn, mã khách, từng dịch vụ kèm giá bán giá vốn người làm,
   tiền bảo hiểm, voucher, thời gian?
4. Có cho nhập và trả lại một mã tham chiếu của bên mình để ghép đơn không? Đây là câu quan
   trọng nhất cho việc chống trùng.
5. Hoàn tiền có gửi rõ hoàn dịch vụ nào và bao nhiêu, hay chỉ tổng?
6. Có gửi ngày hẹn tái khám do bác sĩ chỉ định không?
7. Cách xác thực kết nối (khóa bảo mật), số lần gửi lại nếu lỗi, và cách lấy lại dữ liệu khi
   sót?
8. Có tài liệu kỹ thuật và ví dụ dữ liệu mẫu không?

---

## 9. Giả định đang dùng, cần kiểm khi khách chạy thật

Tóm các chỗ mình đang tự giả định, để sau này không quên kiểm:
- Mọi ca khám đều đi qua iHOS, iHOS là sự thật cuối.
- iHOS có khả năng nhận và trả lại một mã tham chiếu để ghép đơn.
- Một đơn chỉ có một người bán.
- Khách walk-in và khách tự đặt web không có người bán, trừ khi CEO quyết khác.
- Phòng khám có khái niệm trưởng ca trực theo lịch ca.

---

## 10. Đề xuất bước đi tiếp

1. Anh đưa tài liệu này cho CEO khách hàng để chốt sáu quyết định ở mục 6. Em soạn kèm bản
   gọn dễ đọc cho buổi họp nếu anh cần.
2. Anh gửi tám câu ở mục 8 cho nhà cung cấp iHOS. Đây là việc gấp nhất vì nó mở khóa phần
   thiết kế ghép đơn.
3. Sau khi có hai cái trên, em chốt thiết kế ghép đơn và cập nhật lại spec để code phần đa
   nguồn. Trước đó, phần nhập tay và tính hoa hồng một nguồn mình vẫn làm tiếp được như đang
   làm, không bị chặn.
