# B2 Kịch bản vận hành thực tế NP Clinic

Status: WIP B2.1 (5 kịch bản persona). Sau khi anh duyệt sẽ FINAL B2.1 và mở B2.2 BPMN.
Ngày: 2026-04-25
Phụ thuộc: B1 FINAL (xem `B1-bien-ban-context.md`)

## 0. Bối cảnh chốt từ Q&A setup B2

Đội hình:
- 4 ĐD-Sale: điều dưỡng kiêm sale, vừa phụ bác sĩ thủ thuật vừa tạo đơn
- 1 Trưởng ca: vai trò độc lập, không kiêm sale, không kiêm điều dưỡng (anchor rule "trưởng ca là trưởng ca thôi")
- Bác sĩ: cơ hữu + part-time, số lượng chưa rõ (giả định 2-3 cơ hữu, vài part-time theo lịch)
- 1 Lễ tân: tiếp đón, thu tiền, xuất hoá đơn, không có HH, không dùng app HH
- 1 Kế toán: full-time, không dùng app HH, nhận file Excel/PDF cuối kì
- CEO: anh Nguyên, mobile only, dashboard và approve

Vận hành:
- Giờ mở: 8h tới 19h
- Peak [GIẢ ĐỊNH, verify]: 9h-11h và 14h-17h
- Volume: 20-30 đơn/ngày (mục tiêu 100/ngày)
- Kì lương: chốt ngày 5 hằng tháng
- Adjust HH tay: CEO nói tay, kế toán nhập

Quy trình lõi:
1. Lead đổ vào (CEO chạy ads, marketing channel khác)
2. ĐD-Sale gọi xác nhận, chốt nhu cầu sơ bộ
3. Khách đến clinic theo hẹn
4. Lễ tân tiếp đón, check Isoft xem khách cũ hay mới
5. Khách cũ: search tên ra hồ sơ. Khách mới: tạo hồ sơ mới
6. Khám bác sĩ nội đầu tiên, bác sĩ chỉ định thêm dịch vụ (xét nghiệm, siêu âm, thủ thuật)
7. Khách thanh toán bổ sung nếu có dịch vụ phát sinh
8. ĐD-Sale phụ bác sĩ thực hiện dịch vụ
9. Khách ra về, có thể đặt tái khám

App HH:
- Sinh đơn ở Isoft, app nhận qua webhook
- ĐD-Sale dùng mobile để xem HH cá nhân, ranking, đơn được gán
- Trưởng ca dùng mobile để giám sát ca, xem đơn của team
- Bác sĩ login mobile chỉ để xem HH cá nhân
- CEO dùng mobile để xem dashboard tổng, approve adjustment


## 1. Persona chốt cho B2.1

| ID | Persona | Số lượng | Job chính | Job kiêm | Role HH | Thiết bị app |
|---|---|---|---|---|---|---|
| P1 | ĐD-Sale | 4 | Điều dưỡng (phụ thủ thuật) | Sale (gọi lead, tạo đơn) | Sale + Điều dưỡng | Mobile |
| P2 | Trưởng ca | 1 | Quản lý ca, đảm nhận con tàu chạy tốt | Không kiêm | Trưởng ca | Mobile |
| P3 | Bác sĩ | Chưa rõ | Khám và chỉ định | Không | Bác sĩ | Mobile (chỉ xem HH) |
| P4 | Kế toán | 1 | Đóng sổ, tính lương, xuất báo cáo | Không | Không có HH | Không dùng app, nhận file |
| P5 | CEO | 1 | Điều hành, xem KPI, adjust HH | Không | Không có HH | Mobile |
| P6 | Lễ tân | Chưa rõ | Tiếp đón, thu tiền | Không | Không có HH | Không dùng app HH |

Persona P6 không có kịch bản app riêng nhưng xuất hiện trong workflow của P1-P5.


## 2. Kịch bản 1 ngày điển hình

Mỗi kịch bản dùng nhân vật giả với tên cụ thể để dễ hình dung. Ranking tham chiếu theo Section 6 B1 (M0 đến M3 cho ĐD-Sale, level 1-3 cho bác sĩ).


### 2.1 Kịch bản P1: ĐD-Sale Lan

