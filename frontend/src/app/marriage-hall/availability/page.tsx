import type { Metadata } from "next";
import { CalendarCheck, HandCoins, PhoneCall, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";
import { getTheHall } from "@/lib/hall";
import EnquiryForm from "@/modules/hall/components/EnquiryForm";
import HallEmpty from "@/modules/hall/components/HallEmpty";

export const metadata: Metadata = {
  title: "Check Your Date — 7 Vachan Banquets",
  description:
    "See which dates are open, then send us an enquiry. No payment and no obligation — we call you to talk it through before anything is confirmed.",
  // The calendar is live data; there is nothing durable here to index deeply.
  robots: { index: true, follow: true },
};

/**
 * The conversion page: calendar → enquiry.
 *
 * ── This is not a booking page, and the whole design says so ──
 * `RULES.md` §14: hall bookings are never instant or self-serve. Every piece of
 * copy on this page reinforces that — the button says "Send enquiry", the
 * process strip spells out the four steps, and the confirmation panel repeats
 * that the date is not held. There is no payment step anywhere in this flow.
 *
 * Server Component; <EnquiryForm> (which owns the calendar) is the client island.
 */
export default async function MarriageHallAvailabilityPage() {
  const data = await getTheHall();
  if (!data) return <HallEmpty title="Check your date" />;

  const { hall, packages, decorationThemes, catering } = data;

  return (
    <div className="section bg-cream">
      <div className="container-luxe">
        <PageHeader
          eyebrow="Availability"
          title="Is your date free?"
          lead="Pick your date on the calendar and tell us a little about the occasion. We will call you within one working day — nothing is charged and nothing is committed."
          crumbs={[
            { label: "Marriage Hall", href: "/marriage-hall" },
            { label: "Check your date" },
          ]}
        />

        {/* ── How this works: four steps, stated before the form ── */}
        <Reveal className="mb-14">
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <ProcessStep
              index={1}
              icon={<CalendarCheck size={16} strokeWidth={1.5} />}
              title="Send your enquiry"
              detail="Choose a date and tell us about the celebration. Two minutes."
            />
            <ProcessStep
              index={2}
              icon={<PhoneCall size={16} strokeWidth={1.5} />}
              title="We call you"
              detail="An event manager talks through your functions, guest count and styling."
            />
            <ProcessStep
              index={3}
              icon={<Sparkles size={16} strokeWidth={1.5} />}
              title="Visit the venue"
              detail="Walk the hall and the lawn, meet the team, taste the food."
            />
            <ProcessStep
              index={4}
              icon={<HandCoins size={16} strokeWidth={1.5} />}
              title="Confirm the date"
              detail="Only once everything is agreed is your date held in your name."
            />
          </ol>
        </Reveal>

        <div className="grid gap-10 lg:grid-cols-3 lg:gap-14">
          {/* ── The form ── */}
          <div className="lg:col-span-2">
            <EnquiryForm
              hallId={hall._id}
              hallSlug={hall.slug}
              minimumNoticeDays={hall.minimumNoticeDays}
              eventTypes={hall.eventTypes.length > 0 ? hall.eventTypes : ["Wedding", "Reception"]}
              packages={packages}
              decorationThemes={decorationThemes.entries}
              cateringCategories={catering.categories}
              maxGuests={hall.floatingCapacity}
              contactPhone={hall.contactPhone}
            />
          </div>

          {/* ── Reassurance rail ── */}
          <aside className="space-y-5">
            <Reveal direction="left">
              <div className="card-luxe p-7">
                <p className="section-eyebrow">Rather talk?</p>
                <p className="body-muted">
                  Most families find one phone call answers more than a form ever will.
                </p>
                <a
                  href={`tel:${hall.contactPhone.replace(/\s/g, "")}`}
                  className="mt-5 block font-display text-2xl text-ink transition-colors hover:text-gold"
                >
                  {hall.contactPhone}
                </a>
                {hall.whatsappNumber && (
                  <a
                    href={`https://wa.me/${hall.whatsappNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="link-arrow mt-4 inline-flex"
                  >
                    Message us on WhatsApp
                  </a>
                )}
                <p className="mt-5 border-t border-ink/[0.07] pt-5 text-sm font-light text-warm-500">
                  {hall.address}
                </p>
              </div>
            </Reveal>

            <Reveal direction="left" delay={0.1}>
              <div className="rounded-luxe border border-gold/25 bg-gold/[0.06] p-7">
                <p className="section-eyebrow">Good to know</p>
                <ul className="space-y-3.5">
                  <Assurance>
                    Sending an enquiry costs nothing and holds nothing. Your date is confirmed only
                    after we have spoken.
                  </Assurance>
                  <Assurance>
                    No payment is taken on this website. Any advance is discussed in person, once
                    you have decided.
                  </Assurance>
                  <Assurance>
                    We ask for at least {hall.minimumNoticeDays} days&apos; notice. For anything
                    sooner, call us — we will always try.
                  </Assurance>
                  <Assurance>
                    If your first choice is taken, give us an alternate. Dates do open up.
                  </Assurance>
                </ul>
              </div>
            </Reveal>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ProcessStep({
  index,
  icon,
  title,
  detail,
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <li className="relative rounded-luxe border border-ink/[0.07] bg-white p-6 shadow-luxury">
      <span className="absolute right-5 top-5 font-display text-3xl leading-none text-gold/20">
        {String(index).padStart(2, "0")}
      </span>
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-gold">
        {icon}
      </span>
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="body-muted mt-1.5">{detail}</p>
    </li>
  );
}

function Assurance({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold" />
      <span className="text-[0.875rem] font-light leading-relaxed text-warm-600">{children}</span>
    </li>
  );
}
