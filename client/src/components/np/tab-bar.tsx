import { useMemo, useState } from "react";
import type { LucideIcon } from "@/components/np/icon";
import { ContactsProduct, HomeHealth, Menu, Redeem, ShoppingBag } from "@/components/np/icon";
import { cn } from "@/lib/utils";
import { MoreMenuSheet } from "./more-menu-sheet";
import type { UserRole } from "@shared/types";

export type TabKey = "dashboard" | "orders" | "commission" | "customers" | "more";

/** roles undefined = public; set = chỉ visible cho role match (R-9-1). */
type TabDef = { key: TabKey; label: string; icon: LucideIcon; roles?: UserRole[] };

const TABS: TabDef[] = [
  { key: "dashboard", label: "Trang chủ", icon: HomeHealth },
  { key: "orders", label: "Đơn hàng", icon: ShoppingBag },
  // Hoa hồng (/income) chỉ cho sale/doctor/tc. KT/CEO dùng /admin/commission-approval.
  { key: "commission", label: "Hoa hồng", icon: Redeem, roles: ["sale", "doctor", "tc"] },
  { key: "customers", label: "Khách hàng", icon: ContactsProduct },
  { key: "more", label: "Thêm", icon: Menu },
];

type TabBarProps = {
  active: TabKey;
  onTab?: (key: TabKey) => void;
  className?: string;
};

export function TabBar({ active, onTab, className }: TabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  // FE-side gate per R-9-1. Server vẫn enforce qua requireRole.
  const role = (typeof window !== "undefined"
    ? localStorage.getItem("np_role")
    : null) as UserRole | null;
  const visibleTabs = useMemo(
    () => TABS.filter((t) => !t.roles || (role && t.roles.includes(role))),
    [role],
  );

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
          // z-30 để bar luôn trên page content (tránh icon `z-10` trong timeline punch qua).
          // Below modals (Sheet/Dialog z-50).
          "absolute bottom-0 left-0 right-0 z-30 flex h-[64px] border-t border-np-border bg-white/95 pb-2 pt-1.5 backdrop-blur-[20px]",
          className,
        )}
      >
        {visibleTabs.map((t) => {
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
