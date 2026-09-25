import type { BusinessKey } from "./businessContext";

/**
 * Client-side mirror of the backend's role → vertical mapping.
 *
 * This is presentation only: it decides which verticals the shell offers and
 * which admin lists are worth fetching. It grants nothing — every admin route
 * is authorised again server-side by `requireRole(...)`, so a tampered role in
 * localStorage just produces 403s.
 */
export const ALL_BUSINESSES: BusinessKey[] = ["hotel", "restaurant", "hall"];

const MANAGER_VERTICAL: Record<string, BusinessKey> = {
  hotel_manager: "hotel",
  restaurant_manager: "restaurant",
  hall_manager: "hall",
};

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === "super_admin";
}

/** The single vertical a `*_manager` owns, or null for super_admin / unknown roles. */
export function managerVertical(role: string | null | undefined): BusinessKey | null {
  return role ? MANAGER_VERTICAL[role] ?? null : null;
}

/**
 * Verticals this role may work in. super_admin gets all three; a manager gets
 * its own; an unknown (retired) role gets none — the API refuses it anyway.
 */
export function allowedBusinesses(role: string | null | undefined): BusinessKey[] {
  if (isSuperAdmin(role)) return ALL_BUSINESSES;
  const own = managerVertical(role);
  return own ? [own] : [];
}

export function canAccessBusiness(role: string | null | undefined, key: BusinessKey): boolean {
  return allowedBusinesses(role).includes(key);
}
