# Tính hoa hồng thật, mẩu kế: kéo màn Trang chủ về số thật

Vừa rồi anh thấy màn Trang chủ hiện hoa hồng 1.750.000 và doanh số 35 triệu mà thêm bớt
đơn không đổi. Lý do là hai số đó là số chết, lấy từ một con số gắn cứng vào tài khoản chứ
không tính từ đơn. Mẩu này sửa đúng chỗ đó: kéo màn Trang chủ về dùng chung con số hoa hồng
thật mà màn Hoa hồng đang dùng.

Nghiệm thu, anh tự bấm: đăng nhập Mai, xem Trang chủ. Hoa hồng cá nhân phải bằng đúng số ở
màn Hoa hồng. Tạo thêm một đơn thì số ở Trang chủ tăng theo.

Một điều để anh không giật mình: sau mẩu này, số ở Trang chủ sẽ khác hẳn số cũ, nhỏ hơn
nhiều hoặc bằng 0 nếu tháng này chưa tạo đơn nào. Vì nó bỏ con số bịa 35 triệu và chỉ tính
đơn thật trong tháng. Đơn dữ liệu mẫu cũ là tháng 2 nên không tính vào tháng này. Anh tạo
vài đơn mới để thấy số nhảy. Số nhỏ lại chính là dấu hiệu nó đã thật.

---

## PROMPT MẨU NÀY (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Màn Income đã đọc hoa hồng thật từ commission_records (bước trước). Nhưng màn
Dashboard (server/dashboard.ts) vẫn tính hoa hồng và doanh số bằng công thức cũ
currentRevenue × commissionRate, là số cố định gắn vào tài khoản, không phản ánh đơn thật.
Việc mẩu này: đổi Dashboard sang đọc số thật, dùng đúng nguồn dữ liệu mà màn Income đang
dùng, để hai màn khớp nhau. KHÔNG đụng gì khác.

Scope đóng.

CHỈ LÀM (chỉ trong server/dashboard.ts):

1. getPersonalDashboard(userId):
   - Hoa hồng cá nhân (hero.commission): bằng tổng amount các commission_records của user
     trong kỳ hiện tại. Dùng storage.getCommissionRecordsByUser(userId, currentCycleId())
     rồi cộng amount. currentCycleId lấy từ server/income.ts.
   - Doanh số (hero.revenue và kpis.revenue): bằng tổng totalPrice các đơn của user trong
     kỳ hiện tại, loại đơn có appointmentStatus='cancelled'. Lọc đơn theo kỳ bằng cách so
     phần 'YYYY-MM' của order.createdAt (định dạng 'DD/MM/YYYY HH:mm') với kỳ hiện tại.
   - kpis.totalDeals: số đơn của user trong kỳ hiện tại (cùng cách lọc, loại cancelled).
   - kpis.closedDeals: trong số đó, đơn có visitStatus='completed'.
   - hero.commissionRate: cho hiển thị, lấy phần trăm tier Sale hiện tại của user qua
     storage.getEffectiveCommissionRate('sale', user.ranking, now) chia 100 (vd 500 → 5).
     Nếu null thì để 0.
   - BỎ mọi chỗ dùng user.currentRevenue và user.commissionRate để tính tiền.

2. getAdminDashboard(userId):
   - hero.clinicCommission: tổng amount mọi commission_records trong kỳ hiện tại (toàn
     phòng khám). Thêm helper storage nếu cần, ví dụ getAllCommissionRecordsByCycle(cycleId),
     implement trong DbStorage bằng Drizzle, stub [] trong MemoryStorage.
   - hero.clinicRevenue và kpis.totalRevenue: tổng totalPrice mọi đơn trong kỳ hiện tại,
     loại cancelled.
   - kpis.totalDeals, closedDeals: đếm theo kỳ hiện tại như trên.
   - BỎ chỗ tính clinicCommission/clinicRevenue bằng currentRevenue × rate.
   - leaderboard: GIỮ NGUYÊN như hiện tại trong mẩu này (vẫn lấy staffMembers). Sẽ đổi sang
     nhân viên thật ở mẩu dọn sau. Không đụng.

3. Giữ NGUYÊN hình dạng dữ liệu trả về (các field hero, kpis, pendingTasks, leaderboard giữ
   đúng tên và kiểu) để giao diện không vỡ. Chỉ đổi cách tính giá trị bên trong.

KHÔNG LÀM (để mẩu sau):
- KHÔNG đụng màn kế toán duyệt (/api/admin/commission-approval) — vẫn mock ở mẩu này.
- KHÔNG đụng leaderboard (bảng xếp hạng) — để mẩu dọn.
- KHÔNG xoá các file mock, KHÔNG bỏ field currentRevenue/commissionRate khỏi schema (chỉ
  ngừng dùng chúng trong dashboard.ts).
- KHÔNG đụng client/, KHÔNG đụng income.ts, KHÔNG đụng engine, KHÔNG đụng đăng nhập.

LƯU Ý KHÔNG LÀM HỎNG:
- Giữ đúng hình dạng response của /api/dashboard, nếu không Trang chủ sẽ vỡ.
- Cách lọc đơn theo kỳ phải chịu được order.createdAt định dạng lạ hoặc rỗng, không ném lỗi.
- Số tiền là số nguyên VND.
- Dashboard cá nhân và màn Income phải ra cùng một con số hoa hồng cho cùng một người trong
  cùng một kỳ. Đây là điểm test quan trọng nhất.

TEST SAU KHI LÀM (chạy và báo kết quả từng dòng):
1. npm run check (tsc) không lỗi.
2. Đăng nhập Mai, tạo một đơn mới trong tháng này.
3. Mở màn Hoa hồng (Income) ghi lại số tổng hoa hồng.
4. Mở màn Trang chủ (Dashboard): hoa hồng cá nhân phải BẰNG ĐÚNG số ở bước 3. Đây là bằng
   chứng hai màn đã dùng chung một nguồn số thật.
5. Tạo thêm một đơn nữa, mở lại Trang chủ: hoa hồng và doanh số tăng theo.
6. Restart server, số vẫn đúng.

NẾU GẶP MÂU THUẪN giữa các ràng buộc, DỪNG LẠI và hỏi trước khi tự mở rộng phạm vi.

TIÊU CHÍ HOÀN THÀNH: màn Trang chủ hiện hoa hồng và doanh số tính từ đơn thật trong kỳ,
khớp với màn Hoa hồng, và đổi khi thêm bớt đơn. Bảng xếp hạng tạm giữ như cũ. Báo lại con
số hoa hồng cá nhân của Mai ở cả hai màn để đối chiếu chúng bằng nhau.
```

---

Sau khi xong và mục test 4 đậu (Trang chủ khớp Hoa hồng), anh báo em. Còn lại hai mẩu để
khép phần tính hoa hồng: đổi màn kế toán duyệt sang số thật, rồi dọn sạch phần giả gồm cả
bảng xếp hạng đang để tên người ảo.
