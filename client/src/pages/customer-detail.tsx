import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import {
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  MoreHorizontal,
  ExternalLink,
  Plus,
  MessageSquare,
  Users,
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AppHeader from "@/components/app-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { OrderStatusBadges } from "@/components/status-badge";
import type { Customer, Order } from "@shared/schema";
import {
  CUSTOMER_INTERACTIONS,
  CUSTOMER_REMINDERS,
  type InteractionEntry,
  type Reminder,
  type InteractionType,
} from "@/lib/mock-crm";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
}

export default function CustomerDetail() {
  const [, params] = useRoute("/customers/:id");
  const [, navigate] = useLocation();
  const customerId = params?.id ? parseInt(params.id) : 0;

  const [interactions, setInteractions] = useState<InteractionEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [isAddingInteraction, setIsAddingInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState<{ type: InteractionType; note: string }>({
    type: "Goi dien",
    note: "",
  });

  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminder, setNewReminder] = useState({ content: "", dueDate: "" });

  const { data: customerData, isLoading: isLoadingCustomer } = useQuery<{
    customer: Customer;
    orders: Order[];
    stats: {
      orderCount: number;
      totalSpent: number;
      customerSince: string;
    };
  }>({
    queryKey: [`/api/customers/${customerId}`],
    enabled: customerId > 0,
  });

  useEffect(() => {
    if (customerId > 0) {
      setInteractions(CUSTOMER_INTERACTIONS[customerId] || []);
      setReminders(CUSTOMER_REMINDERS[customerId] || []);
    }
  }, [customerId]);

  const handleAddInteraction = () => {
    if (!newInteraction.note.trim()) return;
    const entry: InteractionEntry = {
      id: Date.now(),
      date: new Date().toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: newInteraction.type,
      note: newInteraction.note,
      performer: "Nguyễn Thị Mai",
    };
    setInteractions([entry, ...interactions]);
    setNewInteraction({ type: "Goi dien", note: "" });
    setIsAddingInteraction(false);
  };

  const handleAddReminder = () => {
    if (!newReminder.content.trim() || !newReminder.dueDate) return;
    const reminder: Reminder = {
      id: Date.now(),
      content: newReminder.content,
      dueDate: newReminder.dueDate.split("-").reverse().join("/"),
      status: "upcoming",
    };
    setReminders([reminder, ...reminders]);
    setNewReminder({ content: "", dueDate: "" });
    setIsAddingReminder(false);
  };

  const getInteractionIcon = (type: InteractionType) => {
    switch (type) {
      case "Goi dien":
        return <Phone className="h-3.5 w-3.5" />;
      case "Nhan tin":
        return <MessageSquare className="h-3.5 w-3.5" />;
      case "Gap truc tiep":
        return <Users className="h-3.5 w-3.5" />;
      case "Kham xong":
        return <Stethoscope className="h-3.5 w-3.5" />;
      default:
        return <MessageSquare className="h-3.5 w-3.5" />;
    }
  };

  if (isLoadingCustomer) {
    return (
      <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
        <AppHeader activePage="customers" />
        <main className="flex-1 p-4 md:p-8 bg-[#f6f6f7] rounded-t-2xl flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-[#008060] border-t-transparent rounded-full animate-spin"></div>
        </main>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
        <AppHeader activePage="customers" />
        <main className="flex-1 p-4 md:p-8 bg-[#f6f6f7] rounded-t-2xl flex items-center justify-center">
          <p className="text-[#8c9196]">Không tìm thấy khách hàng</p>
        </main>
      </div>
    );
  }

  const { customer, orders, stats } = customerData;
  const lastOrder = orders.length > 0 ? orders[0] : null;

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader activePage="customers" />

      <main className="flex-1 p-4 md:p-8 space-y-5 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[{ label: "Khách hàng", href: "/customers" }, { label: customer.name }]} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate("/customers")}
              className="shrink-0 text-[#8c9196] hover:text-[#1a1c1d] transition-colors"
              data-testid="button-back-customers"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-[#1a1c1d] truncate" data-testid="text-customer-name">
              {customer.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-[#d2d5d8] font-bold text-xs" data-testid="button-customer-actions">
                  Thao tác
                  <MoreHorizontal className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.print()}>In hồ sơ</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Xóa khách hàng</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 border-[#d2d5d8] shadow-none bg-white rounded-xl">
            <p className="text-xs text-[#616161] font-medium mb-1">Tổng chi tiêu</p>
            <p className="text-lg font-bold text-[#1a1c1d]" data-testid="text-stat-total-spent">
              {formatCurrency(stats.totalSpent)}
            </p>
          </Card>
          <Card className="p-4 border-[#d2d5d8] shadow-none bg-white rounded-xl">
            <p className="text-xs text-[#616161] font-medium mb-1">Số đơn hàng</p>
            <p className="text-lg font-bold text-[#1a1c1d]" data-testid="text-stat-order-count">
              {stats.orderCount} đơn
            </p>
          </Card>
          <Card className="p-4 border-[#d2d5d8] shadow-none bg-white rounded-xl">
            <p className="text-xs text-[#616161] font-medium mb-1">Khách hàng từ</p>
            <p className="text-lg font-bold text-[#1a1c1d]" data-testid="text-stat-customer-since">
              {stats.customerSince}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column: Orders & CRM Sections */}
          <div className="lg:col-span-2 space-y-5">
            {/* Lich su tuong tac */}
            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#1a1c1d]">Lịch sử tương tác</h2>
                {!isAddingInteraction && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-[#d2d5d8] text-xs font-bold"
                    onClick={() => setIsAddingInteraction(true)}
                    data-testid="button-add-interaction"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Thêm ghi chú
                  </Button>
                )}
              </div>
              <div className="px-4 sm:px-5 py-4">
                {isAddingInteraction && (
                  <div className="mb-6 p-4 border border-[#e3e3e3] rounded-lg bg-[#f9fafb] space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#616161] uppercase">Loại tương tác</label>
                        <Select
                          value={newInteraction.type}
                          onValueChange={(v) => setNewInteraction({ ...newInteraction, type: v as InteractionType })}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Chọn loại" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Goi dien">Gọi điện</SelectItem>
                            <SelectItem value="Nhan tin">Nhắn tin</SelectItem>
                            <SelectItem value="Gap truc tiep">Gặp trực tiếp</SelectItem>
                            <SelectItem value="Kham xong">Khám xong</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#616161] uppercase">Nội dung</label>
                      <Textarea
                        placeholder="Nhập nội dung tương tác..."
                        className="text-xs min-h-[80px]"
                        value={newInteraction.note}
                        onChange={(e) => setNewInteraction({ ...newInteraction, note: e.target.value })}
                        data-testid="textarea-interaction-note"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-bold"
                        onClick={() => setIsAddingInteraction(false)}
                      >
                        Hủy
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 bg-[#1a1c1d] hover:bg-[#2a2c2d] text-white text-xs font-bold"
                        onClick={handleAddInteraction}
                        data-testid="button-save-interaction"
                      >
                        Lưu ghi chú
                      </Button>
                    </div>
                  </div>
                )}

                <div className="relative space-y-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-[#e3e3e3]">
                  {interactions.map((entry) => (
                    <div key={entry.id} className="relative pl-10">
                      <div className="absolute left-0 top-0 h-9 w-9 rounded-full bg-white border border-[#e3e3e3] flex items-center justify-center text-[#616161] z-10">
                        {getInteractionIcon(entry.type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#1a1c1d]">{entry.type}</span>
                          <span className="text-[10px] text-[#8c9196]">{entry.date}</span>
                          <Badge variant="outline" className="text-[9px] font-normal border-[#e3e3e3] px-1 py-0 h-4">
                            {entry.performer}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#303030] leading-relaxed" data-testid={`text-interaction-note-${entry.id}`}>
                          {entry.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Don hang lien quan */}
            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#1a1c1d]">Đơn hàng liên quan</h2>
                <Button
                  size="sm"
                  className="h-8 bg-[#1a1c1d] hover:bg-[#2a2c2d] text-white text-xs font-bold"
                  onClick={() => navigate("/orders/new")}
                  data-testid="button-create-order-related"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Tạo đơn hàng
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f9fafb] border-b border-[#e3e3e3]">
                      <th className="px-5 py-3 text-[11px] font-bold text-[#616161] uppercase tracking-wider">Mã đơn</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[#616161] uppercase tracking-wider">Dịch vụ</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[#616161] uppercase tracking-wider">Ngày tạo</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[#616161] uppercase tracking-wider">Trạng thái</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-[#616161] uppercase tracking-wider text-right">Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f1f1]">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-[#f9fafb] transition-colors group">
                        <td className="px-5 py-3">
                          <Link href={`/orders/${order.id}`}>
                            <span className="text-sm font-bold text-[#005bd3] hover:underline cursor-pointer">
                              {order.code}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-3 max-w-[220px]">
                          <p className="text-sm font-medium text-[#1a1c1d] line-clamp-2">{order.serviceName}</p>
                          <p className="text-[10px] text-[#8c9196]">{order.serviceCode}</p>
                        </td>
                        <td className="px-5 py-3 text-xs text-[#616161]">
                          {order.createdAt.split(" ")[0]}
                        </td>
                        <td className="px-5 py-3">
                          <OrderStatusBadges appointmentStatus={order.appointmentStatus} visitStatus={order.visitStatus} />
                        </td>
                        <td className="px-5 py-3 text-sm font-bold text-[#1a1c1d] text-right">
                          {formatCurrency(order.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {orders.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-[#8c9196]">Chưa có đơn hàng nào</p>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Customer Info */}
          <div className="space-y-5">
            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#1a1c1d]">Khách hàng</h2>
                <Button variant="ghost" size="sm" className="h-auto p-0 text-[#005bd3] text-xs font-medium hover:bg-transparent">
                  Chỉnh sửa
                </Button>
              </div>
              <div className="px-4 sm:px-5 py-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-[#616161] font-medium">Thông tin liên hệ</p>
                  <div className="flex items-center gap-2 text-sm text-[#005bd3] hover:underline cursor-pointer">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-[#8c9196]" />
                    <span className="truncate" data-testid="text-customer-email">
                      {customer.email || "Không có email"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#616161]">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-[#8c9196]" />
                    <span data-testid="text-customer-phone">{customer.phone}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#f1f1f1] space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#616161] font-medium">Địa chỉ mặc định</p>
                    <button className="text-[#005bd3] text-xs font-medium hover:underline">Quản lý</button>
                  </div>
                  <div className="flex gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#8c9196] mt-1" />
                    <div className="text-sm text-[#616161]">
                      <p data-testid="text-customer-address">{customer.address || "Chưa cập nhật địa chỉ"}</p>
                      <p className="mt-1 font-medium text-[#1a1c1d]" data-testid="text-customer-location">
                        {customer.location || ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Nhac nho section */}
            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#e3e3e3] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#1a1c1d]">Nhắc nhở</h2>
                {!isAddingReminder && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-[#005bd3] text-xs font-medium hover:bg-transparent"
                    onClick={() => setIsAddingReminder(true)}
                    data-testid="button-add-reminder"
                  >
                    Tạo nhắc nhở
                  </Button>
                )}
              </div>
              <div className="px-4 sm:px-5 py-4 space-y-4">
                {isAddingReminder && (
                  <div className="p-3 border border-[#e3e3e3] rounded-lg bg-[#f9fafb] space-y-3 mb-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#616161] uppercase">Hạn chót</label>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={newReminder.dueDate}
                        onChange={(e) => setNewReminder({ ...newReminder, dueDate: e.target.value })}
                        data-testid="input-reminder-date"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#616161] uppercase">Nội dung</label>
                      <Input
                        placeholder="Nhập nội dung nhắc nhở..."
                        className="h-8 text-xs"
                        value={newReminder.content}
                        onChange={(e) => setNewReminder({ ...newReminder, content: e.target.value })}
                        data-testid="input-reminder-content"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setIsAddingReminder(false)}
                      >
                        Hủy
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 bg-[#1a1c1d] hover:bg-[#2a2c2d] text-white text-xs"
                        onClick={handleAddReminder}
                        data-testid="button-save-reminder"
                      >
                        Lưu
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {reminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#f9fafb] border border-[#f1f1f1]">
                      {reminder.status === "done" ? (
                        <CheckCircle2 className="h-4 w-4 text-[#008060] shrink-0 mt-0.5" />
                      ) : reminder.status === "overdue" ? (
                        <AlertCircle className="h-4 w-4 text-[#8a1c1c] shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="h-4 w-4 text-[#8a6116] shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#1a1c1d] leading-normal">{reminder.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[#8c9196]">{reminder.dueDate}</span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold px-1.5 py-0 border-0 ${
                              reminder.status === "upcoming" ? "bg-[#fff4bd] text-[#8a6116]" :
                              reminder.status === "overdue" ? "bg-[#fead9a] text-[#8a1c1c]" :
                              "bg-[#bbe5b3] text-[#008060]"
                            }`}
                          >
                            {reminder.status === "upcoming" ? "Sắp tới" :
                             reminder.status === "overdue" ? "Quá hạn" :
                             "Hoàn tất"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {reminders.length === 0 && (
                    <p className="text-xs text-[#8c9196] italic text-center py-2">Không có nhắc nhở nào</p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="border-[#d2d5d8] shadow-sm bg-white rounded-xl overflow-hidden p-4">
              <h2 className="text-sm font-bold text-[#1a1c1d] mb-3">Ghi chú khách hàng</h2>
              <p className="text-sm text-[#8c9196] italic">Không có ghi chú nào cho khách hàng này.</p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
