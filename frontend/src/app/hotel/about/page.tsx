import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Award, Sparkles, HeartHandshake, ArrowRight } from "lucide-react";
import { getTheHotel } from "@/lib/hotel";
import StarRating from "@/components/StarRating";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "About Us",
  description: "The story, values, and promise behind 7 Vachan.",
  alternates: { canonical: "/hotel/about" },
};

export default async function AboutPage() {
  const data = await getTheHotel();
  if (!data) return notFound();

  const { hotel, gallery } = data;
  const heroImage = gallery[0]?.imageUrl;

  return (
    <main>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Hotel", href: "/hotel" }, { label: "About" }]} />
      <section className="bg-ink text-cream py-20 px-5 sm:px-8 text-center">
        <p className="section-eyebrow justify-center flex">Our Story</p>
        <h1 className="font-display text-4xl sm:text-5xl text-cream">About {hotel.name}</h1>
        <div className="flex justify-center mt-3">
          <StarRating rating={hotel.starRating} size={18} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-ink/70 leading-relaxed text-lg">{hotel.description}</p>
          <p className="text-ink/60 leading-relaxed mt-4">
            Rooted in the promise of &ldquo;7 Vachan&rdquo; — seven vows of hospitality — every stay here is built
            on trust, comfort, and genuine care for our guests.
          </p>
          <Link href="/hotel/booking" className="btn-primary mt-8 inline-flex">
            Book Your Stay <ArrowRight size={16} />
          </Link>
        </div>
        <div className="rounded-3xl overflow-hidden h-72 sm:h-96 bg-ink/5">
          {heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={hotel.name} className="w-full h-full object-cover" />
          )}
        </div>
      </section>

      <section className="bg-cream-dark py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          <div>
            <Sparkles size={26} className="mx-auto text-gold mb-4" />
            <h3 className="font-display text-xl text-ink mb-2">Our Vision</h3>
            <p className="text-ink/60 text-sm leading-relaxed">
              To be the most trusted name in hospitality — where every guest feels genuinely at home.
            </p>
          </div>
          <div>
            <Award size={26} className="mx-auto text-gold mb-4" />
            <h3 className="font-display text-xl text-ink mb-2">Our Standard</h3>
            <p className="text-ink/60 text-sm leading-relaxed">
              Premium comfort, meticulous cleanliness, and attention to detail in every room.
            </p>
          </div>
          <div>
            <HeartHandshake size={26} className="mx-auto text-gold mb-4" />
            <h3 className="font-display text-xl text-ink mb-2">Our Promise</h3>
            <p className="text-ink/60 text-sm leading-relaxed">
              Warm, personal service — treating every guest like family, every single time.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
