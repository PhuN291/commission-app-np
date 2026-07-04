# PENDING ITEMS - APP HOA HỒNG NP CLINIC

Last updated: 2026-04-25
Mục đích: Aggregate mọi blocker, assumption, item chờ chốt ở 1 chỗ. Mỗi lần update file audit, sync về đây.

Convention:
- `[CHỜ ISOFT]`: cần info từ iHOS team (webhook payload, API spec)
- `[CHỜ ANH CHỐT]`: cần CEO Nguyên quyết định
- `[GIẢ ĐỊNH]`: assumption tạm thời để move forward, sẽ verify sau

---

## A. CHỜ ISOFT (integration contract)

### I-1: Webhook order.exam_finished payload

Cần xác nhận với iHOS team:
- Có gửi event `order.exam_finished` không? URL endpoint config ở đâu?
- Payload có items array với mỗi item chứa:
  - `service_id`
  - `amount` (giá bán)
  - `cost` (giá vốn)
  - `performed_by_user_id` (người thực hiện)
  - `role` (BS/ĐD/KTV)
- Có order metadata: `order_id`, `customer_id`, `total_amount`, `out_of_pocket_amount`, `insurance_amount`, `voucher_amount`?

Mitigation tạm: [GIẢ ĐỊNH] payload đầy đủ. Nếu thiếu `performed_by_user_id`, build manual UI fallback (~3-4 ngày dev thêm).

Severity: HIGH. Block estimate B6.

### I-2: Webhook order.refunded chi tiết refund

Liên quan B1 G9. Cần xác nhận:
- Refund webhook gửi `item_id` + `amount` per item?
- Hay chỉ gửi `amount` tổng?

Mitigation tạm: [GIẢ ĐỊNH] gửi per item. Nếu chỉ tổng, NV/kế toán phải gán manual về item nào.

### I-3: API doc đầy đủ iHOS (B1 G4)

B1 risk số 1. Cần document:
- Authentication mechanism (API key, signature, OAuth)
- Webhook security (signature verify, retry policy, dead letter)
- Rate limit
- Endpoint API backup nếu webhook fail
- Sample payload mỗi event

Severity: HIGH. Blocker trước B6 plan triển khai.

### I-4: Webhook events list confirm

B1 list 6 events cần:
- `order.checkin`
- `order.exam_started`
- `order.completed` (alias `order.exam_finished`?)
- `order.refunded` (full/partial với item_id)
- `order.cancelled`
- `order.adjusted` (thêm/xoá OrderItem)

Cần iHOS xác nhận events nào support, payload structure mỗi event.

### Template message gửi iHOS

```
Chào team iHOS,

Bên 1PDM Agency đang triển khai App Hoa Hồng cho NP Clinic, integrate
với iHOS. Cần xác nhận một số kỹ thuật:

1. Webhook events nào hiện support: order.checkin, order.exam_started,
   order.completed, order.refunded, order.cancelled, order.adjusted?

2. Mỗi event payload có gửi:
   - order_id, customer_id, total_amount, out_of_pocket_amount?
   - items array với mỗi item có service_id, amount, cost,
     performed_by_user_id, role?
   - timestamp?

3. Có document/sample payload không?

4. Authentication mechanism (API key, signature)?

5. Webhook retry policy (số lần retry, dead letter queue)?

6. API endpoint query order detail nếu webhook fail?

Cảm ơn team.
```

---

## B. CHỜ ANH CHỐT

### ~~B-1: VĐ-4 SQ-1 Edit window~~ ĐÃ CHỐT 25/04/2026

**30 ngày** sau payday. Sửa adjustment đã apply lương → clawback kì sau (không sửa retroactive).

### ~~B-2: VĐ-4 SQ-2 Limit amount~~ ĐÃ CHỐT 25/04/2026

**Không limit amount**. Mọi adjustment đều phải qua workflow tạo + duyệt.

### ~~B-3: VĐ-4 SQ-3 Auto rule engine~~ ĐÃ CHỐT (1 phần) 25/04/2026

