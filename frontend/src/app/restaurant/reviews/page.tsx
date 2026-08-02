import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTheRestaurant } from "@/lib/restaurant";
import ReviewsList from "@/components/ReviewsList";
import ReviewForm from "@/components/ReviewForm";
import StarRating from "@/components/StarRating";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";
import { UtensilsCrossed } from "lucide-react";
import PropertyUnavailable from "@/components/PropertyUnavailable";

export const metadata: Metadata = {
  title: "Restaurant Reviews",
  description: "What diners say about eating at 7 Vachan.",
  alternates: { canonical: "/restaurant/reviews" },
};

export default async function RestaurantReviewsPage() {
  const data = await getTheRestaurant();
  // Not `notFound()`. The loader returns null both when the property does
  // not exist and when the API is simply unreachable, and a 404 during a
  // backend restart tells guests — and search engines — the page is gone.
  if (!data) {
    return (
      <PropertyUnavailable
        retryHref="/restaurant/reviews"
        icon={UtensilsCrossed}
      />
    );
  }

  const { restaurant, reviews, reviewSummary } = data;

  return (
    <main>
      <div className="container-luxe max-w-6xl pb-24 pt-16 sm:pt-20">
        <PageHeader
          eyebrow="Diner Stories"
          title="Reviews"
          lead="Unedited, in our diners' own words."
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Restaurant", href: "/restaurant" },
            { label: "Reviews" },
          ]}
        />

        {reviewSummary.count > 0 && (
          <Reveal className="mb-16">
            <div className="mx-auto flex max-w-md flex-col items-center rounded-luxe border border-ink/[0.07] bg-white px-10 py-9 text-center shadow-luxury">
              <p className="price text-5xl leading-none">{reviewSummary.average.toFixed(1)}</p>
              <div className="mt-4">
                <StarRating rating={reviewSummary.average} size={16} />
              </div>
              <p className="mt-4 text-xs uppercase tracking-eyebrow text-warm-400">
                {reviewSummary.count} {reviewSummary.count === 1 ? "Review" : "Reviews"}
              </p>
            </div>
          </Reveal>
        )}

        <div className="mb-20">
          <ReviewsList reviews={reviews} />
        </div>

        <Reveal delay={0.1}>
          <div className="mx-auto max-w-2xl rounded-luxe border border-ink/[0.07] bg-white p-8 shadow-luxury sm:p-10">
            <div className="mb-8 text-center">
              <p className="section-eyebrow flex justify-center">Your Turn</p>
              <h2 className="section-title !text-[1.75rem]">How was your meal?</h2>
            </div>
            {/* Same shared ReviewForm the Hotel uses — only the endpoints differ. */}
            <ReviewForm
              reviewEndpoint={`/restaurants/${restaurant._id}/reviews`}
              uploadEndpoint="/restaurants/reviews/upload-image"
            />
          </div>
        </Reveal>
      </div>
    </main>
  );
}
