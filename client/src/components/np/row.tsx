import type { ReactNode } from "react";
import { ChevronRight } from "@/components/np/icon";
import { cn } from "@/lib/utils";

type RowProps = {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  last?: boolean;
  className?: string;
};

export function Row({ leading, title, subtitle, meta, trailing, onClick, last, className }: RowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex min-h-[60px] items-center gap-3.5 px-4 py-3.5",
        onClick ? "cursor-pointer" : "cursor-default",
        !last && "np-divider",
        className,
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold leading-[1.35] text-np-ink">{title}</div>
        {subtitle && (
          <div className="mt-0.5 text-[13px] font-medium leading-[1.35] text-np-text-muted">
            {subtitle}
          </div>
        )}
        {meta}
      </div>
      {trailing}
    </div>
  );
}

export function Chev() {
  return <ChevronRight size={18} strokeWidth={2.25} className="text-np-text-muted" />;
}
