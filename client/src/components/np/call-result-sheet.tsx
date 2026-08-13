import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Chat, PermPhoneMsg, Plus, Verified, X } from "@/components/np/icon";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { NPButton } from "./button";
import { Avatar } from "./avatar";

/** 3 kết quả gọi hiển thị. Máy chủ nhận thêm 'other' nhưng màn này chỉ cần 3. */
export type CallOutcome = "scheduled" | "no_answer" | "refused";

const OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: "scheduled", label: "Đã đặt lịch" },
  { value: "no_answer", label: "Chưa bắt máy" },
  { value: "refused", label: "Khách từ chối" },
];

/** Câu hay dùng, chạm là chèn vào ghi chú. Giữ ngắn để nằm gọn một hàng. */
const NOTE_CHIPS = ["Khách bận", "Gọi lại tuần sau", "Đổi số điện thoại"];

/** Ô trắng có viền dùng chung cho ba nút liên hệ, kèm bóng nhẹ cho nổi khỏi nền. */
const TILE =
  "flex flex-1 flex-col items-center gap-1 rounded-np-card border border-np-border-strong bg-white p-3 text-[13px] font-bold text-np-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-shadow active:shadow-none";

function digitsOnly(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

type CallResultSheetProps = {
  open: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
  phone: string;
  serviceName: string;
  saving?: boolean;
  onSave: (v: { outcome: CallOutcome; note: string }) => void;
};

/**
 * Hộp ghi kết quả sau khi gọi khách tái khám. Dùng chung cho chi tiết khách và
 * danh sách Tái khám cần gọi: trước đây mỗi màn một bản chép tay nên hai bên đã
 * trôi khác nhau (chip ghi chú, cỡ nút đóng), sửa một chỗ là chỗ kia quên.
 */
export function CallResultSheet({
  open,
  onClose,
  customerId,
  customerName,
  phone,
  serviceName,
  saving = false,
  onSave,
}: CallResultSheetProps) {
  const [, navigate] = useLocation();
  const [outcome, setOutcome] = useState<CallOutcome>("scheduled");
  const [note, setNote] = useState("");

  // Mở hộp cho lượt gọi khác thì phải sạch, không mang kết quả lượt trước sang.
  useEffect(() => {
    if (open) {
      setOutcome("scheduled");
      setNote("");
    }
  }, [open]);

  const so = digitsOnly(phone);

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? null : onClose())}>
      {/* Không có max-w thì hộp trải hết bề ngang trình duyệt trong khi cả app bị
          khoá trong khung 390px, nhìn như hai ứng dụng khác nhau. */}
      <SheetContent
        side="bottom"
        className="mx-auto max-w-[390px] rounded-t-np-sheet border-0 p-5 pt-3 [&>button]:hidden"
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-np-surface-pressed" />

        <div className="mb-4 flex items-center justify-between">
          <SheetTitle className="text-[16px] font-bold text-np-ink">Hành động</SheetTitle>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-np-surface-sub text-np-text-sub"
          >
            <X size={16} strokeWidth={2.25} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-np-card bg-np-surface-sub p-3">
          <Avatar name={customerName || "Khách"} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-bold text-np-ink">
              {customerName || "Khách"}
            </div>
            <div className="truncate text-[12px] text-np-text-muted">
              {phone || "Chưa có số"} · {serviceName}
            </div>
          </div>
        </div>

        {/* Ba việc làm được ngay với khách này. Tạo đơn kèm sẵn mã khách nên sale
            không phải chọn lại khách ở màn tạo đơn. */}
        <div className="mb-4 flex gap-2.5">
          <a
            href={so ? `tel:${so}` : undefined}
            aria-disabled={!so}
            className={cn(TILE, !so && "pointer-events-none opacity-50")}
          >
            <PermPhoneMsg size={18} strokeWidth={2.25} className="text-np-brand" />
            Gọi điện
          </a>
          <a
            href={so ? `https://zalo.me/${so}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!so}
            className={cn(TILE, !so && "pointer-events-none opacity-50")}
          >
            <Chat size={18} strokeWidth={2.25} className="text-np-brand" />
            Nhắn Zalo
          </a>
          <button type="button" onClick={() => navigate(`/orders/new?customerId=${customerId}`)} className={TILE}>
            <Plus size={18} strokeWidth={2.25} className="text-np-brand" />
            Tạo đơn
          </button>
        </div>

        <div className="mb-1.5 text-[12px] font-bold text-np-text-muted">Kết quả cuộc gọi</div>
        {/* Bọc trong div: SheetContent có luật [&>button]:hidden để giấu nút đóng
            mặc định, để trần thì nút mở dropdown cũng bị giấu theo. */}
        <div>
          <Select value={outcome} onValueChange={(v) => setOutcome(v as CallOutcome)}>
            <SelectTrigger aria-label="Kết quả cuộc gọi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTCOMES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-1.5 mt-4 text-[12px] font-bold text-np-text-muted">Ghi chú</div>
        <Textarea
          placeholder="Ví dụ: Khách bận, hẹn gọi lại tuần sau"
          className="min-h-[72px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {/* Một hàng ngang, thừa thì trượt. Cho xuống dòng sẽ đội hộp cao thêm một
            hàng trong khi đây chỉ là phím tắt gõ nhanh. */}
        <div className="scrollbar-hide -mx-5 mt-2 flex gap-1.5 overflow-x-auto px-5">
          {NOTE_CHIPS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setNote((p) => (p ? `${p}, ${t}` : t))}
              className="h-8 flex-shrink-0 whitespace-nowrap rounded-np-chip bg-np-surface-sub px-3 text-[12px] font-semibold text-np-text-sub transition-colors active:bg-np-surface-pressed"
            >
              + {t}
            </button>
          ))}
        </div>

        {/* Bọc trong div để không là con <button> trực tiếp của SheetContent
            (tránh bị ẩn bởi [&>button]:hidden dùng cho nút Close). */}
        <div className="mt-5">
          <NPButton
            tone="primary"
            size="lg"
            icon={Verified}
            disabled={saving}
            onClick={() => onSave({ outcome, note })}
            className="w-full justify-center"
          >
            {saving ? "Đang lưu..." : "Lưu kết quả"}
          </NPButton>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 h-10 w-full text-[14px] font-bold text-np-text-sub"
          >
            Hủy
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
