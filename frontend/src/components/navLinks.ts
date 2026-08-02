/**
 * Site navigation.
 *
 * ── Why this changed shape ──
 * With one vertical, nine flat links fitted. With two, a flat list would be
 * eighteen — unusable, and it would grow again with Marriage Hall. So the nav is
 * now grouped: top-level entries that are themselves pages, each optionally
 * carrying a submenu of that vertical's sections.
 *
 * Every Hotel URL is unchanged; they are simply reached via the Hotel group
 * rather than sitting in the top bar. No route was added, removed or renamed.
 *
 * This is the single source of truth for both the desktop bar and the mobile
 * drawer, and it's where a new vertical gets added.
 */

export interface NavChild {
  href: string;
  label: string;
}

export interface NavEntry {
  href: string;
  label: string;
  children?: NavChild[];
}

export const NAV_LINKS: NavEntry[] = [
  { href: "/", label: "Home" },
  {
    href: "/hotel",
    label: "Hotel",
    children: [
      { href: "/hotel", label: "Overview" },
      { href: "/hotel/rooms", label: "Rooms & Suites" },
      { href: "/hotel/amenities", label: "Amenities" },
      { href: "/hotel/offers", label: "Offers" },
      { href: "/hotel/gallery", label: "Gallery" },
      { href: "/hotel/reviews", label: "Reviews" },
      { href: "/hotel/about", label: "Our Story" },
      { href: "/hotel/faqs", label: "FAQs" },
      { href: "/hotel/contact", label: "Contact" },
    ],
  },
  {
    href: "/marriage-hall",
    label: "Marriage Hall",
    children: [
      { href: "/marriage-hall", label: "Overview" },
      { href: "/marriage-hall/gallery", label: "Gallery" },
      { href: "/marriage-hall/packages", label: "Packages" },
      { href: "/marriage-hall/decorations", label: "Decoration Themes" },
      { href: "/marriage-hall/catering", label: "Catering & Dining" },
      { href: "/marriage-hall/availability", label: "Check Your Date" },
      { href: "/marriage-hall/reviews", label: "Reviews" },
      { href: "/marriage-hall/contact", label: "Contact" },
    ],
  },
  {
    href: "/restaurant",
    label: "Restaurant",
    children: [
      { href: "/restaurant", label: "Overview" },
      { href: "/restaurant/menu", label: "Menu" },
      { href: "/restaurant/dining", label: "Private & Family Dining" },
      { href: "/restaurant/offers", label: "Dining Offers" },
      { href: "/restaurant/gallery", label: "Gallery" },
      { href: "/restaurant/reviews", label: "Reviews" },
      { href: "/restaurant/faqs", label: "FAQs" },
      { href: "/restaurant/contact", label: "Contact" },
    ],
  },
];

/** True when `pathname` is inside `entry` — drives the active underline. */
export function isEntryActive(entry: NavEntry, pathname: string): boolean {
  if (entry.href === "/") return pathname === "/";
  return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
}
