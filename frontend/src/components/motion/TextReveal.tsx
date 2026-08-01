"use client";

import { motion, useReducedMotion } from "framer-motion";
import { VIEWPORT, staggerParent, wordMask } from "./variants";

interface TextRevealProps {
  /** Plain text only — split per word for the mask effect. */
  text: string;
  className?: string;
  /** Render as an h1/h2/etc. so heading semantics (and SEO) are preserved. */
  as?: "h1" | "h2" | "h3" | "p" | "span";
  delay?: number;
  stagger?: number;
  /** Start immediately on mount instead of waiting for scroll (hero headlines). */
  immediate?: boolean;
}

/**
 * Headline reveal where each word rises out of its own clipping mask — the
 * signature "editorial luxury" text entrance.
 *
 * Accessibility: the full string is exposed to assistive tech via aria-label on
 * the heading, and each visual word is aria-hidden, so screen readers read one
 * clean sentence rather than a stream of fragments. Under
 * `prefers-reduced-motion` it renders as ordinary static text.
 */
export default function TextReveal({
  text,
  className,
  as = "h2",
  delay = 0,
  stagger = 0.075,
  immediate = false,
}: TextRevealProps) {
  const reduceMotion = useReducedMotion();
  const Tag = as;

  if (reduceMotion) {
    return <Tag className={className}>{text}</Tag>;
  }

  const words = text.split(" ").filter(Boolean);
  const MotionTag = motion[Tag];

  const animationProps = immediate
    ? { animate: "visible" as const }
    : { whileInView: "visible" as const, viewport: VIEWPORT };

  return (
    <MotionTag
      className={className}
      aria-label={text}
      variants={staggerParent(stagger, delay)}
      initial="hidden"
      {...animationProps}
    >
      {words.map((word, i) => (
        // The mask: overflow-hidden wrapper, word translates up from below it.
        // `pb-[0.12em]` gives serif descenders (g, y, p) room so they aren't
        // clipped by the mask once the word has settled.
        <span
          key={`${word}-${i}`}
          aria-hidden="true"
          className={`inline-block overflow-hidden pb-[0.12em] align-bottom${
            i < words.length - 1 ? " mr-[0.25em]" : ""
          }`}
        >
          <motion.span variants={wordMask} className="inline-block will-change-transform">
            {word}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}
