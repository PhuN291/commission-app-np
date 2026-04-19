import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import clinicLogo from "@assets/np-clinic-logo.webp";
import clinicLogoWhite from "@assets/np-clinic-logo-white.svg";
import {
  Search, Bell, Menu, History, Stethoscope, Calendar,
  ClipboardList, User, Home, Users, Wallet,
  Award, X, ShoppingBag, ChevronDown,
  BellOff, BarChart3, TrendingUp, UserCheck, Plus, ShieldCheck, SlidersHorizontal, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadges } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { LucideIcon } from "lucide-react";
import { mockNotifications, type Notification } from "@/lib/mock-notifications";

interface AppHeaderProps {
  userName?: string;
  activePage?: string;
}

interface NavChild {
  label: string;
  href: string;
  key: string;
  badge?: string;
}

interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  key: string;
  badge?: string;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { label: "Trang chủ", icon: Home, href: "/", key: "dashboard" },
  { label: "Dịch vụ", icon: Stethoscope, href: "/services", key: "services" },
  { label: "Khách hàng", icon: Users, href: "/customers", key: "customers" },
  { label: "Đơn hàng", icon: ShoppingBag, href: "/orders", key: "orders" },
  { label: "Hoa hồng", icon: Wallet, href: "/income", key: "commission" },
  {
    label: "Báo cáo", icon: BarChart3, key: "reports-group",
    children: [
      { label: "Hiệu suất", href: "/performance", key: "performance" },
      { label: "Tổng quan", href: "/analytics/overview", key: "analytics-overview" },
      { label: "Bác sĩ", href: "/analytics/doctors", key: "analytics-doctors" },
      { label: "Bệnh nhân", href: "/analytics/patients", key: "analytics-patients" },
      { label: "Lịch hẹn", href: "/analytics/appointments", key: "analytics-appointments" },
    ],
  },
  { label: "Trợ lý AI", icon: Sparkles, href: "/ai-chat", key: "ai-chat", badge: "Mới" },
];

const settingsItems: NavItem[] = [
  {
    label: "Quản trị", icon: ShieldCheck, key: "admin-group",
    children: [
      { label: "Tổng hợp hoa hồng", href: "/admin/commission-approval", key: "admin-commission-approval" },
      { label: "Nhân viên", href: "/admin/staff", key: "admin-staff" },
      { label: "Cấu hình hoa hồng", href: "/admin/commission-config", key: "admin-commission" },
      { label: "Voucher", href: "/admin/vouchers", key: "admin-vouchers" },
      { label: "Cài đặt hệ thống", href: "/admin/settings", key: "admin-settings" },
    ],
  },
];

interface SearchHistoryItem {
  type: string;
  title: string;
  detail: string;
  href: string;
}

const SEARCH_HISTORY_KEY = "np_clinic_search_history";
const MAX_HISTORY = 5;

const suggestedServices = [
  { title: "Siêu âm Doppler Tim", detail: "500.000 ₫", href: "/services/1" },
  { title: "Nội soi tiêu hóa", detail: "2.500.000 ₫", href: "/services/2" },
  { title: "Gói khám tổng quát", detail: "3.500.000 ₫", href: "/services/8" },
  { title: "Tầm soát Tim mạch chuyên sâu", detail: "4.500.000 ₫", href: "/services/7" },
];

