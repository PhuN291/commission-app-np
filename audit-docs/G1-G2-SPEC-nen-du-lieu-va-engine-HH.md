# SPEC G1 + G2: Nền dữ liệu thật + Engine tính hoa hồng

Ngày: 31/05/2026 | PM: Nguyễn Đức Phú | Người soạn: Claude (advisor + BA)
Dùng cho: dev human + Claude Code. Nguồn chuẩn nghiệp vụ: B4-business-rules.md (R-1 đến R-12), B1, B2.

---

## 0. Cách đọc tài liệu này

Đây là spec cho hai giai đoạn đầu của kế hoạch đến đích: G1 (nền dữ liệu thật) và G2 (engine tính hoa hồng thật). Hai giai đoạn này là móng của cả sản phẩm. Làm xong G1+G2 thì app mới thật sự tính đúng tiền, thay cho phần mock hiện tại.

Mỗi mục có phần logic và, khi liên quan màn hình, có phần "Yêu cầu giao diện". Dev không được chỉ làm chạy đúng logic mà bỏ thẩm mỹ và dễ dùng. Giao diện phần mới phải bám đúng bộ component và phong cách đang có.

---

## 1. Vì sao cần G1 và G2 (tóm tắt phát hiện audit 31/05)

App hiện tại là bản demo bấm được, chưa tính hoa hồng thật. Cụ thể:

- Hoa hồng đang tính kiểu mock: Sale 3%, TC 2%, BS 5% nhân thẳng tổng giá đơn, trong `server/commission.ts`. Bỏ qua giá vốn, bảo hiểm, voucher. Sai bản chất so với công thức chuẩn B4.
- Có ít nhất 3 cách tính khác nhau giữa các màn (Income, Dashboard, màn tạo đơn), cho 3 con số khác nhau cho cùng một người.
- Bảng cấu hình %HH theo hạng (`commission_tiers`) tồn tại nhưng engine không đọc, nên chỉnh % trong Settings không có tác dụng.
- Các bản ghi hoa hồng, đơn hàng con, điều chỉnh, truy thu đều sinh giả theo số thứ tự đơn, lưu trong bộ nhớ tạm, mất khi restart.
- Tạo đơn không hề sinh hoa hồng hay phân vai, chỉ lưu đơn. Hoa hồng chỉ hiện ra khi mở màn xem.

G1 và G2 sửa tận gốc: dựng dữ liệu thật và viết engine tính đúng.

---

## 2. Quyết định đã chốt (PM duyệt 31/05)

1. Tính hoa hồng đủ ba vai ngay: Sale, TC, Bác sĩ cùng một đơn.
2. Chuyển sang database thật (Postgres). Bỏ bộ nhớ tạm. Dữ liệu chi lương không được mất khi restart.
3. Nhận đơn từ nhiều nguồn (nhập tay, webhook iHOS, đồng bộ website) nhưng qua một cổng nhận đơn chung. v1 bật nguồn nhập tay trước. Hai nguồn tự động cắm vào cùng cổng sau, không sửa lại lõi.
4. Giữ nguyên giao diện hiện tại. Phần làm mới bám đúng phong cách và phải tối ưu về thẩm mỹ và dễ dùng.

Số %HH thật từ CEO khách hàng chưa có (việc G0, PM lo sau). Trong lúc chờ, engine dùng số tạm trong bảng `commission_tiers` đã seed (Sale M0 2%, M1 3%, M2 5%, M3 8%; TC 2%; BS L1 3%, L2 5%, L3 8%). Khi có số thật chỉ cần cập nhật bảng, không sửa code.

---

## 3. G1: Nền dữ liệu thật

### 3.1. Bức tranh tổng thể các bảng

Đường tính tiền cần các bảng sau (mũi tên là quan hệ tham chiếu):

