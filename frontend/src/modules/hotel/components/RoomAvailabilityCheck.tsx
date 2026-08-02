"use client";

import { useState } from "react";
import { CalendarCheck, Loader2, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import Alert from "@/components/ui/Alert";
import { todayISO } from "@/lib/format";

/**
 * Inline availability check on the room detail page.
 * Presentation only — same endpoint, same request, same validation.
 */
export default function RoomAvailabilityCheck({ roomId }: { roomId: string }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [result, setResult] = useState<{ availableCount: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const today = todayISO();

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!checkIn || !checkOut) {
      setError("Please select both check-in and check-out dates.");
      return;
    }
    setChecking(true);
    setError("");
    setResult(null);
    const res = await api.get<{ availableCount: number }>(
      `/hotels/rooms/${roomId}/availability?checkIn=${checkIn}&checkOut=${checkOut}`
    );
    setChecking(false);
    if (!res.success || !res.data) {
      setError(res.message || "Could not check availability.");
      return;
    }
    setResult(res.data);
  }

  // Shared `.field-line-sm` (globals.css). NOTE: this is the one place the
  // extraction normalises pixels — this component previously used `py-2` and
  // `border-ink/15`, versus the shared `py-2.5` / `border-ink/12`. A 2px padding
  // and a hairline-opacity difference; called out rather than hidden.
  const fieldClass = "field-line-sm";

  return (
    <div className="mt-8 rounded-luxe border border-ink/[0.07] bg-cream-dark/70 p-6">
      <p className="mb-5 flex items-center gap-2.5 text-xs uppercase tracking-luxe text-ink">
        <CalendarCheck size={15} className="text-gold" /> Check Availability
      </p>

      <form onSubmit={handleCheck} className="flex flex-wrap items-end gap-5">
        <label className="min-w-[7.5rem] flex-1">
          <span className="field-label">Arrival</span>
          <input
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="min-w-[7.5rem] flex-1">
          <span className="field-label">Departure</span>
          <input
            type="date"
            min={checkIn || today}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className={fieldClass}
          />
        </label>
        <button type="submit" disabled={checking} className="btn-outline group !px-6 !py-3 disabled:opacity-60">
          {checking ? <Loader2 size={14} className="animate-spin" /> : null}
          {checking ? "Checking" : "Check"}
        </button>
      </form>

      {error && <Alert className="mt-4">{error}</Alert>}

      {result && (
        <p
          className={`mt-4 flex items-center gap-2 text-sm font-light ${
            result.availableCount > 0 ? "text-gold-dark" : "text-red-700"
          }`}
        >
          {result.availableCount > 0 ? (
            <>
              <Check size={15} className="shrink-0" />
              {result.availableCount} {result.availableCount === 1 ? "room" : "rooms"} available for
              these dates.
            </>
          ) : (
            <>
              <X size={15} className="shrink-0" />
              No rooms available for these dates.
            </>
          )}
        </p>
      )}
    </div>
  );
}
