import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";
import { getTheHotel } from "@/lib/hotel";
import MapPlaceholder from "@/components/MapPlaceholder";
import ContactForm from "@/components/ContactForm";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with 7 Vachan — phone, email, WhatsApp, and location.",
  alternates: { canonical: "/hotel/contact" },
};

export default async function ContactPage() {
  const data = await getTheHotel();
  if (!data) return notFound();

  const { hotel } = data;
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

  return (
    <main>
      <div className="container-luxe pb-24 pt-16 sm:pt-20">
        <PageHeader
          eyebrow="Get In Touch"
          title="Contact Us"
          lead="However you prefer to reach us, someone is always here."
          crumbs={[{ label: "Home", href: "/" }, { label: "Hotel", href: "/hotel" }, { label: "Contact" }]}
        />

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* ── Details ── */}
          <div className="lg:col-span-5">
            <Reveal>
              <ul className="divide-y divide-ink/[0.07]">
                <li className="flex items-start gap-4 py-5 first:pt-0">
                  <MapPin size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" />
                  <div>
                    <p className="text-[9px] uppercase tracking-eyebrow text-warm-400">Address</p>
                    <p className="mt-1.5 font-light text-ink/80">{hotel.address}</p>
                  </div>
                </li>
                <li className="py-5">
                  <a href={`tel:${hotel.contactPhone}`} className="group flex items-start gap-4">
                    <Phone size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" />
                    <div>
                      <p className="text-[9px] uppercase tracking-eyebrow text-warm-400">Telephone</p>
                      <p className="mt-1.5 font-light text-ink/80 transition-colors group-hover:text-gold">
                        {hotel.contactPhone}
                      </p>
                    </div>
                  </a>
                </li>
                <li className="py-5">
                  <a href={`mailto:${hotel.contactEmail}`} className="group flex items-start gap-4">
                    <Mail size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" />
                    <div>
                      <p className="text-[9px] uppercase tracking-eyebrow text-warm-400">Email</p>
                      <p className="mt-1.5 break-all font-light text-ink/80 transition-colors group-hover:text-gold">
                        {hotel.contactEmail}
                      </p>
                    </div>
                  </a>
                </li>
                <li className="flex items-start gap-4 py-5">
                  <Clock size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" />
                  <div>
                    <p className="text-[9px] uppercase tracking-eyebrow text-warm-400">Reception</p>
                    <p className="mt-1.5 font-light text-ink/80">Open 24 hours</p>
                  </div>
                </li>
              </ul>

              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline group mt-8"
                >
                  <MessageCircle size={15} /> Chat On WhatsApp
                </a>
              )}
            </Reveal>
          </div>

          {/* ── Form ── */}
          <div className="lg:col-span-7">
            <Reveal direction="left" delay={0.1}>
              <ContactForm whatsappNumber={whatsappNumber} />
            </Reveal>
          </div>
        </div>

        {/* ── Location ── */}
        <Reveal delay={0.1} className="mt-20">
          <MapPlaceholder address={hotel.address} />
        </Reveal>
      </div>
    </main>
  );
}
