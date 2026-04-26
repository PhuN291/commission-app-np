# ADR-002: Kiến trúc xử lý phát sinh dịch vụ trong đơn

Status: Proposed
Date: 2026-04-25
Deciders: CEO Nguyên (anh Phú)
Tác giả: CTV audit

## 1. Context

NP Clinic vận hành flow: khách đến NP, mua đơn ban đầu (ví dụ: khám tổng quát + xét nghiệm máu). Trong quá trình khám, BS có thể chỉ định thêm dịch vụ phát sinh (ví dụ: siêu âm bụng, X-quang). Cần quyết định 3 câu hỏi:

Q10.1: Dịch vụ phát sinh tạo OrderItem mới vào đơn gốc, tạo đơn con (sub-order), hay đơn riêng hoàn toàn?

Q10.2: HH cho item phát sinh tính realtime ngay khi item add, hay batch khi đơn complete, hay daily cron?

Q10.3: Người làm dịch vụ phát sinh được gán role (BS/ĐD/KTV) tự động qua webhook Isoft, hay manual qua UI, hay hybrid?

Constraints (đã chốt ở B1, B2):

1. Volume hiện tại 20-30 đơn/ngày, target 100/ngày trong 12 tháng tới
2. Pay cycle ngày 5 hàng tháng (không cần realtime HH)
3. Team dev nhỏ (anh Nguyên + 1 dev)
4. Snapshot pattern đã chốt (ranking_snapshot_id ở level OrderItem)
5. Phương án J cho shift architecture (per-shift TC, có thể turnover)
6. Webhook Isoft là source of truth cho lifecycle đơn (chưa confirm payload đầy đủ)
7. BH option B (out-of-pocket only)
8. Voucher option A (NP chịu cost)

## 2. Decision (Proposed)

Chọn combination 3 lựa chọn coherent:

- Q10.1: **Option A** (Đơn gốc + OrderItem, attribute role per item)
- Q10.2: **Option B** (Batch HH khi đơn complete)
- Q10.3: **Option C** (Hybrid auto webhook + manual fallback)

Plus 2 enhancements bắt buộc cho MVP:

- **OrderEvent immutable audit log** từ ngày 1
- **2-step order finalization** (preview HH trước khi close)

## 3. Options Considered

### Q10.1: Cấu trúc đơn

#### Option A: Đơn gốc + OrderItem (recommend)

Schema:
```
Order:
   id, customer_id, isoft_order_id,
   started_at, completed_at, status

OrderItem:
   id, order_id, service_id,
   performed_by_user_id, role,
   amount, cost, performed_at,
   ranking_snapshot_id
```

| Dimension | Assessment |
|---|---|
| Complexity | Trung bình |
| Dev cost MVP | 5-7 ngày |
| Scalability | Tốt |
| UX khách | Tốt (1 lần thanh toán) |
| Data integrity | Tốt |

Pros:
- 1 lần khám = 1 đơn = 1 invoice = 1 lần thanh toán cho khách
- Báo cáo doanh thu/HH per đơn không bị fragment
- Pattern chuẩn theo Epic, Cerner (healthcare EMR)
- Per-item role attribution future-proof khi multi-shift (architecture J)
- Snapshot ranking ở level OrderItem cho phép rate khác nhau giữa các item

Cons:
- State machine Order phức tạp hơn (pending, in_progress, completed, closed, cancelled)
- Logic finalize phải handle case có item chưa attribute

#### Option B: Đơn con (sub-order)

Schema: Order có `parent_order_id` field, dịch vụ phát sinh tạo Order con link parent.

| Dimension | Assessment |
|---|---|
| Complexity | Cao |
| Dev cost MVP | 7-9 ngày |
| Scalability | Trung bình |
| UX khách | Kém (thanh toán nhiều lần) |
| Data integrity | Trung bình |

Pros: Mỗi sub-order isolated, refund per sub-order độc lập.

