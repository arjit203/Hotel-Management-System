"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { EASE_LUXE } from "@/components/motion/variants";

/**
 * Confirmation success mark.
 *
 * A gold ring draws itself, then the tick scales in — restrained rather than a
 * bouncing green checkmark or confetti, which would undercut the tone of the
 * rest of the site at exactly the moment the guest has just paid.
 *
 * Under reduced-motion it renders as a static mark, and it's hidden from print.
 */
export default function SuccessMark() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-gold bg-gold/10">
        <Check size={30} strokeWidth={1.5} className="text-gold" />
      </span>
    );
  }

  return (
    <div className="no-print relative mx-auto h-20 w-20">
      {/* The ring: an SVG circle whose stroke draws around. */}
      <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full -rotate-90">
        <motion.circle
          cx="40"
          cy="40"
          r="38"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-gold"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: EASE_LUXE }}
        />
      </svg>

      {/* Soft fill blooms in behind the tick. */}
      <motion.span
        aria-hidden="true"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE_LUXE, delay: 0.35 }}
        className="absolute inset-[3px] rounded-full bg-gold/10"
      />

      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.55, ease: EASE_LUXE, delay: 0.5 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Check size={30} strokeWidth={1.5} className="text-gold" />
      </motion.span>
    </div>
  );
}
