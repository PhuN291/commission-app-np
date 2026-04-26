# ADR-001: Kiến trúc gán Trưởng ca cho đơn HH

Status: Proposed
Date: 2026-04-25
Deciders: CEO Nguyên (anh Phú)
Tác giả: CTV audit

## 1. Context

App HH NP Clinic cần cơ chế tự động gán role Trưởng ca (TC) vào mỗi đơn để chia HH. Yêu cầu:

1. NP hiện tại vận hành 1 ekip duy nhất 8h-19h, 1 trưởng ca cố định (Hà). Day-1 setup phải đơn giản.
2. Tương lai: TC có thể turnover (Hà nghỉ), có thể empty (chưa tuyển được người thay), có thể scale thành nhiều ca (mở thêm ca tối hoặc 2 cơ sở).
3. Đơn cũ không được động khi cấu hình thay đổi (snapshot pattern).
4. Không phải đập đi xây lại khi NP thay đổi mô hình tổ chức.
5. Dev cost MVP hợp lý, scale 100 đơn/ngày trong 12 tháng tới.

Constraint:
- Đội dev hiện tại: nhỏ (anh Nguyên prompt + 1 dev merge code)
- Ngân sách dev: hữu hạn, ưu tiên ROI ngắn hạn
- Volume: 20-30 đơn/ngày hiện tại, mục tiêu 100/ngày
- Không có HR system bên ngoài để tích hợp

## 2. Decision (Proposed)

Chọn **Phương án F: Configurable Shift với mặc định 1 shift**.

Schema:
```
Shift:
   id, name, start_time, end_time, archived_at

ShiftHeadAssignment:
   id, shift_id, head_user_id (nullable), 
   effective_from, effective_to (nullable),
   set_by_user_id, note
```

Logic gán TC khi đơn tạo:
1. Lookup shift active có start_time <= order.created_at < end_time
2. Lookup ShiftHeadAssignment active của shift đó
3. Nếu head_user_id có giá trị: tạo row OrderRoleAssignment {role=TC, user=head}
4. Nếu NULL hoặc không match shift: không tạo row TC

Setup ngày 1: 1 row Shift "Cả ngày" (08:00-19:00), 1 row ShiftHeadAssignment với head=Hà.

## 3. Options Considered

### Option A: Full Shift-based (overengineered)

| Dimension | Assessment |
|---|---|
| Complexity | Cao |
| Dev cost MVP | 10-12 ngày |
| Scalability | Tốt cho multi-shift |
| Team familiarity | Trung bình |
| Future-proof | Tốt |

Pros: Linh hoạt cho mô hình nhiều ca từ đầu.
Cons: Day-1 setup yêu cầu config shift kể cả khi NP chỉ có 1 ekip. UX phức tạp không cần thiết.

### Option E: Single TC Config (simplest)

| Dimension | Assessment |
|---|---|
| Complexity | Thấp |
| Dev cost MVP | 3-5 ngày |
| Scalability | Kém |
| Team familiarity | Cao |
| Future-proof | Yếu |

Schema 1 bảng `TruongCaConfig` với current TC, lifecycle config.

Pros: Đơn giản nhất, dev nhanh.
Cons: Khi mai sau NP cần multi-shift (mở ca tối), phải refactor schema, migrate data. Cost migrate 15-20 ngày dev + risk hỏng data cũ.

### Option F: Configurable Shift, default 1 shift (recommend)

| Dimension | Assessment |
|---|---|
| Complexity | Trung bình |
| Dev cost MVP | 7-10 ngày |
| Scalability | Tốt |
| Team familiarity | Trung bình |
| Future-proof | Tốt |

Pros: Day-1 đơn giản (1 shift mặc định, hidden complexity). Future: thêm shift, đổi TC, tách ca không cần migrate. Snapshot pattern clean.
Cons: Day-1 schema vẫn có 2 bảng thay vì 1. Lookup logic time-based.

### Option G: Generic UserRoleAssignment (most flexible)

Schema generic:
```
UserRoleAssignment:
   user_id, role, scope_type, scope_id, effective_from, effective_to
```