```
users ──< order_role_assignments >── orders ──< order_items
  │                │                    │
  │                │                    └──< commission_records
  │                │
commission_tiers (đọc %HH theo role + ranking + thời điểm)
  │
adjustments (thưởng/phạt theo kỳ)        audit_logs (ghi mọi thay đổi)
```

### 3.2. Chi tiết từng bảng

Giữ nguyên `users`, `commission_tiers`, `services`, `customers` đang có. Bổ sung và sửa như dưới. Tất cả tiền lưu số nguyên VND. %HH lưu basis points (300 = 3.00%).

**orders (sửa lại).** Bỏ kiểu một đơn một dịch vụ gộp. Đơn là vỏ chứa nhiều `order_items`.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | serial | |
| code | text unique | mã đơn |
| customer_id | int FK customers | |
| source | text | 'manual' / 'ihos' / 'website' (nguồn nhận đơn) |
| idempotency_key | text unique nullable | chống nhận trùng từ webhook (R-12-4) |
| status | text | state machine R-2-1: draft, confirmed, in_progress, completed, cancelled, no_show, refund_partial, refund_full |
| sale_user_id | int FK users | NV tạo đơn / phụ trách (vai Sale) |
| insurance_amount | int default 0 | phần bảo hiểm chi trả |
| voucher_amount | int default 0 | giảm giá voucher |
| total_listed | int | tổng giá niêm yết = Σ order_items.unit_price × quantity |
| total_paid | int | khách trả ra túi = total_listed - insurance_amount - voucher_amount |
| net_profit | int | total_paid - total_cost (lưu sẵn cho kế toán đối soát) |
| created_at | timestamp | quyết định kỳ lương (R-11-1) |
| confirmed_at, completed_at | timestamp nullable | mốc sinh phân vai và hoa hồng |

Giữ tạm các trường VAT và ghi chú đang có. Trường refund chuyển xuống mức item.

**order_items (bảng mới, quan trọng nhất G1).** Đây là nơi có giá vốn, thiếu giá vốn thì không tính được lãi.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | serial | |
| order_id | int FK orders | |
| service_id | int FK services | |
| service_name | text | snapshot tên tại thời điểm tạo |
| quantity | int default 1 | |
| unit_price | int | giá bán một đơn vị |
| cost | int | giá vốn một đơn vị (R-1-1). Mặc định lấy từ services.default_cost, cho sửa |
| status | text | planned / completed / skipped (R-2-5) |
| skipped_reason | text nullable | enum R-2-5 khi skipped |
| performed_by_user_id | int FK users nullable | bác sĩ thực hiện (để phân vai BS) |
| recall_due_date | date nullable | y lệnh tái khám (G4, để sẵn cột) |
| refunded_amount | int default 0 | hoàn tiền mức item |

Bổ sung `services.default_cost` (int, default 0) để mặc định giá vốn, NV không phải nhập tay mỗi lần.

**order_role_assignments (bảng mới).** Ai ăn hoa hồng trên đơn này (R-3).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | serial | |
| order_id | int FK orders | |
| role | text | 'sale' / 'tc' / 'doctor' (R-1-2, không có KT/CEO) |
| user_id | int FK users | |
| ranking_snapshot | text nullable | hạng của user tại thời điểm gán (R-1-3) |
| pct_at_time_bp | int | %HH chốt tại thời điểm gán, đọc từ commission_tiers |
| assigned_at | timestamp | |
| ended_at | timestamp nullable | set khi handover (R-3-5) |
| assigned_by_user_id | int nullable | |

**commission_records (bảng mới, thay store mock).** Một dòng hoa hồng cho một vai trên một đơn (R-2-3).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | serial | |
| order_id | int FK orders | |
| role_assignment_id | int FK order_role_assignments | |
| user_id | int FK users | |
| cycle_id | text | 'YYYY-MM' theo orders.created_at (R-11-1) |
| base_net_profit | int | lãi ròng dùng làm gốc tính |
| pct_bp | int | %HH áp dụng (snapshot) |
| amount | int | tiền hoa hồng = round(max(net_profit,0) × pct / 10000) |
| status | text | 7 trạng thái R-2-3: TAM_TINH, CHO_DUYET, DUOC_DUYET, TU_CHOI, KHIEU_NAI, CLAWBACK_PENDING, CANCEL |
| parent_cr_id | int nullable | dòng delta truy thu trỏ về dòng gốc (R-6-4, clawback) |
| rejected_at, rejected_reason | | cho luồng khiếu nại |
| created_at | timestamp | |