function getSearchHistory(): SearchHistoryItem[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSearchHistory(item: SearchHistoryItem) {
  const history = getSearchHistory().filter(h => h.title !== item.title);
  history.unshift(item);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

export default function AppHeader({ userName: userNameProp, activePage = "dashboard" }: AppHeaderProps) {
  const { data: currentUser } = useQuery<{ id: number; name: string; avatar: string | null }>({
    queryKey: ["/api/user"],
  });
  const userName = currentUser?.name || userNameProp || "Nguyễn Thị Mai";
  const userAvatar = currentUser?.avatar || null;

  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(() => [...mockNotifications]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(userName);
  const [profileAvatar, setProfileAvatar] = useState("");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: async (data: { name: string; avatar: string | null }) => {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setProfileOpen(false);
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotifClick = (id: number, href: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setNotifOpen(false);
    navigate(href);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getExpandedGroups = (): Set<string> => {
    const groups = new Set<string>();
    for (const item of [...navItems, ...settingsItems]) {
      if (item.children?.some(c => c.key === activePage)) {
        groups.add(item.key);
      }
    }
    return groups;
  };

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(getExpandedGroups);

  useEffect(() => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      for (const item of [...navItems, ...settingsItems]) {
        if (item.children?.some(c => c.key === activePage)) {
          next.add(item.key);
        }
      }
      return next;
    });
  }, [activePage]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  interface SearchResults {
    services: { id: number; code: string; title: string; price: number; category: string | null }[];
    customers: { id: number; name: string; phone: string; location: string | null }[];
    orders: { id: number; code: string; patientName: string; serviceName: string; status: string; totalPrice: number }[];
  }

  const [searchData, setSearchData] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const formatPrice = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";

  useEffect(() => {
    if (searchOpen) {
      setSearchHistory(getSearchHistory());
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchData(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) setSearchData(await res.json());
      } catch {}
      setSearchLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const hasResults = searchData && (searchData.services.length > 0 || searchData.customers.length > 0 || searchData.orders.length > 0);

  const handleResultClick = (result: { type: string; title: string; detail: string; href: string }) => {
    saveSearchHistory({ type: result.type, title: result.title, detail: result.detail, href: result.href });
    setSearchOpen(false);
    setQuery("");
    window.location.href = result.href;
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const renderNavItem = (item: NavItem) => {
    if (item.children) {
      const isExpanded = expandedGroups.has(item.key);
      const hasActiveChild = item.children.some(c => c.key === activePage);

      return (
        <div key={item.key}>
          <button
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              hasActiveChild
                ? "text-[#1a1c1d] font-semibold"
                : "text-[#303030] hover:bg-[#e8e8e8]"
            }`}
            onClick={() => toggleGroup(item.key)}
            data-testid={`nav-${item.key}`}
          >
            <item.icon className="h-5 w-5 shrink-0" strokeWidth={hasActiveChild ? 2.2 : 1.8} />
            <span className="text-[15px] flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="text-xs bg-[#e4e5e7] text-[#616161] rounded-md px-2 py-0.5 font-medium">{item.badge}</span>
            )}
            <ChevronDown className={`h-4 w-4 text-[#8c9196] shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
          </button>
          {isExpanded && (
            <div className="ml-4 pl-4 border-l border-[#d4d4d4] mt-0.5 mb-1 space-y-0.5">
              {item.children.map(child => {
                const isChildActive = child.key === activePage;
                const childContent = (
                  <div
                    className={`flex items-center gap-2 px-3 py-[7px] rounded-lg cursor-pointer transition-colors ${
                      isChildActive
                        ? "bg-[#e4e4e4] font-semibold text-[#1a1c1d]"
                        : "text-[#616161] hover:bg-[#e8e8e8] hover:text-[#303030]"
                    }`}
                    onClick={() => setMenuOpen(false)}
                    data-testid={`nav-${child.key}`}
                  >
                    <span className="text-[14px] flex-1">{child.label}</span>
                    {child.badge && (
                      <span className="text-[11px] bg-[#e4e5e7] text-[#616161] rounded-md px-1.5 py-0.5 font-medium">{child.badge}</span>
                    )}
                  </div>
                );
                if (child.href === "#") return <div key={child.key}>{childContent}</div>;
                return <Link href={child.href} key={child.key}>{childContent}</Link>;
              })}
            </div>
          )}
        </div>
      );
    }

    const isActive = item.key === activePage;
    const content = (
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
          isActive
            ? "bg-[#e4e4e4] font-semibold text-[#1a1c1d]"
            : "text-[#303030] hover:bg-[#e8e8e8]"
        }`}
        onClick={() => setMenuOpen(false)}
        data-testid={`nav-${item.key}`}
      >
        <item.icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
        <span className="text-[15px] flex-1">{item.label}</span>
        {item.badge && (
          <span className={`text-xs rounded-md px-2 py-0.5 font-medium ${
            item.badge === "Mới" ? "bg-[#e4f3d9] text-[#008060]" : "bg-[#e4e5e7] text-[#616161]"
          }`}>{item.badge}</span>
        )}
      </div>
    );

    if (item.href === "#") return <div key={item.key}>{content}</div>;
    return (
      <Link href={item.href!} key={item.key}>
        {content}
      </Link>
    );
  };

  return (
    <>
      <header className="h-[56px] bg-[#1a1c1d] flex items-center px-3 md:px-4 sticky top-0 z-50 gap-2 md:gap-3" data-testid="app-header">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg text-[#b5b5b5] hover:text-white hover:bg-[#303030] transition-colors"
          data-testid="button-menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Logo chỉ hiện trong sidebar menu, không hiện trên header */}

        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <div className="search-glow-wrapper flex-1 max-w-[280px] md:max-w-xl lg:max-w-2xl rounded-lg">
            <DialogTrigger asChild>
              <button
                className="relative z-[1] w-full flex items-center gap-2.5 h-9 md:h-10 px-3 md:px-4 rounded-lg bg-[#303030] hover:bg-[#383838] border border-transparent transition-colors cursor-text"
                data-testid="header-search-trigger"
              >
                <Search className="h-[18px] w-[18px] text-[#8a8a8a] shrink-0" />
                <span className="text-[14px] md:text-[15px] text-[#8a8a8a] truncate">Search</span>
              </button>
            </DialogTrigger>
          </div>
          <DialogContent
            aria-describedby={undefined}
            className="sm:max-w-[600px] p-0 gap-0 border-none shadow-2xl rounded-xl overflow-hidden"
          >
            <DialogHeader className="hidden">
              <DialogTitle>Tìm kiếm nâng cao</DialogTitle>
            </DialogHeader>
            <div className="flex items-center border-b border-[#d2d5d8] px-4 bg-white">
              <Search className="h-5 w-5 text-[#8c9196]" />
              <input
                className="flex h-14 w-full rounded-md bg-transparent py-3 px-3 text-sm outline-none placeholder:text-[#8c9196]"
                placeholder="Tìm dịch vụ, khách hàng, lịch hẹn..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                data-testid="input-search"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto p-2 bg-[#f6f6f7]">
              {query ? (
                searchLoading ? (
                  <div className="py-10 text-center">
                    <div className="h-6 w-6 border-2 border-[#008060] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs text-[#8c9196]">Đang tìm kiếm...</p>
                  </div>
                ) : hasResults ? (
                  <div className="space-y-3">
                    {searchData!.services.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-[#8c9196] uppercase tracking-wider px-2 mb-1">Dịch vụ</p>
                        <div className="space-y-0.5">
                          {searchData!.services.map((s) => (
                            <div
                              key={`svc-${s.id}`}
                              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer group transition-all"
                              onClick={() => handleResultClick({ type: "Dịch vụ", title: s.title, detail: formatPrice(s.price), href: `/services/${s.id}` })}
                              data-testid={`search-service-${s.id}`}
                            >
                              <div className="h-9 w-9 rounded-lg bg-[#e4f3d9] flex items-center justify-center text-[#008060]">
                                <Stethoscope className="h-4.5 w-4.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#1a1c1d] truncate">{s.title}</p>
                                <p className="text-xs text-[#8c9196]">{s.code} · {formatPrice(s.price)}</p>
                              </div>
                              {s.category && (
                                <span className="text-[10px] font-medium text-[#008060] bg-[#e4f3d9] px-2 py-0.5 rounded-full shrink-0">{s.category}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchData!.customers.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-[#8c9196] uppercase tracking-wider px-2 mb-1">Khách hàng</p>
                        <div className="space-y-0.5">
                          {searchData!.customers.map((c) => (
                            <div
                              key={`cust-${c.id}`}
                              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer group transition-all"
                              onClick={() => handleResultClick({ type: "Khách hàng", title: c.name, detail: c.phone, href: `/customers/${c.id}` })}
                              data-testid={`search-customer-${c.id}`}
                            >
                              <div className="h-9 w-9 rounded-lg bg-[#dbeafe] flex items-center justify-center text-[#1e40af]">
                                <User className="h-4.5 w-4.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#1a1c1d] truncate">{c.name}</p>
                                <p className="text-xs text-[#8c9196]">{c.phone}{c.location ? ` · ${c.location}` : ""}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchData!.orders.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-[#8c9196] uppercase tracking-wider px-2 mb-1">Đơn hàng</p>
                        <div className="space-y-0.5">
                          {searchData!.orders.map((o) => (
                            <div
                              key={`ord-${o.id}`}
                              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer group transition-all"
                              onClick={() => handleResultClick({ type: "Đơn hàng", title: o.code, detail: `${o.patientName} · ${formatPrice(o.totalPrice)}`, href: `/orders/${o.id}` })}
                              data-testid={`search-order-${o.id}`}
                            >
                              <div className="h-9 w-9 rounded-lg bg-[#fff4bd] flex items-center justify-center text-[#8a6116]">
                                <ShoppingBag className="h-4.5 w-4.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#1a1c1d] truncate">{o.code}</p>
                                <p className="text-xs text-[#8c9196] truncate">{o.serviceName} · {o.patientName}</p>
                              </div>
                              <OrderStatusBadges appointmentStatus={o.appointmentStatus} visitStatus={o.visitStatus} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <Search className="h-10 w-10 text-[#d2d5d8] mx-auto mb-3" />
                    <p className="text-sm font-medium text-[#4a4d50]">Không tìm thấy kết quả</p>
                    <p className="text-xs text-[#8c9196] mt-1">Thử tìm với từ khóa khác</p>
                  </div>
                )
              ) : (
                <div className="space-y-3 py-2">
                  {searchHistory.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between px-2 mb-1">
                        <p className="text-[11px] font-bold text-[#8c9196] uppercase tracking-wider">Tìm kiếm gần đây</p>
                        <button
                          onClick={handleClearHistory}
                          className="text-[11px] text-[#005bd3] hover:underline font-medium"
                          data-testid="button-clear-history"
                        >
                          Xoá tất cả
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        {searchHistory.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer group transition-all"
                            onClick={() => handleResultClick(item)}
                            data-testid={`history-item-${i}`}
                          >
                            <div className="h-8 w-8 rounded-md bg-white border border-[#d2d5d8] flex items-center justify-center text-[#8c9196] group-hover:text-[#1a1c1d]">
                              <History className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1a1c1d] truncate">{item.title}</p>
                              <p className="text-xs text-[#8c9196]">{item.detail}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold text-[#8c9196] border-[#d2d5d8] shrink-0">
                              {item.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="px-2 mb-1">
                      <p className="text-[11px] font-bold text-[#8c9196] uppercase tracking-wider">Dịch vụ phổ biến</p>
                    </div>
                    <div className="space-y-0.5">
                      {suggestedServices.map((svc, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer group transition-all"
                          onClick={() => handleResultClick({ type: "Dịch vụ", ...svc })}
                          data-testid={`suggested-service-${i}`}
                        >
                          <div className="h-8 w-8 rounded-lg bg-[#e4f3d9] flex items-center justify-center text-[#008060]">
                            <Stethoscope className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1a1c1d] truncate">{svc.title}</p>
                            <p className="text-xs text-[#8c9196]">{svc.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-[#d2d5d8] bg-white flex items-center justify-between text-[11px] text-[#8c9196] font-medium">
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <span className="p-0.5 border rounded bg-[#f6f6f7]">↵</span> Chọn
                </span>
                <span className="flex items-center gap-1">
                  <span className="p-0.5 border rounded bg-[#f6f6f7]">↑↓</span> Di chuyển
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Link href="/orders/create" className="hidden md:flex shrink-0 ml-auto">
          <button
            className="h-9 flex items-center gap-1.5 px-3 rounded-lg bg-[#1a8a7d] hover:bg-[#168173] text-white text-[13px] font-semibold transition-colors"
            data-testid="header-create-order"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo đơn hàng</span>
          </button>
        </Link>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link href="/ai-chat">
            <button
              className="h-9 w-9 flex items-center justify-center rounded-lg text-[#b5b5b5] hover:text-white hover:bg-[#303030] transition-colors"
              data-testid="button-store"
            >
              <Sparkles className="h-5 w-5" />
            </button>
          </Link>
          <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
            <SheetTrigger asChild>
              <button
                className="h-9 w-9 flex items-center justify-center rounded-lg text-[#b5b5b5] hover:text-white hover:bg-[#303030] transition-colors relative"
                data-testid="button-notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-[18px] min-w-[18px] px-1 flex items-center justify-center rounded-full bg-[#e53e3e] text-white text-[10px] font-bold leading-none" data-testid="badge-notif-count">
                    {unreadCount}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-[400px] p-0 !gap-0 flex flex-col bg-[#f6f6f7]" aria-describedby={undefined}>
              <div className="px-4 pt-5 pb-3 border-b border-[#e3e3e3] bg-white flex items-center justify-between pr-12">
                <SheetHeader className="space-y-0 !text-left p-0">
                  <SheetTitle className="text-base font-bold text-[#1a1c1d]">Thông báo</SheetTitle>
                </SheetHeader>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[12px] font-medium text-[#008060] hover:underline shrink-0"
                    data-testid="button-mark-all-read"
                  >
                    Đánh dấu tất cả đã đọc
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {notifications.every(n => n.read) ? (
                  <div className="flex flex-col items-center justify-center py-20 px-6" data-testid="notif-empty-state">
                    <div className="h-16 w-16 rounded-full bg-[#e3e3e3] flex items-center justify-center mb-4">
                      <BellOff className="h-8 w-8 text-[#8c9196]" />
                    </div>
                    <p className="text-sm font-medium text-[#4a4d50]">Bạn đã xem hết thông báo</p>
                    <p className="text-xs text-[#8c9196] mt-1">Không có thông báo mới</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#e3e3e3]">
                    {notifications.map((notif) => {
                      const NotifIcon = notif.icon;
                      return (
                        <div
                          key={notif.id}
                          className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-white ${
                            !notif.read ? "bg-[#f0fdf4]" : ""
                          }`}
                          onClick={() => handleNotifClick(notif.id, notif.href)}
                          data-testid={`notif-item-${notif.id}`}
                        >
                          <div className="relative shrink-0">
                            <div className="h-10 w-10 rounded-lg bg-[#f6f6f7] border border-[#e3e3e3] flex items-center justify-center">
                              <NotifIcon className="h-[18px] w-[18px] text-[#4a4d50]" />
                            </div>
                            {!notif.read && (
                              <div className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-[#008060] border-2 border-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug ${!notif.read ? "font-bold text-[#1a1c1d]" : "font-semibold text-[#4a4d50]"}`}>{notif.title}</p>
                            <p className="text-[13px] text-[#6d7175] mt-0.5 line-clamp-2 leading-relaxed">{notif.content}</p>
                            <p className="text-xs text-[#8c9196] mt-1">{notif.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
          <Dialog open={profileOpen} onOpenChange={(open) => {
            setProfileOpen(open);
            if (open) {
              setProfileName(userName);
              setProfileAvatar(userAvatar || "");
            }
          }}>
            <DialogTrigger asChild>
              <Avatar className="h-9 w-9 rounded-full cursor-pointer ml-1" data-testid="header-avatar">
                {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                <AvatarFallback className="text-xs font-bold bg-[#a855f7] text-white rounded-full">{initials}</AvatarFallback>
              </Avatar>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 shrink-0">
                    {profileAvatar && <AvatarImage src={profileAvatar} alt={profileName} />}
                    <AvatarFallback className="text-lg font-bold bg-[#a855f7] text-white">
                      {profileName.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{profileName}</p>
                    <p className="text-xs text-[#8c9196]">Chuyên viên Tư vấn</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-name" className="text-sm font-medium">Họ và tên</Label>
                  <Input
                    id="profile-name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Nhập họ và tên"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-avatar" className="text-sm font-medium">URL ảnh đại diện</Label>
                  <Input
                    id="profile-avatar"
                    value={profileAvatar}
                    onChange={(e) => setProfileAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <Button
                  className="w-full bg-[#1a8a7d] hover:bg-[#168173] text-white"
                  disabled={!profileName.trim() || updateProfile.isPending}
                  onClick={() => updateProfile.mutate({
                    name: profileName.trim(),
                    avatar: profileAvatar.trim() || null,
                  })}
                >
                  {updateProfile.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div
        className={`fixed inset-0 bg-black/40 z-40 top-[56px] transition-opacity duration-300 ${
          menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
        data-testid="menu-overlay"
      />
      <div
        className={`fixed left-0 top-[56px] bottom-0 z-50 w-[280px] bg-[#f1f1f1] rounded-tr-2xl shadow-[4px_0_24px_rgba(0,0,0,0.12)] overflow-y-auto transition-transform duration-300 ease-out ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="nav-menu"
      >
        <div className="px-4 pt-4 pb-2 flex justify-center">
          <img src={clinicLogo} alt="NP Clinic" className="h-12 object-contain" data-testid="sidebar-logo" />
        </div>
        <nav className="p-2 space-y-0.5">
          {navItems.map(item => renderNavItem(item))}
        </nav>
        <div className="mx-3 border-t border-[#e4e5e7]" />
        <nav className="p-2 space-y-0.5">
          {settingsItems.map(item => renderNavItem(item))}
        </nav>
      </div>
    </>
  );
}
