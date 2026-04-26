import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

const presetOptions = [
  { label: "Hôm nay", value: "today", days: 0 },
  { label: "Hôm qua", value: "yesterday", days: 1 },
  { label: "7 ngày qua", value: "last_7_days", days: 7 },
  { label: "30 ngày qua", value: "last_30_days", days: 30 },
  { label: "90 ngày qua", value: "last_90_days", days: 90 },
  { label: "Tháng này", value: "this_month", days: -1 },
  { label: "Tháng trước", value: "last_month", days: -2 },
  { label: "Quý này", value: "this_quarter", days: -3 },
  { label: "Năm nay", value: "this_year", days: -4 },
];

const MONTHS_VI = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatDateLabel(d: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function getPresetRange(preset: string): { from: Date; to: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = new Date(today);

  switch (preset) {
    case "today":
      return { from: new Date(today), to };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: y, to: y };
    }
    case "last_7_days": {
      const f = new Date(today);
      f.setDate(f.getDate() - 6);
      return { from: f, to };
    }
    case "last_30_days": {
      const f = new Date(today);
      f.setDate(f.getDate() - 29);
      return { from: f, to };
    }
    case "last_90_days": {
      const f = new Date(today);
      f.setDate(f.getDate() - 89);
      return { from: f, to };
    }
    case "this_month":
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to };
    case "last_month": {
      const f = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const t = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: f, to: t };
    }
    case "this_quarter": {
      const q = Math.floor(today.getMonth() / 3) * 3;
      return { from: new Date(today.getFullYear(), q, 1), to };
    }
    case "this_year":
      return { from: new Date(today.getFullYear(), 0, 1), to };
    default:
      return { from: new Date(today), to };
  }
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(d: Date, from: Date, to: Date) {
  return d >= from && d <= to;
}

function isToday(d: Date) {
  return isSameDay(d, new Date());
}

function isFutureDay(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d > today;
}

function formatButtonLabel(preset: string, from: Date, to: Date): string {
  const opt = presetOptions.find(o => o.value === preset);
  if (opt) return opt.label;
  if (isSameDay(from, to)) return formatDateLabel(from);
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  const sameYear = from.getFullYear() === to.getFullYear();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (sameMonth) {
    return `${months[from.getMonth()]} ${from.getDate()}–${to.getDate()}, ${from.getFullYear()}`;
  }
  if (sameYear) {
    return `${months[from.getMonth()]} ${from.getDate()} – ${months[to.getMonth()]} ${to.getDate()}, ${to.getFullYear()}`;
  }
  return `${formatDateLabel(from)} – ${formatDateLabel(to)}`;
}

interface DateRangeFilterProps {
  value?: string;
  onChange?: (value: string) => void;
}

