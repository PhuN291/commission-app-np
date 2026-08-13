import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type HintLabelProps = {
  children: ReactNode;
  /** Câu giải nghĩa hiện ra khi bấm vào nhãn. */
  hint: ReactNode;
  className?: string;
};

/**
 * Nhãn ngắn có gạch chấm ở dưới, bấm vào hiện câu giải nghĩa đầy đủ. Dùng khi nhãn
 * cần ngắn cho gọn nhưng người đọc vẫn phải tra được nó tính từ đâu, ví dụ
 * "Chi tiêu" thay cho "Chi tiêu 12 tháng".
 */
export function HintLabel({ children, hint, className }: HintLabelProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            // Gạch chấm là dấu hiệu quen thuộc cho "chữ này có giải nghĩa, bấm được".
            "cursor-pointer border-b border-dotted border-np-border-strong pb-px text-left transition-colors active:text-np-text-sub",
            className,
          )}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[250px] rounded-np-card border border-np-border px-3.5 py-3 text-[13px] font-medium leading-[1.45] text-np-text-sub"
      >
        {hint}
      </PopoverContent>
    </Popover>
  );
}
