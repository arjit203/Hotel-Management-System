"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE_LUXE } from "@/components/motion/variants";
import { cldImage, IMAGE_WIDTHS } from "@/lib/imageUrl";

/**
 * Full-screen crossfading backdrop for the auth pages.
 *
 * Reference calls for "full screen background with motion/slider", so this
 * reuses the home hero's language: a slow crossfade with a Ken Burns push,
 * under a heavy warm scrim so the glass card and its white inputs stay legible
 * over any photograph.
 *
 * Fixed-position and pointer-events-none so it sits behind the scrolling card
 * without trapping clicks or fighting the page height on short viewports.
 */
const SLIDE_MS = 7000;

export default function AuthBackdrop({ images }: { images: string[] }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const slides = images.filter(Boolean);

  useEffect(() => {
    if (slides.length <= 1 || reduceMotion) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [slides.length, reduceMotion]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      {slides.length > 0 ? (
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: EASE_LUXE }}
            className="absolute inset-0"
          >
            <div
              className={`h-full w-full bg-cover bg-center ${reduceMotion ? "" : "animate-ken-burns"}`}
              style={{
                backgroundImage: `url(${cldImage(slides[index], { width: IMAGE_WIDTHS.hero })})`,
              }}
            />
          </motion.div>
        </AnimatePresence>
      ) : (
        // No photography uploaded yet — a warm graded panel, never a broken image.
        <div className="absolute inset-0 bg-gradient-to-br from-ink-light via-ink to-black" />
      )}

      {/* Scrims: darken overall, then deepen top and bottom for the card edges. */}
      <div className="absolute inset-0 bg-ink/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-transparent to-ink/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(20,18,15,0.7)_100%)]" />
    </div>
  );
}
