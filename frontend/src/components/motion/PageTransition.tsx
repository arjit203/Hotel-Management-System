"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { EASE_LUXE } from "./variants";

/**
 * Route transition: page content fades and rises on navigation instead of
 * snapping in, so moving between Rooms → Room detail → Booking feels continuous.
 *
 * Keyed on pathname, so each navigation replays the entrance.
 *
 * Known limitation (App Router, not a bug to chase): an <AnimatePresence> exit
 * animation cannot actually delay unmounting here — the router swaps the
 * server-rendered children immediately. So this intentionally implements the
 * ENTRANCE only, which is where nearly all the perceived polish lives.
 *
 * Only `opacity`/`y` are animated. Framer writes `transform: none` once y
 * settles at 0, so this wrapper does not become a containing block for the
 * `position: fixed` lightboxes/drawers rendered inside pages.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE_LUXE }}
    >
      {children}
    </motion.div>
  );
}
