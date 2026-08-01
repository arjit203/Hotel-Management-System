import { cache } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

/**
 * How long the shared hotel-content payload may be served from Next's data
 * cache before it is refetched in the background (stale-while-revalidate).
 *
 * ── Why 60s is safe here, specifically ──
 * This payload carries hotel details, room definitions, gallery, FAQs, offers
 * and approved reviews. It carries NO live state:
 *
 *  • Availability never comes from here. It is always fetched from
 *    /hotels/rooms/:id/availability — client-side in RoomSearch and
 *    RoomAvailabilityCheck, and server-side during booking. Untouched by this.
 *  • A stale room rate cannot cause a wrong charge. createHotelBooking()
 *    recomputes every line from room.basePrice read out of MongoDB at booking
 *    time and never trusts a client-supplied price, so a 60s-old figure is a
 *    cosmetic mismatch at worst.
 *  • Reviews only appear after admin approval, and offers are filtered by
 *    validity window server-side — neither is time-critical to the second.
 *
 * Deliberately NOT cached (these stay `no-store` and must remain so):
 *  • the availability endpoints above
 *  • GET /hotel-bookings/reference/:ref on the confirmation page
 *  • GET /hotel-bookings/me on My Bookings
 *
 * Set to 0 to go back to fetching on every request.
 */
const HOTEL_CONTENT_REVALIDATE = 60;

export interface HotelDetailsData {
  hotel: {
    _id: string;
    name: string;
    slug: string;
    description: string;
    starRating: number;
    address: string;
    contactPhone: string;
    contactEmail: string;
    // The API has always returned these (hotel.model.ts defines both with
    // defaults "14:00"/"11:00"); this type was simply narrower than the actual
    // response. Optional so nothing breaks if a record predates the defaults.
    checkInTime?: string;
    checkOutTime?: string;
    amenities: { name: string; icon?: string }[];
    metaTitle?: string;
    metaDescription?: string;
  };
  rooms: {
    _id: string;
    slug: string;
    categoryName: string;
    name: string;
    description: string;
    basePrice: number;
    maxOccupancy: number;
    images: string[];
  }[];
  gallery: { _id: string; imageUrl: string; title?: string; category: string }[];
  faqs: { _id: string; question: string; answer: string }[];
  offers: { _id: string; title: string; description?: string }[];
  reviewSummary: { average: number; count: number };
  reviews: { _id: string; guestName?: string; rating: number; comment: string; images?: string[] }[];
}

/**
 * Per current business scale (1 physical property — see RULES.md), the
 * frontend has no hotel listing/selection UI: it always shows "the" hotel.
 * The backend is unchanged and remains multi-hotel-ready (GET /hotels still
 * returns a list) — this just auto-selects the first active one. When a
 * second property is added later, re-introduce a listing page; this function
 * is the single place that would need to change (accept a slug param again).
 *
 * ── Why this is wrapped in React `cache()` ──
 *
 * One call costs TWO sequential backend round-trips (list → details), and the
 * function is legitimately called several times while rendering a single page:
 * once in `generateMetadata`, once in the page body, once in <Footer>, and again
 * inside `getTheHotelRoom`. That was 6 sequential requests to render the home
 * page and 10 to render a room detail page — the visible "few seconds before
 * anything appears" delay.
 *
 * `cache()` memoises per render pass, so every caller in one request shares a
 * single in-flight promise: home drops 6 → 2 requests, room detail 10 → 3.
 *
 * `cache()` handles duplication WITHIN one render; `HOTEL_CONTENT_REVALIDATE`
 * (see above) handles repetition ACROSS requests. Together they take the home
 * page from 6 backend round-trips per visit to 2 on a cache miss and 0 on a hit.
 */
export const getTheHotel = cache(async (): Promise<HotelDetailsData | null> => {
  try {
    const listRes = await fetch(`${API_BASE_URL}/hotels`, {
      next: { revalidate: HOTEL_CONTENT_REVALIDATE },
    });
    const listJson = await listRes.json();
    if (!listJson.success || !listJson.data?.length) return null;

    const slug = listJson.data[0].slug;

    const detailsRes = await fetch(`${API_BASE_URL}/hotels/${slug}`, {
      next: { revalidate: HOTEL_CONTENT_REVALIDATE },
    });
    const detailsJson = await detailsRes.json();
    return detailsJson.success ? detailsJson.data : null;
  } catch {
    return null;
  }
});

/** Also memoised per render pass — the room detail page calls it twice. */
export const getTheHotelRoom = cache(async (roomSlug: string) => {
  const data = await getTheHotel();
  if (!data) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/hotels/${data.hotel.slug}/rooms/${roomSlug}`, {
      next: { revalidate: HOTEL_CONTENT_REVALIDATE },
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
});
