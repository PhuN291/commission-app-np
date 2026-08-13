/**
 * Login screen — SĐT + OTP Zalo + device binding.
 *
 * Spec: audit-docs/B5-2-screen-specs-batch-2.md Section 1 (S-Login).
 * v15 chốt: bỏ 2nd factor switch device. Wizard 2 bước.
 *
 * Dev override: OTP `123456` luôn pass khi server chạy NODE_ENV !== production.
 * Phone test: 0901234567 (user mai).
 */

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "@/components/np/icon";
import { NPButton, Screen } from "@/components/np";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import clinicLogo from "@assets/np-clinic-logo.webp";

type Step = "phone" | "otp";

const RESEND_COOLDOWN_S = 30;

/** Get/create stable device fingerprint stored in localStorage. */
function getDeviceId(): string {
  let id = localStorage.getItem("np_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("np_device_id", id);
  }
  return id;
}

/** Derive a human-readable device name from userAgent. */
function getDeviceName(): string {
  const ua = navigator.userAgent;
  // Browser
  let browser = "Trình duyệt";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  // OS
  let os = "Không rõ hệ điều hành";
  if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Linux/.test(ua)) os = "Linux";
  return `${browser} - ${os}`;
}

/** Display formatter for VN phone: 0901234567 → 0901 234 567 */
function formatVNPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
}

/** Mask phone for display: 0901234567 → 090*****67 */
function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return phone.slice(0, 3) + "*****" + phone.slice(-2);
}

