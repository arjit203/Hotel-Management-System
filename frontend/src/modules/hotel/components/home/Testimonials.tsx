"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { Quote, Star } from "lucide-react";
import StarRating from "@/components/StarRating";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";

interface Review {
  _id: string;
  guestName?: string;
  rating: number;
  comment: string;
}

/**
 * Guest testimonials.
 *
 * Still Swiper (already a project dependency — no new carousel library), but the
 * slides and pagination are restyled: paper-white cards on the cream field, a
 * serif quote mark bled into the corner, and thin gold rules for pagination
 * instead of Swiper's default blue dots (overridden via arbitrary variants so no
 * extra global CSS is needed).
 */
export default function Testimonials({
  reviews,
  average,
  count,
}: {
  reviews: Review[];
  average: number;
  count: number;
}) {
  return (
    <section className="section bg-cream-dark">
      <div className="container-luxe">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Reveal duration={0.6}>
            <p className="section-eyebrow flex justify-center">Guest Stories</p>
          </Reveal>
          <TextReveal as="h2" text="In their words" className="section-title" delay={0.05} />
        </div>

        {reviews.length > 0 ? (
          <Reveal delay={0.1}>
            <Swiper
              modules={[Autoplay, Pagination]}
              slidesPerView={1}
              spaceBetween={24}
              pagination={{ clickable: true }}
              autoplay={{ delay: 6000, disableOnInteraction: false }}
              breakpoints={{ 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
              className="!pb-16
                         [&_.swiper-pagination-bullet]:h-[3px] [&_.swiper-pagination-bullet]:w-6
                         [&_.swiper-pagination-bullet]:rounded-none [&_.swiper-pagination-bullet]:bg-ink/20
                         [&_.swiper-pagination-bullet]:opacity-100 [&_.swiper-pagination-bullet]:transition-all
                         [&_.swiper-pagination-bullet-active]:w-10 [&_.swiper-pagination-bullet-active]:bg-gold"
            >
              {reviews.slice(0, 9).map((r) => (
                <SwiperSlide key={r._id} className="!h-auto pb-1">
                  <figure className="group relative flex h-full flex-col overflow-hidden rounded-luxe border border-ink/[0.06] bg-white p-9 transition-all duration-600 ease-luxe hover:-translate-y-1 hover:shadow-luxury">
                    <Quote
                      aria-hidden="true"
                      className="absolute -right-2 -top-3 h-20 w-20 rotate-180 text-gold/[0.07] transition-colors duration-700 group-hover:text-gold/[0.13]"
                      strokeWidth={1}
                    />
                    <StarRating rating={r.rating} size={13} />
                    <blockquote className="mt-5 flex-1">
                      <p className="font-display text-lg font-light leading-relaxed text-ink/80">
                        &ldquo;{r.comment}&rdquo;
                      </p>
                    </blockquote>
                    <figcaption className="mt-7 flex items-center gap-3 border-t border-ink/[0.07] pt-5">
                      {/* Monogram initial — avoids inventing guest avatars. */}
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/12 font-display text-base text-gold">
                        {(r.guestName || "G").trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="text-[11px] font-medium uppercase tracking-luxe text-ink/70">
                        {r.guestName || "Guest"}
                      </span>
                    </figcaption>
                  </figure>
                </SwiperSlide>
              ))}
            </Swiper>
          </Reveal>
        ) : (
          <p className="text-center font-light text-warm-500">
            No reviews yet — be the first to share your experience.
          </p>
        )}

        {/* Aggregate rating.
            Google Reviews embed remains a placeholder — a real embed needs a
            Places API key (GOOGLE_MAPS_API_KEY is reserved in .env.example). */}
        <Reveal delay={0.15} className="mt-16">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-1 rounded-luxe border border-ink/[0.07] bg-white px-10 py-9 text-center shadow-luxury">
            <div aria-hidden="true" className="mb-2 flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={15} className="fill-gold text-gold" />
              ))}
            </div>
            <p className="price text-4xl">{average > 0 ? average.toFixed(1) : "—"}</p>
            <p className="text-[10px] uppercase tracking-eyebrow text-warm-400">Out of 5</p>
            <p className="mt-3 text-xs font-light text-warm-500">
              Based on {count} Google &amp; on-site {count === 1 ? "review" : "reviews"}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