**Background**:
- Tên Lan, 26 tuổi, làm tại NP 1 năm, ranking M2 (mid)
- %HH: Sale 3% [GIẢ ĐỊNH], Điều dưỡng 1% [GIẢ ĐỊNH]
- Thiết bị: iPhone cá nhân
- Hôm nay làm full ca 8h-19h

**Timeline**:

| Giờ | Hoạt động | Touchpoint app | Ghi chú |
|---|---|---|---|
| 7h55 | Đến clinic, thay đồng phục | Mở app, screen Dashboard cá nhân | Xem HH MTD (month-to-date), ranking hiện tại, có badge mới không |
| 8h00 | Giao ban đầu ca với trưởng ca Hà | Screen Đơn của tôi hôm nay | Hà phân lead mới đêm qua, Lan nhận 6 lead phải gọi xác nhận |
| 8h15-9h00 | Gọi 6 lead xác nhận | Screen Lead/Hẹn (giả định có) | Lead 1 confirm 10h, lead 2 confirm 11h, 2 lead không bắt máy, 1 huỷ, 1 dời sang chiều |
| 9h00 | Khách A đến (lead Lan đã chốt hôm qua) | Lễ tân check Isoft, ra hồ sơ. Lan vào phòng tư vấn | Khách cũ, đã có mã |
| 9h10 | Tư vấn, khách A đồng ý gói khám tổng quát + xét nghiệm máu | Screen Tạo đơn (qua Isoft web hay app HH? GIẢ ĐỊNH: Lan tạo trên Isoft, app HH nhận webhook) | Đơn O-001 sinh ra |
| 9h12 | App HH nhận webhook, OrderRoleAssignment auto-add: {O-001, role=Sale, user=Lan, ranking_snap=M2} và {O-001, role=Trưởng ca, user=Hà} | Screen Đơn của tôi cập nhật | Lan thấy đơn O-001 trong list của mình |
| 9h20 | Khách thanh toán cho lễ tân | Không touch app HH | Lễ tân ấn paid trong Isoft |
| 9h30 | Khách A khám BS nội Minh | Webhook exam_started, app HH add: {O-001, role=Bác sĩ, user=BS Minh} | BS Minh thấy đơn trong app của BS |
| 9h45 | BS Minh chỉ định thêm siêu âm bụng | Đơn O-001 thêm OrderItem siêu âm. Recalc CommissionRecord cho tất cả role active | [GIẢ ĐỊNH] Recalc tự động khi item thay đổi |
| 9h50 | Khách thanh toán bổ sung phần siêu âm | Lễ tân ấn paid bổ sung trong Isoft | |
| 10h00 | Khách A đi siêu âm với BS phụ khoa Hằng-D (giả định BS khác). ĐD-Sale Hằng phụ thủ thuật | Webhook hoặc Hằng manual update: add {O-001, role=Điều dưỡng, user=Hằng} | [VẤN ĐỀ] Hằng phụ siêu âm ăn HH role Điều dưỡng cho cả đơn O-001, kể cả phần khám nội Minh đã làm xong. Anh duyệt logic này? |
| 10h00-10h30 | Lan tiếp khách B đến (lead Hà chốt từ tuần trước, được gán Hà là sale) | Lan tham gia tư vấn cùng | [VẤN ĐỀ] Lan có ăn HH gì cho đơn này không? Hiện B1 nói role Sale là người tạo đơn, không phải người tham gia tư vấn |
| 11h00 | Khách C đến | Lan tạo đơn O-002 cho khách C | OrderRoleAssignment thêm row Sale=Lan |
| 12h00-13h30 | Nghỉ trưa | Mở app screen Ranking xem mình đứng thứ mấy hôm nay | Lan tháng này đang top 2 ĐD-Sale |
| 13h30 | Vào ca chiều | | |
| 14h00 | Khách D đến (lead Lan chốt sáng), tạo đơn O-003 | Cùng flow như khách A | |
| 15h30 | Khách E đến, đồng ý làm thủ thuật phụ khoa luôn | Lan vừa là người tạo đơn (Sale) vừa phụ thủ thuật (Điều dưỡng) | OrderRoleAssignment có 2 row cùng user Lan: 1 role Sale, 1 role Điều dưỡng. Tổng HH Lan trên đơn này = (3% + 1%) × net_profit |
| 17h00-18h00 | Lan kèm cặp ĐD-Sale mới Trang (M0) | Không touch app | Soft skill, không tính HH |
| 18h00-18h45 | Gọi tiếp 3 lead còn pending | Screen Lead/Hẹn | 1 confirm cho mai, 2 không bắt máy |
| 18h50 | Cập nhật báo cáo cá nhân hôm nay | Screen Dashboard, xem tổng HH dự kiến hôm nay | Lan thấy con số dự kiến nhưng note "tạm tính, chốt ngày 5" |
| 19h00 | Tan ca | | |

