# BIÊN BẢN CONTEXT B1 - APP HOA HỒNG NP CLINIC (FINAL)

Trạng thái: **FINAL** (chốt 24/04/2026 sau 9 vòng, update 25/04/2026 sau B2.1 audit Group A).

Sau khi chốt B1, bước kế tiếp là B2: Dựng kịch bản vận hành thực tế.

Convention các tag dùng trong file:
- `[CHỜ ISOFT]`: cần info từ iHOS team, xem `PENDING-ITEMS.md` section A
- `[CHỜ ANH CHỐT]`: cần CEO Nguyên quyết định, xem `PENDING-ITEMS.md` section B
- `[GIẢ ĐỊNH]`: assumption tạm thời, xem `PENDING-ITEMS.md` section C

---

## 1. Scope audit

Audit App Hoa Hồng dành cho nội bộ NP Clinic. Website, iHOS, Webapp trả KQ bệnh án out of scope (chỉ liệt kê interface giao tiếp, không deep dive).

---

## 2. Business model

1 phòng khám duy nhất, không có chi nhánh.

Người dùng app HH gồm 5 role hiện có: Điều dưỡng (kiêm sale), Bác sĩ, Trưởng ca, Kế toán, CEO. Kiến trúc phải mở để CEO thêm role mới không cần dev.

Bệnh nhân không dùng app này. Bệnh nhân tương tác với website (đặt lịch) và webapp KQ bệnh án.

---

## 3. Công thức HH (FINAL)

### 3.1 Biến gốc

```
total_listed     = Σ (OrderItem.price_listed × quantity)
                 = tổng giá niêm yết dịch vụ
insurance_amount = phần BH sẽ thanh toán
voucher_amount   = phần voucher giảm
total_paid       = total_listed - insurance_amount - voucher_amount
                 = số tiền KH thực trả (OOP)
total_cost       = Σ (OrderItem.cost × quantity, loại trừ item bị refund)
net_profit       = total_paid - total_cost
                 = (giá bán - tiền bảo hiểm - voucher) - giá cost
```

Ghi chú: BH thanh toán chậm 3-4 tháng nên không tính vào net_profit. PK vẫn ghi nhận doanh thu khi BH trả sau nhưng không phát sinh HH bổ sung.

### 3.2 Công thức thống nhất (mọi role)

```
Với mỗi row ACTIVE trong OrderRoleAssignment của đơn:
  HH = net_profit × %HH(role, ranking_user_snapshot)
  
  Với role = role_id của row,
       ranking_user_snapshot = ranking của user tại thời điểm tạo CommissionRecord

Tổng chi HH 1 đơn = Σ tất cả HH từ các row active
```

Không phân biệt role. Mọi role dùng chung công thức.

### 3.3 Rule điền OrderRoleAssignment

| Role | Khi thêm row | Số row active cùng lúc | Đổi theo shift không? |
|---|---|---|---|
| Sale | Khi đơn tạo. user_id = người tạo đơn hoặc người được trưởng ca assign | Tối đa 1 | Không (assignee đóng băng sau xác nhận) |
| Trưởng ca | Khi đơn tạo. user_id = lookup từ `ShiftHeadAssignment` active của shift match thời điểm `order.created_at`. Nếu shift không có TC active (NULL): không tạo row TC | Tối đa 1 | **Không**. Ca sau muốn hỗ trợ thì tự chủ động, không ăn HH đơn cũ |
| Bác sĩ | Khi iHOS webhook `order.exam_started` kèm doctor_id. Mỗi doctor 1 row (per-doctor, không phụ thuộc số dịch vụ doctor làm). Row ĐÃ ADD thì giữ, item skipped sau đó không xoá row | 0 đến N (nhiều bác sĩ thực hiện các dịch vụ khác nhau) | Không |

**Lưu ý vòng 13 (28/04/2026)**: KT trưởng (Diễm) và CEO (Nguyên) **KHÔNG** có HH theo đơn. Lương Diễm là cứng, CEO ăn lợi nhuận. OrderRoleAssignment KHÔNG populate row cho 2 role này. Adjustment manual vẫn áp dụng được cho Diễm/Nguyên (vd CEO tự thưởng cuối năm), tách biệt với HH theo đơn.

### 3.4 Role không có user_ID tham gia = không chi HH

Ví dụ đơn bán sản phẩm không qua bác sĩ: không có row bác sĩ trong OrderRoleAssignment → không sinh HH bác sĩ. Đơn đó tổng chi HH thấp hơn. Chấp nhận, không gán virtual user.

### 3.5 Handover (NV nghỉ việc hoặc force handover)

- Mark row cũ `ended_at = now()`
- Thêm row mới cho người nhận với `assigned_at = now()`, `ended_at = NULL`
- Khi tính HH chỉ dùng row có `ended_at IS NULL` (hoặc `ended_at > now()`) tại thời điểm snapshot

### 3.6 Trần HH (App không enforce)

**Chốt B2.1 (VĐ-5)**: App **không** enforce cap. CEO tự tính cap 10% (đổi từ 15% bản FINAL cũ) ngoài Excel khi review trước khi gửi kế toán chốt lương.

App vẫn hiển thị icon cảnh báo khi đơn có tổng HH chi / net_profit > 10%, nhưng chỉ là visual cue, không auto cap, không block duyệt.

Nguyên nhân vượt trần thường gặp: đơn có 2+ bác sĩ (mỗi bác sĩ ăn full %HH).

Settings: `expected_total_pct_per_order` default 10% (hiển thị warning, không enforce).

### 3.7 Ví dụ minh hoạ

Đơn 100k (dịch vụ A 60k/cost 30k + dịch vụ B 40k/cost 20k), BH 20k, voucher 0, KH trả 80k.

