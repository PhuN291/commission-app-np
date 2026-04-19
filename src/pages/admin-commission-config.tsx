import { useState } from "react";
import { Plus, Pencil, Trash2, Calculator } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import AppHeader from "@/components/app-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { useToast } from "@/hooks/use-toast";

// ── Types ──
type TabKey = "doctor" | "nurse";

interface RankRow {
  id: number;
  name: string;
  minRevenue: number;
  commissionPercent: number;
}

// ── Helpers ──
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

// ── Mock data ──
const initialData: Record<TabKey, RankRow[]> = {
  doctor: [
    { id: 1, name: "Đồng", minRevenue: 0, commissionPercent: 3 },
    { id: 2, name: "Bạc", minRevenue: 20000000, commissionPercent: 5 },
    { id: 3, name: "Vàng", minRevenue: 50000000, commissionPercent: 8 },
  ],
  nurse: [
    { id: 1, name: "Đồng", minRevenue: 0, commissionPercent: 2 },
    { id: 2, name: "Bạc", minRevenue: 15000000, commissionPercent: 4 },
    { id: 3, name: "Vàng", minRevenue: 40000000, commissionPercent: 6 },
  ],
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "doctor", label: "Bác sĩ" },
  { key: "nurse", label: "Điều dưỡng" },
];

const emptyForm = { name: "", minRevenue: "", commissionPercent: "" };

