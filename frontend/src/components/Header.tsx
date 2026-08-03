"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { Menu, X, User, LogOut, ArrowRight, Briefcase, ChevronDown } from "lucide-react";
import { getStoredUser, clearUserToken, StoredUser } from "@/lib/userAuth";
import { NAV_LINKS, isEntryActive } from "@/components/navLinks";
import { EASE_LUXE } from "@/components/motion/variants";



/** Scroll distance before the auto-hide behaviour is allowed to kick in. */
const HIDE_AFTER = 260;

export default function Header() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /**
   * Which desktop dropdown is open, by href. `null` = none.
   *
   * This used to be pure CSS (`group-hover` + `group-focus-within`), which had a
   * visible bug: clicking a group's parent link left focus on it, so
   * focus-within held that panel open while hovering the next group opened a
   * second one — two menus on screen at once. A single piece of state can only
   * ever name one, which is the actual requirement.
   */
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Only the home page opens with a full-bleed cinematic hero, so only there
  // does the header float transparently over the artwork. Everywhere else it is
  // an opaque bar with a spacer beneath it.
  const isHome = pathname === "/";
  const transparent = isHome && !scrolled && !mobileOpen;

  // Auth pages are a full-screen cinematic backdrop with a centred card (per the
  // design reference). A site header over that would break the effect and steal
  // the top of the composition, so it renders nothing at all — AuthShell
  // provides its own wordmark and a "Back to site" link.
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  // Read from localStorage only after mount — avoids server/client markup
  // mismatch, since the server has no access to the browser's localStorage.
  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(latest > 24);

    // Auto-hide on scroll down, reveal on the smallest scroll up — the standard
    // "get out of the way while reading, return the moment you're wanted"
    // behaviour. Never hide while the mobile drawer is open.
    if (mobileOpen) {
      setHidden(false);
      return;
    }
    if (latest > HIDE_AFTER && latest > previous) setHidden(true);
    else if (latest < previous) setHidden(false);
  });

  // Close the mobile drawer and any open dropdown on route change.
  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  // Escape closes the open dropdown — expected of any menu, and the only way
  // out for a keyboard user who opened one and changed their mind.
  useEffect(() => {
    if (!openMenu) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openMenu]);

  // Lock background scrolling while the full-screen drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function handleLogout() {
    clearUserToken();
    setUser(null);
    window.location.href = "/";
  }

  // Placed after every hook so the hook order stays stable across renders.
  if (isAuthPage) return null;

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden && !reduceMotion ? "-100%" : "0%" }}
        transition={{ duration: 0.45, ease: EASE_LUXE }}
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,box-shadow] duration-600 ease-luxe ${
          transparent ? "bg-transparent" : "bg-cream/85 shadow-luxury backdrop-blur-xl"
        }`}
      >
        {/* Bar shrinks on scroll — a small, expensive-feeling touch that also
            hands vertical space back to the content once the guest is reading. */}
        <div
          className={`container-luxe flex items-center justify-between transition-[height] duration-500 ease-luxe ${
            scrolled ? "h-[72px] lg:h-20" : "h-20 lg:h-28"
          }`}
        >
          {/* ── Wordmark ── */}
          <Link href="/" className="group relative shrink-0 leading-none" aria-label="7 Vachan — home">
            <span
              className={`block font-display text-[1.625rem] leading-none tracking-wide transition-colors duration-500 sm:text-3xl ${
                transparent ? "text-cream" : "text-ink"
              }`}
            >
              7 <span className="text-gold">Vachan</span>
            </span>
            <span
              className={`mt-1.5 block text-[11px] uppercase tracking-eyebrow transition-colors duration-500 ${
                transparent ? "text-cream/55" : "text-warm-400"
              }`}
            >
              Hotel · Restaurant
            </span>
          </Link>

          {/* ── Desktop nav ──
              Shown from xl: nine links plus a CTA is too dense below that, and a
              cramped nav is the fastest way to look inexpensive. */}
          <nav className="hidden items-center gap-8 xl:flex 2xl:gap-10">
            {NAV_LINKS.map((link) => {
              const active = isEntryActive(link, pathname);
              const tone = transparent
                ? "text-cream/80 hover:text-cream data-[active=true]:text-gold"
                : "text-ink/75 hover:text-ink data-[active=true]:text-gold";

              if (!link.children) {
                return (
                  <Link key={link.href} href={link.href} data-active={active} className={`nav-link ${tone}`}>
                    {link.label}
                  </Link>
                );
              }

              // Grouped entry. Opening is state-driven so exactly one panel can
              // be open: pointing at a different group replaces the open one
              // rather than adding to it. The parent stays a real link to the
              // vertical's overview page.
              const isOpen = openMenu === link.href;

              return (
                <div
                  key={link.href}
                  className="relative"
                  onPointerEnter={() => setOpenMenu(link.href)}
                  onPointerLeave={() => setOpenMenu((current) => (current === link.href ? null : current))}
                  // Keyboard: focus anywhere inside opens it, leaving closes it.
                  // Checking relatedTarget means tabbing between the parent link
                  // and its own children doesn't flicker the panel shut.
                  onFocus={() => setOpenMenu(link.href)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setOpenMenu((current) => (current === link.href ? null : current));
                    }
                  }}
                >
                  <Link
                    href={link.href}
                    data-active={active}
                    aria-expanded={isOpen}
                    className={`nav-link inline-flex items-center gap-1.5 ${tone}`}
                  >
                    {link.label}
                    <ChevronDown
                      size={13}
                      strokeWidth={1.75}
                      className={`transition-transform duration-400 ease-luxe ${isOpen ? "rotate-180" : ""}`}
                    />
                  </Link>

                  <div
                    className={`absolute left-1/2 top-full z-50 w-60 -translate-x-1/2 pt-5 transition-all duration-300 ease-luxe ${
                      isOpen
                        ? "visible translate-y-0 opacity-100"
                        : "invisible translate-y-1 opacity-0"
                    }`}
                  >
                    <ul className="overflow-hidden rounded-luxe border border-ink/[0.07] bg-cream/95 py-2 shadow-lift backdrop-blur-xl">
                      {link.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            // Not focusable while closed, so Tab doesn't walk
                            // through invisible links.
                            tabIndex={isOpen ? 0 : -1}
                            onClick={() => setOpenMenu(null)}
                            className={`block px-5 py-2.5 text-sm font-light transition-colors duration-300 hover:bg-gold/[0.08] hover:text-gold ${
                              pathname === child.href ? "text-gold" : "text-ink/75"
                            }`}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </nav>

          {/* ── Desktop account + CTA ──
              Per the reference: "My Bookings" (bag icon) is always visible, then
              Login or Logout, then the Book Now pill. My Bookings is safe to show
              logged-out — that page renders its own "Sign in to view your stays"
              panel rather than erroring. */}
          <div className="hidden items-center gap-7 xl:flex">
            <Link
              href="/my-bookings"
              className={`flex items-center gap-2 text-[0.9375rem] font-light transition-colors duration-300 ${
                transparent ? "text-cream/80 hover:text-gold" : "text-ink/75 hover:text-gold"
              }`}
            >
              <Briefcase size={16} strokeWidth={1.5} /> My Bookings
            </Link>

            {user ? (
              <button
                onClick={handleLogout}
                className={`flex items-center gap-2 text-[0.9375rem] font-light transition-colors duration-300 ${
                  transparent ? "text-cream/70 hover:text-gold" : "text-warm-500 hover:text-gold"
                }`}
              >
                <LogOut size={15} strokeWidth={1.5} /> Logout
              </button>
            ) : (
              <Link
                href="/login"
                className={`flex items-center gap-2 text-[0.9375rem] font-light transition-colors duration-300 ${
                  transparent ? "text-cream/80 hover:text-gold" : "text-ink/75 hover:text-gold"
                }`}
              >
                <User size={16} strokeWidth={1.5} /> Login
              </Link>
            )}
            <Link
              href="/hotel/booking"
              className={`group !px-7 !py-3.5 !text-[0.8125rem] ${transparent ? "btn-gold" : "btn-primary"}`}
            >
              Book Now <ArrowRight size={14} className="btn-arrow" />
            </Link>
          </div>

          {/* ── Mobile trigger ── */}
          <button
            onClick={() => setMobileOpen(true)}
            className={`transition-colors duration-300 xl:hidden ${
              transparent ? "text-cream hover:text-gold" : "text-ink hover:text-gold"
            }`}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu size={24} strokeWidth={1.5} />
          </button>
        </div>

        {/* Hairline that appears only once the bar is opaque. */}
        <div
          className={`rule-fade transition-opacity duration-600 ${transparent ? "opacity-0" : "opacity-100"}`}
        />
      </motion.header>

      {/* ── Full-screen mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_LUXE }}
            className="fixed inset-0 z-[70] bg-ink/97 backdrop-blur-md xl:hidden"
          >
            <div className="container-luxe flex h-20 items-center justify-between">
              <span className="font-display text-2xl text-cream">
                7 <span className="text-gold">Vachan</span>
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-cream transition-colors hover:text-gold"
                aria-label="Close menu"
              >
                <X size={24} strokeWidth={1.5} />
              </button>
            </div>

            <motion.nav
              className="container-luxe flex h-[calc(100%-5rem)] flex-col overflow-y-auto pb-10"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.045, delayChildren: 0.12 } } }}
            >
              {NAV_LINKS.map((link) => (
                <motion.div
                  key={link.href}
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_LUXE } },
                  }}
                  className="border-b border-cream/10 py-4"
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block font-display text-2xl transition-colors duration-300 ${
                      isEntryActive(link, pathname) ? "text-gold" : "text-cream hover:text-gold"
                    }`}
                  >
                    {link.label}
                  </Link>

                  {/* Children are listed inline rather than behind an accordion:
                      on a full-screen drawer there is room, and one fewer tap to
                      reach any page. */}
                  {link.children && (
                    <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 pl-1">
                      {link.children
                        .filter((c) => c.href !== link.href)
                        .map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={() => setMobileOpen(false)}
                              className={`block py-1 text-sm font-light transition-colors duration-300 ${
                                pathname === child.href ? "text-gold" : "text-cream/60 hover:text-gold"
                              }`}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  )}
                </motion.div>
              ))}

              <motion.div
                className="mt-8 space-y-4"
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_LUXE } },
                }}
              >
                {user ? (
                  <div className="flex items-center justify-between">
                    <Link
                      href="/my-bookings"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 text-sm uppercase tracking-luxe text-cream/75"
                    >
                      <User size={15} /> My Bookings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-sm uppercase tracking-luxe text-cream/50"
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block text-sm uppercase tracking-luxe text-cream/75"
                  >
                    Login / Sign Up
                  </Link>
                )}

                <Link
                  href="/hotel/booking"
                  onClick={() => setMobileOpen(false)}
                  className="btn-gold group w-full"
                >
                  Book Your Stay <ArrowRight size={14} className="btn-arrow" />
                </Link>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer: the header is fixed, so every page except the home hero needs
          its height reserved. Kept here rather than in each page so no page had
          to change. */}
      {!isHome && <div aria-hidden="true" className="h-20 lg:h-24" />}
    </>
  );
}
