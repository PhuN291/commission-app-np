import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BadgePercent, Clock, Hash, Stethoscope, UserRound } from "lucide-react";
import {
  Badge,
  Card,
  Chips,
  PageHeader,
  Screen,
  SearchField,
  useTabNav,
  type ChipItem,
} from "@/components/np";
import type { Service } from "@shared/schema";

function parseMinPrice(range: string) {
  const num = range.replace(/\./g, "").match(/\d+/);
  return num ? parseInt(num[0], 10) : 0;
}

export default function ServicesPage() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => s.category && set.add(s.category));
    return Array.from(set);
  }, [services]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return services
      .filter((s) => {
        const matches =
          !q ||
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q);
        if (!matches) return false;
        if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => parseMinPrice(a.commissionRange) - parseMinPrice(b.commissionRange));
  }, [services, searchTerm, categoryFilter]);

  const chipItems: ChipItem[] = useMemo(
    () => [
      { key: "all", label: "Tất cả", count: services.length },
      ...categories.map((c) => ({
        key: c,
        label: c,
        count: services.filter((s) => s.category === c).length,
      })),
    ],
    [categories, services],
  );

  return (
    <Screen activeTab={active} onTab={onTab}>
      <PageHeader title="Dịch vụ" subtitle={`${filtered.length} dịch vụ`} />
      <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Tìm dịch vụ..." />
      <Chips items={chipItems} active={categoryFilter} onChange={setCategoryFilter} />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3 px-0">
          {filtered.map((service) => (
            <Card
              key={service.id}
              className="p-4 cursor-pointer"
              onClick={() => navigate(`/services/${service.id}`)}
            >
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-np-card bg-np-surface-sub">
                  <Stethoscope size={20} strokeWidth={2.2} className="text-np-text-sub" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-[15px] font-bold text-np-ink">{service.title}</h3>
                    <span className="flex flex-shrink-0 items-center gap-1 rounded bg-np-surface-sub px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
                      <Hash size={10} /> {service.code}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-np-text-sub">
                    {service.description}
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t border-np-surface-pressed pt-3">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 text-np-text-sub">
                    <UserRound size={14} strokeWidth={2.25} className="text-np-text-muted" />
                    Chỉ định
                  </span>
                  <Badge tone={service.requiresDoctor ? "attention" : "neutral"}>
                    {service.requiresDoctor ? "Bác sĩ" : "Kỹ thuật viên"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 text-np-text-sub">
                    <Clock size={14} strokeWidth={2.25} className="text-np-text-muted" />
                    Thời gian
                  </span>
                  <span className="font-bold text-np-ink">{service.duration}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-np-brand-soft px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-np-brand-ink">
                    <BadgePercent size={14} strokeWidth={2.25} /> Hoa hồng
                  </span>
                  <span className="text-[14px] font-bold text-np-brand-ink">
                    {service.commissionRange}₫
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="h-5" />
    </Screen>
  );
}
