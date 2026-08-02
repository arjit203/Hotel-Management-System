"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Expand, Images } from "lucide-react";
import LuxeImage from "@/components/motion/LuxeImage";
import Lightbox from "@/components/ui/Lightbox";
import EmptyState from "@/components/ui/EmptyState";
import { EASE_LUXE } from "@/components/motion/variants";
import type { HallGalleryItem } from "@/lib/hall";

/**
 * The venue portfolio — the most important surface on the Marriage Hall site.
 *
 * ── Why CSS columns rather than a JS masonry library ──
 * A true masonry needs measured heights, which means either a layout library or
 * a resize-observer loop that reflows on every image decode. CSS multi-column
 * gets the same staggered look with zero JavaScript, no layout thrash and no
 * dependency — and it degrades perfectly when JS is still loading. The one
 * trade-off is reading order (columns fill top-to-bottom, not left-to-right),
 * which does not matter for a photo wall.
 *
 * Lazy loading, the shimmer placeholder, the fade-in on decode and the hover
 * zoom all come from the shared <LuxeImage>. The lightbox is the shared
 * <Lightbox>. Nothing here is a fork of an existing component.
 */
export default function MasonryGallery({
  items,
  /** Categories in the order the venue wants them offered. */
  categories,
  /** Cap the initial render; the rest loads behind a "show more". */
  initialCount = 18,
  className,
}: {
  items: HallGalleryItem[];
  categories: string[];
  initialCount?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      activeCategory === "All"
        ? items
        : items.filter((item) => item.category === activeCategory),
    [items, activeCategory]
  );

  const visible = filtered.slice(0, visibleCount);

  // The lightbox pages through the FILTERED set, so "next" follows what the
  // visitor is actually looking at rather than jumping to a hidden category.
  const lightboxImages = useMemo(
    () =>
      filtered.map((item) => ({
        src: item.imageUrl,
        alt: item.title || `${item.category} at the venue`,
        caption: item.title,
      })),
    [filtered]
  );

  function selectCategory(category: string) {
    setActiveCategory(category);
    setVisibleCount(initialCount);
  }

  if (items.length === 0) {
    return (
      <EmptyState
        variant="card"
        icon={Images}
        title="Photographs coming soon"
        description="We are curating this gallery. Call us in the meantime and we will walk you through the venue in person."
      />
    );
  }

  return (
    <div className={className}>
      {/* ── Category filter ── */}
      {categories.length > 1 && (
        <div className="mb-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {["All", ...categories].map((category) => {
            const isActive = category === activeCategory;
            const count =
              category === "All"
                ? items.length
                : items.filter((i) => i.category === category).length;

            return (
              <button
                key={category}
                onClick={() => selectCategory(category)}
                aria-pressed={isActive}
                className={`group relative rounded-full border px-5 py-2.5 text-xs uppercase tracking-luxe
                            transition-all duration-400 ease-luxe ${
                              isActive
                                ? "border-gold bg-gold text-ink shadow-gold"
                                : "border-ink/12 text-warm-500 hover:border-gold/50 hover:text-ink"
                            }`}
              >
                {category}
                <span className={isActive ? "ml-2 text-ink/60" : "ml-2 text-warm-400"}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Masonry wall ──
          `columns-*` + `break-inside-avoid` is the whole layout. The wrapper key
          is the active category so switching filters re-runs the entrance
          animation instead of cross-fading mismatched tiles. */}
      <div
        key={activeCategory}
        className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4 [column-fill:_balance]"
      >
        {visible.map((item, index) => (
          <motion.figure
            key={item._id}
            initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              ease: EASE_LUXE,
              // Stagger only within the first screenful; after that the delay
              // would just make later tiles feel slow.
              delay: reduceMotion ? 0 : Math.min(index, 12) * 0.045,
            }}
            className="group relative mb-3 break-inside-avoid sm:mb-4"
          >
            <button
              onClick={() => setLightboxIndex(index)}
              className="block w-full text-left"
              aria-label={`View ${item.title || item.category} full screen`}
            >
              <LuxeImage
                src={item.imageUrl}
                alt={item.title || `${item.category} at the venue`}
                wrapperClassName="rounded-luxe"
                // No fixed aspect ratio — letting each image keep its own
                // proportions is what produces the masonry rhythm.
                className="!h-auto w-full"
                zoom
                hoverScrim
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />

              {/* Caption + expand cue, revealed on hover. */}
              <figcaption
                className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3
                           p-4 opacity-0 transition-opacity duration-400 ease-luxe
                           group-hover:opacity-100 group-focus-within:opacity-100"
              >
                <span className="min-w-0">
                  {item.title && (
                    <span className="block truncate text-sm font-light text-cream">
                      {item.title}
                    </span>
                  )}
                  <span className="block text-[11px] uppercase tracking-luxe text-cream/65">
                    {item.category}
                  </span>
                </span>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                             border border-cream/40 text-cream backdrop-blur-sm"
                >
                  <Expand size={13} />
                </span>
              </figcaption>
            </button>
          </motion.figure>
        ))}
      </div>

      {filtered.length > visibleCount && (
        <div className="mt-12 text-center">
          <button
            onClick={() => setVisibleCount((c) => c + initialCount)}
            className="btn-outline group"
          >
            Show more
            <span className="ml-1 text-warm-400">
              ({filtered.length - visibleCount} remaining)
            </span>
          </button>
        </div>
      )}

      <Lightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
        label="Venue gallery"
      />
    </div>
  );
}