**adjustments (bảng mới, thay store mock).** Thưởng/phạt theo kỳ (R-6).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | serial | |
| user_id | int FK users | áp cho bất kỳ ai kể cả KT/CEO (R-6-8) |
| cycle_id | text | |
| type | text | 'thuong' / 'phat' |
| amount | int | dương cho thưởng, âm cho phạt |
| reason | text | |
| source | text | 'manual' (Diễm tạo) / 'auto_rule' |
| status | text | 6 trạng thái R-2-4: PENDING, AUTO_PENDING, APPROVED, REJECTED, EDITED, LOCKED |
| created_by_user_id, approved_by_user_id, approved_at | | workflow Diễm tạo, CEO duyệt (R-6-1) |
| parent_adjustment_id | int nullable | bản gốc khi edit trong 30 ngày (R-6-4) |

**audit_logs (bảng mới, thay store mock).** Ghi mọi thay đổi quan trọng (R-10-2): entity_type, entity_id, action, actor_id, before (json), after (json), timestamp. Bổ sung các action còn thiếu phát hiện trong audit: `adjustment.approve`, `adjustment.reject`.

Truy thu (clawback) không cần bảng riêng. Thể hiện bằng `commission_records` dòng delta âm, trỏ `parent_cr_id` về dòng gốc, status CLAWBACK_PENDING rồi DUOC_DUYET ở kỳ sau (R-11-6).

### 3.3. Cổng nhận đơn chung

Một hàm vào duy nhất, ví dụ `ingestOrder(payload, source)`, nhận một đơn ở định dạng nội bộ chuẩn (khách, danh sách item kèm giá bán và giá vốn và người thực hiện, bảo hiểm, voucher, nguồn). Mọi nguồn đều đi qua hàm này:

- Nhập tay: màn nhập đơn gọi `ingestOrder(payload, 'manual')`. Bật ở v1.
- Webhook iHOS: handler webhook map payload iHOS sang định dạng nội bộ rồi gọi `ingestOrder(payload, 'ihos')`. Bật khi vendor sẵn sàng. Có `idempotency_key` chống trùng.
- Đồng bộ website: tương tự, `source = 'website'`.

Lợi ích: thêm nguồn sau không phải sửa lõi tính HH, chỉ viết lớp map cho nguồn đó.

### 3.4. Màn nhập đơn (mở rộng order-create.tsx)

Giữ nguyên luồng và phong cách màn `order-create.tsx` đang có (đẹp rồi): chọn khách, chọn dịch vụ qua dialog, ngày giờ hẹn, ghi chú, thanh toán, VAT, nút Tạo đơn ở cuối. Dùng lại đúng component Screen, Card, SectionTitle, NPButton, Input, màu np-brand-ink, số canh `tabular-nums`.

Bổ sung tối thiểu để tính được hoa hồng thật, mỗi dịch vụ trong đơn cho phép nhập:

- Giá vốn: mặc định tự lấy từ `services.default_cost`, hiện mờ, NV chỉ sửa khi cần. Đa số trường hợp không phải đụng.
- Người thực hiện (bác sĩ): chọn từ danh sách BS, để phân vai BS. Có thể bỏ trống nếu dịch vụ không cần BS.
- Thêm mục Bảo hiểm và Voucher ở phần Thanh toán: hai ô nhập số tiền, mặc định 0.

