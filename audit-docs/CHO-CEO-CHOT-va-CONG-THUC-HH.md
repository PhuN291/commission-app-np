# Danh sách chờ CEO chốt và công thức tính hoa hồng

Gửi kèm cho BA. Hai phần: công thức tính hoa hồng đang chạy trong code, và các quyết định chính sách
còn chờ CEO.

## Phần 1: Công thức tính hoa hồng hiện tại (đọc từ code thật)

Engine tính hoa hồng cho mỗi đơn theo các bước:

- Tổng niêm yết = tổng (đơn giá nhân số lượng) của mọi dịch vụ trong đơn.
- Tiền thực thu = tổng niêm yết trừ phần bảo hiểm trừ voucher.
- Giá vốn = tổng (giá vốn nhân số lượng), chỉ tính dịch vụ đã hoàn thành.
- Lãi ròng = tiền thực thu trừ giá vốn.
- Hoa hồng mỗi vai = lãi ròng (nếu âm thì tính 0) nhân phần trăm của vai đó.

Người hưởng trên một đơn: sale phụ trách, trưởng ca, bác sĩ. Phần trăm lấy theo vai và bậc, chốt tại
thời điểm gán vào đơn và có lưu lịch sử hiệu lực.

Trưởng ca thì đã rõ cách hưởng: tính trên tổng lãi ròng của cả phòng khám, phần trăm cố định và thấp
hơn sale, không theo bậc. Trong code, trưởng ca được gán vào mọi đơn nên cộng lại đúng bằng phần
trăm đó trên tổng lãi ròng.

Điểm cần lưu ý: cơ sở tính là lãi ròng, tức đã trừ giá vốn, bảo hiểm và voucher rồi mới nhân phần
trăm. Đây là mặc định đang nằm trong code, CEO chưa xác nhận chính thức. Nhiều nơi tính hoa hồng trên
doanh thu chứ không trên lãi ròng, nên chỗ này phải chốt.

Về số liệu hiện tại: giá vốn đang để 0 và bảo hiểm đang để 0 vì chờ HIS, nên tạm thời lãi ròng đang
bằng tiền thực thu.

## Phần 2: Các quyết định chờ CEO chốt

- Cơ sở tính hoa hồng: trên lãi ròng như code, hay trên doanh thu.
- Phần trăm hoa hồng cho từng vai và từng bậc.
- Ngưỡng thăng bậc cho sale và bác sĩ.
- Mức thưởng tự động khi đạt mục tiêu.
- Giá vốn từng dịch vụ, để tính được lãi ròng thật.
- Hoa hồng trên phần bảo hiểm BHYT: có tính không, tính trên phần nào.
- Xử lý khi hồ sơ BHYT bị xuất toán: thu hồi, cấn trừ kỳ sau, hay phòng khám chịu.
- Khi nào khóa sổ kỳ lương để chi.

Những cái này là chính sách kinh doanh, code không tự quyết được, cần CEO chốt để cấu hình số thật.
