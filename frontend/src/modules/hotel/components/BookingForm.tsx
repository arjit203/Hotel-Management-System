"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, ArrowLeft, Check, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { RoomSummary } from "./RoomCard";
import { getUserToken } from "@/lib/userAuth";
import { EASE_LUXE } from "@/components/motion/variants";

interface BookingFormProps {
  hotelId: string;
  room: RoomSummary; // the room the guest started booking from — pre-added to the cart
  allRooms: RoomSummary[]; // every room type at this hotel — lets the guest add more categories
}

type Step = "dates" | "guest-details" | "summary";

// Loads the Razorpay Checkout script on-demand (not via next/script), so it's
// guaranteed ready exactly when needed — regardless of page-load timing,
// network speed, or a preloaded/lazy script tag being delayed.
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.getElementById("razorpay-checkout-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// One line in the multi-room "cart" (Feature 4, Phase 3.6).
interface CartLine {
  roomId: string;
  roomName: string;
  basePrice: number;
  maxOccupancy: number;
  numRooms: number;
}

export default function BookingForm({ hotelId, room, allRooms }: BookingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("dates");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [numGuests, setNumGuests] = useState(1);
  // Cart starts with the room the guest clicked "Book" from, at quantity 1.
  const [cart, setCart] = useState<CartLine[]>([
    { roomId: room._id, roomName: room.name, basePrice: room.basePrice, maxOccupancy: room.maxOccupancy, numRooms: 1 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nights =
    checkInDate && checkOutDate
      ? Math.max(
          0,
          Math.round(
            (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : 0;
  const totalAmount = cart.reduce((sum, line) => sum + line.basePrice * nights * line.numRooms, 0);
  const totalCapacity = cart.reduce((sum, line) => sum + line.maxOccupancy * line.numRooms, 0);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");

  function updateLineQty(roomId: string, numRooms: number) {
    setCart((prev) => prev.map((l) => (l.roomId === roomId ? { ...l, numRooms: Math.max(1, numRooms) } : l)));
  }

  function removeLine(roomId: string) {
    setCart((prev) => prev.filter((l) => l.roomId !== roomId));
  }

  async function handleCheckAvailability() {
    setError(null);
    if (!checkInDate || !checkOutDate) {
      setError("Please select both check-in and check-out dates.");
      return;
    }
    if (cart.length === 0) {
      setError("Please select at least one room.");
      return;
    }
    // Check each cart line's availability in parallel — reuses the existing
    // single-room availability endpoint, no new endpoint needed for this.
    const results = await Promise.all(
      cart.map((line) =>
        api.get<{ availableCount: number }>(
          `/hotels/rooms/${line.roomId}/availability?checkIn=${checkInDate}&checkOut=${checkOutDate}`
        )
      )
    );
    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const line = cart[i];
      if (!res.success) {
        setError(res.message || "Could not check availability.");
        return;
      }
      if (res.data!.availableCount < line.numRooms) {
        setError(`Only ${res.data!.availableCount} room(s) of "${line.roomName}" available for these dates.`);
        return;
      }
    }
    setStep("guest-details");
  }

  function handleGuestDetailsNext() {
    setError(null);
    if (!guestName || !guestEmail || !guestPhone) {
      setError("Please fill in all guest details.");
      return;
    }
    if (numGuests > totalCapacity) {
      setError(`The selected rooms allow a maximum of ${totalCapacity} guests total.`);
      return;
    }
    setStep("summary");
  }

  async function handleConfirmBooking() {
    setIsSubmitting(true);
    setError(null);

    const token = getUserToken();
    const res = await api.post<{
      booking: { bookingReference: string };
      razorpayOrder: { id: string; amount: number; currency: string };
    }>(
      "/hotel-bookings",
      {
        hotelId,
        rooms: cart.map((l) => ({ roomId: l.roomId, numRooms: l.numRooms })),
        checkInDate,
        checkOutDate,
        numGuests,
        guestName,
        guestEmail,
        guestPhone,
        specialRequest: specialRequest || undefined,
      },
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );

    if (!res.success || !res.data) {
      setIsSubmitting(false);
      setError(res.message || "Booking failed. Please try again.");
      return;
    }

    const { booking, razorpayOrder } = res.data;

    // Feature 1: launch Razorpay Checkout for the advance amount. The
    // booking already exists as 'pending' at this point — Checkout only
    // confirms it once verify-payment succeeds (see onSuccess below).
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !(window as any).Razorpay) {
      setIsSubmitting(false);
      setError("Payment could not be loaded. Please check your internet connection and try again.");
      return;
    }
    const Razorpay = (window as any).Razorpay;

    const rzp = new Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      config_id: process.env.NEXT_PUBLIC_RAZORPAY_CONFIG_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      order_id: razorpayOrder.id,
      name: "7 Vachan",
      description: `Advance payment — ${booking.bookingReference}`,
      prefill: { name: guestName, email: guestEmail, contact: guestPhone },
      handler: async function (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) {
        const verifyRes = await api.post("/hotel-bookings/verify-payment", response);
        setIsSubmitting(false);
        if (!verifyRes.success) {
          setError(
            verifyRes.message ||
              "Payment succeeded but verification failed. Please contact support with your booking reference: " +
                booking.bookingReference
          );
          return;
        }
        router.push(`/hotel/booking/confirmation/${booking.bookingReference}`);
      },
      modal: {
        // Payment widget closed without completing — booking stays 'pending'
        // (no retry-payment flow exists yet; noted as a follow-up suggestion).
        ondismiss: function () {
          setIsSubmitting(false);
          setError(
            `Payment was not completed. Your booking (${booking.bookingReference}) is saved but not yet confirmed — you can try paying again.`
          );
        },
      },
    });
    rzp.open();
  }

  const availableToAdd = allRooms.filter((r) => !cart.some((l) => l.roomId === r._id));
  const inputClass =
    "block w-full mt-1.5 border-0 border-b border-ink/12 bg-transparent py-2.5 text-base font-light text-ink transition-colors duration-300 focus:border-gold focus:outline-none focus:ring-0";
  const labelClass = "field-label block mb-0";
  const today = new Date().toISOString().split("T")[0];

  const steps: { key: Step; label: string }[] = [
    { key: "dates", label: "Dates & Rooms" },
    { key: "guest-details", label: "Guest Details" },
    { key: "summary", label: "Confirm" },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="card-luxe w-full max-w-xl p-7 sm:p-9">
      {/* ── Step indicator ──
          A single continuous rail with an animated fill, rather than three
          disconnected segments. The fill width is driven off the step index so
          progress reads as one motion instead of a jump per step. */}
      <div className="mb-9">
        <div className="relative">
          {/* Rail */}
          <div className="absolute left-0 right-0 top-[15px] h-px bg-ink/10" />
          <motion.div
            className="absolute left-0 top-[15px] h-px bg-gold"
            initial={false}
            animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.6, ease: EASE_LUXE }}
          />

          <ol className="relative flex justify-between">
            {steps.map((s, i) => {
              const done = i < currentStepIndex;
              const active = i === currentStepIndex;
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

      {error && (
        <p
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-light text-red-700"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.35, ease: EASE_LUXE }}
        >
          {step === "dates" && (
            <>
              <div className="mb-8 grid grid-cols-2 gap-5">
                <label className={labelClass}>
                  Arrival
                  <input
                    type="date"
                    min={today}
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Departure
                  <input
                    type="date"
                    min={checkInDate || today}
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>

              <p className="field-label">Rooms</p>
              <ul className="divide-y divide-ink/[0.07] border-y border-ink/[0.07]">
                {cart.map((line) => (
                  <li key={line.roomId} className="flex items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-ink">{line.roomName}</p>
                      <p className="text-sm font-light text-warm-500">
                        ₹{line.basePrice.toLocaleString("en-IN")} / night
                      </p>
                    </div>

                    {/* Stepper instead of a spin-box — larger tap targets and no
                        browser-native arrows fighting the visual language. */}
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateLineQty(line.roomId, line.numRooms - 1)}
                        disabled={line.numRooms <= 1}
                        aria-label={`Fewer ${line.roomName}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/12 text-warm-600 transition-colors hover:border-gold hover:text-gold disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm tabular-nums text-ink">{line.numRooms}</span>
                      <button
                        type="button"
                        onClick={() => updateLineQty(line.roomId, line.numRooms + 1)}
                        aria-label={`More ${line.roomName}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/12 text-warm-600 transition-colors hover:border-gold hover:text-gold"
                      >
                        +
                      </button>
                    </div>

                    {cart.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(line.roomId)}
                        aria-label={`Remove ${line.roomName}`}
                        className="shrink-0 p-1.5 text-warm-400 transition-colors hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {availableToAdd.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const r = allRooms.find((x) => x._id === e.target.value);
                    if (!r) return;
                    setCart((prev) => [
                      ...prev,
                      {
                        roomId: r._id,
                        roomName: r.name,
                        basePrice: r.basePrice,
                        maxOccupancy: r.maxOccupancy,
                        numRooms: 1,
                      },
                    ]);
                  }}
                  className="mt-4 w-full cursor-pointer border-0 border-b border-dashed border-ink/20 bg-transparent py-2.5 text-sm font-light text-warm-600 transition-colors focus:border-gold focus:outline-none focus:ring-0"
                >
                  <option value="">+ Add another room type…</option>
                  {availableToAdd.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} (₹{r.basePrice.toLocaleString("en-IN")}/night)
                    </option>
                  ))}
                </select>
              )}

              <label className={`${labelClass} mt-8 block`}>
                Total Guests
                <input
                  type="number"
                  min={1}
                  value={numGuests}
                  onChange={(e) => setNumGuests(Number(e.target.value))}
                  className={inputClass}
                />
              </label>

              {/* Live running total once dates are chosen — no surprises later. */}
              {nights > 0 && (
                <div className="mt-7 flex items-baseline justify-between border-t border-ink/[0.08] pt-5">
                  <span className="text-xs uppercase tracking-luxe text-warm-500">
                    {nights} {nights === 1 ? "night" : "nights"}
                  </span>
                  <span className="price text-2xl">₹{totalAmount.toLocaleString("en-IN")}</span>
                </div>
              )}

              <button onClick={handleCheckAvailability} className="btn-primary group mt-7 w-full">
                Check Availability <ArrowRight size={14} className="btn-arrow" />
              </button>
            </>
          )}

          {step === "guest-details" && (
            <>
              <p className="mb-7 flex items-center gap-2.5 rounded-xl border border-gold/30 bg-gold/[0.07] px-4 py-3 text-sm font-light text-gold-dark">
                <Check size={16} className="shrink-0" />
                Rooms are available for your dates.
              </p>

              <div className="space-y-6">
                <label className={labelClass}>
                  Full Name
                  <input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    autoComplete="name"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Email
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    autoComplete="email"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Phone
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    autoComplete="tel"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Special Request (optional)
                  <textarea
                    rows={3}
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    placeholder="Late arrival, high floor, celebration…"
                    className={`${inputClass} resize-none placeholder:text-warm-400`}
                  />
                </label>
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={() => setStep("dates")} className="btn-outline group flex-1">
                  <ArrowLeft size={14} /> Back
                </button>
                <button onClick={handleGuestDetailsNext} className="btn-primary group flex-1">
                  Review <ArrowRight size={14} className="btn-arrow" />
                </button>
              </div>
            </>
          )}

          {step === "summary" && (
            <>
              <h4 className="card-title mb-6">Review your stay</h4>

              <div className="rounded-luxe border border-ink/[0.08] bg-cream/70 p-6">
                <div className="grid grid-cols-3 gap-4 border-b border-ink/[0.08] pb-5">
                  {[
                    { label: "Arrival", value: checkInDate },
                    { label: "Departure", value: checkOutDate },
                    { label: "Nights", value: String(nights) },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs uppercase tracking-luxe text-warm-500">{item.label}</p>
                      <p className="mt-1.5 text-sm text-ink">{item.value}</p>
                    </div>
                  ))}
                </div>

                <ul className="divide-y divide-ink/[0.07] border-b border-ink/[0.08]">
                  {cart.map((line) => (
                    <li key={line.roomId} className="flex items-center justify-between gap-4 py-3.5">
                      <span className="text-sm text-ink">
                        {line.numRooms} × {line.roomName}
                      </span>
                      <span className="text-sm font-light tabular-nums text-warm-600">
                        ₹{(line.basePrice * nights * line.numRooms).toLocaleString("en-IN")}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-1.5 py-5 text-sm font-light text-warm-600">
                  <p>
                    <span className="text-warm-500">Guests:</span> {numGuests}
                  </p>
                  <p>
                    <span className="text-warm-500">Booked by:</span> {guestName}
                  </p>
                  <p className="break-all">
                    {guestEmail} · {guestPhone}
                  </p>
                </div>

                <div className="flex items-baseline justify-between border-t border-ink/[0.08] pt-5">
                  <span className="text-xs uppercase tracking-luxe text-ink">Total</span>
                  <span className="price text-3xl">₹{totalAmount.toLocaleString("en-IN")}</span>
                </div>
                <p className="mt-2 text-right text-xs font-light text-warm-500">
                  Advance payable now · balance settled at the property
                </p>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setStep("guest-details")}
                  disabled={isSubmitting}
                  className="btn-outline group flex-1 disabled:opacity-50"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting}
                  className="btn-primary group flex-1 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Opening Payment
                    </>
                  ) : (
                    <>
                      Confirm &amp; Pay <ArrowRight size={14} className="btn-arrow" />
                    </>
                  )}
                </button>
              </div>

              <p className="mt-5 text-center text-xs font-light text-warm-500">
                Secured by Razorpay · You&apos;ll be asked to pay the advance only
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
