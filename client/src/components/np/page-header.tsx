import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-3 px-5 pb-4 pt-[22px]", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="m-0 text-[26px] font-bold leading-[1.1] tracking-[-0.5px] text-np-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[13px] font-medium text-np-text-muted">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
