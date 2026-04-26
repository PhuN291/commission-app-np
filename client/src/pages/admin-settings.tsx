import { useState } from "react";
import { useLocation } from "wouter";
import { Save } from "lucide-react";
import {
  Card,
  DetailHeader,
  NPButton,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const fmtCurrency = (v: string) => {
  const n = v.replace(/\D/g, "");
  return n ? new Intl.NumberFormat("vi-VN").format(Number(n)) : "";
};

const parseCurrency = (v: string) => v.replace(/\./g, "");

export default function AdminSettings() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [vipThreshold, setVipThreshold] = useState("5000000");
  const [reminderDays, setReminderDays] = useState("2");
  const [overdueDays, setOverdueDays] = useState("0");
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Đã lưu",
        description: "Cài đặt hệ thống đã được cập nhật thành công.",
      });
    }, 500);
  };

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title="Cài đặt hệ thống" onBack={() => navigate("/")} />

      <div className="bg-np-surface-sub pb-5">
        <SectionTitle>Quy tắc hệ thống</SectionTitle>
        <Card className="space-y-5 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="vipThreshold" className="text-[14px] font-semibold text-np-ink">
              Mốc VIP
            </Label>
            <div className="relative">
              <Input
                id="vipThreshold"
                type="text"
                inputMode="numeric"
                placeholder="5.000.000"
                value={fmtCurrency(vipThreshold)}
                onChange={(e) => setVipThreshold(parseCurrency(e.target.value))}
                className="pr-12 tabular-nums"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-medium text-np-text-muted">
                VNĐ
              </span>
            </div>
            <p className="text-[12px] text-np-text-muted">
              Khách hàng có tổng chi tiêu từ mốc này trở lên sẽ được gắn nhãn VIP.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reminderDays" className="text-[14px] font-semibold text-np-ink">
              Số ngày nhắc trước tái khám
            </Label>
            <div className="relative">
              <Input
                id="reminderDays"
                type="number"
                min={0}
                placeholder="2"
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                className="pr-12 tabular-nums"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-medium text-np-text-muted">
                ngày
              </span>
            </div>
            <p className="text-[12px] text-np-text-muted">
              Hệ thống sẽ gửi nhắc nhở trước lịch tái khám theo số ngày này.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="overdueDays" className="text-[14px] font-semibold text-np-ink">
              Số ngày quá hạn để cảnh báo
            </Label>
            <div className="relative">
              <Input
                id="overdueDays"
                type="number"
                min={0}
                placeholder="0"
                value={overdueDays}
                onChange={(e) => setOverdueDays(e.target.value)}
                className="pr-12 tabular-nums"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-medium text-np-text-muted">
                ngày
              </span>
            </div>
            <p className="text-[12px] text-np-text-muted">
              Nhập 0 = cảnh báo ngay lập tức khi quá hạn.
            </p>
          </div>

          <NPButton
            tone="primary"
            size="md"
            icon={Save}
            className="w-full justify-center"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </NPButton>
        </Card>
      </div>
    </Screen>
  );
}
