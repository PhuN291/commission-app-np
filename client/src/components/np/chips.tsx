import { cn } from "@/lib/utils";

export type ChipItem = {
  key: string;
  label: string;
  count?: number;
};

type ChipsProps = {
  items: ChipItem[];
  active: string;
  onChange?: (key: string) => void;
  className?: string;
};

export function Chips({ items, active, onChange, className }: ChipsProps) {
  return (
    <div className={cn("scrollbar-hide flex gap-1.5 overflow-x-auto px-4 py-3", className)}>
      {items.map((it) => {
        const on = it.key === active;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange?.(it.key)}
            className={cn(
              "flex flex-shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-np-chip border px-3.5 py-[7px] text-[13px]",
              on
                ? "border-np-ink bg-np-ink font-bold text-white"
                : "border-np-border-strong bg-white font-semibold text-np-text-sub",
            )}
          >
            {it.label}
            {it.count != null && (
              <span
                className={cn(
                  "text-[12px] font-medium tabular-nums",
                  on ? "text-white/70" : "text-np-text-muted",
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