Setting %HH (bạc): sale 5%, trưởng ca 2%, bác sĩ 3%. KT và CEO không có HH.

Đơn có 2 bác sĩ: BS A làm dịch vụ A, BS B làm dịch vụ B.

```
total_paid = 100k - 20k - 0 = 80k
total_cost = 30k + 20k = 50k
net_profit = 80k - 50k = 30k

OrderRoleAssignment active:
  (sale, NV X)       -> HH = 30k × 5% = 1.500đ
  (trưởng ca, NV Y)  -> HH = 30k × 2% = 600đ
  (bác sĩ, BS A)     -> HH = 30k × 3% = 900đ
  (bác sĩ, BS B)     -> HH = 30k × 3% = 900đ

Tổng chi HH đơn = 3.900đ = 13% net_profit
13% > 10% trần → system hiển thị cảnh báo, CEO tự review ngoài Excel.
```

---

## 4. Xử lý edge case tính HH

### Đơn có BH (chốt VĐ-9 Option B: Out-of-Pocket Only)

- HH tính trên `total_paid` = phần khách trả ra túi (out-of-pocket), KHÔNG tính phần BH chi trả
- "Out-of-pocket" là số tiền khách trả thực tế (có thể tiền mặt, chuyển khoản, cà thẻ - không phụ thuộc phương thức)
- BH thanh toán sau 3-4 tháng, PK ghi nhận doanh thu nhưng không phát sinh HH thêm

Ví dụ: đơn 1.000.000đ, BH chi trả 700.000đ, khách trả 300.000đ.
- Base tính HH: 300.000đ (chỉ phần out-of-pocket)
- HH = (300.000đ - cost share của 300.000đ) × %HH

Lý do chốt Option B (thay vì A "full" hoặc C "separate %"):
- BH thanh toán chậm 3-4 tháng, NP rủi ro cashflow nếu trả HH ngay
- BH có thể bị reject (BHYT từ chối thanh toán), khó claw back HH đã trả
- Out-of-pocket = tiền chắc chắn về NP, an toàn để chia HH

### Đơn có voucher (chốt vòng 13 28/04/2026: voucher trừ khỏi base HH)

- Voucher giảm trực tiếp `total_paid` (tất cả loại voucher)
- Voucher trừ khỏi base HH (formula B1 vòng 9 chuẩn): `net_profit = total_paid - total_cost = (total_listed - BH - voucher) - cost`
- HH = `net_profit × %HH`. Voucher giảm net_profit → HH giảm tương ứng
- Người tạo voucher: Trưởng ca (và CEO)

Ví dụ: đơn niêm yết 1.000.000đ, voucher 100k, khách trả 900.000đ. Cost 400k.
- total_paid = 900k
- net_profit = 900k - 400k = 500k
- HH Sale (3%) = 15k

Lưu ý vòng 13: trước đó (vòng 10) chốt VĐ-8 Option A (HH trên giá niêm yết, voucher không trừ). Vòng 13 REVERT: voucher trừ như mọi chi phí. Đơn giản, consistent với BH.

Edge case đơn có cả BH và voucher: cả 2 đều trừ. Vd đơn 1tr, BH 700k, voucher 100k → total_paid = 200k. net_profit = 200k - cost. Có thể âm nếu cost cao → HH = max(net_profit, 0) × %HH = 0.

### Đơn huỷ trước khám
- Huỷ trước xác nhận: chưa có HH
- Huỷ sau xác nhận: HH tạm tính cancel, CommissionRecord.status = cancelled

### KH no-show
- NV đánh dấu "No-show" trong app
- Xử lý giống huỷ đơn

### Refund sau khám (toàn phần)
- iHOS sync refund, total_paid giảm về 0, net_profit = âm hoặc 0
- HH đang chờ duyệt: chuyển sang cancel
- HH đã duyệt: tạo CommissionRecord âm để clawback vào kì lương kế tiếp

### Refund 1 phần (1 trong N dịch vụ)
- iHOS gửi refunded_item_id + refund_amount
- Item bị refund: refunded = true, cost tương ứng cũng trừ khỏi total_cost
- Recompute total_paid, total_cost, net_profit, HH tất cả row active
- Clawback = HH_cũ - HH_mới

Lưu ý G9: Cần xác nhận với vendor iHOS việc webhook refund có gửi chi tiết theo item không. Nếu chỉ gửi amount tổng thì NV/kế toán phải gán về item nào.

### Dịch vụ phát sinh sau khám
- iHOS tạo OrderItem mới trong cùng đơn
- total_paid, total_cost, net_profit tự cập nhật
- Nếu có bác sĩ mới thực hiện dịch vụ phát sinh: iHOS sync kèm doctor_id, add row mới vào OrderRoleAssignment
- Recompute HH tất cả row active

### Không giảm giá tay
Không role nào có quyền giảm giá trên đơn. Muốn giảm giá phải qua voucher (trưởng ca hoặc CEO tạo).

---

## 5. 3 stage HH + reject flow

### Stage chính

| Stage | Trigger | Ghi chú |
|---|---|---|
| Tạm tính | NV bấm "Đã xác nhận" đơn | One-way, bấm xong không quay lại |
| Chờ duyệt | iHOS sync "hoàn thành khám" | Sync realtime, refund/điều chỉnh update ngược |
| Được duyệt | Kế toán duyệt trên app | Vào lương |

### Stage phụ

| State | Trigger |
|---|---|
| Từ chối | Kế toán reject + lý do |
| Khiếu nại | NV khiếu nại trong 3 ngày sau bị reject |
| Cancel | Đơn huỷ trước khám hoặc refund toàn phần |

