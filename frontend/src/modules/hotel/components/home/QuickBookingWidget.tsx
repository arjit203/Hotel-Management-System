"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Calendar, Users, Search, Minus, Plus } from "lucide-react";
import { EASE_LUXE } from "@/components/motion/variants";

/**
 * Floating availability panel that overlaps the hero.
 *
 * Search behaviour is unchanged — same query params, same target route
 * (/hotel/rooms), consumed by the existing RoomSearch component. This is a
 * presentation upgrade: a frosted panel lifted over the hero on a gold hairline,
 * with a stepper for guests instead of a bare number input (a spin-box is the
 * least premium control in the browser).
 */
export default function QuickBookingWidget() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  // Block past dates in the picker itself, and keep check-out after check-in.
  const today = new Date().toISOString().split("T")[0];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (checkIn) params.set("checkInDate", checkIn);
    if (checkOut) params.set("checkOutDate", checkOut);
    if (guests) params.set("guests", String(guests));
    router.push(`/hotel/rooms?${params.toString()}`);
  }

  return (
    <div className="container-luxe relative z-30 -mt-16 sm:-mt-20">
      <motion.form
        onSubmit={handleSearch}
        initial={reduceMotion ? undefined : { opacity: 0, y: 40 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE_LUXE, delay: 0.5 }}
        className="glass relative mx-auto max-w-5xl rounded-luxe p-2.5 shadow-lift sm:p-3"
      >
        {/* Gold hairline across the top — reads as a plated edge. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
        />

        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
          {/* Check-in */}
          <label className="group cursor-pointer rounded-xl px-5 py-4 transition-colors duration-400 hover:bg-white/60 lg:border-r lg:border-ink/[0.08]">
            <span className="field-label flex items-center gap-2">
              <Calendar size={12} className="text-gold" /> Arrival
            </span>
            <input
              type="date"
              min={today}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full cursor-pointer border-0 bg-transparent p-0 text-sm font-light text-ink focus:outline-none focus:ring-0"
            />
          </label>

          {/* Check-out */}
          <label className="group cursor-pointer rounded-xl px-5 py-4 transition-colors duration-400 hover:bg-white/60 lg:border-r lg:border-ink/[0.08]">
            <span className="field-label flex items-center gap-2">
              <Calendar size={12} className="text-gold" /> Departure
            </span>
            <input
              type="date"
              min={checkIn || today}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full cursor-pointer border-0 bg-transparent p-0 text-sm font-light text-ink focus:outline-none focus:ring-0"
            />
          </label>

          {/* Guests stepper */}
          <div className="rounded-xl px-5 py-4">
            <span className="field-label flex items-center gap-2">
              <Users size={12} className="text-gold" /> Guests
            </span>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setGuests((g) => Math.max(1, g - 1))}
                disabled={guests <= 1}
                aria-label="Decrease guests"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-ink/12 text-ink/60
                           transition-all duration-300 hover:border-gold hover:text-gold
                           disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Minus size={12} />
              </button>
              <span className="px-3 text-sm font-light tabular-nums text-ink">
                {guests} {guests === 1 ? "Guest" : "Guests"}
              </span>
              <button
                type="button"
                onClick={() => setGuests((g) => Math.min(20, g + 1))}
                aria-label="Increase guests"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-ink/12 text-ink/60
                           transition-all duration-300 hover:border-gold hover:text-gold"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="p-1.5 lg:p-0">
            <button type="submit" className="btn-primary group h-full w-full lg:!px-8">
              <Search size={14} />
              <span className="lg:hidden xl:inline">Check Availability</span>
              <span className="hidden lg:inline xl:hidden">Search</span>
            </button>
          </div>
        </div>
      </motion.form>
    </div>
  );
}
