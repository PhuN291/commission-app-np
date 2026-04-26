import { useState } from "react";
import { useLocation } from "wouter";
import { Calculator, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Card,
  Chips,
  DetailHeader,
  NPButton,
  PageHeader,
  Screen,
  SectionTitle,
  useTabNav,
  type ChipItem,
} from "@/components/np";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

type TabKey = "doctor" | "nurse";

interface RankRow {
  id: number;
  name: string;
  minRevenue: number;
  commissionPercent: number;
}

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const initialData: Record<TabKey, RankRow[]> = {
  doctor: [
    { id: 1, name: "Đồng", minRevenue: 0, commissionPercent: 3 },
    { id: 2, name: "Bạc", minRevenue: 20_000_000, commissionPercent: 5 },
    { id: 3, name: "Vàng", minRevenue: 50_000_000, commissionPercent: 8 },
  ],
  nurse: [
    { id: 1, name: "Đồng", minRevenue: 0, commissionPercent: 2 },
    { id: 2, name: "Bạc", minRevenue: 15_000_000, commissionPercent: 4 },
    { id: 3, name: "Vàng", minRevenue: 40_000_000, commissionPercent: 6 },
  ],
};

const TAB_CHIPS: ChipItem[] = [
  { key: "doctor", label: "Bác sĩ" },
  { key: "nurse", label: "Điều dưỡng" },
];

const emptyForm = { name: "", minRevenue: "", commissionPercent: "" };

