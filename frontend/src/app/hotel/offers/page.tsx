import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Tag, ArrowRight } from "lucide-react";
import { getTheHotel } from "@/lib/hotel";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Offers & Packages",
  description: "Discover special packages, seasonal discounts, and limited-time offers at 7 Vachan.",
  alternates: { canonical: "/hotel/offers" },
};

export default async function OffersPage() {
  const data = await getTheHotel();
  if (!data) return notFound();

  return (
    <main className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Hotel", href: "/hotel" }, { label: "Offers & Deals" }]} />
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="section-eyebrow justify-center flex">Special Packages</p>
        <h1 className="section-title">Offers &amp; Deals</h1>
        <p className="text-ink/60 mt-4">Exclusive packages designed to make your stay even more memorable.</p>
      </div>

      {data.offers.length === 0 ? (
        <p className="text-center text-ink/50 py-16">No active offers right now — check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.offers.map((offer) => (
            <div key={offer._id} className="bg-white rounded-2xl p-8 shadow-luxury border border-ink/5 flex flex-col">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 mb-5">
                <Tag size={20} className="text-gold" />
              </span>
              <h2 className="font-display text-xl text-ink mb-2">{offer.title}</h2>
              {offer.description && <p className="text-ink/60 text-sm leading-relaxed flex-1">{offer.description}</p>}
              <Link
                href="/hotel/booking"
                className="inline-flex items-center gap-1.5 text-gold text-sm font-semibold mt-6 hover:gap-2.5 transition-all"
              >
                Book This Offer <ArrowRight size={15} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
