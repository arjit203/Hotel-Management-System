"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/**
 * Counts a number up when it scrolls into view — used for room rates, so a price
 * reads as a considered figure rather than static text.
 *
 * Renders the final value immediately on the server/first paint and only then
 * animates, so the real price is always in the DOM for SEO and for anyone with
 * JS disabled or reduced-motion enabled (no flash of "0").
 */
export default function AnimatedNumber({
  value,
  className,
  duration = 1.1,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!inView || reduceMotion) return;

    // Start from a fraction of the target rather than 0 — a short, tight count
    // reads as premium; a long climb from zero reads as a dashboard widget.
    const from = Math.round(value * 0.82);
    const controls = animate(from, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });

    return () => controls.stop();
  }, [inView, reduceMotion, value, duration]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString("en-IN")}
    </span>
  );
}
