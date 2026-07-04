import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BriefcaseMedical,
  ChevronDown,
  Home,
  LogOut,
  Package,
  PhoneCall,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { queryClient } from "@/lib/queryClient";
import type { UserRole } from "@shared/types";

/**
 * MenuNode permission gate (R-9-1):
 * - `roles` undefined → visible cho mọi role (public).
 * - `roles` set → chỉ visible nếu current role match.
 * - Group: tự ẩn nếu toàn bộ children bị filter mất (tránh group rỗng).
 *
 * Lý do FE-side filter: tránh "hiện ra rồi click không được, dễ tưởng bug".
 * Server vẫn enforce permission qua requireRole() — đây chỉ là UX layer.
 */
type MenuNode =
  | { type: "link"; icon?: LucideIcon; label: string; href: string; roles?: UserRole[] }
  | { type: "group"; icon?: LucideIcon; label: string; children: MenuNode[]; roles?: UserRole[] };

const MENU: MenuNode[] = [
  { type: "link", icon: Home, label: "Trang chủ", href: "/" },
  { type: "link", icon: BriefcaseMedical, label: "Dịch vụ", href: "/services" },
  { type: "link", icon: Package, label: "Đơn hàng", href: "/orders" },
  { type: "link", icon: PhoneCall, label: "Tái khám cần gọi", href: "/recalls" },
  {
    type: "group",
    icon: BarChart3,
    label: "Báo cáo",
    children: [
      { type: "link", label: "Bảng xếp hạng", href: "/ranking" },
      {
        type: "group",
        label: "Phân tích",
        roles: ["ceo", "tc", "kt"],
        children: [
          { type: "link", label: "Tổng quan", href: "/analytics/overview" },
          { type: "link", label: "Lịch hẹn", href: "/analytics/appointments" },
        ],
      },
    ],
  },
  {
    type: "group",
    icon: Settings,
    label: "Quản trị",
    children: [
      { type: "link", label: "Nhân viên", href: "/admin/staff", roles: ["ceo", "tc"] },
      {
        type: "group",
        label: "Hoa hồng",
        children: [
          { type: "link", label: "Cấu hình", href: "/admin/commission-config", roles: ["ceo", "tc", "kt"] },
          { type: "link", label: "Duyệt", href: "/admin/commission-approval", roles: ["ceo", "tc", "kt"] },
        ],
      },
      { type: "link", label: "Voucher", href: "/admin/vouchers", roles: ["ceo", "tc"] },
      { type: "link", label: "Cài đặt hệ thống", href: "/admin/settings", roles: ["ceo", "tc", "kt"] },
    ],
  },
];

/** Filter recursive: drop nodes role không khớp; drop group nếu children rỗng sau filter. */
function filterMenu(nodes: MenuNode[], role: UserRole | null): MenuNode[] {
  const out: MenuNode[] = [];
  for (const node of nodes) {
    if (node.roles && (!role || !node.roles.includes(role))) continue;
    if (node.type === "link") {
      out.push(node);
    } else {
      const kids = filterMenu(node.children, role);
      if (kids.length > 0) out.push({ ...node, children: kids });
    }
  }
  return out;
}

// Default: top-level groups open, nested groups closed
const DEFAULT_OPEN = new Set(["Báo cáo", "Quản trị"]);

type MoreMenuSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MoreMenuSheet({ open, onOpenChange }: MoreMenuSheetProps) {
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState<Set<string>>(DEFAULT_OPEN);

  // FE-side menu gate per R-9-1. Server vẫn enforce permission.
  const role = (typeof window !== "undefined"
    ? localStorage.getItem("np_role")
    : null) as UserRole | null;
  const visibleMenu = useMemo(() => filterMenu(MENU, role), [role]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  const handleLogout = () => {
    // Clear toàn bộ session: token, role, user info, legacy flag.
    localStorage.removeItem("np_token");
    localStorage.removeItem("np_role");
    localStorage.removeItem("np_phone");
    localStorage.removeItem("np_user_id");
    localStorage.removeItem("np_name");
    localStorage.removeItem("np_authenticated"); // legacy
    // Clear TanStack Query cache để session sau không reuse data của user cũ.
    queryClient.clear();
    onOpenChange(false);
    navigate("/login");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex h-[calc(100dvh-56px)] max-w-[390px] flex-col gap-0 overflow-hidden rounded-t-np-sheet border-0 bg-white p-0 [&>button]:right-3 [&>button]:top-3 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:text-np-text-muted [&>button]:hover:bg-np-surface-pressed"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2">
          <div className="h-1 w-9 rounded-full bg-np-border-strong" />
        </div>

        {/* Header */}
        <div className="border-b border-np-surface-pressed px-5 pb-3 pt-3">
          <SheetTitle className="text-[17px] font-bold tracking-[-0.1px] text-np-ink">
            Menu
          </SheetTitle>
        </div>

        {/* Tree */}
        <div className="scrollbar-hide flex-1 overflow-y-auto py-1">
          {visibleMenu.map((node, i) => (
            <MenuItem
              key={i}
              node={node}
              depth={0}
              expanded={expanded}
              toggle={toggle}
              onLink={go}
            />
          ))}

          {/* Logout */}
          <div className="mt-4 flex justify-center border-t border-np-surface-pressed pt-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-np-danger transition-opacity hover:opacity-75"
            >
              <LogOut size={14} strokeWidth={2.25} />
              Đăng xuất
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type MenuItemProps = {
  node: MenuNode;
  depth: number;
  expanded: Set<string>;
  toggle: (key: string) => void;
  onLink: (href: string) => void;
};

function MenuItem({ node, depth, expanded, toggle, onLink }: MenuItemProps) {
  const Icon = node.icon;
  const paddingLeft = 16 + depth * 20;

  if (node.type === "link") {
    return (
      <button
        type="button"
        onClick={() => onLink(node.href)}
        style={{ paddingLeft }}
        className="flex w-full items-center gap-3 pr-4 text-left transition-colors hover:bg-np-surface-sub"
      >
        <div className="flex w-5 flex-shrink-0 justify-center">
          {Icon && <Icon size={18} strokeWidth={2} className="text-np-text-sub" />}
        </div>
        <span
          className={cn(
            "flex-1 truncate py-2.5",
            depth === 0 ? "text-[15px] font-medium text-np-ink" : "text-[14px] font-normal text-np-ink-sub",
          )}
        >
          {node.label}
        </span>
      </button>
    );
  }

  const isOpen = expanded.has(node.label);
  return (
    <>
      <button
        type="button"
        onClick={() => toggle(node.label)}
        style={{ paddingLeft }}
        className="flex w-full items-center gap-3 pr-4 text-left transition-colors hover:bg-np-surface-sub"
      >
        <div className="flex w-5 flex-shrink-0 justify-center">
          {Icon && <Icon size={18} strokeWidth={2} className="text-np-text-sub" />}
        </div>
        <span
          className={cn(
            "flex-1 truncate py-2.5",
            depth === 0 ? "text-[15px] font-semibold text-np-ink" : "text-[14px] font-medium text-np-ink",
          )}
        >
          {node.label}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={cn(
            "flex-shrink-0 text-np-text-muted transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>
      {isOpen && (
        <div>
          {node.children.map((child, i) => (
            <MenuItem
              key={i}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              onLink={onLink}
            />
          ))}
        </div>
      )}
    </>
  );
}
