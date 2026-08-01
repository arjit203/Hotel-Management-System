"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export interface FaqItem {
  _id: string;
  question: string;
  answer: string;
}

// Search is implemented here (client-side text filter over question+answer).
// Note: FAQ "categories" from the Phase 3.7 brief aren't implemented — the
// backend Faq model (faq.model.ts) has no category field, and adding one
// would be a database change outside this phase's scope ("do not change
// database"). Search alone is fully supported by existing data.
export default function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return faqs;
    const q = query.toLowerCase();
    return faqs.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  }, [faqs, query]);

  if (!faqs || faqs.length === 0) return null;

  return (
    <div>
      <div className="relative max-w-lg mx-auto mb-10">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions..."
          className="w-full pl-11 pr-4 py-3 rounded-full border border-ink/10 focus:outline-none focus:border-gold text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-ink/50">No matching questions found.</p>
      ) : (
        <div className="max-w-3xl mx-auto divide-y divide-ink/10">
          {filtered.map((faq) => {
            const isOpen = openId === faq._id;
            return (
              <div key={faq._id} className="py-2">
                <button
                  onClick={() => setOpenId(isOpen ? null : faq._id)}
                  className="w-full flex items-center justify-between gap-4 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-ink">{faq.question}</span>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-gold transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && <p className="pb-5 text-ink/60 text-sm leading-relaxed">{faq.answer}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
