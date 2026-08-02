"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { EASE_LUXE, VIEWPORT } from "@/components/motion/variants";
import LuxeImage from "@/components/motion/LuxeImage";
import Lightbox from "@/components/ui/Lightbox";

interface GalleryImage {
  _id: string;
  imageUrl: string;
  title?: string;
}

/**
 * Editorial mosaic preview — the first tile spans two columns and two rows so the
 * grid reads as a curated spread rather than a uniform contact sheet.
 *
 * Lightbox behaviour is unchanged (click to open, prev/next, click-out to close)
 * and now also supports arrow keys and Escape, with a fade/scale transition.
 */
export default function GalleryPreview({
  images,
  href,
  eyebrow = "Moments",
  title = "The property",
}: {
  images: GalleryImage[];
  /** Where "Full gallery" points — vertical-specific. */
  href: string;
  eyebrow?: string;
  title?: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const shown = images.slice(0, 7);

  if (images.length === 0) return null;

  return (
    <section className="section container-luxe">
      <div className="mb-14 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="section-eyebrow">{eyebrow}</p>
          <h2 className="section-title">{title}</h2>
        </div>
        <Link href={href} className="link-arrow">
          Full gallery <ArrowRight size={14} />
        </Link>
      </div>

      <motion.div
        className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[190px] sm:grid-cols-4 sm:gap-4"
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
      >
        {shown.map((img, i) => (
          <motion.button
            key={img._id}
            onClick={() => setLightboxIndex(i)}
            variants={
              reduceMotion
                ? undefined
                : {
                    hidden: { opacity: 0, y: 26 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE_LUXE } },
                  }
            }
            // First tile is the hero of the mosaic; the rest fill around it.
            className={`group relative overflow-hidden rounded-luxe ${
              i === 0 ? "col-span-2 row-span-2" : ""
            }`}
            aria-label={`Open image: ${img.title || "gallery photo"}`}
          >
            <LuxeImage
              src={img.imageUrl}
              alt={img.title || "7 Vachan property photograph"}
              wrapperClassName="h-full w-full rounded-luxe"
              zoom
              priority={i === 0}
            />
            {/* Caption reveal on hover */}
            {img.title && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink/80 to-transparent p-4 text-left text-[11px] uppercase tracking-luxe text-cream opacity-0 transition-all duration-500 ease-luxe group-hover:translate-y-0 group-hover:opacity-100">
                {img.title}
              </span>
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* ── Lightbox ── */}
      <Lightbox
        images={shown.map((img) => ({
          src: img.imageUrl,
          alt: img.title || "Gallery image",
          caption: img.title,
        }))}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
        label="Gallery image viewer"
      />
    </section>
  );
}
