import { cn } from "@/lib/utils";

export function StatusBar({ dark = false, className }: { dark?: boolean; className?: string }) {
  const fg = dark ? "text-np-ink" : "text-white";
  const strokeFill = dark ? "#1A1C1D" : "#FFFFFF";
  return (
    <div
      className={cn(
        "flex h-[50px] flex-shrink-0 items-end justify-between pb-1 pl-7 pr-6",
        dark ? "bg-white" : "bg-transparent",
        fg,
        className,
      )}
    >
      <span className="text-[15px] font-bold tracking-[-0.2px]">9:41</span>
      <div className="flex items-center gap-[6px]">
        <svg width={18} height={11} viewBox="0 0 18 11" aria-hidden>
          <g fill={strokeFill}>
            <rect x="0" y="7" width="3" height="4" rx="0.5" />
            <rect x="5" y="5" width="3" height="6" rx="0.5" />
            <rect x="10" y="2.5" width="3" height="8.5" rx="0.5" />
            <rect x="15" y="0" width="3" height="11" rx="0.5" />
          </g>
        </svg>
        <svg width={16} height={11} viewBox="0 0 16 11" fill={strokeFill} aria-hidden>
          <path d="M8 1C5 1 2 2 0 4l2 2a8 8 0 0 1 12 0l2-2C14 2 11 1 8 1zm0 4c-1.5 0-3 .5-4 1.5L6 8a3 3 0 0 1 4 0l2-1.5C11 5.5 9.5 5 8 5zm0 3c-.8 0-1.5.3-2 .8L8 11l2-2.2C9.5 8.3 8.8 8 8 8z" />
        </svg>
        <svg width={26} height={12} viewBox="0 0 26 12" aria-hidden>
          <g fill="none" stroke={strokeFill}>
            <rect x="0.5" y="0.5" width="22" height="11" rx="3" />
            <rect x="2" y="2" width="19" height="8" rx="1.5" fill={strokeFill} />
          </g>
          <rect x="23" y="4" width="1.5" height="4" rx="0.75" fill={strokeFill} />
        </svg>
      </div>
    </div>
  );
}
