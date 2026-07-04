# Đặc tả nghiệp vụ NP Commission (chốt cùng CEO)

Tài liệu sống. Mỗi luồng chốt xong ghi vào đây kèm bảng gap so với app hiện tại. Dùng làm nguồn sự
thật cho nghiệm thu và cho các prompt sửa code.

Quy ước gap: KHỚP (app làm đúng) | THIẾU (chưa có, cần làm) | LỆCH (làm khác, cần sửa) | CHỜ iHOS
(phụ thuộc tích hợp) | TƯƠNG LAI (ghi nhận, chưa làm vội).

---

## Phần 1: Vòng đời đơn hàng (đã chốt)

### Luồng chuẩn

1. Tạo đơn. Ai tạo cũng được (sale, lễ tân). Khi tạo có ô "nhân viên phụ trách" tách khỏi người
   tạo: người tạo để truy vết, người phụ trách là người được tính hoa hồng sale. Mặc định người
   phụ trách là người đang đăng nhập nếu họ là sale. Được phép để trống.
2. Khách tự đến (walk-in) không có sale chốt thì để trống người phụ trách. Khi đó hoa hồng sale của
   đơn đó bằng không. Bác sĩ và trưởng ca vẫn hưởng phần của họ như thường.
3. Đơn đi qua các trạng thái: chờ xác nhận, đã xác nhận, đang khám, hoàn thành, hoặc nhánh hủy,
   vắng, hoàn tiền.
4. Hoa hồng theo ba mức gắn vòng đời: tạm tính (khi có đơn, là dự kiến, tự rớt nếu đơn hủy hoặc
   vắng hoặc hoàn tiền), chờ duyệt (khi đơn hoàn thành), chính thức để chi (khi kế toán duyệt và
   tiền đã thực về).
5. Thu tiền và bảo hiểm do iHOS quản. App không tự làm thu tiền, chỉ lấy tín hiệu từ iHOS là đơn đã
   thu đủ chưa và phần bảo hiểm về chưa. Phần khách trả đủ điều kiện chi khi duyệt; phần bảo hiểm
   chỉ chuyển sang chính thức để chi khi tiền bảo hiểm về. Khi chưa nối iHOS thì tạm coi đơn hoàn
   thành là đã thu.
6. Người hưởng hoa hồng trên một đơn: sale phụ trách, trưởng ca, bác sĩ. Bác sĩ hưởng theo dịch vụ
   bán hoặc chỉ định, chờ iHOS gán bác sĩ vào đơn.
7. Trưởng ca: hiện một trưởng ca full-time nên tự gán vào mọi đơn. Khi có nhiều trưởng ca hoặc
   part-time thì chuyển sang gán theo ca trực.

### Bảng gap so với app hiện tại

| Hạng mục | Nên có | App đang có | Gap | Khi nào làm |
|---|---|---|---|---|
| Người tạo vs người phụ trách | Tách hai vai, có ô chọn người phụ trách, cho để trống | Người tạo cũng là người hưởng (gộp một) | LỆCH và THIẾU ô chọn | Làm được ngay, app đã có sẵn cột người phụ trách |
| Walk-in không sale | Để trống người phụ trách, hoa hồng sale bằng không | Luôn gán người tạo | LỆCH | Làm cùng mục trên |
| Ba mức hoa hồng | Tạm tính, chờ duyệt, chính thức | Đã có ba mức trạng thái | KHỚP (cần kiểm tạm tính tự rớt khi hủy) | Kiểm ở phần hoa hồng |
| Chính thức gắn đã thu tiền | Chỉ chi khi tiền về | Chưa gắn tín hiệu đã thu | THIẾU | CHỜ iHOS |
| Thu tiền và bảo hiểm | Lấy số từ iHOS | App đang trừ bảo hiểm khỏi doanh thu nhưng chưa có tín hiệu đã thu | CHỜ iHOS | Đợt 4 |
| Gán bác sĩ vào đơn | Bác sĩ hưởng theo dịch vụ | Chưa gán bác sĩ | CHỜ iHOS | Đợt 4 |
| Trưởng ca theo ca | Gán theo ca khi nhiều trưởng ca | Tự gán mọi đơn | TƯƠNG LAI | Khi có nhiều trưởng ca, nền dữ liệu đã sẵn |

### Việc làm được ngay không cần iHOS

Tách người tạo và người phụ trách, thêm ô chọn người phụ trách khi tạo đơn (cho để trống), hoa hồng
sale tính theo người phụ trách. App đã có sẵn cột riêng nên không phải đẻ thêm cấu trúc.

### Cần kiểm thêm ở phần hoa hồng

Hoa hồng tạm tính có tự loại khi đơn hủy, vắng, hoàn tiền hay không.
