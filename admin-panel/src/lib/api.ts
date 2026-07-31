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

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const json = await res.json();

  // Global handling: an expired/invalid admin token should bounce to login.
  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  return json as ApiResponse<T>;
}

export const adminApi = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
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
  const token = getToken();
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API_BASE_URL}/admin/hotels/upload-image?folder=${folder}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  return (await res.json()) as ApiResponse<{ url: string; publicId: string }>;
}
