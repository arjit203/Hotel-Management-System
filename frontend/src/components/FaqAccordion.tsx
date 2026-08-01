"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { EASE_LUXE } from "@/components/motion/variants";

export interface FaqItem {
  _id: string;
  question: string;
  answer: string;
}

/**
 * Search is implemented here (client-side text filter over question + answer).
 *
 * Note: FAQ "categories" from the Phase 3.7 brief still aren't implemented — the
 * backend Faq model (faq.model.ts) has no category field, and adding one would
 * be a database change outside scope. Search alone is fully supported by the
 * existing data.
 *
 * Presentation: hairline-divided rows rather than boxed cards, a rotating plus
 * (a chevron reads as UI, a plus/minus reads as editorial), and a height-animated
 * answer so opening a row eases rather than snaps.
 */
export default function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const reduceMotion = useReducedMotion();

  const filtered = useMemo(() => {
    if (!query.trim()) return faqs;
    const q = query.toLowerCase();
    return faqs.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    );
  }, [faqs, query]);

  if (!faqs || faqs.length === 0) return null;

  return (
    <div>
      {/* ── Search ── */}
      <div className="group relative mx-auto mb-12 max-w-lg">
        <Search
          size={16}
          className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-warm-400 transition-colors duration-400 group-focus-within:text-gold"
        />
        <label htmlFor="faq-search" className="sr-only">
          Search questions
        </label>
        <input
          id="faq-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          className="w-full border-0 border-b border-ink/12 bg-transparent py-3 pl-8 text-sm font-light text-ink placeholder:text-warm-400 focus:border-gold focus:outline-none focus:ring-0"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-gold transition-transform duration-500 ease-luxe group-focus-within:scale-x-100"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center font-light text-warm-500">No matching questions found.</p>
      ) : (
        <div className="mx-auto max-w-3xl border-t border-ink/[0.09]">
          {filtered.map((faq) => {
            const isOpen = openId === faq._id;
            return (
              <div key={faq._id} className="border-b border-ink/[0.09]">
                <h3>
                  <button
                    onClick={() => setOpenId(isOpen ? null : faq._id)}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`font-display text-lg font-medium transition-colors duration-400 sm:text-xl ${
                        isOpen ? "text-gold" : "text-ink group-hover:text-gold"
                      }`}
                    >
                      {faq.question}
                    </span>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-500 ease-luxe ${
                        isOpen
                          ? "rotate-[135deg] border-gold bg-gold text-ink"
                          : "border-ink/12 text-ink/50 group-hover:border-gold group-hover:text-gold"
                      }`}
                    >
                      <Plus size={14} strokeWidth={2} />
                    </span>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                      animate={reduceMotion ? undefined : { height: "auto", opacity: 1 }}
                      exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: EASE_LUXE }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-7 pr-12 text-sm font-light leading-relaxed text-warm-600">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