### Reject rule
- Kế toán có thể reject khi đơn ở "chờ duyệt"
- NV khiếu nại trong 3 ngày, đính kèm ghi chú
- Kế toán review khiếu nại: giữ reject hoặc revert về "chờ duyệt" rồi duyệt
- Chốt vĩnh viễn: sau kì lương kế tiếp (không thể revert nữa)

### Kì lương
- Deadline kế toán duyệt: ngày 5 hàng tháng (có Settings chỉnh được)
- Đơn thuộc kì nào: theo **ngày tạo đơn**
- Không có backup approver khi kế toán vắng (Option A chốt cho gọn, chấp nhận delay lương khi kế toán nghỉ dài)

### Điều chỉnh HH thủ công (chốt VĐ-4 25/04/2026)

Workflow đơn nguồn:
- **KT trưởng (Diễm) tạo** adjustment trong app: loại (thưởng/phạt), lý do, số tiền, beneficiary user, kì lương áp dụng
- **CEO duyệt** request → adjustment có hiệu lực, vào pay slip kì áp dụng
- **CEO reject** → adjustment huỷ
- TC không tạo trực tiếp trong app. TC trao đổi với Diễm ngoài app (Zalo/nói tay), Diễm nhập vào app.

Auto Reward/Penalty rule (separate engine):
- Rule fire tự động (vd: thưởng đạt target tháng)
- Tạo adjustment pending vào queue CEO
- CEO duyệt batch (bulk approve hoặc per-record)
- Không qua tay Diễm

Edit window và clawback:
- KT trưởng có thể edit/xoá adjustment trong **30 ngày sau payday** (kể cả đã apply lương)
- Sau 30 ngày: lock cứng, không sửa được
- Khi sửa adjustment đã apply lương: tạo `CommissionRecord` clawback delta ở kì lương kế tiếp (`source_type = adjustment_clawback`, `clawback_parent_id` link về adjustment cũ). Pay slip kì sau hiển thị dòng "Điều chỉnh kì trước"
- Adjustment cũ (đã apply) giữ nguyên trong history, không sửa retroactive

Audit và visibility:
- Log đầy đủ cả request và approve/reject/edit vào AuditLog
- Hiển thị **transparent** trên màn HH của NV: dòng "Điều chỉnh +/-X VND" + lý do + người tạo + ngày
- Không giới hạn amount per adjustment, nhưng MỌI adjustment đều phải qua workflow tạo + duyệt
- Alert CEO nếu > 3 adjustment/NV/tháng (cảnh báo abuse, không block)

Phần phạt (deferred):
- Rule phạt cụ thể (đi muộn, complaint, vi phạm SOP, tư vấn sai gói, etc.) sẽ discuss ở phase riêng (xem PENDING-ITEMS.md B-12)
- MVP chỉ implement framework Auto rule engine, không hardcode rule phạt cụ thể

---

## 6. Ranking

- CEO tự tạo bậc, đặt tên, set %HH trong Settings
- Không hardcode đồng/bạc/vàng
- Reset cứng mỗi quý
- Không áp ngược HH của quý trước khi đổi hạng

[Giả định G1, verify sau]: Công thức lên hạng và ngưỡng cụ thể (khách NP chưa chốt).

---

## 7. Permission matrix

| Role | Xem đơn | Xem KH | Xem HH | Xem ranking | Duyệt HH | Xuất Excel | Assign | Tạo voucher | Setting %HH | Approve adjustment |
|---|---|---|---|---|---|---|---|---|---|---|
| Sale/Điều dưỡng | của mình | của mình | của mình | **chỉ của mình** | Không | Không | Không | Không | Không | Không |
| Bác sĩ | của BS đó | Không (qua iHOS) | của mình | **chỉ của mình** | Không | Không | Không | Không | Không | Không |
| Trưởng ca | toàn PK | toàn PK | toàn PK | toàn PK | Không | Không | Có | Có | Chỉ xem | Không |
| Kế toán | toàn PK | toàn PK | toàn PK | toàn PK | Có | Có | Không | Không | Không | Không (tạo request) |
| CEO | toàn PK | toàn PK | toàn PK | toàn PK | Không | Có | Không | Có | Có | Có |

Kiến trúc role mở: CEO thêm role mới với permission tuỳ chọn trong Settings.

---

## 8. Luồng đơn

### Nguồn tạo đơn
- **Website:** KH tự đặt, trưởng ca nhận notification, assign cho sale. Nếu chưa assign kịp, có tab "đơn chưa assign" để xử lý sau. Không có timeout.
- **NV tư vấn (Zalo/FB/hotline):** NV tự tạo đơn, auto là assignee sale.
- **Trưởng ca tạo đơn hộ:** có thể chọn assignee khác.
- **KH cũ quay lại:** NV chăm quay lại tạo đơn = NV đó là assignee. KH tự quay lại website = trưởng ca assign. KH tự quay lại qua chat = người trực tiếp tư vấn assign.

### Trạng thái đơn (chốt v2 25/04/2026, simplified 9→8 states)

Trước khám (quản lý trong app HH):
- DRAFT (mới tạo) → CONFIRMED (đã xác nhận) → (CANCELLED | NO_SHOW)

Trong/sau khám (sync từ iHOS):
- CONFIRMED → IN_PROGRESS (gộp iHOS `order.checkin` + `order.exam_started`) → COMPLETED → (REFUND_FULL | REFUND_PARTIAL)

Lý do gộp CHECKED_IN + IN_EXAM thành IN_PROGRESS: App HH không cần granular giữa 2 sub-state vì cùng cho phép recompute HH khi BS thêm item phát sinh. iHOS vẫn track riêng 2 state, App HH chỉ dùng 1.

NO_SHOW auto-trigger: T+30p sau giờ hẹn nếu chưa checkin.

