"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Loader2, Minus, Plus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { getUserToken } from "@/lib/userAuth";
import Alert from "@/components/ui/Alert";
import { EASE_LUXE } from "@/components/motion/variants";
import { todayISO } from "@/lib/format";
import { formatTimeSlot, type DiningAreaData } from "@/lib/restaurant";

/**
 * Table reservation.
 *
 * Structurally parallel to the Hotel module's BookingForm — same three-step rail,
 * same per-step transitions, same shared `.field-line` / `.btn-*` / `Alert` —
 * but it is NOT a copy: the domain differs completely. There is no room cart, no
 * nights calculation, no total, and **no payment step**, because a table
 * reservation takes no money (RULES.md §2). Step 3 is a plain review, not a
 * checkout.
 */

type Step = "when" | "details" | "review";

interface AvailabilityArea {
  diningAreaId: string;
  diningAreaName: string;
  areaType: string;
  slots: { timeSlot: string; availableTables: number; canSeatParty: boolean }[];
}

export default function ReservationForm({
  restaurantId,
  restaurantSlug,
  diningAreas,
  maxPartySize,
  preselectedAreaId,
}: {
  restaurantId: string;
  restaurantSlug: string;
  diningAreas: DiningAreaData[];
  maxPartySize: number;
  preselectedAreaId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("when");

  const [date, setDate] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [areaId, setAreaId] = useState(preselectedAreaId || "");
  const [timeSlot, setTimeSlot] = useState("");

  const [availability, setAvailability] = useState<AvailabilityArea[] | null>(null);
  const [checking, setChecking] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [occasion, setOccasion] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const steps: { key: Step; label: string }[] = [
    { key: "when", label: "Date & Table" },
    { key: "details", label: "Your Details" },
    { key: "review", label: "Confirm" },
  ];
  const currentStep = steps.findIndex((s) => s.key === step);
  const selectedArea = diningAreas.find((a) => a._id === areaId);

  async function loadAvailability() {
    setError(null);
    if (!date) {
      setError("Please choose a date.");
      return;
    }
    setChecking(true);
    setAvailability(null);
    setTimeSlot("");

    const res = await api.get<{ areas: AvailabilityArea[] }>(
      `/restaurants/${restaurantSlug}/availability?date=${date}&partySize=${partySize}`
    );
    setChecking(false);

    if (!res.success || !res.data) {
      setError(res.message || "Could not load availability. Please try again.");
      return;
    }
    setAvailability(res.data.areas);
  }

  function goToDetails() {
    setError(null);
    if (!areaId || !timeSlot) {
      setError("Please choose a seating area and a time.");
      return;
    }
    setStep("details");
  }

  function goToReview() {
    setError(null);
    if (!guestName || !guestEmail || !guestPhone) {
      setError("Please fill in your name, email and phone.");
      return;
    }
    setStep("review");
  }

  async function submit() {
    setSubmitting(true);
    setError(null);

    const token = getUserToken();
    const res = await api.post<{ reservationReference: string }>(
      "/table-reservations",
      {
        restaurantId,
        diningAreaId: areaId,
        reservationDate: date,
        timeSlot,
        partySize,
        guestName,
        guestEmail,
        guestPhone,
        occasion: occasion || undefined,
        specialRequest: specialRequest || undefined,
      },
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );

    if (!res.success || !res.data) {
      setSubmitting(false);
      setError(res.message || "We couldn't complete the reservation. Please try again.");
      return;
    }

    router.push(`/restaurant/reserve/confirmation/${res.data.reservationReference}`);
  }

  return (
    <div className="card-luxe w-full max-w-xl p-7 sm:p-9">
      {/* ── Step rail — same treatment as BookingForm ── */}
      <div className="mb-9">
        <div className="relative">
          <div className="absolute left-0 right-0 top-[15px] h-px bg-ink/10" />
          <motion.div
            className="absolute left-0 top-[15px] h-px bg-gold"
            initial={false}
            animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.6, ease: EASE_LUXE }}
          />
          <ol className="relative flex justify-between">
            {steps.map((s, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <li key={s.key} className="flex flex-col items-center gap-2.5">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-all duration-500 ease-luxe ${
                      done
                        ? "border-gold bg-gold text-ink"
                        : active
                          ? "border-gold bg-cream text-gold-dark ring-4 ring-gold/15"
                          : "border-ink/15 bg-cream text-warm-400"
                    }`}
                  >
                    {done ? <Check size={14} strokeWidth={2.5} /> : i + 1}
                  </span>
                  <span
                    className={`hidden text-xs uppercase tracking-luxe transition-colors duration-400 sm:block ${
                      active ? "text-ink" : "text-warm-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {error && <Alert className="mb-6">{error}</Alert>}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.35, ease: EASE_LUXE }}
        >
          {/* ─────────── STEP 1 ─────────── */}
          {step === "when" && (
            <>
              <label className="field-label block">
                Date
                <input
                  type="date"
                  min={todayISO()}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setAvailability(null);
                    setTimeSlot("");
                  }}
                  className="field-line mt-1.5"
                />
              </label>

              <div className="mt-7">
                <span className="field-label flex items-center gap-2">
                  <Users size={12} className="text-gold" /> Guests
                </span>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPartySize((p) => Math.max(1, p - 1));
                      setAvailability(null);
                    }}
                    disabled={partySize <= 1}
                    aria-label="Fewer guests"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/12 text-warm-600 transition-colors hover:border-gold hover:text-gold disabled:opacity-30"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="min-w-[3rem] text-center text-lg tabular-nums text-ink">
                    {partySize}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPartySize((p) => Math.min(maxPartySize, p + 1));
                      setAvailability(null);
                    }}
                    disabled={partySize >= maxPartySize}
                    aria-label="More guests"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/12 text-warm-600 transition-colors hover:border-gold hover:text-gold disabled:opacity-30"
                  >
                    <Plus size={13} />
                  </button>
                  {partySize >= maxPartySize && (
                    <span className="text-xs font-light text-warm-500">
                      For a larger party, please call us.
                    </span>
                  )}
                </div>
              </div>

              <button onClick={loadAvailability} disabled={checking} className="btn-outline group mt-7 w-full">
                {checking ? <Loader2 size={15} className="animate-spin" /> : null}
                {checking ? "Checking" : "Check Availability"}
              </button>

              {/* ── Availability grid ── */}
              {availability && (
                <div className="mt-8 space-y-6">
                  {availability.every((a) => a.slots.every((s) => !s.canSeatParty)) && (
                    <Alert tone="info">
                      Nothing open for {partySize} {partySize === 1 ? "guest" : "guests"} that day.
                      Try another date, or call us and we&apos;ll do our best.
                    </Alert>
                  )}

                  {availability.map((area) => {
                    const openSlots = area.slots.filter((s) => s.canSeatParty);
                    if (openSlots.length === 0) return null;
                    const meta = diningAreas.find((d) => d._id === area.diningAreaId);

                    return (
                      <div key={area.diningAreaId}>
                        <div className="mb-3 flex items-baseline justify-between gap-3">
                          <p className="text-sm text-ink">{area.diningAreaName}</p>
                          {meta?.minimumSpend ? (
                            <p className="text-xs font-light text-warm-500">
                              Min. spend ₹{meta.minimumSpend.toLocaleString("en-IN")}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {openSlots.map((s) => {
                            const selected = areaId === area.diningAreaId && timeSlot === s.timeSlot;
                            return (
                              <button
                                key={s.timeSlot}
                                onClick={() => {
                                  setAreaId(area.diningAreaId);
                                  setTimeSlot(s.timeSlot);
                                }}
                                aria-pressed={selected}
                                className={`rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-luxe transition-all duration-400 ease-luxe ${
                                  selected
                                    ? "bg-ink text-cream"
                                    : "border border-ink/12 text-warm-600 hover:border-gold hover:text-gold"
                                }`}
                              >
                                {formatTimeSlot(s.timeSlot)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {areaId && timeSlot && (
                <button onClick={goToDetails} className="btn-primary group mt-8 w-full">
                  Continue <ArrowRight size={14} className="btn-arrow" />
                </button>
              )}
            </>
          )}

          {/* ─────────── STEP 2 ─────────── */}
          {step === "details" && (
            <>
              <p className="mb-7 flex items-center gap-2.5 rounded-xl border border-gold/30 bg-gold/[0.07] px-4 py-3 text-sm font-light text-gold-dark">
                <Check size={16} className="shrink-0" />
                {selectedArea?.name} · {formatTimeSlot(timeSlot)} · {partySize}{" "}
                {partySize === 1 ? "guest" : "guests"}
              </p>

              <div className="space-y-6">
                <label className="field-label block">
                  Full Name
                  <input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    autoComplete="name"
                    className="field-line mt-1.5"
                  />
                </label>
                <label className="field-label block">
                  Email
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    autoComplete="email"
                    className="field-line mt-1.5"
                  />
                </label>
                <label className="field-label block">
                  Phone
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    autoComplete="tel"
                    className="field-line mt-1.5"
                  />
                </label>
                <label className="field-label block">
                  Occasion (optional)
                  <input
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    placeholder="Birthday, anniversary…"
                    className="field-line mt-1.5 placeholder:text-warm-400"
                  />
                </label>
                <label className="field-label block">
                  Special Request (optional)
                  <textarea
                    rows={3}
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    placeholder="Quiet corner, high chair, dietary notes…"
                    className="field-line mt-1.5 resize-none placeholder:text-warm-400"
                  />
                </label>
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={() => setStep("when")} className="btn-outline group flex-1">
                  <ArrowLeft size={14} /> Back
                </button>
                <button onClick={goToReview} className="btn-primary group flex-1">
                  Review <ArrowRight size={14} className="btn-arrow" />
                </button>
              </div>
            </>
          )}

          {/* ─────────── STEP 3 ─────────── */}
          {step === "review" && (
            <>
              <h3 className="card-title mb-6">Confirm your table</h3>

              <div className="rounded-luxe border border-ink/[0.08] bg-cream/70 p-6">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
                  {[
                    { label: "Date", value: new Date(date).toDateString() },
                    { label: "Time", value: formatTimeSlot(timeSlot) },
                    { label: "Guests", value: String(partySize) },
                    { label: "Seating", value: selectedArea?.name || "—" },
                  ].map((row) => (
                    <div key={row.label}>
                      <dt className="text-xs uppercase tracking-luxe text-warm-500">{row.label}</dt>
                      <dd className="mt-1.5 text-sm text-ink">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 space-y-1.5 border-t border-ink/[0.08] pt-5 text-sm font-light text-warm-600">
                  <p>{guestName}</p>
                  <p className="break-all">
                    {guestEmail} · {guestPhone}
                  </p>
                  {occasion && <p className="italic">Occasion: {occasion}</p>}
                  {specialRequest && <p className="italic">&ldquo;{specialRequest}&rdquo;</p>}
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setStep("details")}
                  disabled={submitting}
                  className="btn-outline group flex-1 disabled:opacity-50"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="btn-primary group flex-1 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Reserving
                    </>
                  ) : (
                    <>
                      Confirm Table <ArrowRight size={14} className="btn-arrow" />
                    </>
                  )}
                </button>
              </div>

              <p className="mt-5 text-center text-xs font-light text-warm-500">
                No payment required · Free to cancel
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