**Pain points dự đoán**:
- HH dự kiến vs HH thực chi: nếu refund cuối tháng thì số tạm tính khác số chốt, dễ gây tâm lý
- Đơn có nhiều ĐD: ai là Sale, ai là Điều dưỡng, có dispute không
- Lead không bắt máy gọi lại bao nhiêu lần thì bỏ, ai handle
- Khách tới cần gấp ĐD-Sale chính bận, ĐD-Sale khác hỗ trợ thì HH tính sao

**Open question từ kịch bản 2.1**:
- Q-2.1.A: ĐD-Sale tham gia tư vấn cùng người khác tạo đơn có ăn HH không?
- Q-2.1.B: Lead phân theo cơ chế nào (round-robin, theo skill, theo ranking)?
- Q-2.1.C: Tạo đơn ở đâu (Isoft web, app HH, cả 2)?


### 2.2 Kịch bản P2: Trưởng ca Hà

**Background**:
- Tên Hà, 30 tuổi, làm tại NP 2 năm, từng là ĐD-Sale top, được promote trưởng ca 6 tháng trước
- %HH role Trưởng ca: 2% [GIẢ ĐỊNH]
- Thiết bị: iPhone cá nhân
- Trách nhiệm: phân lead, giám sát ca, xử lý escalation, không tự tạo đơn (vì đã không kiêm sale)

**Timeline**:

| Giờ | Hoạt động | Touchpoint app | Ghi chú |
|---|---|---|---|
| 7h45 | Đến clinic sớm 15 phút | Screen Dashboard team | Xem KPI ca: tổng đơn hôm qua, lead pending, trạng thái ĐD-Sale |
| 8h00 | Giao ban: phân lead cho 4 ĐD-Sale | Screen Lead pool, ấn assign | [GIẢ ĐỊNH] App có chức năng phân lead, hoặc làm thủ công ngoài Excel |
| 8h30 | Đi tour kiểm tra phòng khám, sạch sẽ, dụng cụ | Không touch app | |
| 9h00 | Theo dõi 4 ĐD-Sale gọi lead, ai chốt được | Screen Đơn của team realtime | Hà thấy đơn O-001 sinh ra, biết Lan vừa chốt khách A |
| 9h30 | Tự động được gán role Trưởng ca trên O-001 | Screen Đơn của tôi (vai TC) | TC-1 rule: ai tạo đơn thì TC của ca đó hưởng, không đổi dù ca tới có thay |
| 10h00-12h00 | Giám sát ca sáng, xử lý escalation | | Khách phàn nàn delay siêu âm, Hà đứng ra xin lỗi và tặng voucher 5% [GIẢ ĐỊNH có voucher logic] |
| 10h30 | ĐD-Sale Hằng bận với khách E, có khách F đến không ai tiếp | [VẤN ĐỀ] Owner muốn Hà bay vào tiếp luôn. Theo lập luận đã thống nhất, Hà chỉ phụ ngắn hạn (cách: tiếp đón, dẫn vào phòng chờ), không tự đảm nhận tư vấn và tạo đơn | Hà ghi note "thiếu ĐD lúc 10h30, đề xuất tuyển" |
| 12h00-13h30 | Nghỉ trưa | | |
| 13h30 | Họp ngắn giao ca chiều với 4 ĐD-Sale | | Review sáng: 12 đơn, 1 huỷ, 0 refund |
| 14h00-17h00 | Tiếp tục giám sát ca chiều | Screen Đơn của team | Đơn được tạo, Hà tự động được gán TC trên tất cả đơn ca này |
| 17h00 | Khách phàn nàn hoá đơn sai, Hà xử lý | Screen Đơn chi tiết | Hà phối hợp với lễ tân và kế toán refund 1 phần |
| 18h00 | Báo cáo ngày cho CEO qua Zalo | Screen Dashboard team, screenshot gửi CEO | [GIẢ ĐỊNH] CEO không xem realtime trong app mà nhận báo cáo Zalo |
| 18h30 | Kèm cặp Trang (ĐD-Sale mới) | | |
| 19h00 | Tan ca | Mở screen HH cá nhân | Xem mình kiếm được bao nhiêu hôm nay với role TC |