OrderItem có field `status` (planned/completed/skipped) để handle case khách bỏ về giữa khám:
- Item completed: tính HH bình thường
- Item skipped: không tính HH (`skipped_reason`: customer_left/insurance_rejected/other)

### Reassign
- Chỉ trước khi đơn được xác nhận
- Sau xác nhận: đóng băng assignee (trừ trường hợp handover khi NV nghỉ việc)

### Cấu trúc đơn
- 1 đơn có nhiều dịch vụ (OrderItem)
- Combo/liệu trình: [giả định G6, verify sau], chưa làm phase này

---

## 9. Automation nhắc tái khám

- Zalo OA gửi nút đặt lịch, dẫn về website, flow như đơn website (trưởng ca assign)
- KH chat lại Zalo, NV tư vấn rep, flow như đơn NV tạo
- Automation không hưởng HH riêng, HH luôn về assignee cuối cùng

---

## 10. Auth + Onboarding

### Auth
- Đăng nhập: SĐT + OTP qua Zalo OA, fallback SMS
- Device binding: 1 tài khoản 1 thiết bị
- Unbind self-service: SĐT + OTP lần 1 + xác nhận lần 2 (email/gọi thoại), unbind máy cũ, bind máy mới, notify CEO/trưởng ca chống gian lận
- Session: expire token, revocable

### Onboarding sau login
- Bắt buộc đặt mục tiêu HH tháng, không skip
- Hệ thống gợi ý default (110% tháng trước hoặc trung bình 3 tháng), NV có thể sửa
- Quick tour: [giả định G2, verify sau]

---

## 11. Integration iHOS

- Mode: realtime webhook 2 chiều
- [Giả định G4, verify sau]: API doc đầy đủ từ vendor. Anh có kênh liên hệ nhưng **chưa liên hệ được**. Điểm này là **risk số 1** của dự án.
- Mapping user: App HH user BẮT BUỘC có ihos_user_id khi tạo. Bác sĩ phải có tài khoản App HH trước khi khám.
- Mỗi bác sĩ chỉ có 1 tài khoản iHOS.

### Event webhook cần `[CHỜ ISOFT]` (xem PENDING-ITEMS.md I-1, I-2, I-3, I-4)
- `order.checkin`
- `order.exam_started` (kèm doctor_id để populate OrderRoleAssignment)
- `order.completed` (alias `order.exam_finished`)
- `order.refunded` (full/partial với item_id)
- `order.cancelled`
- `order.adjusted` (thêm/xoá OrderItem)

### Payload requirement minimum cho mỗi item trong đơn `[CHỜ ISOFT]`
```
{
  "order_id": "...",
  "items": [
    {
      "service_id": "...",
      "amount": ...,           // giá bán
      "cost": ...,             // giá vốn
      "performed_by_user_id": "...",  // người thực hiện
      "role": "BS" | "DD" | "KTV"
    }
  ]
}
```

Nếu iHOS không gửi `performed_by_user_id`, fallback: build manual UI cho TC/lễ tân gán role per item trước khi đơn close (ước tính +3-4 ngày dev).

### Webhook integrity
- Mọi webhook có event_id duy nhất, lưu idempotency key
- Dead letter queue cho webhook fail, alert CEO/dev
- Endpoint admin "replay webhook" cho case sự cố

---

## 12. Settings

Chỉ CEO edit. Trưởng ca chỉ xem.

Các section:
- Matrix %HH (role × ranking)
- Ranking (thêm bậc, đặt tên, set %)
- Role (thêm role, permission)
- User management (CRUD user, map ihos_user_id)
- **Shift management** (thêm/sửa/archive ca, gán TC theo phương án J: F + extension hooks)
- Voucher management
- Kì lương (ngày deadline, setting)
- Mục tiêu HH mặc định
- `expected_total_pct_per_order` (trần warning, default 10%, App không enforce)

Audit log: lưu mọi thay đổi, giữ 5 năm.

Hiệu lực: chỉ áp cho đơn tạo SAU thời điểm đổi. Đơn cũ giữ nguyên %HH snapshot tại thời điểm tạo CommissionRecord.

---

## 13. Thanh toán
Hoàn toàn trên iHOS. App HH không xử lý thanh toán, không có flow thẻ tín dụng/QR.

---

## 14. Catalog dịch vụ
Quản lý tại Website. App HH chỉ view và tạo đơn từ dịch vụ. Mỗi Service có price_listed và cost được copy vào OrderItem khi tạo đơn.

---

## 15. Entity dictionary (rough)

