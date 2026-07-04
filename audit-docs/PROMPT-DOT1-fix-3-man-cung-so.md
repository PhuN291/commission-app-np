# Vá đợt 1: ba màn cùng một con số hoa hồng

Việc này khép đợt 1. Sau khi gom hoa hồng về database, ba chỗ tính tổng đang lọc trạng thái
ba kiểu khác nhau nên ra ba số khác nhau cho cùng một người, cùng một kỳ:

- Trang chủ (dashboard): cộng amount của mọi commission_records, không lọc gì. Vì dòng truy
  thu mang dấu âm, nó bị trừ thẳng vào hoa hồng kiếm được.
- Bảng xếp hạng (leaderboard): bỏ mỗi trạng thái bị từ chối, vẫn cộng dòng truy thu âm.
- Màn thu nhập (income): bỏ mỗi dòng truy thu, vẫn cộng dòng bị từ chối và dòng hủy.

Hậu quả thấy được: nhân viên Mai có một dòng truy thu âm 30 nghìn, nên trang chủ và xếp hạng
hiển thị hoa hồng tháng của Mai bị trừ nhầm 30 nghìn, lệch với màn thu nhập. Đây đúng là cái
đợt 1 muốn diệt: cùng một số, hiện hai kiểu tùy màn.

Cách chữa: định nghĩa MỘT bộ lọc trạng thái dùng chung, áp cho cả ba màn, để ra cùng một con số.

---

## PROMPT (copy nguyên khung dưới giao Claude Code)

```
Bối cảnh: Sau khi gom hoa hồng về bảng commission_records, ba nơi tính tổng hoa hồng đang lọc
trạng thái khác nhau nên ra số khác nhau cho cùng một người cùng kỳ. Trang chủ (server/dashboard.ts)
cộng amount mọi bản ghi không lọc gì, nên dòng truy thu mang dấu âm bị trừ thẳng vào hoa hồng
kiếm được. Bảng xếp hạng (server/routes.ts, GET /api/leaderboard) chỉ bỏ trạng thái TU_CHOI,
vẫn cộng dòng truy thu âm. Màn thu nhập (server/income.ts) chỉ bỏ dòng CLAWBACK_PENDING, vẫn
cộng dòng TU_CHOI và CANCEL. Việc này: thống nhất một bộ lọc cho cả ba, để ra cùng một con số.

CHỈ LÀM bốn việc sau, không hơn:

1. shared/types.ts: thêm một định nghĩa dùng chung cho "trạng thái được tính vào tổng hoa hồng
   gross (kiếm được)". Gross gồm: TAM_TINH, CHO_DUYET, DUOC_DUYET, KHIEU_NAI. Loại ra:
   TU_CHOI (bị từ chối, không tính), CANCEL (hủy, không tính), CLAWBACK_PENDING (truy thu, là
   mục trừ riêng, không nằm trong gross). Xuất kèm một hàm kiểm tra, ví dụ isGrossCommission(status).

2. server/income.ts: chỗ cộng totalHh chỉ cộng khi bản ghi thuộc gross (dùng hàm ở việc 1).
   Cụ thể: hiện vòng lặp đã bỏ qua CLAWBACK_PENDING; nay bỏ cộng cả TU_CHOI và CANCEL vào
   totalHh. GIỮ NGUYÊN việc hiển thị: dòng bị từ chối vẫn nằm trong crGroups để nhân viên thấy
   trạng thái và khiếu nại; chỉ là không cộng tiền của nó vào totalHh. Truy thu vẫn hiện riêng
   (âm) như hiện tại, netHh vẫn bằng totalHh cộng thưởng phạt cộng truy thu.

3. server/dashboard.ts: cả ba chỗ cộng tổng amount commission_records đều lọc theo gross trước
   khi cộng: hoa hồng cá nhân kỳ hiện tại, hoa hồng cá nhân kỳ trước (dùng cho phần trăm tăng
   trưởng), và tổng hoa hồng toàn phòng khám của admin.

4. server/routes.ts, GET /api/leaderboard: thay điều kiện bỏ mỗi TU_CHOI bằng lọc theo gross
   (loại luôn CANCEL và CLAWBACK_PENDING).

KHÔNG LÀM (để đợt sau):
- KHÔNG đụng luồng duyệt hoa hồng, nó đã đúng.
- KHÔNG đụng client.
- KHÔNG sửa route từ chối hoa hồng thừa, KHÔNG sửa rò mã lỗi khi khiếu nại, KHÔNG lọc lại màn
  chi tiết đơn, KHÔNG thêm khóa chống khiếu nại trùng. Mấy cái đó thuộc đợt sau.

KHÔNG LÀM HỎNG:
- Truy thu vẫn vào netHh ở màn thu nhập dưới dạng âm, không được mất.
- Tiền là số nguyên đồng.
- Giữ hình dạng dữ liệu các API để giao diện không vỡ.

TEST (chạy và báo số rõ):
1. npm run check (tsc) sạch.
2. Trang chủ của Mai: hoa hồng cá nhân tháng KHÔNG còn bị trừ khoản truy thu 30 nghìn.
3. Con số đó BẰNG ĐÚNG totalHh ở màn thu nhập của Mai. Đây là test quan trọng nhất, báo cả
   hai số để đối chiếu bằng nhau.
4. Bảng xếp hạng: hoa hồng của Mai bằng đúng hai số trên, không bị trừ truy thu.
5. Màn thu nhập của Mai: khoản truy thu vẫn hiện riêng dưới dạng âm, netHh vẫn đúng bằng
   totalHh cộng thưởng phạt cộng truy thu.
6. Nếu có bản ghi bị từ chối của ai đó: không màn nào trong ba màn cộng nó vào tổng.
7. Restart server, các số trên vẫn đúng.

TIÊU CHÍ HOÀN THÀNH: trang chủ, bảng xếp hạng, màn thu nhập cùng ra một con số hoa hồng gross
cho cùng người cùng kỳ; truy thu vẫn là mục trừ riêng ở màn thu nhập. Báo lại ba con số của
Mai để thấy chúng bằng nhau.
```

---

Đây là mẩu vá gọn, một bộ lọc dùng chung cho ba màn. Xong, anh chạy test bước 3 (trang chủ
bằng màn thu nhập) rồi dán kết quả, em kiểm lại như mọi lần. Test này chính là cái lần trước
bị bỏ sót nên lỗi lọt lưới.
