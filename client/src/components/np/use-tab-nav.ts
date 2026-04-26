import { useLocation } from "wouter";
import type { TabKey } from "./tab-bar";

const ROUTES: Record<TabKey, string> = {
  dashboard: "/",
  orders: "/orders",
  commission: "/income",
  customers: "/customers",
  more: "/",
};

function activeTabFromPath(path: string): TabKey {
  if (path === "/" || path.startsWith("/dashboard")) return "dashboard";
  if (path.startsWith("/orders")) return "orders";
  if (path.startsWith("/income") || path.startsWith("/commission")) return "commission";
  if (path.startsWith("/customers")) return "customers";
  return "more";
}

export function useTabNav() {
  const [location, navigate] = useLocation();
  const active = activeTabFromPath(location);
  const onTab = (key: TabKey) => navigate(ROUTES[key]);
  return { active, onTab };
}
