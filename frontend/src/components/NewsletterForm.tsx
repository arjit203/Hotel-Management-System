"use client";

import { Send } from "lucide-react";

export default function NewsletterForm() {
  return (
    <form className="flex w-full sm:w-auto gap-2" onSubmit={(e) => e.preventDefault()}>
      <input
        type="email"
        placeholder="Your email"
        className="bg-cream/5 border border-cream/15 rounded-full px-4 py-2 text-sm text-cream placeholder:text-cream/40 focus:outline-none focus:border-gold w-full sm:w-64"
      />
      <button
        type="submit"
        className="bg-gold text-ink rounded-full px-4 py-2 flex items-center gap-1 text-sm font-medium"
      >
        <Send size={14} /> Join
      </button>
    </form>
  );
}
