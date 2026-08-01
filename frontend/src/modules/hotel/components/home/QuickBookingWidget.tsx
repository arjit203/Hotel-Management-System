"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Users, Search } from "lucide-react";

export default function QuickBookingWidget() {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (checkIn) params.set("checkInDate", checkIn);
    if (checkOut) params.set("checkOutDate", checkOut);
    if (guests) params.set("guests", String(guests));
    router.push(`/hotel/rooms?${params.toString()}`);
  }

  return (
    <div className="relative z-20 -mt-14 sm:-mt-16 px-5">
      <form
        onSubmit={handleSearch}
        className="mx-auto max-w-4xl bg-white rounded-2xl sm:rounded-full shadow-luxury border border-ink/5 p-4 sm:p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full sm:border-r sm:border-ink/10">
          <Calendar size={18} className="text-gold shrink-0" />
          <div className="flex-1">
            <span className="block text-[11px] uppercase tracking-wide text-ink/40">Check-in</span>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full text-sm text-ink focus:outline-none"
            />
          </div>
        </label>

        <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full sm:border-r sm:border-ink/10">
          <Calendar size={18} className="text-gold shrink-0" />
          <div className="flex-1">
            <span className="block text-[11px] uppercase tracking-wide text-ink/40">Check-out</span>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full text-sm text-ink focus:outline-none"
            />
          </div>
        </label>

        <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full">
          <Users size={18} className="text-gold shrink-0" />
          <div className="flex-1">
            <span className="block text-[11px] uppercase tracking-wide text-ink/40">Guests</span>
            <input
              type="number"
              min={1}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full text-sm text-ink focus:outline-none"
            />
          </div>
        </label>

        <button type="submit" className="btn-primary shrink-0 justify-center">
          <Search size={16} /> Check Availability
        </button>
      </form>
    </div>
  );
}
