// Customer (User) auth token storage — mirrors the admin-panel's lib/api.ts
// token pattern but under separate localStorage keys, since this is a
// completely separate actor type (JWT secret, role, etc. — see AI_INSTRUCTIONS.md
// / backend auth.middleware.ts's authenticate('user') vs authenticate('admin')).

const TOKEN_KEY = "user_token";
const USER_KEY = "user_info";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
}

export function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setUserToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearUserToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user: StoredUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
