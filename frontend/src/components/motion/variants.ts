import type { Variants } from "framer-motion";

/**
 * Shared motion vocabulary for the whole site.
 *
 * Everything animates ONLY `opacity` / `transform`, so every reveal stays on
 * the compositor and never triggers layout or paint. Durations are deliberately
 * slow-ish (0.7–1.1s) with a decelerating ease — fast, springy motion reads as
 * "app", slow deceleration reads as "luxury".
 */

/** Matches `ease-luxe` in tailwind.config.js so CSS hovers and JS reveals agree. */
export const EASE_LUXE = [0.22, 1, 0.36, 1] as const;
export const EASE_SOFT = [0.4, 0, 0.2, 1] as const;

export const DURATION = {
  fast: 0.35,
  base: 0.7,
  slow: 0.95,
  cinematic: 1.4,
} as const;

/** Default scroll trigger: fire slightly before the element is fully in view. */
export const VIEWPORT = { once: true, margin: "-12% 0px -12% 0px" } as const;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.slow, ease: EASE_LUXE } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_LUXE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: DURATION.slow, ease: EASE_LUXE } },
};

/** Parent that releases its children one after another. */
export const staggerParent = (stagger = 0.09, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren } },
});

/** Word-level headline reveal — each word rises out of its own clipping mask. */
export const wordMask: Variants = {
  hidden: { y: "110%" },
  visible: { y: "0%", transition: { duration: DURATION.slow, ease: EASE_LUXE } },
};