**Pain points dự đoán**:
- Hà bị áp lực bay vào làm thay khi peak, nhưng làm thì không công role ĐD
- Phân lead cho 4 ĐD-Sale: nếu thiên vị thì có dispute, cần cơ chế công bằng
- Trưởng ca không tạo đơn nên ăn HH thấp hơn ĐD-Sale top dù lương cao hơn? Cần check tổng comp (lương cứng + HH) vs ĐD-Sale top
- Escalation không có SOP rõ ràng, Hà tự xử

**Open question từ kịch bản 2.2**:
- Q-2.2.A: App có chức năng phân lead cho trưởng ca không, hay làm tay ngoài app?
- Q-2.2.B: Voucher logic cụ thể như nào (CEO duyệt, trưởng ca tự cấp, nguồn từ đâu)?
- Q-2.2.C: Trưởng ca xem được HH chi tiết từng ĐD-Sale của team hay chỉ tổng?


### 2.3 Kịch bản P3: Bác sĩ Minh (cơ hữu)

**Background**:
- Tên BS Minh, BS nội khoa, 40 tuổi, cơ hữu NP 3 năm
- %HH role Bác sĩ: 5% [GIẢ ĐỊNH], level 2 (mid)
- Thiết bị: iPhone cá nhân, login app khi rảnh
- Trách nhiệm chính: khám, chẩn đoán, kê đơn, chỉ định thêm dịch vụ. Không tham gia phân lead, không tạo đơn.

**Timeline**:

| Giờ | Hoạt động | Touchpoint app | Ghi chú |
|---|---|---|---|
| 8h30 | Đến clinic, mở Isoft xem lịch khám hôm nay | Không touch app HH | Isoft là tool công việc chính |
| 8h45 | Mở app HH 1 lần xem HH MTD | Screen Dashboard cá nhân, screen HH theo đơn | Xem nhanh, đóng app |
| 9h00-12h00 | Khám 5 khách buổi sáng | | Mỗi khách: khám -> chỉ định -> tư vấn |
| 9h30 | Khám khách A của Lan, chỉ định siêu âm | Webhook Isoft -> app HH gán {O-001, role=BS, user=BS Minh}. BS Minh không touch app | App tự động hoá |
| 12h00-13h30 | Nghỉ trưa | | |
| 13h30-17h00 | Khám 6 khách buổi chiều | | |
| 17h30 | Mở app HH lần nữa xem HH ngày | Screen HH theo đơn | Thấy mình được gán 11 đơn hôm nay, dự tính HH X VND |
| 18h00 | Tan ca | | |

**Pain points dự đoán**:
- BS Minh chỉ login app khi rảnh, dễ quên có dispute thì raise muộn
- Không thấy được số khám của BS khác để so sánh ranking, nếu app có thì motivate hoặc demotivate
- BS muốn biết phần dịch vụ nào mình tạo ra value cao nhất (siêu âm vs khám), app có break-down theo OrderItem không

**Open question từ kịch bản 2.3**:
- Q-2.3.A: BS có cần audit log để khiếu nại HH bị thiếu/sai không?
- Q-2.3.B: BS part-time có flow khác BS cơ hữu không?
- Q-2.3.C: %HH BS theo level 1-3 cụ thể bao nhiêu?


### 2.4 Kịch bản P4: Kế toán Linh

