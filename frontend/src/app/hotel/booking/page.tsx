import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck, Clock, BadgeCheck } from "lucide-react";
import { getTheHotel } from "@/lib/hotel";
import BookingForm from "@/modules/hotel/components/BookingForm";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Book Your Stay",
  description: "Book your room at 7 Vachan — select dates, rooms, and complete your reservation.",
  alternates: { canonical: "/hotel/booking" },
};

// Quiet reassurance next to the form — the three things a guest wants to know
// before entering card details. All are statements of existing behaviour:
// hotel bookings confirm instantly, payment is Razorpay-verified server-side,
// and cancellation is genuinely supported.
const ASSURANCES = [
  { icon: BadgeCheck, title: "Instant confirmation", desc: "Real-time availability — no waiting on approval." },
  { icon: ShieldCheck, title: "Secure payment", desc: "Processed by Razorpay and verified server-side." },
  { icon: Clock, title: "Free cancellation", desc: "Cancel up to the published window before arrival." },
];

export default async function BookingPage({
  searchParams,
}: {
  searchParams: { room?: string };
}) {
  const data = await getTheHotel();
  if (!data || data.rooms.length === 0) return notFound();

  // Pre-select the room passed via ?room=<slug> (e.g. from a Room Details page's
  // "Book Now" link); default to the first room if none/invalid.
  const preselected = data.rooms.find((r) => r.slug === searchParams.room) || data.rooms[0];

  return (
    <main className="container-luxe pb-24 pt-16 sm:pt-20">
      <PageHeader
        eyebrow="Reserve Your Stay"
        title="Book your stay"
        lead={data.hotel.name}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Hotel", href: "/hotel" },
          { label: "Booking" },
        ]}
      />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Form leads on desktop, and is first in the DOM so mobile users reach
            it immediately rather than scrolling past reassurance copy. */}
        <div className="lg:col-span-7">
          <BookingForm hotelId={data.hotel._id} room={preselected} allRooms={data.rooms} />
        </div>

        <aside className="lg:col-span-5">
          <Reveal direction="left" delay={0.1}>
            <ul className="divide-y divide-ink/[0.07] border-y border-ink/[0.07]">
              {ASSURANCES.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-4 py-6">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/[0.08]">
                    <Icon size={17} strokeWidth={1.5} className="text-gold" />
                  </span>
                  <div>
                    <p className="text-ink">{title}</p>
                    <p className="body-muted mt-1">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-luxe border border-ink/[0.07] bg-white p-6">
              <p className="text-xs uppercase tracking-luxe text-warm-500">Need help booking?</p>
              <a
                href={`tel:${data.hotel.contactPhone}`}
                className="mt-2 block font-display text-xl text-ink transition-colors hover:text-gold"
              >
                {data.hotel.contactPhone}
              </a>
              <p className="body-muted mt-1">Reception answers 24 hours.</p>
            </div>
          </Reveal>
        </aside>
      </div>
    </main>
  );
}
