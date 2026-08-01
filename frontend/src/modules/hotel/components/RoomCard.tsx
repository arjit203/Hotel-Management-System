"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import AnimatedNumber from "@/components/motion/AnimatedNumber";
import { cldImage, cldSrcSet, IMAGE_WIDTHS } from "@/lib/imageUrl";

export interface RoomSummary {
  _id: string;
  slug: string;
  categoryName: string;
  name: string;
  description: string;
  basePrice: number;
  maxOccupancy: number;
  images: string[];
}

/**
 * Room card.
 *
 * Data shape, destination route and the auto-rotating image behaviour are
 * unchanged; this is a presentation rebuild. The whole card is one hover target:
 * the image pushes in, the scrim deepens, the card lifts on a warmer shadow, the
 * rate counts up on first view, and the CTA rule extends.
 *
 * Accessibility: exactly ONE link per card. The room-name link is stretched over
 * the entire card via an ::after overlay, so the whole surface is clickable
 * without emitting three duplicate links (image / title / "Details") to screen
 * readers and keyboard users. "Details" is therefore a visual affordance, not a
 * second link, and the photos are alt="" because the heading already names them.
 */
export default function RoomCard({ room, priority = false }: { room: RoomSummary; priority?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  // Which frames have been mounted so far. Starts as just the first one; the
  // next is added ahead of time so the crossfade never reveals a blank frame.
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0]));
  const images = room.images || [];

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((i) => {
        const next = (i + 1) % images.length;
        // Mount the frame after next, so it's decoded before it's shown.
        setMounted((prev) => new Set(prev).add(next).add((next + 1) % images.length));
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    // `w-full` so the card fills its grid/flex cell and cards in a row stay
    // equal height regardless of copy length.
    <article className="card-luxe card-hover group flex w-full flex-col overflow-hidden">
      {/* ── Media ── */}
      <div className="media h-64 shrink-0 sm:h-72">
        {images.length > 0 ? (
          <>
            {images.map((src, i) => {
              // Only the visible frame and the one queued next are mounted.
              // Previously every photo of every room was in the DOM at once, so a
              // 3-card grid of 5-photo rooms pulled 15 full-size images on load —
              // the main cause of the slow image render. The rest mount as the
              // crossfade reaches them, by which point they're cheap.
              if (!mounted.has(i)) return null;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={cldImage(src, { width: IMAGE_WIDTHS.card })}
                  srcSet={cldSrcSet(src, [400, 800, 1200])}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                  alt=""
                  loading={priority && i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  onLoad={() => setLoaded((prev) => ({ ...prev, [i]: true }))}
                  onError={() => setLoaded((prev) => ({ ...prev, [i]: true }))}
                  className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-900 ease-luxe will-change-transform ${
                    i === activeIndex && loaded[i] ? "opacity-100" : "opacity-0"
                  } group-hover:scale-[1.07]`}
                />
              );
            })}
            {/* Shimmer until the visible frame has actually decoded. */}
            {!loaded[activeIndex] && <span className="skeleton absolute inset-0" aria-hidden="true" />}
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-cream-dark to-cream-deep" />
        )}

        {/* Scrim deepens on hover so the category chip stays legible. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent
                     opacity-70 transition-opacity duration-600 ease-luxe group-hover:opacity-100"
        />

        {/* Category chip */}
        <span className="absolute left-5 top-5 rounded-full bg-cream/90 px-4 py-1.5 text-[10px] font-medium uppercase tracking-eyebrow text-ink backdrop-blur-sm">
          {room.categoryName}
        </span>

        {/* Slide rules */}
        {images.length > 1 && (
          <span aria-hidden="true" className="absolute bottom-5 left-5 flex gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-[2px] transition-all duration-600 ease-luxe ${
                  i === activeIndex ? "w-6 bg-gold" : "w-3 bg-cream/45"
                }`}
              />
            ))}
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col p-7">
        <h3 className="card-title">
          {/* The stretched link: ::after covers the whole card. */}
          <Link
            href={`/hotel/rooms/${room.slug}`}
            className="transition-colors duration-400 after:absolute after:inset-0 after:z-10 after:content-[''] hover:text-gold"
          >
            {room.name}
          </Link>
        </h3>

        <p className="body-muted mt-3 flex-1">
          {room.description.length > 110 ? `${room.description.slice(0, 110).trimEnd()}…` : room.description}
        </p>

        <p className="mt-5 flex items-center gap-2 text-xs uppercase tracking-luxe text-warm-500">
          <Users size={13} className="text-gold" /> Up to {room.maxOccupancy} guests
        </p>

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-ink/[0.07] pt-6">
          <p className="leading-none">
            <span className="mb-1.5 block text-[9px] uppercase tracking-eyebrow text-warm-400">From</span>
            <span className="price text-[1.75rem]">
              ₹<AnimatedNumber value={room.basePrice} />
            </span>
            <span className="ml-1 text-xs font-light text-warm-500">/ night</span>
          </p>

          {/* Visual affordance only — the card-wide link above handles navigation. */}
          <span aria-hidden="true" className="link-arrow shrink-0 pb-1">
            <span className="relative">
              Details
              <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-gold transition-transform duration-500 ease-luxe group-hover:scale-x-100" />
            </span>
            <ArrowRight size={14} className="group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </article>
  );
}
