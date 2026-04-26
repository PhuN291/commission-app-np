import { cn } from "@/lib/utils";

type ProgressProps = {
  value?: number;
  color?: string;
  height?: number;
  className?: string;
};

export function NPProgress({
  value = 0,
  color = "var(--color-np-brand)",
  height = 6,
  className,
}: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  return (
    <div
      className={cn("w-full overflow-hidden bg-[#E4E5E7]", className)}
      style={{ height, borderRadius: height / 2 }}
    >
      <div
        className="h-full transition-[width] duration-[400ms]"
        style={{
          width: `${clamped}%`,
          background: color,
          borderRadius: height / 2,
        }}
      />
    </div>
  );
}
