import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import AppHeader from "@/components/app-header";
import { Breadcrumb } from "@/components/breadcrumb";
import DateRangeFilter from "@/components/date-range-filter";
import { OrderStatusBadges } from "@/components/status-badge";
import { APPOINTMENT_FILTER_TABS } from "@shared/status";
import type { Order, User } from "@shared/schema";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
}

export default function Orders() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const searchParams = new URLSearchParams(window.location.search);
  const initialFilter = searchParams.get("status") === "pending" ? "pending" : "all";
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [dateRange, setDateRange] = useState("last_30_days");

  const { data: ordersData = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: usersData = [] } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/users"],
  });

  const usersMap = Object.fromEntries(usersData.map(u => [u.id, u]));

  function getUserInitials(name: string) {
    return name.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase();
  }

  const filteredOrders = ordersData.filter(order => {
    const matchesSearch = order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.serviceName.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "all") return true;
    return order.appointmentStatus === activeFilter;
  });

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader activePage="orders" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[{ label: "Đơn hàng" }]} />
        <div className="flex items-center gap-3">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1a1c1d]" data-testid="text-orders-title">Đơn hàng</h1>
          <Button onClick={() => navigate("/orders/new")} className="rounded-lg h-8 bg-[#1a1c1d] hover:bg-[#2a2c2d] text-white text-xs px-4 font-bold shadow-sm" data-testid="button-new-order">
            <Plus className="h-4 w-4 mr-2" />
            Tạo đơn hàng
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-[#008060] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
        <Card className="border-[#d2d5d8] shadow-sm bg-white overflow-hidden rounded-xl">
          <div className="flex items-center px-3 py-2 border-b border-[#e3e3e3] overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-0.5 shrink-0">
              {APPOINTMENT_FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveFilter(tab.value)}
                  className={`px-4 py-1.5 text-sm rounded-full transition-all whitespace-nowrap ${
                    activeFilter === tab.value
                      ? "bg-[#e7e7e7] text-[#1a1c1d] font-semibold"
                      : "text-[#616161] hover:text-[#1a1c1d] font-medium"
                  }`}
                  data-testid={`filter-tab-${tab.value}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-b border-[#d2d5d8]">
            <div className="relative w-full md:w-96">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9196]" />
              <Input
                placeholder="Tìm mã đơn, tên khách, dịch vụ..."
                className="pl-9 bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white transition-all rounded-lg h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-orders"
              />
            </div>
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-[#f6f6f7]">
                <TableRow className="hover:bg-transparent border-b-[#d2d5d8]">
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6 w-40">Mã đơn</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Khách hàng</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Dịch vụ</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Ngày tạo</TableHead>
                  <TableHead className="text-right text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Giá trị</TableHead>
                  <TableHead className="text-center text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="border-b-[#d2d5d8] hover:bg-[#f6f6f7] cursor-pointer" data-testid={`row-order-${order.id}`}>
                    <TableCell className="px-6 py-4">
                      <Link href={`/orders/${order.id}`}>
                        <span className="text-sm font-bold text-[#005bd3] hover:underline cursor-pointer" data-testid={`link-order-${order.id}`}>{order.code}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <p className="text-sm font-medium text-[#1a1c1d]">{order.patientName}</p>
                      <p className="text-[10px] text-[#8c9196]">{order.phone}</p>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <p className="text-sm font-medium text-[#1a1c1d]">{order.serviceName}</p>
                      <p className="text-[10px] text-[#8c9196]">SL: {order.quantity}</p>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <p className="text-sm text-[#1a1c1d]">{order.createdAt}</p>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-[#1a1c1d]">{formatCurrency(order.totalPrice)}</p>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <OrderStatusBadges appointmentStatus={order.appointmentStatus} visitStatus={order.visitStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden">
            {filteredOrders.map((order) => (
              <Link href={`/orders/${order.id}`} key={order.id}>
                <div className="px-4 py-3.5 border-b-2 border-[#d2d5d8] hover:bg-[#f6f6f7] active:bg-[#ebebed] transition-colors" data-testid={`card-order-${order.id}`}>
                  <p className="text-xs text-[#8c9196] mb-0.5">{order.createdAt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1a1c1d]" data-testid={`link-order-mobile-${order.id}`}>{order.code}</span>
                    <span className="text-sm font-bold text-[#1a1c1d]">{formatCurrency(order.totalPrice)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <OrderStatusBadges appointmentStatus={order.appointmentStatus} visitStatus={order.visitStatus} />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-sm text-[#616161]">{order.patientName} • {order.quantity} dịch vụ</p>
                    {usersMap[order.userId] && (
                      <Avatar className="h-6 w-6 shrink-0">
                        {usersMap[order.userId].avatar && <AvatarImage src={usersMap[order.userId].avatar!} alt={usersMap[order.userId].name} />}
                        <AvatarFallback className="text-[9px] font-bold bg-[#a855f7] text-white">
                          {getUserInitials(usersMap[order.userId].name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBag className="h-10 w-10 text-[#d2d5d8] mx-auto mb-3" />
              <p className="text-sm text-[#8c9196]">Không tìm thấy đơn hàng nào</p>
            </div>
          )}

          <div className="p-4 border-t border-[#d2d5d8] flex items-center justify-between bg-white">
            <p className="text-xs text-[#8c9196]" data-testid="text-order-count">Hiển thị {filteredOrders.length}/{ordersData.length} đơn</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 border-[#d2d5d8] disabled:opacity-50" disabled data-testid="button-prev-page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 border-[#d2d5d8]" data-testid="button-next-page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
        )}
      </main>
    </div>
  );
}
