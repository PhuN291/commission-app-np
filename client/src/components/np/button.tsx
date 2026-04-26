import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
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
  primary: "border-0 bg-np-brand text-white hover:bg-np-brand-hover",
  dark: "border-0 bg-np-ink text-white hover:bg-np-ink-sub",
  ghost: "border border-np-border-strong bg-white text-np-ink hover:bg-np-surface-sub",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-4 text-[13px]",
  md: "h-10 px-4 text-[14px]",
  lg: "h-12 px-4 text-[14px]",
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