```
User: id, name, phone, role_id, ranking_id, ihos_user_id, device_id, 
      status (active/pending_offboarding/offboarded), offboarding_date, 
      monthly_target, created_at

Role: id, name, permissions (JSON), is_system (bool, 5 role mặc định)

Ranking: id, name, commission_pct_by_role (JSON), threshold_config, 
         quarter_reset (bool), created_at

Service: id, name, price_listed, cost, website_service_id, active
       
       Ghi chú: BỎ field recommended_recall_days (chốt 01/05/2026 vòng 16).
                Recall date không còn theo Service default. App HH chỉ
                consume recall_due_date từ iHOS (BS y lệnh per case).

Order: id, customer_id, source (web/manual), 
       status (DRAFT/CONFIRMED/IN_PROGRESS/COMPLETED/CANCELLED/NO_SHOW/REFUND_FULL/REFUND_PARTIAL),
       total_listed, total_paid, insurance_amount, voucher_amount,
       total_cost, net_profit (computed = total_paid - total_cost),
       ihos_order_id, scheduled_exam_at,
       created_at, confirmed_at, completed_at
       
       Ghi chú: scheduled_exam_at = giờ hẹn khám (để schedule reminder T-24h, T-2h, T+30p).

OrderRoleAssignment:
       id, order_id, role_id, user_id,
       assigned_at, assigned_by_user_id, ended_at (nullable),
       ranking_snapshot_id
       UNIQUE (order_id, role_id, user_id, assigned_at)
       
       Ghi chú: row có ended_at IS NULL = đang active.
                Tính HH chỉ lấy row active tại thời điểm snapshot.

OrderItem: id, order_id, service_id, price_listed, cost, quantity, 
           status (planned/completed/skipped),
           skipped_reason (nullable: customer_left/insurance_rejected/other),
           refunded (bool), refunded_amount, doctor_user_id, ihos_item_id,
           recall_due_date (nullable, từ iHOS webhook khi BS y lệnh)
       
       Ghi chú: doctor_user_id giữ lại cho mục đích lịch sử và future use,
                không dùng để tính HH (dùng OrderRoleAssignment).
                status = skipped: không tính HH (case khách bỏ về giữa khám).
                recall_due_date: chỉ có khi iHOS gửi qua webhook (BS chỉ định
                tái khám per case). NULL = không có y lệnh tái khám.

CommissionRecord: id, order_id, role_id, beneficiary_user_id,
                  role_at_time, ranking_at_time, pct_at_time, amount, 
                  stage (tạm_tính/chờ_duyệt/được_duyệt/từ_chối/khiếu_nại/cancel),
                  reject_reason, approved_by, approved_at, 
                  salary_cycle_id, source_type (auto/adjustment),
                  clawback_parent_id (nullable, cho record âm clawback)

Customer: id, name, phone, created_from, consent_at, consent_version,
          first_assigned_by, primary_assigned_user_id (NV chăm gốc),
          last_visit_at, last_completed_order_at,
          next_recall_due_at (computed nullable),
          recall_status (pending/done/skipped),
          status (active/inactive/anonymized)
       
       Ghi chú: primary_assigned_user_id dùng cho rule "KH cũ quay lại NV chăm gốc".
                next_recall_due_at = MIN(OrderItem.recall_due_date) của các OrderItem
                                     có recall_due_date NOT NULL từ iHOS.
                Nếu không có item nào có recall_due_date → NULL (không recall).
                (Chốt vòng 16: chỉ consume từ iHOS, không có Service default fallback)

Voucher: id, code, type (total/service/%), amount_or_pct, 
         assigned_to_customer_id, expires_at, used_at, created_by

SalaryCycle: id, start_date, end_date, status, approved_by, approved_at,
             deadline_date

InsuranceClaim: id, order_id, expected, actual, status 
                (pending/paid/rejected/partial), updated_at

AdjustmentRequest: id, beneficiary_user_id, type (thưởng/phạt), reason_code,
                   reason_text, amount, salary_cycle_id, status 
                   (pending/approved/rejected/edited/cancelled), 
                   source (manual/auto_rule),
                   auto_rule_id (nullable, link về AutoRule khi source=auto_rule),
                   created_by, approved_by, approved_at,
                   edited_at (nullable), edited_by (nullable),
                   parent_adjustment_id (nullable, link bản gốc nếu là edit)
       
       Ghi chú: Edit window 30 ngày sau payday. Sửa adjustment đã apply lương
                tạo CommissionRecord clawback ở kì lương kế tiếp.

AutoRule: id, name, type (thưởng/phạt), trigger_type 
          (target_achievement/late_check_in/complaint/...),
          parameters (JSON, vd {"target_pct": 100, "bonus_pct": 5}),
          active, created_by, created_at
       
       Ghi chú: MVP chỉ implement rule "thưởng đạt target tháng".
                Phase 2 thêm rule phạt sau khi discuss riêng (xem PENDING-ITEMS B-12).

NotificationLog: id, order_id (nullable), customer_id,
                 type (reminder_24h/reminder_2h/manual_call/post_exam_thanks/recall),
                 channel (zalo_oa/sms/manual_call),
                 scheduled_at, sent_at,
                 status (scheduled/sent/cancelled/failed),
                 sent_by_user_id (nullable, NULL nếu auto),
                 note (nullable, NV ghi feedback cuộc gọi)
       
       Ghi chú: Khi đơn CONFIRMED, schedule 4 row (T-24h, T-2h, T+15p, T+30p).
                Khi đơn IN_PROGRESS/CANCELLED/NO_SHOW: cancel pending reminders.
                Khi đơn COMPLETED: schedule post_exam_thanks ngay,
                schedule recall theo Service.recommended_recall_days.

AuditLog: id, entity_type, entity_id, action, actor_id, 
          before (JSON), after (JSON), timestamp

Shift: id, name, start_time, end_time, archived_at
       
       Ghi chú: Day-1 NP có 1 row "Cả ngày" 08:00-19:00.
                Future scale: thêm row cho ca tối, chi nhánh.

ShiftHeadAssignment: id, shift_id, head_user_id (nullable),
                     effective_from, effective_to (nullable),
                     set_by_user_id, note,
                     priority (default 0),
                     condition (JSON, nullable, ví dụ {"day_of_week": ["mon","tue"]})
       
       Ghi chú: Phương án J (F + extension hooks).
                Day-1 không dùng priority/condition (default value).
                Future: scheduling theo day-of-week, location, custom rule.
                Lookup logic: filter active rows (effective_to IS NULL hoặc > now),
                              filter by condition nếu có,
                              pick highest priority.
                Snapshot pattern: mỗi đơn gán TC theo ShiftHeadAssignment active
                                  tại thời điểm order.created_at, frozen sau xác nhận.
```

