# Đợt 3 mẩu 4a: bỏ bốn màn giả

Bỏ bốn màn vỏ số bịa: Phân tích bác sĩ, Phân tích bệnh nhân, Trợ lý AI, Hiệu suất cá nhân.
GIỮ hai màn Phân tích tổng quan và Phân tích lịch hẹn (sẽ dựng lại bằng số thật ở mẩu sau,
mẩu này chưa đụng nội dung hai màn đó). CHỈ đụng client, không đụng server.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Bốn màn sau là vỏ giao diện với số bịa cứng, không gọi dữ liệu thật, bỏ đi:
- client/src/pages/analytics-doctors.tsx (Phân tích bác sĩ)
- client/src/pages/analytics-patients.tsx (Phân tích bệnh nhân)
- client/src/pages/ai-chat.tsx (Trợ lý AI)
- client/src/pages/performance.tsx (Hiệu suất cá nhân)
GIỮ hai màn analytics-overview.tsx (Phân tích tổng quan) và analytics-appointments.tsx (Phân tích
lịch hẹn) nguyên vẹn, mẩu này KHÔNG đụng nội dung hai màn đó. CHỈ làm phía client.

Làm:

1. Xóa bốn file: analytics-doctors.tsx, analytics-patients.tsx, ai-chat.tsx, performance.tsx.

2. client/src/App.tsx:
   - Bỏ bốn import: AiChat, Performance, AnalyticsDoctors, AnalyticsPatients.
   - Bỏ bốn route: /ai-chat, /performance, /analytics/doctors, /analytics/patients.
   - GIỮ: import AnalyticsOverview và AnalyticsAppointments; route /analytics, /analytics/overview,
     /analytics/appointments.

3. client/src/components/np/more-menu-sheet.tsx:
   - Bỏ mục "Hiệu suất cá nhân" (href /performance).
   - Bỏ mục "Trợ lý AI" (href /ai-chat).
   - Trong nhóm "Phân tích": bỏ hai mục con "Bác sĩ" (/analytics/doctors) và "Bệnh nhân"
     (/analytics/patients). GIỮ "Tổng quan" (/analytics/overview) và "Lịch hẹn"
     (/analytics/appointments). Nếu nhóm Phân tích còn lại hai mục thì giữ nhóm; cấu trúc nhóm
     không đổi.

4. Rà toàn client: nếu còn chỗ nào import hoặc link tới bốn màn đã xóa thì gỡ. Bỏ luôn import icon
   giờ không còn dùng (ví dụ icon Bot của Trợ lý AI) nếu không nơi nào khác dùng.

KHÔNG LÀM:
- KHÔNG đụng nội dung hai màn analytics-overview và analytics-appointments (dựng lại số thật ở mẩu sau).
- KHÔNG đụng server.

KHÔNG LÀM HỎNG:
- Trình biên dịch sạch.
- Các route và menu còn lại hoạt động bình thường.
- Hai màn Tổng quan và Lịch hẹn vẫn mở được (dù nội dung tạm thời vẫn là số cũ, sẽ thay sau).

TEST (báo rõ):
1. npm run check (tsc) sạch.
2. grep toàn client không còn import hay đường dẫn tới /ai-chat, /performance, /analytics/doctors,
   /analytics/patients; bốn file đã xóa.
3. Mở menu: không còn Hiệu suất cá nhân, Trợ lý AI, và trong Phân tích không còn Bác sĩ, Bệnh nhân.
4. Mở /analytics/overview và /analytics/appointments: vẫn vào được.

TIÊU CHÍ HOÀN THÀNH: bốn màn giả đã gỡ khỏi file, route và menu; hai màn giữ lại vẫn mở được; biên
dịch sạch. Báo lại kết quả test.
```

---

Xong mẩu này, em lên tiếp mẩu dựng màn Phân tích tổng quan bằng số thật (kèm sửa bảng xếp hạng trang
chủ về người thật), rồi màn Phân tích lịch hẹn. Anh chạy xong dán kết quả, em đọc code kiểm.
