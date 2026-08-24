import { useState, type ComponentProps } from "react";
import { EditSquare, PlusCircle } from "@/components/np/icon";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NPButton } from "./button";
import { Card } from "./card";
import { Chev } from "./row";
import { SectionTitle } from "./section-title";

type NoteSectionProps = {
  /** Tiêu đề mục. Mặc định "Ghi chú". */
  title?: string;
  /** Icon cạnh tiêu đề. Chỉ truyền ở màn mà các mục khác cũng có icon. */
  icon?: ComponentProps<typeof SectionTitle>["icon"];
  /** Nội dung đang lưu. Rỗng thì mục hiện dòng mời thêm ghi chú. */
  value: string;
  /** Gợi ý trong ô soạn, nói rõ nên ghi những gì. */
  placeholder?: string;
  /**
   * Lưu ghi chú. Trả Promise thì hộp chỉ đóng khi lưu xong, lưu hỏng là bản nháp
   * còn nguyên trong hộp để người dùng bấm lại, không mất chữ vừa gõ.
   */
  onSave: (note: string) => Promise<unknown> | void;
  saving?: boolean;
  maxLength?: number;
  className?: string;
};

const NOTE_MAX = 5000;

/**
 * Mục ghi chú dùng chung cho cả app.
 *
 * Đọc tại chỗ, muốn sửa phải bấm bút chì để mở hộp soạn riêng có Hủy và Lưu rõ
 * ràng. Cố ý KHÔNG cho gõ thẳng trên trang: ghi chú ở đây là hồ sơ y tế và ghi
 * chú đơn hàng, chạm nhầm rồi tự lưu là mất dữ liệu mà không ai biết.
 */
export function NoteSection({
  title = "Ghi chú",
  icon,
  value,
  placeholder = "Thêm ghi chú",
  onSave,
  saving = false,
  maxLength = NOTE_MAX,
  className,
}: NoteSectionProps) {
  // null = hộp đang đóng. Chuỗi = đang soạn, kể cả chuỗi rỗng.
  const [draft, setDraft] = useState<string | null>(null);
  const coGhiChu = value.trim().length > 0;

  const moHop = () => setDraft(value);
  const dongHop = () => setDraft(null);

  const luu = async () => {
    try {
      await onSave(draft ?? "");
    } catch {
      return; // lưu hỏng: giữ nguyên bản nháp trong hộp, mutation đã báo lỗi
    }
    setDraft(null);
  };

  return (
    <>
      <SectionTitle
        icon={icon}
        className={className}
        action={
          coGhiChu ? (
            <button
              type="button"
              onClick={moHop}
              aria-label={`Sửa ${title.toLowerCase()}`}
              className="-my-2 flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-np-text-sub transition-colors active:bg-np-surface-pressed"
            >
              <EditSquare size={18} />
            </button>
          ) : undefined
        }
      >
        {title}
      </SectionTitle>
      <Card>
        {coGhiChu ? (
          <p className="whitespace-pre-wrap px-4 pb-3.5 pt-0.5 text-[15px] leading-[1.5] text-np-ink">
            {value}
          </p>
        ) : (
          <button
            type="button"
            onClick={moHop}
            className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-np-surface-sub"
          >
            <PlusCircle size={19} strokeWidth={2.25} className="flex-shrink-0 text-np-text-muted" />
            <span className="flex-1 text-[15px] font-semibold text-np-ink">Thêm {title.toLowerCase()}</span>
            <Chev />
          </button>
        )}
      </Card>

      <Sheet open={draft !== null} onOpenChange={(open) => (open ? null : dongHop())}>
        <SheetContent
          side="bottom"
          className="mx-auto flex h-[85vh] max-w-[390px] flex-col rounded-t-np-sheet border-0 p-0 [&>button]:hidden"
        >
          <div className="flex items-center justify-between gap-3 border-b border-np-surface-pressed px-4 py-3">
            <NPButton tone="ghost" size="sm" onClick={dongHop} className="border-np-border">
              Hủy
            </NPButton>
            <SheetTitle className="text-[15px] font-bold text-np-ink">{title}</SheetTitle>
            <NPButton
              tone="primary"
              size="sm"
              disabled={saving || (draft ?? "").trim() === value.trim()}
              onClick={luu}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </NPButton>
          </div>

          <textarea
            autoFocus
            value={draft ?? ""}
            maxLength={maxLength}
            onChange={(e) => setDraft(e.target.value)}
            disabled={saving}
            placeholder={placeholder}
            className={cn(
              "flex-1 resize-none bg-transparent px-4 py-4 text-[15px] leading-[1.5] text-np-ink outline-none",
              "placeholder:text-np-text-muted disabled:opacity-60",
            )}
          />

          <div className="px-4 pb-4 text-right text-[12px] text-np-text-muted tabular-nums">
            {(draft ?? "").length}/{maxLength}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