**Thay đổi so với bản v1:**
- Order thêm `net_profit` (computed), bỏ trường dependent effective_price
- Order bỏ `assignee_user_id` (thay bằng row trong OrderRoleAssignment role=sale)
- Order bỏ `handover_history` (thay bằng lịch sử row trong OrderRoleAssignment)
- OrderItem bỏ `effective_price`, `voucher_applied`
- OrderItem giữ `doctor_user_id` cho future use, không dùng cho HH
- Thêm bảng mới **OrderRoleAssignment** (trung tâm của công thức HH)
- CommissionRecord đổi từ link `order_item_id` sang (order_id, role_id, beneficiary_user_id)

---

## 16. NFR

- Uptime: 99.5% ngay từ đầu (được phép sập khoảng 3.6h/tháng)
- Response time: dưới 1s cho màn chính
- Concurrent user: [giả định G8, verify sau] 5-10 hiện tại, scale đến 30 trong 3 năm
- Đơn/ngày: khoảng 100
- Backup: không chấp nhận mất data 1 ngày, backup tần suất ít nhất 4h/lần, giữ 1 năm
- Device: mobile only (có bulk select + export email cho kế toán thay vì web view)
- Offline: internet ổn định, 3G fallback, không cần offline mode phức tạp
- Concurrent edit: optimistic lock với version number trên Order

---

## 17. Compliance và bảo vệ dữ liệu

- Tuân thủ Nghị định 13/2023 về bảo vệ dữ liệu cá nhân VN
- NP cần xây dựng quy trình consent trước go-live: thêm field consent_at + consent_version trong bảng Customer, checkbox trên website đặt lịch với nội dung pháp lý phù hợp
- KH yêu cầu xoá: cam kết xoá, dev xoá thủ công (chưa cần self-service)
- KH yêu cầu xem data: làm việc riêng với NP, không tích hợp app
- Audit log: giữ vĩnh viễn trong detail page (từng record), archive theo retention
- NV xem KH của người khác (privilege escalation): log đầy đủ

### Data retention

| Loại | Giữ full | Sau đó |
|---|---|---|
| KH active (có đơn trong 24 tháng) | Full | - |
| KH inactive > 24 tháng | Flag inactive | CEO review, option anonymize |
| Đơn đã đóng | 2 năm | Archive |
| HH và audit log HH | 5 năm | Archive (theo luật kế toán VN) |
| Audit log access | 1 năm | Xoá |
| Push notification log | 90 ngày | Xoá |
| Device binding log | 1 năm | Xoá |

---

## 18. Money handling

- DB: tiền lưu bigint VND (không thập phân, tránh precision bug)
- %HH lưu decimal(5,2) (ví dụ 5.75%)
- Tính toán: decimal precision cao trong bộ nhớ
- Làm tròn: half-up đến VND nguyên, chỉ làm tròn ở bước cuối cùng khi ghi vào CommissionRecord.amount
- Hiển thị: 12,345 VND (có dấu phân cách nghìn, không thập phân)
- Tổng HH = sum của các dòng đã làm tròn (khớp 100%, không double rounding)
- HH gross only, thuế TNCN kế toán xử lý riêng

---

## 19. Reporting

### Kế toán: 4 export Excel + flow duyệt đơn giản trên mobile
1. Bảng lương HH theo kì (1 dòng/NV, tổng HH tự động + điều chỉnh + ròng)
2. Bảng kê chi tiết (từng CommissionRecord)
3. Danh sách clawback (đơn đã duyệt kì trước phát sinh refund kì này)
4. File chuyển khoản lương format chung (NV, STK, bank, số tiền, nội dung)

### Màn duyệt HH trên mobile cho kế toán
- Tổng quan: số đơn, tổng HH, số NV
- Filter "Đơn vượt trần 10%" để review riêng (chỉ visual cue, App không enforce)
- Nút "Xuất Excel (4 file)" gửi email
- Nút duyệt: "Duyệt toàn bộ kì" hoặc duyệt theo NV hoặc reject từng dòng
- Sau duyệt: notify NV

### CEO Dashboard (realtime, không email báo cáo)
- Số lượng KH (mới, quay lại, tổng)
- Tỷ lệ chốt (xác nhận/tổng đơn)
- Tỷ lệ tái khám
- Top NV theo doanh số
- Top dịch vụ bán chạy
- Doanh số tuỳ chỉnh theo thời gian
- Conversion funnel: Mới tạo -> Xác nhận -> Checkin -> Hoàn thành
- Alert đơn vượt trần 10% net_profit (CEO tự review ngoài Excel, App không auto cap)

---

## 20. NV nghỉ việc (handover)

### Flow
1. CEO/trưởng ca mark NV "sắp nghỉ" + chọn ngày nghỉ
2. NV thấy banner "Bàn giao công việc" trên trang chủ
3. List các đơn pending: NV chọn NV nhận + bấm "Bàn giao"
4. Hệ thống mark row OrderRoleAssignment cũ `ended_at = now()`, thêm row mới cho người nhận
5. NV nhận được notify, xem được đơn và lịch sử
6. Đến ngày nghỉ: CEO deactivate user, không login được, device unbind

### Xử lý HH

| Loại đơn | Xử lý |
|---|---|
| Mới tạo, chưa xác nhận | Update OrderRoleAssignment: row sale cũ `ended_at`, row mới cho người nhận. HH tính cho người mới |
| Đã xác nhận, chưa khám | Exception handover: update OrderRoleAssignment. HH tạm tính (của người cũ) cancel, tính mới cho người nhận |
| Đã hoàn thành, HH chưa duyệt | Giữ row cũ active, HH vẫn chi cho NV cũ |
| Đã duyệt HH | Đã ghi nhận, chi theo Luật Lao động VN (trong 14 ngày sau nghỉ) |

### Force handover
Trưởng ca có nút "Force handover" khi NV đột ngột nghỉ/sa thải.

---

## 21. Business rules chi tiết

