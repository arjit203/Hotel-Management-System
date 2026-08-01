import Link from "next/link";
import { Phone, Mail, MapPin, Instagram, Facebook, Twitter, Youtube } from "lucide-react";
import { getTheHotel } from "@/lib/hotel";
import NewsletterForm from "@/components/NewsletterForm";

const EXPLORE_LINKS = [
  { href: "/hotel/rooms", label: "Rooms & Suites" },
  { href: "/hotel/offers", label: "Offers" },
  { href: "/hotel/gallery", label: "Gallery" },
  { href: "/hotel/amenities", label: "Amenities" },
  { href: "/hotel/about", label: "About" },
  { href: "/hotel/contact", label: "Contact" },
];

const SOCIALS = [
  { icon: Instagram, label: "Instagram" },
  { icon: Facebook, label: "Facebook" },
  { icon: Twitter, label: "Twitter" },
  { icon: Youtube, label: "YouTube" },
];

/**
 * Compact footer.
 *
 * Rebuilt from a 5-column, ~700px-tall block (which included a full reservation
 * CTA band and a duplicated link tree) into a single 3-column row plus a legal
 * bar — roughly 250px on desktop.
 *
 * What was cut and why:
 *  - The "Your suite is waiting" CTA band: the header already carries a
 *    persistent Book Now, and every room card has its own CTA. It was the single
 *    largest contributor to footer height.
 *  - The duplicated Explore/Your Stay columns: merged into one two-column link
 *    list, since both were navigating to the same nine pages already in the nav.
 *  - The "Reception open 24 hours" line and the long brand paragraph: neither
 *    earns permanent space on every page.
 *
 * Still a Server Component, still sourcing contact details from getTheHotel(),
 * so no page has to prop-drill them.
 */
export default async function Footer() {
  const data = await getTheHotel();
  const hotel = data?.hotel;

  return (
    <footer className="relative overflow-hidden border-t border-cream/10 bg-ink text-cream/65">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-1/4 -top-1/2 h-[300px] w-[560px] rounded-full bg-gold/[0.06] blur-[110px]"
      />

      {/* ── Main row ── */}
      {/* py-12 + a ~132px tallest column + the 50px legal bar lands the whole
          footer at ~275px on desktop, inside the 220–280px target. */}
      <div className="container-luxe relative grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        {/* Brand + contact */}
        <div className="lg:col-span-5">
          <Link href="/" className="inline-block">
            <span className="font-display text-2xl leading-none text-cream">
              7 <span className="text-gold">Vachan</span>
            </span>
          </Link>

          <ul className="mt-5 space-y-2.5 text-sm font-light">
            <li className="flex items-start gap-2.5">
              <MapPin size={14} className="mt-1 shrink-0 text-gold" />
              <span className="text-cream/60">{hotel?.address || "Satna, Madhya Pradesh, India"}</span>
            </li>
            <li className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <a
                href={`tel:${hotel?.contactPhone || ""}`}
                className="flex items-center gap-2.5 text-cream/60 transition-colors hover:text-gold"
              >
                <Phone size={14} className="shrink-0 text-gold" />
                {hotel?.contactPhone || "+91 00000 00000"}
              </a>
              <a
                href={`mailto:${hotel?.contactEmail || ""}`}
                className="flex items-center gap-2.5 text-cream/60 transition-colors hover:text-gold"
              >
                <Mail size={14} className="shrink-0 text-gold" />
                {hotel?.contactEmail || "stay@7vachan.com"}
              </a>
            </li>
          </ul>
        </div>

        {/* Links — two tight columns, no headings needed at this size */}
        <nav className="lg:col-span-3" aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm font-light">
            {EXPLORE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-cream/60 transition-colors duration-300 hover:text-gold"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Newsletter + social */}
        <div className="lg:col-span-4">
          <p className="mb-3 text-xs uppercase tracking-luxe text-gold">Private Offers</p>
          <NewsletterForm />

          <div className="mt-6 flex gap-2.5">
            {SOCIALS.map(({ icon: Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/15
                           text-cream/55 transition-all duration-400 ease-luxe
                           hover:border-gold hover:bg-gold hover:text-ink"
              >
                <Icon size={14} strokeWidth={1.75} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Legal bar: one clean row ── */}
      <div className="relative border-t border-cream/10">
        <div className="container-luxe flex flex-col items-center justify-between gap-2 py-5 text-xs font-light text-cream/40 sm:flex-row">
          <p>© {new Date().getFullYear()} 7 Vachan. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
            <Link href="#" className="transition-colors hover:text-gold">
              Privacy
            </Link>
            <Link href="#" className="transition-colors hover:text-gold">
              Terms
            </Link>
            <Link href="#" className="transition-colors hover:text-gold">
              Cancellation
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
