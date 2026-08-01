"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { DURATION, EASE_LUXE, VIEWPORT } from "./variants";

type Direction = "up" | "down" | "left" | "right" | "none";

interface RevealProps {
  children: ReactNode;
  /** Which way the element travels in from. Default "up". */
  direction?: Direction;
  /** Seconds to wait before starting — use to hand-tune a sequence. */
  delay?: number;
  /** Travel distance in px. Keep small; large travel reads as cheap. */
  distance?: number;
  duration?: number;
  /** Fade in with a slight scale-up as well (good for imagery). */
  scale?: boolean;
  className?: string;
}

const OFFSETS: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 1 },
  down: { y: -1 },
  left: { x: 1 },
  right: { x: -1 },
  none: {},
};

/**
 * The workhorse scroll reveal. Wraps any content — including server-rendered
 * children — and fades/slides it in once when it scrolls into view.
 *
 * Server Components can render `<Reveal>{...}</Reveal>` freely: only this
 * wrapper is a Client Component, the children stay server-rendered.
 *
 * Respects `prefers-reduced-motion` by rendering content statically.
 */
export default function Reveal({
  children,
  direction = "up",
  delay = 0,
  distance = 28,
  duration = DURATION.base,
  scale = false,
  className,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const offset = OFFSETS[direction];

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        x: (offset.x ?? 0) * distance,
        y: (offset.y ?? 0) * distance,
        ...(scale ? { scale: 0.97 } : {}),
      }}
      whileInView={{ opacity: 1, x: 0, y: 0, ...(scale ? { scale: 1 } : {}) }}
      viewport={VIEWPORT}
      transition={{ duration, ease: EASE_LUXE, delay }}
    >
      {children}
    </motion.div>
  );
}
