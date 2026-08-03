"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getStoredAdmin } from "./api";

export interface StoredAdmin {
  /** Present for anyone who signed in after the Users module shipped. */
  id?: string;
  name: string;
  email: string;
  role: string;
}

interface AdminSessionValue {
  admin: StoredAdmin | null;
  /** False until the first client-side read of localStorage has happened. */
  ready: boolean;
  isAuthenticated: boolean;
  signOut: () => void;
  refresh: () => void;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function useAdminSession() {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error("useAdminSession must be used within AdminSessionProvider");
  return ctx;
}

/**
 * Reads the admin identity that `lib/api.ts` stores in localStorage after login
 * and shares it with the shell, so the data providers below it know whether
 * there is any point issuing authenticated requests.
 *
 * This is strictly a client-side convenience — it grants nothing. Every admin
 * route is authorised again server-side by `authenticate("admin")` +
 * `requireRole(...)`; a tampered localStorage value just produces 401/403s.
 */
export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<StoredAdmin | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    const stored = getStoredAdmin();
    setAdmin(token && stored ? stored : null);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();

    // Signing out in one tab should sign out the others.
    function onStorage(e: StorageEvent) {
      if (e.key === "admin_token" || e.key === "admin_info") refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const signOut = useCallback(() => {
    clearToken();
    localStorage.removeItem("admin_info");
    setAdmin(null);
  }, []);

  const value = useMemo<AdminSessionValue>(
    () => ({ admin, ready, isAuthenticated: Boolean(admin), signOut, refresh }),
    [admin, ready, signOut, refresh]
  );

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}
