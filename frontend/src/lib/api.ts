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
  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
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
  } catch {
    // An unreachable API used to reject this promise. Every caller does
    // `if (!res.success)`, so nobody was catching it — a backend that is down,
    // restarting, or simply slower to boot than the frontend produced an
    // unhandled rejection and a failed render instead of the form's own error
    // message. Returning the standard envelope keeps that handling in one place.
    return {
      success: false,
      message: "We can't reach our servers right now. Please try again in a moment.",
    };
  }

  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    // A non-JSON body (proxy error page, 502 HTML) would otherwise throw here.
    return {
      success: false,
      message: `Something went wrong (${res.status}). Please try again.`,
    };
  }
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
