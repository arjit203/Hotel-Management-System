"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface ShellUiValue {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
}

const ShellUiContext = createContext<ShellUiValue | null>(null);

export function useShellUi() {
  const ctx = useContext(ShellUiContext);
  if (!ctx) throw new Error("useShellUi must be used within ShellUiProvider");
  return ctx;
}

const COLLAPSE_KEY = "admin_sidebar_collapsed";

/**
 * Chrome state that must survive route changes.
 *
 * It lives above the page tree (in Providers) rather than inside the shell
 * because every page mounts its own <RequireAdmin>, so anything held in the
 * shell's own useState would reset on each navigation.
 */
export function ShellUiProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const value = useMemo<ShellUiValue>(
    () => ({
      sidebarCollapsed,
      toggleSidebar,
      mobileNavOpen,
      openMobileNav: () => setMobileNavOpen(true),
      closeMobileNav: () => setMobileNavOpen(false),
    }),
    [sidebarCollapsed, toggleSidebar, mobileNavOpen]
  );

  return <ShellUiContext.Provider value={value}>{children}</ShellUiContext.Provider>;
}
