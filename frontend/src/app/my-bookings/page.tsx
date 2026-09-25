"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Users, LogIn, Luggage } from "lucide-react";
import { api } from "@/lib/api";
import { getUserToken, getStoredUser, clearUserToken } from "@/lib/userAuth";
import CancelBookingButton from "@/modules/hotel/components/CancelBookingButton";
import { Skeleton, SkeletonText } from "@/components/Skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import { money, formatDateShort as formatDate } from "@/lib/format";

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

interface ReservationData {
  _id: string;
  reservationReference: string;
  reservationDate: string;
  timeSlot: string;
  partySize: number;
  diningAreaName: string;
  status: string;
}

interface EnquiryData {
  _id: string;
  enquiryReference: string;
  eventDate: string;
  eventType: string;
  guestCount: number;
  status: string;
}

interface Section<T> {
  items: T[];
  error: string | null;
}

/** The backend's 401 messages all name the token ("Invalid or expired token."). */
function isAuthFailure(message?: string): boolean {
  return /token/i.test(message || "");
}

function toSection<T>(res: { success: boolean; data?: T[]; message?: string }): Section<T> {
  return res.success
    ? { items: res.data || [], error: null }
    : { items: [], error: res.message || "We couldn't load these right now. Please try again." };
}

// Status chips and formatters now come from the shared layer, so a status and a
// date read identically here and on the confirmation page.

/**
 * Every vertical for the signed-in guest: hotel stays, table reservations and
 * hall enquiries, each from its own `/me` endpoint with the same user token.
 *
 * A failed request is shown as a failure — never as "nothing booked", which is
 * what a guest with a live booking and an expired session used to see.
 */
