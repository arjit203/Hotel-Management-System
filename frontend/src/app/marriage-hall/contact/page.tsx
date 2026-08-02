import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarHeart, Car, Clock, Mail, MapPin, Phone } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";
import ContactForm from "@/components/ContactForm";
import MapPlaceholder from "@/components/MapPlaceholder";
import { getTheHall } from "@/lib/hall";
import HallEmpty from "@/modules/hall/components/HallEmpty";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTheHall();
  const name = data?.hall.name ?? "our banquet hall";

  return {
    title: `Contact — ${name}`,
    description: `Visit or call ${name}. ${data?.hall.address ?? ""} Arrange a walkthrough of the hall, the lawn and the terrace.`,
  };
}

/**
 * Contact and directions.
 *
 * The form reuses the shared <ContactForm>, which opens a pre-filled WhatsApp
 * chat — there is still no contact-submission endpoint in this backend, and this
 * page does not invent one. For an actual booking enquiry the page points at
 * /marriage-hall/availability, which posts to the real enquiry API.
 */
export default async function MarriageHallContactPage() {
  const data = await getTheHall();
  if (!data) return <HallEmpty title="Contact" />;

  const { hall } = data;
  const whatsapp = (hall.whatsappNumber || hall.contactPhone).replace(/\D/g, "");

  return (
    <div className="section bg-cream">
      <div className="container-luxe">
        <PageHeader
          eyebrow="Come and see it"
          title="Visit the venue"
          lead="A photograph only does so much. Walk the hall, stand on the lawn, and picture where your guests will sit — then decide."
          crumbs={[
            { label: "Marriage Hall", href: "/marriage-hall" },
            { label: "Contact" },
          ]}
        />

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* ── Details ── */}
          <div>
            <Reveal>
              <dl className="space-y-8">
                <ContactRow icon={<MapPin size={17} strokeWidth={1.5} />} label="Address">
                  {hall.address}
                </ContactRow>

                <ContactRow icon={<Phone size={17} strokeWidth={1.5} />} label="Phone">
                  <a
                    href={`tel:${hall.contactPhone.replace(/\s/g, "")}`}
                    className="transition-colors hover:text-gold"
                  >
                    {hall.contactPhone}
                  </a>
                </ContactRow>

                <ContactRow icon={<Mail size={17} strokeWidth={1.5} />} label="Email">
                  <a
                    href={`mailto:${hall.contactEmail}`}
                    className="break-all transition-colors hover:text-gold"
                  >
                    {hall.contactEmail}
                  </a>
                </ContactRow>

                <ContactRow icon={<Clock size={17} strokeWidth={1.5} />} label="Venue visits">
                  Any day, 10am to 7pm. Call ahead and we will keep the hall free so you can see it
                  empty rather than mid-function.
                </ContactRow>

                {typeof hall.parkingCapacity === "number" && (
                  <ContactRow icon={<Car size={17} strokeWidth={1.5} />} label="Parking">
                    On-site parking for {hall.parkingCapacity} cars, with valet service.
                  </ContactRow>
                )}
              </dl>
            </Reveal>

            <Reveal delay={0.15} className="mt-10">
              <MapPlaceholder address={hall.address} />
            </Reveal>

            <Reveal delay={0.2} className="mt-10">
              <div className="rounded-luxe border border-gold/25 bg-gold/[0.06] px-7 py-7">
                <p className="section-eyebrow">Planning a wedding?</p>
                <p className="body-muted">
                  The fastest route is the date check — it tells you straight away whether your day
                  is open, and puts your enquiry in front of an event manager.
                </p>
                <Link href="/marriage-hall/availability" className="btn-primary group mt-6">
                  <CalendarHeart size={14} />
                  Check your date
                  <ArrowRight size={14} className="btn-arrow" />
                </Link>
              </div>
            </Reveal>
          </div>

          {/* ── Message form ── */}
          <div>
            <Reveal direction="left">
              <h2 className="section-title !text-display-sm mb-3">Send us a message</h2>
              <p className="body-muted mb-8">
                For a general question. Booking enquiries are better handled through the date check,
                where you can tell us about the occasion.
              </p>
              <ContactForm whatsappNumber={whatsapp} />
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-5">
      <dt className="sr-only">{label}</dt>
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/[0.09] text-gold"
      >
        {icon}
      </span>
      <dd className="min-w-0">
        <span className="meta block">{label}</span>
        <span className="mt-1.5 block text-[0.9375rem] font-light leading-relaxed text-warm-600">
          {children}
        </span>
      </dd>
    </div>
  );
}
