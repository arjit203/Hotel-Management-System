"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Users, LogIn, Luggage } from "lucide-react";
import { api } from "@/lib/api";
import { getUserToken, getStoredUser } from "@/lib/userAuth";
import CancelBookingButton from "@/modules/hotel/components/CancelBookingButton";
import { Skeleton, SkeletonText } from "@/components/Skeleton";

interface BookingData {
  _id: string;
  bookingReference: string;
  checkInDate: string;
  checkOutDate: string;
  numGuests: number;
  rooms: { roomName: string; numRooms: number }[];
  totalAmount: number;
  status: string;
}

// Matches the confirmation page's muted chip vocabulary so a status looks the
// same wherever the guest encounters it.
const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-300/60 bg-amber-50 text-amber-800",
  confirmed: "border-gold/40 bg-gold/10 text-gold-dark",
  checked_in: "border-sky-300/60 bg-sky-50 text-sky-800",
  checked_out: "border-ink/15 bg-ink/[0.04] text-ink/70",
  completed: "border-ink/15 bg-ink/[0.04] text-ink/70",
  cancelled: "border-red-300/60 bg-red-50 text-red-700",
  refund_pending: "border-amber-300/60 bg-amber-50 text-amber-800",
  refunded: "border-ink/15 bg-ink/[0.04] text-ink/70",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * Presentation rebuild only — the data flow (token check, GET /hotel-bookings/me,
 * reload after cancellation) is unchanged.
 */
export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);

  async function load() {
    const token = getUserToken();
    if (!token || !getStoredUser()) {
      setLoggedIn(false);
      setLoading(false);
      return;
    }
    const res = await api.get<BookingData[]>("/hotel-bookings/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.success && res.data) setBookings(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="container-luxe max-w-4xl pb-24 pt-16 sm:pt-20">
      <header className="mb-12">
        <p className="section-eyebrow">Your Account</p>
        <h1 className="page-title">My bookings</h1>
      </header>

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card-luxe p-7">
              <Skeleton className="h-3 w-32 rounded-full" />
              <Skeleton className="mt-4 h-7 w-1/2 rounded-full" />
              <SkeletonText lines={2} className="mt-5" />
            </div>
          ))}
        </div>
      )}

      {/* ── Signed out ── */}
      {!loading && !loggedIn && (
        <div className="card-luxe flex flex-col items-center px-8 py-16 text-center">
          <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-gold/[0.08]">
            <LogIn size={20} strokeWidth={1.5} className="text-gold" />
          </span>
          <h2 className="card-title">Sign in to view your stays</h2>
          <p className="body-muted mx-auto mt-3 max-w-sm">
            Your reservations live in your account. Booked as a guest? Use the reference from your
            confirmation email instead.
          </p>
          <Link href="/login" className="btn-primary group mt-8">
            Sign In <ArrowRight size={14} className="btn-arrow" />
          </Link>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && loggedIn && bookings.length === 0 && (
        <div className="card-luxe flex flex-col items-center px-8 py-16 text-center">
          <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-gold/[0.08]">
            <Luggage size={20} strokeWidth={1.5} className="text-gold" />
          </span>
          <h2 className="card-title">No stays yet</h2>
          <p className="body-muted mx-auto mt-3 max-w-sm">
            When you book with us, your reservations will appear here.
          </p>
          <Link href="/hotel/rooms" className="btn-primary group mt-8">
            Explore Rooms <ArrowRight size={14} className="btn-arrow" />
          </Link>
        </div>
      )}

      {/* ── Bookings ── */}
      {!loading && loggedIn && bookings.length > 0 && (
        <ul className="space-y-5">
          {bookings.map((b) => {
            const cancellable =
              ["pending", "confirmed"].includes(b.status) && new Date(b.checkInDate) > new Date();

            return (
              <li key={b._id}>
                <article className="card-luxe card-hover p-7 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-luxe text-warm-500">Reference</p>
                      <p className="price mt-1 text-lg tracking-wide">{b.bookingReference}</p>
                    </div>
                    <span
                      className={`rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-luxe ${
                        STATUS_STYLES[b.status] || "border-ink/15 bg-ink/[0.04] text-ink/70"
                      }`}
                    >
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-ink/[0.07] pt-5 text-sm font-light text-warm-600">
                    <span className="flex items-center gap-2">
                      <CalendarDays size={15} className="text-gold" />
                      {formatDate(b.checkInDate)} — {formatDate(b.checkOutDate)}
                    </span>
                    <span className="flex items-center gap-2">
                      <Users size={15} className="text-gold" />
                      {b.numGuests} {b.numGuests === 1 ? "guest" : "guests"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-light text-warm-600">
                    {b.rooms.map((r) => `${r.numRooms} × ${r.roomName}`).join(" · ")}
                  </p>

                  <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-ink/[0.07] pt-5">
                    <p className="leading-none">
                      <span className="mb-1.5 block text-xs uppercase tracking-luxe text-warm-500">
                        Total
                      </span>
                      <span className="price text-2xl">₹{b.totalAmount.toLocaleString("en-IN")}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-5">
                      {cancellable && (
                        <CancelBookingButton
                          bookingReference={b.bookingReference}
                          requireEmailPrompt={false}
                          onCancelled={load}
                        />
                      )}
                      <Link
                        href={`/hotel/booking/confirmation/${b.bookingReference}`}
                        className="link-arrow"
                      >
                        View details <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