Phần Thanh toán hiển thị rõ và trung thực: Tổng niêm yết, trừ Bảo hiểm, trừ Voucher, ra Khách trả, trừ Giá vốn, ra Lãi, và Hoa hồng ước tính tính bằng đúng engine thật (đánh nhãn "tạm tính" cho tới khi đơn hoàn tất). Bỏ con số 5% hardcode đang có.

Yêu cầu giao diện cho phần thêm mới:

- Ít chạm: giá vốn và vai Sale (mặc định người đang đăng nhập) tự điền, NV không phải nhập. Chỉ bác sĩ và bảo hiểm/voucher là nhập khi có.
- Không phá bố cục: các trường mới nằm gọn trong Card của mục tương ứng, cùng kiểu Input và SectionTitle hiện có.
- Số tiền rõ ràng, đời thường, canh phải, dùng `fmtVND` sẵn có.
- Mobile-first: không thêm bảng rộng phải kéo ngang. Mỗi dịch vụ là một thẻ dọc.

### 3.5. Việc dọn mock

Bỏ các file sinh dữ liệu giả sau khi engine thật chạy: phần generate trong `commission.ts`, `orderItems.ts`, `clawbacks.ts`, `adjustments.ts` (giữ lại các hàm thao tác trạng thái, bỏ phần generate theo seed). `seed.ts` chuyển sang seed dữ liệu mẫu hợp lý qua đúng đường tạo đơn, để test engine. Bỏ leaderboard `staff_members` bịa, leaderboard lấy từ user thật.

---

## 4. G2: Engine tính hoa hồng

### 4.1. Công thức chuẩn (R-1-1)

```
total_listed = Σ (order_item.unit_price × quantity)        // mọi item
total_paid   = total_listed - insurance_amount - voucher_amount
total_cost   = Σ (order_item.cost × quantity)              // chỉ item status = completed (R-1-6)
net_profit   = total_paid - total_cost

HH một vai = round( max(net_profit, 0) × pct_bp / 10000 )
```

pct_bp đọc từ `commission_tiers` theo vai và hạng của user, tại thời điểm chốt (R-1-3). KT và CEO không có dòng hoa hồng (R-1-2).

Ví dụ số để dev tự kiểm: đơn khám 10.000.000, bảo hiểm trả 6.000.000, voucher 0, giá vốn vật tư 3.000.000.
total_paid = 10.000.000 - 6.000.000 = 4.000.000. net_profit = 4.000.000 - 3.000.000 = 1.000.000.
HH Sale (giả sử M2 = 5%) = 1.000.000 × 5% = 50.000. (Code mock cũ ra 500.000, sai gấp 10 lần.)

net_profit âm thì HH = 0 cho mọi vai (R-12-1).

### 4.2. Khi nào sinh hoa hồng

- Khi đơn `confirmed`: tạo `order_role_assignments` cho Sale (người tạo / phụ trách) và TC (trưởng ca tại thời điểm đó). Snapshot hạng và %HH (R-3-1).
- Khi đơn có bác sĩ thực hiện (item có performed_by, mốc exam_started/completed): thêm dòng phân vai BS, mỗi bác sĩ một dòng, giữ vĩnh viễn dù item sau đó bị skip (R-1-7, R-3-2, R-3-4).
- Khi đơn `completed`: tính net_profit theo công thức, sinh `commission_records` cho từng dòng phân vai active, trạng thái CHO_DUYET. Lưu base_net_profit và pct_bp vào CR.

KT duyệt thì CR sang DUOC_DUYET (đã có luồng route, chỉ thay nguồn mock bằng bảng thật).

### 4.3. Snapshot và đọc %HH

Dùng `getEffectiveCommissionRate(role, ranking, at)` đã có trong storage (đọc đúng dòng tier còn hiệu lực tại thời điểm). Engine gọi hàm này lúc gán vai, lưu pct_bp vào `order_role_assignments`, rồi CR dùng lại pct đã snapshot. NV đổi hạng giữa kỳ thì đơn cũ giữ %HH cũ, đơn mới ăn % mới (R-1-3).

