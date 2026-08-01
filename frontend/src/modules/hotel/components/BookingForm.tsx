"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { RoomSummary } from "./RoomCard";
import { getUserToken } from "@/lib/userAuth";

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
  const inputClass = "block w-full mt-1 px-3 py-2.5 rounded-xl border border-ink/10 focus:outline-none focus:border-gold text-ink text-sm";
  const labelClass = "block text-sm text-ink/60 mb-3";

  const steps: { key: Step; label: string }[] = [
    { key: "dates", label: "Dates & Rooms" },
    { key: "guest-details", label: "Guest Details" },
    { key: "summary", label: "Confirm" },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="bg-white rounded-2xl shadow-luxury border border-ink/5 p-6 sm:p-8 max-w-lg w-full">
      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                i <= currentStepIndex ? "bg-gold text-ink" : "bg-ink/10 text-ink/40"
              }`}
            >
              {i + 1}
            </div>
            <span className={`ml-2 text-xs hidden sm:inline ${i <= currentStepIndex ? "text-ink" : "text-ink/40"}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 ${i < currentStepIndex ? "bg-gold" : "bg-ink/10"}`} />
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm mb-5">{error}</p>}

      {step === "dates" && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className={labelClass}>
              Check-in
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Check-out
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <p className="text-sm font-semibold text-ink mb-2">Rooms</p>
          {cart.map((line) => (
            <div key={line.roomId} className="flex items-center gap-3 mb-2.5">
              <span className="flex-1 text-sm text-ink/80">{line.roomName}</span>
              <input
                type="number"
                min={1}
                value={line.numRooms}
                onChange={(e) => updateLineQty(line.roomId, Number(e.target.value))}
                className="w-16 text-sm px-2 py-1.5 rounded-lg border border-ink/10 focus:outline-none focus:border-gold"
              />
              {cart.length > 1 && (
                <button type="button" onClick={() => removeLine(line.roomId)} className="text-red-600 text-xs">
                  Remove
                </button>
              )}
            </div>
          ))}

          {availableToAdd.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                const r = allRooms.find((x) => x._id === e.target.value);
                if (!r) return;
                setCart((prev) => [
                  ...prev,
                  { roomId: r._id, roomName: r.name, basePrice: r.basePrice, maxOccupancy: r.maxOccupancy, numRooms: 1 },
                ]);
              }}
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-ink/10 focus:outline-none focus:border-gold mb-4 text-ink/60"
            >
              <option value="">+ Add another room type...</option>
              {availableToAdd.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} (₹{r.basePrice}/night)
                </option>
              ))}
            </select>
          )}

          <label className={labelClass}>
            Total Guests
            <input
              type="number"
              min={1}
              value={numGuests}
              onChange={(e) => setNumGuests(Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <button onClick={handleCheckAvailability} className="btn-primary text-sm w-full justify-center mt-2">
            Check Availability
          </button>
        </>
      )}

      {step === "guest-details" && (
        <>
          <p className="text-green-700 bg-green-50 px-4 py-2.5 rounded-xl text-sm mb-5">✓ Rooms available for your dates.</p>
          <label className={labelClass}>
            Full Name
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className={inputClass} />
          </label>
          <label className={labelClass}>
            Email
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Phone
            <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className={inputClass} />
          </label>
          <label className={labelClass}>
            Special Request (optional)
            <textarea
              rows={3}
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              className={inputClass}
            />
          </label>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep("dates")} className="btn-outline text-sm flex-1 justify-center">
              Back
            </button>
            <button onClick={handleGuestDetailsNext} className="btn-primary text-sm flex-1 justify-center">
              Review Booking
            </button>
          </div>
        </>
      )}

      {step === "summary" && (
        <>
          <h4 className="font-display text-lg text-ink mb-4">Booking Summary</h4>
          <div className="space-y-2 text-sm text-ink/70 bg-cream-dark rounded-xl p-4 mb-5">
            <p>Check-in: <span className="text-ink font-medium">{checkInDate}</span></p>
            <p>Check-out: <span className="text-ink font-medium">{checkOutDate}</span></p>
            <p>Nights: <span className="text-ink font-medium">{nights}</span></p>
            {cart.map((line) => (
              <p key={line.roomId}>
                {line.numRooms} × {line.roomName} <span className="text-ink font-medium">(₹{line.basePrice}/night)</span>
              </p>
            ))}
            <p>Guests: <span className="text-ink font-medium">{numGuests}</span></p>
            <p>Guest: <span className="text-ink font-medium">{guestName} ({guestEmail}, {guestPhone})</span></p>
            <p className="pt-2 border-t border-ink/10 text-base">
              <strong className="text-ink">Total: ₹{totalAmount}</strong>
              <span className="text-xs block text-ink/50 mt-1">Advance payment required now; balance payable at property.</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("guest-details")} className="btn-outline text-sm flex-1 justify-center">
              Back
            </button>
            <button onClick={handleConfirmBooking} disabled={isSubmitting} className="btn-primary text-sm flex-1 justify-center">
              {isSubmitting ? "Confirming..." : "Confirm & Pay"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
