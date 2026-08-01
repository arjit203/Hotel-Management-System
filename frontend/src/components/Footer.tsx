import Link from "next/link";
import { Phone, Mail, MapPin, Instagram, Facebook, Twitter, Youtube } from "lucide-react";
import { getTheHotel } from "@/lib/hotel";
import NewsletterForm from "@/components/NewsletterForm";

// Server Component — fetches hotel contact details directly (same pattern as
// any other page here), so every page gets accurate contact info in the
// footer without prop-drilling from each page.
export default async function Footer() {
  const data = await getTheHotel();
  const hotel = data?.hotel;

  return (
    <footer className="bg-ink text-cream/80 mt-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2">
          <Link href="/" className="font-display text-2xl text-cream">
            7 <span className="text-gold">Vachan</span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed max-w-xs">
            {hotel?.description ||
              "A premium hospitality experience — luxury rooms, warm service, and unforgettable stays."}
          </p>
          <div className="flex gap-4 mt-6">
            <a href="#" aria-label="Instagram" className="hover:text-gold transition-colors">
              <Instagram size={18} />
            </a>
            <a href="#" aria-label="Facebook" className="hover:text-gold transition-colors">
              <Facebook size={18} />
            </a>
            <a href="#" aria-label="Twitter" className="hover:text-gold transition-colors">
              <Twitter size={18} />
            </a>
            <a href="#" aria-label="YouTube" className="hover:text-gold transition-colors">
              <Youtube size={18} />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-cream font-semibold mb-4 text-sm tracking-wide uppercase">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/hotel" className="hover:text-gold transition-colors">Hotel</Link></li>
            <li><Link href="/hotel/about" className="hover:text-gold transition-colors">About Us</Link></li>
            <li><Link href="/hotel/gallery" className="hover:text-gold transition-colors">Gallery</Link></li>
            <li><Link href="/hotel/contact" className="hover:text-gold transition-colors">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-cream font-semibold mb-4 text-sm tracking-wide uppercase">Hotel</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/hotel/rooms" className="hover:text-gold transition-colors">Rooms &amp; Suites</Link></li>
            <li><Link href="/hotel/amenities" className="hover:text-gold transition-colors">Amenities</Link></li>
            <li><Link href="/hotel/offers" className="hover:text-gold transition-colors">Offers</Link></li>
            <li><Link href="/hotel/reviews" className="hover:text-gold transition-colors">Reviews</Link></li>
            <li><Link href="/hotel/faqs" className="hover:text-gold transition-colors">FAQs</Link></li>
            <li><Link href="/my-bookings" className="hover:text-gold transition-colors">My Bookings</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-cream font-semibold mb-4 text-sm tracking-wide uppercase">Contact</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <MapPin size={16} className="shrink-0 mt-0.5 text-gold" />
              <span>{hotel?.address || "Patna, Bihar, India"}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} className="text-gold" />
              <a href={`tel:${hotel?.contactPhone || ""}`} className="hover:text-gold transition-colors">
                {hotel?.contactPhone || "+91 00000 00000"}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={16} className="text-gold" />
              <a href={`mailto:${hotel?.contactEmail || ""}`} className="hover:text-gold transition-colors">
                {hotel?.contactEmail || "stay@7vachan.com"}
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Newsletter strip */}
      <div className="border-t border-cream/10">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-cream/70">Subscribe for exclusive offers and updates.</p>
          <NewsletterForm />
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-cream/50">
          <p>© {new Date().getFullYear()} 7 Vachan. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-gold transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-gold transition-colors">Terms &amp; Conditions</Link>
            <Link href="#" className="hover:text-gold transition-colors">Cancellation Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
