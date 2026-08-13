import { BellAlert, Robot, Search } from "@/components/np/icon";
import { cn } from "@/lib/utils";
import { IconButton } from "./icon-button";

type AppHeaderProps = {
  notifCount?: number;
  onSearch?: () => void;
  onBell?: () => void;
  onSparkle?: () => void;
  className?: string;
};

export function AppHeader({
  notifCount = 0,
  onSearch,
  onBell,
  onSparkle,
  className,
}: AppHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-14 items-center gap-2 bg-np-header px-3",
        className,
      )}
    >
      <button
        type="button"
        onClick={onSearch}
        className="flex h-9 flex-1 cursor-pointer items-center gap-[10px] rounded-np-button border-0 bg-np-header-hover px-3"
      >
        <Search size={18} strokeWidth={2.25} className="text-[#8A8A8A]" />
        <span className="text-[14px] font-medium text-[#8A8A8A]">Tìm kiếm</span>
      </button>
      <IconButton onClick={onSparkle} aria-label="AI">
        <Robot size={20} className="text-[#B5B5B5]" />
      </IconButton>
      <IconButton onClick={onBell} aria-label="Thông báo">
        <div className="relative">
          <BellAlert size={20} className="text-[#B5B5B5]" />
          {notifCount > 0 && (
            <div className="absolute -right-[3px] -top-[3px] flex h-4 min-w-4 items-center justify-center rounded-[9px] bg-[#E53E3E] px-1 text-[10px] font-bold leading-none text-white">
              {notifCount}
            </div>
          )}
        </div>
      </IconButton>
    </div>
  );
}
