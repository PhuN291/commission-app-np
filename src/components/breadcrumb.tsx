import { Link } from "wouter";
import { Home, ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-[13px] text-[#8c9196] py-3" data-testid="breadcrumb">
      <Link href="/">
        <span className="flex items-center hover:text-[#1a1c1d] transition-colors cursor-pointer" data-testid="breadcrumb-home">
          <Home className="h-4 w-4" />
        </span>
      </Link>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-[#c9cccf]" />
            {isLast || !item.href ? (
              <span className="text-[#1a1c1d] font-medium" data-testid={`breadcrumb-item-${i}`}>{item.label}</span>
            ) : (
              <Link href={item.href}>
                <span className="hover:text-[#1a1c1d] hover:underline transition-colors cursor-pointer" data-testid={`breadcrumb-item-${i}`}>{item.label}</span>
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
