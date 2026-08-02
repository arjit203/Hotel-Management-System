import { cache } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

/**
 * Marriage Hall data layer.
 *
 * Deliberately mirrors `lib/hotel.ts` and `lib/restaurant.ts`: one memoised
 * aggregate fetch, a shared revalidate window, and the "there is one property"
 * assumption isolated to a single function.
 *
 * ── Why 120s is safe here ──
 * The hall payload is pure editorial content: venue details, packages,
 * decoration/catering/dining/floral showcases, gallery, FAQs, offers and
 * approved reviews. None of it is live state, and unlike the Hotel module there
 * is no rate that could go stale into a wrong charge — hall packages carry a
 * display label ("On request"), never a number.
 *
 * Deliberately NOT cached, and must stay uncached:
 *  • the availability calendar (`getHallCalendar`) — a date's status is exactly
 *    the thing that changes, and showing a taken date as free loses trust
 *  • enquiry lookup by reference
 */
const HALL_CONTENT_REVALIDATE = 120;

export interface HallSpace {
  label: string;
  seated: number;
  floating: number;
  description?: string;
}

export interface Hall {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  seatedCapacity: number;
  floatingCapacity: number;
  spaces: HallSpace[];
  eventTypes: string[];
  features: { name: string; icon?: string }[];
  parkingCapacity?: number;
  guestRooms?: number;
  address: string;
  contactPhone: string;
  contactEmail: string;
  whatsappNumber?: string;
  heroImages: string[];
  videoUrl?: string;
  minimumNoticeDays: number;
  metaTitle?: string;
  metaDescription?: string;
}

export interface HallPackage {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  inclusions: string[];
  highlights: string[];
  /** Free text — the venue has not published numeric pricing. */
  priceLabel: string;
  suitableForMinGuests?: number;
  suitableForMaxGuests?: number;
  imageUrl?: string;
  images: string[];
  isFeatured: boolean;
  displayOrder: number;
}

export interface HallShowcaseEntry {
  _id: string;
  showcaseType: "decoration" | "catering" | "dining" | "floral";
  category: string;
  title: string;
  description: string;
  images: string[];
  highlights: string[];
  colorPalette: string[];
  sampleItems: string[];
  beforeImageUrl?: string;
  isFeatured: boolean;
  displayOrder: number;
}

export interface HallShowcaseSection {
  showcaseType: string;
  categories: string[];
  entries: HallShowcaseEntry[];
}

export interface HallGalleryItem {
  _id: string;
  imageUrl: string;
  title?: string;
  category: string;
}

export interface HallDetailsData {
  hall: Hall;
  packages: HallPackage[];
  decorationThemes: HallShowcaseSection;
  catering: HallShowcaseSection;
  dining: HallShowcaseSection;
  floral: HallShowcaseSection;
  gallery: HallGalleryItem[];
  faqs: { _id: string; question: string; answer: string }[];
  offers: { _id: string; title: string; description?: string; validTo?: string }[];
  reviewSummary: { average: number; count: number };
  reviews: {
    _id: string;
    guestName?: string;
    rating: number;
    comment: string;
    images?: string[];
    createdAt?: string;
    adminReply?: string;
  }[];
}

export type HallDateStatus = "available" | "tentative" | "booked" | "blocked";

export interface HallCalendarDay {
  /** YYYY-MM-DD — already normalised server-side, no timezone parsing needed. */
  date: string;
  status: HallDateStatus;
}

export interface HallCalendar {
  from: string;
  to: string;
  days: HallCalendarDay[];
}

/**
 * Per current business scale (1 physical property — RULES.md §11), the site has
 * no hall listing page: it always shows "the" hall. The backend stays
 * multi-hall-ready (`GET /halls` still returns a list) — this just auto-selects
 * the first active one, exactly as `getTheHotel()` does.
 *
 * When a second venue is added, this function is the only thing that changes.
 *
 * Wrapped in React `cache()` because one call is two sequential round-trips and
 * the same page legitimately calls it from `generateMetadata`, the page body and
 * nested sections. Memoising per render pass keeps a page at 2 requests instead
 * of 6–8.
 */
export const getTheHall = cache(async (): Promise<HallDetailsData | null> => {
  try {
    const listRes = await fetch(`${API_BASE_URL}/halls`, {
      next: { revalidate: HALL_CONTENT_REVALIDATE },
    });
    const listJson = await listRes.json();
    if (!listJson.success || !listJson.data?.length) return null;

    const slug = listJson.data[0].slug;

    const detailsRes = await fetch(`${API_BASE_URL}/halls/${slug}`, {
      next: { revalidate: HALL_CONTENT_REVALIDATE },
    });
    const detailsJson = await detailsRes.json();
    return detailsJson.success ? detailsJson.data : null;
  } catch {
    // A dead API renders the page's empty state rather than throwing.
    return null;
  }
});

/**
 * Availability calendar for a month (or several).
 *
 * `no-store`, always. This is the one hall endpoint whose answer changes as
 * enquiries arrive, and a cached "available" on a date that has just been taken
 * is the single most damaging thing this page could show.
 */
export async function getHallCalendar(
  slug: string,
  year: number,
  /** 1-12, as a human writes it. */
  month: number,
  months = 1
): Promise<HallCalendar | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/halls/${slug}/calendar?year=${year}&month=${month}&months=${months}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/** Groups showcase entries by their category, preserving display order. */
export function groupByCategory(entries: HallShowcaseEntry[]): Map<string, HallShowcaseEntry[]> {
  const grouped = new Map<string, HallShowcaseEntry[]>();
  for (const entry of entries) {
    const list = grouped.get(entry.category) ?? [];
    list.push(entry);
    grouped.set(entry.category, list);
  }
  return grouped;
}

/**
 * Every distinct gallery category, ordered so the ones customers look for first
 * lead — a bride opens this page for Wedding and Reception, not for Corporate.
 * Categories the venue invents later simply append, alphabetically.
 */
const CATEGORY_PRIORITY = [
  "Wedding",
  "Reception",
  "Engagement",
  "Haldi",
  "Mehendi",
  "Sangeet",
  "Decoration",
  "Birthday",
  "Corporate",
  "Venue",
];

export function orderedGalleryCategories(gallery: HallGalleryItem[]): string[] {
  const present = Array.from(new Set(gallery.map((g) => g.category).filter(Boolean)));

  return present.sort((a, b) => {
    const ai = CATEGORY_PRIORITY.indexOf(a);
    const bi = CATEGORY_PRIORITY.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
}
