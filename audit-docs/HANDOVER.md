# HANDOVER - NP Commission App

File này tóm tắt toàn bộ context dự án để Claude session mới load nhanh, không phải kể lại từ đầu.

**Cập nhật**: 31/05/2026 | **PM**: Nguyễn Đức Phú (1PDM Agency) | **Khách hàng**: Phòng khám Nguyên Phương (NP Clinic)

---

## 1. Dự án là gì

**Tên**: NP Commission App (App Hoa hồng cho Phòng khám Nguyên Phương).

**Mục tiêu cuối**: 5 nhân viên NP dùng app hằng ngày để tự xem, duyệt, chi hoa hồng. CEO khách hàng (anh Nguyên) ký nghiệm thu sau 30 ngày go-live song song với Excel cũ.

**Vendor build**: 1PDM Agency (anh Phú là PM kiêm CEO). Dev team 1-2 người.

**Stack**: React + Express + TypeScript, in-memory MemStorage (sẽ chuyển DB Postgres ở v1.5).

**Tài liệu**: 18 file trong `/audit-docs/` (B1 đến B7 + ADR + POST-DEV-AUDIT + visual files).

---

## 2. Convention ngôn từ (tuân thủ tuyệt đối)

- **PM** = Project Manager = anh Phú (CEO 1PDM)
- **CEO khách hàng** = anh Nguyên (CEO NP)
- **KT trưởng** = Diễm (Kế toán trưởng)
- **TC** = Hà (Trưởng ca)
- **NV Sale** = Lan / Hằng / Trang (3 người)
- **BS** = Minh / Hằng-D / Vinh (3 bác sĩ)
- **Vendor iHOS** = POS/EMR của phòng khám (KHÔNG bao giờ viết "Isoft")
- **HH** = Hoa hồng (thay cho "CR" / "CommissionRecord" - thuật ngữ dev)

Giọng văn: thẳng thắn, đời thường, không thuật ngữ BA nặng. Anh Phú là CEO marketing 2 năm kinh nghiệm, KHÔNG phải dev/BA chuyên nghiệp.

**Quy tắc giao tiếp với anh Phú**:
- Không dùng "—" (em dash)
- Không emoji
- Tiếng Việt 100% có dấu
- Khi input không đủ, KHÔNG đoán mò, phải hỏi
- Không thêm câu lưu ý thừa
- Không nịnh nọt, không định kiến tiêu cực

---

## 3. Vai trò Claude (role hiện tại)

Claude đóng vai **strategic advisor + BA** cho anh Phú để đưa dự án đến đích. Không phải task executor đơn thuần.

Trách nhiệm:
- Giữ tổng thể project, push priority đúng
- Phân tích, chẩn đoán, đề xuất hướng đi
- Viết prompt cho Claude Code khi cần dev fix
- Soạn tài liệu hỗ trợ (script phỏng vấn, agenda họp, mail template)
- Cảnh báo khi anh Phú hoặc Claude Code có nguy cơ đi sai hướng

---

## 4. Khung chiến lược: STOP - STABILIZE - SHIP

Dự án đang trong vòng lặp "xây cao mà nền chưa vững". Khung chiến lược em đề xuất và anh Phú đồng ý:

**STOP** (đang làm, 1-2 ngày): Đóng feature đang dở, KHÔNG mở feature mới.
- ✅ Đã revert Edit Order (anh Phú đã làm 14/05)
- ✅ Dashboard cleanup (lead/skipped bỏ, late15 lọc theo role)
- ⏳ Không mở Vấn đề 1 (TC khác Sale) bây giờ

**STABILIZE** (đang làm, 1-2 tuần): Fix nền tảng để sẵn sàng UAT.
- ⏳ Dev fix 3 P0 (em vừa viết prompt master cho Claude Code, anh Phú chạy)
- ⏳ PM contact vendor iHOS (4 câu webhook)
- ⏳ PM đăng ký Zalo OA
- ⏳ PM phỏng vấn KT trưởng + TC để có baseline thật
- ⏳ Họp CEO khách hàng duyệt 6 quyết định

**SHIP** (sau 2 tuần, 2-4 tuần): Đưa app vào NP dùng thật.
- UAT 2 tuần với 5 NV
- Sửa bug từ feedback
- Go-live song song Excel 30 ngày
- Nghiệm thu

---

