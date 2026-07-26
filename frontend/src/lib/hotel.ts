const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

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
  gallery: { _id: string; imageUrl: string; title?: string }[];
  faqs: { _id: string; question: string; answer: string }[];
  offers: { _id: string; title: string; description?: string }[];
  reviewSummary: { average: number; count: number };
  reviews: { _id: string; guestName?: string; rating: number; comment: string }[];
}

/**
 * Per current business scale (1 physical property — see RULES.md), the
 * frontend has no hotel listing/selection UI: it always shows "the" hotel.
 * The backend is unchanged and remains multi-hotel-ready (GET /hotels still
 * returns a list) — this just auto-selects the first active one. When a
 * second property is added later, re-introduce a listing page; this function
 * is the single place that would need to change (accept a slug param again).
 */
export async function getTheHotel(): Promise<HotelDetailsData | null> {
  try {
    const listRes = await fetch(`${API_BASE_URL}/hotels`, { cache: "no-store" });
    const listJson = await listRes.json();
    if (!listJson.success || !listJson.data?.length) return null;

    const slug = listJson.data[0].slug;

    const detailsRes = await fetch(`${API_BASE_URL}/hotels/${slug}`, { cache: "no-store" });
    const detailsJson = await detailsRes.json();
    return detailsJson.success ? detailsJson.data : null;
  } catch {
    return null;
  }
}

export async function getTheHotelRoom(roomSlug: string) {
  const data = await getTheHotel();
  if (!data) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/hotels/${data.hotel.slug}/rooms/${roomSlug}`, {
      cache: "no-store",
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}
