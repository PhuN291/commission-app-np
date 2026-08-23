import { BellAlert, Robot, Search } from "@/components/np/icon";
import { cn } from "@/lib/utils";
import { IconButton } from "./icon-button";
import npMark from "@assets/np-brand/np-mark-trang.png";

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
      {/* Dấu nhận diện phòng khám, cắt từ bản logo khối dọc dành cho nền màu.
          Chỉ lấy phần HÌNH, bỏ phần chữ "Phòng khám Nguyên Phương" và dòng khẩu hiệu
          bên dưới: thanh đầu chỉ cao 56px, để nguyên khối dọc thì chữ còn khoảng 3px,
          không ai đọc được.
          Bản này vẽ bằng màu sáng nên đứng thẳng trên nền tối, không cần lót ô trắng. */}
      <img
        src={npMark}
        alt="Phòng khám Nguyên Phương"
        className="mr-0.5 h-[24px] w-auto flex-shrink-0 select-none"
      />
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