Mọi role (Sale, ĐD, TC, BS) đều dùng chung pattern này. Scope có thể là shift, location, day-of-week, hoặc bất kì abstraction nào.

| Dimension | Assessment |
|---|---|
| Complexity | Rất cao |
| Dev cost MVP | 20-25 ngày |
| Scalability | Xuất sắc |
| Team familiarity | Thấp |
| Future-proof | Xuất sắc |

Pros: Linh hoạt tối đa. Pattern duy nhất cho mọi role.
Cons: Overengineered cho NP scale. Đội dev nhỏ khó implement đúng. Debug khó hơn.

### Option K: Recurring Schedule (cron-style)

Schema dùng pattern recurring:
```
ScheduleRule:
   day_of_week, start_time, end_time, head_user_id
```

Ví dụ: Mon-Fri 8-12 head=Hà, Mon-Fri 13-19 head=Hằng, Sat 8-19 head=Lan.

| Dimension | Assessment |
|---|---|
| Complexity | Cao |
| Dev cost MVP | 12-15 ngày |
| Scalability | Tốt cho variation theo tuần |
| Team familiarity | Trung bình |
| Future-proof | Tốt cho time-based rules |

Pros: Cover được variation theo ngày trong tuần.
Cons: NP hiện tại không có nhu cầu day-of-week. Overengineered.

### Option L: External HR Integration

Tích hợp với HR system (ví dụ Bizfly HR) đọc shift schedule.

Pros: Không build trong app, leverage tool có sẵn.
Cons: NP chưa có HR system. Build integration cost cao hơn build in-app. Phụ thuộc vendor bên ngoài.

### Option J: F + Extension Hooks (theoretical optimum)

F như trên + reserve column cho future rules:
```
ShiftHeadAssignment + extension:
   ...,
   priority (default 0),
   condition (JSON, optional, ví dụ {"day_of_week": ["mon", "tue"]})
```

Khi lookup: filter by condition nếu có, pick highest priority.

| Dimension | Assessment |
|---|---|
| Complexity | Trung bình-cao |
| Dev cost MVP | 8-10 ngày (chỉ thêm column, chưa implement logic) |
| Scalability | Xuất sắc khi cần |
| Future-proof | Xuất sắc |

Pros: F đơn giản hôm nay + sẵn sàng cho mai. Schema additive không cần migrate.
Cons: 2 column thừa trong DB ngày 1, có thể không bao giờ dùng (YAGNI).

## 4. Trade-off Analysis

### F vs E

E rẻ hơn 4-5 ngày dev. Nếu NP cam kết không bao giờ scale 2 ca (điều này khó cam kết với clinic đang phát triển), chọn E. Rủi ro: refactor mai sau cost 15-20 ngày + risk data, đắt hơn 4-5 ngày tiết kiệm hôm nay rất nhiều.

E là local optimum (ngắn hạn), F là global optimum (medium-term).

### F vs G

G là kiến trúc đẹp về mặt lý thuyết: pattern duy nhất cho tất cả role. Nhưng:
- Overengineered cho team dev nhỏ
- Maintenance khó: bug ở G ảnh hưởng tất cả role, không cô lập
- ROI: G tốn 2x cost của F để đổi lấy flexibility chưa chắc dùng tới

F là pragmatic optimum, G là academic optimum.

### F vs K

K (cron-style) tốt hơn F khi NP có biến động theo day-of-week. Hiện tại NP không có nhu cầu này. Khi cần, K có thể được add lên trên F (như Option J) mà không phá schema.

F là "now+near future", K là "far future contingency".

### F vs J

J = F + 2 column reserve. Cost thêm 1-2 ngày dev. Đổi lấy extension path không phải migrate.

Ranking từ "chắc chắn tốt" đến "chắc chắn không tốt":
1. **J (F + extension hooks)**: tối ưu lý thuyết, cost thêm ít
2. **F (recommend)**: tối ưu thực tiễn
3. **E**: chỉ tốt nếu cam kết không scale
4. **K**: chỉ tốt nếu cần day-of-week
5. **A**: overkill, không tệ nhưng UX phức tạp
6. **G**: academic, không phù hợp team nhỏ
7. **L**: phụ thuộc external, không khuyến nghị

