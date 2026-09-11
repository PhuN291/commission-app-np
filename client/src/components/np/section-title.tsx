import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "@/components/np/icon";
import { cn } from "@/lib/utils";

type SectionTitleProps = {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Optional Lucide icon rendered trước title. */
  icon?: LucideIcon;
};

export function SectionTitle({ children, action, className, style, icon: Icon }: SectionTitleProps) {
  return (
    <div
      className={cn(
        // Tiêu đề nằm TRONG khối trắng, dính liền với Card ngay bên dưới.
        // Khoảng cách với mục trước đẩy ra ngoài thành mt-2.5 để vẫn còn dải nền
        // ngăn giữa các mục, thay vì gộp mọi thứ thành một mảng trắng liền.
        "mt-2.5 flex items-center justify-between gap-3 bg-white px-4 pb-2.5 pt-4",
        className,
      )}
      style={style}
    >
      {/* Cỡ chữ phải LỚN hơn nội dung bên dưới (Row là 15px), nếu không thì tiêu
          đề chìm nghỉm và người đọc không thấy ranh giới giữa các mục. */}
      <span className="inline-flex items-center gap-1.5 text-[16px] font-bold tracking-[-0.2px] text-np-ink">
        {Icon && <Icon size={16} className="text-np-text-muted" />}
        {children}
      </span>
      {action}
    </div>
  );
}
