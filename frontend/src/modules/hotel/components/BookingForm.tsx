"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface BookingFormProps {
  hotelId: string;
  roomId: string;
  basePrice: number;
  maxOccupancy: number;
}

type Step = "dates" | "guest-details" | "summary";

export default function BookingForm({ hotelId, roomId, basePrice, maxOccupancy }: BookingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("dates");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [numGuests, setNumGuests] = useState(1);
  const [numRooms, setNumRooms] = useState(1);
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nights =
    checkInDate && checkOutDate
      ? Math.max(
          0,
          Math.round(
            (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;
  const totalAmount = nights * basePrice * numRooms;

  async function handleCheckAvailability() {
    setError(null);
    if (!checkInDate || !checkOutDate) {
      setError("Please select both check-in and check-out dates.");
      return;
    }
    const res = await api.get<{ availableCount: number }>(
      `/hotels/rooms/${roomId}/availability?checkIn=${checkInDate}&checkOut=${checkOutDate}`
    );
    if (!res.success) {
      setError(res.message || "Could not check availability.");
      return;
    }
    setAvailableCount(res.data!.availableCount);
    if (res.data!.availableCount < numRooms) {
      setError(`Only ${res.data!.availableCount} room(s) available for these dates.`);
      return;
    }
    setStep("guest-details");
  }

  function handleGuestDetailsNext() {
    setError(null);
    if (!guestName || !guestEmail || !guestPhone) {
      setError("Please fill in all guest details.");
      return;
    }
    if (numGuests > maxOccupancy * numRooms) {
      setError(`Maximum ${maxOccupancy} guests allowed per room.`);
      return;
    }
    setStep("summary");
  }

  async function handleConfirmBooking() {
    setIsSubmitting(true);
    setError(null);

    const res = await api.post<{ bookingReference: string }>("/hotel-bookings", {
      hotelId,
      roomId,
      checkInDate,
      checkOutDate,
      numGuests,
      numRooms,
      guestName,
      guestEmail,
      guestPhone,
      specialRequest: specialRequest || undefined,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.message || "Booking failed. Please try again.");
      return;
    }

    router.push(`/booking-confirmation/${(res.data as any).bookingReference}`);
  }

  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 20, maxWidth: 480 }}>
      <h3 style={{ marginTop: 0 }}>Book This Room</h3>

      {error && (
        <p style={{ color: "#c00", background: "#fee", padding: 8, borderRadius: 6 }}>{error}</p>
      )}

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
          <label style={{ display: "block", marginBottom: 8 }}>
            Rooms
            <input
              type="number"
              min={1}
              value={numRooms}
              onChange={(e) => setNumRooms(Number(e.target.value))}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 12 }}>
            Guests
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
          <p style={{ color: "#080" }}>✓ {availableCount} room(s) available for your dates.</p>
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
            <li>Rooms: {numRooms}</li>
            <li>Guests: {numGuests}</li>
            <li>Guest: {guestName} ({guestEmail}, {guestPhone})</li>
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
