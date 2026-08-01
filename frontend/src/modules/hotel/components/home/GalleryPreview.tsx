"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, X, ChevronLeft, ChevronRight } from "lucide-react";
import { EASE_LUXE, VIEWPORT } from "@/components/motion/variants";
import LuxeImage from "@/components/motion/LuxeImage";
import { cldImage, IMAGE_WIDTHS } from "@/lib/imageUrl";

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
export default function GalleryPreview({ images }: { images: GalleryImage[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const shown = images.slice(0, 7);

  const showNext = useCallback(
    () => setLightboxIndex((i) => (i === null ? null : (i + 1) % shown.length)),
    [shown.length]
  );
  const showPrev = useCallback(
    () => setLightboxIndex((i) => (i === null ? null : (i - 1 + shown.length) % shown.length)),
    [shown.length]
  );

  // Keyboard control while the lightbox is open.
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

  if (images.length === 0) return null;

  return (
    <section className="section container-luxe">
      <div className="mb-14 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="section-eyebrow">Moments</p>
          <h2 className="section-title">The property</h2>
        </div>
        <Link href="/hotel/gallery" className="link-arrow">
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
      <AnimatePresence>
        {lightboxIndex !== null && (
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
              src={cldImage(shown[lightboxIndex].imageUrl, { width: IMAGE_WIDTHS.full })}
              alt={shown[lightboxIndex].title || "Gallery image"}
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
              {lightboxIndex + 1} / {shown.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
