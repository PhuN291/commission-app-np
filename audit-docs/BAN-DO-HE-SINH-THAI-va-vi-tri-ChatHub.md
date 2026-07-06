# Bản đồ hệ sinh thái NP và vị trí Chat Hub

Ngày: 06/07/2026. Người viết: Claude (phân tích cùng PM Nguyễn Đức Phú).
Cơ sở: đọc trực tiếp `shared/schema.ts`, `server/ingest.ts`, `server/routes.ts` của app hoa hồng (bản newui), đối chiếu LUONG-DA-NGUON-phan-tich-nghiep-vu.md và AUDIT-KIEN-TRUC-toan-app.md.
Mục đích: chốt vị trí của NP Chat Hub (tool quản lý hội thoại đa kênh đang được spec riêng) trong hệ sinh thái, tránh build trùng những gì app hoa hồng đã có.

---

## Kết luận một câu

Không cần build "NP Core" mới: app hoa hồng trên thực tế đã là core thương mại của hệ sinh thái (khách, đơn, lịch hẹn, dịch vụ, nhân viên, hoa hồng), Chat Hub chỉ nên sở hữu duy nhất phần hội thoại và cắm vào core này qua cổng ingest có sẵn, nhưng chỉ được cắm sau khi app hoa hồng khâu xong di trú dữ liệu và vá bảo mật theo đúng AUDIT-KIEN-TRUC.

---

## 1. Hệ sinh thái thật có 4 node, không phải 3

Phát hiện quan trọng nhất khi đọc code: hệ sinh thái đã có iHOS (phần mềm khám của phòng khám) nằm sẵn trong thiết kế (`users.ihosUserId`, `orders.source='ihos'`, webhook y lệnh tái khám). Mô hình LUONG-DA-NGUON đã chốt đúng nguyên tắc: tách nơi ĐẶT CHỖ khỏi nơi KHÁM THẬT.

| Node | Vai trò trong hệ sinh thái | Sở hữu dữ liệu gì |
|---|---|---|
| iHOS | Nơi khám thật, nguồn sự thật cuối về ca khám: dịch vụ thực làm, giá vốn, bảo hiểm, bác sĩ thực hiện, y lệnh tái khám | Hồ sơ y tế, ca khám (ngoài quyền kiểm soát của mình, tích hợp qua webhook) |
| App hoa hồng (NP App) | Core thương mại: ghép mảnh đặt chỗ với ca khám thật, tính tiền và chia hoa hồng | Khách hàng, đơn + lịch hẹn, order_items + tái khám, danh mục dịch vụ, nhân viên + vai trò + hạng, voucher, hoa hồng, thưởng phạt, kỳ lương, audit log |
| Chat Hub (đang spec) | Bề mặt hội thoại: nơi nhân viên nói chuyện với khách trên Zalo/Messenger/Instagram/TikTok và sinh ra mảnh ĐẶT CHỖ từ chat | Hội thoại, tin nhắn, gán hội thoại, nhãn, SLA trả lời, backup chat |
| Website booking (tương lai) | Kênh khách tự đặt | Không sở hữu gì, ghi đặt chỗ vào NP App (source='website' đã dự phòng sẵn trong enum) |

Chat Hub khớp nguyên văn kịch bản KB1 của LUONG-DA-NGUON: "Nhân viên tư vấn qua Facebook hoặc Zalo, chốt được khách, vào app lên đơn đặt chỗ". Khác biệt duy nhất: thay vì nhân viên rời chat để vào app hoa hồng nhập tay, Chat Hub cho lên đơn ngay trong khung chat và gọi API. Về mặt nghiệp vụ, Chat Hub là một nguồn đặt chỗ mới, ngang hàng 'manual' và 'website', đề xuất thêm giá trị enum `source='chathub'`.

## 2. Những gì Chat Hub KHÔNG được build vì NP App đã có

Đây là phần tiết kiệm lớn nhất. Các mục từng nằm trong audit tính năng của Chat Hub nay xác nhận đã tồn tại trong NP App:

| Nhu cầu | Đã có sẵn trong NP App | Chat Hub dùng cách nào |
|---|---|---|
| Người chăm gốc (sticky) | `customers.primaryAssignedUserId` (R-8-6), set lần đầu khi tạo đơn | Khách cũ nhắn tin thì Chat Hub đọc trường này để tự gán hội thoại về đúng người |
| Lịch hẹn | `orders.appointmentStatus/Date/Time`, `visitStatus`, máy trạng thái 2 tầng + status_logs + API reschedule | Panel lịch hẹn trong Chat Hub đọc ghi qua API, không tạo bảng hẹn riêng |
| Tái khám / chăm lại | `order_items.recallDueDate/recallStatus` + `recall_logs` + worklist | Chat Hub hiển thị nhắc tái khám trong hồ sơ khách từ dữ liệu này |
| Liệu trình nhiều buổi | `order_items.status` planned/completed/skipped theo từng dòng dịch vụ | Hiển thị tiến độ buổi từ order_items, không cần model liệu trình mới |
| Trần giảm giá | Voucher engine đầy đủ: maxDiscount, minOrder, usageLimit, validate API | Panel tạo đơn của Chat Hub gọi validate voucher, không cho sửa giá tay tự do |
| Hoàn tiền + truy thu hoa hồng | refund fields + commission_records.parentCrId (clawback R-6-4) + khiếu nại 3 ngày | Không đụng, chỉ hiển thị trạng thái |
| Attribution đa vai | order_role_assignments (sale, tc, doctor) + % snapshot theo thời điểm + handover endedAt (R-3-5) | Chat Hub chỉ truyền saleUserId khi tạo đơn, chia vai là việc của engine |
| Timeline khách | customer_events (call, sms, email, order_created, status_change, recall_call) | Chat Hub ghi thêm loại event mới (ví dụ chat_started) vào cùng bảng qua API |
| Danh tính nhân viên + đăng nhập | users + roles ceo/tc/kt/sale/doctor + hạng M/L + đăng nhập SĐT OTP + device binding | Chat Hub tái dùng làm SSO, tuyệt đối không tạo bảng nhân viên riêng |

