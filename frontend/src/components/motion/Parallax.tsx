"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Scroll parallax. The child drifts vertically as the container passes through
 * the viewport, which gives depth to hero/feature imagery.
 *
 * `strength` is a percentage of the element's own height, so it scales with the
 * element instead of needing per-breakpoint pixel tuning. Keep it low (6–14%) —
 * heavy parallax reads as a template, not a luxury brand.
 *
 * The motion value is spring-smoothed so it never judders on trackpads or
 * momentum scrolling.
 */
export default function Parallax({
  children,
  strength = 10,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.4 });
  const y = useTransform(smooth, [0, 1], [`-${strength}%`, `${strength}%`]);

  if (reduceMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      {/* Scale up slightly so the drift never exposes an edge of the container. */}
      <motion.div style={{ y }} className="h-full w-full scale-[1.12] will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}
