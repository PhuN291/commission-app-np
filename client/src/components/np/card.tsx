import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, onClick, ...props }, ref) => (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        // Khối trắng chạy sát hai mép khung, không bo góc. Nội dung bên trong tự
        // giữ lề (Row có px-4) nên chữ không dính mép.
        "bg-white",
        onClick && "cursor-pointer",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";
