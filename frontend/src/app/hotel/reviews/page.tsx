import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { getTheHotel } from "@/lib/hotel";
import ReviewsList from "@/modules/hotel/components/ReviewsList";
import ReviewForm from "@/modules/hotel/components/ReviewForm";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Guest Reviews",
  description: "Read what our guests have to say about their stay at 7 Vachan.",
  alternates: { canonical: "/hotel/reviews" },
};

export default async function ReviewsPage() {
  const data = await getTheHotel();
  if (!data) return notFound();

  const { hotel, reviews, reviewSummary } = data;

  return (
    <main className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Hotel", href: "/hotel" }, { label: "Reviews" }]} />
      <div className="text-center max-w-2xl mx-auto mb-4">
        <p className="section-eyebrow justify-center flex">Guest Stories</p>
        <h1 className="section-title">Reviews</h1>
      </div>

      {reviewSummary.count > 0 && (
        <div className="flex items-center justify-center gap-2 mb-12 text-ink/70">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={18} className={i <= Math.round(reviewSummary.average) ? "text-gold fill-gold" : "text-ink/15"} />
            ))}
          </div>
          <span className="font-semibold">{reviewSummary.average}</span>
          <span className="text-sm">({reviewSummary.count} reviews)</span>
        </div>
      )}

      <div className="mb-14">
        <ReviewsList reviews={reviews} />
      </div>

      <div className="max-w-2xl mx-auto">
        <ReviewForm hotelId={hotel._id} />
      </div>
    </main>
  );
}
