"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { DURATION, EASE_LUXE, VIEWPORT, fadeUp, staggerParent } from "./variants";

/**
 * Grid/list reveal: the parent releases each child in sequence rather than
 * every card appearing at once. Use for room grids, amenity tiles, offer cards.
 *
 * Usage:
 *   <Stagger className="grid ...">
 *     {items.map(i => <StaggerItem key={i.id}>...</StaggerItem>)}
 *   </Stagger>
 *
 * The `className` (grid definition) lands on the animating parent, so the
 * layout is unchanged from a plain <div>.
 */
export function Stagger({
  children,
  className,
  stagger = 0.09,
  delayChildren = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={staggerParent(stagger, delayChildren)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}

/**
 * Same idea, but for a single element that should animate as part of a parent
 * <Stagger> while carrying its own custom transform (e.g. a scale-in tile).
 */
export function StaggerScaleItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.97 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: DURATION.base, ease: EASE_LUXE },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
