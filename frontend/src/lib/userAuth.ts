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

/**
 * "Remember me" is implemented purely as a CLIENT-SIDE STORAGE CHOICE:
 *   remember = true  → localStorage   (survives closing the browser)
 *   remember = false → sessionStorage (cleared when the tab/browser closes)
 *
 * It deliberately does NOT touch authentication logic. The JWT and its lifetime
 * are still issued and enforced entirely by the backend (JWT_EXPIRES_IN); this
 * only decides how long the browser holds on to the token it was given. Opting
 * out is the safer default on a shared or public machine.
 *
 * Reads check sessionStorage first, then localStorage, so a session-only login
 * always wins over a stale persisted one.
 */
function stores(): Storage[] {
  if (typeof window === "undefined") return [];
  return [window.sessionStorage, window.localStorage];
}

function readKey(key: string): string | null {
  for (const store of stores()) {
    const value = store.getItem(key);
    if (value) return value;
  }
  return null;
}

export function getUserToken(): string | null {
  return readKey(TOKEN_KEY);
}

export function setUserToken(token: string, remember = true) {
  if (typeof window === "undefined") return;
  // Clear both first so a re-login can't leave a stale copy in the other store.
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
  (remember ? window.localStorage : window.sessionStorage).setItem(TOKEN_KEY, token);
}

export function clearUserToken() {
  if (typeof window === "undefined") return;
  for (const store of [window.localStorage, window.sessionStorage]) {
    store.removeItem(TOKEN_KEY);
    store.removeItem(USER_KEY);
  }
}

export function getStoredUser(): StoredUser | null {
  const raw = readKey(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    // A corrupted entry shouldn't hard-crash every page that renders the header.
    return null;
  }
}

export function setStoredUser(user: StoredUser, remember = true) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(USER_KEY);
  (remember ? window.localStorage : window.sessionStorage).setItem(USER_KEY, JSON.stringify(user));
}
