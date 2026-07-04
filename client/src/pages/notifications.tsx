/**
 * Trang Thông báo — layout dạng trang (không full-screen sheet).
 * Nhóm theo "Chưa đọc" / "Trước đó", mỗi thông báo là một card (chưa đọc tô nền nhạt).
 * Giữ nguyên nội dung + badge danh mục như NotificationRow cũ.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Bell, Loader2 } from "lucide-react";
import { PageHeader, Screen, SectionTitle, useTabNav } from "@/components/np";
import { authFetch, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@shared/types";

type Notification = {
  id: string;
  userId: number;
  type: NotificationType;
  tag: string;
  tone: string;
  title: string;
  body: string;
  link: string;
  readAt: number | null;
  createdAt: number;
};

type ApiResponse = { notifications: Notification[]; unread: number };

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w} tuần trước`;
  const mo = Math.floor(d / 30);
  return `${mo} tháng trước`;
}

export default function Notifications() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const [data, setData] = useState<ApiResponse>({ notifications: [], unread: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/notifications/me")
      .then((r) => (r.ok ? r.json() : { notifications: [], unread: 0 }))
      .then((d: ApiResponse) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ notifications: [], unread: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unreadList = data.notifications.filter((n) => n.readAt === null);
  const readList = data.notifications.filter((n) => n.readAt !== null);

  function handleRead(n: Notification) {
    if (n.readAt === null) {
      setData((prev) => ({
        notifications: prev.notifications.map((x) =>
          x.id === n.id ? { ...x, readAt: Date.now() } : x,
        ),
        unread: Math.max(0, prev.unread - 1),
      }));
      authFetch(`/api/notifications/${n.id}/read`, { method: "POST" })
        .then(() => queryClient.invalidateQueries({ queryKey: ["/api/notifications/me/count"] }))
        .catch(() => {});
    }
    navigate(n.link);
  }

  function handleReadAll() {
    setData((prev) => ({
      notifications: prev.notifications.map((n) => ({ ...n, readAt: n.readAt ?? Date.now() })),
      unread: 0,
    }));
    authFetch("/api/notifications/read-all", { method: "POST" })
      .then(() => queryClient.invalidateQueries({ queryKey: ["/api/notifications/me/count"] }))
      .catch(() => {});
  }

  return (
    <Screen activeTab={active} onTab={onTab}>
      <PageHeader
        title="Thông báo"
        subtitle={data.unread > 0 ? `${data.unread} chưa đọc` : "Đã đọc hết"}
        action={
          data.unread > 0 ? (
            <button
              type="button"
              onClick={handleReadAll}
              className="text-[13px] font-semibold text-np-link"
            >
              Đã đọc tất cả
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-np-text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : data.notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
          <Bell size={32} strokeWidth={1.5} className="text-np-text-muted" />
          <div className="text-[13px] font-medium text-np-text-muted">Chưa có thông báo</div>
        </div>
      ) : (
        <div className="pb-4">
          {unreadList.length > 0 && (
            <>
              <SectionTitle>Chưa đọc</SectionTitle>
              <div className="flex flex-col gap-2 px-4">
                {unreadList.map((n) => (
                  <NotifCard key={n.id} n={n} onClick={() => handleRead(n)} />
                ))}
              </div>
            </>
          )}
          {readList.length > 0 && (
            <>
              <SectionTitle>Trước đó</SectionTitle>
              <div className="flex flex-col gap-2 px-4">
                {readList.map((n) => (
                  <NotifCard key={n.id} n={n} onClick={() => handleRead(n)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Screen>
  );
}

function NotifCard({ n, onClick }: { n: Notification; onClick: () => void }) {
  const unread = n.readAt === null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-np-card border p-3.5 text-left transition-transform active:scale-[0.99]",
        unread ? "border-transparent bg-np-brand-soft/30" : "border-np-surface-pressed bg-white",
      )}
    >
      <div className="w-2 flex-shrink-0 pt-[6px]">
        {unread && <span aria-label="Chưa đọc" className="block h-2 w-2 rounded-full bg-np-brand-ink" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "min-w-0 flex-1 truncate text-[14px] leading-tight text-np-ink",
              unread ? "font-bold" : "font-semibold",
            )}
          >
            {n.title}
          </div>
          <span className="flex-shrink-0 rounded-full bg-np-surface-pressed px-2 py-0.5 text-[10px] font-semibold tracking-[0.2px] text-np-ink">
            {n.tag}
          </span>
        </div>
        <div className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-np-text-sub">{n.body}</div>
        <div className="mt-1 text-[11px] text-np-text-muted tabular-nums">{timeAgo(n.createdAt)}</div>
      </div>
    </button>
  );
}
