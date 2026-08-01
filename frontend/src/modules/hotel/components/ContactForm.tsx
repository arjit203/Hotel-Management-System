"use client";

import { useState } from "react";
import { Send } from "lucide-react";

// No dedicated "contact form submission" backend endpoint exists in this
// phase's scope (Phase 3.7 is frontend-only, "use only existing APIs").
// Submitting opens a pre-filled WhatsApp chat to the hotel's number instead
// of silently doing nothing or requiring an unbuilt backend endpoint — fully
// functional today, and doubles as the brief's "WhatsApp CTA" requirement.
export default function ContactForm({ whatsappNumber }: { whatsappNumber: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = `Hi 7 Vachan, I'm ${form.name} (${form.email}${form.phone ? `, ${form.phone}` : ""}).\n\n${form.message}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-luxury border border-ink/5 p-6 sm:p-8 space-y-4">
      <label className="block text-sm text-ink/60">
        Full Name
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="block w-full mt-1 px-3 py-2.5 rounded-xl border border-ink/10 focus:outline-none focus:border-gold text-ink"
        />
      </label>
      <label className="block text-sm text-ink/60">
        Email
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="block w-full mt-1 px-3 py-2.5 rounded-xl border border-ink/10 focus:outline-none focus:border-gold text-ink"
        />
      </label>
      <label className="block text-sm text-ink/60">
        Phone (optional)
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="block w-full mt-1 px-3 py-2.5 rounded-xl border border-ink/10 focus:outline-none focus:border-gold text-ink"
        />
      </label>
      <label className="block text-sm text-ink/60">
        Message
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="block w-full mt-1 px-3 py-2.5 rounded-xl border border-ink/10 focus:outline-none focus:border-gold text-ink"
        />
      </label>
      <button type="submit" className="btn-primary text-sm w-full sm:w-auto">
        <Send size={16} /> Send Message
      </button>
    </form>
  );
}
