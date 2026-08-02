import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarCheck, MessageCircle, Clock } from "lucide-react";
import { getTheRestaurant, todaysHours } from "@/lib/restaurant";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";
import ReservationForm from "@/modules/restaurant/components/ReservationForm";
import TimingsTable from "@/modules/restaurant/components/TimingsTable";

export const metadata: Metadata = {
  title: "Reserve A Table",
  description:
    "Reserve a table at 7 Vachan — real-time availability, instant confirmation, no payment required.",
  alternates: { canonical: "/restaurant/reserve" },
};

// Statements of actual behaviour, not marketing: reservations really are
// instant, really take no payment, and really are free to cancel.
const ASSURANCES = [
  {
    icon: CalendarCheck,
    title: "Instant confirmation",
    desc: "Real-time table availability — your table is held the moment you book.",
  },
  {
    icon: Clock,
    title: "No payment needed",
    desc: "Holding a table is free. You settle the bill at the restaurant.",
  },
];

export default async function ReservePage({
  searchParams,
}: {
  searchParams: { area?: string };
}) {
  const data = await getTheRestaurant();
  if (!data || data.diningAreas.length === 0) return notFound();

  const { restaurant, diningAreas } = data;

  // Pre-select the area passed via ?area=<id> (e.g. from a DiningAreaCard).
  const preselected = diningAreas.find((a) => a._id === searchParams.area)?._id;

  const whatsapp = restaurant.whatsappNumber || restaurant.contactPhone;
  const whatsappHref = `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hi ${restaurant.name}, I'd like to enquire about a table reservation.`
  )}`;

  return (
    <main className="container-luxe pb-24 pt-16 sm:pt-20">
      <PageHeader
        eyebrow="Reservations"
        title="Reserve a table"
        lead={restaurant.name}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Restaurant", href: "/restaurant" },
          { label: "Reserve" },
        ]}
      />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Form first in the DOM so mobile reaches it without scrolling past copy. */}
        <div className="lg:col-span-7">
          <ReservationForm
            restaurantId={restaurant._id}
            restaurantSlug={restaurant.slug}
            diningAreas={diningAreas}
            maxPartySize={restaurant.maxPartySize}
            preselectedAreaId={preselected}
          />
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

            {/* WhatsApp reservation CTA — for parties over the online limit, or
                anyone who'd simply rather message. */}
            <div className="mt-8 rounded-luxe border border-ink/[0.07] bg-white p-6">
              <p className="text-xs uppercase tracking-luxe text-warm-500">Rather message us?</p>
              <p className="body-muted mt-2">
                Large parties, unusual timings or a question first — WhatsApp is often quickest.
              </p>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline group mt-5 w-full"
              >
                <MessageCircle size={15} /> Reserve On WhatsApp
              </a>
              <a
                href={`tel:${restaurant.contactPhone}`}
                className="mt-4 block text-center font-display text-xl text-ink transition-colors hover:text-gold"
              >
                {restaurant.contactPhone}
              </a>
              <p className="mt-1 text-center text-xs font-light text-warm-500">
                {todaysHours(restaurant.serviceHours) || "Call for today's hours"}
              </p>
            </div>

            <div className="mt-8">
              <TimingsTable serviceHours={restaurant.serviceHours} />
            </div>
          </Reveal>
        </aside>
      </div>
    </main>
  );
}
