import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { getTheHotel } from "@/lib/hotel";
import MapPlaceholder from "@/components/MapPlaceholder";
import ContactForm from "@/modules/hotel/components/ContactForm";
import Breadcrumbs from "@/components/Breadcrumbs";

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
    <main className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Hotel", href: "/hotel" }, { label: "Contact" }]} />
      <div className="text-center max-w-2xl mx-auto mb-14">
        <p className="section-eyebrow justify-center flex">Get In Touch</p>
        <h1 className="section-title">Contact Us</h1>
        <p className="text-ink/60 mt-4">We&apos;d love to hear from you — reach out any time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <div className="space-y-5 mb-8">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="text-gold shrink-0 mt-0.5" />
              <span className="text-ink/70">{hotel.address}</span>
            </div>
            <a href={`tel:${hotel.contactPhone}`} className="flex items-center gap-3 hover:text-gold">
              <Phone size={20} className="text-gold shrink-0" />
              <span className="text-ink/70">{hotel.contactPhone}</span>
            </a>
            <a href={`mailto:${hotel.contactEmail}`} className="flex items-center gap-3 hover:text-gold">
              <Mail size={20} className="text-gold shrink-0" />
              <span className="text-ink/70">{hotel.contactEmail}</span>
            </a>
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <MessageCircle size={17} /> Chat on WhatsApp
              </a>
            )}
          </div>
          <MapPlaceholder address={hotel.address} />
        </div>

        <ContactForm whatsappNumber={whatsappNumber} />
      </div>
    </main>
  );
}
