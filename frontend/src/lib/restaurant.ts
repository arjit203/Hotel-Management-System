import { cache } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

/**
 * Mirrors lib/hotel.ts exactly — same `cache()` de-duplication within a render,
 * same 60s ISR window, same reasoning. See lib/hotel.ts for the full rationale.
 *
 * Safe to cache: this payload carries menu, dining areas, gallery, FAQs, offers
 * and approved reviews — no live state. Table availability is never in here; it
 * comes from /restaurants/:slug/availability and the per-area endpoint, both
 * fetched fresh (no-store) exactly like the Hotel module's availability checks.
 */
const RESTAURANT_CONTENT_REVALIDATE = 60;

export type FoodType = "veg" | "non_veg" | "egg";
export type DiningAreaType = "main" | "private" | "family" | "outdoor";

export interface MenuItemData {
  _id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  foodType: FoodType;
  spiceLevel?: "mild" | "medium" | "hot";
  imageUrl?: string;
  isChefSpecial: boolean;
  isTodaysSpecial: boolean;
  isAvailable: boolean;
  tags: string[];
}

export interface MenuCategoryData {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
}

export interface DiningAreaData {
  _id: string;
  name: string;
  slug: string;
  areaType: DiningAreaType;
  description: string;
  images: string[];
  totalTables: number;
  maxPartySize: number;
  minPartySize: number;
  minimumSpend?: number;
  features: string[];
}

export interface ServiceHoursData {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  label?: string;
}

export interface RestaurantDetailsData {
  restaurant: {
    _id: string;
    name: string;
    slug: string;
    description: string;
    cuisineTypes: string[];
    serviceHours: ServiceHoursData[];
    reservationSlots: string[];
    maxPartySize: number;
    address: string;
    contactPhone: string;
    contactEmail: string;
    whatsappNumber?: string;
    features: { name: string; icon?: string }[];
    images: string[];
    averageCostForTwo?: number;
    metaTitle?: string;
    metaDescription?: string;
  };
  menuCategories: MenuCategoryData[];
  menuItems: MenuItemData[];
  diningAreas: DiningAreaData[];
  chefSpecials: MenuItemData[];
  todaysSpecials: MenuItemData[];
  gallery: { _id: string; imageUrl: string; title?: string; category: string }[];
  faqs: { _id: string; question: string; answer: string }[];
  offers: { _id: string; title: string; description?: string }[];
  reviewSummary: { average: number; count: number };
  reviews: { _id: string; guestName?: string; rating: number; comment: string; images?: string[] }[];
}

/**
 * Per current business scale (1 physical property — RULES.md §1), the frontend
 * has no restaurant listing UI: it always shows "the" restaurant. The backend
 * stays multi-restaurant-ready (`GET /restaurants` still returns a list); this
 * just auto-selects the first active one. This function is the single place that
 * would change when a second venue is added — exactly as getTheHotel() is.
 */
export const getTheRestaurant = cache(async (): Promise<RestaurantDetailsData | null> => {
  try {
    const listRes = await fetch(`${API_BASE_URL}/restaurants`, {
      next: { revalidate: RESTAURANT_CONTENT_REVALIDATE },
    });
    const listJson = await listRes.json();
    if (!listJson.success || !listJson.data?.length) return null;

    const slug = listJson.data[0].slug;

    const detailsRes = await fetch(`${API_BASE_URL}/restaurants/${slug}`, {
      next: { revalidate: RESTAURANT_CONTENT_REVALIDATE },
    });
    const detailsJson = await detailsRes.json();
    return detailsJson.success ? detailsJson.data : null;
  } catch {
    return null;
  }
});

/** Weekday names for rendering `serviceHours`. Index matches `Date.getDay()`. */
export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** `"19:30"` → `"7:30 PM"` — guests read a menu, not a 24-hour clock. */
export function formatTimeSlot(value: string): string {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h)) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Today's opening line, e.g. "Open today 12:00 PM – 11:00 PM" or "Closed today". */
export function todaysHours(serviceHours: ServiceHoursData[]): string | null {
  const today = serviceHours.find((h) => h.dayOfWeek === new Date().getDay());
  if (!today) return null;
  if (today.isClosed) return "Closed today";
  return `Open today ${formatTimeSlot(today.openTime)} – ${formatTimeSlot(today.closeTime)}`;
}
