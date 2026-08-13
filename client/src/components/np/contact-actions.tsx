import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Copy, Mail, MessageSquare, PermPhoneMsg, X } from "@/components/np/icon";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NPButton } from "./button";

type ContactActionsProps = {
  phone: string;
  email?: string | null;
  /**
   * Khách tương ứng. Có thì mọi lần gọi/nhắn/gửi email được ghi vào nhật ký
   * tương tác của khách đó. Bỏ trống thì chỉ mở ứng dụng, không ghi gì.
   */
  customerId?: number;
  className?: string;
};

/**
 * Hai nút Điện thoại và Email, bấm ra hộp chi tiết ở đáy màn: giá trị đầy đủ để
 * chép, kèm việc làm được với nó. Dùng chung cho màn Chi tiết khách và Chi tiết
 * đơn nên hai nơi không lệch nhau khi sửa.
 */
export function ContactActions({ phone, email, customerId, className }: ContactActionsProps) {
  const [sheet, setSheet] = useState<"phone" | "email" | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const logAction = (type: "call" | "sms" | "email") => {
    if (!customerId) return;
    authFetch(`/api/customers/${customerId}/events`, {
      method: "POST",
      body: JSON.stringify({ type }),
    })
      .then(() => queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}`] }))
      .catch(() => {});
  };

  // Trình duyệt cũ hoặc trang không chạy qua HTTPS thì không có clipboard.
  const copyValue = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Đã chép" });
    } catch {
      toast({ title: "Không chép được", description: "Chạm giữ để chép tay" });
    }
  };

  const value = sheet === "email" ? (email ?? "") : phone;

  return (
    <>
      <div className={cn("grid grid-cols-2 gap-2.5", className)}>
        {/* Viền nhạt hơn mặc định của tone ghost: hai nút này nằm trong khối trắng
            nên viền đậm cắt mảng quá gắt. */}
        <NPButton
          tone="ghost"
          size="md"
          icon={PermPhoneMsg}
          onClick={() => setSheet("phone")}
          className="w-full justify-center border-np-border"
        >
          Điện thoại
        </NPButton>
        <NPButton
          tone="ghost"
          size="md"
          icon={Mail}
          disabled={!email}
          onClick={() => setSheet("email")}
          className="w-full justify-center border-np-border"
        >
          Email
        </NPButton>
      </div>

      <Sheet open={sheet !== null} onOpenChange={(open) => (open ? null : setSheet(null))}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-[390px] rounded-t-np-sheet border-0 p-5 pt-3 [&>button]:hidden"
        >
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-np-surface-pressed" />
          <div className="mb-4 flex items-center justify-between">
            <SheetTitle className="text-[16px] font-bold text-np-ink">
              {sheet === "email" ? "Chi tiết email" : "Chi tiết điện thoại"}
            </SheetTitle>
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => setSheet(null)}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-np-surface-sub text-np-text-sub"
            >
              <X size={16} strokeWidth={2.25} />
            </button>
          </div>

          {/* Bọc trong div: SheetContent có luật [&>button]:hidden để giấu nút đóng
              mặc định của thư viện, để trần thì nút chép này bị giấu theo. */}
          <div>
            <button
              type="button"
              onClick={() => copyValue(value)}
              className="flex w-full items-center justify-center gap-2 rounded-np-card bg-np-surface-sub px-4 py-4 text-[16px] font-bold text-np-ink transition-colors active:bg-np-surface-pressed"
            >
              <span className="break-all">{value}</span>
              <Copy size={16} strokeWidth={2.25} className="flex-shrink-0 text-np-text-muted" />
            </button>
          </div>

          <div className="mt-4 space-y-1">
            {sheet === "phone" && (
              <>
                <SheetAction
                  icon={<PermPhoneMsg size={18} strokeWidth={2.25} />}
                  label="Gọi"
                  onClick={() => {
                    setSheet(null);
                    logAction("call");
                    window.location.href = `tel:${phone}`;
                  }}
                />
                <SheetAction
                  icon={<MessageSquare size={18} strokeWidth={2.25} />}
                  label="Nhắn tin"
                  onClick={() => {
                    setSheet(null);
                    logAction("sms");
                    window.location.href = `sms:${phone}`;
                  }}
                />
              </>
            )}
            {sheet === "email" && email && (
              <SheetAction
                icon={<Mail size={18} strokeWidth={2.25} />}
                label="Gửi email"
                onClick={() => {
                  setSheet(null);
                  logAction("email");
                  window.location.href = `mailto:${email}`;
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Một dòng việc làm được trong hộp chi tiết: icon bên trái, chữ bên phải. */
function SheetAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[48px] w-full items-center gap-3 rounded-np-button px-2 text-[15px] font-semibold text-np-ink transition-colors active:bg-np-surface-sub"
    >
      <span className="text-np-text-sub">{icon}</span>
      {label}
    </button>
  );
}
