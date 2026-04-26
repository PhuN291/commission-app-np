import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, onClick, ...props }, ref) => (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        "mx-4 rounded-np-card bg-white",
        onClick && "cursor-pointer",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";
