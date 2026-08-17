import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Sáu tông ngữ nghĩa. Chọn theo Ý NGHĨA của nội dung, không chọn theo màu muốn nhìn:
 *
 * - neutral   nhãn thường, không mang trạng thái (chức danh, bậc, kỳ lương)
 * - info      việc đang chạy đúng tiến độ (đã xác nhận, đã nhắc, đang khám)
 * - attention cần người xử lý (chờ xác nhận, dời lịch, đến hạn hôm nay)
 * - success   kết thúc tốt (hoàn thành, đã duyệt)
 * - critical  kết thúc xấu hoặc mất tiền (không đến, hoàn tiền, trễ hạn)
 * - muted     đã đóng lại, cố ý chìm nhất (đã hủy)
 */
export type BadgeTone = "neutral" | "info" | "attention" | "success" | "critical" | "muted";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  children: ReactNode;
};

/**
 * Màu đọc từ token trong index.css, KHÔNG gõ hex ở đây.
 *
 * Trước đây bốn tông gõ thẳng hex vào file này nên bộ token màu trong index.css
 * nói một đằng còn badge hiện một nẻo, sửa token không ảnh hưởng gì tới badge.
 */
const TONES: Record<BadgeTone, string> = {
  neutral: "bg-np-badge-neutral-bg text-np-badge-neutral-fg",
  info: "bg-np-badge-info-bg text-np-badge-info-fg",
  attention: "bg-np-badge-attention-bg text-np-badge-attention-fg",
  success: "bg-np-badge-success-bg text-np-badge-success-fg",
  critical: "bg-np-badge-critical-bg text-np-badge-critical-fg",
  muted: "bg-np-badge-muted-bg text-np-badge-muted-fg",
};

export function Badge({ tone = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-np-badge px-2 py-[3px] text-[11px] font-semibold leading-[1.3] tracking-[0.1px]",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
