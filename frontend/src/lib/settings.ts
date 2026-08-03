import { cache } from "react";
import { api } from "./api";

/**
 * Public platform settings.
 *
 * ── How this reaches a page ──
 * `getSettings()` is wrapped in React's `cache()`, so every server component in
 * one request that asks for settings shares a single fetch — the header, the
 * footer and three sections of the home page cost one call, not five. The
 * backend caches the read for a minute of its own, so the database is not
 * touched per request either.
 *
 * ── Why every getter takes a fallback ──
 * The public site must render when the API is down, when a category has never
 * been saved, and when a field is blank. Each accessor below falls back to the
 * value the page used to hardcode, so the worst case is the site looking exactly
 * as it did before this module existed — never an empty heading or a blank hero.
 */

export interface ValuePointSetting {
  icon?: string;
  title?: string;
  desc?: string;
}

export interface AmenitySetting {
  name?: string;
  icon?: string;
}

export type PublicSettings = Record<string, Record<string, unknown>>;

const EMPTY: PublicSettings = {};

export const getSettings = cache(async (): Promise<PublicSettings> => {
  /**
   * `no-store`, deliberately.
   *
   * The first version passed `cache: "force-cache"` *and* `next.revalidate`.
   * Next refuses that combination — it warns "only one should be specified" and
   * force-cache wins, so the very first response was pinned forever and edits
   * made in the admin panel never reached the site. The point of a CMS is that
   * a change shows up, so freshness beats the saved round trip here.
   *
   * The cost is one request per page render, and React's `cache()` above
   * collapses every call within a single render into that one request — the
   * header, the footer and three sections of the home page share it.
   */
  const res = await api.get<PublicSettings>("/settings", { cache: "no-store" });
  return res.success && res.data ? res.data : EMPTY;
});

// --------------------------------------------------------------- accessors

export function str(
  settings: PublicSettings,
  category: string,
  key: string,
  fallback = ""
): string {
  const value = settings[category]?.[key];
  // A blank string counts as "not set" — an empty heading is never the intent,
  // and clearing a field should restore the built-in copy rather than erase it.
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export function num(
  settings: PublicSettings,
  category: string,
  key: string,
  fallback: number
): number {
  const value = settings[category]?.[key];
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * A flag, defaulting to *on*.
 *
 * Deliberately asymmetric with `str`: only an explicit `false` hides a section.
 * A missing settings document, an unreachable API or a typo'd key must not
 * silently blank the website, so anything ambiguous means "show it".
 */
export function flag(
  settings: PublicSettings,
  category: string,
  key: string,
  fallback = true
): boolean {
  const value = settings[category]?.[key];
  return typeof value === "boolean" ? value : fallback;
}

export function list<T>(settings: PublicSettings, category: string, key: string): T[] {
  const value = settings[category]?.[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

// ---------------------------------------------------------------- helpers

/** Social links that are actually filled in, in display order. */
export function socialLinks(settings: PublicSettings): { key: string; label: string; href: string }[] {
  const order: [string, string][] = [
    ["instagram", "Instagram"],
    ["facebook", "Facebook"],
    ["youtube", "YouTube"],
    ["x", "X"],
    ["linkedin", "LinkedIn"],
    ["pinterest", "Pinterest"],
    ["tripadvisor", "Tripadvisor"],
    ["googleBusiness", "Google"],
  ];

  return order
    .map(([key, label]) => ({ key, label, href: str(settings, "social", key) }))
    .filter((s) => s.href.length > 0);
}

/** The postal address as one line, skipping the parts that are blank. */
export function addressLine(settings: PublicSettings): string {
  return [
    str(settings, "contact", "addressLine1"),
    str(settings, "contact", "addressLine2"),
    str(settings, "contact", "city"),
    str(settings, "contact", "state"),
    str(settings, "contact", "postalCode"),
  ]
    .filter(Boolean)
    .join(", ");
}
