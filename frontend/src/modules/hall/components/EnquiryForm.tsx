"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarHeart,
  Check,
  CircleAlert,
  PartyPopper,
  Sparkles,
  UserRound,
} from "lucide-react";
import { EASE_LUXE } from "@/components/motion/variants";
import { api } from "@/lib/api";
import type { HallPackage, HallShowcaseEntry } from "@/lib/hall";
import AvailabilityCalendar from "./AvailabilityCalendar";

/**
 * The enquiry flow: date → event → preferences → contact.
 *
 * ── This is not a booking form, and the copy has to keep saying so ──
 * `RULES.md` §14 makes hall bookings approval-first. Nothing here reserves a
 * date and nothing takes payment. The submit button says "Send enquiry", the
 * success panel says the date is not held yet, and there is no price anywhere —
 * because the venue has not published pricing.
 *
 * Four short steps rather than one long form: a wedding enquiry asks for eleven
 * things, and eleven stacked fields is where people leave. Each step validates
 * before it will advance, so nobody reaches step four and then discovers the
 * date was wrong.
 */

interface Props {
  hallId: string;
  hallSlug: string;
  minimumNoticeDays: number;
  eventTypes: string[];
  packages: HallPackage[];
  decorationThemes: HallShowcaseEntry[];
  cateringCategories: string[];
  maxGuests: number;
  contactPhone: string;
  /** Pre-select a date chosen elsewhere on the page. */
  initialDate?: string;
  className?: string;
}

const STEPS = [
  { key: "date", label: "Your date", icon: CalendarHeart },
  { key: "event", label: "The occasion", icon: PartyPopper },
  { key: "style", label: "Your preferences", icon: Sparkles },
  { key: "contact", label: "Your details", icon: UserRound },
] as const;

const BUDGET_RANGES = [
  "Still deciding",
  "Under ₹5 lakh",
  "₹5–10 lakh",
  "₹10–20 lakh",
  "₹20 lakh and above",
];

