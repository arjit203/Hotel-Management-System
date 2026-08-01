"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { getUserToken } from "@/lib/userAuth";

// Reusable across two contexts (per "reuse existing components" instruction):
// 1. Guest booking-confirmation page — guestEmail is required to prove
//    ownership (no login involved).
// 2. Logged-in "My Bookings" page — the user's own token proves ownership,
//    guestEmail isn't needed (backend checks userId match instead).
export default function CancelBookingButton({
  bookingReference,
  requireEmailPrompt,
  onCancelled,
}: {
  bookingReference: string;
  requireEmailPrompt: boolean;
  onCancelled?: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleCancel() {
    let guestEmail: string | undefined;
    if (requireEmailPrompt) {
      guestEmail = window.prompt("Please confirm the email used for this booking:") || undefined;
      if (!guestEmail) return;
    }
    if (!window.confirm("Are you sure you want to cancel this booking? This cannot be undone.")) {
      return;
    }

    setCancelling(true);
    setError("");
    const token = getUserToken();
    const res = await api.put(
      `/hotel-bookings/reference/${bookingReference}/cancel`,
      { guestEmail },
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    setCancelling(false);

    if (!res.success) {
      setError(res.message || "Could not cancel this booking.");
      return;
    }
    setDone(true);
    onCancelled?.();
  }

  if (done) {
    return <p style={{ color: "#1a7f37", fontWeight: 600 }}>Booking cancelled.</p>;
  }

  return (
    <div>
      <button
        onClick={handleCancel}
        disabled={cancelling}
        style={{
          background: "none",
          border: "1px solid #c00",
          color: "#c00",
          padding: "6px 14px",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        {cancelling ? "Cancelling..." : "Cancel Booking"}
      </button>
      {error && <p style={{ color: "#c00", fontSize: 13, marginTop: 6 }}>{error}</p>}
    </div>
  );
}
