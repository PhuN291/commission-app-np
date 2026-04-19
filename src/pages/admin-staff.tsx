import { useState } from "react";
import {
  Search,
  UserPlus,
  KeyRound,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import AppHeader from "@/components/app-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { useToast } from "@/hooks/use-toast";

// ── Types ──
type Role = "Admin" | "Bác sĩ" | "Điều dưỡng" | "Lễ tân" | "CSKH";

interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  isoftId: string;
  active: boolean;
}

// ── Role config ──
const ROLES: Role[] = ["Admin", "Bác sĩ", "Điều dưỡng", "Lễ tân", "CSKH"];

const ROLE_STYLE = { bg: "bg-[#e7e7e7]", text: "text-[#1a1c1d]" };

// ── Mock data ──
const initialStaff: StaffMember[] = [
  { id: 1, name: "Trần Minh Tuấn", email: "tuan.tm@nguyenphuong.vn", phone: "0901234567", role: "Admin", isoftId: "ISF-001", active: true },
  { id: 2, name: "Nguyễn Thị Lan", email: "lan.nt@nguyenphuong.vn", phone: "0912345678", role: "Bác sĩ", isoftId: "ISF-002", active: true },
  { id: 3, name: "Phạm Hồng Nhung", email: "nhung.ph@nguyenphuong.vn", phone: "0923456789", role: "Điều dưỡng", isoftId: "ISF-003", active: true },
  { id: 4, name: "Lê Văn Đức", email: "duc.lv@nguyenphuong.vn", phone: "0934567890", role: "Lễ tân", isoftId: "ISF-004", active: true },
  { id: 5, name: "Hoàng Thu Hà", email: "ha.ht@nguyenphuong.vn", phone: "0945678901", role: "CSKH", isoftId: "ISF-005", active: false },
  { id: 6, name: "Võ Quốc Bảo", email: "bao.vq@nguyenphuong.vn", phone: "0956789012", role: "Bác sĩ", isoftId: "ISF-006", active: true },
];

// ── Empty form ──
const emptyForm = { name: "", email: "", phone: "", role: "Lễ tân" as Role, isoftId: "" };

