"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

// No dedicated "contact form submission" backend endpoint exists (still true —
// the Hotel module's API surface has no contact route). Submitting opens a
// pre-filled WhatsApp chat to the hotel's number instead of silently doing
// nothing or requiring an unbuilt endpoint — fully functional today, and doubles
// as the brief's WhatsApp CTA. The button says so explicitly so the guest is
// never surprised by which app opens.
export default function ContactForm({ whatsappNumber }: { whatsappNumber: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = `Hi 7 Vachan, I'm ${form.name} (${form.email}${form.phone ? `, ${form.phone}` : ""}).\n\n${form.message}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, "_blank");
  }

  // Shared `.field-line` component class (globals.css) — was a local copy.
  const fieldClass = "field-line";

  return (
    <form onSubmit={handleSubmit} className="card-luxe space-y-7 p-7 sm:p-9">
      <label className="block">
        <span className="field-label">Full Name</span>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoComplete="name"
          className={fieldClass}
        />
      </label>

      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Email</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="field-label">Phone (optional)</span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            autoComplete="tel"
            className={fieldClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="field-label">Message</span>
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="How can we help?"
          className={`${fieldClass} resize-none`}
        />
      </label>

      <div>
        <button type="submit" className="btn-primary group w-full sm:w-auto">
          <MessageCircle size={15} /> Send Via WhatsApp
        </button>
        <p className="mt-3 text-xs font-light text-warm-500">
          Opens WhatsApp with your message ready to send.
        </p>
      </div>
    </form>
  );
}
