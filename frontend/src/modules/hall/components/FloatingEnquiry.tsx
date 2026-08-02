"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarHeart, Phone, X } from "lucide-react";
import { EASE_LUXE } from "@/components/motion/variants";

/**
 * Persistent enquiry affordance for the Marriage Hall section.
 *
 * Appears only after the visitor has scrolled past the hero — showing it
 * immediately covers the first impression, which is the whole point of that
 * hero. Hidden on the availability page itself, where the form is already the
 * page, and dismissible so it never becomes a nuisance on a long gallery scroll.
 *
 * On mobile it becomes a full-width sticky bar with the phone number beside it,
 * because a family browsing on a phone at 10pm is far more likely to call.
 */
export default function FloatingEnquiry({
  contactPhone,
  enquiryHref = "/marriage-hall/availability",
}: {
  contactPhone: string;
  enquiryHref?: string;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function onScroll() {
      // ~80% of the first viewport — past the hero, into the content.
      setVisible(window.scrollY > window.innerHeight * 0.8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Re-arm on navigation: a dismissal shouldn't silence the CTA site-wide.
  useEffect(() => {
    setDismissed(false);
  }, [pathname]);

  const onEnquiryPage = pathname === enquiryHref;
  const show = visible && !dismissed && !onEnquiryPage;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.5, ease: EASE_LUXE }}
          className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:px-0 sm:pb-0"
        >
          <div className="glass flex items-center gap-2.5 rounded-full p-2 shadow-lift sm:gap-3">
            <a
              href={`tel:${contactPhone.replace(/\s/g, "")}`}
              aria-label={`Call the venue on ${contactPhone}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/10
                         text-ink transition-all duration-400 ease-luxe hover:border-gold hover:bg-gold"
            >
              <Phone size={15} strokeWidth={1.5} />
            </a>

            <Link
              href={enquiryHref}
              className="group flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 py-3
                         text-xs uppercase tracking-[0.14em] text-cream transition-colors duration-400
                         ease-luxe hover:bg-gold hover:text-ink sm:flex-none"
            >
              <CalendarHeart size={14} strokeWidth={1.5} />
              Check your date
            </Link>

            <button
              onClick={() => setDismissed(true)}
              aria-label="Hide this"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-warm-400
                         transition-colors hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
