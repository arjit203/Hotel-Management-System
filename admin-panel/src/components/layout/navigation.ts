import {
  BarChart3,
  BedDouble,
  CalendarCheck,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquareQuote,
  PartyPopper,
  Settings,
  Star,
  Tag,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { BusinessKey } from "@/lib/businessContext";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Marks the item as visible-but-unavailable (Marriage Hall). */
  disabled?: boolean;
  badge?: string;
  /** Also highlight this item when the path starts with one of these. */
  matchPrefixes?: string[];
}

export interface NavSection {
  /** Undefined renders the group without a heading (the top-level items). */
  title?: string;
  items: NavItem[];
}

/**
 * Sidebar structure.
 *
 * The Operations entry is business-aware, because each vertical's primary
 * transaction is a different thing entirely:
 *   Hotel      → Bookings      (`/bookings`)      — instant, paid
 *   Restaurant → Reservations  (`/reservations`)  — instant, unpaid
 *   Hall       → Enquiries     (`/enquiries`)     — approval-first, unpaid
 *
 * All three routes always exist and can be linked directly; the sidebar just
 * points at whichever matches the selected business so the primary action is
 * one click away.
 */
export function buildNavSections(business: BusinessKey): NavSection[] {
  const isRestaurant = business === "restaurant";
  const isHall = business === "hall";

  return [
    {
      items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
    },
    {
      title: "Business",
      items: [
        {
          label: "Hotel",
          href: "/hotels",
          icon: BedDouble,
          matchPrefixes: ["/hotels"],
        },
        {
          label: "Restaurant",
          href: "/restaurants",
          icon: UtensilsCrossed,
          matchPrefixes: ["/restaurants"],
        },
        {
          label: "Marriage Hall",
          href: "/halls",
          icon: PartyPopper,
          matchPrefixes: ["/halls"],
        },
      ],
    },
    {
      title: "Operations",
      items: [
        {
          label: isHall ? "Enquiries" : isRestaurant ? "Reservations" : "Bookings",
          href: isHall ? "/enquiries" : isRestaurant ? "/reservations" : "/bookings",
          icon: CalendarCheck,
          matchPrefixes: ["/bookings", "/reservations", "/enquiries"],
        },
        { label: "Customers", href: "/customers", icon: UsersRound },
      ],
    },
    {
      title: "Content",
      items: [
        { label: "Gallery", href: "/gallery", icon: ImageIcon },
        { label: "Reviews", href: "/reviews", icon: Star },
        { label: "Offers", href: "/offers", icon: Tag },
        { label: "FAQs", href: "/faqs", icon: MessageSquareQuote },
      ],
    },
    {
      title: "Workspace",
      items: [
        { label: "Analytics", href: "/analytics", icon: BarChart3 },
        { label: "Users", href: "/users", icon: UsersRound },
        { label: "Settings", href: "/settings", icon: Settings },
      ],
    },
  ];
}

/** True when `pathname` should light up `item` in the sidebar. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  if (pathname === item.href) return true;
  const prefixes = item.matchPrefixes ?? [item.href];
  return prefixes.some((p) => pathname.startsWith(`${p}/`) || pathname === p);
}
