"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { publicGet } from "./api";
import { useAdminSession } from "./adminSession";

/** Which vertical the admin is currently working in. All three are live. */
export type BusinessKey = "hotel" | "restaurant" | "hall";

export interface BusinessProperty {
  _id: string;
  name: string;
  slug: string;
  address?: string;
  isActive?: boolean;
}

interface BusinessContextValue {
  business: BusinessKey;
  setBusiness: (next: BusinessKey) => void;

  hotels: BusinessProperty[];
  restaurants: BusinessProperty[];
  halls: BusinessProperty[];

  /** Properties for the currently selected vertical. */
  properties: BusinessProperty[];
  /** The property the cross-cutting pages (Gallery, Reviews, Offers) act on. */
  activeProperty: BusinessProperty | null;
  setActivePropertyId: (id: string) => void;

  loading: boolean;
  error: string | null;
  reload: () => void;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider");
  return ctx;
}

const BUSINESS_STORAGE_KEY = "admin_active_business";
const PROPERTY_STORAGE_KEY = "admin_active_property";

export const BUSINESS_LABEL: Record<BusinessKey, string> = {
  hotel: "Hotel",
  restaurant: "Restaurant",
  hall: "Marriage Hall",
};

/**
 * Loads the property lists once for the whole session and remembers which
 * vertical/property the admin last worked in.
 *
 * All three lists come from the PUBLIC listing endpoints (`/hotels`,
 * `/restaurants`, `/halls`) because those are the only routes that enumerate
 * properties — the admin routers only expose create/update/delete by id. That
 * matches what the existing hotels page already did; no new endpoint is
 * involved.
 */
export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, ready: sessionReady } = useAdminSession();
  const [business, setBusinessState] = useState<BusinessKey>("hotel");
  const [hotels, setHotels] = useState<BusinessProperty[]>([]);
  const [restaurants, setRestaurants] = useState<BusinessProperty[]>([]);
  const [halls, setHalls] = useState<BusinessProperty[]>([]);
  const [activeIds, setActiveIds] = useState<Partial<Record<BusinessKey, string>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Restore the last-used vertical/property before the first paint of the shell.
  useEffect(() => {
    const storedBusiness = localStorage.getItem(BUSINESS_STORAGE_KEY);
    if (
      storedBusiness === "hotel" ||
      storedBusiness === "restaurant" ||
      storedBusiness === "hall"
    ) {
      setBusinessState(storedBusiness);
    }
    const storedProperty = localStorage.getItem(PROPERTY_STORAGE_KEY);
    if (storedProperty) {
      try {
        setActiveIds(JSON.parse(storedProperty));
      } catch {
        /* corrupt value — fall back to auto-selection below */
      }
    }
  }, []);

  useEffect(() => {
    // Don't touch the network on /login — the provider sits at the root so it
    // mounts there too, but there is nothing to show an unauthenticated user.
    if (!sessionReady) return;
    if (!isAuthenticated) {
      setHotels([]);
      setRestaurants([]);
      setHalls([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const [hotelRes, restaurantRes, hallRes] = await Promise.all([
        publicGet<BusinessProperty[]>("/hotels"),
        publicGet<BusinessProperty[]>("/restaurants"),
        publicGet<BusinessProperty[]>("/halls"),
      ]);

      if (cancelled) return;

      if (!hotelRes.success && !restaurantRes.success && !hallRes.success) {
        setError(hotelRes.message || "Could not load your properties.");
      }
      setHotels(hotelRes.success ? hotelRes.data || [] : []);
      setRestaurants(restaurantRes.success ? restaurantRes.data || [] : []);
      setHalls(hallRes.success ? hallRes.data || [] : []);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken, isAuthenticated, sessionReady]);

  const setBusiness = useCallback((next: BusinessKey) => {
    setBusinessState(next);
    localStorage.setItem(BUSINESS_STORAGE_KEY, next);
  }, []);

  const properties =
    business === "restaurant" ? restaurants : business === "hall" ? halls : hotels;

  const activeProperty = useMemo(() => {
    if (properties.length === 0) return null;
    const storedId = activeIds[business];
    return properties.find((p) => p._id === storedId) ?? properties[0];
  }, [properties, activeIds, business]);

  const setActivePropertyId = useCallback(
    (id: string) => {
      setActiveIds((prev) => {
        const next = { ...prev, [business]: id };
        localStorage.setItem(PROPERTY_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [business]
  );

  const value = useMemo<BusinessContextValue>(
    () => ({
      business,
      setBusiness,
      hotels,
      restaurants,
      halls,
      properties,
      activeProperty,
      setActivePropertyId,
      loading,
      error,
      reload: () => setReloadToken((t) => t + 1),
    }),
    [
      business,
      setBusiness,
      hotels,
      restaurants,
      halls,
      properties,
      activeProperty,
      setActivePropertyId,
      loading,
      error,
    ]
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}