## 5. Verdict thẳng thắn

Anh hỏi "F có phải giải pháp tối ưu nhất và không thể có giải pháp tốt hơn nữa k?"

**Câu trả lời: KHÔNG. F không phải tối ưu tuyệt đối**. Có 2 phương án về mặt kỹ thuật tốt hơn:

- **Option J (F + extension hooks)**: tốt hơn F khoảng 5-10% về future-proofing, cost thêm 1-2 ngày dev
- **Option G (Generic UserRoleAssignment)**: tốt hơn F về flexibility lý thuyết, cost gấp 2x

Nhưng "tối ưu" phải xét trong bối cảnh:
- Team dev nhỏ
- Scale 100 đơn/ngày trong 12 tháng tới
- Mô hình NP chưa cần day-of-week, multi-location
- Risk migrate sau cũng không quá lớn (snapshot pattern bảo vệ data cũ)

**F là sweet spot cost-benefit cho NP**. J chỉ thêm 5-10% benefit với 10-20% cost thêm, marginal.

Khuyến nghị: **chọn F**, nhưng nếu anh muốn "an tâm hơn nữa" thì có thể chọn **J** (F + 2 column reserve). Tôi không khuyến nghị G vì over-engineering không xứng với NP.

## 6. Consequences

### Khi chọn F

Easier:
- Day-1 setup nhanh, 1 màn hình config
- UX cho CEO đơn giản
- Đổi/empty/tách TC dễ thao tác trên app
- Đơn cũ an toàn nhờ snapshot

Harder:
- Nếu mai sau cần day-of-week scheduling, phải thêm column và refactor lookup logic (~3-5 ngày dev)
- Nếu mai sau cần multi-location, phải thêm location_id (~2-3 ngày dev)

Need to revisit:
- Sau 6 tháng vận hành: review xem có nhu cầu day-of-week, location, rule-based override không
- Nếu có: migrate sang J, không phải sang G

### Khi chọn J (alternative)

Easier hơn F:
- Mai sau add rule (day-of-week, location, etc.) chỉ là populate column có sẵn, không refactor
- Schema gần như "future-final"

Harder hơn F:
- Day-1 schema có 2 column "thừa" (priority, condition)
- Dev hiện tại có thể không hiểu mục đích, dễ implement sai

## 7. Action Items (nếu chọn F)

1. [ ] B1 update: thêm section về Shift, ShiftHeadAssignment vào entity dictionary
2. [ ] B2.1 update: thay phương án A bằng F trong Section 4 VĐ-3
3. [ ] B5 spec screens: thêm screen "Cấu hình ca làm việc" (settings)
4. [ ] B6 plan: estimate 7-10 ngày dev cho Shift module
5. [ ] Risk register: thêm "NP cần day-of-week sau 6 tháng" với mitigation = migrate sang J (~3-5 ngày)

## 8. Migration path nếu sau F muốn chuyển J

Nếu sau 6-12 tháng NP có nhu cầu rule phức tạp (day-of-week, location):

Bước 1: ALTER TABLE ShiftHeadAssignment ADD COLUMN priority INT DEFAULT 0
Bước 2: ALTER TABLE ShiftHeadAssignment ADD COLUMN condition JSON DEFAULT NULL
Bước 3: Update lookup logic: filter by condition + pick highest priority
Bước 4: Test với data cũ (priority=0, condition=NULL → behavior giống F cũ)

Cost: 3-5 ngày dev. Không migrate data, không downtime.

Đây là điểm mạnh của F: extension path clean.

## 9. Anh quyết định

Chốt 1 trong 3:

A. **F (recommend)**: 7-10 ngày dev, đủ cho NP 12-24 tháng tới
B. **J (paranoid future-proof)**: 8-12 ngày dev, cover nhu cầu mai sau không xác định
C. **Đề xuất khác**: anh có ý tưởng nào khác

Anh chọn xong, tôi update B1 + B2.1 batch một lần.