## 5. Trạng thái hiện tại (31/05/2026)

### Code đã xong
- 13 task rework theo plan (login, admin-staff, settings, commission approval, income, order detail, orders, ranking, commission config, dashboard, customer detail, customers, admin commission approval)
- Search universal, Notification system, UX gate by role
- PATCH /api/orders/:id (Edit Order) - **ĐÃ REVERT** vì UX không Sapo-style + nhiều BUG data integrity

### 3 P0 còn nợ (CHẶN UAT)
| ID | Lỗi | File | Effort |
|---|---|---|---|
| C-1 | Thiếu bảng OrderRoleAssignment | `shared/schema.ts` | 1-2 ngày |
| C-2 | DEV_OVERRIDE_OTP security gate | `server/routes.ts:71-73` + `server/index.ts` | 30 phút |
| C-3 | Thiếu POST /api/admin/commission-tiers | `server/routes.ts` | 1 giờ |

Chi tiết trong `audit-docs/POST-DEV-AUDIT-REPORT.md`.

**Em đã viết prompt master cho Claude Code fix 3 P0**, ngày 31/05. Phát hiện lỗ hổng test #4 mâu thuẫn với mục đích refactor (HH Sale sẽ đổi 3% → 5% sau refactor vì Mai tier M2 = 5%). Anh Phú quyết chuyển sang chat mới với model khác để xử lý tiếp.

### 7 P1 còn nợ (CHẶN UAT, sau P0)
M-2 đến M-8 trong POST-DEV-AUDIT-REPORT.md. M-1 đã RESOLVED (iHOS naming).

### Blocker bên ngoài
- Vendor iHOS chưa contact (4 câu webhook chờ trả lời)
- Zalo OA chưa đăng ký (5-7 ngày duyệt)
- Baseline NP chưa đo (mất bao lâu / sai mấy lần)
- CEO khách hàng chưa duyệt: %HH thật, ngưỡng lên hạng, quy tắc phạt cơ bản, recall days 5-7 dịch vụ chính, Zalo OA, 3 giả định vận hành

---

## 6. Vấn đề chính đang xử lý

**Vấn đề 1 (chưa làm)**: TC bị treat giống Sale, thiếu tính năng dispatch/assign/shift handover. Defer sau khi xong STABILIZE.

**Vấn đề 2 (đã revert)**: Edit Order. Đã thử Mức A (section-level edit) → revert vì còn 3 BUG data integrity:
- BUG 1: User.currentRevenue không sync khi totalPrice đổi (Dashboard + Ranking sai số)
- BUG 2: CommissionRecord không sync (Income screen có thể hiển thị HH cũ)
- BUG 3: Customer record không sync khi order.phone đổi (matchedCustomer link break)

Sau khi xong STABILIZE và 3 P0 fix, sẽ quay lại Edit Order với Phương án 1 (Mức B UX inline + fix BUG 1).

---

## 7. File quan trọng để Claude mới đọc

Theo thứ tự ưu tiên (mở khi cần):

1. **`audit-docs/VISUAL-OVERVIEW.html`** - 6 visual tổng quan hệ thống. Mở đầu tiên để hiểu app.
2. **`audit-docs/FLOW-DETAIL.html`** - 8 flow nghiệp vụ chi tiết.
3. **`audit-docs/PHAN-LOAI-TINH-NANG.html`** - bảng phân loại v1 / v1.5 / Tương lai (thay cho "phase 2" mơ hồ).
4. **`audit-docs/POST-DEV-AUDIT-REPORT.md`** - chi tiết 3 P0 + 7 P1 + 5 P2 còn nợ.
5. **`audit-docs/PENDING-ITEMS.md`** - quyết định đã chốt + chờ chốt, history dự án.
6. **`audit-docs/B1-bien-ban-context.md`** - context gốc, entity dictionary, công thức HH.
7. **`audit-docs/B4-business-rules.md`** - 75 rules R-1 đến R-12 (đặc biệt R-9-1 permission matrix).
8. **`audit-docs/B2-2-bpmn-flowchart.md`** - state machines Order/CR/AdjustmentRequest.

Các file B2 đến B7, B5-1 đến B5-5, ADR-001 là tài liệu sâu, đọc khi cần đào sâu.

---

## 8. Quyết định đã chốt gần đây (chưa ghi vào tài liệu chính)

