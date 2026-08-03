import { adminApi } from "./api";

/**
 * Typed client for `/admin/console/*` — the activity timeline, notification
 * centre, global search and exports.
 *
 * These endpoints are *scoped* rather than role-gated: every admin can call
 * them, and the server narrows what comes back to the caller's own verticals.
 * So nothing here checks a role before fetching; if a hall manager loads the
 * dashboard, the server simply returns hall activity.
 */

export type ActivityModule = "hotel" | "restaurant" | "hall";

export type ActivityType =
  | "booking_created"
  | "booking_cancelled"
  | "payment_received"
  | "reservation_created"
  | "reservation_cancelled"
  | "enquiry_created"
  | "review_submitted"
  | "offer_published";

export interface ActivityItem {
  /** `type:sourceId` — stable across reads, used as the read-state key. */
  key: string;
  type: ActivityType;
  module: ActivityModule;
  title: string;
  detail: string;
  href: string;
  at: string;
  tone: "info" | "success" | "warning" | "brand";
  amount?: number;
  reference?: string;
}

export interface NotificationItem extends ActivityItem {
  read: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
}

export interface SearchGroup {
  key: string;
  label: string;
  module: ActivityModule | "platform";
  results: SearchResult[];
}

export interface ExportDataset {
  key: string;
  label: string;
  description: string;
  formats: ("csv" | "xlsx" | "pdf")[];
  module: ActivityModule | null;
  /** False when the caller's role does not cover this dataset. */
  allowed: boolean;
}

export const consoleApi = {
  activity: (params: { limit?: number; days?: number; module?: ActivityModule } = {}) =>
    adminApi.get<{ items: ActivityItem[]; scope: ActivityModule[] }>(
      `/admin/console/activity${query(params)}`
    ),

  notifications: (params: { limit?: number; unreadOnly?: boolean } = {}) =>
    adminApi.get<{ items: NotificationItem[]; unreadCount: number }>(
      `/admin/console/notifications${query(params)}`
    ),

  unreadCount: () => adminApi.get<{ unreadCount: number }>("/admin/console/notifications/count"),

  markRead: (notificationKey: string) =>
    adminApi.put<null>("/admin/console/notifications/read", { notificationKey }),

  markUnread: (notificationKey: string) =>
    adminApi.put<null>("/admin/console/notifications/unread", { notificationKey }),

  markAllRead: () => adminApi.put<null>("/admin/console/notifications/read-all", {}),

  search: (q: string) =>
    adminApi.get<{ query: string; groups: SearchGroup[]; total: number }>(
      `/admin/console/search?q=${encodeURIComponent(q)}`
    ),

  exports: () => adminApi.get<{ datasets: ExportDataset[] }>("/admin/console/exports"),
};

function query(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== false);
  if (entries.length === 0) return "";
  return `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")}`;
}

/**
 * Triggers a file download.
 *
 * Exports are behind `authenticate("admin")`, so a plain `<a href>` would arrive
 * without the bearer token and bounce to the login page. Fetching with the
 * header and handing the browser a blob URL is the only way to download an
 * authenticated file without putting the token in the query string, where it
 * would end up in server logs and browser history.
 */
export async function downloadExport(
  dataset: string,
  format: string,
  range: { from?: string; to?: string } = {}
): Promise<{ ok: true } | { ok: false; message: string }> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  const suffix = params.toString() ? `?${params}` : "";

  let res: Response;
  try {
    res = await fetch(`${base}/admin/console/exports/${dataset}/${format}${suffix}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
  } catch {
    return { ok: false, message: "Cannot reach the API. Is the backend running?" };
  }

  if (!res.ok) {
    // Errors come back as the normal JSON envelope, not as a file.
    try {
      const body = await res.json();
      return { ok: false, message: body.message || `Export failed (${res.status}).` };
    } catch {
      return { ok: false, message: `Export failed (${res.status}).` };
    }
  }

  const blob = await res.blob();
  const filename =
    res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
    `7vachan-${dataset}.${format}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in Safari; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { ok: true };
}
