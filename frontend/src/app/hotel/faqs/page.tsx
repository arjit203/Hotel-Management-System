import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTheHotel } from "@/lib/hotel";
import FaqAccordion from "@/components/FaqAccordion";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Frequently asked questions about staying at 7 Vachan.",
  alternates: { canonical: "/hotel/faqs" },
};

export default async function FaqsPage() {
  const data = await getTheHotel();
  if (!data) return notFound();

  return (
    <main className="mx-auto max-w-4xl px-5 sm:px-8 py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Hotel", href: "/hotel" }, { label: "FAQs" }]} />
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="section-eyebrow justify-center flex">Need Help?</p>
        <h1 className="section-title">Frequently Asked Questions</h1>
      </div>
      {data.faqs.length === 0 ? (
        <p className="text-center text-ink/50">No FAQs published yet.</p>
      ) : (
        <FaqAccordion faqs={data.faqs} />
      )}
    </main>
  );
}
