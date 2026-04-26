import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Home, Menu, ShoppingBag, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreMenuSheet } from "./more-menu-sheet";

export type TabKey = "dashboard" | "orders" | "commission" | "customers" | "more";

type TabDef = { key: TabKey; label: string; icon: LucideIcon };

const TABS: TabDef[] = [
  { key: "dashboard", label: "Trang chủ", icon: Home },
  { key: "orders", label: "Đơn hàng", icon: ShoppingBag },
  { key: "commission", label: "Hoa hồng", icon: Wallet },
  { key: "customers", label: "Khách hàng", icon: Users },
  { key: "more", label: "Thêm", icon: Menu },
];

type TabBarProps = {
  active: TabKey;
  onTab?: (key: TabKey) => void;
  className?: string;
};

export function TabBar({ active, onTab, className }: TabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const handleClick = (key: TabKey) => {
    if (key === "more") {
      setMoreOpen(true);
    } else {
      onTab?.(key);
    }
  };

  return (
    <>
      <nav
        aria-label="Điều hướng chính"
        className={cn(
          "absolute bottom-0 left-0 right-0 flex h-[64px] border-t border-np-border bg-white/95 pb-2 pt-1.5 backdrop-blur-[20px]",
          className,
        )}
      >
        {TABS.map((t) => {
          const on = t.key === "more" ? moreOpen : t.key === active;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-current={on ? "page" : undefined}
              aria-label={t.label}
              onClick={() => handleClick(t.key)}
              className="flex flex-1 cursor-pointer flex-col items-center gap-0.5 border-0 bg-transparent px-0 py-1"
            >
              <Icon
                size={22}
                strokeWidth={2}
                className={on ? "text-np-ink" : "text-np-text-muted"}
              />
              <span
                className={cn(
                  "text-[10px] leading-tight tracking-[0.1px] font-medium",
                  on ? "text-np-ink" : "text-np-text-muted",
                )}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>
      <MoreMenuSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
