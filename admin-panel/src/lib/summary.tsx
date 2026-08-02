"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { adminApi, publicGet } from "./api";
import { useAdminSession } from "./adminSession";
import { useBusiness } from "./businessContext";
import { isToday } from "./format";

/**
 * Shared, session-level roll-up of the operational data several surfaces need
 * at once: the Dashboard tiles, the top-bar notification tray and the Analytics
 * page. Loading it once here avoids each of those hitting the same endpoints.
 *
 * Everything comes from existing admin GET routes that `staff` can also read:
 *   GET /admin/hotels/bookings
 *   GET /admin/restaurants/reservations
 *   GET /admin/halls/enquiries/list
 *   GET /admin/hotels/:hotelId/reviews
 *   GET /admin/restaurants/:restaurantId/reviews
 *   GET /admin/halls/:hallId/reviews
 *
 * There is no aggregate/stats endpoint in the backend and this redesign does
 * not add one, so every figure below is computed client-side from these lists.
 */

export interface HotelBookingSummary {
  _id: string;
  bookingReference: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  paymentStatus?: string;
  totalAmount: number;
  advancePaid?: number;
  createdAt?: string;
  rooms?: { roomId: string; roomName?: string; quantity?: number }[];
}

export interface ReservationSummary {
  _id: string;
  reservationReference: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  diningAreaName: string;
  reservationDate: string;
  timeSlot: string;
  partySize: number;
  tablesReserved?: number;
  status: string;
  occasion?: string;
  specialRequest?: string;
  createdAt?: string;
}

export interface HallEnquirySummary {
  _id: string;
  enquiryReference: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  eventDate: string;
  alternateDate?: string | null;
  eventType: string;
  guestCount: number;
  packageName?: string;
  decorationThemeName?: string;
  cateringPreference?: string;
  budgetRange?: string;
  specialRequirements?: string;
  status: string;
  adminNotes?: string;
  createdAt?: string;
}

export interface ReviewSummaryItem {
  _id: string;
  guestName?: string;
  rating: number;
  comment: string;
  images?: string[];
  isApproved: boolean;
  adminReply?: string;
  createdAt: string;
  /** Added client-side so the cross-vertical Reviews page can label each row. */
  source?: "hotel" | "restaurant" | "hall";
  ownerId?: string;
}

/** Content totals rolled up from the public per-property aggregates. */
export interface ContentTotals {
  gallery: number;
  offers: number;
  faqs: number;
  rooms: number;
  menuItems: number;
  diningAreas: number;
  packages: number;
}

interface SummaryContextValue {
  bookings: HotelBookingSummary[];
  reservations: ReservationSummary[];
  hallEnquiries: HallEnquirySummary[];
  hotelReviews: ReviewSummaryItem[];
  restaurantReviews: ReviewSummaryItem[];
  hallReviews: ReviewSummaryItem[];
  content: ContentTotals;

  loading: boolean;
  error: string | null;
  reload: () => void;

  /** Derived counters used by the dashboard and the notification tray. */
  stats: {
    todaysCheckIns: number;
    todaysReservations: number;
    pendingBookings: number;
    pendingReservationApprovals: number;
    pendingEnquiries: number;
    upcomingHallEvents: number;
    pendingReviews: number;
    confirmedRevenue: number;
    monthRevenue: number;
  };
}

/** Only the collections whose lengths the dashboard counts. */
interface HotelAggregate {
  gallery?: unknown[];
  offers?: unknown[];
  faqs?: unknown[];
  rooms?: unknown[];
}

interface RestaurantAggregate {
  gallery?: unknown[];
  offers?: unknown[];
  faqs?: unknown[];
  menuItems?: unknown[];
  diningAreas?: unknown[];
}

interface HallAggregate {
  gallery?: unknown[];
  offers?: unknown[];
  faqs?: unknown[];
  packages?: unknown[];
}

const EMPTY_CONTENT: ContentTotals = {
  gallery: 0,
  offers: 0,
  faqs: 0,
  rooms: 0,
  menuItems: 0,
  diningAreas: 0,
  packages: 0,
};

const SummaryContext = createContext<SummaryContextValue | null>(null);

export function useSummary() {
  const ctx = useContext(SummaryContext);
  if (!ctx) throw new Error("useSummary must be used within SummaryProvider");
  return ctx;
}

