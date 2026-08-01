"use client";

import { useState } from "react";
import { Quote } from "lucide-react";
import StarRating from "@/components/StarRating";
import LuxeImage from "@/components/motion/LuxeImage";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

interface Review {
  _id: string;
  guestName?: string;
  rating: number;
  comment: string;
  images?: string[];
}

const PAGE_SIZE = 6;

export default function ReviewsList({ reviews }: { reviews: Review[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE));
  const pageReviews = reviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (reviews.length === 0) {
    return (
      <p className="py-12 text-center font-light text-warm-500">
        No reviews yet — be the first to share your experience.
      </p>
    );
  }

  return (
    <div>
      <Stagger
        // Re-keyed per page so the stagger replays on pagination.
        key={page}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8"
      >
        {pageReviews.map((r) => (
          <StaggerItem key={r._id} className="flex">
            <figure className="card-luxe card-hover group flex w-full flex-col overflow-hidden p-8">
              <Quote
                aria-hidden="true"
                className="absolute -right-2 -top-3 h-20 w-20 rotate-180 text-gold/[0.06] transition-colors duration-700 group-hover:text-gold/[0.12]"
                strokeWidth={1}
              />
              <StarRating rating={r.rating} size={13} />

              <blockquote className="mt-5 flex-1">
                <p className="font-display text-lg font-light leading-relaxed text-ink/80">
                  &ldquo;{r.comment}&rdquo;
                </p>
              </blockquote>

              {r.images && r.images.length > 0 && (
                <div className="mt-6 grid grid-cols-4 gap-2">
                  {r.images.map((url, i) => (
                    <LuxeImage
                      key={i}
                      src={url}
                      alt="Guest photograph"
                      wrapperClassName="h-20 rounded-lg"
                      width={200}
                      sizes="120px"
                    />
                  ))}
                </div>
              )}

              <figcaption className="mt-7 flex items-center gap-3 border-t border-ink/[0.07] pt-5">
                {/* Monogram initial rather than a stock avatar. */}
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/12 font-display text-base text-gold">
                  {(r.guestName || "G").trim().charAt(0).toUpperCase()}
                </span>
                <span className="text-[11px] font-medium uppercase tracking-luxe text-ink/70">
                  {r.guestName || "Guest"}
                </span>
              </figcaption>
            </figure>
          </StaggerItem>
        ))}
      </Stagger>

      {totalPages > 1 && (
        <nav aria-label="Reviews pagination" className="mt-14 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              aria-current={p === page ? "page" : undefined}
              className={`h-10 w-10 rounded-full text-xs font-medium tabular-nums transition-all duration-400 ease-luxe ${
                p === page
                  ? "bg-ink text-cream"
                  : "border border-ink/10 text-warm-500 hover:border-gold hover:text-gold"
              }`}
            >
              {p}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
