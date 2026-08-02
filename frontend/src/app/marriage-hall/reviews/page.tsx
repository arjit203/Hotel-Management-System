import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";
import ReviewsList from "@/components/ReviewsList";
import ReviewForm from "@/components/ReviewForm";
import StarRating from "@/components/StarRating";
import { getTheHall } from "@/lib/hall";
import HallEmpty from "@/modules/hall/components/HallEmpty";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTheHall();
  const name = data?.hall.name ?? "our banquet hall";
  const summary = data?.reviewSummary;

  return {
    title: `Reviews — ${name}`,
    description:
      summary && summary.count > 0
        ? `${summary.average.toFixed(1)} out of 5 from ${summary.count} families who celebrated at ${name}.`
        : `What families say about celebrating at ${name}.`,
  };
}

/**
 * Reviews.
 *
 * Reuses <ReviewsList> and <ReviewForm> wholesale — both are vertical-agnostic
 * and take their endpoints as props, which is exactly why they were written that
 * way for Hotel and then reused by Restaurant. Nothing hall-specific is forked
 * here; only the two endpoint strings differ.
 */
export default async function MarriageHallReviewsPage() {
  const data = await getTheHall();
  if (!data) return <HallEmpty title="Reviews" />;

  const { hall, reviewSummary, reviews } = data;

  return (
    <div className="section bg-cream">
      <div className="container-luxe">
        <PageHeader
          eyebrow="In their words"
          title="Families who celebrated here"
          lead="Every review below is from a family who held their function at this venue, and each one is published only after we have verified it."
          crumbs={[
            { label: "Marriage Hall", href: "/marriage-hall" },
            { label: "Reviews" },
          ]}
        />

        {reviewSummary.count > 0 && (
          <Reveal className="mb-16">
            <div className="mx-auto flex max-w-md flex-col items-center rounded-luxe border border-ink/[0.07] bg-white px-8 py-9 text-center shadow-luxury">
              <p className="price text-display-md leading-none">
                {reviewSummary.average.toFixed(1)}
              </p>
              <div className="mt-4">
                <StarRating rating={reviewSummary.average} />
              </div>
              <p className="meta mt-4">
                {reviewSummary.count} {reviewSummary.count === 1 ? "review" : "reviews"}
              </p>
            </div>
          </Reveal>
        )}

        <ReviewsList reviews={reviews} />

        {/* ── Leave a review ── */}
        <section className="mt-24">
          <div className="mx-auto max-w-2xl">
            <div className="mb-10 text-center">
              <Reveal>
                <p className="section-eyebrow justify-center">Share your day</p>
                <h2 className="section-title !text-display-sm">Did you celebrate with us?</h2>
                <p className="body-muted mx-auto mt-4 max-w-prose">
                  We would be grateful to hear how it went. Reviews appear once our team has
                  approved them.
                </p>
              </Reveal>
            </div>

            <Reveal delay={0.1}>
              <ReviewForm
                reviewEndpoint={`/halls/${hall._id}/reviews`}
                uploadEndpoint="/halls/reviews/upload-image"
              />
            </Reveal>
          </div>
        </section>

        <Reveal delay={0.15} className="mt-20 text-center">
          <Link href="/marriage-hall/availability" className="btn-primary group">
            Check your date
            <ArrowRight size={14} className="btn-arrow" />
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
