"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Expand } from "lucide-react";
import LuxeImage from "@/components/motion/LuxeImage";
import Lightbox from "@/components/ui/Lightbox";
import { EASE_LUXE } from "@/components/motion/variants";

export type EstateModule = "hotel" | "restaurant" | "hall";

export interface EstateImage {
  _id: string;
  imageUrl: string;
  title?: string;
  category?: string;
  /** Which vertical this photograph belongs to. */
  module: EstateModule;
}

const MODULE_LABEL: Record<EstateModule, string> = {
  hotel: "Hotel",
  restaurant: "Restaurant",
  hall: "Marriage Hall",
};

const MODULE_HREF: Record<EstateModule, string> = {
  hotel: "/hotel/gallery",
  restaurant: "/restaurant/gallery",
  hall: "/marriage-hall/gallery",
};

/**
 * The home page gallery, drawing on all three verticals.
 *
 * ── Why this replaced <GalleryPreview> here ──
 * The home page previously rendered `<GalleryPreview images={gallery} />` with
 * the *hotel's* gallery, so the estate's front door showed only bedrooms. A
 * visitor looking for a wedding venue or a table saw nothing that spoke to them.
 *
 * This interleaves the three collections and adds a module filter, so the
 * default view is a genuine mix and one tap narrows it. "Explore all" points at
 * whichever vertical is filtered — or, on All, at the fullest of the three.
 *
 * Which photographs appear is controlled entirely from the admin panel: each
 * vertical's Gallery tab owns its own set and its `displayOrder`, and this takes
 * the first few of each. There is no separate "homepage gallery" to maintain.
 */
export default function EstateGallery({
  images,
  eyebrow = "The estate",
  title = "One address, three worlds",
  /** How many tiles to show before the filter narrows things. */
  limit = 9,
}: {
  images: EstateImage[];
  eyebrow?: string;
  title?: string;
  limit?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [activeModule, setActiveModule] = useState<EstateModule | "all">("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  /** Only offer a filter for verticals that actually have photographs. */
  const availableModules = useMemo(() => {
    const present = new Set(images.map((i) => i.module));
    return (["hotel", "restaurant", "hall"] as EstateModule[]).filter((m) => present.has(m));
  }, [images]);

  const filtered = useMemo(() => {
    const pool =
      activeModule === "all" ? images : images.filter((i) => i.module === activeModule);
    return pool.slice(0, limit);
  }, [images, activeModule, limit]);

  const lightboxImages = useMemo(
    () =>
      filtered.map((i) => ({
        src: i.imageUrl,
        alt: i.title || `${MODULE_LABEL[i.module]} photograph`,
        caption: i.title ? `${i.title} · ${MODULE_LABEL[i.module]}` : MODULE_LABEL[i.module],
      })),
    [filtered]
  );

  /** On "All", send people to whichever vertical contributed the most images. */
  const exploreHref = useMemo(() => {
    if (activeModule !== "all") return MODULE_HREF[activeModule];
    const counts = new Map<EstateModule, number>();
    images.forEach((i) => counts.set(i.module, (counts.get(i.module) ?? 0) + 1));
    const richest = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return richest ? MODULE_HREF[richest] : "/hotel/gallery";
  }, [activeModule, images]);

  if (images.length === 0) return null;

  return (
    <section className="section bg-cream-dark">
      <div className="container-luxe">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="section-eyebrow">{eyebrow}</p>
            <h2 className="section-title">{title}</h2>
          </div>

          <Link href={exploreHref} className="btn-outline group">
            Explore all
            <ArrowRight size={14} className="btn-arrow" />
          </Link>
        </div>

        {/* ── Module filter ── */}
        {availableModules.length > 1 && (
          <div className="mb-10 flex flex-wrap gap-2 sm:gap-3">
            {(["all", ...availableModules] as const).map((key) => {
              const isActive = key === activeModule;
              const label = key === "all" ? "Everything" : MODULE_LABEL[key];
              const count =
                key === "all" ? images.length : images.filter((i) => i.module === key).length;

              return (
                <button
                  key={key}
                  onClick={() => setActiveModule(key)}
                  aria-pressed={isActive}
                  className={`rounded-full border px-5 py-2.5 text-xs uppercase tracking-luxe
                              transition-all duration-400 ease-luxe ${
                                isActive
                                  ? "border-gold bg-gold text-ink shadow-gold"
                                  : "border-ink/12 text-warm-500 hover:border-gold/50 hover:text-ink"
                              }`}
                >
                  {label}
                  <span className={isActive ? "ml-2 text-ink/60" : "ml-2 text-warm-400"}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Mosaic. First tile spans two columns and rows so the grid reads as
               a curated spread rather than a contact sheet. ── */}
        <div
          key={activeModule}
          className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        >
          {filtered.map((image, index) => (
            <motion.button
              key={image._id}
              onClick={() => setLightboxIndex(index)}
              initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                ease: EASE_LUXE,
                delay: reduceMotion ? 0 : Math.min(index, 8) * 0.05,
              }}
              aria-label={`View ${image.title || MODULE_LABEL[image.module]} full screen`}
              className={`group relative overflow-hidden rounded-luxe ${
                index === 0 ? "col-span-2 row-span-2" : ""
              }`}
            >
              <LuxeImage
                src={image.imageUrl}
                alt={image.title || `${MODULE_LABEL[image.module]} photograph`}
                wrapperClassName={index === 0 ? "aspect-square" : "aspect-square"}
                zoom
                hoverScrim
                sizes={
                  index === 0
                    ? "(max-width: 1024px) 100vw, 50vw"
                    : "(max-width: 640px) 50vw, 25vw"
                }
              />

              {/* Module tag, so a mixed grid stays legible. */}
              <span className="absolute left-3 top-3 rounded-full bg-ink/55 px-2.5 py-1 text-[10px] uppercase tracking-eyebrow text-cream backdrop-blur-sm">
                {MODULE_LABEL[image.module]}
              </span>

              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 opacity-0 transition-opacity duration-400 ease-luxe group-hover:opacity-100">
                {image.title && (
                  <span className="min-w-0 truncate text-left text-sm font-light text-cream">
                    {image.title}
                  </span>
                )}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cream/40 text-cream">
                  <Expand size={13} />
                </span>
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <Lightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
        label="Estate gallery"
      />
    </section>
  );
}
