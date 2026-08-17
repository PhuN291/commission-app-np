import { useState } from "react";
import { AvTimer, CalendarAddOn, X } from "@/components/np/icon";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NPButton } from "./button";
import { DatePicker } from "./date-picker";
import { TimePicker } from "./time-picker";

/** "YYYY-MM-DD" → "DD/MM/YYYY" cho chữ trên ô. */
function fmtNgay(s: string): string {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return d && m && y ? `${d}/${m}/${y}` : s;
}

type DateTimeFieldProps = {
  /** "YYYY-MM-DD". Rỗng = chưa chọn. */
  date: string;
  onDateChange: (v: string) => void;
  /** "HH:mm". Bỏ qua khi withTime = false. */
  time?: string;
  onTimeChange?: (v: string) => void;
  /** Có phần chọn giờ không. Tắt cho các ô chỉ cần ngày. */
  withTime?: boolean;
  /**
   * Chọn giờ hiện ở đâu. "sheet" là hộp trượt từ đáy, mặc định. Dùng "inline" khi
   * ô này đã nằm SẴN trong một hộp trượt: hộp lồng hộp làm rối tiêu điểm bàn phím
   * và chồng hai lớp nền mờ lên nhau.
   */
  timeAs?: "sheet" | "inline";
  /** "YYYY-MM-DD". Ngày trước mốc này không chọn được. */
  min?: string;
  placeholder?: string;
  className?: string;
};

/**
 * Ô chọn ngày (và giờ) dùng chung cho cả app.
 *
 * Chưa có ngày thì ô chỉ là một dòng "Chọn ngày". Chọn xong mới hiện nút xóa và
 * chỗ thêm giờ: chưa có ngày thì giờ không có nghĩa gì, bày sẵn ra chỉ tổ rối.
 */
export function DateTimeField({
  date,
  onDateChange,
  time = "",
  onTimeChange,
  withTime = true,
  timeAs = "sheet",
  min,
  placeholder = "Chọn ngày",
  className,
}: DateTimeFieldProps) {
  const [lichMo, setLichMo] = useState(false);
  const [gioMo, setGioMo] = useState(false);

  const chonGio = (v: string) => {
    onTimeChange?.(v);
    setGioMo(false);
  };

  const bangGio = (
    <TimePicker value={time} onChange={chonGio} />
  );

  return (
    <div className={className}>
      <div className="flex items-center gap-2 rounded-np-button border border-np-border-strong bg-white px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => {
            setLichMo((v) => !v);
            setGioMo(false);
          }}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <CalendarAddOn size={17} strokeWidth={2.25} className="flex-shrink-0 text-np-text-muted" />
          <span
            className={cn(
              "truncate text-[15px] font-bold tabular-nums",
              date ? "text-np-ink" : "text-np-text-muted",
            )}
          >
            {date ? fmtNgay(date) : placeholder}
          </span>
        </button>

        {date && (
          <>
            <button
              type="button"
              aria-label="Xóa ngày"
              onClick={() => {
                onDateChange("");
                onTimeChange?.("");
                setLichMo(false);
                setGioMo(false);
              }}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-np-surface-sub text-np-text-muted transition-colors active:bg-np-surface-pressed"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
            {withTime && (
              <button
                type="button"
                onClick={() => {
                  setGioMo((v) => !v);
                  setLichMo(false);
                }}
                className={cn(
                  "flex-shrink-0 rounded-np-button px-2.5 py-1 text-[14px] font-bold tabular-nums transition-colors active:bg-np-surface-sub",
                  time ? "text-np-ink" : "text-np-text-muted",
                )}
              >
                {time || "Thêm giờ"}
              </button>
            )}
          </>
        )}
      </div>

      {lichMo && (
        <div className="mt-4">
          <DatePicker
            value={date}
            min={min}
            onChange={(v) => {
              onDateChange(v);
              onTimeChange?.("");
              setLichMo(false);
              // Chọn xong ngày thì mở luôn chỗ giờ, đỡ một nhịp bấm.
              if (withTime) setGioMo(true);
            }}
          />
        </div>
      )}

      {withTime && timeAs === "inline" && gioMo && <div className="mt-4">{bangGio}</div>}

      {withTime && timeAs === "sheet" && (
        <Sheet open={gioMo} onOpenChange={setGioMo}>
          <SheetContent
            side="bottom"
            className="mx-auto max-w-[390px] rounded-t-np-sheet border-0 p-5 pt-3 [&>button]:hidden"
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-np-surface-pressed" />
            <div className="mb-4 flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-[16px] font-bold text-np-ink">
                <AvTimer size={18} strokeWidth={2.25} className="text-np-text-muted" />
                Chọn giờ
              </SheetTitle>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setGioMo(false)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-np-surface-sub text-np-text-sub"
              >
                <X size={16} strokeWidth={2.25} />
              </button>
            </div>

            {bangGio}

            <div className="mt-4">
              <NPButton
                tone="ghost"
                size="lg"
                onClick={() => {
                  onTimeChange?.("");
                  setGioMo(false);
                }}
                className="w-full justify-center"
              >
                Xóa giờ
              </NPButton>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
