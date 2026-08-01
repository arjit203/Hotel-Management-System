import Link from "next/link";
import { Tag, ArrowRight } from "lucide-react";

interface Offer {
  _id: string;
  title: string;
  description?: string;
}

export default function OffersPreview({ offers }: { offers: Offer[] }) {
  if (offers.length === 0) return null;

  return (
    <section className="bg-cream-dark py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="section-eyebrow justify-center flex">Special Packages</p>
          <h2 className="section-title">Exclusive Offers</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {offers.slice(0, 3).map((offer) => (
            <div key={offer._id} className="bg-white rounded-2xl p-8 shadow-luxury border border-ink/5">
              <Tag size={22} className="text-gold mb-4" />
              <h3 className="font-display text-xl text-ink mb-2">{offer.title}</h3>
              {offer.description && <p className="text-ink/60 text-sm leading-relaxed">{offer.description}</p>}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/hotel/offers" className="btn-primary">
            View All Offers <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