Cons:
- Khách phải thanh toán nhiều lần (UX kém)
- Báo cáo aggregate phải JOIN parent-child phức tạp
- Logic đối soát BH phức tạp (BH thanh toán theo "lần khám" không theo sub-order)
- Không có precedent từ healthcare/POS lớn

#### Option C: Đơn riêng hoàn toàn

Mỗi dịch vụ phát sinh tạo Order mới, không link với Order gốc.

| Dimension | Assessment |
|---|---|
| Complexity | Thấp |
| Dev cost MVP | 3-4 ngày |
| Scalability | Kém |
| UX khách | Rất kém |
| Data integrity | Kém |

Pros: Schema đơn giản nhất.

Cons: Mất context "cùng 1 lần khám", anti-pattern, không khuyến nghị.

### Q10.2: Timing HH calculation

#### Option A: Realtime per-item

Mỗi item add trigger HH calculation ngay.

| Dimension | Assessment |
|---|---|
| Complexity | Cao |
| Dev cost MVP | 8-10 ngày |
| Maintainability | Khó |

Pros: Dashboard realtime.

Cons:
- Item bị remove/modify phải reverse HH (compensation transaction)
- Race condition khi nhiều item add cùng lúc
- Database write contention
- Pay cycle ngày 5 không cần realtime
- Test surface lớn

#### Option B: Batch on order complete (recommend)

Trigger HH calculation khi `Order.status = completed` (event từ Isoft hoặc manual click "Hoàn tất").

| Dimension | Assessment |
|---|---|
| Complexity | Trung bình |
| Dev cost MVP | 3-4 ngày |
| Maintainability | Tốt |

Pros:
- Đơn giản: 1 trigger, 1 calculation pass per đơn
- Không cần reversal logic vì chưa calculate khi đơn còn open
- Aligned với pay cycle ngày 5
- Standard pattern (Epic charge capture, Toast check close, Folio checkout)

Cons:
- HH dashboard delay tới khi đơn complete (acceptable cho pay cycle ngày)
- Phụ thuộc trigger "complete" chính xác

#### Option C: Daily batch (cron job)

HH calculate qua cron job chạy 0h hàng đêm cho các đơn completed trong ngày.

| Dimension | Assessment |
|---|---|
| Complexity | Trung bình-thấp |
| Dev cost MVP | 4-5 ngày |
| Maintainability | Trung bình |

Pros: Không phụ thuộc realtime trigger.

Cons: Dashboard delay tới ngày sau, debug khó nếu cron fail.

### Q10.3: Role attribution

#### Option A: Full webhook auto

Phụ thuộc 100% Isoft gửi `performed_by_user_id` qua webhook.

| Dimension | Assessment |
|---|---|
| Complexity | Thấp |
| Dev cost MVP | 3-4 ngày |
| Risk | Cao |

Pros: Zero manual work khi happy path.

Cons:
- Nếu Isoft không support `performed_by_user_id`, blocker hoàn toàn
- Nếu webhook fail/delay, data missing không có way bù
- Không có safety net

#### Option B: Full manual

Lễ tân/TC click button "Gán người làm" cho mỗi item.

| Dimension | Assessment |
|---|---|
| Complexity | Trung bình |
| Dev cost MVP | 4-5 ngày |
| UX | Kém |

Pros: Không phụ thuộc Isoft.

Cons:
- Tốn thời gian (100 đơn/ngày × 3-5 item/đơn = 300-500 click/ngày)
- Sai sót cao
- Lễ tân/TC quá tải

#### Option C: Hybrid auto + manual fallback (recommend)

Flow:
1. Webhook gửi event `order.item_added`, app cố gắng auto-attribute role dựa trên `performed_by_user_id` trong payload
2. Nếu payload thiếu hoặc user_id không match, item ở state `unattributed`
3. Trước khi đơn close, UI hiện list item `unattributed` cho TC hoặc lễ tân gán manual
4. Đơn không close được nếu còn item `unattributed` (hard block)

