/**
 * Đăng nhập bằng số điện thoại và xác thực OTP 6 số.
 *
 * Giao diện dựng theo bản bàn giao của 1PDM (design_handoff_login_otp): dải đầu
 * trang gradient nhận diện Nguyên Phương, thẻ trắng bo 32px phủ lên, chữ Arial,
 * ô nhập và nút bo tròn hoàn toàn.
 *
 * KHÔNG dựng lại phần khung điện thoại trong bản thiết kế (Dynamic Island, thanh
 * trạng thái, bàn phím số iOS, thanh gợi ý "Từ Tin nhắn"). Đó là mock môi trường
 * thiết bị, ngoài đời hệ điều hành tự lo. Riêng phần tự điền mã từ tin nhắn thì
 * dùng autocomplete="one-time-code", trình duyệt và iOS tự nhận.
 *
 * Toàn bộ luồng gọi máy chủ giữ nguyên như trước: xin mã, xác thực, gắn thiết bị,
 * khóa sau 3 lần sai, mã hết hạn sau 5 phút, chặn gửi lại trong 30 giây.
 */

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { OTPInput } from "input-otp";
import { Screen } from "@/components/np";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import logoNgangTrang from "@assets/np-brand/logo-ngang-trang.png";
import npTrang from "@assets/np-brand/np-white.png";
import npXanh from "@assets/np-brand/np-blue.png";

type Buoc = "phone" | "otp";

const CHO_GUI_LAI_S = 30;
/** Số chữ số sau mã vùng +84. */
const SO_CHU_SO = 9;

/** Lấy hoặc tạo mã thiết bị ổn định, lưu trong localStorage. */
function layMaThietBi(): string {
  let id = localStorage.getItem("np_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("np_device_id", id);
  }
  return id;
}

