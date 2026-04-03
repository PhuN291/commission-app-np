import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Stethoscope, 
  UserRound, 
  BadgePercent, 
  Hash,
  Clock,
  ListFilter,
  ChevronDown,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AppHeader from "@/components/app-header";
import { Breadcrumb } from "@/components/breadcrumb";
import type { Service } from "@shared/schema";

const filterTabs = ["Tất cả", "Đang kinh doanh", "Ngưng kinh doanh"];

type DropdownId = "doctor" | "price" | "category" | "disease" | null;

export default function ServicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [doctorFilter, setDoctorFilter] = useState<string | null>(null);
  const [sortByPrice, setSortByPrice] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [diseaseFilter, setDiseaseFilter] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [showFilterRow, setShowFilterRow] = useState(false);

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const categories = [...new Set(services.map(s => s.category).filter(Boolean))] as string[];
  const diseaseTypes = [...new Set(services.map(s => s.diseaseType).filter(Boolean))] as string[];

  const parseMinPrice = (range: string) => {
    const num = range.replace(/\./g, "").match(/\d+/);
    return num ? parseInt(num[0]) : 0;
  };

  const filteredServices = services
    .filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (activeFilter === "Đang kinh doanh") { if (s.insurance !== "Có hỗ trợ") return false; }
      if (activeFilter === "Ngưng kinh doanh") { if (s.insurance === "Có hỗ trợ") return false; }
      if (doctorFilter === "doctor" && !s.requiresDoctor) return false;
      if (doctorFilter === "no-doctor" && s.requiresDoctor) return false;
      if (categoryFilter && s.category !== categoryFilter) return false;
      if (diseaseFilter && s.diseaseType !== diseaseFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortByPrice) return 0;
      return parseMinPrice(a.commissionRange) - parseMinPrice(b.commissionRange);
    });

  const doctorLabel = doctorFilter === "doctor" ? "Bác sĩ chỉ định" : doctorFilter === "no-doctor" ? "Không cần chỉ định" : "Chỉ định";
  const priceLabel = sortByPrice ? "Giá thấp → cao" : "Giá";
  const categoryLabel = categoryFilter || "Danh mục";
  const diseaseLabel = diseaseFilter || "Loại bệnh";

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader activePage="services" />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#f6f6f7] rounded-t-2xl">
        <Breadcrumb items={[{ label: "Dịch vụ" }]} />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-lg font-bold text-[#1a1c1d]">Danh mục dịch vụ</h1>
          <div className="relative w-full md:w-96">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9196]" />
            <Input 
              placeholder="Tìm kiếm dịch vụ..." 
              className="pl-9 bg-white border-[#d2d5d8] focus:ring-[#008060] transition-all rounded-lg h-10 text-sm shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-services"
            />
          </div>
        </div>

        <div className="flex items-center bg-white border border-[#e3e3e3] rounded-xl px-3 py-2">
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-0.5 shrink-0 w-max">
              {filterTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-4 py-1.5 text-sm rounded-full transition-all whitespace-nowrap ${
                    activeFilter === tab
                      ? "bg-[#e7e7e7] text-[#1a1c1d] font-semibold"
                      : "text-[#616161] hover:text-[#1a1c1d] font-medium"
                  }`}
                  data-testid={`filter-tab-${tab}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center border-l border-[#e3e3e3] pl-3 ml-2 shrink-0">
            <button
              onClick={() => { setShowFilterRow(!showFilterRow); if (showFilterRow) setOpenDropdown(null); }}
              className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${
                showFilterRow
                  ? "border-[#1a1c1d] bg-[#f0f0f0] text-[#1a1c1d]"
                  : "border-[#e3e3e3] bg-white text-[#616161] hover:text-[#1a1c1d] hover:border-[#c0c0c0]"
              }`}
              data-testid="button-search-filter"
            >
              <ListFilter className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showFilterRow && (
          <div className="flex flex-wrap items-center gap-2 relative z-30">
            <div className="relative shrink-0 z-50">
              <button
                onClick={() => setOpenDropdown(openDropdown === "doctor" ? null : "doctor")}
                className={`relative z-50 flex items-center gap-1.5 px-4 py-2 text-sm rounded-full border transition-all whitespace-nowrap ${
                  doctorFilter
                    ? "border-[#1a1c1d] bg-[#f0f0f0] text-[#1a1c1d] font-semibold"
                    : "border-[#d2d5d8] bg-white text-[#616161] hover:border-[#c0c0c0]"
                }`}
                data-testid="dropdown-doctor"
              >
                {doctorLabel}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === "doctor" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "doctor" && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                  <div className="absolute top-full left-0 mt-1 bg-white border border-[#e3e3e3] rounded-xl shadow-lg py-1 z-50 min-w-[200px]">
                    <button
                      onClick={() => { setDoctorFilter(null); setOpenDropdown(null); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#f6f6f7] transition-colors flex items-center justify-between"
                      data-testid="filter-doctor-all"
                    >
                      <span>Tất cả</span>
                      {doctorFilter === null && <Check className="h-4 w-4 text-[#008060]" />}
                    </button>
                    <button
                      onClick={() => { setDoctorFilter("doctor"); setOpenDropdown(null); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#f6f6f7] transition-colors flex items-center justify-between"
                      data-testid="filter-requires-doctor"
                    >
                      <span>Cần bác sĩ chỉ định</span>
                      {doctorFilter === "doctor" && <Check className="h-4 w-4 text-[#008060]" />}
                    </button>
                    <button
                      onClick={() => { setDoctorFilter("no-doctor"); setOpenDropdown(null); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#f6f6f7] transition-colors flex items-center justify-between"
                      data-testid="filter-no-doctor"
                    >
                      <span>Không cần chỉ định</span>
                      {doctorFilter === "no-doctor" && <Check className="h-4 w-4 text-[#008060]" />}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="relative shrink-0 z-50">
              <button
                onClick={() => setOpenDropdown(openDropdown === "price" ? null : "price")}
                className={`relative z-50 flex items-center gap-1.5 px-4 py-2 text-sm rounded-full border transition-all whitespace-nowrap ${
                  sortByPrice
                    ? "border-[#1a1c1d] bg-[#f0f0f0] text-[#1a1c1d] font-semibold"
                    : "border-[#d2d5d8] bg-white text-[#616161] hover:border-[#c0c0c0]"
                }`}
                data-testid="dropdown-price"
              >
                {priceLabel}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === "price" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "price" && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                  <div className="absolute top-full left-0 mt-1 bg-white border border-[#e3e3e3] rounded-xl shadow-lg py-1 z-50 min-w-[200px]">
                    <button
                      onClick={() => { setSortByPrice(false); setOpenDropdown(null); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#f6f6f7] transition-colors flex items-center justify-between"
                      data-testid="filter-price-default"
                    >
                      <span>Mặc định</span>
                      {!sortByPrice && <Check className="h-4 w-4 text-[#008060]" />}
                    </button>
                    <button
                      onClick={() => { setSortByPrice(true); setOpenDropdown(null); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#f6f6f7] transition-colors flex items-center justify-between"
                      data-testid="filter-price-low-high"
                    >
                      <span>Giá thấp đến cao</span>
                      {sortByPrice && <Check className="h-4 w-4 text-[#008060]" />}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="relative shrink-0 z-50">
              <button
                onClick={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
                className={`relative z-50 flex items-center gap-1.5 px-4 py-2 text-sm rounded-full border transition-all whitespace-nowrap ${
                  categoryFilter
                    ? "border-[#1a1c1d] bg-[#f0f0f0] text-[#1a1c1d] font-semibold"
                    : "border-[#d2d5d8] bg-white text-[#616161] hover:border-[#c0c0c0]"
                }`}
                data-testid="dropdown-category"
              >
                {categoryLabel}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === "category" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "category" && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                  <div className="absolute top-full left-0 sm:left-0 mt-1 bg-white border border-[#e3e3e3] rounded-xl shadow-lg py-1 z-50 min-w-[200px] max-w-[calc(100vw-2rem)]">
                    <button
                      onClick={() => { setCategoryFilter(null); setOpenDropdown(null); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#f6f6f7] transition-colors flex items-center justify-between"
                      data-testid="filter-category-all"
                    >
                      <span>Tất cả</span>
                      {categoryFilter === null && <Check className="h-4 w-4 text-[#008060]" />}
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => { setCategoryFilter(cat); setOpenDropdown(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#f6f6f7] transition-colors flex items-center justify-between"
                        data-testid={`filter-category-${cat}`}
                      >
                        <span>{cat}</span>
                        {categoryFilter === cat && <Check className="h-4 w-4 text-[#008060]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="relative shrink-0 z-50">
              <button
                onClick={() => setOpenDropdown(openDropdown === "disease" ? null : "disease")}
                className={`relative z-50 flex items-center gap-1.5 px-4 py-2 text-sm rounded-full border transition-all whitespace-nowrap ${
                  diseaseFilter
                    ? "border-[#1a1c1d] bg-[#f0f0f0] text-[#1a1c1d] font-semibold"
                    : "border-[#d2d5d8] bg-white text-[#616161] hover:border-[#c0c0c0]"
                }`}
                data-testid="dropdown-disease"
              >
                {diseaseLabel}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === "disease" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "disease" && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                  <div className="absolute top-full left-0 sm:left-0 mt-1 bg-white border border-[#e3e3e3] rounded-xl shadow-lg py-1 z-50 min-w-[200px] max-w-[calc(100vw-2rem)]">
                    <button
                      onClick={() => { setDiseaseFilter(null); setOpenDropdown(null); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#f6f6f7] transition-colors flex items-center justify-between"
                      data-testid="filter-disease-all"
                    >
                      <span>Tất cả</span>
                      {diseaseFilter === null && <Check className="h-4 w-4 text-[#008060]" />}
                    </button>
                    {diseaseTypes.map(dt => (
                      <button
                        key={dt}
                        onClick={() => { setDiseaseFilter(dt); setOpenDropdown(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#f6f6f7] transition-colors flex items-center justify-between"
                        data-testid={`filter-disease-${dt}`}
                      >
                        <span>{dt}</span>
                        {diseaseFilter === dt && <Check className="h-4 w-4 text-[#008060]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-[#008060] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Link href={`/services/${service.id}`} key={service.id}>
            <Card className="border-[#d2d5d8] shadow-sm hover:border-[#008060] hover:shadow-md transition-all cursor-pointer overflow-hidden rounded-xl bg-white group flex flex-col" data-testid={`card-service-${service.id}`}>
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex gap-4 items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                    <Stethoscope className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-bold text-base text-[#1a1c1d] truncate group-hover:text-[#008060] transition-colors">{service.title}</h3>
                      <span className="text-[10px] font-bold text-[#8c9196] bg-[#f6f6f7] px-2 py-0.5 rounded uppercase tracking-wider shrink-0 flex items-center gap-1">
                        <Hash className="h-3 w-3" /> {service.code}
                      </span>
                    </div>
                    <p className="text-xs text-[#4a4d50] leading-relaxed line-clamp-2">
                      {service.description}
                    </p>
                  </div>
                </div>

                <div className="mt-auto space-y-3 pt-4 border-t border-[#f0f0f1]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-[#4a4d50]">
                      <UserRound className="h-4 w-4 text-[#8c9196]" />
                      <span>Chỉ định:</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border-0 ${service.requiresDoctor ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                      {service.requiresDoctor ? 'Bác sĩ' : 'Kỹ thuật viên'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-[#4a4d50]">
                      <Clock className="h-4 w-4 text-[#8c9196]" />
                      <span>Thời gian:</span>
                    </div>
                    <span className="text-xs font-bold text-[#1a1c1d]">{service.duration}</span>
                  </div>

                  <div className="flex items-center justify-between bg-[#f6f6f7] p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#008060]">
                      <BadgePercent className="h-4 w-4" />
                      <span>Hoa hồng</span>
                    </div>
                    <span className="font-bold text-sm text-[#008060]">{service.commissionRange} đ</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
        )}
      </main>
    </div>
  );
}
