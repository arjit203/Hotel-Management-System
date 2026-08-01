import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string; // omit for the current (last) page
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Breadcrumbs — structured data first, chrome second.
 *
 * The visible trail used to be a grey bar bolted above every page title. It
 * added a row of clutter, competed with the page header, and on a site this
 * shallow (Home → Hotel → Page) told the guest nothing the header didn't.
 *
 * So the visible trail is now OFF by default and the component's real job is the
 * JSON-LD `BreadcrumbList`, which is an explicit SEO requirement
 * (AI_INSTRUCTIONS.md §9) and must not be lost just because the UI got quieter.
 * Google reads the schema regardless of whether a trail is painted.
 *
 * Pass `visual` to render the trail on deep pages where it genuinely aids
 * orientation. Normally you don't call this directly at all — pass `crumbs` to
 * <PageHeader>, which emits the schema for you.
 */
export default function Breadcrumbs({ items, visual = false }: { items: Crumb[]; visual?: boolean }) {
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

  const schema = (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );

  if (!visual) return schema;

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      {schema}
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs uppercase tracking-luxe text-warm-500">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-3">
            {i > 0 && (
              <span aria-hidden="true" className="text-gold/50">
                /
              </span>
            )}
            {item.href ? (
              <Link href={item.href} className="transition-colors duration-300 hover:text-gold">
                {item.label}
              </Link>
            ) : (
              <span className="text-ink/70">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
