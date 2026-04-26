import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { NPButton, Screen } from "@/components/np";
import clinicLogo from "@assets/np-clinic-logo.webp";

const VALID_CREDENTIALS = [
  { identifier: "admin@nguyenphuong.vn", password: "123456" },
  { identifier: "0901234567", password: "123456" },
];

export default function Login() {
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin đăng nhập.");
      return;
    }

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const isValid = VALID_CREDENTIALS.some(
      (cred) => cred.identifier === identifier.trim() && cred.password === password,
    );

    if (isValid) {
      localStorage.setItem("np_authenticated", "true");
      navigate("/");
    } else {
      setError("Email/số điện thoại hoặc mật khẩu không đúng.");
    }

    setIsLoading(false);
  };

  return (
    <Screen noChrome>
      <div className="flex min-h-full flex-col justify-center px-6 py-10">
        <div className="mx-auto w-full max-w-[360px]">
          <div className="mb-8 flex justify-center">
            <img src={clinicLogo} alt="Nguyên Phương" className="h-16 object-contain" />
          </div>

          <div className="rounded-np-card border border-np-border bg-white p-6">
            <h1 className="mb-6 text-center text-[20px] font-bold text-np-ink">Đăng nhập</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="identifier" className="block text-[12px] font-semibold text-np-text-sub">
                  Email hoặc số điện thoại
                </label>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="vd: admin@nguyenphuong.vn"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError("");
                  }}
                  className="h-10 w-full rounded-np-button border border-np-border-strong bg-np-surface-sub px-3 text-[14px] text-np-ink placeholder:text-np-text-muted focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-np-brand-ink"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-[12px] font-semibold text-np-text-sub">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    className="h-10 w-full rounded-np-button border border-np-border-strong bg-np-surface-sub px-3 pr-10 text-[14px] text-np-ink placeholder:text-np-text-muted focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-np-brand-ink"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-np-text-muted transition-colors hover:text-np-ink"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <NPButton
                type="submit"
                tone="primary"
                size="lg"
                className="w-full justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang đăng nhập...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </NPButton>
            </form>

            {error && (
              <div className="mt-4 rounded-np-button border border-np-danger-bg bg-np-danger-bg/30 p-3 text-center text-[12px] font-medium text-np-danger">
                {error}
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-[11px] text-np-text-muted">
            Liên hệ quản lý nếu bạn quên mật khẩu
          </p>
        </div>
      </div>
    </Screen>
  );
}
