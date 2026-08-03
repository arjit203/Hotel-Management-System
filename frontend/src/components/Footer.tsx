import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Linkedin,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { getTheHotel } from "@/lib/hotel";
import { getSettings, str, socialLinks, addressLine } from "@/lib/settings";
import NewsletterForm from "@/components/NewsletterForm";

// Two columns now that there are two verticals — the footer must stay inside its
// 220–280px budget, so each vertical gets its four most-wanted destinations
// rather than a full sitemap.
const HOTEL_LINKS = [
  { href: "/hotel/rooms", label: "Rooms & Suites" },
  { href: "/hotel/offers", label: "Hotel Offers" },
  { href: "/hotel/gallery", label: "Hotel Gallery" },
  { href: "/hotel/contact", label: "Hotel Contact" },
];

const RESTAURANT_LINKS = [
  { href: "/restaurant/menu", label: "Menu" },
  { href: "/restaurant/dining", label: "Private Dining" },
  { href: "/restaurant/reserve", label: "Reserve A Table" },
  { href: "/restaurant/contact", label: "Restaurant Contact" },
];

/**
 * Icon per social network.
 *
 * The list itself now comes from Settings → Social media, and only filled-in
 * profiles are rendered. The old version hardcoded four icons pointing at `#`,
 * which is worse than showing nothing: a visitor who clicks one learns the site
 * is unfinished.
 */
const SOCIAL_ICON: Record<string, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  x: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  pinterest: Globe,
  tripadvisor: Globe,
  googleBusiness: Globe,
};

/**
 * Legal pages appear only once their content exists in Settings → Legal.
 * An unpublished policy is left out rather than linked to an empty page.
 */
const LEGAL_PAGES: { key: string; href: string; label: string }[] = [
  { key: "privacyPolicy", href: "/legal/privacy", label: "Privacy" },
  { key: "termsAndConditions", href: "/legal/terms", label: "Terms" },
  { key: "cancellationPolicy", href: "/legal/cancellation", label: "Cancellation" },
  { key: "refundPolicy", href: "/legal/refund", label: "Refund" },
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
  const [data, settings] = await Promise.all([getTheHotel(), getSettings()]);
  const hotel = data?.hotel;

  // Estate-level contact details from Settings, falling back to the hotel's own
  // and finally to the placeholders the footer shipped with — so this renders
  // identically on an install where nothing has been configured.
  const phone =
    str(settings, "contact", "phonePrimary") || hotel?.contactPhone || "+91 00000 00000";
  const email = str(settings, "contact", "email") || hotel?.contactEmail || "stay@7vachan.com";

  const socials = socialLinks(settings);
  const publishedLegal = LEGAL_PAGES.filter(
    (page) => str(settings, "legal", page.key).trim().length > 0
  );

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
              <span className="text-cream/60">
                {addressLine(settings) || hotel?.address || "Satna, Madhya Pradesh, India"}
              </span>
            </li>
            <li className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {/* Settings win over the hotel document: the footer speaks for the
                  whole estate, and the hotel's own number is one business's. */}
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2.5 text-cream/60 transition-colors hover:text-gold"
              >
                <Phone size={14} className="shrink-0 text-gold" />
                {phone}
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2.5 text-cream/60 transition-colors hover:text-gold"
              >
                <Mail size={14} className="shrink-0 text-gold" />
                {email}
              </a>
            </li>
          </ul>
        </div>

        {/* Links — two tight columns, no headings needed at this size */}
        <nav className="lg:col-span-3" aria-label="Footer">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            {[
              { heading: "Hotel", links: HOTEL_LINKS },
              { heading: "Restaurant", links: RESTAURANT_LINKS },
            ].map((group) => (
              <div key={group.heading}>
                <p className="mb-3 text-xs uppercase tracking-luxe text-gold">{group.heading}</p>
                <ul className="space-y-2.5 text-sm font-light">
                  {group.links.map((link) => (
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
              </div>
            ))}
          </div>
        </nav>

        {/* Newsletter + social */}
        <div className="lg:col-span-4">
          <p className="mb-3 text-xs uppercase tracking-luxe text-gold">Private Offers</p>
          <NewsletterForm />

          {socials.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2.5">
              {socials.map(({ key, label, href }) => {
                const Icon = SOCIAL_ICON[key] ?? Globe;
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/15
                               text-cream/55 transition-all duration-400 ease-luxe
                               hover:border-gold hover:bg-gold hover:text-ink"
                  >
                    <Icon size={14} strokeWidth={1.75} />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Legal bar: one clean row ── */}
      <div className="relative border-t border-cream/10">
        <div className="container-luxe flex flex-col items-center justify-between gap-2 py-5 text-xs font-light text-cream/40 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {str(settings, "general", "siteName", "7 Vachan")}. All
            rights reserved.
          </p>
          {publishedLegal.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
              {publishedLegal.map((page) => (
                <Link key={page.href} href={page.href} className="transition-colors hover:text-gold">
                  {page.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
