import { ArrowLeft, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DetailHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  trailing?: ReactNode;
  className?: string;
};

export function DetailHeader({ title, subtitle, onBack, trailing, className }: DetailHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center gap-1 border-b border-np-border bg-white px-2 py-3.5",
        className,
      )}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại"
          className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-np-button border-0 bg-transparent hover:bg-np-surface-sub"
        >
          <ArrowLeft size={22} strokeWidth={2.25} className="text-np-ink" />
        </button>
      )}
      <div className="min-w-0 flex-1 px-1">
        <div className="truncate text-[16px] font-bold text-np-ink">{title}</div>
        {subtitle && (
          <div className="mt-0.5 text-[12px] font-medium text-np-text-muted">{subtitle}</div>
        )}
      </div>
      {trailing ?? (
        <button
          type="button"
          aria-label="Tùy chọn"
          className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-np-button border-0 bg-transparent hover:bg-np-surface-sub"
        >
          <MoreHorizontal size={22} strokeWidth={2.25} className="text-np-ink" />
        </button>
      )}
    </div>
  );
}