// ── Component ──
export default function AdminStaff() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  // ── Filtering ──
  const filtered = staff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm);
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // ── Handlers ──
  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      isoftId: member.isoftId,
    });
    setSheetOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng điền đầy đủ Họ tên, Email và SĐT.", variant: "destructive" });
      return;
    }

    if (editingId) {
      setStaff((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, ...form } : s))
      );
      toast({ title: "Cập nhật thành công", description: `Đã cập nhật thông tin ${form.name}.` });
    } else {
      const newId = Math.max(...staff.map((s) => s.id)) + 1;
      setStaff((prev) => [
        ...prev,
        { id: newId, ...form, active: true },
      ]);
      toast({ title: "Thêm thành công", description: `Đã thêm nhân viên ${form.name}.` });
    }
    setSheetOpen(false);
  };

  const toggleActive = (id: number) => {
    setStaff((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, active: !s.active };
        toast({
          title: next.active ? "Kích hoạt tài khoản" : "Vô hiệu hóa tài khoản",
          description: `${s.name} đã được ${next.active ? "kích hoạt" : "vô hiệu hóa"}.`,
        });
        return next;
      })
    );
  };

  const resetPassword = (member: StaffMember, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: "Đặt lại mật khẩu",
      description: `Mật khẩu của ${member.name} đã được reset về mặc định.`,
    });
  };

  // ── Render ──
  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader activePage="admin-staff" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[{ label: "Quản lý" }, { label: "Nhân viên" }]} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-bold text-[#1a1c1d]" data-testid="text-staff-title">
            Quản lý nhân viên
          </h1>
          <Button
            className="rounded-lg h-8 bg-[#1a1c1d] hover:bg-[#2a2c2d] text-white text-xs px-4 font-bold shadow-sm shrink-0"
            onClick={openAdd}
            data-testid="button-add-staff"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Thêm nhân viên
          </Button>
        </div>

        <Card className="border-[#d2d5d8] shadow-sm bg-white overflow-hidden rounded-xl">
          {/* Search + Role filter */}
          <div className="p-4 border-b border-[#d2d5d8] flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9196]" />
              <Input
                placeholder="Tìm nhân viên..."
                className="pl-9 bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white transition-all rounded-lg h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-staff"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-9 bg-[#f6f6f7] border-[#d2d5d8] rounded-lg text-sm" data-testid="select-role-filter">
                <SelectValue placeholder="Lọc theo role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả chức danh</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-[#f6f6f7]">
                <TableRow className="hover:bg-transparent border-b-[#d2d5d8]">
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Họ tên</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Role</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Email</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">SĐT</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">ISoft ID</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6 text-center">Trạng thái</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6 text-center">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((member) => {
                  const rc = ROLE_STYLE;
                  return (
                    <TableRow
                      key={member.id}
                      className="border-b-[#d2d5d8] hover:bg-[#f6f6f7] cursor-pointer"
                      onClick={() => openEdit(member)}
                      data-testid={`row-staff-${member.id}`}
                    >
                      <TableCell className="px-6 py-4">
                        <p className="text-sm font-bold text-[#1a1c1d]">{member.name}</p>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge className={`${rc.bg} ${rc.text} border-transparent text-[10px] font-bold`}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-[#616161]">{member.email}</TableCell>
                      <TableCell className="px-6 py-4 text-sm text-[#616161]">{member.phone}</TableCell>
                      <TableCell className="px-6 py-4 text-sm text-[#616161] font-mono">{member.isoftId}</TableCell>
                      <TableCell className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={member.active}
                          onCheckedChange={() => toggleActive(member.id)}
                          data-testid={`switch-staff-${member.id}`}
                        />
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[10px] font-bold border-[#d2d5d8] text-[#616161] hover:text-[#1a1c1d]"
                          onClick={(e) => resetPassword(member, e)}
                          data-testid={`button-reset-pw-${member.id}`}
                        >
                          <KeyRound className="h-3 w-3 mr-1" />
                          Reset MK
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden">
            {filtered.map((member) => {
              const rc = ROLE_STYLE;
              return (
                <div
                  key={member.id}
                  className="px-4 py-3.5 border-b-2 border-[#d2d5d8] hover:bg-[#f6f6f7] active:bg-[#ebebed] transition-colors cursor-pointer"
                  onClick={() => openEdit(member)}
                  data-testid={`card-staff-${member.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1a1c1d]">{member.name}</span>
                    <Badge className={`${rc.bg} ${rc.text} border-transparent text-[10px] font-bold`}>
                      {member.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#8c9196] mt-1">{member.email}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-[#616161]">{member.phone} · {member.isoftId}</p>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-1.5 text-[9px] font-bold border-[#d2d5d8]"
                        onClick={(e) => resetPassword(member, e)}
                      >
                        <KeyRound className="h-2.5 w-2.5 mr-0.5" />
                        Reset
                      </Button>
                      <Switch
                        checked={member.active}
                        onCheckedChange={() => toggleActive(member.id)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-[#d2d5d8] mx-auto mb-3" />
              <p className="text-sm text-[#8c9196]">Không tìm thấy nhân viên nào</p>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-[#d2d5d8] bg-white">
            <p className="text-xs text-[#8c9196]" data-testid="text-staff-count">
              Hiển thị {filtered.length}/{staff.length} nhân viên
            </p>
          </div>
        </Card>
      </main>

      {/* ── Add / Edit Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md bg-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base font-bold text-[#1a1c1d]">
              {editingId ? "Chỉnh sửa nhân viên" : "Thêm nhân viên"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#4a4d50]">Họ tên</Label>
              <Input
                placeholder="Nhập họ tên"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-9 text-sm"
                data-testid="input-staff-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#4a4d50]">Email</Label>
              <Input
                type="email"
                placeholder="email@nguyenphuong.vn"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-9 text-sm"
                data-testid="input-staff-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#4a4d50]">Số điện thoại</Label>
              <Input
                placeholder="0901234567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-9 text-sm"
                data-testid="input-staff-phone"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#4a4d50]">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger className="bg-[#f6f6f7] border-[#d2d5d8] rounded-lg h-9 text-sm" data-testid="select-staff-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#4a4d50]">ISoft User ID</Label>
              <Input
                placeholder="ISF-XXX"
                value={form.isoftId}
                onChange={(e) => setForm({ ...form, isoftId: e.target.value })}
                className="bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white rounded-lg h-9 text-sm"
                data-testid="input-staff-isoft"
              />
            </div>
          </div>

          <SheetFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => setSheetOpen(false)}
            >
              Hủy
            </Button>
            <Button
              className="bg-[#1a1c1d] hover:bg-[#2a2c2d] text-white text-sm font-bold rounded-lg"
              onClick={handleSave}
              data-testid="button-save-staff"
            >
              Lưu
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