**Thưởng đạt target tháng**: OK MVP. Parameters trong Settings: `target_pct`, `bonus_pct`.

**Phạt**: defer phase riêng, xem B-12 mới.

### ~~B-4: VĐ-4 SQ-4 Visibility~~ ĐÃ CHỐT 25/04/2026

**Có, transparent**. NV thấy dòng "Điều chỉnh +/-X VND" + lý do + người tạo + ngày trên màn HH cá nhân.

### ~~B-5: VĐ-4 KT trưởng~~ ĐÃ CHỐT 25/04/2026

**Diễm** = KT thường + KT trưởng (Case A: 1 người làm cả 2 vai). Persona P4 giữ nguyên.

Workflow chốt:
- KT trưởng (Diễm) tạo adjustment trong app
- CEO duyệt
- TC trao đổi với Diễm ngoài app, không tạo trực tiếp
- Auto rule fire → vào queue CEO duyệt batch

### B-13 (mới 25/04/2026): Recall days per service type

Defer từ Q5 system-design audit. Anh chưa biết hết list dịch vụ và số ngày recall hợp lý.

Cần list cho mỗi dịch vụ:
- Khám tổng quát: ? ngày (thường 365)
- Thủ thuật phụ khoa: ? ngày (thường 30)
- Test thai: ? ngày (thường 14)
- Xét nghiệm máu: ? ngày
- Siêu âm: ? ngày
- ... (anh list theo service catalog NP)

Default tạm: NULL (không recall) cho tất cả dịch vụ chưa biết. Anh fill dần theo loại dịch vụ. Schema đã sẵn `Service.recommended_recall_days`, không cần dev thêm.

Verify khi nào: trước khi bật module Customer Follow-up trong production.

### B-14 (mới 25/04/2026): Zalo OA setup status

Anh đã có Zalo OA cho NP Clinic chưa? Nếu chưa:
- Đăng kí Zalo OA Verified (cost: free, cần CMND CEO + giấy phép NP)
- Thiết lập template tin nhắn (cần Zalo approve template trước khi gửi)
- Cost integration với app: 2-3 ngày dev (Zalo OA SDK)

Nếu đã có: confirm OA ID + template ID hiện có để App HH integrate.

Severity: MEDIUM. Block module Reminder + Post-Exam Follow-up nếu không có Zalo OA.

### ~~B-16: Findings từ B2.3~~ RESOLVED 28/04/2026

- **F-1 RESOLVED**: Formula B1 vòng 9 chuẩn. REVERT chốt vòng 10 VĐ-8 Option A. Voucher trừ khỏi base HH như mọi chi phí.
- **F-2 RESOLVED**: Recompute mọi role khi refund 1 phần.
- **F-3 RESOLVED**: Theo formula F-1. Đơn có BH+voucher: net_profit có thể âm → HH = 0.
- **F-9 REMOVED**: False dichotomy. Per-doctor model: row BS thêm khi exam_started, không xoá dù item skipped.
- **F-10 NEW RESOLVED**: KT và CEO không có HH per đơn. OrderRoleAssignment chỉ populate Sale + TC + BS.
- **F-5, F-6, F-8 defer**: policy/UI detail, không block dev.

