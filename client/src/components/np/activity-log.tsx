import { useState, type ReactNode } from "react";
import { ChevronDown, X } from "@/components/np/icon";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Một dòng nhật ký: ai, làm gì, lúc nào. */
export type ActivityEntry = {
  id: string | number;
  /** Thời điểm. Nhận ISO, epoch mili giây, Date, hoặc "dd/MM/yyyy HH:mm". */
  at: string | number | Date;
  /** Người thực hiện. Bỏ trống thì câu bắt đầu bằng chính hành động. */
  actor?: string | null;
  /** Hành động, viết thường, KHÔNG kèm tên người: "cập nhật ca khám #NP01". */
  action: ReactNode;
  /** Chi tiết phụ, in nhạt sau dấu chấm: "Chờ khám → Đang khám". */
  detail?: ReactNode;
};

type ActivityLogProps = {
  entries: ActivityEntry[];
  /**
   * Số dòng hé sẵn. Phần còn lại mờ dần và nằm sau nút mở hộp xem đầy đủ.
   * Để 0 khi khối đã nằm trong vùng cuộn riêng, lúc đó in hết.
   */
  preview?: number;
  emptyText?: string;
  /** Danh từ đếm trong nút "Xem thêm N ...": hoạt động, thay đổi, lượt gọi. */
  unitLabel?: string;
  /** Chữ trên nút đáy. Bỏ trống thì là "Xem thêm N {unitLabel}". */
  moreLabel?: ReactNode;
  /** Tiêu đề hộp xem đầy đủ. */
  moreTitle?: ReactNode;
  className?: string;
};

/**
 * Nhật ký tương tác dùng chung cho cả app.
 *
 * Mẫu chuẩn lấy từ mục "Lịch sử tương tác" ở chi tiết khách: ngày đứng đầu nhóm,
 * giờ nằm trên từng dòng, tên người viết thẳng vào câu. Cố ý KHÔNG lặp lại ngày
 * ở mỗi dòng và KHÔNG dùng badge màu cho chuyển trạng thái: nhật ký thường dài,
 * lặp ngày với tô màu từng dòng làm mắt không bám được mốc thời gian.
 *
 * Phần bị cắt bớt mở ra trong HỘP TRƯỢT chứ không bung tại chỗ: nhật ký có khi
 * ba bốn chục dòng, bung ra đẩy mọi mục bên dưới đi mất, người dùng mất luôn chỗ
 * đang xem và phải cuộn ngược tìm lại.
 */
