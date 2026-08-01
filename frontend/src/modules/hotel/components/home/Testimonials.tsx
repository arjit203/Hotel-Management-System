"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { Quote, Star } from "lucide-react";
import StarRating from "@/components/StarRating";

interface Review {
  _id: string;
  guestName?: string;
  rating: number;
  comment: string;
}

export default function Testimonials({ reviews, average, count }: { reviews: Review[]; average: number; count: number }) {
  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="section-eyebrow justify-center flex">Guest Stories</p>
        <h2 className="section-title">What Our Guests Say</h2>
      </div>

      {reviews.length > 0 ? (
        <Swiper
          modules={[Autoplay, Pagination]}
          slidesPerView={1}
          spaceBetween={24}
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          breakpoints={{ 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
          className="pb-12"
        >
          {reviews.slice(0, 9).map((r) => (
            <SwiperSlide key={r._id}>
              <div className="bg-white rounded-2xl p-8 shadow-luxury border border-ink/5 h-full flex flex-col">
                <Quote size={26} className="text-gold mb-4" />
                <p className="text-ink/70 text-sm leading-relaxed flex-1">&ldquo;{r.comment}&rdquo;</p>
                <div className="mt-5 pt-5 border-t border-ink/5">
                  <StarRating rating={r.rating} size={14} />
                  <p className="text-sm font-semibold text-ink mt-2">{r.guestName || "Guest"}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        <p className="text-center text-ink/50">No reviews yet — be the first to share your experience.</p>
      )}

      {/* Google Reviews placeholder — real embed requires a Places API key
          (see GOOGLE_MAPS_API_KEY reservation in .env.example); this keeps
          the section present and on-brand until that's wired in. */}
      <div className="mt-14 text-center bg-ink text-cream rounded-2xl p-8 max-w-lg mx-auto">
        <div className="flex items-center justify-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={18} className="text-gold fill-gold" />
          ))}
        </div>
        <p className="font-display text-2xl">{average > 0 ? average.toFixed(1) : "—"} / 5</p>
        <p className="text-cream/60 text-sm mt-1">Based on {count} Google &amp; on-site reviews</p>
      </div>
    </section>
  );
}