**Background**:
- Tên Linh, 35 tuổi, kế toán full-time NP 2 năm
- Không có HH, lương cứng
- Không dùng app HH, làm trên phần mềm kế toán riêng (Misa hoặc Excel) [GIẢ ĐỊNH]
- Tương tác với app HH qua: file Excel/PDF cuối kì + email/Zalo trao đổi với CEO và trưởng ca

**Timeline điển hình ngày bình thường (không phải kì lương)**:

| Giờ | Hoạt động | Touchpoint app | Ghi chú |
|---|---|---|---|
| 8h00 | Đến văn phòng | Không touch app HH | Mở Misa, kiểm tra giao dịch hôm qua |
| 9h00 | Đối soát doanh thu hôm qua với Isoft | Mở web Isoft (không phải app HH) | |
| 10h00 | Lập hoá đơn VAT cho khách yêu cầu | | |
| 14h00 | Theo dõi công nợ khách trả góp [GIẢ ĐỊNH có gói trả góp] | | |
| 17h00 | Báo cáo tài chính ngày | | |

**Timeline kì lương ngày 5 mỗi tháng**:

| Giờ | Hoạt động | Touchpoint app | Ghi chú |
|---|---|---|---|
| 8h00 | Mở email từ CEO/trưởng ca: file Excel HH tháng trước | Không touch app | File từ app HH export ra |
| 9h00 | Đối soát file HH với báo cáo doanh thu Misa | | Tổng HH theo nhân viên = X% × tổng doanh thu, cross-check |
| 10h00 | Phát hiện 2 đơn refund không trừ HH, ghi note để hỏi CEO | | |
| 11h00 | CEO gọi điện, "đơn O-099 anh adjust giảm HH Lan 200k vì lỗi tư vấn", "đơn O-105 anh cộng thêm HH Hằng 100k vì làm thủ thuật khó" | Linh ghi tay vào Excel | [GIẢ ĐỊNH] Adjustment chỉ ghi tay, không có audit trail trong app |
| 14h00 | Hoàn thiện bảng lương: lương cứng + HH + adjustment = lương thực nhận | | |
| 16h00 | Trình CEO duyệt | | |
| 17h00 | Chuyển lương qua ngân hàng | | |
| 18h00 | Gửi pay-slip cho từng nhân viên qua email/Zalo | | |

**Pain points dự đoán**:
- File Excel manual: dễ sai số, không có audit trail
- CEO adjust qua điện thoại: không có evidence, sau này nhân viên thắc mắc thì không có proof
- Đối soát Isoft (doanh thu) vs app HH (HH): hai source khác nhau, sai lệch khó truy
- Nhân viên thắc mắc chậm: chốt rồi mới khiếu nại thì khó sửa

**Open question từ kịch bản 2.4**:
- Q-2.4.A: Kế toán nhận file Excel hay PDF? Ai export? Ai approve trước khi gửi?
- Q-2.4.B: Pay-slip gửi qua đâu, có template không?
- Q-2.4.C: Nhân viên có cách gì đối chiếu HH với app HH không (vì app chỉ có dữ liệu, không có pay-slip cuối)?


### 2.5 Kịch bản P5: CEO Nguyên (anh)

**Background**:
- CEO 1PDM Agency và NP Clinic, không tham gia trực tiếp clinic operation hằng ngày
- Không có HH, ăn lợi nhuận
- Thiết bị: iPhone, mobile only, không dùng web/desktop cho app HH
- Tương tác app HH: dashboard tổng, approve adjustment, điều chỉnh %HH theo ranking

**Timeline điển hình ngày bình thường**:

| Giờ | Hoạt động | Touchpoint app | Ghi chú |
|---|---|---|---|
| 8h00 | Mở app HH lần đầu sáng | Screen Dashboard CEO | Xem tổng đơn hôm qua, doanh thu, HH dự chi, ranking ĐD-Sale |
| 8h05 | Drill-down 1 đơn lớn | Screen Đơn chi tiết | Xem ai làm gì, HH chia ra sao |
| 9h00 | Cuộc họp 1PDM Agency | | |
| 12h00 | Nhận báo cáo Zalo từ trưởng ca Hà | | Hà screenshot dashboard team |
| 14h00 | Mở app, check ranking ĐD-Sale tuần | Screen Ranking | Xem ai đứng đầu, có cần khen thưởng không |
| 17h00 | Mở app, xem alert nếu có | Screen Notification | [GIẢ ĐỊNH] App push noti khi có đơn lớn, refund, complaint |
| 18h00 | Trao đổi với trưởng ca Hà về adjustment | | Hà nói "đơn O-099 Lan tư vấn sai, nên giảm HH" |

