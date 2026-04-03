import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  LayoutList,
  Columns,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import AppHeader from "@/components/app-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { Badge } from "@/components/ui/badge";
import type { Customer, Order } from "@shared/schema";
import { 
  CUSTOMER_TAGS, 
  FOLLOW_UP_CUSTOMER_IDS, 
  NEW_THIS_MONTH_IDS,
  PIPELINE_COLUMNS
} from "@/lib/mock-crm";

const filterTabs = [
  { label: "Tất cả" },
  { label: "Cần follow-up", badge: 3 },
  { label: "Khách VIP" },
  { label: "Mới trong tháng" }
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
}

export default function Customers() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [viewMode, setViewMode] = useState<"list" | "pipeline">("list");

  const { data: customersData = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: ordersData = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const getCustomerStats = (phone: string) => {
    const customerOrders = ordersData.filter(order => order.phone === phone);
    const totalSpent = customerOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    return {
      orderCount: customerOrders.length,
      totalSpent
    };
  };

  const filteredCustomers = customersData.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    if (activeFilter === "Cần follow-up") {
      return FOLLOW_UP_CUSTOMER_IDS.includes(customer.id);
    }
    if (activeFilter === "Khách VIP") {
      const tags = CUSTOMER_TAGS[customer.id] || [];
      return tags.includes("VIP");
    }
    if (activeFilter === "Mới trong tháng") {
      return NEW_THIS_MONTH_IDS.includes(customer.id);
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader activePage="customers" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[{ label: "Khách hàng" }]} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-bold text-[#1a1c1d]" data-testid="text-customers-title">Khách hàng</h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex bg-[#e4e4e4] p-1 rounded-lg shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 rounded-md ${viewMode === "list" ? "bg-white shadow-sm text-[#1a1c1d]" : "text-[#616161]"}`}
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <LayoutList className="h-4 w-4 mr-1.5" />
                <span className="text-xs font-bold">Danh sách</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 rounded-md ${viewMode === "pipeline" ? "bg-white shadow-sm text-[#1a1c1d]" : "text-[#616161]"}`}
                onClick={() => setViewMode("pipeline")}
                data-testid="button-view-pipeline"
              >
                <Columns className="h-4 w-4 mr-1.5" />
                <span className="text-xs font-bold">Pipeline</span>
              </Button>
            </div>
            <Button className="rounded-lg h-8 bg-[#1a1c1d] hover:bg-[#2a2c2d] text-white text-xs px-4 font-bold shadow-sm shrink-0" data-testid="button-add-customer">
              Thêm khách hàng
            </Button>
          </div>
        </div>

        {isLoadingCustomers ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-[#008060] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <Card className="border-[#d2d5d8] shadow-sm bg-white overflow-hidden rounded-xl">
            <div className="flex items-center px-3 py-2 border-b border-[#e3e3e3] overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-0.5 shrink-0">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.label}
                    onClick={() => setActiveFilter(tab.label)}
                    className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-full transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      activeFilter === tab.label
                        ? "bg-[#e7e7e7] text-[#1a1c1d] font-semibold"
                        : "text-[#616161] hover:text-[#1a1c1d] font-medium"
                    }`}
                    data-testid={`filter-tab-customer-${tab.label}`}
                  >
                    {tab.label}
                    {tab.badge && (
                      <span className="bg-[#de3618] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-b border-[#d2d5d8]">
              <div className="relative w-full md:w-96">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9196]" />
                <Input
                  placeholder="Tìm khách hàng..."
                  className="pl-9 bg-[#f6f6f7] border-[#d2d5d8] focus:bg-white transition-all rounded-lg h-9 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-customers"
                />
              </div>
            </div>

            {viewMode === "list" ? (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader className="bg-[#f6f6f7]">
                      <TableRow className="hover:bg-transparent border-b-[#d2d5d8]">
                        <TableHead className="w-12 px-6">
                          <Checkbox className="border-[#d2d5d8]" data-testid="checkbox-select-all-customers" />
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Tên khách hàng</TableHead>
                        <TableHead className="text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Địa chỉ</TableHead>
                        <TableHead className="text-right text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Số đơn hàng</TableHead>
                        <TableHead className="text-right text-[10px] font-bold text-[#4a4d50] uppercase h-10 px-6">Tổng chi tiêu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => {
                        const stats = getCustomerStats(customer.phone);
                        return (
                          <TableRow 
                            key={customer.id} 
                            className="border-b-[#d2d5d8] hover:bg-[#f6f6f7] cursor-pointer" 
                            onClick={() => navigate(`/customers/${customer.id}`)}
                            data-testid={`row-customer-${customer.id}`}
                          >
                            <TableCell className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <Checkbox className="border-[#d2d5d8]" data-testid={`checkbox-customer-${customer.id}`} />
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <p className="text-sm font-bold text-[#005bd3] hover:underline" data-testid={`link-customer-${customer.id}`}>{customer.name}</p>
                              <p className="text-[10px] text-[#8c9196]">{customer.phone}</p>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <p className="text-sm text-[#1a1c1d]">{customer.location || "Chưa cập nhật"}</p>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <p className="text-sm text-[#1a1c1d]">{stats.orderCount} đơn</p>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <p className="text-sm font-bold text-[#1a1c1d]">{formatCurrency(stats.totalSpent)}</p>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden">
                  {filteredCustomers.map((customer) => {
                    const stats = getCustomerStats(customer.phone);
                    return (
                      <Link href={`/customers/${customer.id}`} key={customer.id}>
                        <div className="px-4 py-3.5 border-b-2 border-[#d2d5d8] hover:bg-[#f6f6f7] active:bg-[#ebebed] transition-colors" data-testid={`card-customer-${customer.id}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[#005bd3]">{customer.name}</span>
                            <span className="text-sm font-bold text-[#1a1c1d]">{formatCurrency(stats.totalSpent)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-[#8c9196]">{customer.phone}</p>
                            <p className="text-xs text-[#8c9196]">{stats.orderCount} đơn</p>
                          </div>
                          <p className="text-xs text-[#616161] mt-1">{customer.location || "Chưa cập nhật"}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="p-4 bg-[#f6f6f7] overflow-x-auto">
                <div className="flex lg:grid lg:grid-cols-4 gap-4">
                  {PIPELINE_COLUMNS.map((column, idx) => (
                    <div key={idx} className="flex flex-col gap-3 min-w-[240px] shrink-0 lg:min-w-0 lg:shrink">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-[#4a4d50] uppercase tracking-wider">{column.title}</h3>
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-bold border-[#d2d5d8] text-[#616161] bg-white">
                            {column.cards.length}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 min-h-[200px]">
                        {column.cards.map((card) => (
                          <Card 
                            key={card.customerId} 
                            className="p-3 border-[#d2d5d8] shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white border-l-4"
                            style={{ borderLeftColor: column.color }}
                            onClick={() => navigate(`/customers/${card.customerId}`)}
                            data-testid={`pipeline-card-${card.customerId}`}
                          >
                            <div className="space-y-1.5">
                              <p className="text-sm font-bold text-[#1a1c1d] leading-none">{card.name}</p>
                              <p className="text-[11px] text-[#616161]">{card.phone}</p>
                              <div className="pt-1 border-t border-[#f1f1f1] mt-2">
                                <p className="text-[10px] font-medium text-[#8c9196] uppercase tracking-tighter">Quan tâm</p>
                                <p className="text-[11px] text-[#1a1c1d] font-medium truncate">{card.serviceInterest}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-10 w-10 text-[#d2d5d8] mx-auto mb-3" />
                <p className="text-sm text-[#8c9196]">Không tìm thấy khách hàng nào</p>
              </div>
            )}

            <div className="p-4 border-t border-[#d2d5d8] flex items-center justify-between bg-white">
              <p className="text-xs text-[#8c9196]" data-testid="text-customer-count">Hiển thị {filteredCustomers.length}/{customersData.length} khách hàng</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 border-[#d2d5d8] disabled:opacity-50" disabled data-testid="button-prev-page-customers">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 border-[#d2d5d8]" data-testid="button-next-page-customers">
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