export default function DateRangeFilter({ value = "last_30_days", onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [popupAlign, setPopupAlign] = useState<"left" | "right">("right");
  const ref = useRef<HTMLDivElement>(null);

  const initialRange = useMemo(() => getPresetRange(value), [value]);

  const [presetOpen, setPresetOpen] = useState(false);
  const [draftPreset, setDraftPreset] = useState(value);
  const [appliedPreset, setAppliedPreset] = useState(value);
  const [appliedFrom, setAppliedFrom] = useState<Date>(initialRange.from);
  const [appliedTo, setAppliedTo] = useState<Date>(initialRange.to);
  const [dateFrom, setDateFrom] = useState<Date>(initialRange.from);
  const [dateTo, setDateTo] = useState<Date>(initialRange.to);
  const [calMonth, setCalMonth] = useState(initialRange.to.getMonth());
  const [calYear, setCalYear] = useState(initialRange.to.getFullYear());
  const [selectingStart, setSelectingStart] = useState(true);

  useEffect(() => {
    const range = getPresetRange(value);
    setDateFrom(range.from);
    setDateTo(range.to);
    setDraftPreset(value);
    setCalMonth(range.to.getMonth());
    setCalYear(range.to.getFullYear());
  }, [value]);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const popupWidth = 340;
      if (rect.right < popupWidth + 16) {
        setPopupAlign("left");
      } else {
        setPopupAlign("right");
      }
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPresetOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePresetSelect = (preset: string) => {
    setDraftPreset(preset);
    const range = getPresetRange(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
    setCalMonth(range.to.getMonth());
    setCalYear(range.to.getFullYear());
    setPresetOpen(false);
  };

  const handleDayClick = (day: number) => {
    const clicked = new Date(calYear, calMonth, day);
    clicked.setHours(0, 0, 0, 0);
    if (isFutureDay(clicked)) return;

    if (selectingStart) {
      setDateFrom(clicked);
      if (clicked > dateTo) {
        setDateTo(clicked);
      }
      setSelectingStart(false);
      setDraftPreset("custom");
    } else {
      if (clicked < dateFrom) {
        setDateFrom(clicked);
      } else {
        setDateTo(clicked);
      }
      setSelectingStart(true);
      setDraftPreset("custom");
    }
  };

  const handleApply = () => {
    setAppliedPreset(draftPreset);
    setAppliedFrom(new Date(dateFrom));
    setAppliedTo(new Date(dateTo));
    if (draftPreset !== "custom") {
      onChange?.(draftPreset);
    } else {
      onChange?.(value);
    }
    setOpen(false);
  };

  const handleCancel = () => {
    setDateFrom(new Date(appliedFrom));
    setDateTo(new Date(appliedTo));
    setDraftPreset(appliedPreset);
    setCalMonth(appliedTo.getMonth());
    setCalYear(appliedTo.getFullYear());
    setOpen(false);
    setPresetOpen(false);
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    const today = new Date();
    if (calYear > today.getFullYear() || (calYear === today.getFullYear() && calMonth >= today.getMonth())) return;
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfWeek(calYear, calMonth);
  const draftLabel = presetOptions.find(o => o.value === draftPreset)?.label || "Tuỳ chọn";

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => { setOpen(!open); setPresetOpen(false); }}
        className="flex items-center gap-2 h-9 px-3.5 rounded-lg border border-[#d2d5d8] bg-white hover:bg-[#f6f6f7] transition-colors text-sm font-medium text-[#1a1c1d] shadow-sm whitespace-nowrap shrink-0"
        data-testid="button-date-range"
      >
        <Calendar className="h-4 w-4 text-[#8c9196]" />
        <span>{formatButtonLabel(appliedPreset, appliedFrom, appliedTo)}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-[#8c9196] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`absolute top-full mt-1 z-50 w-[340px] bg-white border border-[#d2d5d8] rounded-np-card shadow-xl animate-in fade-in-0 zoom-in-95 duration-100 ${popupAlign === "left" ? "left-0" : "right-0"}`}>
          <div className="p-4 space-y-4">
            <div className="relative">
              <button
                onClick={() => setPresetOpen(!presetOpen)}
                className="w-full flex items-center justify-between h-10 px-4 rounded-lg border border-[#d2d5d8] bg-white hover:bg-[#f6f6f7] transition-colors text-sm font-medium text-[#1a1c1d]"
                data-testid="button-preset-selector"
              >
                <span>{draftLabel}</span>
                <div className="flex flex-col">
                  <ChevronUp className="h-3 w-3 text-[#8c9196] -mb-0.5" />
                  <ChevronDown className="h-3 w-3 text-[#8c9196] -mt-0.5" />
                </div>
              </button>
              {presetOpen && (
                <div className="absolute left-0 top-full mt-1 w-full bg-white border border-[#d2d5d8] rounded-np-card shadow-lg py-1 z-50 max-h-[240px] overflow-y-auto">
                  {presetOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handlePresetSelect(option.value)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        option.value === draftPreset
                          ? "bg-[#f1f1f1] font-semibold text-[#1a1c1d]"
                          : "text-[#303030] hover:bg-[#f6f6f7]"
                      }`}
                      data-testid={`date-option-${option.value}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div
                onClick={() => setSelectingStart(true)}
                className={`flex-1 h-10 px-3 rounded-lg border text-sm flex items-center cursor-pointer transition-colors ${
                  selectingStart ? "border-[#1a1c1d] bg-[#f6f6f7] font-semibold" : "border-[#d2d5d8] hover:bg-[#f6f6f7]"
                }`}
                data-testid="input-date-from"
              >
                {formatDateLabel(dateFrom)}
              </div>
              <ArrowRight className="h-4 w-4 text-[#8c9196] shrink-0" />
              <div
                onClick={() => setSelectingStart(false)}
                className={`flex-1 h-10 px-3 rounded-lg border text-sm flex items-center cursor-pointer transition-colors ${
                  !selectingStart ? "border-[#1a1c1d] bg-[#f6f6f7] font-semibold" : "border-[#d2d5d8] hover:bg-[#f6f6f7]"
                }`}
                data-testid="input-date-to"
              >
                {formatDateLabel(dateTo)}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#f6f6f7] text-[#8c9196]" data-testid="button-cal-prev">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-bold text-[#1a1c1d]">
                  {MONTHS_VI[calMonth]} {calYear}
                </span>
                <button onClick={nextMonth} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#f6f6f7] text-[#8c9196]" data-testid="button-cal-next">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 border-t border-[#e8e8e8]">
                {DAYS_SHORT.map(d => (
                  <div key={d} className="h-8 flex items-center justify-center text-[11px] font-bold text-[#8c9196] uppercase">
                    {d}
                  </div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const d = new Date(calYear, calMonth, day);
                  d.setHours(0, 0, 0, 0);
                  const isStart = isSameDay(d, dateFrom);
                  const isEnd = isSameDay(d, dateTo);
                  const inRange = isInRange(d, dateFrom, dateTo);
                  const isTodayDate = isToday(d);
                  const future = isFutureDay(d);
                  const isStartAndEnd = isStart && isEnd;

                  let bgClass = "";
                  let textClass = "text-[#303030]";
                  let roundClass = "";
                  let hoverClass = "hover:bg-[#f0f0f0]";

                  if (future) {
                    textClass = "text-[#d2d5d8]";
                    hoverClass = "cursor-not-allowed";
                  } else if (isStartAndEnd) {
                    bgClass = "bg-[#1a1c1d]";
                    textClass = "text-white font-bold";
                    roundClass = "rounded-lg";
                    hoverClass = "";
                  } else if (isStart) {
                    bgClass = "bg-[#e8e8e8]";
                    roundClass = "rounded-l-lg";
                    hoverClass = "";
                    textClass = "text-[#1a1c1d] font-bold";
                  } else if (isEnd) {
                    bgClass = "bg-[#e8e8e8]";
                    roundClass = "rounded-r-lg";
                    hoverClass = "";
                    textClass = "text-[#1a1c1d] font-bold";
                  } else if (inRange) {
                    bgClass = "bg-[#e8e8e8]";
                    textClass = "text-[#1a1c1d]";
                    hoverClass = "";
                  } else if (isTodayDate) {
                    textClass = "text-[#1a1c1d] font-bold";
                  }

                  return (
                    <button
                      key={day}
                      onClick={() => handleDayClick(day)}
                      disabled={future}
                      className={`h-10 w-full flex items-center justify-center text-sm transition-colors ${bgClass} ${textClass} ${roundClass} ${hoverClass}`}
                      data-testid={`cal-day-${day}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-[#d2d5d8] flex items-center justify-between">
            <button
              onClick={handleCancel}
              className="h-9 px-4 rounded-lg border border-[#d2d5d8] text-sm font-medium text-[#1a1c1d] hover:bg-[#f6f6f7] transition-colors"
              data-testid="button-date-cancel"
            >
              Đóng
            </button>
            <button
              onClick={handleApply}
              className="h-9 px-5 rounded-lg bg-[#1a1c1d] text-white text-sm font-bold hover:bg-[#2a2c2d] transition-colors"
              data-testid="button-date-apply"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
