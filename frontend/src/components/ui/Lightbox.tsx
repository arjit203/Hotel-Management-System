"use client";

import { useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { EASE_LUXE } from "@/components/motion/variants";
import { cldImage, IMAGE_WIDTHS } from "@/lib/imageUrl";

/**
 * Full-screen image viewer.
 *
 * This existed three times over — in GalleryGrid, GalleryPreview and
 * RoomImageGallery — each with its own copy of the backdrop, the close button, the
 * prev/next chevrons, the keyboard listener, the scroll lock and the counter. The
 * copies had already drifted (different aria labels, one missing scroll lock).
 * This is the single implementation.
 *
 * Behaviour matches what the three callers had between them:
 *  • click backdrop or Escape to close, ←/→ to page
 *  • body scroll locked while open
 *  • image click-through swallowed so the backdrop handler doesn't fire
 *  • `full`-width Cloudinary variant requested for the large view
 *
 * Caller owns the open/index state, so the trigger grid stays wherever it lives.
 */
export interface LightboxImage {
  src: string;
  alt?: string;
  /** Optional caption shown under the counter. */
  caption?: string;
}

export default function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
  label = "Image viewer",
}: {
  images: LightboxImage[];
  /** `null` = closed. */
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  label?: string;
}) {
  const isOpen = index !== null && images.length > 0 && !!images[index];

  const showNext = useCallback(() => {
    if (index === null) return;
    onIndexChange((index + 1) % images.length);
  }, [index, images.length, onIndexChange]);

  const showPrev = useCallback(() => {
    if (index === null) return;
    onIndexChange((index - 1 + images.length) % images.length);
  }, [index, images.length, onIndexChange]);

  useEffect(() => {
    if (!isOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();
    }

    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      // Restore rather than blanking, so a nested lock (drawer) isn't clobbered.
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose, showNext, showPrev]);

  const current = isOpen ? images[index as number] : null;

  return (
    <AnimatePresence>
      {isOpen && current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-cream transition-colors hover:text-gold"
            aria-label="Close"
          >
            <X size={26} strokeWidth={1.5} />
          </button>

          {images.length > 1 && (
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
          )}

          <motion.img
            key={index}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: EASE_LUXE }}
            src={cldImage(current.src, { width: IMAGE_WIDTHS.full })}
            alt={current.alt || "Image"}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[90%] rounded-luxe object-contain shadow-lift"
          />

          {images.length > 1 && (
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
          )}

          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 text-center">
            {current.caption && (
              <p className="mb-1.5 text-xs font-light text-cream/70">{current.caption}</p>
            )}
            {images.length > 1 && (
              <p className="text-xs uppercase tracking-eyebrow text-cream/50">
                {(index as number) + 1} / {images.length}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
