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
        <Search size={18} className="text-np-header-placeholder" />
        <span className="text-[14px] font-medium text-np-header-placeholder">Tìm kiếm</span>
      </button>
      <IconButton onClick={onSparkle} aria-label="AI">
        <Robot size={20} className="text-np-header-fg" />
      </IconButton>
      <IconButton onClick={onBell} aria-label="Thông báo">
        <div className="relative">
          <BellAlert size={20} className="text-np-header-fg" />
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