Action items đã làm:
- B1 update Section 3.3 (bỏ KT/CEO row), Section 3.7 (recalc ví dụ), Section 4 (revert voucher Option A), Section 24 (red flag #9 + #10), Section 25 (vòng 13)
- B2.2 update Section 1.3 narrative + Mermaid + BPMN flow (populate 2 row tại CONFIRMED)
- B2.3 update Section 0 setup, Section 0.2 formula, recalc 8 scenarios, fix Scenario 13 BS row per-doctor

### B-15 (mới 25/04/2026): Reminder cron infrastructure

Cron mỗi 5 phút check NotificationLog → trigger send.

Anh OK option này không, hay cần realtime queue (BullMQ/Redis)?

Đề xuất: cron 5 phút đủ cho NP scale 100 đơn/ngày. Realtime queue overkill. Verify scale sau 6 tháng.

### B-12: Phần phạt rule chi tiết

Defer từ SQ-3 phạt. Cần discuss riêng vì có nhiều case:
- Đi muộn (định nghĩa "muộn", grace period, phạt cố định hay % lương)
- Complaint khách (level nhẹ/vừa/nặng, ai assess level)
- Vi phạm SOP (loại vi phạm, mức phạt)
- Tư vấn sai gói (xác định "sai" như thế nào)
- Làm hỏng dụng cụ (mức phạt theo giá trị, ai assess)
- Mất data khách (phạt + retraining)
- Khác

Discuss khi nào: anh chỉ định timing (ngay sau B2.2, hoặc phase 2).

### B-6: B1 G1 ranking thresholds

Công thức lên hạng và ngưỡng cụ thể. Cần trước B5 spec screen 06 (Xếp hạng).

### B-7: B1 G2 onboarding tour

Onboarding có quick tour không. Cần trước B5 spec screen 21.

### B-8: B1 G5 số lượng trưởng ca tương lai

Hiện 1 TC (Hà). Dự kiến tương lai mở thêm ca? Theo dõi scale.

### B-9: B1 G6 combo/liệu trình dịch vụ

B1 phase 2. Khi nào kích hoạt?

### B-10: NP có nghỉ ngày nào trong tuần không?

Để xác định có cần day-of-week scheduling không (architecture J ready support nếu cần).

### B-11: TC Hà có lịch nghỉ định kì không?

Để xác định cần multi-shift hay không.

---

## C. ASSUMPTION HIỆN TẠI (giả định để move forward)

| Mã | Assumption | Verify khi nào |
|---|---|---|
| GĐ-1 | iHOS webhook đầy đủ payload (có performed_by_user_id) | Khi anh nói chuyện với iHOS (I-1) |
| GĐ-2 | 1 OrderItem 1 user 1 role (no multi-attribution) | Verify sau 6 tháng vận hành |
| GĐ-3 | NP không có HR system bên ngoài | Confirm với anh |
| GĐ-4 | NP mở 7 ngày/tuần (no day-of-week) | B-10 |
| GĐ-5 | TC Hà không có lịch nghỉ định kì | B-11 |
| GĐ-6 | %HH role: Sale 3%, ĐD 1%, TC 2%, BS 5% | Cần con số thật từ anh |
| GĐ-7 | Peak 9-11h và 14-17h | Confirmed |
| GĐ-8 | Tạo đơn nguồn ở iHOS, app HH chỉ nhận webhook | Verify với iHOS API |
| GĐ-9 | App có screen Lead/Hẹn cho ĐD-Sale | Verify trong B3 audit |
| GĐ-10 | Số bác sĩ cơ hữu 2-3, part-time vài người | Con số thật |

---

## D. NEXT ACTIONS

Theo thứ tự ưu tiên:

1. **Anh send iHOS team câu hỏi I-1, I-2, I-3, I-4** (template ở section A) - làm offline khi có thời gian
2. ~~Anh trả lời B-1 đến B-5~~ ĐÃ XONG 25/04/2026
3. **Tôi move sang B2.2 BPMN flow** ngay (Group A đã đóng 10/10)
4. **B-12 phần phạt** discuss khi anh chỉ định timing
5. **Anh confirm B-10, B-11** (shift assumption) khi tiện
6. **B-6 đến B-9** defer phase sau

---

## E. LỊCH SỬ UPDATE

| Date | Update |
|---|---|
| 2026-04-25 v1 | Tạo file. Aggregate từ B1, B2, ADR-001. ADR-002 đã xoá vì over-scope. |
| 2026-04-25 v2 | Đóng VĐ-4: B-1 đến B-5 chốt. Workflow: Diễm tạo, CEO duyệt. Edit 30 ngày + clawback. Transparent NV. Auto Reward target tháng MVP. Thêm B-12 phần phạt defer. |
| 2026-04-25 v3 | System-design audit Order lifecycle + customer engagement: chốt 5 quyết định (gộp state, reminder phương án 1, OrderItem.status, Module Customer Follow-up, recall days defer). Thêm B-13 recall days per service, B-14 Zalo OA setup, B-15 cron infrastructure. |
| 2026-04-28 v4 | Tạo B2.3 với 13 scenarios + 1 section technical edge cases. Surface 9 findings: F-1 (HIGH formula conflict), F-2/F-3/F-5/F-6 (MEDIUM), F-4/F-7/F-9 (LOW). Thêm B-16 aggregate findings. |
| 2026-04-28 v5 | Resolve F-1/F-2/F-3 + REMOVE F-9 + NEW F-10 KT/CEO không HH. Batch update B1 + B2.2 + B2.3. B-16 RESOLVED. |
| 2026-04-28 v6 | Tạo B2.4 kì lương ngày 5. Timeline pre-payday + payday + post-payday. Edge cases. Pay slip content example. 6 open questions Q-2.4-A đến F (đa số defer B5). |
| 2026-04-28 v7 | Tạo B3 screen audit. 25 tsx files audited. 24 findings (5 HIGH critical: F-3-7/13/16/19/24, 7 MEDIUM, 12 LOW). 12 missing screens identify (8 HIGH priority). 3 redundant. Đề xuất rewrite B1 section 22 thành ~25-30 entities. |
| 2026-04-28 v8 | Update B3 với disclaimer source of truth (B1+B2 trump implementation). Chốt F-3-12 (giữ riêng performance), F-3-22 (defer ai-chat phase 2), F-3-23 (remove np-playground khỏi app + tạo component reference riêng B5 phase). |
| 2026-04-28 v9 | Tạo B4 business rules. ~75 rules trong 12 sections (HH calc, state transitions, role assignment, ranking, cap, adjustment, auto rule, reminder, permission, retention, pay cycle, edge cases). Quick reference index. |
| 2026-05-01 v10 | Pre-B5 fixes: (1) Chốt ĐD-Sale = 1 role duy nhất (không tách ĐD ra row riêng). Sửa B2.1 P1 persona + Lan timeline 15h30. Sửa B2.3 nhân vật table. (2) Reframe R-5-2 cap warning intent: awareness signal, không cut HH retroactive. |
| 2026-05-01 v11 | Pre-B5 permission update (vòng 14): thêm cột "Xem ranking" trong matrix. NV/BS chỉ thấy ranking của mình, không leaderboard. BS xem KH qua iHOS. TC giữ "toàn PK". Update B1 section 7, B4 R-9-1. Add F-3-25 (rework ranking.tsx conditional render). |
| 2026-05-01 v12 | Tạo B5 Batch 1 spec 4 missing screens HIGH priority: MS-2 Onboarding, MS-9 Tạo Adjustment KT, MS-10 Duyệt Adjustment CEO, MS-12 Export Excel. 7 open questions Q-MS2-C, Q-MS9-A/B, Q-MS10-A, Q-MS12-A/B/C cần anh chốt trước dev. |
| 2026-05-01 v13 | Resolve B5 Batch 1 questions. Replace Linh → Diễm toàn bộ 9 file docs. MS-9 bỏ dropdown reason, add preview. MS-12 không quản lý lương cứng, không gửi pay slip (KT tự lo), file Excel generic. Batch 1 ready. Cost dev estimate giảm 12-16 → 9-12 ngày. |
| 2026-05-01 v14 | Tạo B5 Batch 2 spec 3 screen rewrite/rework: S-Login (SĐT + OTP Zalo + device binding), S-Admin-Staff (offboarding flow + ihos mapping), S-Admin-Settings (10 sections major rework). Cost dev 20-28 ngày. 7 open questions Q-Login/Staff/Settings cần resolve. |
| 2026-05-01 v15 | Chốt Q-Login-B: Bỏ 2nd factor switch device. Chỉ OTP + notify CEO/TC. Đơn giản, free, đủ secure cho NP scale. Update B1 section 10 + B5.2 sau khi xong Batch 3. |
| 2026-05-01 v16 | Tạo B5 Batch 3: Update S-Income (add adjustment + clawback + khiếu nại), S-Order-Detail (CTA + status mark + refund display), S-Admin-Commission-Approval (tab Khiếu nại + Export integration). Quick note S-Orders filter update. Cost dev 16-22 ngày. 6 questions LOW defer. |
| 2026-05-01 v17 | Tạo B5 Batch 4: MS-5 Cấu hình Shift (architecture J), MS-6 Cấu hình Auto Rule (MVP target tháng), MS-7 Customer Follow-up Dashboard, S-Ranking conditional render NV/BS personal vs TC/KT/CEO leaderboard. 7 questions (1 HIGH Q-Auto-A bonus formula). Cost dev 17-24 ngày. |
| 2026-05-01 v18 | PDF anh Nguyên review: defer toàn bộ PDF features sang Phase 2. Foundation B1-B5 hiện tại đủ cho NP scale 5 NV. |
| 2026-05-01 v19 | Resolve 17 aggregated questions: A-1 bonus HH gốc, A-2 giữ M0-M3 placeholder, A-3 recall chỉ từ iHOS, A-4 iHOS chưa contact (action item), A-5 Zalo OA chưa setup (action item), B-1 TC không add NV, B-2 Zalo template fix theo rule Zalo, B-3 permission role-based phase 2 Sapo-style, B-4 bulk-all với safety, B-5 phần phạt defer phase 2, C-1.1 NV không thấy AUTO_PENDING, C-1.2 OK xem tháng cũ, C-1.3 OK BS edit reason, C-1.4 NV không thấy %cap, C-2 OK Diễm realtime total, C-3.1 OK advanced hidden, C-3.2 OK archive only. Còn C-4, C-5, C-6, C-7, D defer chat tiếp. |
| 2026-05-01 v20 | Tạo B5 Batch 5 cleanup: MS-1 Tạo đơn thành công, MS-3 Thông báo, MS-4 Bàn giao, MS-8 Notification Log audit, MS-11 Pay slip preview NV. Note tách Component Reference Doc cho dev. 4 questions LOW. Cost dev 12-18 ngày. **B5 HOÀN TẤT 5/5 batches**. Sẵn sàng B6. |
| 2026-05-05 v21 | **AUDIT HOÀN TẤT 9/9 PHASE**. Tạo B6 Implementation Plan. Cost 179-255 ngày dev. Timeline 6 tháng (2 devs parallel). 5 HIGH risks. 6 milestones. 9 action items cho anh Phú. MoSCoW scope: MVP (Must + Should), defer Phase 2 (Could + Won't). 3 critical blockers: iHOS contract, Zalo OA setup, dev team confirm. |
| 2026-05-06 v22 | **POST-DEV AUDIT** sau 13 tasks rework. 3 P0 critical (OrderRoleAssignment missing, DEV_OVERRIDE_OTP risk, missing POST commission-tiers) + 8 P1 major + 5 P2 minor. Spec compliance 92%. Cost fixes ~5-7 ngày. Output: POST-DEV-AUDIT-REPORT.md. |
| 2026-05-06 v23 | **iHOS naming clarify**: anh Phú confirm tên hệ thống chính thức là "iHOS" (không phải "Isoft"). Bulk rename audit-docs Isoft → iHOS. Code đang đúng, không cần fix. M-1 finding trong POST-DEV-AUDIT marked RESOLVED. |
| 2026-05-06 v24 | **B7 BUSINESS EFFECTIVENESS AUDIT** complete. 27 user stories, 10 acceptance criteria, 10 business edge cases, 5 DFD, 20+ metrics, 4 validation methods. Spec compliance vs business requirements ~85%. Output: B7-business-effectiveness-audit.md. |
