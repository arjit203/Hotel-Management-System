"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { RoomSummary } from "./RoomCard";

// Loads the Razorpay Checkout script on-demand (not via next/script), so it's
// guaranteed ready exactly when needed — regardless of page-load timing,
// network speed, or ad-blockers delaying a preloaded/lazy script tag.
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

interface BookingFormProps {
  hotelId: string;
  room: RoomSummary; // the room the guest started booking from — pre-added to the cart
  allRooms: RoomSummary[]; // every room type at this hotel — lets the guest add more categories
}

type Step = "dates" | "guest-details" | "summary";

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

    const res = await api.post<{
      booking: { bookingReference: string };
      razorpayOrder: { id: string; amount: number; currency: string };
    }>("/hotel-bookings", {
      hotelId,
      rooms: cart.map((l) => ({ roomId: l.roomId, numRooms: l.numRooms })),
      checkInDate,
      checkOutDate,
      numGuests,
      guestName,
      guestEmail,
      guestPhone,
      specialRequest: specialRequest || undefined,
    });

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
        router.push(`/booking-confirmation/${booking.bookingReference}`);
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

  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 20, maxWidth: 520 }}>
      <h3 style={{ marginTop: 0 }}>Book Your Stay</h3>

      {error && <p style={{ color: "#c00", background: "#fee", padding: 8, borderRadius: 6 }}>{error}</p>}

      {step === "dates" && (
        <>
          <label style={{ display: "block", marginBottom: 8 }}>
            Check-in
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            Check-out
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>

          <p style={{ fontWeight: 600, marginBottom: 4 }}>Rooms</p>
          {cart.map((line) => (
            <div
              key={line.roomId}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
            >
              <span style={{ flex: 1 }}>{line.roomName}</span>
              <input
                type="number"
                min={1}
                value={line.numRooms}
                onChange={(e) => updateLineQty(line.roomId, Number(e.target.value))}
                style={{ width: 60, padding: 6 }}
              />
              {cart.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(line.roomId)}
                  style={{ background: "none", border: "none", color: "#c00", cursor: "pointer" }}
                >
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
              style={{ width: "100%", padding: 6, marginBottom: 12 }}
            >
              <option value="">+ Add another room type...</option>
              {availableToAdd.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} (₹{r.basePrice}/night)
                </option>
              ))}
            </select>
          )}

          <label style={{ display: "block", marginBottom: 12 }}>
            Total Guests
            <input
              type="number"
              min={1}
              value={numGuests}
              onChange={(e) => setNumGuests(Number(e.target.value))}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <button onClick={handleCheckAvailability} style={buttonStyle}>
            Check Availability
          </button>
        </>
      )}

      {step === "guest-details" && (
        <>
          <p style={{ color: "#080" }}>✓ Rooms available for your dates.</p>
          <label style={{ display: "block", marginBottom: 8 }}>
            Full Name
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            Email
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            Phone
            <input
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 12 }}>
            Special Request (optional)
            <textarea
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <button onClick={() => setStep("dates")} style={secondaryButtonStyle}>
            Back
          </button>
          <button onClick={handleGuestDetailsNext} style={buttonStyle}>
            Review Booking
          </button>
        </>
      )}

      {step === "summary" && (
        <>
          <h4>Booking Summary</h4>
          <ul style={{ paddingLeft: 20 }}>
            <li>Check-in: {checkInDate}</li>
            <li>Check-out: {checkOutDate}</li>
            <li>Nights: {nights}</li>
            {cart.map((line) => (
              <li key={line.roomId}>
                {line.numRooms} × {line.roomName} (₹{line.basePrice}/night)
              </li>
            ))}
            <li>Guests: {numGuests}</li>
            <li>
              Guest: {guestName} ({guestEmail}, {guestPhone})
            </li>
            <li>
              <strong>Total: ₹{totalAmount}</strong> (payable at property — online payment coming soon)
            </li>
          </ul>
          <button onClick={() => setStep("guest-details")} style={secondaryButtonStyle}>
            Back
          </button>
          <button onClick={handleConfirmBooking} disabled={isSubmitting} style={buttonStyle}>
            {isSubmitting ? "Confirming..." : "Confirm Booking"}
          </button>
        </>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  background: "#111",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: 6,
  cursor: "pointer",
  marginRight: 8,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#eee",
  color: "#111",
  border: "none",
  padding: "10px 18px",
  borderRadius: 6,
  cursor: "pointer",
  marginRight: 8,
};