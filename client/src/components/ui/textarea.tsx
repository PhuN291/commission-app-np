import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // NP design system: bg gray, border-strong, rounded-np-button. Match Input.
        "flex min-h-[64px] w-full rounded-np-button border border-np-border-strong bg-np-surface-sub px-3 py-2 text-[14px] text-np-ink placeholder:text-np-text-muted transition-colors focus-visible:bg-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
