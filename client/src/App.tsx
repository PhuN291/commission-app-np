import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { useTheoDoiDieuHuong } from "@/lib/use-back";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";

// Các trang dưới đây không cần tải ngay khi mở app — lazy-load theo route để
// giảm bundle JS ban đầu (đặc biệt các trang admin ít dùng).
const NotFound = lazy(() => import("@/pages/not-found"));
const Services = lazy(() => import("@/pages/services"));
const Income = lazy(() => import("@/pages/income"));
const Orders = lazy(() => import("@/pages/orders"));
const OrderDetail = lazy(() => import("@/pages/order-detail"));
const OrderCreate = lazy(() => import("@/pages/order-create"));
const ServiceDetail = lazy(() => import("@/pages/service-detail"));
const Customers = lazy(() => import("@/pages/customers"));
const CustomerDetail = lazy(() => import("@/pages/customer-detail"));
const Ranking = lazy(() => import("@/pages/ranking"));
const AnalyticsOverview = lazy(() => import("@/pages/analytics-overview"));
const AnalyticsAppointments = lazy(() => import("@/pages/analytics-appointments"));
const AdminStaff = lazy(() => import("@/pages/admin-staff"));
const AdminCommissionConfig = lazy(() => import("@/pages/admin-commission-config"));
const AdminVouchers = lazy(() => import("@/pages/admin-vouchers"));
const AdminVoucherDetail = lazy(() => import("@/pages/admin-voucher-detail"));
const AdminCommissionApproval = lazy(() => import("@/pages/admin-commission-approval"));
const AdminSettings = lazy(() => import("@/pages/admin-settings"));
const Notifications = lazy(() => import("@/pages/notifications"));
const RecallWorklist = lazy(() => import("@/pages/recall-worklist"));

function RouteFallback() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <Spinner className="size-6" />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  // Auth gate — checks np_token issued by /api/auth/verify-otp.
  // Legacy `np_authenticated` is cleaned up on login success.
  const token = localStorage.getItem("np_token");
  if (!token) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  // Đếm số trang đã qua để nút quay lại biết có lịch sử mà lùi hay không.
  useTheoDoiDieuHuong();
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/login" component={Login}/>
        <Route path="/">{() => <ProtectedRoute component={Dashboard} />}</Route>
        <Route path="/services">{() => <ProtectedRoute component={Services} />}</Route>
        <Route path="/services/:id">{() => <ProtectedRoute component={ServiceDetail} />}</Route>
        <Route path="/orders">{() => <ProtectedRoute component={Orders} />}</Route>
        <Route path="/orders/new">{() => <ProtectedRoute component={OrderCreate} />}</Route>
        <Route path="/orders/:id">{() => <ProtectedRoute component={OrderDetail} />}</Route>
        <Route path="/income">{() => <ProtectedRoute component={Income} />}</Route>
        <Route path="/notifications">{() => <ProtectedRoute component={Notifications} />}</Route>
        <Route path="/customers">{() => <ProtectedRoute component={Customers} />}</Route>
        <Route path="/customers/:id">{() => <ProtectedRoute component={CustomerDetail} />}</Route>
        <Route path="/recalls">{() => <ProtectedRoute component={RecallWorklist} />}</Route>
        <Route path="/ranking">{() => <ProtectedRoute component={Ranking} />}</Route>
        <Route path="/analytics">{() => <ProtectedRoute component={AnalyticsOverview} />}</Route>
        <Route path="/analytics/overview">{() => <ProtectedRoute component={AnalyticsOverview} />}</Route>
        <Route path="/analytics/appointments">{() => <ProtectedRoute component={AnalyticsAppointments} />}</Route>
        <Route path="/admin/staff">{() => <ProtectedRoute component={AdminStaff} />}</Route>
        <Route path="/admin/commission-config">{() => <ProtectedRoute component={AdminCommissionConfig} />}</Route>
        <Route path="/admin/vouchers">{() => <ProtectedRoute component={AdminVouchers} />}</Route>
        <Route path="/admin/vouchers/new">{() => <ProtectedRoute component={AdminVoucherDetail} />}</Route>
        <Route path="/admin/vouchers/:id">{() => <ProtectedRoute component={AdminVoucherDetail} />}</Route>
        <Route path="/admin/commission-approval">{() => <ProtectedRoute component={AdminCommissionApproval} />}</Route>
        <Route path="/admin/settings">{() => <ProtectedRoute component={AdminSettings} />}</Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
