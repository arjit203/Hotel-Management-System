"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { api } from "@/lib/api";

export default function RoomAvailabilityCheck({ roomId }: { roomId: string }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [result, setResult] = useState<{ availableCount: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="bg-cream-dark rounded-2xl p-5 mt-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
        <CalendarCheck size={16} className="text-gold" /> Check Availability
      </p>
      <form onSubmit={handleCheck} className="flex flex-wrap gap-3 items-end">
        <label className="text-xs text-ink/50">
          Check-in
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="block mt-1 px-3 py-2 rounded-lg border border-ink/10 text-sm focus:outline-none focus:border-gold"
          />
        </label>
        <label className="text-xs text-ink/50">
          Check-out
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="block mt-1 px-3 py-2 rounded-lg border border-ink/10 text-sm focus:outline-none focus:border-gold"
          />
        </label>
        <button type="submit" disabled={checking} className="btn-outline text-sm">
          {checking ? "Checking..." : "Check"}
        </button>
      </form>
      {error && <p className="text-red-600 text-xs mt-3">{error}</p>}
      {result && (
        <p className={`text-sm mt-3 font-medium ${result.availableCount > 0 ? "text-green-700" : "text-red-600"}`}>
          {result.availableCount > 0
            ? `✓ ${result.availableCount} room(s) available for these dates.`
            : "No rooms available for these dates."}
        </p>
      )}
    </div>
  );
}
