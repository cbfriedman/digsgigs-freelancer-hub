import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const allItems = [{ label: "Home", href: "/" }, ...items];

  // Generate structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": allItems.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      "item": `${window.location.origin}${item.href}`
    }))
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
      
      <nav aria-label="Breadcrumb" className="mb-6 min-w-0">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap min-w-0">
          {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1;
            const isHome = index === 0;

            return (
              <li key={`${item.href}-${index}`} className="flex items-center gap-2 min-w-0 last:min-w-0 last:overflow-hidden">
                {index > 0 && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                )}
                {isLast ? (
                  <span
                    className="font-medium text-foreground truncate max-w-[140px] sm:max-w-[280px]"
                    aria-current="page"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className="hover:text-foreground transition-colors flex items-center gap-1 shrink-0"
                    title={item.label}
                  >
                    {isHome && <Home className="h-4 w-4" />}
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