### Xác nhận đơn
- NV bấm "Đã xác nhận" 1 chạm, có warning "Không thể quay lại"
- Tại thời điểm xác nhận: system populate OrderRoleAssignment với 4 row (sale, trưởng ca, kế toán, CEO). Bác sĩ chưa có row (đợi iHOS sync).
- Số lần gọi và kết quả cuộc gọi NV tự note, trưởng ca kiểm tra khi cần
- KH không bắt máy: đơn ở state "Mới tạo" cho đến khi NV xác nhận hoặc huỷ thủ công

### Hoàn thành khám (iHOS)
- iHOS bấm hoàn thành theo từng dịch vụ
- Mỗi dịch vụ có doctor thực hiện -> sync kèm doctor_id -> add row OrderRoleAssignment role=bác_sĩ
- 1 đơn "hoàn thành toàn bộ" khi tất cả dịch vụ đã hoàn thành
- KH bỏ về giữa chừng: dịch vụ đã hoàn thành tính doanh thu, dịch vụ chưa làm không tính. Row bác sĩ chỉ thêm cho bác sĩ đã thực hiện thực sự.

### Kì lương
- Mốc xác định đơn thuộc kì: **ngày tạo đơn**
- Deadline kế toán duyệt: ngày 5 hàng tháng (Settings chỉnh được)
- Không có backup approver (Option A)

---

## 22. Screens final: 23 màn

| # | Tên | Ghi chú |
|---|---|---|
| 01 | Trang chủ | core |
| 02 | Đơn hàng | core |
| 03 | Khách hàng | core |
| 04 | Hoa hồng | view khác cho kế toán (có màn duyệt cuối tháng) |
| 05 | Dịch vụ | view-only + CTA tạo đơn |
| 06 | Xếp hạng | shell, logic chờ G1 |
| 07 | Thông báo | core |
| 08 | Menu (gộp More + Drawer) | core |
| 09 | Chi tiết đơn | core (cần hiển thị list OrderRoleAssignment + HH theo row) |
| 10 | Tạo đơn 1 bước | core |
| 11 | Tìm kiếm | core |
| 13 | Filter sheet | UI |
| 14 | Chi tiết KH | core |
| 15 | Chi tiết dịch vụ | view-only |
| 16 | Chi tiết HH | core |
| 17 | Đơn của khách | core |
| 19 | Tạo đơn thành công | core |
| 20 | Đăng nhập | core |
| 21 | Onboarding | shell, logic chờ G2 |
| 22 | Settings | mở rộng, nhiều section cho CEO |
| 23 | Empty state | UI |
| 24 | Error state | UI |
| 25 | Sheet chọn dịch vụ | UI |

Bỏ: 18 (thanh toán), 26 (sheet chi nhánh). Gộp: 12 vào 08.

Screens mới đề xuất thêm cho B2:
- "Duyệt HH cuối tháng" (view khác của 04 cho kế toán)
- "Bàn giao công việc" (cho NV pending_offboarding)
- "Request adjustment" (cho kế toán/TC)
- "Approve adjustment" (cho CEO/KT trưởng)
- "Cấu hình ca làm việc" (Settings cho CEO, gán TC theo phương án J)
- "Tạo Auto Reward/Penalty rule" (Settings cho CEO, MVP với 3 loại rule cơ bản)
- **"Customer Follow-up Dashboard"** (cho NV, list khách đến ngày tái khám hôm nay/tuần này)
- **"Notification Log"** (cho TC + CEO, audit reminder và call follow-up)

---

## 23. Bảng [Giả định, verify sau]

| Mã | Nội dung | Khi cần verify |
|---|---|---|
| G1 | Ngưỡng và công thức lên hạng ranking | Trước B5 spec screen 06 |
| G2 | Onboarding có quick tour không | Trước B5 spec screen 21 |
| G4 | API doc đầy đủ từ vendor iHOS | Blocker trước B6 triển khai. **Risk số 1.** |
| G5 | Số lượng trưởng ca tương lai | Theo dõi scale |
| G6 | Combo/liệu trình dịch vụ | Phase 2 |
| G7 | ~~Nếu BH thành nguồn doanh thu lớn, kích hoạt HH phần BH~~ **CHỐT VĐ-9**: Option B Out-of-Pocket Only. HH chỉ tính trên `total_paid` (out-of-pocket). | Đã chốt 25/04/2026 |
| G8 | Concurrent user scale | Theo dõi sau 1 năm |
| G9 | iHOS có gửi refund chi tiết theo item không | Verify khi có API doc |

---

## 24. Red flag chiến lược đã quyết

1. **Trưởng ca HH toàn doanh số theo thời điểm tạo đơn (TC-1):** ca sau hỗ trợ thì tự chủ động, không ăn HH đơn cũ
2. **iHOS dependency:** chưa liên hệ vendor được, **Gate 0 phải giải quyết trước khi start code** (note vào B6, xem PENDING-ITEMS.md A)
3. **Ranking reset quý:** giữ reset cứng
4. **Kế toán single approval:** Option A (không backup)
5. **Công thức HH generalized qua OrderRoleAssignment:** thay cho hardcode field trên Order/OrderItem. Extensible cho tương lai
6. **Trần 10% (giảm từ 15%) là cue cảnh báo:** App KHÔNG enforce, CEO tự tính ngoài Excel khi review trước chốt lương
7. **Shift architecture phương án J (F + extension hooks):** Day-1 NP có 1 shift "Cả ngày" 08:00-19:00, TC = Hà. Future-ready cho multi-shift, day-of-week, multi-location qua schema additive (xem ADR-001)
8. **BH commission Option B Out-of-Pocket Only:** HH chỉ tính trên phần khách trả ra túi, không tính phần BH chi trả (xem section 4)
9. ~~**Voucher Option A NP chịu cost**~~ **Voucher trừ khỏi base HH (vòng 13 revert vòng 10):** formula B1 vòng 9 chuẩn, voucher trừ như mọi chi phí. HH NV giảm khi đơn có voucher (xem section 4)
10. **KT và CEO không có HH theo đơn (vòng 13):** OrderRoleAssignment chỉ populate Sale + TC. BS thêm khi exam_started. Diễm và Nguyên ăn lương cứng / lợi nhuận, không HH per đơn.

