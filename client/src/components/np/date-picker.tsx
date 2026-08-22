import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CalendarMonth,
  ChevronDown,
  ChevronUp,
  EventUpcoming,
  Today,
  WbTwilight,
} from "@/components/np/icon";
import type { NPIcon } from "@/components/np/icon";
import { cn } from "@/lib/utils";

const THU_NGAN = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const THU_DAY = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

/** Số tháng dựng sẵn để cuộn: tháng đầu cộng 12 tháng sau, đủ cho lịch hẹn phòng khám. */
const SO_THANG = 13;

/** Date → "YYYY-MM-DD" theo giờ máy. Không dùng toISOString vì nó quy về UTC, lệch ngày. */
function khoa(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function tuKhoa(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

function dauNgay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function themNgay(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Các mốc chọn nhanh. Nhãn phụ in thứ ra để khỏi phải nhẩm. */
function mocNhanh(homNay: Date): { nhan: string; ngay: Date; icon: NPIcon }[] {
  const thu = homNay.getDay();
  // Thứ Bảy gần nhất. Đang là T7 hoặc CN thì tính sang cuối tuần kế.
  const toiT7 = thu === 6 ? 7 : thu === 0 ? 6 : 6 - thu;
  // Thứ Hai tuần sau.
  const toiT2 = thu === 0 ? 1 : 8 - thu;
  return [
    { nhan: "Hôm nay", ngay: homNay, icon: Today },
    { nhan: "Ngày mai", ngay: themNgay(homNay, 1), icon: WbTwilight },
    { nhan: "Cuối tuần", ngay: themNgay(homNay, toiT7), icon: CalendarMonth },
    { nhan: "Tuần sau", ngay: themNgay(homNay, toiT2), icon: EventUpcoming },
  ];
}

/** Các ô của một tháng: chèn ô trống đầu tháng cho khớp cột thứ, không mượn ngày tháng bên cạnh. */
function oCuaThang(thang: Date): (Date | null)[] {
  const dau = new Date(thang.getFullYear(), thang.getMonth(), 1);
  const soNgay = new Date(thang.getFullYear(), thang.getMonth() + 1, 0).getDate();
  const trong: (Date | null)[] = Array.from({ length: dau.getDay() }, () => null);
  for (let i = 1; i <= soNgay; i++) {
    trong.push(new Date(thang.getFullYear(), thang.getMonth(), i));
  }
  return trong;
}

type DatePickerProps = {
  /** "YYYY-MM-DD". Rỗng = chưa chọn. */
  value: string;
  onChange: (v: string) => void;
  /** "YYYY-MM-DD". Ngày trước mốc này bị mờ và không bấm được. */
  min?: string;
  className?: string;
};

/**
 * Lịch chọn một ngày. Hàng phím tắt ở trên, dưới là dải tháng cuộn liên tục: kéo
 * hết tháng 8 là sang thẳng tháng 9, không phải bấm nút chuyển từng tháng.
 *
 * Mỗi tháng chỉ in ngày của chính nó, đầu tháng chèn ô trống cho khớp cột thứ.
 * Cố ý KHÔNG mượn ngày của tháng bên cạnh như lịch một-tháng-một-trang: cuộn liên
 * tục mà vẫn mượn thì ngày 1 tháng 9 hiện hai lần, một lần ở cuối tháng 8 một lần
 * ở đầu tháng 9, bấm nhầm là đặt sai lịch.
 *
 * Không dùng input type="date" của trình duyệt: mỗi trình duyệt vẽ một kiểu nên
 * trên máy này một dạng, trên điện thoại một dạng khác, không khớp với app.
 */
export function DatePicker({ value, onChange, min, className }: DatePickerProps) {
  const homNay = dauNgay(new Date());
  const daChon = tuKhoa(value);
  const chanTruoc = min ? tuKhoa(min) : null;

  // Tháng đầu dải: tháng của mốc chặn (hoặc tháng này), để không dựng tháng đã qua.
  const thangDau = (() => {
    const goc = chanTruoc ?? homNay;
    return new Date(goc.getFullYear(), goc.getMonth(), 1);
  })();
  const dsThang = Array.from(
    { length: SO_THANG },
    (_, i) => new Date(thangDau.getFullYear(), thangDau.getMonth() + i, 1),
  );

  const hopRef = useRef<HTMLDivElement>(null);
  const thangRef = useRef(new Map<string, HTMLDivElement>());
  const [chiSoHienThi, setChiSoHienThi] = useState(0);

  const khoaThang = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

  // Mở ra là thấy tháng của ngày đang chọn, không phải cuộn tìm.
  useLayoutEffect(() => {
    if (!daChon) return;
    const i = dsThang.findIndex((t) => khoaThang(t) === khoaThang(daChon));
    if (i < 0) return;
    const el = thangRef.current.get(khoaThang(daChon));
    const hop = hopRef.current;
    if (el && hop) hop.scrollTop = el.offsetTop;
    setChiSoHienThi(i);
    // Chỉ canh một lần lúc mở; sau đó người dùng tự cuộn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tên tháng trên đầu chạy theo tháng đang lọt vào khung nhìn.
  //
  // Gắn MỘT lần (deps rỗng) và tính thẳng trong handler, không qua
  // requestAnimationFrame: bản trước gắn lại sau mỗi lần render, mà dọn dẹp lại
  // huỷ luôn frame đang chờ, nên lần cập nhật cuối cùng bị mất và tên tháng đứng
  // im. Đọc trực tiếp các khối con nên không phụ thuộc bảng ref.
  useEffect(() => {
    const hop = hopRef.current;
    if (!hop) return;
    const onScroll = () => {
      let gan = 0;
      Array.from(hop.children).forEach((el, i) => {
        if ((el as HTMLElement).offsetTop - hop.scrollTop <= 24) gan = i;
      });
      setChiSoHienThi(gan);
    };
    hop.addEventListener("scroll", onScroll, { passive: true });
    return () => hop.removeEventListener("scroll", onScroll);
  }, []);

  const nhayToiThang = (i: number) => {
    const t = dsThang[i];
    const el = t && thangRef.current.get(khoaThang(t));
    if (el && hopRef.current) hopRef.current.scrollTo({ top: el.offsetTop, behavior: "smooth" });
  };

  const khoaChon = daChon ? khoa(daChon) : "";
  const khoaHomNay = khoa(homNay);
  const biChan = (d: Date) => Boolean(chanTruoc && dauNgay(d) < chanTruoc);
  const thangHienThi = dsThang[chiSoHienThi] ?? thangDau;

  return (
    <div className={cn("select-none", className)}>
      {/* Phím tắt: bốn mốc hay dùng nhất, thừa thì trượt ngang chứ không xuống dòng. */}
      <div className="scrollbar-hide -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4">
        {mocNhanh(homNay).map((m) => {
          const k = khoa(m.ngay);
          const chon = k === khoaChon;
          const Icon = m.icon;
          return (
            <button
              key={m.nhan}
              type="button"
              disabled={biChan(m.ngay)}
              onClick={() => {
                onChange(k);
                const i = dsThang.findIndex((t) => khoaThang(t) === khoaThang(m.ngay));
                if (i >= 0) nhayToiThang(i);
              }}
              className={cn(
                "flex h-9 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-np-chip border px-3 text-[13px] font-medium transition-colors disabled:opacity-40",
                chon
                  ? "border-np-ink bg-np-ink text-white"
                  : "border-np-border-strong bg-white text-np-ink active:bg-np-surface-sub",
              )}
            >
              <Icon size={15} className={chon ? "text-white/80" : "text-np-text-sub"} />
              {m.nhan}
              <span className={cn("text-[11px]", chon ? "text-white/60" : "text-np-text-muted")}>
                {THU_NGAN[m.ngay.getDay()]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-1 flex items-center justify-between">
        <span className="text-[14px] font-bold text-np-ink">
          Tháng {thangHienThi.getMonth() + 1} {thangHienThi.getFullYear()}
        </span>
        {/* Hai nút nhảy nhanh một tháng. Muốn đi xa thì cứ cuộn, dải tháng liền mạch. */}
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Tháng trước"
            disabled={chiSoHienThi === 0}
            onClick={() => nhayToiThang(chiSoHienThi - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-np-text-sub transition-colors active:bg-np-surface-pressed disabled:opacity-30"
          >
            <ChevronUp size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            aria-label="Tháng sau"
            disabled={chiSoHienThi >= dsThang.length - 1}
            onClick={() => nhayToiThang(chiSoHienThi + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-np-text-sub transition-colors active:bg-np-surface-pressed disabled:opacity-30"
          >
            <ChevronDown size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Hàng thứ đứng ngoài vùng cuộn: cuộn qua tháng nào cũng vẫn đọc được cột. */}
      <div className="grid grid-cols-7 border-b border-np-surface-pressed pb-1">
        {THU_NGAN.map((t) => (
          <div key={t} className="text-center text-[11px] font-semibold text-np-text-muted">
            {t}
          </div>
        ))}
      </div>

      {/* relative: offsetTop của từng khối tháng phải đo theo chính vùng cuộn này,
          nếu không thanh tên tháng ở trên sẽ không chạy theo lúc cuộn. */}
      <div ref={hopRef} className="scrollbar-hide relative h-[268px] overflow-y-auto">
        {dsThang.map((thang, i) => (
          <div
            key={khoaThang(thang)}
            ref={(el) => {
              if (el) thangRef.current.set(khoaThang(thang), el);
            }}
            className={cn(
              "pt-2",
              // Vạch mảnh ngăn hai tháng. Không in lại tên tháng ở đây vì thanh
              // trên đầu đã chạy theo tháng đang xem, in nữa là chữ lặp hai chỗ.
              i > 0 && "mt-2 border-t border-np-surface-pressed",
            )}
          >
            <div className="grid grid-cols-7">
              {oCuaThang(thang).map((d, j) => {
                if (!d) return <div key={`trong-${j}`} className="h-9" />;
                const k = khoa(d);
                const chon = k === khoaChon;
                const chan = biChan(d);
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={chan}
                    aria-label={`${THU_DAY[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`}
                    aria-current={k === khoaHomNay ? "date" : undefined}
                    onClick={() => onChange(k)}
                    className={cn(
                      "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[14px] tabular-nums transition-colors",
                      chon
                        ? "bg-np-ink font-bold text-white"
                        : chan
                          ? "text-np-text-disabled"
                          : "font-medium text-np-ink active:bg-np-surface-pressed",
                      // Hôm nay: viền mảnh để định vị, không tô đặc kẻo lẫn với ngày đang chọn.
                      !chon && k === khoaHomNay && "ring-1 ring-inset ring-np-border-strong",
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
