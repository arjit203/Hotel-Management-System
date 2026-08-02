import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MapPin, Phone, Clock, Users } from "lucide-react";
import CancelReservationButton from "@/modules/restaurant/components/CancelReservationButton";
import ConfirmationActions from "@/components/ConfirmationActions";
import SuccessMark from "@/components/ui/SuccessMark";
import StatusBadge from "@/components/ui/StatusBadge";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getTheRestaurant, formatTimeSlot } from "@/lib/restaurant";
import { formatDateLong } from "@/lib/format";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

interface ReservationData {
  reservationReference: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  diningAreaName: string;
  reservationDate: string;
  timeSlot: string;
  partySize: number;
  status: string;
  specialRequest?: string;
  occasion?: string;
  createdAt?: string;
}

/** Live lookup — must never be cached, same as the hotel booking confirmation. */
async function getReservation(reference: string): Promise<ReservationData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/table-reservations/reference/${reference}`, {
      cache: "no-store",
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function ReservationConfirmationPage({
  params,
}: {
  params: { reference: string };
}) {
  const reservation = await getReservation(params.reference);
  if (!reservation) return notFound();

  const data = await getTheRestaurant();
  const restaurant = data?.restaurant;

  const isCancellable =
    reservation.status === "confirmed" && new Date(reservation.reservationDate) >= new Date();

  return (
    <main className="container-luxe max-w-3xl pb-24 pt-16 sm:pt-20">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Restaurant", href: "/restaurant" },
          { label: "Reservation" },
        ]}
      />

      <header className="text-center">
        <SuccessMark />
        <p className="section-eyebrow mt-7 flex justify-center">Table Confirmed</p>
        <h1 className="page-title">Thank you, {reservation.guestName.split(" ")[0]}</h1>
        <p className="lead mx-auto mt-5 max-w-md">
          Your table is held. We&apos;ve sent the details to your email — no payment needed.
        </p>
      </header>

      {/* ── Reservation record (printable) ── */}
      <article
        id="booking-invoice"
        className="mt-12 overflow-hidden rounded-luxe border border-ink/[0.08] border-l-[3px] border-l-gold bg-white shadow-luxury"
      >
        <div className="flex flex-wrap items-start justify-between gap-6 px-8 pb-6 pt-9 sm:px-10">
          <div>
            <p className="font-display text-[1.75rem] leading-none text-ink">
              7 <span className="text-gold">Vachan</span>
            </p>
            <p className="mt-1.5 text-xs uppercase tracking-eyebrow text-warm-400">
              {restaurant?.name || "Restaurant"}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs uppercase tracking-luxe text-warm-500">Reference</p>
            <p className="price mt-1 text-xl tracking-wide">{reservation.reservationReference}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border-y border-ink/[0.08] bg-ink/[0.07] sm:grid-cols-4">
          {[
            { icon: Clock, label: "Date", value: formatDateLong(reservation.reservationDate) },
            { icon: Clock, label: "Time", value: formatTimeSlot(reservation.timeSlot) },
            { icon: Users, label: "Guests", value: String(reservation.partySize) },
            { icon: MapPin, label: "Seating", value: reservation.diningAreaName },
          ].map((item) => (
            <div key={item.label} className="bg-white px-6 py-6 sm:px-5">
              <p className="text-xs uppercase tracking-luxe text-warm-500">{item.label}</p>
              <p className="mt-2 font-display text-lg leading-tight text-ink">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-px bg-ink/[0.07] sm:grid-cols-2">
          <div className="bg-white px-8 py-6 sm:px-10">
            <p className="text-xs uppercase tracking-luxe text-warm-500">Booked by</p>
            <p className="mt-2 text-ink">{reservation.guestName}</p>
            <p className="text-sm font-light text-warm-500">{reservation.guestEmail}</p>
            {reservation.guestPhone && (
              <p className="text-sm font-light text-warm-500">{reservation.guestPhone}</p>
            )}
          </div>
          <div className="bg-white px-8 py-6 sm:px-10">
            <p className="text-xs uppercase tracking-luxe text-warm-500">Status</p>
            <div className="mt-2">
              <StatusBadge status={reservation.status} />
            </div>
            {reservation.occasion && (
              <p className="mt-3 text-sm font-light text-warm-500">
                Occasion: {reservation.occasion}
              </p>
            )}
            {reservation.specialRequest && (
              <p className="mt-1 text-sm font-light italic text-warm-500">
                &ldquo;{reservation.specialRequest}&rdquo;
              </p>
            )}
          </div>
        </div>

        {restaurant && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink/[0.08] bg-cream/60 px-8 py-5 text-xs font-light text-warm-500 sm:px-10">
            <span className="flex items-center gap-2">
              <MapPin size={13} className="text-gold" /> {restaurant.address}
            </span>
            <span className="flex items-center gap-2">
              <Phone size={13} className="text-gold" /> {restaurant.contactPhone}
            </span>
          </div>
        )}
      </article>

      <div className="mt-9">
        <ConfirmationActions
          bookingReference={reservation.reservationReference}
          guestEmail={reservation.guestEmail}
          brandName={restaurant?.name || "7 Vachan"}
        />
      </div>

      <p className="no-print mt-7 text-center text-sm font-light text-warm-500">
        Running late or plans changed? Call us on {restaurant?.contactPhone || "the number above"} —
        we&apos;ll hold the table where we can.
      </p>

      <div className="no-print mt-10 flex flex-col items-center gap-5 border-t border-ink/[0.08] pt-9">
        <Link href="/restaurant/menu" className="link-arrow">
          Browse the menu before you come <ArrowRight size={14} />
        </Link>

        {isCancellable && (
          <CancelReservationButton
            reservationReference={reservation.reservationReference}
            requireEmailPrompt={true}
          />
        )}
      </div>
    </main>
  );
}