---

## 25. Lịch sử revision

| Vòng | Nội dung chính |
|---|---|
| 1-4 | Làm rõ scope, business model, formula v1 per-item, stage HH, permission, luồng đơn, automation |
| 5 | Làm rõ BH, voucher, refund edge case |
| 6 | Làm rõ NFR, compliance, data retention, money handling, reporting, handover |
| 7 | Chốt công thức v1 per-item với effective_price |
| 8 | CEO đổi hướng sang v2 per-order (HH trên toàn đơn) |
| 9 | Chốt công thức v3 FINAL: generalized qua OrderRoleAssignment, mọi role cùng formula, bác sĩ multi user cùng role, trưởng ca TC-1, role không có user = không chi HH, trần 15% soft warning |
| 10 (25/04/2026) | Update từ B2.1 audit Group A: Cap 15% → 10% (App không enforce, VĐ-5), Shift architecture phương án J (VĐ-3, ADR-001), BH Option B Out-of-Pocket (VĐ-9), Voucher Option A NP chịu cost (VĐ-8). Thêm entity Shift, ShiftHeadAssignment. VĐ-10 phát sinh dịch vụ thuộc scope iHOS, App HH chỉ consume webhook payload (xem PENDING-ITEMS.md I-1) |
| 11 (25/04/2026) | Đóng VĐ-4: Adjustment workflow KT trưởng tạo + CEO duyệt (single source single approver), edit window 30 ngày + clawback kì sau, transparent hiển thị cho NV. Auto Reward rule "thưởng target tháng" trong MVP. Phần phạt defer phase riêng. Thêm entity AutoRule, mở rộng AdjustmentRequest. |
| 12 (25/04/2026) | System-design audit Order lifecycle + customer engagement: simplify state machine 9→8 states (gộp CHECKED_IN+IN_EXAM thành IN_PROGRESS), thêm OrderItem.status (planned/completed/skipped) cho khách bỏ về giữa khám, Reminder Workflow (T-24h Zalo, T-2h Zalo, T+15p NV gọi, T+30p auto NO_SHOW), Post-Exam Customer Follow-up module (Zalo OA cảm ơn + recall theo Service.recommended_recall_days). Thêm entity NotificationLog, mở rộng Customer + Service. Thêm 2 screens: Customer Follow-up Dashboard + Notification Log. |
| 13 (28/04/2026) | B2.3 audit findings resolve: (1) REVERT chốt vòng 10 VĐ-8 Option A, voucher trừ khỏi base HH như formula B1 vòng 9 chuẩn. (2) Bỏ KT và CEO khỏi HH role - OrderRoleAssignment chỉ populate Sale + TC + BS. Diễm ăn lương cứng, Nguyên ăn lợi nhuận. (3) Clarify BS row: thêm khi exam_started, KHÔNG xoá nếu item skipped sau đó (per-doctor model, không phải per-item). Recalc ví dụ section 3.7. |
| 14 (01/05/2026) | Pre-B5: (1) ĐD-Sale = 1 role duy nhất, không tách (thêm note section 3.3). (2) Permission matrix update: thêm cột "Xem ranking", NV/BS chỉ thấy ranking của mình (không leaderboard người khác). BS xem KH qua iHOS, không qua app HH. TC giữ "toàn PK" cho mọi mục. (3) Reframe cap warning intent: awareness signal cho process improvement, không cut HH retroactive. |
| 15 (01/05/2026) | PDF anh Nguyên review: defer toàn bộ PDF features (penalty, awards, floor, probation, review parser) sang Phase 2 hoặc later. Lý do: NP scale 5 NV, manual workaround qua MS-9 Adjustment đã đủ. Foundation B1-B5 hiện tại 50-60% match PDF intent là OK. |
| 16 (01/05/2026) | Aggregated questions resolved: (1) A-1: Bonus formula = HH gốc × bonus_pct × overshoot. (2) A-2: Giữ M0-M3 + L1-L3 (không rename). (3) A-3: Recall chỉ từ iHOS webhook (BS y lệnh), bỏ Service.recommended_recall_days fallback. (4) B-3: Permission role-based config phase 2 (Sapo-style). (5) B-4: Bulk-all approve có safety mechanism. (6) C-1.1, C-1.4: NV không thấy AUTO_PENDING, không thấy %cap. (7) C-2: Diễm thấy realtime total HH cycle. (8) C-3.1, C-3.2: Advanced shift hidden default, archive only. |

---

## Kết thúc B1

B1 đã FINAL. Các điểm mở (G1-G9) đều không cản việc bắt đầu B2. Risk số 1 (G4 iHOS API) là blocker trước B6, không cản B2-B5.

**B2 sẽ là: Dựng kịch bản vận hành thực tế**

Dự kiến output B2 gồm:
- 5 kịch bản theo 5 persona (1 ngày làm việc điển hình)
- BPMN flowchart cho lifecycle Order và CommissionRecord
- 8 kịch bản edge case đã brainstorm (huỷ, refund, no-show, voucher, handover, BH, điều chỉnh, phát sinh)
- Kịch bản cuối tháng kì lương (kế toán duyệt, CEO approve adjustment)

Anh sẵn sàng sang B2 chưa?
