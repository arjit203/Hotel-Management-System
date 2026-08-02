"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_LUXE } from "@/components/motion/variants";
import LuxeImage from "@/components/motion/LuxeImage";
import Lightbox from "@/components/ui/Lightbox";

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
      <Lightbox
        images={filtered.map((img) => ({
          src: img.imageUrl,
          alt: img.title || `${img.category} photograph`,
          caption: img.title,
        }))}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
        label="Gallery image viewer"
      />
    </div>
  );
}
