const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    // Public GET endpoints (hotel listing/details) benefit from caching;
    // callers can override via options.cache when freshness matters more
    // (e.g. availability checks).
    cache: options.cache || "no-store",
  });

  const json = await res.json();
  return json as ApiResponse<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
