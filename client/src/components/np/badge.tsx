import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "success" | "attention" | "critical";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  children: ReactNode;
};

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-[#E7E7E7] text-np-ink",
  success: "bg-[#E5EFEB] text-[#0B6B56]",
  attention: "bg-[#F4ECD9] text-[#8A6300]",
  critical: "bg-[#F5DCD9] text-[#8F2A1E]",
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
