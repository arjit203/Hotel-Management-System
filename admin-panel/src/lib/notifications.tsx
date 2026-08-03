"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { consoleApi, type NotificationItem } from "./console";

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
 * bell refreshes on an interval and on navigation, which for a back office
 * checked a few times an hour is the right amount of machinery. The interval is
 * paused while the tab is hidden — a laptop left open overnight should not spend
 * the night polling.
 */

const POLL_INTERVAL_MS = 60_000;

interface NotificationContextValue {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
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
  markRead: async () => {},
  markUnread: async () => {},
  markAllRead: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow response from a previous fetch overwriting a newer one.
  const requestId = useRef(0);

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

  // The login page has no token yet; polling there just produces 401 redirects.
  const enabled = pathname !== "/login";

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, pathname, reload]);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer === null) timer = setInterval(() => void reload(), POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void reload();
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
  }, [enabled, reload]);

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
  }, []);

  const markUnread = useCallback(async (key: string) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, read: false } : i)));
    setUnreadCount((c) => c + 1);
    await consoleApi.markUnread(key);
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnreadCount(0);
    await consoleApi.markAllRead();
  }, []);

  const value = useMemo(
    () => ({ items, unreadCount, loading, error, reload, markRead, markUnread, markAllRead }),
    [items, unreadCount, loading, error, reload, markRead, markUnread, markAllRead]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}
