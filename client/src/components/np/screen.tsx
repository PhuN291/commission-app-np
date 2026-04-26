import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AppHeader } from "./app-header";
import { StatusBar } from "./status-bar";
import { TabBar, type TabKey } from "./tab-bar";

type ScreenProps = {
  children: ReactNode;
  activeTab?: TabKey;
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
  notifCount = 3,
  onTab,
  onSearch,
  onBell,
  onSparkle,
  noHeader = false,
  noChrome = false,
  showStatusBar = false,
  className,
}: ScreenProps) {
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
          notifCount={notifCount}
          onSearch={onSearch}
          onBell={onBell}
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
    </div>
  );
}
