import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
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
        "flex items-center justify-between px-5 pb-2 pt-[18px]",
        className,
      )}
      style={style}
    >
      <span className="inline-flex items-center gap-1.5 text-[13px] font-bold tracking-[-0.1px] text-np-ink">
        {Icon && <Icon size={14} strokeWidth={2.25} className="text-np-text-muted" />}
        {children}
      </span>
      {action}
    </div>
  );
}