/** Format seconds remaining as M:SS. */
function fmtCountdown(secs: number): string {
  if (secs <= 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sentVia, setSentVia] = useState<"zalo_oa" | "sms">("zalo_oa");
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [phoneError, setPhoneError] = useState("");
  const [otpError, setOtpError] = useState("");
  const otpAutoSubmitted = useRef(false);

  // Tick every second when timer-driven UI is active
  useEffect(() => {
    if (step !== "otp" && lockedUntil <= now) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step, lockedUntil, now]);

  const otpSecsLeft = Math.max(0, Math.floor((otpExpiresAt - now) / 1000));
  const resendSecsLeft = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
  const lockSecsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const isLocked = lockSecsLeft > 0;
  const otpExpired = step === "otp" && otpSecsLeft <= 0;
  const resendDisabled = resendSecsLeft > 0 || requesting;

  async function requestOtp(phone: string) {
    setRequesting(true);
    setPhoneError("");
    setOtpError("");
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (res.status === 404) {
        setPhoneError("Số điện thoại chưa có trong hệ thống. Liên hệ quản lý.");
        return false;
      }
      if (res.status === 423) {
        const until = data.lockedUntil ? new Date(data.lockedUntil).getTime() : Date.now() + 15 * 60_000;
        setLockedUntil(until);
        setStep("otp");
        return false;
      }
      if (!res.ok) {
        setPhoneError(data.message || "Không gửi được mã OTP. Thử lại.");
        return false;
      }

      setSentVia(data.sent_via ?? "zalo_oa");
      setOtpExpiresAt(Date.now() + 5 * 60_000); // 5 phút
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_S * 1000);
      setOtp("");
      otpAutoSubmitted.current = false;
      return true;
    } catch {
      toast({ title: "Lỗi kết nối", description: "Thử lại sau", variant: "destructive" });
      return false;
    } finally {
      setRequesting(false);
    }
  }

  async function verifyOtp(code: string) {
    if (verifying) return;
    setVerifying(true);
    setOtpError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizedPhone,
          otp_code: code,
          device_id: getDeviceId(),
          device_name: getDeviceName(),
        }),
      });
      const data = await res.json();

      if (data.status === "locked") {
        const until = data.lockedUntil ? new Date(data.lockedUntil).getTime() : Date.now() + 15 * 60_000;
        setLockedUntil(until);
        setOtpError("");
        return;
      }
      if (data.status === "expired") {
        setOtpError("Mã OTP đã hết hạn. Gửi lại.");
        setOtpExpiresAt(Date.now()); // force expired UI
        otpAutoSubmitted.current = false;
        return;
      }
      if (data.status !== "success") {
        setOtpError(data.message || "OTP không đúng");
        setOtp("");
        otpAutoSubmitted.current = false;
        return;
      }

      // Success
      localStorage.setItem("np_token", data.token);
      localStorage.setItem("np_phone", normalizedPhone);
      if (data.role) localStorage.setItem("np_role", data.role);
      if (typeof data.userId === "number") localStorage.setItem("np_user_id", String(data.userId));
      if (data.name) localStorage.setItem("np_name", data.name);
      localStorage.removeItem("np_authenticated"); // legacy cleanup
      // Clear toàn bộ TanStack Query cache để user mới không thấy data cũ
      // (vd: Sale switch sang TC, hoặc reuse session sau khi đổi role server-side).
      queryClient.clear();
      if (data.switched_device) {
        toast({
          title: "Đã chuyển thiết bị đăng nhập",
          description: "Quản lý đã được thông báo về việc đổi thiết bị.",
        });
      }
      navigate("/");
    } catch {
      toast({ title: "Lỗi kết nối", description: "Thử lại sau", variant: "destructive" });
      otpAutoSubmitted.current = false;
    } finally {
      setVerifying(false);
    }
  }

  // Auto-submit when OTP reaches 6 digits
  useEffect(() => {
    if (step === "otp" && otp.length === 6 && !otpAutoSubmitted.current && !verifying && !isLocked && !otpExpired) {
      otpAutoSubmitted.current = true;
      void verifyOtp(otp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError("");
    const normalized = vnNormalize(phoneInput);
    if (!normalized) {
      setPhoneError("Số điện thoại không hợp lệ. Ví dụ: 0901234567");
      return;
    }
    setNormalizedPhone(normalized);
    void requestOtp(normalized).then((ok) => {
      if (ok) setStep("otp");
    });
  }

  function handleResend() {
    if (resendDisabled) return;
    void requestOtp(normalizedPhone);
  }

  function handleBack() {
    setStep("phone");
    setOtp("");
    setOtpError("");
    setLockedUntil(0);
    otpAutoSubmitted.current = false;
  }

  return (
    <Screen noChrome className="bg-gradient-primary-teal">
      {/* Decorative blobs để background đỡ phẳng */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-np-brand-ink/30 blur-3xl" />

      <div className="relative flex min-h-full flex-col justify-center px-6 py-10">
        <div className="mx-auto w-full max-w-[360px]">
          <div className="mb-7 flex justify-center">
            <div className="rounded-full bg-white/95 px-5 py-2.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.3)]">
              <img src={clinicLogo} alt="Nguyên Phương" className="h-12 object-contain" />
            </div>
          </div>

          <div className="rounded-np-card bg-white p-6 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.25)]">
            {step === "phone" ? (
              <PhoneStep
                value={phoneInput}
                onChange={(v) => {
                  setPhoneInput(v);
                  setPhoneError("");
                }}
                onSubmit={handlePhoneSubmit}
                error={phoneError}
                loading={requesting}
              />
            ) : (
              <OtpStep
                phone={normalizedPhone}
                sentVia={sentVia}
                otp={otp}
                onChangeOtp={(v) => {
                  setOtp(v);
                  setOtpError("");
                }}
                onSubmit={() => verifyOtp(otp)}
                onResend={handleResend}
                onBack={handleBack}
                resendSecsLeft={resendSecsLeft}
                otpSecsLeft={otpSecsLeft}
                otpExpired={otpExpired}
                isLocked={isLocked}
                lockSecsLeft={lockSecsLeft}
                error={otpError}
                verifying={verifying}
                requesting={requesting}
              />
            )}
          </div>

          <p className="mt-6 text-center text-[12px] font-medium text-white/85">
            Liên hệ phòng kỹ thuật khi cần hỗ trợ
          </p>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 1 — Phone input
// ─────────────────────────────────────────────────────────────────

type PhoneStepProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  loading: boolean;
};

function PhoneStep({ value, onChange, onSubmit, error, loading }: PhoneStepProps) {
  return (
    <>
      <h1 className="mb-1.5 text-center text-[20px] font-bold text-np-ink">Đăng nhập</h1>
      <p className="mb-5 text-center text-[13px] text-np-text-muted">
        Nhập số điện thoại để nhận mã OTP qua Zalo
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="phone" className="block text-[12px] font-semibold text-np-text-sub">
            Số điện thoại
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            autoFocus
            placeholder="0901 234 567"
            value={formatVNPhone(value)}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
            className="h-11 w-full rounded-np-button border-0 bg-np-surface-sub px-3.5 text-[15px] tabular-nums text-np-ink placeholder:text-np-text-muted focus:bg-np-surface-pressed focus:outline-none"
          />
        </div>

        <NPButton
          type="submit"
          tone="primary"
          size="lg"
          className="w-full justify-center"
          disabled={loading || value.length < 9}
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Đang gửi mã...
            </>
          ) : (
            "Gửi mã OTP"
          )}
        </NPButton>
      </form>

      {error && (
        <div className="mt-4 rounded-np-button border border-np-danger-bg bg-np-danger-bg/30 p-3 text-center text-[12px] font-medium text-np-danger">
          {error}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 2 — OTP input
// ─────────────────────────────────────────────────────────────────

type OtpStepProps = {
  phone: string;
  sentVia: "zalo_oa" | "sms";
  otp: string;
  onChangeOtp: (v: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  onBack: () => void;
  resendSecsLeft: number;
  otpSecsLeft: number;
  otpExpired: boolean;
  isLocked: boolean;
  lockSecsLeft: number;
  error: string;
  verifying: boolean;
  requesting: boolean;
};

function OtpStep({
  phone,
  sentVia,
  otp,
  onChangeOtp,
  onSubmit,
  onResend,
  onBack,
  resendSecsLeft,
  otpSecsLeft,
  otpExpired,
  isLocked,
  lockSecsLeft,
  error,
  verifying,
  requesting,
}: OtpStepProps) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex items-center gap-1 text-[12px] font-semibold text-np-text-sub transition-colors hover:text-np-ink"
      >
        <ArrowLeft size={14} />
        Đổi số điện thoại
      </button>

      <h1 className="mb-1.5 text-center text-[20px] font-bold text-np-ink">Nhập mã OTP</h1>
      <p className="mb-5 text-center text-[13px] text-np-text-muted">
        Đã gửi mã{" "}
        <span className="font-semibold text-np-ink">
          {sentVia === "zalo_oa" ? "qua Zalo" : "qua SMS"}
        </span>{" "}
        tới <span className="font-semibold text-np-ink tabular-nums">{maskPhone(phone)}</span>
      </p>

      {isLocked ? (
        <div className="space-y-3">
          <div className="rounded-np-button border border-np-danger-bg bg-np-danger-bg/30 p-4 text-center text-[13px] font-medium text-np-danger">
            <div className="font-bold">Tài khoản tạm khóa</div>
            <div className="mt-1">
              Sai OTP 3 lần. Mở lại sau{" "}
              <span className="tabular-nums">{fmtCountdown(lockSecsLeft)}</span>
            </div>
          </div>
          <NPButton tone="ghost" size="lg" className="w-full justify-center" onClick={onBack}>
            Đổi số điện thoại khác
          </NPButton>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={onChangeOtp}
              autoFocus
              disabled={verifying || requesting || otpExpired}
            >
              <InputOTPGroup className="gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="h-12 w-10 rounded-np-button border border-np-border-strong bg-np-surface-sub text-[18px] font-bold text-np-ink first:rounded-l-np-button last:rounded-r-np-button"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="text-center text-[12px] text-np-text-muted">
            {otpExpired ? (
              <span className="font-semibold text-np-danger">Mã đã hết hạn</span>
            ) : (
              <>
                Hết hạn sau{" "}
                <span className="font-semibold tabular-nums text-np-ink">
                  {fmtCountdown(otpSecsLeft)}
                </span>
              </>
            )}
          </div>

          <NPButton
            type="button"
            tone="primary"
            size="lg"
            className="w-full justify-center"
            disabled={verifying || otp.length < 6 || otpExpired}
            onClick={onSubmit}
          >
            {verifying ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Đang xác nhận...
              </>
            ) : (
              "Xác nhận"
            )}
          </NPButton>

          <NPButton
            type="button"
            tone="ghost"
            size="md"
            className="w-full justify-center"
            disabled={resendSecsLeft > 0 || requesting}
            onClick={onResend}
          >
            {resendSecsLeft > 0
              ? `Gửi lại sau ${resendSecsLeft}s`
              : requesting
              ? "Đang gửi lại..."
              : "Gửi lại OTP"}
          </NPButton>

          {error && (
            <div className="rounded-np-button border border-np-danger-bg bg-np-danger-bg/30 p-3 text-center text-[12px] font-medium text-np-danger">
              {error}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/** Mirror of server `normalizeVNPhone`. */
function vnNormalize(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "").trim();
  if (digits.startsWith("+84")) {
    const rest = digits.slice(3);
    if (/^\d{9,10}$/.test(rest)) return rest.length === 10 ? rest : "0" + rest;
    return null;
  }
  if (digits.startsWith("84") && digits.length >= 11) {
    const rest = digits.slice(2);
    if (/^\d{9,10}$/.test(rest)) return rest.length === 10 ? rest : "0" + rest;
    return null;
  }
  if (/^0\d{9}$/.test(digits)) return digits;
  if (/^\d{9}$/.test(digits)) return "0" + digits;
  return null;
}
