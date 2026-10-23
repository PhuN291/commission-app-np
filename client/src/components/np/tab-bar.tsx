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
  { key: "more", label: "Menu", icon: Menu },
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

  // Tab đang sáng: mở menu thì tính là tab Menu, còn lại theo trang hiện tại.
  const activeIndex = visibleTabs.findIndex((t) =>
    t.key === "more" ? moreOpen : t.key === active,
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
          //
          // Kiểu kính: thanh nổi hẳn lên, bo tròn hết, nền trắng mờ và làm mờ hậu cảnh nên
          // nội dung cuộn phía sau lộ qua. Tổng chiều cao vẫn đúng 64px (8px đệm dưới cộng
          // thanh 56px) để các thanh nút neo bottom-[64px] ở màn tạo đơn, chi tiết đơn và
          // chi tiết dịch vụ vẫn ngồi sát ngay trên thanh này.
          //
          // Không dùng bộ lọc nhiễu SVG như mẫu tham khảo: Safari bỏ qua url() trong
          // backdrop-filter nên trên iPhone sẽ không thấy gì, mà nó lại vẽ lại mỗi khung hình
          // lúc cuộn, nặng máy. Viền sáng ở đây làm bằng bóng trong, rẻ hơn nhiều.
          "absolute bottom-2 left-3 right-3 z-30 flex h-[56px] items-center rounded-full",
          "bg-white/65 backdrop-blur-[24px] backdrop-saturate-150 ring-1 ring-black/[0.06]",
          "shadow-[0_10px_30px_-8px_rgba(16,24,40,0.28),0_2px_8px_rgba(16,24,40,0.10),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(255,255,255,0.45),inset_1px_0_0_rgba(255,255,255,0.55),inset_-1px_0_0_rgba(255,255,255,0.55)]",
          className,
        )}
      >
        {/* Viên kính của tab đang chọn: sáng hơn nền thanh một bậc, viền trong cho ra khối
            nổi. Đặt bằng left theo số thứ tự tab rồi cho chuyển động, nên đổi tab thì nó
            trượt sang chứ không nhảy cóc. Các nút nằm trên nó nhờ z-10. */}
        {activeIndex >= 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1.5 top-1.5 rounded-full bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(255,255,255,0.45),0_2px_8px_rgba(16,24,40,0.14)] ring-1 ring-white/70 transition-[left] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
            style={{
              left: `calc(${activeIndex} * 100% / ${visibleTabs.length} + 6px)`,
              width: `calc(100% / ${visibleTabs.length} - 12px)`,
            }}
          />
        )}
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
              className="relative z-10 flex flex-1 cursor-pointer flex-col items-center gap-0.5 rounded-full border-0 bg-transparent px-0 py-1"
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