- Bỏ hẳn module "lead chưa gọi" khỏi app (NP quản lý lead ở Facebook/Zalo bên ngoài, NV tư vấn tay rồi lên đơn tay).
- Bỏ "đơn có dịch vụ bỏ qua" khỏi dashboard, để v1.5 làm màn báo cáo riêng.
- "Khách trễ 15 phút" giữ ở dashboard SALE + TC, bỏ khỏi KT/CEO, không cần chuyển sang notification.
- Fix badge chuông: bỏ override notifCount=pendingTasks.total, dùng số notification thật.
- Edit Order: revert toàn bộ, sẽ làm lại sau khi xong STABILIZE.

---

## 9. Việc tiếp theo (immediate next steps)

Theo plan tuần này:

**Anh Phú đang làm**:
1. Giao dev fix 3 P0 (prompt em đã viết)
2. Gửi mail vendor iHOS (4 câu webhook)
3. Đăng ký Zalo OA
4. Hẹn KT trưởng + TC phỏng vấn baseline

**Em (Claude) chuẩn bị**:
1. Mail template gửi vendor iHOS (anh Phú copy gửi)
2. Script phỏng vấn KT trưởng + TC
3. Agenda + Decision Memo họp CEO khách hàng
4. File `CHIEN-LUOC-DEN-DICH.html` - roadmap STOP-STABILIZE-SHIP có deadline cụ thể từng tuần (đợi anh Phú trả lời 6 câu để có info chính xác)

**6 câu chờ anh Phú trả lời** (để chốt deadline plan):
1. 3 P0 dev đã fix cái nào chưa?
2. Vendor iHOS đã có contact chưa?
3. Zalo OA cho NP đã có chưa?
4. Đã phỏng vấn Diễm/Hà chưa?
5. CEO khách hàng đã duyệt gì chưa?
6. Deadline cứng cho go-live (vd trước Tết, trong Q3, tự do)?

---

## 10. Kickoff prompt cho chat mới

Anh Phú paste đoạn này vào chat mới đầu tiên:

```
Tôi là Nguyễn Đức Phú, PM dự án NP Commission App (app hoa hồng cho Phòng khám Nguyên 
Phương). Đã làm việc với Claude nhiều tuần. Để tiết kiệm thời gian, hãy đọc file 
HANDOVER.md ở /Users/mac/Desktop/sales-commission-tracker-newui/audit-docs/HANDOVER.md 
để load toàn bộ context (dự án là gì, tình hình hiện tại, plan tiếp theo, convention 
ngôn từ, vai trò của bạn).

Sau khi đọc xong, xác nhận lại 3 điều cho tôi:
1. Trạng thái 3 P0 hiện tại
2. Khung chiến lược STOP-STABILIZE-SHIP đang ở giai đoạn nào
3. Việc tiếp theo bạn đề xuất tôi làm

Đừng tóm tắt dài, chỉ confirm gọn 3 điều trên. Sau đó đợi tôi chỉ đạo tiếp.
```

Note: Đường dẫn tuyệt đối ở trên là path thực tế trên máy anh Phú (Mac). Nếu Claude mới chạy ở environment khác, anh Phú điều chỉnh path.

---

## 11. Lưu ý cho Claude mới

- **Không lặp lại lỗi cũ**: đã nhiều lần em (Claude 4.7) viết tài liệu quá dài, dùng thuật ngữ BA, đề xuất feature "phase 2 mơ hồ", over-engineer cho NP scale 5 NV. Anh Phú đã pushback nhiều lần. Hãy đời thường, gọn, thực tế.
- **Edit Order**: ĐỪNG đụng lại bây giờ. Đã revert, đang để STABILIZE xong mới quay lại.
- **TC issue**: ĐỪNG mở bây giờ. Defer sau STABILIZE.
- **Convention "phase 2"**: KHÔNG dùng. Dùng v1 / v1.5 / Tương lai khi scale (xem PHAN-LOAI-TINH-NANG.html).
- **Khi anh Phú hỏi cái gì cụ thể**, đọc code thật (không đoán), trả lời thẳng, không lan man.
- **Khi viết prompt cho Claude Code**, phải có guard rõ ràng + scope đóng + lưu ý không làm hỏng + thứ tự test sau sửa.

---

Hết handover. Mọi câu hỏi context khác, đọc file trong /audit-docs/.
