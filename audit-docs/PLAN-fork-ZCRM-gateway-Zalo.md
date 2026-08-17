# Plan: fork ZCRM thành Gateway Zalo cá nhân cho Chat Hub

Ngày: 06/07/2026. Người viết: Claude cùng PM Nguyễn Đức Phú.
Quyết định đã chốt: đi phương án 1 (fork ZCRM, cắt gọt, giữ phần đáng giá), đưa về đúng stack hệ sinh thái NP.
Nguồn: audit repo github.com/locphamnguyen/ZaloCRM (ZCRM v3.4, AGPL-3.0, Node/Fastify/Prisma/Vue/Postgres/Redis, zca-js) và BAN-DO-HE-SINH-THAI-va-vi-tri-ChatHub.md.

---

## 0. Hai điều kiện tiên quyết, chưa xong thì chưa bắt đầu code

1. **Audit bảo mật đọc-thôi phải sạch.** Trước khi nhập bất kỳ dòng code nào của ZCRM: soi mọi lời gọi mạng ra ngoài, tìm backdoor và secret lộ, kiểm cơ chế tự cập nhật, xác minh zca-js là bản gốc từ npm (không phải bản vá lậu nhét trong repo), rà dependency. Bẩn thì dừng, không đáng ở bất kỳ giá nào.
2. **Hiểu đúng ràng buộc AGPL.** Fork và port vẫn là tác phẩm phái sinh, vẫn AGPL kể cả khi viết lại sang ngôn ngữ khác. Dùng nội bộ Nguyên Phương: ổn. Bán ra ngoài dạng SaaS: điều §13 buộc mở toàn bộ source cho khách, trừ khi mua license thương mại từ tác giả. Quyết định này gắn với câu hỏi productize còn treo. Cần rà với người rành license, đây không phải tư vấn pháp lý.

Ngoài ra cần làm rõ: **locphamnguyen (tác giả repo) có phải dev trong team 1PDM không?** Nếu là người nhà thì phần lo "tác giả tấn công" giảm mạnh và audit nhẹ đi. Nếu người ngoài thì giữ nguyên mức soi ở mục 0.1.

---

## 1. Nguyên tắc định hình cả plan

Giá trị thật của ZCRM nằm ở đúng một lớp: **engine Zalo cá nhân** (đăng nhập QR đa nick, giữ và tự nối lại phiên, chống block 200 tin/ngày, mirror media, phát webhook khi có tin). Lớp này tôi luyện qua hơn 1.200 commit, build lại từ đầu tốn nhiều tháng và dễ sai chỗ chống ban. Mọi thứ bên trên lớp đó (HTTP framework, ORM, giao diện Vue, CRM, lịch hẹn) thì hoặc trùng với app hoa hồng, hoặc mình sẽ dựng lại theo stack và design của mình.

Từ đó ra nguyên tắc: **giữ nguyên lõi engine trong một service niêm phong, dựng lại mọi thứ khác bằng stack của mình, không tạo database khách thứ ba.** Lý do niêm phong lõi: chỗ chống ban là chỗ mong manh nhất, đụng vào để "cho khớp stack" là rước rủi ro nick bị khóa mà không đổi lại giá trị gì.

---

## 2. Giữ gì, bỏ gì, xây lại gì

| Thành phần ZCRM | Xử lý | Lý do |
|---|---|---|
| Engine zca-js: đa nick, giữ/nối phiên, chống block, mirror media, phát webhook | GIỮ, niêm phong trong service riêng | Phần đáng tiền duy nhất, không đụng ruột |
| Cấu hình proxy per-nick, quota nick/ngày, cảnh báo mất kết nối | GIỮ | Thuộc lõi chống ban, đã chạy |
| Giao diện Vue (inbox, tài khoản Zalo, cài đặt) | BỎ, dựng lại bằng React theo design NP đã redesign | Khớp stack app hoa hồng, và đã có design sẵn |
| CRM khách hàng, hồ sơ, tệp khách | BỎ, trỏ về app hoa hồng | Chống database khách thứ ba (đã chốt ở bản đồ hệ sinh thái) |
| Lịch hẹn riêng của ZCRM | BỎ, dùng lịch hẹn của app hoa hồng | Cùng lý do |
| Quét nhóm Zalo, danh sách thành viên | BỎ hẳn | Rủi ro khóa nick cao nhất, và thu thập dữ liệu không consent là vi phạm PDPL |
| Automation, tương tác giờ vàng, marketing gửi hàng loạt | BỎ hẳn | Zalo quét spam gắt nhất ở đây, trái non-goal "không bulk" |
| Cầu Zalo qua Telegram | BỎ | Không phục vụ CSKH phòng khám |
| AI assistant (Claude/OpenAI/Gemini) | BỎ ở v1 | Gửi nội dung chat sức khỏe sang bên thứ ba, vướng PDPL. Cân nhắc lại sau, có consent |
| Đăng nhập riêng của ZCRM | THAY bằng SSO qua OTP của app hoa hồng | Một danh tính nhân viên cho cả hệ sinh thái |
| Báo cáo 7 tab, cài đặt 12 mục | RÚT còn phần vận hành nick + KPI phản hồi | Doanh số và hoa hồng đã có bên app hoa hồng |

---

## 3. Quyết định stack: cái gì port, cái gì để nguyên trong hộp

Stack mục tiêu bám app hoa hồng: Node, Express, Drizzle, React, PostgreSQL. ZCRM đang là Node, Fastify, Prisma, Vue.

