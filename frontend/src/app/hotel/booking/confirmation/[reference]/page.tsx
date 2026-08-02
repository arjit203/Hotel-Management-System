import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CancelBookingButton from "@/modules/hotel/components/CancelBookingButton";
import ConfirmationActions from "@/components/ConfirmationActions";
import SuccessMark from "@/components/ui/SuccessMark";
import Breadcrumbs from "@/components/Breadcrumbs";
import StatusBadge from "@/components/ui/StatusBadge";
import { getTheHotel } from "@/lib/hotel";
import { money, formatDateLong as formatDate, nightsBetween } from "@/lib/format";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

interface BookingData {
  bookingReference: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkInDate: string;
  checkOutDate: string;
  numGuests: number;
  rooms: {
    roomName: string;
    categoryName: string;
    numRooms: number;
    pricePerNight: number;
    subtotal: number;
  }[];
  totalAmount: number;
  advancePaid?: number;
  balanceDue: number;
  status: string;
  specialRequest?: string;
  createdAt?: string;

  // ── Tax fields: not currently returned by the API ──
  // The invoice reference shows a "GST (12%)" line, but the backend does not
  // compute tax anywhere: booking.service.ts sets
  //   totalAmount = Σ(basePrice × nights × numRooms)
  // and Razorpay charges the advance off that untaxed figure. Deriving 12% in
  // the browser would print an invoice whose Total does not match what was
  // actually charged — on a tax document, not a styling detail. Hardcoding the
  // rate is also explicitly disallowed (AI_INSTRUCTIONS.md §15: tax rate must be
  // data-driven/admin-configurable).
  //
  // So the row is wired but optional: the moment the backend adds these fields
  // to the booking model and includes them in totalAmount, it renders itself
  // with no frontend change.
  taxLabel?: string;
  taxAmount?: number;
  subtotal?: number;
}

