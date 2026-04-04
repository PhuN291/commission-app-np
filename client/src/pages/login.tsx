import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import clinicLogo from "@assets/np-clinic-logo.webp";

export default function Login() {
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const VALID_CREDENTIALS = [
    { identifier: "admin@nguyenphuong.vn", password: "123456" },
    { identifier: "0901234567", password: "123456" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin đăng nhập.");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    const isValid = VALID_CREDENTIALS.some(
      (cred) => cred.identifier === identifier.trim() && cred.password === password
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
    <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={clinicLogo}
            alt="Nguyên Phương"
            className="h-16 object-contain"
            data-testid="login-logo"
          />
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#d2d5d8] p-6 sm:p-8">
          <h1
            className="text-lg font-bold text-[#1a1c1d] text-center mb-6"
            data-testid="login-title"
          >
            Đăng nhập
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Phone */}
            <div className="space-y-1.5">
              <label
                htmlFor="identifier"
                className="text-xs font-semibold text-[#4a4d50]"
              >
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
                className="w-full h-10 px-3 rounded-lg border border-[#d2d5d8] bg-[#f6f6f7] text-sm text-[#1a1c1d] placeholder:text-[#8c9196] focus:outline-none focus:ring-2 focus:ring-[#008060] focus:border-transparent focus:bg-white transition-all"
                data-testid="input-identifier"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-[#4a4d50]"
              >
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
                  className="w-full h-10 px-3 pr-10 rounded-lg border border-[#d2d5d8] bg-[#f6f6f7] text-sm text-[#1a1c1d] placeholder:text-[#8c9196] focus:outline-none focus:ring-2 focus:ring-[#008060] focus:border-transparent focus:bg-white transition-all"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c9196] hover:text-[#1a1c1d] transition-colors"
                  data-testid="button-toggle-password"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-[#1a1c1d] hover:bg-[#2a2c2d] active:bg-[#000] text-white text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>

          {/* Error message */}
          {error && (
            <div
              className="mt-4 p-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-xs font-medium text-center"
              data-testid="login-error"
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-[11px] text-[#8c9196] text-center mt-6">
          Liên hệ quản lý nếu bạn quên mật khẩu
        </p>
      </div>
    </div>
  );
}
