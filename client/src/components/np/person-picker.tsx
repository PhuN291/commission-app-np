import { useMemo, useState } from "react";
import { Search } from "@/components/np/icon";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

/** Một người trong danh sách chọn. */
export type PickablePerson = {
  id: number;
  name: string;
  /** Chức danh, chỉ in trong bảng chọn để phân biệt người trùng tên hoặc trùng vai. */
  roleLabel?: string;
};

type PersonPickerProps = {
  people: PickablePerson[];
  /** Ai đang được chọn. null = chưa ai. */
  value: number | null;
  /**
   * Người đang được chọn, để hiện đúng tên ở nhóm "Đang chọn".
   *
   * Tách khỏi `people` vì hai danh sách phục vụ hai việc khác nhau: `people` là
   * những ai CÒN gán được, còn người đang gán thì có thể đã nghỉ việc. Trộn làm
   * một thì người đã nghỉ biến mất khỏi bảng.
   */
  current?: PickablePerson | null;
  /** Trả về id vừa chọn. Bỏ chọn làm bằng dấu X trên chip ở dòng, không nằm đây. */
  onSelect: (id: number) => void;
  emptyText?: string;
  className?: string;
};

/**
 * Bảng chọn MỘT người: thẻ nổi có viền và đổ bóng, mở ngay dưới dòng vừa bấm.
 *
 * Trước đây đây là hộp trượt cao 85% màn hình. Chọn một cái tên là việc nhỏ, mở
 * nguyên tấm che hết trang làm người dùng mất ngữ cảnh đang xem đơn nào. Thẻ nổi
 * thì dòng phía trên vẫn thấy, mà vẫn tách bạch khỏi nội dung nhờ viền với bóng.
 *
 * Người đang chọn được đánh dấu hai lớp: nền xám bo tròn cả dòng, và vòng màu
 * quanh ảnh đại diện. Chỉ tô nền thôi thì lúc lướt nhanh dễ nhầm với dòng đang bấm.
 */
export function PersonPicker({
  people,
  value,
  current,
  onSelect,
  emptyText = "Không tìm thấy nhân viên",
  className,
}: PersonPickerProps) {
  const [tim, setTim] = useState("");

  const loc = useMemo(() => {
    // Gộp khoảng trắng thừa ở cả từ khoá lẫn tên: gõ nhanh hay lỡ tay hai dấu
    // cách giữa họ và tên là mất sạch kết quả, mà lỗi đó nhìn không ra.
    const gon = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
    const k = gon(tim);
    if (!k) return people;
    return people.filter((p) => gon(p.name).includes(k));
  }, [people, tim]);

  const dangChon = current ?? people.find((p) => p.id === value) ?? null;
  const conLai = loc.filter((p) => p.id !== value);

  return (
    <div
      className={cn(
        "rounded-[14px] border border-np-border bg-white p-2 shadow-[0_10px_30px_rgba(0,0,0,0.14)]",
        className,
      )}
    >
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-np-text-muted"
        />
        <input
          value={tim}
          onChange={(e) => setTim(e.target.value)}
          placeholder="Tìm tên nhân viên..."
          className="h-10 w-full rounded-[10px] border-2 border-np-border-strong bg-white pl-9 pr-3 text-[14px] text-np-ink outline-none transition-colors placeholder:text-np-text-muted focus:border-np-ink"
        />
      </div>

      <div className="scrollbar-hide mt-1 max-h-[240px] overflow-y-auto">
        {/* Người đang chọn nằm NGOÀI bộ lọc của ô tìm: gõ một chữ không khớp tên
            họ thì cũng vẫn phải thấy hiện đang gán cho ai. */}
        {value != null && dangChon && (
          <>
            <div className={NHOM}>Đang chọn</div>
            <DongNguoi nguoi={dangChon} chon />
          </>
        )}

        {conLai.length > 0 ? (
          <>
            <div className={NHOM}>Nhân viên</div>
            {conLai.map((p) => (
              <DongNguoi key={p.id} nguoi={p} onClick={() => onSelect(p.id)} />
            ))}
          </>
        ) : (
          <div className="py-6 text-center text-[13px] text-np-text-muted">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

const NHOM = "px-2 pb-1 pt-2 text-[12px] font-semibold text-np-text-muted";

function DongNguoi({
  nguoi,
  chon,
  onClick,
}: {
  nguoi: PickablePerson;
  chon?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left",
        chon ? "bg-np-surface-sub" : "transition-colors active:bg-np-surface-sub",
      )}
    >
      <Avatar
        name={nguoi.name}
        size={30}
        className={cn("flex-shrink-0", chon && "ring-2 ring-np-brand-ink ring-offset-1")}
      />
      <span className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-np-ink">{nguoi.name}</p>
        {nguoi.roleLabel && <p className="text-[12px] text-np-text-muted">{nguoi.roleLabel}</p>}
      </span>
    </button>
  );
}
