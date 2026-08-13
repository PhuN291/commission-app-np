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
    // Lề ngang của hàng là 6px, cộng với 10px lề trong của từng chip thành 16px,
    // nhờ vậy chữ chip đầu tiên vẫn thẳng hàng với nội dung còn lại của trang dù
    // chip không còn khung viền để làm mốc.
    <div className={cn("scrollbar-hide flex gap-0.5 overflow-x-auto px-1.5 py-2", className)}>
      {items.map((it) => {
        const on = it.key === active;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange?.(it.key)}
            className={cn(
              "flex flex-shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-np-chip px-2.5 py-1.5 text-[13px] transition-colors",
              // Chỉ mục đang chọn mới có nền xám. Các mục còn lại là chữ trần,
              // đỡ rối mắt và hàng lọc bớt chiếm chỗ.
              on
                ? "bg-np-surface-pressed font-bold text-np-ink"
                : "font-semibold text-np-text-sub hover:bg-np-surface-sub",
            )}
          >
            {it.label}
            {it.count != null && (
              <span
                className={cn(
                  "text-[12px] font-medium tabular-nums",
                  on ? "text-np-text-sub" : "text-np-text-muted",
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