/** Statuses that represent money actually committed to the property. */
const REVENUE_STATUSES = new Set(["confirmed", "checked_in", "checked_out", "completed"]);

export function SummaryProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, ready: sessionReady } = useAdminSession();
  const { hotels, restaurants, halls, loading: propertiesLoading } = useBusiness();

  const [bookings, setBookings] = useState<HotelBookingSummary[]>([]);
  const [reservations, setReservations] = useState<ReservationSummary[]>([]);
  const [hallEnquiries, setHallEnquiries] = useState<HallEnquirySummary[]>([]);
  const [hotelReviews, setHotelReviews] = useState<ReviewSummaryItem[]>([]);
  const [restaurantReviews, setRestaurantReviews] = useState<ReviewSummaryItem[]>([]);
  const [hallReviews, setHallReviews] = useState<ReviewSummaryItem[]>([]);
  const [content, setContent] = useState<ContentTotals>(EMPTY_CONTENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const hotelIds = useMemo(() => hotels.map((h) => h._id).join(","), [hotels]);
  const restaurantIds = useMemo(() => restaurants.map((r) => r._id).join(","), [restaurants]);
  const hotelSlugs = useMemo(() => hotels.map((h) => h.slug).join(","), [hotels]);
  const restaurantSlugs = useMemo(() => restaurants.map((r) => r.slug).join(","), [restaurants]);
  const hallIds = useMemo(() => halls.map((h) => h._id).join(","), [halls]);
  const hallSlugs = useMemo(() => halls.map((h) => h.slug).join(","), [halls]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    if (propertiesLoading) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const hotelIdList = hotelIds ? hotelIds.split(",") : [];
      const restaurantIdList = restaurantIds ? restaurantIds.split(",") : [];
      const hotelSlugList = hotelSlugs ? hotelSlugs.split(",") : [];
      const restaurantSlugList = restaurantSlugs ? restaurantSlugs.split(",") : [];
      const hallIdList = hallIds ? hallIds.split(",") : [];
      const hallSlugList = hallSlugs ? hallSlugs.split(",") : [];

      const [
        bookingsRes,
        reservationsRes,
        enquiriesRes,
        hotelReviewSets,
        restaurantReviewSets,
        hallReviewSets,
        hotelAggregates,
        restaurantAggregates,
        hallAggregates,
      ] = await Promise.all([
          adminApi.get<HotelBookingSummary[]>("/admin/hotels/bookings"),
          adminApi.get<ReservationSummary[]>("/admin/restaurants/reservations"),
          adminApi.get<HallEnquirySummary[]>("/admin/halls/enquiries/list"),
          Promise.all(
            hotelIdList.map((id) =>
              adminApi
                .get<ReviewSummaryItem[]>(`/admin/hotels/${id}/reviews`)
                .then((r) => (r.success ? (r.data || []).map((x) => ({ ...x, source: "hotel" as const, ownerId: id })) : []))
            )
          ),
          Promise.all(
            restaurantIdList.map((id) =>
              adminApi
                .get<ReviewSummaryItem[]>(`/admin/restaurants/${id}/reviews`)
                .then((r) =>
                  r.success
                    ? (r.data || []).map((x) => ({ ...x, source: "restaurant" as const, ownerId: id }))
                    : []
                )
            )
          ),
          Promise.all(
            hallIdList.map((id) =>
              adminApi
                .get<ReviewSummaryItem[]>(`/admin/halls/${id}/reviews`)
                .then((r) =>
                  r.success
                    ? (r.data || []).map((x) => ({ ...x, source: "hall" as const, ownerId: id }))
                    : []
                )
            )
          ),
          // Public aggregates — the only endpoints that return gallery/offer/
          // FAQ/room/menu collections in one call. Used purely for the
          // dashboard's content totals.
          Promise.all(
            hotelSlugList.map((slug) => publicGet<HotelAggregate>(`/hotels/${slug}`))
          ),
          Promise.all(
            restaurantSlugList.map((slug) =>
              publicGet<RestaurantAggregate>(`/restaurants/${slug}`)
            )
          ),
          Promise.all(hallSlugList.map((slug) => publicGet<HallAggregate>(`/halls/${slug}`))),
        ]);

      if (cancelled) return;

      // A staff-role admin is allowed to read all four of these, so a failure
      // here is a real problem (API down / token expired), not a permission
      // nuance we should swallow silently.
      if (!bookingsRes.success && !reservationsRes.success && !enquiriesRes.success) {
        setError(bookingsRes.message || "Could not load operational data.");
      }

      setBookings(bookingsRes.success ? bookingsRes.data || [] : []);
      setReservations(reservationsRes.success ? reservationsRes.data || [] : []);
      setHallEnquiries(enquiriesRes.success ? enquiriesRes.data || [] : []);
      setHotelReviews(hotelReviewSets.flat());
      setRestaurantReviews(restaurantReviewSets.flat());
      setHallReviews(hallReviewSets.flat());

      const totals = { ...EMPTY_CONTENT };
      for (const res of hotelAggregates) {
        if (!res.success || !res.data) continue;
        totals.gallery += res.data.gallery?.length ?? 0;
        totals.offers += res.data.offers?.length ?? 0;
        totals.faqs += res.data.faqs?.length ?? 0;
        totals.rooms += res.data.rooms?.length ?? 0;
      }
      for (const res of restaurantAggregates) {
        if (!res.success || !res.data) continue;
        totals.gallery += res.data.gallery?.length ?? 0;
        totals.offers += res.data.offers?.length ?? 0;
        totals.faqs += res.data.faqs?.length ?? 0;
        totals.menuItems += res.data.menuItems?.length ?? 0;
        totals.diningAreas += res.data.diningAreas?.length ?? 0;
      }
      for (const res of hallAggregates) {
        if (!res.success || !res.data) continue;
        totals.gallery += res.data.gallery?.length ?? 0;
        totals.offers += res.data.offers?.length ?? 0;
        totals.faqs += res.data.faqs?.length ?? 0;
        totals.packages += res.data.packages?.length ?? 0;
      }
      setContent(totals);

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    hotelIds,
    restaurantIds,
    hotelSlugs,
    restaurantSlugs,
    hallIds,
    hallSlugs,
    propertiesLoading,
    reloadToken,
    isAuthenticated,
    sessionReady,
  ]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const revenueBookings = bookings.filter((b) => REVENUE_STATUSES.has(b.status));

    return {
      todaysCheckIns: bookings.filter(
        (b) => isToday(b.checkInDate) && !["cancelled", "refunded"].includes(b.status)
      ).length,
      todaysReservations: reservations.filter(
        (r) => isToday(r.reservationDate) && r.status !== "cancelled"
      ).length,
      pendingBookings: bookings.filter((b) => b.status === "pending").length,
      pendingReservationApprovals: reservations.filter((r) => r.status === "confirmed").length,
      // Hall enquiries an admin has not actioned yet. `approved` is excluded —
      // that one has been answered and is mid-conversation, not waiting.
      pendingEnquiries: hallEnquiries.filter((e) =>
        ["pending", "reviewing"].includes(e.status)
      ).length,
      upcomingHallEvents: hallEnquiries.filter(
        (e) => e.status === "confirmed" && new Date(e.eventDate).getTime() >= Date.now()
      ).length,
      pendingReviews:
        hotelReviews.filter((r) => !r.isApproved).length +
        restaurantReviews.filter((r) => !r.isApproved).length +
        hallReviews.filter((r) => !r.isApproved).length,
      confirmedRevenue: revenueBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
      monthRevenue: revenueBookings
        .filter((b) => {
          const created = b.createdAt ? new Date(b.createdAt).getTime() : NaN;
          return !Number.isNaN(created) && created >= monthStart;
        })
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0),
    };
  }, [bookings, reservations, hallEnquiries, hotelReviews, restaurantReviews, hallReviews]);

  const value = useMemo<SummaryContextValue>(
    () => ({
      bookings,
      reservations,
      hallEnquiries,
      hotelReviews,
      restaurantReviews,
      hallReviews,
      content,
      loading: loading || propertiesLoading,
      error,
      reload,
      stats,
    }),
    [
      bookings,
      reservations,
      hallEnquiries,
      hotelReviews,
      restaurantReviews,
      hallReviews,
      content,
      loading,
      propertiesLoading,
      error,
      reload,
      stats,
    ]
  );

  return <SummaryContext.Provider value={value}>{children}</SummaryContext.Provider>;
}
