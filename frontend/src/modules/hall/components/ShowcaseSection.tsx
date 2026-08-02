"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import LuxeImage from "@/components/motion/LuxeImage";
import Lightbox from "@/components/ui/Lightbox";
import { EASE_LUXE } from "@/components/motion/variants";
import type { HallShowcaseEntry } from "@/lib/hall";

/**
 * The editorial layout shared by Catering, Dining and Floral Decoration.
 *
 * All three sections are the same thing — a category filter over illustrated
 * cards with a description, bullet highlights and (for catering) a sample list.
 * One component covers them because the backend models them with one collection
 * for exactly that reason. Decoration Themes gets its own component only because
 * it adds a colour palette and a before/after comparison.
 *
 * Entries alternate image side down the page so a long section reads as a
 * magazine spread rather than a stack of identical rows.
 */
export default function ShowcaseSection({
  entries,
  categories,
  /** Label for the bullet list, e.g. "Includes" or "On the counter". */
  highlightsLabel = "Highlights",
  /** Label for `sampleItems`; hidden when no entry has any. */
  sampleLabel = "A taste of the menu",
  className,
}: {
  entries: HallShowcaseEntry[];
  categories: string[];
  highlightsLabel?: string;
  sampleLabel?: string;
  className?: string;
}) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      activeCategory === "All"
        ? entries
        : entries.filter((entry) => entry.category === activeCategory),
    [entries, activeCategory]
  );

  // Every image across the visible entries, so the lightbox pages through the
  // whole section rather than one card at a time.
  const lightboxImages = useMemo(
    () =>
      filtered.flatMap((entry) =>
        entry.images.map((src) => ({ src, alt: entry.title, caption: entry.title }))
      ),
    [filtered]
  );

  /** Index of an entry's first image inside the flattened lightbox array. */
  function lightboxOffset(entryIndex: number): number {
    return filtered.slice(0, entryIndex).reduce((sum, e) => sum + e.images.length, 0);
  }

  if (entries.length === 0) return null;

  return (
    <div className={className}>
      {categories.length > 1 && (
        <div className="mb-14 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {["All", ...categories].map((category) => {
            const isActive = category === activeCategory;
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                aria-pressed={isActive}
                className={`rounded-full border px-5 py-2.5 text-xs uppercase tracking-luxe
                            transition-all duration-400 ease-luxe ${
                              isActive
                                ? "border-gold bg-gold text-ink shadow-gold"
                                : "border-ink/12 text-warm-500 hover:border-gold/50 hover:text-ink"
                            }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-20 sm:space-y-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_LUXE }}
            className="space-y-20 sm:space-y-28"
          >
            {filtered.map((entry, index) => {
              const imageFirst = index % 2 === 0;
              const offset = lightboxOffset(index);

              return (
                <motion.article
                  key={entry._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
                  transition={{ duration: 0.8, ease: EASE_LUXE }}
                  className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
                >
                  {/* ── Imagery ── */}
                  <div className={imageFirst ? "" : "lg:order-2"}>
                    {entry.images.length > 0 && (
                      <button
                        onClick={() => setLightboxIndex(offset)}
                        className="group block w-full text-left"
                        aria-label={`View ${entry.title} full screen`}
                      >
                        <LuxeImage
                          src={entry.images[0]}
                          alt={entry.title}
                          wrapperClassName="aspect-[4/3] rounded-luxe shadow-luxury"
                          zoom
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                      </button>
                    )}

                    {/* Secondary frames as a thumbnail strip. */}
                    {entry.images.length > 1 && (
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        {entry.images.slice(1, 4).map((src, i) => (
                          <button
                            key={src}
                            onClick={() => setLightboxIndex(offset + i + 1)}
                            className="group block"
                            aria-label={`View ${entry.title} photo ${i + 2}`}
                          >
                            <LuxeImage
                              src={src}
                              alt={`${entry.title} — photo ${i + 2}`}
                              wrapperClassName="aspect-[4/3] rounded-lg"
                              zoom
                              sizes="(max-width: 1024px) 30vw, 16vw"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Copy ── */}
                  <div className={imageFirst ? "" : "lg:order-1"}>
                    <p className="section-eyebrow">{entry.category}</p>
                    <h3 className="section-title !text-display-sm">{entry.title}</h3>
                    <p className="lead mt-5">{entry.description}</p>

                    {entry.highlights.length > 0 && (
                      <div className="mt-8">
                        <p className="meta mb-4">{highlightsLabel}</p>
                        <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                          {entry.highlights.map((highlight) => (
                            <li key={highlight} className="flex items-start gap-2.5">
                              <Check
                                size={14}
                                strokeWidth={2}
                                className="mt-1 shrink-0 text-gold"
                                aria-hidden="true"
                              />
                              <span className="text-[0.9375rem] font-light leading-relaxed text-warm-600">
                                {highlight}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {entry.sampleItems.length > 0 && (
                      <div className="mt-8 rounded-luxe border border-gold/20 bg-gold/[0.04] px-6 py-5">
                        <p className="meta mb-3">{sampleLabel}</p>
                        <ul className="flex flex-wrap gap-x-2 gap-y-2">
                          {entry.sampleItems.map((item) => (
                            <li
                              key={item}
                              className="rounded-full border border-gold/25 bg-white/60 px-3.5 py-1.5
                                         text-[0.8125rem] font-light text-warm-600"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                        {/* Pricing is deliberately absent — see the note in the
                            hall package model. The venue has not published it. */}
                        <p className="mt-4 text-xs font-light text-warm-400">
                          Menus are built with you. Pricing is shared during your consultation.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <Lightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
