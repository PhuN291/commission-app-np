import { useEffect, useRef } from "react";
import { Check } from "@/components/np/icon";
import { cn } from "@/lib/utils";

/** Khung giờ phòng khám nhận lịch, cách nhau 30 phút, nghỉ trưa 11:30 tới 13:00. */
export const KHUNG_GIO = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

type TimePickerProps = {
  /** "HH:mm". Rỗng = chưa chọn. */
  value: string;
  onChange: (v: string) => void;
  slots?: string[];
  className?: string;
};

/**
 * Chọn giờ hẹn: danh sách dọc, mỗi giờ một dòng, tự cuộn tới giờ đang chọn.
 *
 * Trước đây là lưới 4 cột chip vuông. Lưới nhìn thì gọn nhưng mắt phải quét cả
 * hai chiều mới dò ra giờ cần, còn danh sách dọc thì đọc một mạch từ sáng tới
 * chiều, đúng thứ tự người ta nghĩ về thời gian.
 */
export function TimePicker({ value, onChange, slots = KHUNG_GIO, className }: TimePickerProps) {
  const hopRef = useRef<HTMLDivElement>(null);

  // Mở ra là thấy ngay giờ đang chọn, không phải cuộn tìm. Chưa chọn gì thì về
  // đầu danh sách: hộp trượt tự đưa tiêu điểm xuống nút cuối làm trình duyệt kéo
  // danh sách xuống đáy, mở ra thấy ngay 17:00 trong khi phòng khám mở từ 8 giờ.
  useEffect(() => {
    const hop = hopRef.current;
    if (!hop) return;
    if (!value) {
      hop.scrollTop = 0;
      return;
    }
    const dong = hop.querySelector<HTMLElement>(`[data-gio="${value}"]`);
    if (dong) hop.scrollTop = dong.offsetTop - hop.clientHeight / 2 + dong.clientHeight / 2;
  }, [value]);

  return (
    <div
      ref={hopRef}
      className={cn(
        "scrollbar-hide max-h-[240px] overflow-y-auto rounded-np-button bg-np-surface-sub py-1",
        className,
      )}
    >
      {slots.map((gio) => {
        const chon = gio === value;
        return (
          <button
            key={gio}
            type="button"
            data-gio={gio}
            onClick={() => onChange(gio)}
            className={cn(
              "flex w-full items-center justify-between px-4 py-2.5 text-left text-[15px] tabular-nums transition-colors",
              chon ? "font-bold text-np-ink" : "font-medium text-np-text-sub active:bg-np-surface-pressed",
            )}
          >
            {gio}
            {chon && <Check size={16} strokeWidth={3} className="text-np-ink" />}
          </button>
        );
      })}
    </div>
  );
}
