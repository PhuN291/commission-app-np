import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { AppHeader } from "./app-header";
import { SearchSheet } from "./search-sheet";
import { StatusBar } from "./status-bar";
import { TabBar, type TabKey } from "./tab-bar";

type ScreenProps = {
  children: ReactNode;
  activeTab?: TabKey;
  /** Override notif badge count. Default: fetch từ /api/notifications/me/count. */
  notifCount?: number;
  onTab?: (key: TabKey) => void;
  onSearch?: () => void;
  onBell?: () => void;
  onSparkle?: () => void;
  /** hide dark AppHeader (but keep tabbar). Use for sub-pages with their own back-header. */
  noHeader?: boolean;
  /** no header, no tabbar. Use for full-bleed overlays (drawer, bottom sheet, search modal, login). */
  noChrome?: boolean;
  /** show simulated iOS status bar at top. Default false — web apps don't need fake chrome. */
  showStatusBar?: boolean;
  className?: string;
};

const FRAME = "relative mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-[390px] flex-col overflow-hidden";

export function Screen({
  children,
  activeTab = "dashboard",
  notifCount,
  onTab,
  onSearch,
  onBell,
  onSparkle,
  noHeader = false,
  noChrome = false,
  showStatusBar = false,
  className,
}: ScreenProps) {
  // Universal search modal — page override `onSearch` để custom handler;
  // default: tự mở SearchSheet.
  const [searchOpen, setSearchOpen] = useState(false);
  const handleSearch = onSearch ?? (() => setSearchOpen(true));

  // Chuông → mở TRANG Thông báo (/notifications). Page có thể override `onBell`.
  const [, navigate] = useLocation();
  const handleBell = onBell ?? (() => navigate("/notifications"));

  // Real-time unread count — chỉ fetch khi không có override + có token.
  const hasToken =
    typeof window !== "undefined" && Boolean(localStorage.getItem("np_token"));
  const { data: countData } = useQuery<{ unread: number }>({
    queryKey: ["/api/notifications/me/count"],
    enabled: notifCount === undefined && hasToken && !noChrome && !noHeader,
    queryFn: async () => {
      const res = await authFetch("/api/notifications/me/count");
      if (!res.ok) return { unread: 0 };
      return res.json();
    },
    refetchOnWindowFocus: true,
    refetchInterval: 60_000, // poll 60s — Phase 2 thay bằng WS push
  });
  const effectiveNotifCount = notifCount ?? countData?.unread ?? 0;

  if (noChrome) {
    return (
      <div className={cn(FRAME, "bg-white font-sans text-np-ink", className)}>
        {showStatusBar && <StatusBar dark />}
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        FRAME,
        "font-sans text-np-ink",
        noHeader ? "bg-white" : "bg-np-header",
        className,
      )}
    >
      {showStatusBar && <StatusBar dark={noHeader} />}
      {!noHeader && (
        <AppHeader
          notifCount={effectiveNotifCount}
          onSearch={handleSearch}
          onBell={handleBell}
          onSparkle={onSparkle}
        />
      )}
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden",
          noHeader ? "bg-white" : "rounded-t-np-sheet bg-np-surface-sub",
        )}
      >
        <div className="scrollbar-hide flex-1 overflow-y-auto overflow-x-hidden pb-[76px]">{children}</div>
      </div>
      <TabBar active={activeTab} onTab={onTab} />
      {!onSearch && <SearchSheet open={searchOpen} onOpenChange={setSearchOpen} />}
    </div>
  );
}
