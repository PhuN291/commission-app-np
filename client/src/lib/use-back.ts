import { useCallback, useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Số trang đã đi qua trong phiên này. Đặt ngoài component để sống xuyên suốt mọi
 * lần chuyển trang, chỉ về 0 khi tải lại app.
 */
let soTrangDaQua = 0;

/**
 * Đếm số trang đã đi qua. Gắn MỘT lần ở gốc app.
 *
 * Cần con số này để biết nút quay lại nên lùi trong lịch sử hay nhảy về trang
 * mặc định: người dùng mở thẳng đường dẫn chi tiết từ thông báo hoặc từ liên kết
 * dán vào thì lùi lịch sử sẽ rơi ra khỏi app.
 */
export function useTheoDoiDieuHuong() {
  const [duongDan] = useLocation();
  useEffect(() => {
    soTrangDaQua += 1;
  }, [duongDan]);
}

/**
 * Nút quay lại: lùi về đúng trang vừa xem, không phải trang cha cố định.
 *
 * Vào chi tiết khách từ danh sách tái khám mà bấm quay lại ra danh sách khách thì
 * người dùng mất chỗ đang làm dở. `duongDanDuPhong` chỉ dùng khi trang này là
 * trang đầu tiên của phiên, lúc đó lịch sử không có gì để lùi.
 */
export function useQuayLai(duongDanDuPhong: string) {
  const [, dieuHuong] = useLocation();
  return useCallback(() => {
    if (soTrangDaQua > 1) window.history.back();
    else dieuHuong(duongDanDuPhong);
  }, [dieuHuong, duongDanDuPhong]);
}