| Lớp | Quyết định | Ghi chú |
|---|---|---|
| Lõi engine zca-js | ĐỂ NGUYÊN trong service niêm phong (kể cả Fastify/Prisma nội bộ nếu đó là ít công nhất) | Đây là hộp đen sau một API nội bộ nhỏ; không ai ngoài nó đụng vào, nên không cần port. Đụng vào ruột chống ban là rủi ro thuần |
| DB trạng thái của gateway (phiên nick, trạng thái kết nối) | DB riêng nhỏ của gateway, tách khỏi DB app hoa hồng | Cô lập; gateway chết không kéo theo core |
| API và event gateway phát ra | Chuẩn hóa theo convention của mình (REST + webhook có retry) | Đây là mặt tiếp xúc, làm theo stack mình để dev đọc được |
| Backend Chat Hub (nhận event, gán hội thoại, gọi app hoa hồng) | XÂY MỚI bằng Express/Drizzle | Đúng stack, dev quen |
| Giao diện inbox | XÂY MỚI bằng React theo design NP | Đã có design, khớp stack |

Điểm mấu chốt: **không port ruột engine sang Express/Drizzle chỉ để đồng nhất.** Đồng nhất stack áp cho phần team chạm hằng ngày (backend Chat Hub và UI). Engine để yên trong hộp, chỉ giao tiếp qua API. Nếu sau này rảnh và muốn port nốt thì làm sau, không phải việc của v1.

---

## 4. Kiến trúc mục tiêu

```
[Zalo nick 1..n] --zca-js--> +---------------------------+
                             | Gateway Zalo (niêm phong)  |  DB riêng: phiên, trạng thái nick
                             | giữ nguyên engine ZCRM     |
                             +---------------------------+
                                        | event: tin mới, mất phiên (webhook có retry)
                                        v
                             +---------------------------+
                             | Backend Chat Hub (mới,     |  DB: hội thoại, tin, gán, nhãn, SLA
                             | Express/Drizzle stack mình)|
                             +---------------------------+
                                   |                 ^
                     gọi API khách/đơn/hẹn        SSO OTP
                                   v                 |
                             +---------------------------+
                             | App hoa hồng (NP App core) |  nguồn chuẩn: khách, đơn, hẹn, NV
                             +---------------------------+
```

Nguyên tắc cô lập: gateway là process/container riêng, egress bị firewall chỉ cho ra Zalo và storage của mình. Có phone-home giấu trong code cũng không gọi ra ngoài được. Gateway hỏng thì Chat Hub vẫn còn, và các kênh chính thức (OA, Meta, TikTok) không ảnh hưởng.

---

## 5. Roadmap

Giả định: 1 dev chính + anh Phú prototype/PM. Ước lượng cần dev review lại sau khi audit code xong, vì độ dính giữa engine và phần CRM trong ZCRM tôi chưa đọc source nên chưa đo được.

| Phase | Nội dung | Mốc nghiệm thu |
|---|---|---|
| 0. Audit + quyết định | Clone repo, audit bảo mật 5 mục ở phần 0.1; xác minh zca-js gốc; đánh giá độ dính engine với phần bỏ; chốt Lộc là ai; chốt hướng license | Biên bản audit đạt/không đạt; go/no-go fork |
| 1. Bóc engine thành gateway niêm phong | Cắt hết module ở mục 2, giữ lõi engine chạy được độc lập, phát được event tin mới + mất phiên, có kill-switch và cảnh báo | Kết nối 2 nick thật, đồng bộ tin về gateway 4 tuần, không nick nào bị khóa |
| 2. Backend Chat Hub + tích hợp core | Dựng backend Express/Drizzle nhận event, model hội thoại/gán/nhãn/SLA, gọi API app hoa hồng cho khách/đơn/hẹn, SSO OTP | Tin từ gateway hiện trên backend; tạo đơn đẩy được sang app hoa hồng qua cổng ingest |
| 3. Inbox UI React | Dựng giao diện theo design NP đã redesign, cắm vào backend | Nhân viên trả lời 1 nick Zalo từ web, lên đơn trong khung chat |
| 4. Pilot có kiểm soát | 4a chỉ đọc 2 tuần, 4b bật trả lời 2 tuần, rate limit như người thật | Tiêu chí go/no-go: không nick nào bị khóa, đồng bộ thiếu dưới 1% |

Đây là gateway cho một kênh (Zalo cá nhân). Các kênh chính thức OA, Meta, TikTok vẫn theo lộ trình Chat Hub riêng, không phụ thuộc ZCRM.

---

## 6. Quyết định còn treo, cần chốt

1. locphamnguyen có phải dev của 1PDM không? Đổi mức độ audit và mức độ tin cậy. Ai trả lời: Phú.
2. Có định bán sản phẩm ra ngoài không? Quyết định có chấp nhận AGPL hay phải mua license thương mại / build trên zca-js gốc. Ai: Phú + CEO.
3. Số nick Zalo cá nhân cần chạy thật, volume tin/ngày mỗi nick? Sizing gateway. Ai: Nguyên Phương.
4. Kết quả audit bảo mật: có mục nào chặn không. Ai: dev + Claude.

---

## 7. Việc tuần này

1. Anh clone repo vào folder phiên làm việc (như đã làm với app hoa hồng) để tôi chạy audit bảo mật đọc-thôi và đo độ dính engine.
2. Anh trả lời câu Lộc là ai và hướng productize, để chốt được nhánh license.
3. Song song, các thủ tục kênh chính thức (OA, Meta, TikTok) vẫn nộp, vì gateway Zalo cá nhân chỉ là một kênh, không phải cả Chat Hub.
4. Sau khi audit đạt, dev review roadmap và ước lượng lại effort theo source thật.
