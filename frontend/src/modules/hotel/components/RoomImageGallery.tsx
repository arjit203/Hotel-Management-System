"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { EASE_LUXE } from "@/components/motion/variants";
import { cldImage, IMAGE_WIDTHS } from "@/lib/imageUrl";

/**
 * Room photography viewer.
 *
 * Same props and same thumbnail behaviour as before; the presentation adds a
 * crossfade between frames, prev/next controls, a full-screen view, keyboard
 * navigation, and a frame counter. The main frame keeps a fixed aspect ratio so
 * the page never reflows as images decode.
 */
export default function RoomImageGallery({
  images,
  roomName,
}: {
  images: string[];
  roomName: string;
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const reduceMotion = useReducedMotion();

  const next = useCallback(() => setActiveImage((i) => (i + 1) % images.length), [images.length]);
  const prev = useCallback(
    () => setActiveImage((i) => (i - 1 + images.length) % images.length),
    [images.length]
  );

  // Arrow keys navigate whenever the viewer is expanded; Esc closes it.
  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [expanded, next, prev]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-airy bg-gradient-to-br from-cream-dark to-cream-deep">
        <p className="text-[10px] uppercase tracking-eyebrow text-warm-400">No photography yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Main frame ── */}
      <div className="media group aspect-[4/3] w-full rounded-airy">
        <AnimatePresence initial={false} mode="sync">
          <motion.img
            key={activeImage}
            src={cldImage(images[activeImage], { width: IMAGE_WIDTHS.hero })}
            alt={`${roomName} — photograph ${activeImage + 1} of ${images.length}`}
            initial={reduceMotion ? undefined : { opacity: 0, scale: 1.03 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE_LUXE }}
            onLoad={() => setLoaded((p) => ({ ...p, [activeImage]: true }))}
            onError={() => setLoaded((p) => ({ ...p, [activeImage]: true }))}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>

        {!loaded[activeImage] && <span className="skeleton absolute inset-0" aria-hidden="true" />}

        {/* Expand */}
        <button
          onClick={() => setExpanded(true)}
          aria-label="View full screen"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-ink/40 text-cream backdrop-blur-sm transition-all duration-400 ease-luxe hover:bg-gold hover:text-ink"
        >
          <Expand size={15} strokeWidth={1.75} />
        </button>

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous photograph"
              className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/40 text-cream opacity-0 backdrop-blur-sm transition-all duration-400 ease-luxe hover:bg-gold hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronLeft size={18} strokeWidth={1.75} />
            </button>
            <button
              onClick={next}
              aria-label="Next photograph"
              className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/40 text-cream opacity-0 backdrop-blur-sm transition-all duration-400 ease-luxe hover:bg-gold hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronRight size={18} strokeWidth={1.75} />
            </button>

            <span className="absolute bottom-4 left-4 rounded-full bg-ink/45 px-3 py-1 text-[10px] tabular-nums tracking-luxe text-cream backdrop-blur-sm">
              {activeImage + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {/* ── Thumbnails ── */}
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(i)}
              aria-label={`Show photograph ${i + 1}`}
              aria-current={i === activeImage}
              className={`media h-16 rounded-xl transition-all duration-400 ease-luxe sm:h-20 ${
                i === activeImage
                  ? "ring-2 ring-gold ring-offset-2 ring-offset-cream"
                  : "opacity-55 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cldImage(src, { width: IMAGE_WIDTHS.thumb })}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Full-screen view ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setExpanded(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/96 p-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`${roomName} photography`}
          >
            <button
              onClick={() => setExpanded(false)}
              className="absolute right-6 top-6 text-cream transition-colors hover:text-gold"
              aria-label="Close"
            >
              <X size={26} strokeWidth={1.5} />
            </button>

            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-4 text-cream transition-all hover:-translate-x-0.5 hover:text-gold sm:left-8"
                aria-label="Previous photograph"
              >
                <ChevronLeft size={34} strokeWidth={1.25} />
              </button>
            )}

            <motion.img
              key={activeImage}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: EASE_LUXE }}
              src={cldImage(images[activeImage], { width: IMAGE_WIDTHS.full })}
              alt={`${roomName} — photograph ${activeImage + 1}`}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[92%] rounded-luxe object-contain shadow-lift"
            />

            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-4 text-cream transition-all hover:translate-x-0.5 hover:text-gold sm:right-8"
                aria-label="Next photograph"
              >
                <ChevronRight size={34} strokeWidth={1.25} />
              </button>
            )}

            <p className="absolute bottom-7 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-eyebrow text-cream/50">
              {activeImage + 1} / {images.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
