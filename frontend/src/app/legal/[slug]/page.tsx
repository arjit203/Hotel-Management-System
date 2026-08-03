import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import Reveal from "@/components/motion/Reveal";
import { getSettings, str } from "@/lib/settings";

/**
 * Legal pages, written in Settings → Legal.
 *
 * ── Why `notFound()` here, when the rest of the site was deliberately moved
 * away from it ──
 * Everywhere else, a null loader means "the API is unreachable", and answering
 * a live page with a 404 during a backend restart is wrong — hence
 * `PropertyUnavailable`. This is the opposite case: an empty policy is a
 * *deliberate* state, meaning "not published yet". A refund policy that renders
 * as an empty page, or worse as a friendly placeholder, is a legal claim nobody
 * made. 404 is the honest answer, and the footer only links to pages that exist.
 */

const PAGES: Record<string, { key: string; title: string; blurb: string }> = {
  privacy: {
    key: "privacyPolicy",
    title: "Privacy Policy",
    blurb: "What we collect when you book or enquire, and what we do with it.",
  },
  terms: {
    key: "termsAndConditions",
    title: "Terms & Conditions",
    blurb: "The terms you agree to when you stay, dine or book with us.",
  },
  cancellation: {
    key: "cancellationPolicy",
    title: "Cancellation Policy",
    blurb: "How to cancel, and what happens when you do.",
  },
  refund: {
    key: "refundPolicy",
    title: "Refund Policy",
    blurb: "When a refund applies and how long it takes to reach you.",
  },
};

export async function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const page = PAGES[params.slug];
  if (!page) return { title: "Not found" };

  const settings = await getSettings();
  const siteName = str(settings, "general", "siteName", "7 Vachan");
  const published = str(settings, "legal", page.key).trim().length > 0;

  return {
    title: `${page.title} · ${siteName}`,
    description: page.blurb,
    // An unpublished page should not be indexed even if someone links to it.
    robots: published ? undefined : { index: false, follow: false },
  };
}

export default async function LegalPage({ params }: { params: { slug: string } }) {
  const page = PAGES[params.slug];
  if (!page) notFound();

  const settings = await getSettings();
  const content = str(settings, "legal", page.key).trim();
  if (!content) notFound();

  const lastReviewed = str(settings, "legal", "lastReviewedOn");

  return (
    <main className="section-tight container-luxe max-w-3xl pb-24 pt-28 sm:pt-32">
      <Breadcrumbs items={[{ label: "Legal" }, { label: page.title }]} />

      <Reveal duration={0.6}>
        <p className="section-eyebrow">Legal</p>
        <h1 className="section-title mt-2">{page.title}</h1>
        <p className="mt-3 text-base font-light leading-relaxed text-ink/65">{page.blurb}</p>
        {lastReviewed && (
          <p className="mt-1 text-sm text-ink/50">Last reviewed {lastReviewed}</p>
        )}
      </Reveal>

      <Reveal delay={0.1} className="mt-10">
        <LegalBody markdown={content} />
      </Reveal>
    </main>
  );
}

/**
 * A deliberately small Markdown subset: headings, paragraphs, bullets and bold.
 *
 * Adding a Markdown library for four documents written by one person would pull
 * a parser and a sanitiser into the bundle to render text that never contains
 * a table or a code fence. This handles what a policy actually uses and escapes
 * everything else — the content is admin-authored, but "trusted author" is not
 * a reason to inject raw HTML into a page.
 */
function LegalBody({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n{2,}/);

  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={index} className="font-display text-xl text-ink">
              {inline(trimmed.slice(4))}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={index} className="mt-8 font-display text-2xl text-ink">
              {inline(trimmed.slice(3))}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={index} className="mt-8 font-display text-2xl text-ink">
              {inline(trimmed.slice(2))}
            </h2>
          );
        }

        const lines = trimmed.split("\n");
        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={index} className="list-disc space-y-2 pl-5">
              {lines.map((line, i) => (
                <li key={i} className="text-base font-light leading-relaxed text-ink/75">
                  {inline(line.replace(/^\s*[-*]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="text-base font-light leading-relaxed text-ink/75">
            {inline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/** `**bold**` only. Everything else stays literal text. */
function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-medium text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}
