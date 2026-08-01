"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { EASE_LUXE } from "@/components/motion/variants";
import LuxeImage from "@/components/motion/LuxeImage";
import { cldImage, IMAGE_WIDTHS } from "@/lib/imageUrl";

export interface GalleryImage {
  _id: string;
  imageUrl: string;
  title?: string;
  category: string;
}

/**
 * Category tabs + mosaic grid + lightbox. Used on /hotel/gallery.
 *
 * Behaviour is unchanged (filter by category, click to open, prev/next); the
 * presentation is rebuilt: an editorial mosaic where every third tile is tall,
 * animated filter pills, a layout-animated active indicator, and keyboard
 * control (←/→/Esc) in the lightbox.
 *
 * `category` is captured in the admin panel's Gallery form; this is still the
 * only place it is displayed.
 */
export default function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  const categories = ["All", ...Array.from(new Set(images.map((img) => img.category || "Other")))];
  const filtered =
    activeCategory === "All"
      ? images
      : images.filter((img) => (img.category || "Other") === activeCategory);

  const showNext = useCallback(
    () => setLightboxIndex((i) => (i === null ? null : (i + 1) % filtered.length)),
    [filtered.length]
  );
  const showPrev = useCallback(
    () => setLightboxIndex((i) => (i === null ? null : (i - 1 + filtered.length) % filtered.length)),
    [filtered.length]
  );

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, showNext, showPrev]);

  if (!images || images.length === 0) return null;

  return (
    <div>
      {/* ── Filters ── */}
      <div className="mb-12 flex flex-wrap justify-center gap-2.5">
        {categories.map((cat) => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setLightboxIndex(null);
              }}
              aria-pressed={active}
              className={`relative rounded-full px-6 py-2.5 text-[10px] font-medium uppercase tracking-luxe transition-colors duration-400 ${
                active ? "text-cream" : "border border-ink/10 text-warm-500 hover:border-gold hover:text-gold"
              }`}
            >
              {/* Active pill as a CSS-scaled span rather than a Framer shared-layout
                  element: `layoutId` is the only thing on the site that would need
                  Framer's layout-projection feature set, which is roughly a third
                  of the library's weight. A scale/opacity transition reads the same
                  at this size for a fraction of the JS. */}
              <span
                aria-hidden="true"
                className={`absolute inset-0 -z-10 rounded-full bg-ink transition-all duration-400 ease-luxe ${
                  active ? "scale-100 opacity-100" : "scale-90 opacity-0"
                }`}
              />
              <span className="relative capitalize">{cat}</span>
            </button>
          );
        })}
      </div>

      {/* ── Mosaic ── */}
      <motion.div
        // Re-keyed per category so the stagger replays when the filter changes.
        key={activeCategory}
        className="grid auto-rows-[170px] grid-cols-2 gap-3 sm:auto-rows-[200px] sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        {filtered.map((img, i) => (
          <motion.button
            key={img._id}
            onClick={() => setLightboxIndex(i)}
            variants={
              reduceMotion
                ? undefined
                : {
                    hidden: { opacity: 0, y: 22 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_LUXE } },
                  }
            }
            // Every third tile runs tall, so the grid reads as a curated spread.
            className={`group relative overflow-hidden rounded-luxe ${i % 3 === 0 ? "row-span-2" : ""}`}
            aria-label={`Open image: ${img.title || img.category || "gallery photo"}`}
          >
            <LuxeImage
              src={img.imageUrl}
              alt={img.title || `${img.category} photograph`}
              wrapperClassName="h-full w-full"
              zoom
              priority={i < 3}
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink/85 to-transparent p-4 text-left opacity-0 transition-all duration-500 ease-luxe group-hover:translate-y-0 group-hover:opacity-100">
              <span className="block text-[10px] uppercase tracking-luxe text-gold">{img.category}</span>
              {img.title && <span className="mt-0.5 block text-xs font-light text-cream">{img.title}</span>}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxIndex !== null && filtered[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setLightboxIndex(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 p-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Gallery image viewer"
          >
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute right-6 top-6 text-cream transition-colors hover:text-gold"
              aria-label="Close"
            >
              <X size={26} strokeWidth={1.5} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                showPrev();
              }}
              className="absolute left-4 text-cream transition-all hover:-translate-x-0.5 hover:text-gold sm:left-8"
              aria-label="Previous image"
            >
              <ChevronLeft size={34} strokeWidth={1.25} />
            </button>

            <motion.img
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: EASE_LUXE }}
              src={cldImage(filtered[lightboxIndex].imageUrl, { width: IMAGE_WIDTHS.full })}
              alt={filtered[lightboxIndex].title || "Gallery image"}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[90%] rounded-luxe object-contain shadow-lift"
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                showNext();
              }}
              className="absolute right-4 text-cream transition-all hover:translate-x-0.5 hover:text-gold sm:right-8"
              aria-label="Next image"
            >
              <ChevronRight size={34} strokeWidth={1.25} />
            </button>

            <p className="absolute bottom-7 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-eyebrow text-cream/50">
              {lightboxIndex + 1} / {filtered.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
