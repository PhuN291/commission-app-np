import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { NPButton, Screen } from "@/components/np";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <Screen noChrome>
      <div className="flex min-h-full flex-col items-center justify-center px-6">
        <AlertCircle size={48} className="text-np-danger" />
        <h1 className="mt-4 text-[20px] font-bold text-np-ink">404</h1>
        <p className="mt-1 text-center text-[14px] text-np-text-sub">
          Trang bạn tìm không tồn tại.
        </p>
        <NPButton tone="primary" className="mt-6" onClick={() => navigate("/")}>
          Về trang chủ
        </NPButton>
      </div>
    </Screen>
  );
}