export default function EnquiryForm({
  hallId,
  hallSlug,
  minimumNoticeDays,
  eventTypes,
  packages,
  decorationThemes,
  cateringCategories,
  maxGuests,
  contactPhone,
  initialDate,
  className,
}: Props) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const [form, setForm] = useState({
    eventDate: initialDate || "",
    alternateDate: "",
    eventType: eventTypes[0] || "Wedding",
    guestCount: "",
    packageId: "",
    decorationThemeId: "",
    cateringPreference: "",
    budgetRange: "",
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    specialRequirements: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  /** Per-step gate. Returns an error message, or null when the step is valid. */
  function validateStep(index: number): string | null {
    if (index === 0) {
      if (!form.eventDate) return "Please choose your event date from the calendar.";
      return null;
    }
    if (index === 1) {
      if (!form.eventType) return "Please tell us what you're celebrating.";
      const guests = Number(form.guestCount);
      if (!form.guestCount || Number.isNaN(guests) || guests < 1) {
        return "Please give us a rough guest count — an estimate is fine.";
      }
      if (guests > maxGuests) {
        return `We can host up to ${maxGuests.toLocaleString("en-IN")} guests. For a larger event, please call us on ${contactPhone}.`;
      }
      return null;
    }
    if (index === 3) {
      if (form.guestName.trim().length < 2) return "Please tell us your name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.guestEmail)) {
        return "Please enter a valid email address so we can send your enquiry reference.";
      }
      if (form.guestPhone.replace(/\D/g, "").length < 7) {
        return "Please enter a phone number we can reach you on.";
      }
      return null;
    }
    // Step 2 (preferences) is entirely optional.
    return null;
  }

  function next() {
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const problem = validateStep(3);
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await api.post<{ enquiryReference: string }>("/hall-enquiries", {
      hallId,
      eventDate: form.eventDate,
      alternateDate: form.alternateDate || undefined,
      eventType: form.eventType,
      guestCount: Number(form.guestCount),
      packageId: form.packageId || undefined,
      decorationThemeId: form.decorationThemeId || undefined,
      cateringPreference: form.cateringPreference || undefined,
      budgetRange: form.budgetRange || undefined,
      guestName: form.guestName.trim(),
      guestEmail: form.guestEmail.trim(),
      guestPhone: form.guestPhone.trim(),
      specialRequirements: form.specialRequirements.trim() || undefined,
    });

    setSubmitting(false);

    if (!res.success) {
      setError(
        res.errors?.length
          ? res.errors.map((x) => x.message).join(" ")
          : res.message || "Something went wrong. Please try again, or call us."
      );
      return;
    }

    setReference(res.data?.enquiryReference ?? "your enquiry");
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (reference) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE_LUXE }}
        className={`card-luxe px-7 py-12 text-center sm:px-12 ${className || ""}`}
      >
        <span className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
          <Check size={26} strokeWidth={1.5} className="text-gold" />
        </span>

        <h3 className="section-title !text-display-sm">Thank you</h3>
        <p className="lead mx-auto mt-4 max-w-md">
          We have received your enquiry and one of our event managers will call you shortly.
        </p>

        <p className="mt-8 text-xs uppercase tracking-eyebrow text-warm-400">
          Your reference
        </p>
        <p className="price mt-2 text-2xl tracking-luxe">{reference}</p>

        {/* The most important sentence on this screen. */}
        <div className="mx-auto mt-9 max-w-md rounded-luxe border border-gold/25 bg-gold/[0.06] px-6 py-5">
          <p className="text-sm font-light leading-relaxed text-warm-600">
            Please note: this is an enquiry, not a confirmed booking. Your date is held only once
            we have spoken and confirmed the arrangements with you. Nothing has been charged.
          </p>
        </div>

        <p className="mt-7 text-sm font-light text-warm-500">
          Would rather talk now? Call us on{" "}
          <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="text-gold-dark hover:text-gold">
            {contactPhone}
          </a>
        </p>
      </motion.div>
    );
  }

  const CurrentIcon = STEPS[step].icon;

  return (
    <form onSubmit={handleSubmit} className={`card-luxe overflow-hidden ${className || ""}`}>
      {/* ── Step rail ── */}
      <div className="border-b border-ink/[0.07] bg-cream-dark/40 px-6 py-5 sm:px-9">
        <ol className="flex items-center gap-2 sm:gap-3">
          {STEPS.map((s, i) => {
            const isDone = i < step;
            const isCurrent = i === step;
            return (
              <li key={s.key} className="flex flex-1 items-center gap-2 sm:gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs
                              transition-all duration-400 ease-luxe ${
                                isDone
                                  ? "border-gold bg-gold text-ink"
                                  : isCurrent
                                    ? "border-gold text-gold-dark"
                                    : "border-ink/15 text-warm-400"
                              }`}
                >
                  {isDone ? <Check size={13} strokeWidth={2.5} /> : i + 1}
                </span>
                <span
                  className={`hidden text-xs uppercase tracking-luxe transition-colors sm:block ${
                    isCurrent ? "text-ink" : "text-warm-400"
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`h-px flex-1 transition-colors duration-400 ${
                      isDone ? "bg-gold/50" : "bg-ink/10"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="px-6 py-8 sm:px-9 sm:py-10">
        <div className="mb-7 flex items-center gap-3">
          <CurrentIcon size={18} strokeWidth={1.5} className="text-gold" />
          <h3 className="font-display text-2xl text-ink">{STEPS[step].label}</h3>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.35, ease: EASE_LUXE }}
          >
            {/* ── Step 1: date ── */}
            {step === 0 && (
              <div>
                <p className="body-muted mb-7">
                  Pick the date you have in mind. Dates already taken are shown greyed out — if
                  yours is gone, tell us an alternate and we will still call you.
                </p>

                <AvailabilityCalendar
                  hallSlug={hallSlug}
                  minimumNoticeDays={minimumNoticeDays}
                  selectedDate={form.eventDate || null}
                  onSelectDate={(date) => set("eventDate", date)}
                />

                {form.eventDate && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8"
                  >
                    <p className="rounded-luxe border border-gold/25 bg-gold/[0.06] px-5 py-4 text-sm font-light text-warm-600">
                      Chosen date:{" "}
                      <strong className="font-medium text-ink">
                        {new Date(`${form.eventDate}T00:00:00`).toLocaleDateString("en-IN", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </strong>
                    </p>

                    <label className="field mt-5 block">
                      <span className="field-label">Alternate date (optional)</span>
                      <input
                        type="date"
                        value={form.alternateDate}
                        onChange={(e) => set("alternateDate", e.target.value)}
                        className="field-line"
                      />
                      <span className="mt-2 block text-xs font-light text-warm-400">
                        Helpful if your first choice turns out to be taken.
                      </span>
                    </label>
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Step 2: occasion ── */}
            {step === 1 && (
              <div className="space-y-7">
                <div>
                  <span className="field-label mb-3 block">What are you celebrating?</span>
                  <div className="flex flex-wrap gap-2">
                    {eventTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => set("eventType", type)}
                        aria-pressed={form.eventType === type}
                        className={`rounded-full border px-5 py-2.5 text-xs uppercase tracking-luxe
                                    transition-all duration-400 ease-luxe ${
                                      form.eventType === type
                                        ? "border-gold bg-gold text-ink shadow-gold"
                                        : "border-ink/12 text-warm-500 hover:border-gold/50 hover:text-ink"
                                    }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="field block">
                  <span className="field-label">Roughly how many guests?</span>
                  <input
                    type="number"
                    min={1}
                    max={maxGuests}
                    inputMode="numeric"
                    value={form.guestCount}
                    onChange={(e) => set("guestCount", e.target.value)}
                    placeholder="e.g. 450"
                    className="field-line"
                  />
                  <span className="mt-2 block text-xs font-light text-warm-400">
                    An estimate is fine — we can adjust later. We host up to{" "}
                    {maxGuests.toLocaleString("en-IN")}.
                  </span>
                </label>
              </div>
            )}

            {/* ── Step 3: preferences (all optional) ── */}
            {step === 2 && (
              <div className="space-y-7">
                <p className="body-muted">
                  All optional — it simply helps us come to the call prepared.
                </p>

                {packages.length > 0 && (
                  <div>
                    <span className="field-label mb-3 block">Package you&apos;re drawn to</span>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {packages.map((pkg) => (
                        <button
                          key={pkg._id}
                          type="button"
                          onClick={() =>
                            set("packageId", form.packageId === pkg._id ? "" : pkg._id)
                          }
                          aria-pressed={form.packageId === pkg._id}
                          className={`rounded-luxe border px-5 py-4 text-left transition-all duration-400 ease-luxe ${
                            form.packageId === pkg._id
                              ? "border-gold bg-gold/[0.07] shadow-luxury"
                              : "border-ink/10 hover:border-gold/40"
                          }`}
                        >
                          <span className="block font-display text-lg text-ink">{pkg.name}</span>
                          {pkg.tagline && (
                            <span className="mt-0.5 block text-xs font-light text-warm-500">
                              {pkg.tagline}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {decorationThemes.length > 0 && (
                  <label className="field block">
                    <span className="field-label">Decoration theme</span>
                    <select
                      value={form.decorationThemeId}
                      onChange={(e) => set("decorationThemeId", e.target.value)}
                      className="field-line"
                    >
                      <option value="">No preference yet</option>
                      {decorationThemes.map((theme) => (
                        <option key={theme._id} value={theme._id}>
                          {theme.title} — {theme.category}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {cateringCategories.length > 0 && (
                  <label className="field block">
                    <span className="field-label">Catering preference</span>
                    <select
                      value={form.cateringPreference}
                      onChange={(e) => set("cateringPreference", e.target.value)}
                      className="field-line"
                    >
                      <option value="">No preference yet</option>
                      {cateringCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                      <option value="Mixed">A mix of everything</option>
                    </select>
                  </label>
                )}

                <label className="field block">
                  <span className="field-label">Budget you have in mind</span>
                  <select
                    value={form.budgetRange}
                    onChange={(e) => set("budgetRange", e.target.value)}
                    className="field-line"
                  >
                    <option value="">Prefer to discuss</option>
                    {BUDGET_RANGES.map((range) => (
                      <option key={range} value={range}>
                        {range}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-xs font-light text-warm-400">
                    Only so we can suggest the right package. Nothing is charged here.
                  </span>
                </label>
              </div>
            )}

            {/* ── Step 4: contact ── */}
            {step === 3 && (
              <div className="space-y-6">
                <label className="field block">
                  <span className="field-label">Your name</span>
                  <input
                    value={form.guestName}
                    onChange={(e) => set("guestName", e.target.value)}
                    autoComplete="name"
                    className="field-line"
                  />
                </label>

                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="field block">
                    <span className="field-label">Email</span>
                    <input
                      type="email"
                      value={form.guestEmail}
                      onChange={(e) => set("guestEmail", e.target.value)}
                      autoComplete="email"
                      className="field-line"
                    />
                  </label>

                  <label className="field block">
                    <span className="field-label">Phone</span>
                    <input
                      type="tel"
                      value={form.guestPhone}
                      onChange={(e) => set("guestPhone", e.target.value)}
                      autoComplete="tel"
                      className="field-line"
                    />
                  </label>
                </div>

                <label className="field block">
                  <span className="field-label">Anything we should know? (optional)</span>
                  <textarea
                    rows={4}
                    value={form.specialRequirements}
                    onChange={(e) => set("specialRequirements", e.target.value)}
                    placeholder="Rituals to accommodate, accessibility needs, guests travelling from far, a second function the same weekend…"
                    className="field-line resize-y"
                  />
                </label>

                <div className="rounded-luxe border border-ink/10 bg-cream-dark/50 px-5 py-4">
                  <p className="text-sm font-light leading-relaxed text-warm-600">
                    Sending this does not book or hold the date, and takes no payment. We will call
                    you to talk it through, and only then confirm.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="mt-6 flex items-start gap-2 rounded-luxe border border-red-200 bg-red-50 px-4 py-3 text-sm font-light text-red-800"
          >
            <CircleAlert size={15} className="mt-0.5 shrink-0" />
            {error}
          </motion.p>
        )}

        {/* ── Navigation ── */}
        <div className="mt-9 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-luxe text-warm-500
                       transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-0"
          >
            <ArrowLeft size={14} />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="btn-primary group">
              Continue
              <ArrowRight size={14} className="btn-arrow" />
            </button>
          ) : (
            <button type="submit" disabled={submitting} className="btn-gold group">
              {submitting ? "Sending…" : "Send enquiry"}
              {!submitting && <ArrowRight size={14} className="btn-arrow" />}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
