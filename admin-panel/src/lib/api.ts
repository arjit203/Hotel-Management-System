const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export function setToken(token: string) {
  localStorage.setItem("admin_token", token);
}

export function clearToken() {
  localStorage.removeItem("admin_token");
}

export function getStoredAdmin(): { name: string; email: string; role: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("admin_info");
  return raw ? JSON.parse(raw) : null;
}

export function setStoredAdmin(admin: { name: string; email: string; role: string }) {
  localStorage.setItem("admin_info", JSON.stringify(admin));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getToken();

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      cache: "no-store",
    });
  } catch {
    // A dead backend used to reject this promise, which surfaced as an
    // unhandled error inside whichever page was loading. Returning the standard
    // envelope instead lets pages render their normal error state.
    return { success: false, message: "Cannot reach the API. Is the backend running?" };
  }

  // Global handling: an expired/invalid admin token should bounce to login.
  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { success: false, message: `Unexpected response from the server (${res.status}).` };
  }
}

export const adminApi = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", ...(body ? { body: JSON.stringify(body) } : {}) }),
  upload: uploadImage,
};

// Surfaces field-level validation messages (e.g. "slug: Invalid") when the API
// provides them, instead of just the generic top-level message ("Validation
// failed") which gave no clue which field or why. Falls back to res.message
// for non-validation errors (409 conflicts, 403s, etc.) which don't have a
// per-field breakdown. Shared across all admin-panel pages/forms (moved here
// from the hotel-detail page so the new room-edit page can reuse it too).
export function formatApiError(res: { message?: string; errors?: { field: string; message: string }[] }): string {
  if (res.errors && res.errors.length > 0) {
    return res.errors.map((e) => `${e.field}: ${e.message}`).join("\n");
  }
  return res.message || "Something went wrong. Please try again.";
}

// File upload (Cloudinary, via backend's POST /admin/hotels/upload-image).
// Kept separate from request() because file uploads must NOT set
// "Content-Type: application/json" — the browser sets its own multipart
// boundary header automatically when the body is a FormData instance.
export async function uploadImage(
  file: File,
  folder: string
): Promise<ApiResponse<{ url: string; publicId: string }>> {
  return uploadTo("/admin/hotels/upload-image", file, folder);
}

// Restaurant media goes through the Restaurant module's own upload route, which
// is guarded by RESTAURANT_MANAGER_ROLES and files into `7vachan/restaurant/*`
// on Cloudinary. Same request shape and same `{ url, publicId }` response as the
// hotel route — only the endpoint differs, so both share uploadTo() below.
export async function uploadRestaurantImage(
  file: File,
  folder: string
): Promise<ApiResponse<{ url: string; publicId: string }>> {
  return uploadTo("/admin/restaurants/upload-image", file, folder);
}

// Marriage Hall media, same arrangement again: its own RBAC-guarded route
// (hall_manager is allowed here and nowhere else) filing into `7vachan/hall/*`.
export async function uploadHallImage(
  file: File,
  folder: string
): Promise<ApiResponse<{ url: string; publicId: string }>> {
  return uploadTo("/admin/halls/upload-image", file, folder);
}

async function uploadTo(
  path: string,
  file: File,
  folder: string
): Promise<ApiResponse<{ url: string; publicId: string }>> {
  const token = getToken();
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API_BASE_URL}${path}?folder=${encodeURIComponent(folder)}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  // Mirror request()'s global 401 handling so an expired token during an upload
  // bounces to /login instead of silently failing.
  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    if (window.location.pathname !== "/login") window.location.href = "/login";
  }

  return (await res.json()) as ApiResponse<{ url: string; publicId: string }>;
}

/**
 * Unauthenticated GET against a public endpoint.
 *
 * Several admin screens read from the public `/hotels` and `/restaurants`
 * routes because those are the only endpoints that return the full aggregate
 * (rooms + gallery + offers + FAQs in one call). Behaviour is unchanged from
 * the raw `fetch` calls the pages used before — this just centralises the base
 * URL and the no-store cache policy.
 */
export async function publicGet<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { success: false, message: "Cannot reach the API. Is the backend running?" };
  }
}
