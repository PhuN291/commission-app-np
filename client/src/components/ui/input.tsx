import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // NP design system: bg gray, border-strong, rounded-np-button.
          // Focus: bg-white + ring brand-ink để phân biệt rõ field active.
          "flex h-10 w-full rounded-np-button border-0 bg-np-surface-sub px-3 py-1 text-[14px] text-np-ink transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-np-ink placeholder:text-np-text-muted focus-visible:bg-np-surface-pressed focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
