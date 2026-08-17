import { ArrowLeft } from "@/components/np/icon";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DetailHeaderProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  trailing?: ReactNode;
  /**
   * Ẩn tiêu đề trên thanh. Dành cho trang đặt tiêu đề cỡ lớn trong thân trang:
   * tên chỉ hiện lên thanh khi người đọc đã cuộn qua khỏi tiêu đề lớn, nhờ vậy
   * tên không phải chen chỗ với hai nút và không bao giờ bị cắt.
   */
  titleVisible?: boolean;
  className?: string;
};

/**
 * Nút tròn nền xám của thanh đầu trang. Trang nào tự dựng nút cho ô `trailing`
 * thì dùng lại hằng này để không lệch kiểu với nút quay lại.
 */
export const DETAIL_HEADER_BTN =
  "flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-np-surface-sub text-np-ink transition-colors hover:bg-np-surface-pressed disabled:opacity-40";

export function DetailHeader({
  title,
  subtitle,
  onBack,
  trailing,
  titleVisible = true,
  className,
}: DetailHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center gap-1 border-b border-np-border bg-white px-3 py-2.5",
        className,
      )}
    >
      {onBack && (
        <button type="button" onClick={onBack} aria-label="Quay lại" className={DETAIL_HEADER_BTN}>
          <ArrowLeft size={18} strokeWidth={2.25} />
        </button>
      )}
      <div
        className={cn(
          "min-w-0 flex-1 px-2 transition-opacity duration-200",
          titleVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={titleVisible ? undefined : true}
      >
        <div className="truncate text-[16px] font-bold text-np-ink">{title}</div>
        {subtitle && (
          <div className="mt-0.5 text-[12px] font-medium text-np-text-muted">{subtitle}</div>
        )}
      </div>
      {/* Không có `trailing` thì để trống. Trước đây chỗ này tự đắp một nút ba
          chấm không gắn hành động nào, nút tròn làm nó lộ ra là bấm không ăn. */}
      {trailing}
    </div>
  );
}
