"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { consoleApi, type NotificationItem } from "./console";
import { useAdminSession } from "./adminSession";

/**
 * Notification state, shared between the bell in the header and the
 * `/notifications` page.
 *
 * ── Why a provider and not a hook per component ──
 * The bell shows a count, the dropdown shows the list, and the page shows the
 * same list with filters. Three independent hooks would mean three polls and
 * three sources of truth for "is this read yet", so marking one read in the
 * dropdown would leave the page showing it unread. One provider, one fetch.
 *
 * ── Polling ──
 * Notifications are derived server-side from bookings, reservations and
 * enquiries, so there is nothing to push and no websocket in this stack. The
 * interval polls only the cheap `/notifications/count` endpoint, which is all
 * the bell badge needs. The full list (which the server derives from several
 * collections) is fetched only when someone looks at it: when the dropdown
 * opens, when the /notifications page mounts, and after a read-state change.
 * The interval is paused while the tab is hidden — a laptop left open
 * overnight should not spend the night polling.
 */

const POLL_INTERVAL_MS = 60_000;

interface NotificationContextValue {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  /** Fetch the full list (and count). Call when the list becomes visible. */
  reload: () => Promise<void>;
  /** Refresh only the unread badge count. */
  refreshCount: () => Promise<void>;
  markRead: (key: string) => Promise<void>;
  markUnread: (key: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,
  reload: async () => {},
  refreshCount: async () => {},
  markRead: async () => {},
  markUnread: async () => {},
  markAllRead: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, ready } = useAdminSession();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow response from a previous fetch overwriting a newer one.
  const requestId = useRef(0);
  const countRequestId = useRef(0);

  const refreshCount = useCallback(async () => {
    const id = ++countRequestId.current;
    // A list fetch started after this one carries a fresher count; let it win.
    const listIdAtStart = requestId.current;

    const res = await consoleApi.unreadCount();

    if (id !== countRequestId.current || listIdAtStart !== requestId.current) return;
    if (res.success && res.data) setUnreadCount(res.data.unreadCount);
  }, []);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);

    const res = await consoleApi.notifications({ limit: 50 });

    if (id !== requestId.current) return;
    setLoading(false);

    if (res.success && res.data) {
      setItems(res.data.items);
      setUnreadCount(res.data.unreadCount);
      setError(null);
    } else {
      setError(res.message || "Could not load notifications.");
    }
  }, []);

  // Only poll with a session. The login and password-reset pages have no token
  // yet; polling there just produces 401 redirects (which would bounce a reset
  // page back to /login).
  const enabled = ready && isAuthenticated;

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    void refreshCount();
  }, [enabled, refreshCount]);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer === null) timer = setInterval(() => void refreshCount(), POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshCount();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, refreshCount]);

  /**
   * Read/unread updates apply locally first and reconcile from the server
   * afterwards. Clicking a notification navigates away in the same tick, so
   * waiting for a round trip would show the item still bold until the next
   * poll.
   */
  const markRead = useCallback(async (key: string) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, read: true } : i)));
    setUnreadCount((c) => Math.max(0, c - 1));
    await consoleApi.markRead(key);
    await reload();
  }, [reload]);

  const markUnread = useCallback(async (key: string) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, read: false } : i)));
    setUnreadCount((c) => c + 1);
    await consoleApi.markUnread(key);
    await reload();
  }, [reload]);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnreadCount(0);
    await consoleApi.markAllRead();
    await reload();
  }, [reload]);

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      loading,
      error,
      reload,
      refreshCount,
      markRead,
      markUnread,
      markAllRead,
    }),
    [items, unreadCount, loading, error, reload, refreshCount, markRead, markUnread, markAllRead]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}
