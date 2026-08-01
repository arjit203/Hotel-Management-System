"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, LogOut } from "lucide-react";
import { getStoredUser, clearUserToken, StoredUser } from "@/lib/userAuth";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/hotel", label: "Hotel" },
  { href: "/hotel/rooms", label: "Rooms" },
  { href: "/hotel/gallery", label: "Gallery" },
  { href: "/hotel/offers", label: "Offers" },
  { href: "/hotel/amenities", label: "Amenities" },
  { href: "/hotel/reviews", label: "Reviews" },
  { href: "/hotel/faqs", label: "FAQs" },
  { href: "/hotel/contact", label: "Contact" },
];

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Read from localStorage only after mount — avoids server/client markup
  // mismatch, since the server has no access to the browser's localStorage.
  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleLogout() {
    clearUserToken();
    setUser(null);
    window.location.href = "/";
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-cream/95 backdrop-blur shadow-luxury" : "bg-cream"
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 flex items-center justify-between h-20">
        <Link href="/" className="font-display text-2xl sm:text-3xl tracking-wide text-ink">
          7 <span className="text-gold">Vachan</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm tracking-wide transition-colors ${
                  active ? "text-gold font-semibold" : "text-ink/80 hover:text-gold"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/my-bookings" className="text-sm text-ink/80 hover:text-gold flex items-center gap-1">
                <User size={16} /> My Bookings
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-ink/60 hover:text-gold flex items-center gap-1"
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className="text-sm text-ink/80 hover:text-gold">
              Login
            </Link>
          )}
          <Link href="/hotel/booking" className="btn-primary text-sm">
            Book Now
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="lg:hidden text-ink"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-cream border-t border-ink/10 px-5 py-4">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`py-2.5 text-sm border-b border-ink/5 ${
                  pathname === link.href ? "text-gold font-semibold" : "text-ink/80"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/my-bookings" className="py-2.5 text-sm text-ink/80 border-b border-ink/5">
                  My Bookings
                </Link>
                <button onClick={handleLogout} className="py-2.5 text-sm text-left text-ink/60">
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="py-2.5 text-sm text-ink/80 border-b border-ink/5">
                Login / Sign Up
              </Link>
            )}
            <Link href="/hotel/booking" className="btn-primary text-sm mt-3 w-full">
              Book Now
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
