import { Search } from "@/components/np/icon";
import { cn } from "@/lib/utils";

type SearchFieldProps = {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  className?: string;
};

export function SearchField({
  value = "",
  placeholder = "Tìm kiếm",
  onChange,
  className,
}: SearchFieldProps) {
  return (
    <div
      className={cn(
        "mx-4 flex h-10 items-center gap-2 rounded-np-button border border-np-border-strong bg-white px-3",
        className,
      )}
    >
      <Search size={18} strokeWidth={2.25} className="text-np-text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[14px] font-medium text-np-ink outline-none placeholder:text-np-text-muted"
      />
    </div>
  );
}