**Timeline ngày 5 (kì lương)**:

| Giờ | Hoạt động | Touchpoint app | Ghi chú |
|---|---|---|---|
| 8h00 | Mở app, screen Báo cáo HH tháng | Screen Báo cáo | Tổng HH dự chi = X tỷ, từng người Y |
| 9h00 | Review từng nhân viên, quyết adjustment | | CEO duyệt từng đơn flag, nói tay với Linh |
| 10h00 | Export file gửi Linh | Screen Export, file Excel/PDF | |
| 11h00 | Linh hỏi điều chỉnh, CEO nói tay | | Adjustment ghi Excel ngoài, không trong app |
| 16h00 | Linh trình bảng lương, CEO duyệt | | Qua Zalo/email, không qua app |

**Pain points dự đoán**:
- Adjustment tay không có audit trail trên app: sau 3-6 tháng nhìn lại không nhớ vì sao adjust
- CEO không có web/desktop, dashboard mobile bị giới hạn không gian: nhiều dữ liệu xem cực
- Approve cuối kì qua Zalo, không có bút tích trong app: nhân viên thắc mắc khó truy
- CEO không biết soft cap 15% bị vượt khi nào, app cần warning chủ động

**Open question từ kịch bản 2.5**:
- Q-2.5.A: Dashboard CEO có những widget gì cụ thể (chốt sau B3 audit screen 22)?
- Q-2.5.B: Notification push thực sự cần thiết hay over-engineering?
- Q-2.5.C: Adjustment có cần luồng app chính thức không, hay giữ nói tay là chấp nhận được giai đoạn này?


## 3. Lễ tân Hồng (P6, không dùng app HH)

Background:
- Tên Hồng, 24 tuổi, lễ tân NP 6 tháng
- Không có HH, lương cứng
- Tool chính: Isoft (web/desktop ở quầy), điện thoại bàn, máy in hoá đơn
- Không dùng app HH

Vai trò trong workflow:
- 8h00: mở quầy, kiểm tra lịch hẹn Isoft
- Mỗi khách đến: chào, hỏi đã có hẹn chưa, search tên trong Isoft, dẫn vào phòng tư vấn (nếu chưa có hồ sơ thì tạo mới sau khi ĐD-Sale tư vấn xong)
- Sau khi đơn được tạo và confirm: thu tiền, in hoá đơn
- Cập nhật trạng thái paid trong Isoft (action này trigger webhook tới app HH)
- Khi khách rời clinic: chào, hỏi feedback ngắn

Pain points:
- Không có visibility HH, có thể không hiểu sao ĐD-Sale ưu tiên 1 số khách
- Là người đầu tiên tiếp xúc khách nhưng không có incentive trực tiếp
- [VẤN ĐỀ] Có nên cho lễ tân 1 ít HH vai trò "đón khách" để align incentive không? (Hiện B1 nói không có HH cho lễ tân, đây là note để consider sau)


## 4. Tóm tắt open question và giả định cần verify

### Câu hỏi cần anh duyệt trước khi FINAL B2.1

