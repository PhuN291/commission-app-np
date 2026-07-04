# Đợt 3 mẩu 3: nối Settings (Auto Rule + Kì lương) vào database

Trong màn Cài đặt, nhóm Auto Rule thưởng (mục 6) và nhóm Kì lương (mục 7) sửa được nhưng đang
lưu trong bộ nhớ (server/settings.ts), nên CEO chỉnh xong restart server là mất, về mặc định.
Việc mẩu này: nối hai nhóm đó vào database cho bền. CHỈ làm phần nối database.

Lưu ý hiện trạng: nhóm Auto Rule hiện chưa có nơi nào trong máy chủ đọc để tự sinh thưởng (chưa
có engine chạy theo nó), nên đây là lưu cấu hình bền, chưa phải đang tính tiền. Vẫn cần bền vì
khi làm engine sinh thưởng sau này nó sẽ đọc từ đây, và kì lương cũng cần bền.

Phần thu gọn các nhóm cài đặt chỉ-để-xem hoặc còn trống (Ranking, Vai trò, Ca, Tái khám, Nhắc
lịch Zalo, Audit log) KHÔNG nằm trong mẩu này, làm riêng sau.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Hai nhóm cài đặt Auto Rule thưởng và Kì lương đang lưu in-memory trong server/settings.ts
(một Map autoRules và một biến payCycle), nên mất khi restart server. Các route đọc ghi chúng là
GET và PATCH /api/admin/settings/auto-rules, GET và PATCH /api/admin/settings/pay-cycle (trong
server/routes.ts). Việc mẩu này: chuyển hai nhóm này sang database để bền qua restart. CHỈ làm
phần này.

Làm theo thứ tự, test xong phần này mới sang phần sau. Nếu gặp mâu thuẫn, dừng và hỏi.

PHẦN 1 — Thêm hai bảng vào shared/schema.ts.
- Bảng auto_rules: cột key (text, duy nhất, ví dụ "target_bonus"), active (boolean), target_pct
  (số nguyên), bonus_pct (số thực, cho phép số lẻ ví dụ 0.5), updated_at (timestamp), updated_by_user_id
  (số nguyên, cho phép null). Kèm kiểu và insert schema như các bảng khác.
- Bảng pay_cycle_settings: một dòng singleton, cột deadline_day (số nguyên), cap_warning_pct (số
  thực), updated_at (timestamp), updated_by_user_id (số nguyên null). Lưu ý editWindowDays và
  lockAfterDays là hằng cứng 30, KHÔNG lưu vào bảng, giữ trong mã khi dựng dữ liệu trả về.

PHẦN 2 — Thêm thao tác đọc ghi vào storage (IStorage + DbStorage chạy DB thật; MemoryStorage stub).
- listAutoRules, getAutoRule(key), updateAutoRule(key, patch, actorUserId).
- getPayCycle, updatePayCycle(patch, actorUserId).
Các hàm này thay cho hàm cùng tên đang ở server/settings.ts.

PHẦN 3 — Bốn route đọc ghi từ database.
Đổi GET và PATCH /api/admin/settings/auto-rules(/:key) và GET và PATCH /api/admin/settings/pay-cycle
sang gọi storage ở phần 2, bỏ gọi server/settings.ts.
- GIỮ NGUYÊN requireRole hiện có của các route này (CEO được sửa, trưởng ca và kế toán được xem).
- GIỮ NGUYÊN hình dạng dữ liệu JSON trả về để màn Cài đặt không vỡ. Cụ thể:
  Auto Rule trả về gồm: key, active, targetPct, bonusPct, updatedAt (dạng số mili giây, lấy từ
  timestamp .getTime()), updatedByUserId. Pay cycle trả về gồm: deadlineDay, editWindowDays (cứng
  30), lockAfterDays (cứng 30), capWarningPct, updatedAt (số mili giây), updatedByUserId.

PHẦN 4 — Seed giá trị mặc định vào database (idempotent).
Trong server/seed.ts, nếu chưa có thì tạo: một auto_rule key "target_bonus" (active true, targetPct
100, bonusPct 5), và một dòng pay_cycle_settings (deadlineDay 5, capWarningPct 10). Có guard để
không tạo trùng khi seed chạy lại.

PHẦN 5 — Bỏ store in-memory.
Sau khi mọi nơi đọc database, bỏ phần lưu in-memory trong server/settings.ts (Map autoRules và biến
payCycle, cùng các hàm cũ). Nếu file còn giữ kiểu hoặc hằng đang dùng nơi khác thì giữ lại phần đó;
nếu file rỗng thì xóa và bỏ import. Đảm bảo không còn nơi nào import hàm cũ từ server/settings.ts.

KHÔNG LÀM (mẩu hoặc đợt sau):
- KHÔNG đụng sáu nhóm cài đặt chỉ để xem hoặc còn trống (Ranking, Vai trò, Ca, Tái khám, Nhắc lịch
  Zalo, Audit log). Việc thu gọn giao diện các nhóm đó làm riêng sau.
- KHÔNG đụng hoa hồng, tái khám, đa nguồn.
- KHÔNG đụng client trừ khi hình dạng dữ liệu buộc phải đổi; nếu buộc thì đổi tối thiểu. Mục tiêu
  là client màn Cài đặt chạy y như cũ.

KHÔNG LÀM HỎNG:
- Màn Cài đặt vẫn đọc và lưu được Auto Rule và Kì lương như trước (hình dạng JSON giữ nguyên).
- CEO sửa xong rồi restart server thì giá trị vẫn còn (đây là mục tiêu chính).
- Quyền giữ nguyên: CEO sửa được, trưởng ca và kế toán chỉ xem.
- Trình biên dịch sạch.

TEST XƯƠNG SỐNG (làm cuối, báo kết quả rõ):
1. npm run check (tsc) sạch.
2. Đăng nhập CEO, vào Cài đặt, sửa Auto Rule (đổi targetPct, bonusPct, bật tắt active) và lưu; sửa
   Kì lương (đổi deadlineDay, capWarningPct) và lưu.
3. Restart server. Vào lại Cài đặt: các giá trị vừa sửa VẪN CÒN (không về mặc định).
4. Đăng nhập một tài khoản trưởng ca hoặc kế toán: xem được, không có nút sửa hoạt động.
5. grep xác nhận không còn nơi nào dùng store in-memory cũ trong server/settings.ts.

TIÊU CHÍ HOÀN THÀNH: Auto Rule và Kì lương lưu trong database, sửa xong bền qua restart; màn Cài
đặt chạy như cũ; quyền giữ nguyên; biên dịch sạch. Báo lại kết quả test.
```

---

Xong việc này, phần Settings còn một mẩu nhẹ là thu gọn các nhóm chỉ-để-xem hoặc còn trống cho đỡ
rối, nhưng cái đó đụng giao diện anh đã dựng nên em sẽ hỏi anh cách làm trước. Anh chạy prompt này
xong dán kết quả, em đọc code kiểm như mọi lần.