| Dimension | Assessment |
|---|---|
| Complexity | Trung bình-cao |
| Dev cost MVP | 6-7 ngày |
| Data quality | Tốt |
| Maintainability | Trung bình |

Pros:
- Tận dụng auto khi có data
- Safety net khi auto fail
- Force data quality trước khi snapshot
- Không có "garbage HH" (đơn close mà không biết ai làm)

Cons:
- Logic phức tạp hơn (state machine + UI)
- Cần test cả 2 path (auto và manual)

## 4. Trade-off Analysis

### Cost summary

| Q | Option chọn | Dev cost |
|---|---|---|
| Q10.1 | A (đơn gốc + OrderItem) | 5-7 ngày |
| Q10.2 | B (batch on complete) | 3-4 ngày |
| Q10.3 | C (hybrid auto + manual) | 6-7 ngày |
| Enhancement | OrderEvent audit log | 2-3 ngày |
| Enhancement | 2-step finalization | 1-2 ngày |
| **Total** | | **17-23 ngày dev** |

### Tại sao combination A + B + C

3 lựa chọn này reinforce lẫn nhau, tạo thành architecture coherent:

1. **Open Container (A)** cho phép item add vào đơn đang mở mà không phá data model
2. **Snapshot at finalize (B)** lock state khi đơn close, khớp với pay cycle batch
3. **Hybrid attribution (C)** đảm bảo data quality trước khi snapshot, không có garbage

Đổi 1 quyết định, 2 cái còn lại phải refactor:
- Đổi A → B (đơn con): thay đổi cách invoice, cách tính BH, cách aggregate báo cáo
- Đổi B → A (realtime): cần reversal logic phức tạp khi item add/remove
- Đổi C → A (full auto): mất safety net, blocker khi Isoft không cooperate

### Vs alternative combinations

**A + A + A (đơn gốc + realtime + full auto)**
- Cost 16-19 ngày, complexity cao, fragile khi item modify
- Phụ thuộc Isoft hoàn toàn (risk cao)

**A + C + C (đơn gốc + daily cron + hybrid)**
- Cost 13-15 ngày (rẻ hơn 4-5 ngày)
- Dashboard không thấy data trong ngày
- Debug khó khi cron fail

**A + B + B (đơn gốc + batch + full manual)**
- Cost 14-16 ngày
- Lễ tân/TC quá tải (300-500 click/ngày)
- UX kém, sai sót cao

Recommend giữ A + B + C dù không phải rẻ nhất, vì đây là sweet spot cost-quality-future-proof cho NP scale.

### Tại sao bắt buộc OrderEvent + 2-step finalization

**OrderEvent (audit log)**: cost 2-3 ngày dev nhưng:
- Backbone cho mọi dispute "đơn này HH sai sao"
- Source of truth cho debug, audit, compliance
- Nếu sau cần realtime dashboard hoặc analytics, đã có data
- Khó retrofit về sau (phải replay history từ DB transactions)

**2-step finalization**: cost 1-2 ngày dev nhưng:
- Pattern từ POS nhà hàng (Toast: "Review check before close")
- Lễ tân thấy preview HH trước khi close, kịp catch lỗi
- Giảm 50-70% sai sót so với close 1-step (theo industry data)
- Build trust với nhân viên (HH transparent trước khi lock)

## 5. Verdict thẳng thắn

Anh hỏi: "VĐ-10 nên đi theo phương án nào tối ưu nhất với những gì B1, B2 đã có và tình hình NP?"

Câu trả lời: **A + B + C + 2 enhancement**.

Không phải cheapest (A + C + C rẻ hơn 4-5 ngày), không phải simplest (A + A + A đơn giản hơn). Nhưng:

- **Aligned với B1**: snapshot pattern, ranking_snapshot_id ở OrderItem level đã sẵn sàng cho A
- **Aligned với B2**: lễ tân là người vận hành finalize, TC là backup attribution, khớp persona đã chốt
- **Aligned với phương án J shift**: per-item role attribution cho phép multi-shift TC future
- **Aligned với pay cycle ngày 5**: batch on complete đủ realtime, không cần daily cron

