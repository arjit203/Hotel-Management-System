import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarCheck, Mail, MapPin, MessageCircle, Phone, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { getTheRestaurant } from "@/lib/restaurant";
import MapPlaceholder from "@/components/MapPlaceholder";
import ContactForm from "@/components/ContactForm";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";
import PropertyUnavailable from "@/components/PropertyUnavailable";
import TimingsTable from "@/modules/restaurant/components/TimingsTable";

export const metadata: Metadata = {
  title: "Contact The Restaurant",
  description: "Reach 7 Vachan's restaurant — phone, email, WhatsApp, hours and location.",
  alternates: { canonical: "/restaurant/contact" },
};

export default async function RestaurantContactPage() {
  const data = await getTheRestaurant();
  // Not `notFound()`. The loader returns null both when the property does
  // not exist and when the API is simply unreachable, and a 404 during a
  // backend restart tells guests — and search engines — the page is gone.
  if (!data) {
    return (
      <PropertyUnavailable
        retryHref="/restaurant/contact"
        icon={UtensilsCrossed}
      />
    );
  }

  const { restaurant } = data;
  // Prefer the restaurant's own WhatsApp number, falling back to the site-wide
  // one, then to its phone line — so the CTA is never a dead link.
  const whatsappNumber = (
    restaurant.whatsappNumber ||
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    restaurant.contactPhone
  ).replace(/\D/g, "");

  return (
    <main>
      <div className="container-luxe pb-24 pt-16 sm:pt-20">
        <PageHeader
          eyebrow="Get In Touch"
          title="Contact the restaurant"
          lead="Reservations, dietary questions or a private event — however you prefer to reach us."
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Restaurant", href: "/restaurant" },
            { label: "Contact" },
          ]}
        />

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Reveal>
              <ul className="divide-y divide-ink/[0.07]">
                <li className="flex items-start gap-4 py-5 first:pt-0">
                  <MapPin size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" />
                  <div>
                    <p className="text-xs uppercase tracking-eyebrow text-warm-400">Address</p>
                    <p className="mt-1.5 font-light text-ink/80">{restaurant.address}</p>
                  </div>
                </li>
                <li className="py-5">
                  <a href={`tel:${restaurant.contactPhone}`} className="group flex items-start gap-4">
                    <Phone size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" />
                    <div>
                      <p className="text-xs uppercase tracking-eyebrow text-warm-400">Telephone</p>
                      <p className="mt-1.5 font-light text-ink/80 transition-colors group-hover:text-gold">
                        {restaurant.contactPhone}
                      </p>
                    </div>
                  </a>
                </li>
                <li className="py-5">
                  <a href={`mailto:${restaurant.contactEmail}`} className="group flex items-start gap-4">
                    <Mail size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" />
                    <div>
                      <p className="text-xs uppercase tracking-eyebrow text-warm-400">Email</p>
                      <p className="mt-1.5 break-all font-light text-ink/80 transition-colors group-hover:text-gold">
                        {restaurant.contactEmail}
                      </p>
                    </div>
                  </a>
                </li>
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                    `Hi ${restaurant.name}, I'd like to enquire about a table.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline group"
                >
                  <MessageCircle size={15} /> WhatsApp Us
                </a>
                <Link href="/restaurant/reserve" className="btn-primary group">
                  <CalendarCheck size={15} /> Reserve A Table
                </Link>
              </div>

              <div className="mt-8">
                <TimingsTable serviceHours={restaurant.serviceHours} />
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal direction="left" delay={0.1}>
              {/* Shared ContactForm — still WhatsApp-based, since no contact
                  endpoint exists for either vertical. */}
              <ContactForm whatsappNumber={whatsappNumber} />
            </Reveal>
          </div>
        </div>

        <Reveal delay={0.1} className="mt-20">
          <MapPlaceholder address={restaurant.address} />
        </Reveal>
      </div>
    </main>
  );
}