// ── Component ──
export default function AdminCommissionConfig() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("doctor");
  const [data, setData] = useState(initialData);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Calculator state
  const [calcPrice, setCalcPrice] = useState("");
  const [calcCost, setCalcCost] = useState("");
  const [calcRank, setCalcRank] = useState("");

  const ranks = data[activeTab];

  // ── Handlers ──
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
      toast({ title: "Thiếu thông tin", description: "Vui lòng điền đầy đủ Tên rank và % Commission.", variant: "destructive" });
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

  // ── Calculator ──
  const calcResult = (() => {
    const price = Number(calcPrice) || 0;
    const cost = Number(calcCost) || 0;
    const rank = ranks.find((r) => r.id.toString() === calcRank);
    if (!rank || price <= 0) return null;
    const profit = price - cost;
    const commission = Math.round((profit * rank.commissionPercent) / 100);
    return { profit, commission, percent: rank.commissionPercent, rankName: rank.name };
  })();

  // ── Render ──
  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader activePage="admin-commission" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[{ label: "Quản lý" }, { label: "Cấu hình hoa hồng" }]} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-bold text-[#1a1c1d]" data-testid="text-commission-title">
            Cấu hình Commission
          </h1>
        </div>

        {/* ── Rank Table ── */}
        <Card className="border-[#d2d5d8] shadow-sm bg-white overflow-hidden rounded-xl">
          {/* Tabs + Add button inside card header */}
          <div className="p-4 border-b border-[#d2d5d8] flex items-center justify-between gap-3 flex-wrap">
            <Select value={activeTab} onValueChange={(v) => { setActiveTab(v as TabKey); setCalcRank(""); }}>
              <SelectTrigger className="w-[160px] h-9 bg-[#f6f6f7] border-[#d2d5d8] rounded-lg text-sm font-bold" data-testid="select-tab">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TABS.map((tab) => (
                  <SelectItem key={tab.key} value={tab.key}>{tab.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="rounded-lg h-8 bg-[#1a1c1d] hover:bg-[#2a2c2d] text-white text-xs px-4 font-bold shadow-sm"
              onClick={openAdd}
              data-testid="button-add-rank"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Thêm rank
            </Button>
          </div>
          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-[#f6f6f7]">
                <TableRow className="hover:bg-transparent border-b-[#d2d5d8]">
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Tên rank</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6 text-right">Mốc doanh số tối thiểu</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6 text-right">% Commission</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6 text-center w-[140px]">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranks.map((row) => (
                  <TableRow key={row.id} className="border-b-[#d2d5d8] hover:bg-[#f6f6f7]" data-testid={`row-rank-${row.id}`}>
                    <TableCell className="px-6 py-4">
                      <p className="text-sm font-bold text-[#1a1c1d]">{row.name}</p>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <p className="text-sm text-[#1a1c1d] tabular-nums">{fmt(row.minRevenue)} ₫</p>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-[#008060] tabular-nums">{row.commissionPercent}%</p>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[10px] font-bold border-[#d2d5d8] text-[#616161] hover:text-[#1a1c1d]"
                          onClick={() => openEdit(row)}
                          data-testid={`button-edit-rank-${row.id}`}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Sửa
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[10px] font-bold border-[#d2d5d8] text-[#de3618] hover:text-[#de3618] hover:bg-[#fef2f2]"
                          onClick={() => handleDelete(row)}
                          data-testid={`button-delete-rank-${row.id}`}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Xóa
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {ranks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-sm text-[#8c9196]">
                      Chưa có rank nào. Bấm "Thêm rank" để bắt đầu.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="md:hidden">
            {ranks.map((row) => (
              <div key={row.id} className="px-4 py-3.5 border-b-2 border-[#d2d5d8]" data-testid={`card-rank-${row.id}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#1a1c1d]">{row.name}</span>
                  <span className="text-sm font-bold text-[#008060]">{row.commissionPercent}%</span>
                </div>
                <p className="text-xs text-[#8c9196] mt-1">Mốc tối thiểu: {fmt(row.minRevenue)} ₫</p>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-1.5 text-[9px] font-bold border-[#d2d5d8]"
                    onClick={() => openEdit(row)}
                  >
                    <Pencil className="h-2.5 w-2.5 mr-0.5" />
                    Sửa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-1.5 text-[9px] font-bold border-[#d2d5d8] text-[#de3618]"
                    onClick={() => handleDelete(row)}
                  >
                    <Trash2 className="h-2.5 w-2.5 mr-0.5" />
                    Xóa
                  </Button>
                </div>
              </div>
            ))}
            {ranks.length === 0 && (
              <div className="text-center py-12 text-sm text-[#8c9196]">
                Chưa có rank nào.
              </div>
            )}
          </div>
        </Card>

        {/* ── Calculator ── */}
        <Card className="border-[#d2d5d8] shadow-sm bg-white overflow-hidden rounded-xl">
          <div className="px-4 sm:px-6 py-4 border-b border-[#e3e3e3] flex items-center gap-2">
            <Calculator className="h-4 w-4 text-[#008060]" />
            <h3 className="text-sm font-bold text-[#1a1c1d]">Thử tính commission</h3>
          </div>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#4a4d50]">Giá bán (₫)</Label>
                <Input
                  type="number"
                  placeholder="vd: 5000000"
                  value={calcPrice}
                  onChange={(e) => setCalcPrice(e.target.value)}
                  className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-9 text-sm"
                  data-testid="input-calc-price"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#4a4d50]">Giá cost (₫)</Label>
                <Input
                  type="number"
                  placeholder="vd: 2000000"
                  value={calcCost}
                  onChange={(e) => setCalcCost(e.target.value)}
                  className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-9 text-sm"
                  data-testid="input-calc-cost"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#4a4d50]">Chọn rank</Label>
                <Select value={calcRank} onValueChange={setCalcRank}>
                  <SelectTrigger className="bg-[#f6f6f7] border-[#d2d5d8] rounded-lg h-9 text-sm" data-testid="select-calc-rank">
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
            </div>

            {/* Result */}
            {calcResult && (
              <div className="mt-4 p-4 rounded-xl bg-[#e4f3d9] border border-[#bbe5b3]" data-testid="calc-result">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[10px] font-semibold text-[#4a4d50] uppercase">Lợi nhuận</p>
                    <p className="text-base font-bold text-[#1a1c1d] tabular-nums">{fmt(calcResult.profit)} ₫</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#4a4d50] uppercase">Rank × %</p>
                    <p className="text-base font-bold text-[#1a1c1d]">{calcResult.rankName} × {calcResult.percent}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#4a4d50] uppercase">Commission ước tính</p>
                    <p className="text-base font-bold text-[#008060] tabular-nums">{fmt(calcResult.commission)} ₫</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* ── Add / Edit Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md bg-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base font-bold text-[#1a1c1d]">
              {editingId ? "Chỉnh sửa rank" : "Thêm rank"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#4a4d50]">Tên rank</Label>
              <Input
                placeholder="vd: Bạch Kim"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-9 text-sm"
                data-testid="input-rank-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#4a4d50]">Mốc doanh số tối thiểu (₫)</Label>
              <Input
                type="number"
                placeholder="vd: 50000000"
                value={form.minRevenue}
                onChange={(e) => setForm({ ...form, minRevenue: e.target.value })}
                className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-9 text-sm"
                data-testid="input-rank-revenue"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#4a4d50]">% Commission</Label>
              <Input
                type="number"
                placeholder="vd: 5"
                value={form.commissionPercent}
                onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })}
                className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-9 text-sm"
                data-testid="input-rank-percent"
              />
            </div>
          </div>

          <SheetFooter className="flex gap-2 sm:justify-end">
            <Button variant="ghost" className="text-sm" onClick={() => setSheetOpen(false)}>
              Hủy
            </Button>
            <Button
              className="bg-[#1a1c1d] hover:bg-[#2a2c2d] text-white text-sm font-bold rounded-lg"
              onClick={handleSave}
              data-testid="button-save-rank"
            >
              Lưu
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