### 4.4. Item skipped, refund, clawback

- Item skipped: không cộng cost của item đó vào total_cost, doanh thu tương ứng cũng không tính (R-1-6). Recompute net_profit, CR các vai giảm theo (R-12-2, R-12-8).
- Refund một phần: recompute net_profit cho cả đơn, tạo CR delta cho tất cả dòng vai active, kể cả vai không liên quan dịch vụ bị refund (R-12-7).
- Refund sau khi kỳ lương đã chốt: tạo CR delta âm (clawback), trạng thái CLAWBACK_PENDING, vào kỳ sau (R-11-6). parent_cr_id trỏ về dòng gốc.

### 4.5. Bỏ ba cách tính đá nhau

Sau G2 chỉ còn một nguồn sự thật là `commission_records`. Màn Income, Dashboard, màn duyệt HH đều đọc từ đây. Bỏ cách tính `currentRevenue × commissionRate` trong `dashboard.ts` và cách 5% hardcode trong màn tạo đơn. Bỏ các field deprecated `currentRevenue`, `commissionRate` khỏi đường tính.

---

## 5. Guard rails (không được làm hỏng)

- Không đụng giao diện các màn đang chạy tốt. Chỉ mở rộng màn nhập đơn và thay nguồn dữ liệu phía sau các màn HH.
- Không đổi hành vi đăng nhập, phân quyền theo vai ở route (đang đúng). Việc bịt lỗ hổng bảo mật là G3, không gộp vào đây.
- Mọi thay đổi entity quan trọng phải ghi audit_logs.
- Tiền luôn số nguyên VND, làm tròn nửa lên chỉ ở bước cuối khi ghi amount (R-10-4).
- Giữ khả năng chạy song song: nguồn nhập tay không được phụ thuộc iHOS hay website.

---

## 6. Thứ tự test sau khi làm

1. Tạo đơn tay đủ trường (có bảo hiểm, voucher, giá vốn, bác sĩ), kiểm net_profit và HH từng vai khớp tính tay theo ví dụ 4.1.
2. Đổi %HH trong Settings rồi tạo đơn mới, kiểm HH đổi theo (chứng minh engine đọc bảng tier).
3. Đơn có bảo hiểm cao tới mức net_profit âm, kiểm HH = 0.
4. Đơn nhiều dịch vụ, skip một dịch vụ, kiểm net_profit và HH giảm đúng.
5. Restart server, kiểm dữ liệu đơn và HH còn nguyên (chứng minh đã lưu DB thật).
6. KT duyệt một CR, NV xem màn Income thấy đúng số đã duyệt, Dashboard khớp cùng số.
7. Refund một phần đơn đã chốt kỳ, kiểm sinh dòng truy thu âm ở kỳ sau.

### Phân nhỏ công việc gợi ý cho dev

G1a dựng schema Postgres và migration. G1b cổng nhận đơn và mở rộng màn nhập đơn. G1c dọn mock và seed lại qua đường thật. G2a engine net_profit và sinh CR khi completed. G2b phân vai và snapshot %HH. G2c skipped, refund, clawback. G2d nối lại các màn HH vào nguồn thật.

---

## 7. Câu hỏi mở cần chốt

- %HH thật từng vai và hạng: chờ CEO khách hàng (G0). Engine dùng số seed tạm, không chặn dev.
- Ngưỡng lên hạng: chờ CEO (G0). Không chặn G1+G2 vì hạng hiện gán tay cho user.
- Giá vốn dịch vụ: ai nhập default_cost cho catalog? Đề xuất CEO hoặc KT nhập một lần trong Settings dịch vụ. Cần xác nhận.
- Mốc nào coi là "bác sĩ đã thực hiện" để gán vai BS khi nhập tay (không có webhook iHOS): đề xuất NV chọn bác sĩ ngay khi nhập đơn hoặc khi đánh dấu hoàn tất. Cần PM xác nhận cách vận hành thật.
