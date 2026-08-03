import { adminApi } from "./api";

/**
 * Typed client for `/admin/settings`.
 *
 * ── The one thing to know before writing a form against this ──
 * A secret field always reads back as `""`. The server never returns a stored
 * secret in plaintext; it returns a mask in `secretHints` instead. So:
 *
 *   • leave a secret input blank → the stored value is kept
 *   • type a new value          → it replaces the stored one
 *   • send `"__clear__"`        → it is deleted
 *
 * That is what makes "change the SMTP port without retyping the password" work.
 * A form that naively submits its own empty string for every untouched field is
 * therefore safe here, which is the opposite of the usual danger.
 */

export const SETTING_CATEGORIES = [
  "general",
  "business",
  "branding",
  "contact",
  "social",
  "homepage",
  "theme",
  "booking",
  "payment",
  "email",
  "seo",
  "legal",
  "features",
  "integrations",
  "maintenance",
] as const;

export type SettingCategory = (typeof SETTING_CATEGORIES)[number];

export interface CategoryPayload {
  values: Record<string, unknown>;
  secretHints: Record<string, string>;
}

export type AllSettings = Record<SettingCategory, CategoryPayload>;

/** Sentinel understood by the server as "delete this secret". */
export const CLEAR_SECRET = "__clear__";

export const settingsApi = {
  getAll: () => adminApi.get<AllSettings>("/admin/settings"),

  getCategory: (category: SettingCategory) =>
    adminApi.get<CategoryPayload>(`/admin/settings/${category}`),

  /** Partial patch — only the keys you send are touched. */
  update: (category: SettingCategory, patch: Record<string, unknown>) =>
    adminApi.put<CategoryPayload>(`/admin/settings/${category}`, patch),

  reset: (category: SettingCategory) =>
    adminApi.delete<{ values: Record<string, unknown> }>(`/admin/settings/${category}`),
};

/**
 * Branding uploads go to the Settings module's own Cloudinary route rather than
 * the hotel's, because that one is guarded by `HOTEL_MANAGER_ROLES` — reusing it
 * would let a hotel manager replace the site logo.
 */
export async function uploadSettingsImage(
  file: File,
  folder: string
): Promise<{ success: boolean; message?: string; data?: { url: string; publicId: string } }> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const formData = new FormData();
  formData.append("image", file);

  try {
    // No JSON content type — the browser sets its own multipart boundary.
    const res = await fetch(
      `${base}/admin/settings/upload-image?folder=${encodeURIComponent(folder)}`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }
    );
    return await res.json();
  } catch {
    return { success: false, message: "Cannot reach the API. Is the backend running?" };
  }
}
