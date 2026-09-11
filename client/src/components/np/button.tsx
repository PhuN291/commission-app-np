import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { LucideIcon } from "@/components/np/icon";
import { cn } from "@/lib/utils";

export type ButtonTone = "primary" | "dark" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  icon?: LucideIcon;
  children?: ReactNode;
};

const TONE_CLASSES: Record<ButtonTone, string> = {
  // Nút chính màu đen, trùng với tone dark và nút xác nhận trong hộp thoại (--primary cũng
  // là màu ink), để cả app chỉ có một kiểu nút đen. Teal để dành cho trạng thái đang chọn.
  primary: "border-0 bg-np-ink text-white hover:bg-np-ink-sub",
  dark: "border-0 bg-np-ink text-white hover:bg-np-ink-sub",
  // Bóng rất nhẹ để ô trắng nổi khỏi nền xám, bấm xuống thì tắt bóng cho cảm
  // giác nút lún vào. Nền trắng viền xám trơn nằm trên nền #F1F1F1 nhìn khá phẳng.
  ghost:
    "border border-np-border-strong bg-white text-np-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-shadow hover:bg-np-surface-sub active:shadow-none",
};

// Thấp hơn bậc cũ 2 tới 4px cho gọn gàng hơn. Cỡ chữ giữ nguyên nên nút chỉ mỏng
// đi chứ chữ không bị bóp.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-[30px] px-4 text-[13px]",
  md: "h-9 px-4 text-[14px]",
  lg: "h-11 px-4 text-[14px]",
};

export const NPButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ tone = "primary", size = "md", icon: Icon, className, children, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-np-button font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {Icon && <Icon size={16} strokeWidth={2.2} />}
      {children}
    </button>
  ),
);
NPButton.displayName = "NPButton";
