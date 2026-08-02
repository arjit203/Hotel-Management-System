"use client";

import { useCallback, useEffect, useState } from "react";
import { publicGet } from "./api";
import { useBusiness } from "./businessContext";
import type { GalleryItem } from "@/components/content/GalleryManager";
import type { OfferItem } from "@/components/content/OffersManager";
import type { FaqItem } from "@/components/content/FaqManager";

interface ActiveContent {
  gallery: GalleryItem[];
  offers: OfferItem[];
  faqs: FaqItem[];
}

const EMPTY: ActiveContent = { gallery: [], offers: [], faqs: [] };

/**
 * Loads gallery / offers / FAQs for whichever property the business selector is
 * pointing at, so the cross-vertical Gallery, Offers and FAQs pages can reuse
 * the same managers the property workspaces use.
 *
 * All three verticals' aggregates are shaped the same for these collections,
 * which is why one hook covers Hotel, Restaurant and Marriage Hall.
 */
export function useActiveContent() {
  const { business, activeProperty, loading: propertiesLoading } = useBusiness();

  const [content, setContent] = useState<ActiveContent>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const slug = activeProperty?.slug;
  const collection =
    business === "restaurant" ? "restaurants" : business === "hall" ? "halls" : "hotels";

  useEffect(() => {
    if (propertiesLoading) return;

    if (!slug) {
      setContent(EMPTY);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const res = await publicGet<ActiveContent>(`/${collection}/${slug}`);
      if (cancelled) return;

      if (res.success && res.data) {
        setContent({
          gallery: res.data.gallery ?? [],
          offers: res.data.offers ?? [],
          faqs: res.data.faqs ?? [],
        });
      } else {
        setError(res.message || "Could not load this property's content.");
        setContent(EMPTY);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, collection, propertiesLoading, reloadToken]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  return {
    ...content,
    loading: loading || propertiesLoading,
    error,
    reload,
    /** The admin base path the content managers post to. */
    basePath:
      business === "restaurant"
        ? "/admin/restaurants"
        : business === "hall"
          ? "/admin/halls"
          : "/admin/hotels",
    ownerId: activeProperty?._id ?? "",
    property: activeProperty,
  };
}