export default function AdminCommissionConfig() {
  const { active: navActive, onTab: onNavTab } = useTabNav();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("doctor");
  const [data, setData] = useState(initialData);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [calcPrice, setCalcPrice] = useState("");
  const [calcCost, setCalcCost] = useState("");
  const [calcRank, setCalcRank] = useState("");

  const ranks = data[activeTab];

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };

  const openEdit = (row: RankRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      minRevenue: row.minRevenue.toString(),
      commissionPercent: row.commissionPercent.toString(),
    });
    setSheetOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.commissionPercent.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng điền đầy đủ Tên rank và % Commission.",
        variant: "destructive",
      });
      return;
    }
    const newRow: RankRow = {
      id: editingId ?? Math.max(0, ...ranks.map((r) => r.id)) + 1,
      name: form.name.trim(),
      minRevenue: Number(form.minRevenue) || 0,
      commissionPercent: Number(form.commissionPercent) || 0,
    };
    setData((prev) => ({
      ...prev,
      [activeTab]: editingId
        ? prev[activeTab].map((r) => (r.id === editingId ? newRow : r))
        : [...prev[activeTab], newRow],
    }));
    toast({
      title: editingId ? "Cập nhật thành công" : "Thêm thành công",
      description: `Rank "${newRow.name}" đã được ${editingId ? "cập nhật" : "thêm"}.`,
    });
    setSheetOpen(false);
  };

  const handleDelete = (row: RankRow) => {
    setData((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].filter((r) => r.id !== row.id),
    }));
    toast({ title: "Đã xóa", description: `Rank "${row.name}" đã được xóa.` });
  };

  const calcResult = (() => {
    const price = Number(calcPrice) || 0;
    const cost = Number(calcCost) || 0;
    const rank = ranks.find((r) => r.id.toString() === calcRank);
    if (!rank || price <= 0) return null;
    const profit = price - cost;
    const commission = Math.round((profit * rank.commissionPercent) / 100);
    return { profit, commission, percent: rank.commissionPercent, rankName: rank.name };
  })();

  return (
    <Screen activeTab={navActive} onTab={onNavTab} noHeader>
      <DetailHeader title="Cấu hình hoa hồng" onBack={() => navigate("/")} />

      <div className="bg-np-surface-sub pb-5">
        <PageHeader
          title="Cấu hình hoa hồng"
          subtitle="Mức % theo rank cho từng chức danh"
          action={
            <NPButton tone="primary" size="sm" icon={Plus} onClick={openAdd}>
              Thêm rank
            </NPButton>
          }
        />

        <Chips
          items={TAB_CHIPS}
          active={activeTab}
          onChange={(k) => {
            setActiveTab(k as TabKey);
            setCalcRank("");
          }}
        />

        {/* Rank list */}
        <Card className="overflow-hidden p-0">
          {ranks.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-np-text-muted">
              Chưa có rank nào. Bấm "Thêm rank" để bắt đầu.
            </div>
          ) : (
            ranks.map((row, i) => (
              <div
                key={row.id}
                className={
                  "px-4 py-3.5" +
                  (i === ranks.length - 1 ? "" : " border-b border-np-surface-pressed")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold text-np-ink">{row.name}</div>
                    <div className="mt-0.5 text-[12px] text-np-text-muted">
                      Mốc tối thiểu: {fmt(row.minRevenue)}₫
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right text-[18px] font-extrabold text-np-brand-ink tabular-nums">
                    {row.commissionPercent}%
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <NPButton size="sm" tone="ghost" icon={Pencil} onClick={() => openEdit(row)}>
                    Sửa
                  </NPButton>
                  <button
                    type="button"
                    onClick={() => handleDelete(row)}
                    className="flex h-8 items-center gap-1.5 rounded-np-button border border-np-danger-bg bg-white px-3 text-[13px] font-bold text-np-danger transition-colors hover:bg-np-danger-bg/20"
                  >
                    <Trash2 size={14} strokeWidth={2.25} />
                    Xóa
                  </button>
                </div>
              </div>
            ))
          )}
        </Card>

        {/* Calculator */}
        <SectionTitle>
          <span className="flex items-center gap-1.5">
            <Calculator size={14} strokeWidth={2.25} className="text-np-brand-ink" />
            Thử tính commission
          </span>
        </SectionTitle>
        <Card className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-np-text-sub">Giá bán (₫)</Label>
            <Input
              type="number"
              placeholder="vd: 5000000"
              value={calcPrice}
              onChange={(e) => setCalcPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-np-text-sub">Giá cost (₫)</Label>
            <Input
              type="number"
              placeholder="vd: 2000000"
              value={calcCost}
              onChange={(e) => setCalcCost(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-np-text-sub">Chọn rank</Label>
            <Select value={calcRank} onValueChange={setCalcRank}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn rank" />
              </SelectTrigger>
              <SelectContent>
                {ranks.map((r) => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    {r.name} ({r.commissionPercent}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {calcResult && (
            <div className="rounded-lg border border-np-brand-ink/20 bg-np-brand-soft p-3.5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-sub">
                    Lợi nhuận
                  </p>
                  <p className="mt-0.5 text-[14px] font-bold text-np-ink tabular-nums">
                    {fmt(calcResult.profit)}₫
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-sub">
                    Rank × %
                  </p>
                  <p className="mt-0.5 text-[14px] font-bold text-np-ink">
                    {calcResult.rankName} × {calcResult.percent}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-sub">
                    Commission
                  </p>
                  <p className="mt-0.5 text-[14px] font-bold text-np-brand-ink tabular-nums">
                    {fmt(calcResult.commission)}₫
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="h-5" />
      </div>

      {/* Add / Edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto bg-white sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-[16px] font-bold text-np-ink">
              {editingId ? "Chỉnh sửa rank" : "Thêm rank"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-np-text-sub">Tên rank</Label>
              <Input
                placeholder="vd: Bạch Kim"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-np-text-sub">
                Mốc doanh số tối thiểu (₫)
              </Label>
              <Input
                type="number"
                placeholder="vd: 50000000"
                value={form.minRevenue}
                onChange={(e) => setForm({ ...form, minRevenue: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-np-text-sub">% Commission</Label>
              <Input
                type="number"
                placeholder="vd: 5"
                value={form.commissionPercent}
                onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })}
              />
            </div>
          </div>

          <SheetFooter className="flex gap-2 sm:justify-end">
            <NPButton tone="ghost" onClick={() => setSheetOpen(false)}>
              Hủy
            </NPButton>
            <NPButton tone="primary" onClick={handleSave}>
              Lưu
            </NPButton>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}