async function getBooking(reference: string): Promise<BookingData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/hotel-bookings/reference/${reference}`, {
      cache: "no-store",
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

// `formatDate` and `money` now come from lib/format — they were duplicated here
// and in my-bookings with slightly different date options.

export default async function BookingConfirmationPage({
  params,
}: {
  params: { reference: string };
}) {
  const booking = await getBooking(params.reference);
  if (!booking) return notFound();

  // Hotel details for the invoice letterhead — reuses the same fetch every other
  // page uses; no new API dependency.
  const hotelData = await getTheHotel();
  const hotel = hotelData?.hotel;

  const nights = nightsBetween(booking.checkInDate, booking.checkOutDate);
  const advancePaid = booking.advancePaid ?? 0;
  const isCancellable =
    ["pending", "confirmed"].includes(booking.status) && new Date(booking.checkInDate) > new Date();

  return (
    <main className="container-luxe max-w-3xl pb-24 pt-16 sm:pt-20">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Booking", href: "/hotel/booking" },
          { label: "Confirmation" },
        ]}
      />

      {/* ── Success header ── */}
      <header className="text-center">
        <SuccessMark />
        <p className="section-eyebrow mt-7 flex justify-center">
          {booking.status === "confirmed" ? "Reservation Confirmed" : "Reservation Received"}
        </p>
        <h1 className="page-title">Thank you, {booking.guestName.split(" ")[0]}</h1>
        <p className="lead mx-auto mt-5 max-w-md">
          {booking.status === "confirmed"
            ? "Your stay is confirmed. We've sent the details to your email."
            : "Your booking is saved. It will confirm once payment is complete."}
        </p>
      </header>

      {/* ── Invoice document ──
          Laid out to the supplied invoice reference: wordmark + INVOICE rule,
          a meta row, Guest/Hotel columns, a line-item table, then totals. */}
      <article
        id="booking-invoice"
        className="mt-12 overflow-hidden rounded-luxe border border-ink/[0.08] border-l-[3px] border-l-gold bg-white shadow-luxury"
      >
        {/* Letterhead */}
        <div className="flex flex-wrap items-start justify-between gap-6 px-8 pb-6 pt-9 sm:px-10">
          <div>
            <p className="font-display text-[1.75rem] leading-none text-ink">
              7 <span className="text-gold">Vachan</span>
            </p>
            <p className="mt-1.5 text-[11px] uppercase tracking-eyebrow text-warm-400">
              Hotel &amp; Stays
            </p>
          </div>
          <p className="font-display text-[1.75rem] uppercase tracking-wide text-ink">Invoice</p>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-10 gap-y-3 border-y border-ink/[0.08] px-8 py-4 sm:px-10">
          {[
            { label: "Invoice No.", value: `INV-${booking.bookingReference}` },
            { label: "Booking Reference", value: booking.bookingReference },
            {
              label: "Date",
              value: booking.createdAt ? formatDate(booking.createdAt) : formatDate(booking.checkInDate),
            },
          ].map((item) => (
            <p key={item.label} className="flex items-baseline gap-2.5 text-sm">
              <span className="text-xs text-warm-500">{item.label}</span>
              <span className="font-medium text-ink">{item.value}</span>
            </p>
          ))}
        </div>

        {/* Guest + hotel details */}
        <div className="grid grid-cols-1 gap-8 px-8 py-7 sm:grid-cols-2 sm:px-10">
          <div>
            <p className="mb-3 text-sm font-semibold text-ink">Guest Details</p>
            <p className="text-sm font-light text-warm-600">{booking.guestName}</p>
            {booking.guestPhone && (
              <p className="text-sm font-light text-warm-600">{booking.guestPhone}</p>
            )}
            <p className="break-all text-sm font-light text-warm-600">{booking.guestEmail}</p>
          </div>
          {hotel && (
            <div>
              <p className="mb-3 text-sm font-semibold text-ink">Hotel Details</p>
              <p className="text-sm font-light text-warm-600">{hotel.name}</p>
              <p className="text-sm font-light text-warm-600">{hotel.address}</p>
              <p className="break-all text-sm font-light text-warm-600">
                {hotel.contactEmail} | {hotel.contactPhone}
              </p>
            </div>
          )}
        </div>

        {/* Line items. Scrolls horizontally on narrow screens rather than
            squashing the columns into unreadable slivers. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-cream-dark/60 text-left">
                {["Item", "Description", "Check-in", "Check-out", "Nights"].map((h) => (
                  <th key={h} className="px-4 py-3.5 font-medium text-ink first:pl-8 sm:first:pl-10">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3.5 text-right font-medium text-ink sm:pr-10">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {booking.rooms.map((room, i) => (
                <tr key={i} className="border-b border-ink/[0.07]">
                  <td className="px-4 py-4 text-ink first:pl-8 sm:first:pl-10">{room.roomName}</td>
                  <td className="px-4 py-4 font-light text-warm-600">
                    {room.numRooms} {room.numRooms === 1 ? "Room" : "Rooms"} x {nights}{" "}
                    {nights === 1 ? "Night" : "Nights"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-light text-warm-600">
                    {formatDate(booking.checkInDate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-light text-warm-600">
                    {formatDate(booking.checkOutDate)}
                  </td>
                  <td className="px-4 py-4 font-light tabular-nums text-warm-600">{nights}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-ink sm:pr-10">
                    {money(room.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end px-8 py-7 sm:px-10">
          <dl className="w-full max-w-sm space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="font-light text-warm-600">Subtotal</dt>
              <dd className="tabular-nums text-ink">{money(booking.subtotal ?? booking.totalAmount)}</dd>
            </div>

            {/* Renders only when the API actually supplies tax — see BookingData. */}
            {typeof booking.taxAmount === "number" && booking.taxAmount > 0 && (
              <div className="flex items-center justify-between">
                <dt className="font-light text-warm-600">{booking.taxLabel || "Tax"}</dt>
                <dd className="tabular-nums text-ink">{money(booking.taxAmount)}</dd>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-ink/[0.12] pt-3">
              <dt className="font-semibold text-ink">Total Amount</dt>
              <dd className="price text-xl">{money(booking.totalAmount)}</dd>
            </div>

            {advancePaid > 0 && (
              <div className="flex items-center justify-between">
                <dt className="font-light text-warm-600">Advance paid</dt>
                <dd className="tabular-nums text-gold-dark">− {money(advancePaid)}</dd>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-ink/[0.08] pt-3">
              <dt className="font-medium text-ink">Balance due at property</dt>
              <dd className="price text-lg">{money(booking.balanceDue)}</dd>
            </div>
          </dl>
        </div>

        {/* Status + any special request */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/[0.08] bg-cream/50 px-8 py-5 sm:px-10">
          <StatusBadge status={booking.status} />
          <span className="text-xs font-light text-warm-500">
            Guests: {booking.numGuests}
            {hotel?.checkInTime ? ` · Check-in from ${hotel.checkInTime}` : ""}
            {hotel?.checkOutTime ? ` · Check-out by ${hotel.checkOutTime}` : ""}
          </span>
          {booking.specialRequest && (
            <span className="w-full text-xs font-light italic text-warm-500">
              Special request: &ldquo;{booking.specialRequest}&rdquo;
            </span>
          )}
        </div>
      </article>

      {/* ── Actions ── */}
      <div className="mt-9">
        <ConfirmationActions
          bookingReference={booking.bookingReference}
          guestEmail={booking.guestEmail}
          brandName={hotel?.name || "7 Vachan"}
        />
      </div>

      <p className="no-print mt-7 text-center text-sm font-light text-warm-500">
        A confirmation email has been sent to {booking.guestEmail}. Please keep your reference handy
        at check-in.
      </p>

      {/* ── Secondary actions ── */}
      <div className="no-print mt-10 flex flex-col items-center gap-5 border-t border-ink/[0.08] pt-9">
        <Link href="/my-bookings" className="link-arrow">
          View all my bookings <ArrowRight size={14} />
        </Link>

        {isCancellable && (
          <CancelBookingButton bookingReference={booking.bookingReference} requireEmailPrompt={true} />
        )}
      </div>
    </main>
  );
}
