import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTheHotel } from "@/lib/hotel";
import ReviewsList from "@/modules/hotel/components/ReviewsList";
import ReviewForm from "@/modules/hotel/components/ReviewForm";
import StarRating from "@/components/StarRating";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";

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
    <main>
      <div className="container-luxe max-w-6xl pb-24 pt-16 sm:pt-20">
        <PageHeader
          eyebrow="Guest Stories"
          title="Reviews"
          lead="Unedited, in our guests' own words."
          crumbs={[{ label: "Home", href: "/" }, { label: "Hotel", href: "/hotel" }, { label: "Reviews" }]}
        />

        {/* ── Aggregate score ── */}
        {reviewSummary.count > 0 && (
          <Reveal className="mb-16">
            <div className="mx-auto flex max-w-md flex-col items-center rounded-luxe border border-ink/[0.07] bg-white px-10 py-9 text-center shadow-luxury">
              <p className="price text-5xl leading-none">{reviewSummary.average.toFixed(1)}</p>
              <div className="mt-4">
                <StarRating rating={reviewSummary.average} size={16} />
              </div>
              <p className="mt-4 text-[10px] uppercase tracking-eyebrow text-warm-400">
                {reviewSummary.count} {reviewSummary.count === 1 ? "Review" : "Reviews"}
              </p>
            </div>
          </Reveal>
        )}

        <div className="mb-20">
          <ReviewsList reviews={reviews} />
        </div>

        {/* ── Write a review ── */}
        <Reveal delay={0.1}>
          <div className="mx-auto max-w-2xl rounded-luxe border border-ink/[0.07] bg-white p-8 shadow-luxury sm:p-10">
            <div className="mb-8 text-center">
              <p className="section-eyebrow flex justify-center">Your Turn</p>
              <h2 className="section-title !text-[1.75rem]">Share your stay</h2>
            </div>
            <ReviewForm hotelId={hotel._id} />
          </div>
        </Reveal>
      </div>
    </main>
  );
}
