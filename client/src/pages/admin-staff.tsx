import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { KeyRound, UserPlus, Users } from "lucide-react";
import {
  Avatar,
  Badge,
  Card,
  Chips,
  DetailHeader,
  NPButton,
  PageHeader,
  Screen,
  SearchField,
  type ChipItem,
  useTabNav,
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

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

const ROLES: Role[] = ["Admin", "Bác sĩ", "Điều dưỡng", "Lễ tân", "CSKH"];

const initialStaff: StaffMember[] = [
  { id: 1, name: "Trần Minh Tuấn", email: "tuan.tm@nguyenphuong.vn", phone: "0901234567", role: "Admin", isoftId: "ISF-001", active: true },
  { id: 2, name: "Nguyễn Thị Lan", email: "lan.nt@nguyenphuong.vn", phone: "0912345678", role: "Bác sĩ", isoftId: "ISF-002", active: true },
  { id: 3, name: "Phạm Hồng Nhung", email: "nhung.ph@nguyenphuong.vn", phone: "0923456789", role: "Điều dưỡng", isoftId: "ISF-003", active: true },
  { id: 4, name: "Lê Văn Đức", email: "duc.lv@nguyenphuong.vn", phone: "0934567890", role: "Lễ tân", isoftId: "ISF-004", active: true },
  { id: 5, name: "Hoàng Thu Hà", email: "ha.ht@nguyenphuong.vn", phone: "0945678901", role: "CSKH", isoftId: "ISF-005", active: false },
  { id: 6, name: "Võ Quốc Bảo", email: "bao.vq@nguyenphuong.vn", phone: "0956789012", role: "Bác sĩ", isoftId: "ISF-006", active: true },
];

const emptyForm = { name: "", email: "", phone: "", role: "Lễ tân" as Role, isoftId: "" };

export default function AdminStaff() {
  const { active: navActive, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return staff.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.includes(searchTerm);
      const matchesRole = roleFilter === "all" || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [staff, searchTerm, roleFilter]);

  const chips: ChipItem[] = [
    { key: "all", label: "Tất cả", count: staff.length },
    ...ROLES.map((r) => ({
      key: r,
      label: r,
      count: staff.filter((s) => s.role === r).length,
    })),
  ];

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };

  const openEdit = (m: StaffMember) => {
    setEditingId(m.id);
    setForm({ name: m.name, email: m.email, phone: m.phone, role: m.role, isoftId: m.isoftId });
    setSheetOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng điền đầy đủ Họ tên, Email và SĐT.",
        variant: "destructive",
      });
      return;
    }
    if (editingId) {
      setStaff((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...form } : s)));
      toast({ title: "Cập nhật thành công", description: `Đã cập nhật thông tin ${form.name}.` });
    } else {
      const newId = Math.max(...staff.map((s) => s.id)) + 1;
      setStaff((prev) => [...prev, { id: newId, ...form, active: true }]);
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
      }),
    );
  };

  const resetPassword = (m: StaffMember, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: "Đặt lại mật khẩu",
      description: `Mật khẩu của ${m.name} đã được reset về mặc định.`,
    });
  };

  return (
    <Screen activeTab={navActive} onTab={onTab} noHeader>
      <DetailHeader title="Nhân viên" onBack={() => navigate("/")} />

      <div className="bg-np-surface-sub pb-5">
        <PageHeader
          title="Quản lý nhân viên"
          subtitle={`${filtered.length} / ${staff.length} nhân viên`}
          action={
            <NPButton tone="primary" size="sm" icon={UserPlus} onClick={openAdd}>
              Thêm
            </NPButton>
          }
        />

        <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Tìm tên, email, SĐT..." />
        <Chips items={chips} active={roleFilter} onChange={setRoleFilter} />

        <Card className="overflow-hidden p-0">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Users size={36} className="mx-auto text-np-border-strong" />
              <div className="mt-2.5 text-[13px] font-medium text-np-text-muted">
                Không tìm thấy nhân viên nào
              </div>
            </div>
          ) : (
            filtered.map((m, i) => (
              <div
                key={m.id}
                className={
                  "px-4 py-3.5 transition-colors active:bg-np-surface-pressed" +
                  (i === filtered.length - 1 ? "" : " border-b border-np-surface-pressed")
                }
              >
                <button
                  type="button"
                  onClick={() => openEdit(m)}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <Avatar name={m.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-bold text-np-ink">{m.name}</span>
                      <Badge tone="neutral">{m.role}</Badge>
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-np-text-sub">{m.email}</div>
                    <div className="mt-0.5 text-[11px] text-np-text-muted">
                      {m.phone} · <span className="font-mono">{m.isoftId}</span>
                    </div>
                  </div>
                </button>
                <div
                  className="mt-2 flex items-center justify-end gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <NPButton
                    size="sm"
                    tone="ghost"
                    icon={KeyRound}
                    onClick={(e) => resetPassword(m, e)}
                  >
                    Reset MK
                  </NPButton>
                  <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-np-text-sub">
                    <span>{m.active ? "Đang bật" : "Đã tắt"}</span>
                    <Switch checked={m.active} onCheckedChange={() => toggleActive(m.id)} />
                  </label>
                </div>
              </div>
            ))
          )}
        </Card>

        <div className="h-5" />
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto bg-white sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-[16px] font-bold text-np-ink">
              {editingId ? "Chỉnh sửa nhân viên" : "Thêm nhân viên"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <FormField label="Họ tên">
              <Input
                placeholder="Nhập họ tên"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <FormField label="Email">
              <Input
                type="email"
                placeholder="email@nguyenphuong.vn"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </FormField>
            <FormField label="Số điện thoại">
              <Input
                placeholder="0901234567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </FormField>
            <FormField label="Chức danh">
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="ISoft User ID">
              <Input
                placeholder="ISF-XXX"
                value={form.isoftId}
                onChange={(e) => setForm({ ...form, isoftId: e.target.value })}
              />
            </FormField>
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-semibold text-np-text-sub">{label}</Label>
      {children}
    </div>
  );
}
