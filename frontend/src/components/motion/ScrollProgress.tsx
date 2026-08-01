"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * Hairline gold progress bar pinned to the very top of the viewport.
 *
 * Cheap (one transform on one element) and it gives long pages — Rooms, Gallery,
 * Reviews — a sense of depth and position. Purely decorative, so it's hidden
 * from assistive tech and skipped entirely under reduced-motion.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-gold-dark via-gold to-gold-light"
    />
  );
}