| ID | Nội dung | Liên quan |
|---|---|---|
| Q-2.1.A | ĐD-Sale tham gia tư vấn cùng người khác tạo đơn có ăn HH không? | OrderRoleAssignment logic |
| Q-2.1.B | Cơ chế phân lead cho ĐD-Sale (round-robin, skill, ranking)? | Trưởng ca workflow |
| Q-2.1.C | Tạo đơn ở đâu (Isoft web, app HH, cả 2)? | Webhook contract |
| Q-2.2.A | App có chức năng phân lead cho trưởng ca không? | App scope |
| Q-2.2.B | Voucher logic cụ thể (CEO duyệt, TC tự cấp, nguồn)? | B1 đã đề cập voucher chưa? |
| Q-2.2.C | Trưởng ca xem HH chi tiết từng ĐD-Sale hay chỉ tổng? | Privacy + scope screen |
| Q-2.3.A | BS có audit log khiếu nại HH thiếu/sai không? | Compliance |
| Q-2.3.B | BS part-time flow khác cơ hữu không? | Persona BS-PT |
| Q-2.3.C | %HH BS theo level cụ thể? | Đã có trong B1 hay phải hỏi |
| Q-2.4.A | File HH gửi kế toán: Excel hay PDF, ai export, ai approve? | Workflow kì lương |
| Q-2.4.B | Pay-slip gửi qua đâu, template? | Out-of-scope app HH? |
| Q-2.4.C | Nhân viên đối chiếu HH với app HH bằng cách nào? | UX nhân viên |
| Q-2.5.A | Dashboard CEO có widget gì? | B3 screen 22 |
| Q-2.5.B | Notification push thực sự cần không? | Scope |
| Q-2.5.C | Adjustment có cần luồng app chính thức không? | Audit trail |

### Vấn đề lớn (nên xử lý trước Q nhỏ)

**VĐ-1**: 2 ĐD-Sale trong cùng đơn (1 tạo đơn, 1 phụ thủ thuật). Người phụ ăn role Điều dưỡng cho cả đơn (kể cả phần khám nội)? Logic này có công bằng không hay cần tách HH theo OrderItem?

**VĐ-2**: ĐD-Sale tham gia tư vấn cùng người khác (không phải người tạo đơn) có ăn HH không? Hiện B1 chỉ cho người tạo đơn ăn role Sale.

**VĐ-3**: Trưởng ca bay vào hỗ trợ điều dưỡng khi peak có ăn HH role Điều dưỡng không? Anchor "trưởng ca là trưởng ca thôi" nói không, nhưng demotivate.

**VĐ-4**: Adjustment tay không có audit trail trong app: rủi ro đặc biệt khi scale lên 100 đơn/ngày, cần có luồng chính thức trước khi B3 audit screen kế toán.

### Giả định cần anh xác nhận

| ID | Giả định | Status |
|---|---|---|
| GĐ-2.1 | Peak 9-11h và 14-17h | Đã xác nhận |
| GĐ-2.2 | %HH ĐD-Sale role Sale 3%, role Điều dưỡng 1% | Cần con số thật từ anh |
| GĐ-2.3 | %HH Trưởng ca 2% | Cần con số thật |
| GĐ-2.4 | %HH Bác sĩ 5% | Cần con số thật |
| GĐ-2.5 | App có screen Lead/Hẹn cho ĐD-Sale | Cần verify trong B3 audit |
| GĐ-2.6 | App có chức năng phân lead cho trưởng ca | Cần verify |
| GĐ-2.7 | App có notification push cho CEO | Cần verify |
| GĐ-2.8 | Tạo đơn nguồn ở Isoft, app HH chỉ nhận | Cần verify với Isoft API doc (RISK #1 B1) |
| GĐ-2.9 | Recalc CommissionRecord tự động khi item thay đổi | Cần verify trong B3 |
| GĐ-2.10 | Số bác sĩ cơ hữu 2-3, part-time vài người | Cần con số thật |
| GĐ-2.11 | Voucher logic tồn tại trong app | Cần verify trong B1/B3 |
| GĐ-2.12 | Đặt tái khám có flow trong app không | Out-of-scope hay in? |


## 5. Bước tiếp theo

Sau khi anh duyệt B2.1:
- B2.1 chuyển FINAL
- Sang B2.2: dựng BPMN lifecycle Order và CommissionRecord (flowchart + state machine)
- Sang B2.3: dựng 8 kịch bản edge case (huỷ, refund, no-show, voucher, handover, BH, adjust, phát sinh dịch vụ)
- Sang B2.4: dựng kịch bản kì lương ngày 5 chi tiết (kế toán + CEO workflow)

Anh review B2.1, ưu tiên trả lời 4 vấn đề lớn (VĐ-1 đến VĐ-4) trước. Câu hỏi nhỏ (Q-2.x.x) có thể trả lời gọn theo đúng số ID cho dễ tra.
