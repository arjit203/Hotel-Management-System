import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BedDouble, MessageCircle } from "lucide-react";
import { getTheHotel } from "@/lib/hotel";
import FaqAccordion from "@/components/FaqAccordion";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";
import PropertyUnavailable from "@/components/PropertyUnavailable";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Frequently asked questions about staying at 7 Vachan.",
  alternates: { canonical: "/hotel/faqs" },
};

export default async function FaqsPage() {
  const data = await getTheHotel();
  // Not `notFound()`. The loader returns null both when the property does
  // not exist and when the API is simply unreachable, and a 404 during a
  // backend restart tells guests — and search engines — the page is gone.
  if (!data) {
    return (
      <PropertyUnavailable
        retryHref="/hotel/faqs"
        icon={BedDouble}
      />
    );
  }

  return (
    <main>
      <div className="container-luxe max-w-4xl pb-24 pt-16 sm:pt-20">
        <PageHeader
          eyebrow="Need Help?"
          title="Questions & Answers"
          lead="The things guests ask most often. If yours isn't here, just call us."
          crumbs={[{ label: "Home", href: "/" }, { label: "Hotel", href: "/hotel" }, { label: "FAQs" }]}
        />

        {data.faqs.length === 0 ? (
          <p className="text-center font-light text-warm-500">No FAQs published yet.</p>
        ) : (
          <FaqAccordion faqs={data.faqs} />
        )}

        {/* Fallback route to a human — the most reassuring thing on an FAQ page. */}
        <Reveal delay={0.1}>
          <div className="mt-16 flex flex-col items-center gap-5 rounded-luxe border border-ink/[0.07] bg-white px-8 py-12 text-center shadow-luxury">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
              <MessageCircle size={18} strokeWidth={1.5} className="text-gold" />
            </span>
            <div>
              <h2 className="card-title">Still have a question?</h2>
              <p className="body-muted mt-2">Our team replies personally, at any hour.</p>
            </div>
            <Link href="/hotel/contact" className="btn-outline group">
              Contact Us <ArrowRight size={14} className="btn-arrow" />
            </Link>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