export default function MyBookingsPage() {
  const [stays, setStays] = useState<Section<BookingData>>({ items: [], error: null });
  const [tables, setTables] = useState<Section<ReservationData>>({ items: [], error: null });
  const [enquiries, setEnquiries] = useState<Section<EnquiryData>>({ items: [], error: null });
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  async function load() {
    const token = getUserToken();
    if (!token || !getStoredUser()) {
      setLoggedIn(false);
      setLoading(false);
      return;
    }

    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const [hotelRes, tableRes, hallRes] = await Promise.all([
      api.get<BookingData[]>("/hotel-bookings/me", auth),
      api.get<ReservationData[]>("/table-reservations/me", auth),
      api.get<EnquiryData[]>("/hall-enquiries/me", auth),
    ]);

    if ([hotelRes, tableRes, hallRes].some((r) => !r.success && isAuthFailure(r.message))) {
      // The stored token is no longer accepted. Drop it so the header stops
      // claiming a signed-in state, and ask the guest to sign in again.
      clearUserToken();
      setSessionExpired(true);
      setLoggedIn(false);
      setLoading(false);
      return;
    }

    setStays(toSection(hotelRes));
    setTables(toSection(tableRes));
    setEnquiries(toSection(hallRes));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const bookings = stays.items;
  const anyError = Boolean(stays.error || tables.error || enquiries.error);
  const nothingBooked =
    !anyError && bookings.length === 0 && tables.items.length === 0 && enquiries.items.length === 0;

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

      {/* ── Signed out / session expired ── */}
      {!loading && !loggedIn && (
        <EmptyState
          variant="card"
          icon={LogIn}
          title={sessionExpired ? "Your session has expired" : "Sign in to view your stays"}
          description={
            sessionExpired
              ? "Please sign in again to see your bookings. Booked as a guest? Use the reference from your confirmation email instead."
              : "Your reservations live in your account. Booked as a guest? Use the reference from your confirmation email instead."
          }
          action={
            <Link href="/login" className="btn-primary group">
              Sign In <ArrowRight size={14} className="btn-arrow" />
            </Link>
          }
        />
      )}

      {/* ── Empty (only when every request succeeded) ── */}
      {!loading && loggedIn && nothingBooked && (
        <EmptyState
          variant="card"
          icon={Luggage}
          title="No bookings yet"
          description="When you book a stay, reserve a table or enquire about the hall, it will appear here."
          action={
            <Link href="/hotel/rooms" className="btn-primary group">
              Explore Rooms <ArrowRight size={14} className="btn-arrow" />
            </Link>
          }
        />
      )}

      {!loading && loggedIn && !nothingBooked && (
        <div className="space-y-14">
          {/* ── Hotel stays ── */}
          {(bookings.length > 0 || stays.error) && (
            <section aria-labelledby="stays-heading">
              <h2 id="stays-heading" className="card-title mb-5">
                Hotel stays
              </h2>
              {stays.error && <Alert>{stays.error}</Alert>}
              <ul className="space-y-5">
                {bookings.map((b) => {
                  const cancellable =
                    ["pending", "confirmed"].includes(b.status) &&
                    new Date(b.checkInDate) > new Date();

                  return (
                    <li key={b._id}>
                      <article className="card-luxe card-hover p-7 sm:p-8">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-luxe text-warm-500">Reference</p>
                            <p className="price mt-1 text-lg tracking-wide">{b.bookingReference}</p>
                          </div>
                          <StatusBadge status={b.status} />
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
                            <span className="price text-2xl">{money(b.totalAmount)}</span>
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
            </section>
          )}

          {/* ── Table reservations ── */}
          {(tables.items.length > 0 || tables.error) && (
            <section aria-labelledby="tables-heading">
              <h2 id="tables-heading" className="card-title mb-5">
                Table reservations
              </h2>
              {tables.error && <Alert>{tables.error}</Alert>}
              <ul className="space-y-5">
                {tables.items.map((r) => (
                  <li key={r._id}>
                    <article className="card-luxe card-hover p-7 sm:p-8">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-luxe text-warm-500">Reference</p>
                          <p className="price mt-1 text-lg tracking-wide">{r.reservationReference}</p>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>

                      <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-ink/[0.07] pt-5 text-sm font-light text-warm-600">
                        <span className="flex items-center gap-2">
                          <CalendarDays size={15} className="text-gold" />
                          {formatDate(r.reservationDate)} · {r.timeSlot}
                        </span>
                        <span className="flex items-center gap-2">
                          <Users size={15} className="text-gold" />
                          {r.partySize} {r.partySize === 1 ? "guest" : "guests"}
                        </span>
                      </div>

                      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-ink/[0.07] pt-5">
                        <p className="text-sm font-light text-warm-600">{r.diningAreaName}</p>
                        <Link
                          href={`/restaurant/reserve/confirmation/${r.reservationReference}`}
                          className="link-arrow"
                        >
                          View details <ArrowRight size={14} />
                        </Link>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Hall enquiries ── */}
          {(enquiries.items.length > 0 || enquiries.error) && (
            <section aria-labelledby="enquiries-heading">
              <h2 id="enquiries-heading" className="card-title mb-5">
                Hall enquiries
              </h2>
              {enquiries.error && <Alert>{enquiries.error}</Alert>}
              <ul className="space-y-5">
                {enquiries.items.map((e) => (
                  <li key={e._id}>
                    <article className="card-luxe card-hover p-7 sm:p-8">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-luxe text-warm-500">Reference</p>
                          <p className="price mt-1 text-lg tracking-wide">{e.enquiryReference}</p>
                        </div>
                        <StatusBadge status={e.status} />
                      </div>

                      <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-ink/[0.07] pt-5 text-sm font-light text-warm-600">
                        <span className="flex items-center gap-2">
                          <CalendarDays size={15} className="text-gold" />
                          {formatDate(e.eventDate)}
                        </span>
                        <span className="flex items-center gap-2">
                          <Users size={15} className="text-gold" />
                          {e.guestCount} {e.guestCount === 1 ? "guest" : "guests"}
                        </span>
                      </div>

                      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-ink/[0.07] pt-5">
                        <p className="text-sm font-light capitalize text-warm-600">{e.eventType}</p>
                        <Link
                          href={`/marriage-hall/enquiry/${e.enquiryReference}`}
                          className="link-arrow"
                        >
                          View enquiry <ArrowRight size={14} />
                        </Link>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
