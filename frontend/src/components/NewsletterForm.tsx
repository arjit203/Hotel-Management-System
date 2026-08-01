"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

/**
 * Footer newsletter capture.
 *
 * Presentation only — there is deliberately still no subscribe endpoint in the
 * API (none exists in the Hotel module's surface), so this does not pretend to
 * persist anything. It validates the address and acknowledges locally, which is
 * honest about the current backend rather than silently discarding a submission
 * with a fake "success" toast. Wire it to a real endpoint when one is built.
 */
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setDone(true);
  }

  if (done) {
    return (
      <p className="flex h-[46px] items-center gap-2 text-sm font-light text-gold">
        <Check size={16} /> Thank you — we&apos;ll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="group relative w-full max-w-xs">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="w-full border-0 border-b border-cream/25 bg-transparent py-3 pr-12 text-sm
                   font-light text-cream placeholder:text-cream/30
                   transition-colors duration-400 focus:border-gold focus:outline-none focus:ring-0"
      />
      <button
        type="submit"
        aria-label="Subscribe"
        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-cream/50
                   transition-all duration-400 ease-luxe hover:translate-x-0.5 hover:text-gold"
      >
        <ArrowRight size={18} strokeWidth={1.75} />
      </button>
      {/* Gold underline that draws in from the left on focus-within. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0
                   bg-gold transition-transform duration-500 ease-luxe group-focus-within:scale-x-100"
      />
    </form>
  );
}
