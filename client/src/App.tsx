import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Services from "@/pages/services";

import Income from "@/pages/income";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import OrderCreate from "@/pages/order-create";
import ServiceDetail from "@/pages/service-detail";
import Customers from "@/pages/customers";
import CustomerDetail from "@/pages/customer-detail";
import Ranking from "@/pages/ranking";
import AnalyticsOverview from "@/pages/analytics-overview";
import AnalyticsAppointments from "@/pages/analytics-appointments";
import AdminStaff from "@/pages/admin-staff";
import AdminCommissionConfig from "@/pages/admin-commission-config";
import AdminVouchers from "@/pages/admin-vouchers";
import AdminVoucherDetail from "@/pages/admin-voucher-detail";
import AdminCommissionApproval from "@/pages/admin-commission-approval";
import AdminSettings from "@/pages/admin-settings";
import Notifications from "@/pages/notifications";
import RecallWorklist from "@/pages/recall-worklist";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  // Auth gate — checks np_token issued by /api/auth/verify-otp.
  // Legacy `np_authenticated` is cleaned up on login success.
  const token = localStorage.getItem("np_token");
  if (!token) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
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
