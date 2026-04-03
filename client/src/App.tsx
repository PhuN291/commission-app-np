import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Services from "@/pages/services";

import Income from "@/pages/income";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import OrderCreate from "@/pages/order-create";
import ServiceDetail from "@/pages/service-detail";
import Customers from "@/pages/customers";
import CustomerDetail from "@/pages/customer-detail";
import AiChat from "@/pages/ai-chat";
import Ranking from "@/pages/ranking";
import Performance from "@/pages/performance";
import AnalyticsOverview from "@/pages/analytics-overview";
import AnalyticsDoctors from "@/pages/analytics-doctors";
import AnalyticsPatients from "@/pages/analytics-patients";
import AnalyticsAppointments from "@/pages/analytics-appointments";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/services" component={Services}/>
      <Route path="/services/:id" component={ServiceDetail}/>
      <Route path="/orders" component={Orders}/>
      <Route path="/orders/new" component={OrderCreate}/>
      <Route path="/orders/:id" component={OrderDetail}/>
      <Route path="/income" component={Income}/>
      <Route path="/customers" component={Customers}/>
      <Route path="/customers/:id" component={CustomerDetail}/>
      <Route path="/ai-chat" component={AiChat}/>
      <Route path="/ranking" component={Ranking}/>
      <Route path="/performance" component={Performance}/>
      <Route path="/analytics" component={AnalyticsOverview}/>
      <Route path="/analytics/overview" component={AnalyticsOverview}/>
      <Route path="/analytics/doctors" component={AnalyticsDoctors}/>
      <Route path="/analytics/patients" component={AnalyticsPatients}/>
      <Route path="/analytics/appointments" component={AnalyticsAppointments}/>
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
