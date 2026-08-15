/**
 * Trang Thông báo — layout dạng trang (không full-screen sheet).
 * Nhóm theo "Chưa đọc" / "Trước đó", mỗi thông báo là một card (chưa đọc tô nền nhạt).
 * Giữ nguyên nội dung + badge danh mục như NotificationRow cũ.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Bell, Loader2 } from "@/components/np/icon";
import {
  Badge,
  ComplaintSheet,
  NPButton,
  PageHeader,
  Screen,
  SectionTitle,
  loiKhieuNai,
  useTabNav,
} from "@/components/np";
import { useToast } from "@/hooks/use-toast";
import { authFetch, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { canKhieuNai, hoursRemainingKhieuNai, type NotificationType } from "@shared/types";

type Notification = {
  id: string;
  userId: number;
  type: NotificationType;
  tag: string;
  title: string;
  body: string;
  link: string;
  /** Chỉ có ở thông báo hoa hồng bị từ chối, để khiếu nại ngay tại thẻ. */
  cr?: { id: string; orderId: number; rejectedAt: number | null; daKhieuNai: boolean } | null;
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
  const { toast } = useToast();
  const [hopKhieuNai, setHopKhieuNai] = useState<{
    open: boolean;
    n: Notification | null;
    content: string;
  }>({ open: false, n: null, content: "" });
  const [dangGui, setDangGui] = useState(false);

  async function guiKhieuNai() {
    const cr = hopKhieuNai.n?.cr;
    if (!cr || dangGui) return;
    setDangGui(true);
    try {
      const res = await authFetch(`/api/orders/${cr.orderId}/cr/${cr.id}/complaint`, {
        method: "POST",
        body: JSON.stringify({ content: hopKhieuNai.content }),
      });
      if (!res.ok) throw await res.json().catch(() => ({}));
      toast({ title: "Đã gửi khiếu nại", description: "Kế toán sẽ xem lại trong 1 tới 2 ngày." });
      setHopKhieuNai({ open: false, n: null, content: "" });
      // Nạp lại để nút biến mất khỏi thẻ vừa gửi.
      const d = await (await authFetch("/api/notifications/me")).json();
      setData(d);
    } catch (err) {
      toast({ title: "Lỗi", description: loiKhieuNai(err), variant: "destructive" });
    } finally {
      setDangGui(false);
    }
  }

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
        action={
          data.unread > 0 ? (
            <button
              type="button"
              onClick={handleReadAll}
              className="text-[13px] font-semibold text-np-link"
            >
              Đánh dấu đã đọc
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
              <div className="flex flex-col gap-2">
                {unreadList.map((n) => (
                  <NotifCard
                    key={n.id}
                    n={n}
                    onClick={() => handleRead(n)}
                    onComplaint={() => setHopKhieuNai({ open: true, n, content: "" })}
                  />
                ))}
              </div>
            </>
          )}
          {readList.length > 0 && (
            <>
              <SectionTitle>Trước đó</SectionTitle>
              <div className="flex flex-col gap-2">
                {readList.map((n) => (
                  <NotifCard
                    key={n.id}
                    n={n}
                    onClick={() => handleRead(n)}
                    onComplaint={() => setHopKhieuNai({ open: true, n, content: "" })}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <ComplaintSheet
        open={hopKhieuNai.open}
        onOpenChange={(open) => setHopKhieuNai((p) => ({ ...p, open }))}
        cr={null}
        content={hopKhieuNai.content}
        onContentChange={(v) => setHopKhieuNai((p) => ({ ...p, content: v }))}
        saving={dangGui}
        onSubmit={guiKhieuNai}
      />
    </Screen>
  );
}

function NotifCard({
  n,
  onClick,
  onComplaint,
}: {
  n: Notification;
  onClick: () => void;
  onComplaint: () => void;
}) {
  const unread = n.readAt === null;
  // Nút khiếu nại chỉ hiện khi khoản đó thật sự còn khiếu nại được: đúng luật
  // dùng chung ở shared/types, không đoán theo tiêu đề thông báo.
  const choKhieuNai =
    !!n.cr &&
    !n.cr.daKhieuNai &&
    canKhieuNai({ status: "TU_CHOI", rejectedAt: n.cr.rejectedAt });

  return (
    <div
      className={cn(
        "border-y",
        unread ? "border-transparent bg-np-brand-soft/30" : "border-np-surface-pressed bg-white",
      )}
    >
      {/* Nút khiếu nại phải là anh em với nút mở thông báo, không lồng trong nó:
          nút trong nút là thẻ không hợp lệ và trình duyệt bỏ luôn nút bên trong. */}
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start gap-2.5 p-3.5 text-left transition-transform active:scale-[0.99]"
      >
        <div className="w-2 flex-shrink-0 pt-[6px]">
          {unread && (
            <span aria-label="Chưa đọc" className="block h-2 w-2 rounded-full bg-np-brand-ink" />
          )}
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
            <Badge className="flex-shrink-0">{n.tag}</Badge>
          </div>
          <div className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-np-text-sub">
            {n.body}
          </div>
          <div className="mt-1 text-[11px] tabular-nums text-np-text-muted">
            {timeAgo(n.createdAt)}
          </div>
        </div>
      </button>

      {choKhieuNai && n.cr && (
        <div className="px-3.5 pb-3.5 pl-[26px]">
          <NPButton tone="primary" size="sm" onClick={onComplaint}>
            Khiếu nại hoa hồng (còn {hoursRemainingKhieuNai(n.cr.rejectedAt)}h)
          </NPButton>
        </div>
      )}
    </div>
  );
}
