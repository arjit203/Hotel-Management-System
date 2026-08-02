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
 *   GET /admin/hotels/:hotelId/reviews
 *   GET /admin/restaurants/:restaurantId/reviews
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
  source?: "hotel" | "restaurant";
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
}

interface SummaryContextValue {
  bookings: HotelBookingSummary[];
  reservations: ReservationSummary[];
  hotelReviews: ReviewSummaryItem[];
  restaurantReviews: ReviewSummaryItem[];
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

const EMPTY_CONTENT: ContentTotals = {
  gallery: 0,
  offers: 0,
  faqs: 0,
  rooms: 0,
  menuItems: 0,
  diningAreas: 0,
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
  const { hotels, restaurants, loading: propertiesLoading } = useBusiness();

  const [bookings, setBookings] = useState<HotelBookingSummary[]>([]);
  const [reservations, setReservations] = useState<ReservationSummary[]>([]);
  const [hotelReviews, setHotelReviews] = useState<ReviewSummaryItem[]>([]);
  const [restaurantReviews, setRestaurantReviews] = useState<ReviewSummaryItem[]>([]);
  const [content, setContent] = useState<ContentTotals>(EMPTY_CONTENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const hotelIds = useMemo(() => hotels.map((h) => h._id).join(","), [hotels]);
  const restaurantIds = useMemo(() => restaurants.map((r) => r._id).join(","), [restaurants]);
  const hotelSlugs = useMemo(() => hotels.map((h) => h.slug).join(","), [hotels]);
  const restaurantSlugs = useMemo(() => restaurants.map((r) => r.slug).join(","), [restaurants]);

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

      const [
        bookingsRes,
        reservationsRes,
        hotelReviewSets,
        restaurantReviewSets,
        hotelAggregates,
        restaurantAggregates,
      ] = await Promise.all([
          adminApi.get<HotelBookingSummary[]>("/admin/hotels/bookings"),
          adminApi.get<ReservationSummary[]>("/admin/restaurants/reservations"),
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
        ]);

      if (cancelled) return;

      // A staff-role admin is allowed to read all four of these, so a failure
      // here is a real problem (API down / token expired), not a permission
      // nuance we should swallow silently.
      if (!bookingsRes.success && !reservationsRes.success) {
        setError(bookingsRes.message || "Could not load operational data.");
      }

      setBookings(bookingsRes.success ? bookingsRes.data || [] : []);
      setReservations(reservationsRes.success ? reservationsRes.data || [] : []);
      setHotelReviews(hotelReviewSets.flat());
      setRestaurantReviews(restaurantReviewSets.flat());

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
      pendingReviews:
        hotelReviews.filter((r) => !r.isApproved).length +
        restaurantReviews.filter((r) => !r.isApproved).length,
      confirmedRevenue: revenueBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
      monthRevenue: revenueBookings
        .filter((b) => {
          const created = b.createdAt ? new Date(b.createdAt).getTime() : NaN;
          return !Number.isNaN(created) && created >= monthStart;
        })
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0),
    };
  }, [bookings, reservations, hotelReviews, restaurantReviews]);

  const value = useMemo<SummaryContextValue>(
    () => ({
      bookings,
      reservations,
      hotelReviews,
      restaurantReviews,
      content,
      loading: loading || propertiesLoading,
      error,
      reload,
      stats,
    }),
    [
      bookings,
      reservations,
      hotelReviews,
      restaurantReviews,
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
