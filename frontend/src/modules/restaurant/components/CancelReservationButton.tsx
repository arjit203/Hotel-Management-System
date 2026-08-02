"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { api } from "@/lib/api";
import { getUserToken } from "@/lib/userAuth";

/**
 * Cancel a table reservation.
 *
 * Mirrors CancelBookingButton's two contexts — guest confirmation page (email
 * prompt proves ownership) and a logged-in list (the token proves it). Kept
 * separate from the hotel version rather than parameterised by endpoint, because
 * the copy differs throughout ("reservation" not "booking") and, unlike a hotel
 * booking, there is no refund to explain: nothing was charged.
 */
export default function CancelReservationButton({
  reservationReference,
  requireEmailPrompt,
  onCancelled,
}: {
  reservationReference: string;
  requireEmailPrompt: boolean;
  onCancelled?: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleCancel() {
    let guestEmail: string | undefined;
    if (requireEmailPrompt) {
      guestEmail =
        window.prompt("Please confirm the email used for this reservation:") || undefined;
      if (!guestEmail) return;
    }
    if (!window.confirm("Cancel this table reservation? This cannot be undone.")) return;

    setCancelling(true);
    setError("");
    const token = getUserToken();
    const res = await api.put(
      `/table-reservations/reference/${reservationReference}/cancel`,
      { guestEmail },
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    setCancelling(false);

    if (!res.success) {
      setError(res.message || "Could not cancel this reservation.");
      return;
    }
    setDone(true);
    onCancelled?.();
  }

  if (done) {
    return (
      <p className="flex items-center gap-2 text-sm font-light text-gold-dark">
        <Check size={15} /> Reservation cancelled.
      </p>
    );
  }

  return (
    <div>
      <button
        onClick={handleCancel}
        disabled={cancelling}
        className="rounded-full border border-red-300 px-5 py-2.5 text-xs uppercase tracking-luxe text-red-700 transition-colors duration-400 hover:border-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {cancelling ? "Cancelling…" : "Cancel Reservation"}
      </button>
      {error && <p className="mt-2 text-xs font-light text-red-700">{error}</p>}
    </div>
  );
}