export function ActivityLog({
  entries,
  preview = 0,
  emptyText = "Chưa có hoạt động nào",
  unitLabel = "hoạt động",
  moreLabel,
  moreTitle = "Lịch sử hoạt động",
  className,
}: ActivityLogProps) {
  const [hopMo, setHopMo] = useState(false);
  const coCatBot = preview > 0 && entries.length > preview;
  const hienThi = coCatBot ? entries.slice(0, preview) : entries;
  const conLai = entries.length - hienThi.length;

  if (entries.length === 0) {
    return (
      <div className={cn("bg-white px-4 py-8 text-center text-[13px] text-np-text-muted", className)}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className={cn("bg-white", className)}>
      <div className="relative">
        <DanhSach entries={hienThi} />
        {/* Phần bị cắt mờ dần đi để thấy rõ là còn nữa ở dưới. */}
        {conLai > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent backdrop-blur-[2px] [mask-image:linear-gradient(to_top,black_35%,transparent)]" />
        )}
      </div>

      {conLai > 0 && (
        <button
          type="button"
          onClick={() => setHopMo(true)}
          className="flex w-full items-center justify-center gap-1 border-t border-np-surface-pressed py-3.5 text-[13px] font-semibold text-np-text-sub transition-colors active:bg-np-surface-pressed"
        >
          {moreLabel ?? `Xem thêm ${conLai} ${unitLabel}`}
          <ChevronDown size={15} strokeWidth={2.5} />
        </button>
      )}

      <Sheet open={hopMo} onOpenChange={setHopMo}>
        <SheetContent
          side="bottom"
          className="mx-auto flex max-h-[80vh] max-w-[390px] flex-col rounded-t-np-sheet border-0 p-0 [&>button]:hidden"
        >
          <div className="px-5 pb-3 pt-3">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-np-surface-pressed" />
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="text-[16px] font-bold text-np-ink">{moreTitle}</SheetTitle>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setHopMo(false)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-np-surface-sub text-np-text-sub"
              >
                <X size={16} strokeWidth={2.25} />
              </button>
            </div>
          </div>
          {/* Danh sách tự cuộn trong hộp, hộp cao tối đa 80% màn hình. */}
          <div className="scrollbar-hide flex-1 overflow-y-auto border-t border-np-surface-pressed pb-4">
            <DanhSach entries={entries} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** Thân danh sách, dùng lại cho cả phần hé sẵn lẫn hộp xem đầy đủ. */
function DanhSach({ entries }: { entries: ActivityEntry[] }) {
  return (
    <div className="px-4 pb-3 pt-1">
      {gomTheoNgay(entries).map((nhom) => (
        <div key={nhom.day}>
          {/* Ngày đứng đầu nhóm, giờ nằm trên từng dòng bên dưới nên không phải
              lặp lại ngày ở mỗi dòng. */}
          <div className="pb-2 pt-3 text-[13px] font-bold text-np-ink">{nhom.day}</div>
          <div className="relative before:absolute before:bottom-1 before:left-[3px] before:top-1 before:w-px before:bg-np-border-strong">
            {nhom.items.map((e) => (
              <div key={e.id} className="relative py-1.5 pl-5">
                <span className="absolute left-0 top-[15px] h-[7px] w-[7px] rounded-full bg-np-text-muted" />
                <div className="text-[12px] text-np-text-muted">{fmtGio(e.at)}</div>
                <p className="mt-0.5 text-[13px] leading-[1.45] text-np-ink">
                  {e.actor ? (
                    <>
                      <span className="font-semibold">{e.actor}</span> {e.action}
                    </>
                  ) : (
                    e.action
                  )}
                  {e.detail ? <span className="text-np-text-sub">. {e.detail}</span> : null}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Đọc mốc thời gian. Mỗi nguồn dữ liệu trong app lưu một kiểu khác nhau nên gom
 * hết về đây, chỗ gọi khỏi phải tự chuyển đổi rồi lệch định dạng giữa các màn.
 */
function docThoiDiem(at: string | number | Date): Date | null {
  if (at instanceof Date) return Number.isNaN(at.getTime()) ? null : at;
  if (typeof at === "number") {
    const d = new Date(at);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const thu = new Date(at);
  if (!Number.isNaN(thu.getTime())) return thu;
  // Chuỗi kiểu "13/02/2026 09:00" mà Date không tự đọc được.
  const m = at.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0));
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtGio(at: string | number | Date): string {
  const d = docThoiDiem(at);
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Tiêu đề nhóm ngày: "Hôm nay", "Hôm qua", hoặc "8 tháng 10, 2026". */
function fmtNgay(at: string | number | Date): string {
  const d = docThoiDiem(at);
  if (!d) return "Không rõ ngày";
  const moc = new Date(d);
  moc.setHours(0, 0, 0, 0);
  const homNay = new Date();
  homNay.setHours(0, 0, 0, 0);
  const cach = Math.round((homNay.getTime() - moc.getTime()) / 86_400_000);
  if (cach === 0) return "Hôm nay";
  if (cach === 1) return "Hôm qua";
  const cungNam = d.getFullYear() === new Date().getFullYear();
  return `${d.getDate()} tháng ${d.getMonth() + 1}${cungNam ? "" : `, ${d.getFullYear()}`}`;
}

/** Gom nhật ký thành từng nhóm theo ngày, giữ nguyên thứ tự đầu vào. */
function gomTheoNgay(entries: ActivityEntry[]): { day: string; items: ActivityEntry[] }[] {
  const nhom: { day: string; items: ActivityEntry[] }[] = [];
  for (const e of entries) {
    const day = fmtNgay(e.at);
    const cuoi = nhom[nhom.length - 1];
    if (cuoi && cuoi.day === day) cuoi.items.push(e);
    else nhom.push({ day, items: [e] });
  }
  return nhom;
}