/** Tên thiết bị đọc được, suy từ userAgent. */
function layTenThietBi(): string {
  const ua = navigator.userAgent;
  let trinhDuyet = "Trình duyệt";
  if (/Edg\//.test(ua)) trinhDuyet = "Edge";
  else if (/Chrome\//.test(ua)) trinhDuyet = "Chrome";
  else if (/Firefox\//.test(ua)) trinhDuyet = "Firefox";
  else if (/Safari\//.test(ua)) trinhDuyet = "Safari";
  let heDieuHanh = "Không rõ hệ điều hành";
  if (/iPhone|iPad/.test(ua)) heDieuHanh = "iOS";
  else if (/Android/.test(ua)) heDieuHanh = "Android";
  else if (/Mac OS X/.test(ua)) heDieuHanh = "macOS";
  else if (/Windows/.test(ua)) heDieuHanh = "Windows";
  else if (/Linux/.test(ua)) heDieuHanh = "Linux";
  return `${trinhDuyet} - ${heDieuHanh}`;
}

/** 9 chữ số → "912 345 678". */
function nhomBaSo(so: string): string {
  return so.replace(/(\d{3})(?=\d)/g, "$1 ");
}

/**
 * Số hiển thị ở màn OTP, che bớt giữa: "+84 912 ••• •78".
 *
 * Giữ 3 số đầu và 2 số cuối theo bản thiết kế: đủ để người dùng nhận ra số của
 * mình mà không in nguyên số ra màn hình.
 */
function soDaChe(so: string): string {
  if (so.length !== SO_CHU_SO) return `+84 ${nhomBaSo(so)}`;
  return `+84 ${so.slice(0, 3)} ••• •${so.slice(7)}`;
}

/** Giây còn lại → "M:SS". */
function demNguoc(giay: number): string {
  if (giay <= 0) return "0:00";
  return `${Math.floor(giay / 60)}:${String(giay % 60).padStart(2, "0")}`;
}

export default function Login() {
  const [, dieuHuong] = useLocation();
  const { toast } = useToast();

  const [buoc, setBuoc] = useState<Buoc>("phone");
  /** 9 chữ số sau +84, không kèm số 0 đầu. */
  const [so, setSo] = useState("");
  /** Số đã chuẩn hóa gửi cho máy chủ, dạng 0xxxxxxxxx. */
  const [soChuan, setSoChuan] = useState("");
  const [otp, setOtp] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [dangXacThuc, setDangXacThuc] = useState(false);
  const [xong, setXong] = useState(false);
  const [hetHanLuc, setHetHanLuc] = useState(0);
  const [guiLaiLuc, setGuiLaiLuc] = useState(0);
  const [khoaToiLuc, setKhoaToiLuc] = useState(0);
  const [bayGio, setBayGio] = useState(Date.now());
  const [loiSo, setLoiSo] = useState("");
  const [loiOtp, setLoiOtp] = useState("");
  const daTuGui = useRef(false);

  // Chỉ chạy đồng hồ khi màn hình thật sự đang đếm thứ gì đó.
  useEffect(() => {
    if (buoc !== "otp" && khoaToiLuc <= bayGio) return;
    const id = setInterval(() => setBayGio(Date.now()), 1000);
    return () => clearInterval(id);
  }, [buoc, khoaToiLuc, bayGio]);

  const giayHetHan = Math.max(0, Math.floor((hetHanLuc - bayGio) / 1000));
  const giayGuiLai = Math.max(0, Math.ceil((guiLaiLuc - bayGio) / 1000));
  const giayKhoa = Math.max(0, Math.ceil((khoaToiLuc - bayGio) / 1000));
  const dangKhoa = giayKhoa > 0;
  const otpHetHan = buoc === "otp" && giayHetHan <= 0;

  async function xinMa(soGui: string) {
    setDangGui(true);
    setLoiSo("");
    setLoiOtp("");
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: soGui }),
      });
      const data = await res.json();

      if (res.status === 404) {
        setLoiSo("Số điện thoại chưa có trong hệ thống. Liên hệ quản lý.");
        return false;
      }
      if (res.status === 423) {
        setKhoaToiLuc(
          data.lockedUntil ? new Date(data.lockedUntil).getTime() : Date.now() + 15 * 60_000,
        );
        setBuoc("otp");
        return false;
      }
      if (!res.ok) {
        setLoiSo(data.message || "Không gửi được mã. Thử lại.");
        return false;
      }

      setHetHanLuc(Date.now() + 5 * 60_000);
      setGuiLaiLuc(Date.now() + CHO_GUI_LAI_S * 1000);
      setOtp("");
      setXong(false);
      daTuGui.current = false;
      return true;
    } catch {
      toast({ title: "Lỗi kết nối", description: "Thử lại sau", variant: "destructive" });
      return false;
    } finally {
      setDangGui(false);
    }
  }

  async function xacThuc(ma: string) {
    if (dangXacThuc) return;
    setDangXacThuc(true);
    setLoiOtp("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: soChuan,
          otp_code: ma,
          device_id: layMaThietBi(),
          device_name: layTenThietBi(),
        }),
      });
      const data = await res.json();

      if (data.status === "locked") {
        setKhoaToiLuc(
          data.lockedUntil ? new Date(data.lockedUntil).getTime() : Date.now() + 15 * 60_000,
        );
        setLoiOtp("");
        return;
      }
      if (data.status === "expired") {
        setLoiOtp("Mã đã hết hạn. Bấm gửi lại.");
        setHetHanLuc(Date.now());
        daTuGui.current = false;
        return;
      }
      if (data.status !== "success") {
        setLoiOtp(data.message || "Mã không đúng");
        setOtp("");
        daTuGui.current = false;
        return;
      }

      localStorage.setItem("np_token", data.token);
      localStorage.setItem("np_phone", soChuan);
      if (data.role) localStorage.setItem("np_role", data.role);
      if (typeof data.userId === "number") localStorage.setItem("np_user_id", String(data.userId));
      if (data.name) localStorage.setItem("np_name", data.name);
      localStorage.removeItem("np_authenticated");
      // Dọn sạch cache để người vừa đăng nhập không thấy dữ liệu của người trước.
      queryClient.clear();
      if (data.switched_device) {
        toast({
          title: "Đã chuyển thiết bị đăng nhập",
          description: "Quản lý đã được thông báo về việc đổi thiết bị.",
        });
      }
      // Nút chuyển sang trạng thái thành công một nhịp rồi mới vào app, để người
      // dùng thấy việc đã xong chứ không phải màn hình nhảy đột ngột.
      setXong(true);
      setTimeout(() => dieuHuong("/"), 550);
    } catch {
      toast({ title: "Lỗi kết nối", description: "Thử lại sau", variant: "destructive" });
      daTuGui.current = false;
    } finally {
      setDangXacThuc(false);
    }
  }

  // Đủ 6 số là tự gửi, khỏi bắt bấm thêm một nút.
  useEffect(() => {
    if (buoc === "otp" && otp.length === 6 && !daTuGui.current && !dangXacThuc && !dangKhoa && !otpHetHan) {
      daTuGui.current = true;
      void xacThuc(otp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, buoc]);

  function guiSo(e: React.FormEvent) {
    e.preventDefault();
    setLoiSo("");
    if (so.length !== SO_CHU_SO) return;
    const chuan = "0" + so;
    setSoChuan(chuan);
    void xinMa(chuan).then((ok) => {
      if (ok) setBuoc("otp");
    });
  }

  function guiLai() {
    if (giayGuiLai > 0 || dangGui) return;
    void xinMa(soChuan);
  }

  function quayLai() {
    setBuoc("phone");
    setOtp("");
    setLoiOtp("");
    setKhoaToiLuc(0);
    setXong(false);
    daTuGui.current = false;
  }

  const laManOtp = buoc === "otp";
  const chieuCaoDau = laManOtp ? 176 : 208;

  return (
    <Screen noChrome className="bg-white font-login">
      <div className="relative h-full w-full overflow-hidden bg-white">
        {/* Dải đầu trang cao hơn mép thẻ trắng, nên thẻ bo góc đè lên gradient. */}
        <div
          className="np-login-header absolute inset-x-0 top-0 overflow-hidden"
          style={{ height: laManOtp ? 230 : 260 }}
        >
          <img
            src={npTrang}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute w-[300px] max-w-none opacity-[0.14]"
            style={{ top: laManOtp ? -58 : -52, right: -84, transform: "rotate(-10deg)" }}
          />
        </div>

        {laManOtp ? (
          <button
            type="button"
            onClick={quayLai}
            aria-label="Quay lại đổi số điện thoại"
            className="absolute left-[22px] top-[76px] z-20 flex h-11 w-11 items-center justify-center"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M20 12H5M11 5l-7 7 7 7"
                stroke="#FFFFFF"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <img
            src={logoNgangTrang}
            alt="Nguyên Phương"
            className="absolute left-6 top-[72px] z-20 h-11 w-auto"
          />
        )}

        <div
          className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[32px] bg-white"
          style={{ top: chieuCaoDau }}
        >
          {!laManOtp && (
            <img
              src={npXanh}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-[70px] left-1/2 w-[470px] max-w-none -translate-x-1/2 opacity-[0.05]"
            />
          )}

          <div
            className="scrollbar-hide relative z-[1] h-full overflow-y-auto px-[26px] pb-8"
            style={{ paddingTop: laManOtp ? 34 : 38 }}
          >
            {laManOtp ? (
              <BuocOtp
                so={so}
                otp={otp}
                onDoiOtp={(v) => {
                  setOtp(v);
                  setLoiOtp("");
                  if (xong) setXong(false);
                }}
                onXacNhan={() => xacThuc(otp)}
                onGuiLai={guiLai}
                giayGuiLai={giayGuiLai}
                otpHetHan={otpHetHan}
                dangKhoa={dangKhoa}
                giayKhoa={giayKhoa}
                loi={loiOtp}
                dangXacThuc={dangXacThuc}
                dangGui={dangGui}
                xong={xong}
                onQuayLai={quayLai}
              />
            ) : (
              <BuocSoDienThoai
                so={so}
                onDoiSo={(v) => {
                  setSo(v);
                  setLoiSo("");
                }}
                onGui={guiSo}
                loi={loiSo}
                dangGui={dangGui}
              />
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────
// Bước 1 — số điện thoại
// ─────────────────────────────────────────────────────────────────

function BuocSoDienThoai({
  so,
  onDoiSo,
  onGui,
  loi,
  dangGui,
}: {
  so: string;
  onDoiSo: (v: string) => void;
  onGui: (e: React.FormEvent) => void;
  loi: string;
  dangGui: boolean;
}) {
  const duSo = so.length === SO_CHU_SO;
  return (
    <form onSubmit={onGui}>
      <h1 className="text-[30px] font-bold leading-[1.22] text-np-login-blue">Xin chào 👋</h1>
      <p className="mt-2.5 text-[16px] leading-[1.5] text-np-login-sub">
        Đăng nhập với số điện thoại của bạn.
      </p>

      <label htmlFor="so-dien-thoai" className="mt-[34px] block text-[17px] font-bold text-np-login-ink">
        Số điện thoại
      </label>

      <div className="mt-3 flex gap-2.5">
        <div className="flex h-14 flex-shrink-0 items-center gap-2 rounded-full border-[1.5px] border-np-login-border bg-white px-4 text-[17px] font-bold text-np-login-ink">
          <svg width="24" height="16" viewBox="0 0 24 16" aria-hidden="true">
            <rect width="24" height="16" rx="3" fill="#DA251D" />
            <polygon
              points="12,3.2 13.18,6.38 16.57,6.52 13.9,8.62 14.82,11.88 12,10 9.18,11.88 10.1,8.62 7.43,6.52 10.82,6.38"
              fill="#FFDE00"
            />
          </svg>
          <span>+84</span>
        </div>
        <input
          id="so-dien-thoai"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          autoFocus
          placeholder="912 345 678"
          value={nhomBaSo(so)}
          onChange={(e) => onDoiSo(e.target.value.replace(/\D/g, "").slice(0, SO_CHU_SO))}
          className="h-14 min-w-0 flex-1 rounded-full border-[1.5px] border-np-login-border bg-white px-5 text-[17px] text-np-login-ink outline-none transition-shadow placeholder:text-np-login-hint focus:border-np-login-green focus:shadow-[0_0_0_3px_rgba(28,171,137,0.12)]"
        />
      </div>

      <button
        type="submit"
        disabled={!duSo || dangGui}
        className={cn(
          "np-login-cta mt-[30px] h-[58px] w-full rounded-full text-[18px] font-bold text-white transition-opacity active:scale-[0.98]",
          duSo && !dangGui ? "opacity-100" : "opacity-45",
        )}
      >
        {dangGui ? "Đang gửi mã..." : "Tiếp tục"}
      </button>

      <p className="mt-[18px] text-center text-[13px] text-np-login-sub">
        Mã xác thực sẽ được gửi đến số điện thoại này.
      </p>

      {loi && <HopLoi>{loi}</HopLoi>}
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────
// Bước 2 — nhập OTP
// ─────────────────────────────────────────────────────────────────

function BuocOtp({
  so,
  otp,
  onDoiOtp,
  onXacNhan,
  onGuiLai,
  giayGuiLai,
  otpHetHan,
  dangKhoa,
  giayKhoa,
  loi,
  dangXacThuc,
  dangGui,
  xong,
  onQuayLai,
}: {
  so: string;
  otp: string;
  onDoiOtp: (v: string) => void;
  onXacNhan: () => void;
  onGuiLai: () => void;
  giayGuiLai: number;
  otpHetHan: boolean;
  dangKhoa: boolean;
  giayKhoa: number;
  loi: string;
  dangXacThuc: boolean;
  dangGui: boolean;
  xong: boolean;
  onQuayLai: () => void;
}) {
  const duSo = otp.length === 6;
  return (
    <>
      <h1 className="text-[30px] font-bold leading-[1.22] text-np-login-blue">Nhập mã xác thực</h1>
      <p className="mt-2.5 text-[16px] leading-[1.5] text-np-login-sub">
        Mã gồm 6 số vừa gửi đến
        <br />
        <b className="text-np-login-ink">{soDaChe(so)}</b>
      </p>

      {dangKhoa ? (
        <div className="mt-7">
          <HopLoi>
            <span className="block font-bold">Tài khoản tạm khóa</span>
            Sai mã 3 lần. Mở lại sau <span className="tabular-nums">{demNguoc(giayKhoa)}</span>
          </HopLoi>
          <button
            type="button"
            onClick={onQuayLai}
            className="mt-4 h-[58px] w-full rounded-full border-[1.5px] border-np-login-border bg-white text-[17px] font-bold text-np-login-ink active:scale-[0.98]"
          >
            Đổi số điện thoại khác
          </button>
        </div>
      ) : (
        <>
          <div className="mt-7">
            <OTPInput
              maxLength={6}
              value={otp}
              onChange={onDoiOtp}
              autoFocus
              // Trình duyệt và iOS tự điền mã từ tin nhắn nhờ thuộc tính này, nên
              // không cần dựng lại thanh gợi ý "Từ Tin nhắn" trong bản thiết kế.
              autoComplete="one-time-code"
              disabled={dangXacThuc || dangGui || otpHetHan}
              containerClassName="flex justify-between has-[:disabled]:opacity-50"
              render={({ slots }) => (
                <>
                  {slots.map((slot, i) => (
                    <OTin key={i} {...slot} />
                  ))}
                </>
              )}
            />
          </div>

          {loi && <HopLoi>{loi}</HopLoi>}

          <div className="mt-6 min-h-[22px]">
            {giayGuiLai > 0 ? (
              <div className="text-[17px] font-bold text-np-login-ink">
                Gửi lại mã sau {giayGuiLai}s
              </div>
            ) : (
              <button
                type="button"
                onClick={onGuiLai}
                disabled={dangGui}
                className="text-[17px] font-bold text-np-login-green underline disabled:opacity-50"
              >
                {dangGui ? "Đang gửi lại..." : "Gửi lại mã"}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onXacNhan}
            disabled={!duSo || dangXacThuc || otpHetHan}
            className={cn(
              "relative mt-7 h-[58px] w-full overflow-hidden rounded-full text-[18px] font-bold text-white transition-opacity active:scale-[0.98]",
              xong ? "bg-np-login-green" : "np-login-cta",
              duSo || xong ? "opacity-100" : "opacity-45",
            )}
          >
            <span className="relative z-[1] inline-flex items-center justify-center gap-[9px]">
              {xong && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M3.5 10.5l4.2 4.2L16.5 6"
                    stroke="#FFFFFF"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {xong ? "Xác thực thành công" : dangXacThuc ? "Đang xác nhận..." : "Xác nhận"}
            </span>
          </button>

          {/* Chỉ nói về hạn dùng khi mã đã hết hạn. Còn hạn mà vẫn đếm lùi thì
              trên màn có tới hai đồng hồ chạy cùng lúc, rối mà chẳng để làm gì. */}
          {otpHetHan && (
            <p className="mt-[18px] text-center text-[13px] font-bold text-np-danger">
              Mã đã hết hạn, bấm gửi lại.
            </p>
          )}
        </>
      )}
    </>
  );
}

/**
 * Một ô OTP. Ba trạng thái theo bản thiết kế: trống thì nền xám không viền, đang
 * gõ thì viền xám kèm caret nhấp nháy, đã có số thì nền trắng viền nhạt.
 */
function OTin({
  char,
  hasFakeCaret,
  isActive,
}: {
  char: string | null;
  hasFakeCaret: boolean;
  isActive: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-[60px] w-[50px] items-center justify-center rounded-2xl border-2 text-2xl font-bold text-np-login-ink transition-[border-color,background-color] duration-150",
        char
          ? "border-np-login-border bg-white"
          : isActive
            ? "border-np-login-sub bg-np-login-cell"
            : "border-np-login-cell bg-np-login-cell",
      )}
    >
      {char}
      {hasFakeCaret && <span className="np-caret h-[26px] w-0.5 rounded-sm bg-np-login-sub" />}
    </div>
  );
}

function HopLoi({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl bg-np-danger-bg/40 p-3 text-center text-[13px] font-medium leading-[1.5] text-np-danger">
      {children}
    </div>
  );
}
