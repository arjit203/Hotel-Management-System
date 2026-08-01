import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string; // omit for the current (last) page
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Renders both the visible breadcrumb trail AND the matching JSON-LD
// BreadcrumbList schema (SEO requirement) in one place, so every page that
// uses this automatically gets both — no page has to remember to add schema
// separately.
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: item.href ? `${SITE_URL}${item.href}` : undefined,
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-5 sm:px-8 pt-6 text-sm text-ink/50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={13} className="text-ink/30" />}
            {item.href ? (
              <Link href={item.href} className="hover:text-gold transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-ink/80">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
