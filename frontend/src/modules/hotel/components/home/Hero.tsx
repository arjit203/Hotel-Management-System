"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import { Play, ArrowRight } from "lucide-react";

interface HeroProps {
  hotelName: string;
  images: string[]; // gallery/room images used as slider backdrops
}

export default function Hero({ hotelName, images }: HeroProps) {
  const slides = images.length > 0 ? images : ["/hero-fallback.jpg"];

  return (
    <section className="relative h-[88vh] min-h-[560px] w-full overflow-hidden">
      <Swiper
        modules={[Autoplay, EffectFade]}
        effect="fade"
        autoplay={{ delay: 4500, disableOnInteraction: false }}
        loop={slides.length > 1}
        className="absolute inset-0 h-full w-full"
      >
        {slides.map((src, i) => (
          <SwiperSlide key={i}>
            <div
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${src})` }}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Dark overlay for text legibility over the slider */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/40 to-ink/70" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-5">
        <p className="section-eyebrow text-gold">Welcome to</p>
        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl text-cream leading-tight max-w-4xl">
          {hotelName}
        </h1>
        <p className="text-cream/80 mt-5 max-w-xl text-base sm:text-lg">
          Where luxury meets warm hospitality — an unforgettable stay awaits.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-9">
          <Link href="/hotel/booking" className="btn-primary bg-gold text-ink hover:bg-cream">
            Book Your Stay <ArrowRight size={16} />
          </Link>
          <button className="inline-flex items-center gap-2 text-cream border border-cream/40 rounded-full px-6 py-3 hover:border-gold hover:text-gold transition-colors">
            <Play size={16} /> Watch Video
          </button>
        </div>
      </div>
    </section>
  );
}
