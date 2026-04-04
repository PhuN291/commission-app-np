import { useState } from "react";
import { Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppHeader from "@/components/app-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { useToast } from "@/hooks/use-toast";

// ── Helpers ──
const fmtCurrency = (v: string) => {
  const n = v.replace(/\D/g, "");
  return n ? new Intl.NumberFormat("vi-VN").format(Number(n)) : "";
};

const parseCurrency = (v: string) => v.replace(/\./g, "");

// ── Component ──
export default function AdminSettings() {
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
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] flex flex-col">
      <AppHeader activePage="admin-settings" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[{ label: "Quản lý" }, { label: "Cài đặt hệ thống" }]} />

        <h1 className="text-lg font-bold text-[#1a1c1d]">Cài đặt hệ thống</h1>

        <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl p-5 md:p-6 max-w-xl space-y-5">
          {/* Mốc VIP */}
          <div className="space-y-1.5">
            <Label htmlFor="vipThreshold" className="text-sm font-semibold text-[#1a1c1d]">
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
                className="border-[#d2d5d8] rounded-lg h-10 pr-12 tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#8c9196] font-medium pointer-events-none">
                VNĐ
              </span>
            </div>
            <p className="text-xs text-[#8c9196]">
              Khách hàng có tổng chi tiêu từ mốc này trở lên sẽ được gắn nhãn VIP.
            </p>
          </div>

          {/* Số ngày nhắc trước tái khám */}
          <div className="space-y-1.5">
            <Label htmlFor="reminderDays" className="text-sm font-semibold text-[#1a1c1d]">
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
                className="border-[#d2d5d8] rounded-lg h-10 pr-12 tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#8c9196] font-medium pointer-events-none">
                ngày
              </span>
            </div>
            <p className="text-xs text-[#8c9196]">
              Hệ thống sẽ gửi nhắc nhở trước lịch tái khám theo số ngày này.
            </p>
          </div>

          {/* Số ngày quá hạn để cảnh báo */}
          <div className="space-y-1.5">
            <Label htmlFor="overdueDays" className="text-sm font-semibold text-[#1a1c1d]">
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
                className="border-[#d2d5d8] rounded-lg h-10 pr-12 tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#8c9196] font-medium pointer-events-none">
                ngày
              </span>
            </div>
            <p className="text-xs text-[#8c9196]">
              Nhập 0 = cảnh báo ngay lập tức khi quá hạn.
            </p>
          </div>

          {/* Save button */}
          <div className="pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg h-10 bg-[#008060] hover:bg-[#006e52] text-white text-sm px-5 font-bold shadow-sm"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