## 3. Hợp đồng tích hợp Chat Hub sang NP App (v0, chờ dev duyệt)

**Chiều Chat Hub gọi NP App:**
- Tạo đơn đặt chỗ: `POST /api/orders` đi qua cổng `ingestOrderDerived()` (G1b) với `source='chathub'`, `idempotencyKey` (chống trùng khi retry), `saleUserId` = user chung, phone khách để match `customers`.
- Đọc: hồ sơ khách theo phone, lịch sử đơn, lịch hẹn, danh mục dịch vụ + voucher, worklist tái khám của khách.
- Ghi: cập nhật thông tin khách (các trường mới, xem mục 4), ghi customer_events.

**Chiều NP App báo về Chat Hub (hiện CHƯA có, cần thêm):**
- NP App mới chỉ nhận vào, chưa phát sự kiện ra ngoài. Chat Hub cần biết: đơn đổi trạng thái hẹn/khám, ca iHOS đã ghép, hoa hồng đã chốt, để hiện trong khung chat cho nhân viên. Đề xuất: bảng outbound_events + webhook đơn giản có retry, hoặc tối thiểu cho Chat Hub polling theo updated_at. Quyết định thuộc dev.

**Danh tính và khách:**
- Một user một SĐT dùng chung 2 app; Chat Hub xin cấp token qua chính luồng OTP của NP App.
- Khách match theo phone chuẩn hóa (logic ingest đang làm vậy); hồ sơ khách chỉ có một, nằm ở NP App.

## 4. Gap thật còn lại sau khi soi code (đưa vào backlog NP App, không phải Chat Hub)

1. **Thanh toán và cọc**: orders chưa có trạng thái tiền (chờ cọc, đã cọc, thu đủ) và phương thức. Phòng khám vận hành bằng cọc giữ lịch nên đây là gap nghiệp vụ thật. Liên quan trực tiếp câu hỏi hoa hồng tính tại thời điểm nào (hiện engine bám CONFIRMED/COMPLETED).
2. **Trường khách còn thiếu**: customers chưa có ngày sinh, giới tính, dị ứng/lưu ý an toàn, và trạng thái đồng ý xử lý dữ liệu (consent PDPL, luật 91/2025 hiệu lực 01/01/2026, chat phòng khám là dữ liệu nhạy cảm). Thêm cột vào customers, không tạo bảng mới.
3. **Outbound events**: như mục 3.
4. **Enum source**: thêm 'chathub' (hiện 'manual' | 'ihos' | 'website').

## 5. Điều kiện tiên quyết trước khi cắm Chat Hub (lấy từ chính AUDIT-KIEN-TRUC)

Cắm thêm một nguồn đơn và một client đọc dữ liệu khách vào app đang có 2 tình trạng sau là nguy hiểm:
1. **Di trú dở dang (Nhóm 1, mức Cao)**: một nửa màn còn đọc dữ liệu giả in-memory, số lệch giữa các màn, mất khi restart. Phải khâu xong trước, nếu không Chat Hub sẽ hiển thị số khác app hoa hồng và mất niềm tin của nhân viên ngay tuần đầu.
2. **Bảo mật (Nhóm 2, mức Cao)**: OTP mặc định, endpoint không auth lộ dữ liệu khách y tế, phiên không hết hạn. Phải vá trước khi mở thêm API cho client mới, vì Chat Hub sẽ nhân đôi diện tiếp xúc.
3. **Cổng đa nguồn chưa enforce**: idempotencyKey có cột nhưng chưa thực thi chống trùng, chưa có logic ghép đơn đặt chỗ với ca iHOS. Chat Hub phụ thuộc trực tiếp cổng này.
4. **Hai quyết định kinh doanh còn treo**: D1 (đơn không người bán thì hoa hồng về ai) và D2 (khách cũ quay lại, người chăm gốc có hưởng không). D2 quyết định luôn hành vi auto-gán hội thoại của Chat Hub, cần CEO Nguyên Phương chốt.

## 6. Tác động lên PRD Chat Hub v1.2

- Mục kiến trúc và data model: bỏ khối "orders, order_items, commission_events" khỏi Chat Hub; thay bằng tích hợp API NP App. Chat Hub chỉ giữ: channels, conversations, messages, assignments, labels, sla_rules, backup.
- Phase 2 (đơn + hoa hồng) đổi bản chất: từ build module đơn hàng thành build panel tạo đơn gọi ingest + màn trạng thái đồng bộ. Effort giảm, nhưng thêm dependency cứng: NP App xong Nhóm 1 + Nhóm 2 + enforce idempotency trước.
- Open Questions cập nhật: câu "app hoa hồng có API nhận đơn chưa" đã trả lời (có, POST /api/orders qua cổng ingest, thiếu enforce idempotency + outbound events). Thêm câu D1, D2 vào danh sách chờ CEO Nguyên Phương.
