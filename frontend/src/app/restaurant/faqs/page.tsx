import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { getTheRestaurant } from "@/lib/restaurant";
import FaqAccordion from "@/components/FaqAccordion";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Reveal from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Restaurant FAQs",
  description: "Common questions about dining, reservations and private events at 7 Vachan.",
  alternates: { canonical: "/restaurant/faqs" },
};

export default async function RestaurantFaqsPage() {
  const data = await getTheRestaurant();
  if (!data) return notFound();

  return (
    <main>
      <div className="container-luxe max-w-4xl pb-24 pt-16 sm:pt-20">
        <PageHeader
          eyebrow="Need Help?"
          title="Questions & answers"
          lead="Reservations, dietary requirements, private events — the things diners ask most."
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Restaurant", href: "/restaurant" },
            { label: "FAQs" },
          ]}
        />

        {data.faqs.length === 0 ? (
          <EmptyState title="No FAQs published yet." />
        ) : (
          <FaqAccordion faqs={data.faqs} />
        )}

        <Reveal delay={0.1}>
          <div className="mt-16 flex flex-col items-center gap-5 rounded-luxe border border-ink/[0.07] bg-white px-8 py-12 text-center shadow-luxury">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
              <MessageCircle size={18} strokeWidth={1.5} className="text-gold" />
            </span>
            <div>
              <h2 className="card-title">Still have a question?</h2>
              <p className="body-muted mt-2">
                Dietary needs, large parties, or a private event — just ask.
              </p>
            </div>
            <Link href="/restaurant/contact" className="btn-outline group">
              Contact Us <ArrowRight size={14} className="btn-arrow" />
            </Link>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