Trade-off cost: 17-23 ngày dev là đầu tư đáng giá vì:
- Một lần dev đúng, không phải refactor sau
- OrderEvent + 2-step là "infrastructure investment" trả về suốt 5+ năm
- Đắt hơn 4-5 ngày so với cheapest, nhưng tiết kiệm 15-20 ngày refactor mai sau

## 6. Consequences

### Easier
- Khách thanh toán 1 lần dù có phát sinh dịch vụ (UX tốt)
- Báo cáo doanh thu/HH per đơn rõ ràng
- Audit "ai làm gì lúc nào" qua OrderEvent
- Multi-shift future (architecture J) work seamlessly với per-item attribution
- Dispute resolution dễ vì có audit trail

### Harder
- State machine Order phức tạp hơn (5 states: pending, in_progress, completed_pending_review, closed, cancelled)
- Test surface lớn (cả webhook path và manual path)
- Phải confirm Isoft webhook payload trước B6 estimate

### Need to revisit
- Sau 3 tháng vận hành: review xem manual fallback có dùng nhiều không. Nếu >20% đơn cần manual, escalate Isoft fix payload
- Sau 6 tháng: review xem có cần realtime HH dashboard không
- Sau 12 tháng: review xem multi-attribution (1 item nhiều người làm) có cần thiết không

## 7. Action Items

1. [ ] **Blocker**: Confirm với Isoft team về webhook `order.item_added` payload có `performed_by_user_id` không. Nếu không, escalate request hoặc accept full manual fallback
2. [ ] B1 update: thêm Order, OrderItem, OrderEvent vào entity dictionary
3. [ ] B1 update: thêm section "Webhook Integration với Isoft" với 3 events: `order.created`, `order.item_added`, `order.exam_finished`
4. [ ] B2 update: VĐ-10 status đóng, reference ADR-002
5. [ ] B5 spec: screen "Chi tiết đơn" với section "Item phát sinh + finalize 2-step preview"
6. [ ] B6 plan: dev epic "Order Item Add Flow" với 17-23 ngày dev, depend on Isoft webhook confirm
7. [ ] Risk register: thêm "Isoft webhook không support performed_by" với mitigation = full manual UI (cost +3-4 ngày)

## 8. Migration path nếu sau cần upgrade

### Nếu cần realtime HH dashboard
- Add background job listen OrderEvent stream
- Compute incremental HH per event
- Push lên dashboard via WebSocket
- Cost: 5-7 ngày, không phá schema cũ

### Nếu cần multi-attribution (1 item nhiều người làm)
- Thêm OrderItemContributor table:
  ```
  OrderItemContributor:
     id, order_item_id, user_id, role, percentage
  ```
- Mỗi item có nhiều contributor với percentage chia HH
- Cost: 3-4 ngày, additive schema không migrate

### Nếu cần multi-location (mở chi nhánh 2)
- Thêm location_id vào Order
- Filter shift, ranking, user theo location
- Cost: 4-6 ngày, additive

Architecture A + B + C extensible, không lock-in. Tất cả enhancement đều là additive schema, không phải migrate destructive.

## 9. Anh quyết định

Chốt 1 trong 2:

A. **A + B + C + 2 enhancement (recommend)**: 17-23 ngày dev, đủ cho NP 24-36 tháng tới
B. **A + C + C (cheapest workable)**: 13-15 ngày dev, rẻ hơn 4-8 ngày nhưng mất OrderEvent + 2-step finalization

Tôi không khuyến nghị B vì OrderEvent là infrastructure essential. Nhưng nếu anh ngân sách tight thì B vẫn workable, chỉ là sau 6 tháng có thể đau đầu debug.

Anh chốt xong, tôi update B1 + B2 batch một lần.
