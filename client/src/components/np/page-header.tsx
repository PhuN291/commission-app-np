import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Nội dung phụ xếp ngay dưới dòng phụ, ví dụ dải nhãn trạng thái. */
  children?: ReactNode;
  /**
   * Ghi đè kiểu chữ của tiêu đề. Dùng khi tiêu đề là dữ liệu độ dài thay đổi
   * (ví dụ tên khách) nên phải hạ cỡ chữ để không xuống dòng.
   */
  titleClassName?: string;
  /**
   * Trang chi tiết cần biết tiêu đề đã cuộn khuất chưa để đưa tên lên thanh trên.
   * Truyền ref vào đây để theo dõi chính thẻ h1.
   */
  titleRef?: Ref<HTMLHeadingElement>;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  action,
  children,
  titleRef,
  titleClassName,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-4 pb-4 pt-[22px]", className)}>
      <div className="min-w-0 flex-1">
        <h1
          ref={titleRef}
          className={cn(
            "m-0 break-words text-[26px] font-bold leading-[1.1] tracking-[-0.5px] text-np-ink",
            titleClassName,
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[13px] font-medium text-np-text-muted">{subtitle}</p>
        )}
        {children}
      </div>
      {action}
    </div>
  );
}
