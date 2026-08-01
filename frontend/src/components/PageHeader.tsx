import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import Breadcrumbs, { Crumb } from "@/components/Breadcrumbs";

/**
 * The single header treatment used by every public sub-page.
 *
 * Before this, each page hand-rolled its own eyebrow/title/lead block with
 * slightly different spacing, above a separate grey breadcrumb bar. Centralising
 * both means the vertical rhythm, the headline reveal and the structured data
 * are identical everywhere — which is most of what makes a set of pages feel
 * like one brand rather than one CRUD screen per route.
 *
 * Pass `crumbs` and the BreadcrumbList JSON-LD is emitted for SEO without
 * painting a visible trail (see Breadcrumbs for the reasoning).
 *
 * A Server Component: only the reveal wrappers inside are client-side.
 */
export default function PageHeader({
  eyebrow,
  title,
  lead,
  align = "center",
  /** Renders the headline as <h1> by default; pass "h2" for in-page sections. */
  as = "h1",
  crumbs,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "center" | "left";
  as?: "h1" | "h2";
  crumbs?: Crumb[];
}) {
  const centered = align === "center";

  return (
    <header className={`${centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"} mb-14 sm:mb-16`}>
      {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} />}

      {eyebrow && (
        <Reveal duration={0.6}>
          <p className={`section-eyebrow ${centered ? "flex justify-center" : "flex"}`}>{eyebrow}</p>
        </Reveal>
      )}

      <TextReveal as={as} text={title} className="page-title" delay={0.05} />

      {lead && (
        <Reveal delay={0.22} distance={18}>
          <p className={`lead mt-6 ${centered ? "mx-auto max-w-prose" : ""}`}>{lead}</p>
        </Reveal>
      )}
    </header>
  );
}
