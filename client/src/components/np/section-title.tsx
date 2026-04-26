import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionTitleProps = {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function SectionTitle({ children, action, className, style }: SectionTitleProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-5 pb-2 pt-[18px]",
        className,
      )}
      style={style}
    >
      <span className="text-[13px] font-bold tracking-[-0.1px] text-np-ink">{children}</span>
      {action}
    </div>
  );
}
