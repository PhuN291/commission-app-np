import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/queryClient";
import { DEFAULT_RUNTIME_SETTINGS, type RuntimeSettings } from "@shared/system-settings";

/**
 * Ngưỡng vận hành giao diện tự tính (số phút tính trễ hẹn...), đọc từ cấu hình hệ
 * thống để khớp với con số máy chủ đếm ở Trang chủ.
 *
 * Chưa tải xong hoặc tải lỗi thì trả mặc định (trễ 15 phút) thay vì undefined: danh
 * sách đơn vẫn lọc "Khách trễ" được ngay, không chớp về 0 rồi mới hiện số.
 */
export function useRuntimeSettings(): RuntimeSettings {
  const { data } = useQuery<RuntimeSettings>({
    queryKey: ["/api/settings/runtime"],
    queryFn: async () => {
      const res = await authFetch("/api/settings/runtime");
      if (!res.ok) throw new Error("fetch_failed");
      return res.json();
    },
    // Ngưỡng hiếm khi đổi, không cần tải lại mỗi lần vào trang như mặc định của app.
    staleTime: 5 * 60_000,
    refetchOnMount: true,
  });
  return { ...DEFAULT_RUNTIME_SETTINGS, ...data };
}
