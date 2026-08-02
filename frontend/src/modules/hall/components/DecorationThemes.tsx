"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import LuxeImage from "@/components/motion/LuxeImage";
import Lightbox from "@/components/ui/Lightbox";
import { EASE_LUXE } from "@/components/motion/variants";
import type { HallShowcaseEntry } from "@/lib/hall";
import BeforeAfter from "./BeforeAfter";

/**
 * Decoration theme showcase.
 *
 * Separate from <ShowcaseSection> because a theme carries two things the other
 * showcases don't: a colour palette (rendered as physical swatches, which is how
 * families actually choose) and an optional before/after comparison of the same
 * room bare and dressed.
 *
 * Layout is a filterable grid of large cards; selecting one opens an expanded
 * panel below rather than navigating away, so comparing themes stays fast.
 */
export default function DecorationThemes({
  entries,
  categories,
  /** Where the "enquire with this theme" CTA points. */
  enquiryHref = "/marriage-hall/availability",
  className,
}: {
  entries: HallShowcaseEntry[];
  categories: string[];
  enquiryHref?: string;
  className?: string;
}) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      activeCategory === "All"
        ? entries
        : entries.filter((entry) => entry.category === activeCategory),
    [entries, activeCategory]
  );

  const expanded = useMemo(
    () => filtered.find((entry) => entry._id === expandedId) ?? null,
    [filtered, expandedId]
  );

  const lightboxImages = useMemo(
    () =>
      expanded
        ? expanded.images.map((src) => ({ src, alt: expanded.title, caption: expanded.title }))
        : [],
    [expanded]
  );

  if (entries.length === 0) return null;

  return (
    <div className={className}>
      {categories.length > 1 && (
        <div className="mb-12 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {["All", ...categories].map((category) => {
            const isActive = category === activeCategory;
            return (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setExpandedId(null);
                }}
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

      {/* ── Theme grid ── */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((theme, index) => {
          const isOpen = theme._id === expandedId;
          return (
            <motion.button
              key={theme._id}
              type="button"
              onClick={() => setExpandedId(isOpen ? null : theme._id)}
              aria-expanded={isOpen}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.7, ease: EASE_LUXE, delay: Math.min(index, 6) * 0.06 }}
              className={`group relative overflow-hidden rounded-luxe border text-left transition-all duration-600 ease-luxe
                          ${
                            isOpen
                              ? "border-gold shadow-gold"
                              : "border-ink/[0.06] shadow-luxury hover:-translate-y-1.5 hover:border-gold/25 hover:shadow-lift"
                          }`}
            >
              {theme.images[0] && (
                <LuxeImage
                  src={theme.images[0]}
                  alt={theme.title}
                  wrapperClassName="aspect-[4/5]"
                  zoom
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              )}

              {/* Permanent bottom scrim so the caption always reads. */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/85 via-ink/35 to-transparent"
              />

              {theme.isFeatured && (
                <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-[10px] uppercase tracking-eyebrow text-ink">
                  <Sparkles size={11} />
                  Most requested
                </span>
              )}

              <span className="absolute inset-x-0 bottom-0 p-6">
                <span className="block text-[10px] uppercase tracking-eyebrow text-gold-light">
                  {theme.category}
                </span>
                <span className="mt-1.5 block font-display text-2xl leading-tight text-cream">
                  {theme.title}
                </span>

                {/* Palette strip — the reason this component exists. */}
                {theme.colorPalette.length > 0 && (
                  <span className="mt-4 flex gap-1.5">
                    {theme.colorPalette.map((hex) => (
                      <span
                        key={hex}
                        title={hex}
                        style={{ backgroundColor: hex }}
                        className="h-5 w-5 rounded-full border border-cream/40 shadow-sm"
                      />
                    ))}
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Expanded detail ── */}
      <AnimatePresence mode="wait">
        {expanded && (
          <motion.div
            key={expanded._id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.55, ease: EASE_LUXE }}
            className="overflow-hidden"
          >
            <div className="mt-10 rounded-luxe border border-gold/25 bg-white p-7 shadow-luxury sm:p-10">
              <div className="grid gap-10 lg:grid-cols-5 lg:gap-14">
                <div className="lg:col-span-3">
                  {/* A before/after when the venue has uploaded the bare-room
                      frame; otherwise the hero image on its own. */}
                  {expanded.beforeImageUrl && expanded.images[0] ? (
                    <BeforeAfter
                      beforeSrc={expanded.beforeImageUrl}
                      afterSrc={expanded.images[0]}
                      alt={expanded.title}
                      beforeLabel="The bare hall"
                      afterLabel={expanded.title}
                    />
                  ) : (
                    expanded.images[0] && (
                      <button
                        onClick={() => setLightboxIndex(0)}
                        className="group block w-full"
                        aria-label={`View ${expanded.title} full screen`}
                      >
                        <LuxeImage
                          src={expanded.images[0]}
                          alt={expanded.title}
                          wrapperClassName="aspect-[16/10] rounded-luxe"
                          zoom
                          sizes="(max-width: 1024px) 100vw, 60vw"
                        />
                      </button>
                    )
                  )}

                  {expanded.beforeImageUrl && (
                    <p className="mt-3 text-center text-xs font-light text-warm-400">
                      Drag to see the same room before and after
                    </p>
                  )}
                </div>

                <div className="lg:col-span-2">
                  <p className="section-eyebrow">{expanded.category}</p>
                  <h3 className="font-display text-display-sm text-ink">{expanded.title}</h3>
                  <p className="lead mt-4">{expanded.description}</p>

                  {expanded.colorPalette.length > 0 && (
                    <div className="mt-8">
                      <p className="meta mb-3">Colour palette</p>
                      <div className="flex flex-wrap gap-2.5">
                        {expanded.colorPalette.map((hex) => (
                          <span key={hex} className="flex items-center gap-2">
                            <span
                              style={{ backgroundColor: hex }}
                              className="h-8 w-8 rounded-full border border-ink/10 shadow-sm"
                              aria-hidden="true"
                            />
                            <span className="font-mono text-[11px] uppercase text-warm-400">
                              {hex}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {expanded.highlights.length > 0 && (
                    <div className="mt-8">
                      <p className="meta mb-3">What&apos;s included</p>
                      <ul className="space-y-2">
                        {expanded.highlights.map((highlight) => (
                          <li
                            key={highlight}
                            className="flex items-start gap-2.5 text-[0.9375rem] font-light leading-relaxed text-warm-600"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold"
                            />
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Link href={enquiryHref} className="btn-primary group mt-9">
                    Enquire with this theme
                    <ArrowRight size={14} className="btn-arrow" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Lightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
