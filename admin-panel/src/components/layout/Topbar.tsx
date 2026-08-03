"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BedDouble,
  CalendarClock,
  CheckCheck,
  CreditCard,
  ExternalLink,
  LogOut,
  Menu,
  PartyPopper,
  RefreshCw,
  Search,
  Settings,
  Star,
  UserRound,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { adminApi, clearToken } from "@/lib/api";
import { initials, humanise, relativeTime } from "@/lib/format";
import { useSummary } from "@/lib/summary";
import { useNotifications } from "@/lib/notifications";
import type { ActivityType } from "@/lib/console";
import CommandPalette from "./CommandPalette";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

interface Props {
  admin: { name: string; email: string; role: string } | null;
  onOpenMobileNav: () => void;
}

/** Icon per activity type, so a glance at the tray tells you the kind of event. */
const NOTIFICATION_ICON: Record<ActivityType, typeof Bell> = {
  booking_created: BedDouble,
  booking_cancelled: XCircle,
  payment_received: CreditCard,
  reservation_created: UtensilsCrossed,
  reservation_cancelled: XCircle,
  enquiry_created: PartyPopper,
  review_submitted: Star,
  offer_published: Star,
};

/**
 * Sticky application header: mobile nav trigger, global search, notifications
 * and the profile menu.
 *
 * The tray now reads the real notification centre (`/admin/console/notifications`),
 * which derives its items from bookings, reservations, enquiries and reviews and
 * layers per-admin read state on top. It replaces the earlier version, which
 * rendered counters held by SummaryProvider because no notifications endpoint
 * existed yet — those counters are still useful, so they remain underneath as a
 * "needs attention" block that summarises what is outstanding rather than what
 * just happened.
 */
export default function Topbar({ admin, onOpenMobileNav }: Props) {
  const router = useRouter();
  const { stats, loading, reload } = useSummary();
  const {
    items: notifications,
    unreadCount,
    markRead,
    markAllRead,
    reload: reloadNotifications,
  } = useNotifications();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl-K opens search from anywhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const attention: { id: string; label: string; href: string }[] = [];
  if (stats.pendingBookings > 0) {
    attention.push({
      id: "pending-bookings",
      label: `${stats.pendingBookings} booking${stats.pendingBookings === 1 ? "" : "s"} awaiting payment`,
      href: "/bookings?status=pending",
    });
  }
  if (stats.pendingEnquiries > 0) {
    attention.push({
      id: "pending-enquiries",
      label: `${stats.pendingEnquiries} hall enquir${stats.pendingEnquiries === 1 ? "y" : "ies"} to answer`,
      href: "/enquiries?open=true",
    });
  }
  if (stats.pendingReviews > 0) {
    attention.push({
      id: "pending-reviews",
      label: `${stats.pendingReviews} review${stats.pendingReviews === 1 ? "" : "s"} to moderate`,
      href: "/reviews?status=pending",
    });
  }
  if (stats.todaysCheckIns > 0) {
    attention.push({
      id: "todays-checkins",
      label: `${stats.todaysCheckIns} check-in${stats.todaysCheckIns === 1 ? "" : "s"} today`,
      href: "/bookings?window=today",
    });
  }
  if (stats.todaysReservations > 0) {
    attention.push({
      id: "todays-reservations",
      label: `${stats.todaysReservations} table reservation${stats.todaysReservations === 1 ? "" : "s"} today`,
      href: "/reservations?window=today",
    });
  }

  const recent = notifications.slice(0, 8);

  async function handleLogout() {
    // Fire-and-forget: this only closes the audit trail. The token is not
    // invalidated server-side (there is no blocklist), so a failed call must
    // not stop the sign-out the person actually asked for.
    void adminApi.post("/auth/admin/logout", {});
    clearToken();
    localStorage.removeItem("admin_info");
    router.push("/login");
  }

  return (
    <>
      <header className="sticky top-0 z-topbar flex h-14 items-center gap-2 border-b border-line bg-white/85 px-3 backdrop-blur-md sm:px-4">
        <button
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
          className="btn-icon lg:hidden"
        >
          <Menu size={18} />
        </button>

        {/* Search */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex h-9 flex-1 items-center gap-2 rounded-md border border-line-strong bg-surface-hover px-3 text-left text-sm text-ink-500 transition-colors hover:bg-white sm:max-w-md"
        >
          <Search size={15} className="shrink-0" />
          <span className="flex-1 truncate">Search bookings, properties, pages…</span>
          <kbd className="kbd hidden sm:inline-flex">Ctrl K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={reload}
            aria-label="Refresh data"
            title="Refresh data"
            className="btn-icon hidden sm:inline-flex"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
          </button>

          <a
            href={PUBLIC_SITE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Open the public website"
            title="Open the public website"
            className="btn-icon hidden sm:inline-flex"
          >
            <ExternalLink size={16} />
          </a>

          {/* Notifications */}
          <div ref={notificationsRef} className="relative">
            <button
              onClick={() => {
                setNotificationsOpen((v) => !v);
                setProfileOpen(false);
              }}
              aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
              aria-expanded={notificationsOpen}
              className="btn-icon relative"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                // A number rather than a dot: "3 things happened" and "40 things
                // happened" call for different reactions.
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold leading-none text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 z-drawer mt-1.5 w-[22rem] animate-scale-in overflow-hidden rounded-lg border border-line bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
                  <p className="text-sm font-semibold text-ink-800">
                    Notifications
                    {unreadCount > 0 && <span className="badge-brand ml-2">{unreadCount} new</span>}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => void reloadNotifications()}
                      className="rounded p-1 text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-700"
                      aria-label="Refresh notifications"
                      title="Refresh"
                    >
                      <RefreshCw size={13} />
                    </button>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => void markAllRead()}
                        className="rounded px-1.5 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                {recent.length === 0 ? (
                  <div className="px-3.5 py-8 text-center">
                    <CheckCheck size={18} className="mx-auto text-success-600" />
                    <p className="mt-2 text-base text-ink-600">Nothing new.</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      Bookings, reservations, enquiries and reviews appear here as they arrive.
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto py-1">
                    {recent.map((n) => {
                      const Icon = NOTIFICATION_ICON[n.type] ?? Bell;
                      return (
                        <li key={n.key}>
                          <Link
                            href={n.href}
                            onClick={() => {
                              setNotificationsOpen(false);
                              if (!n.read) void markRead(n.key);
                            }}
                            className={cn(
                              "flex gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-surface-muted",
                              !n.read && "bg-brand-50/40"
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                                n.tone === "warning"
                                  ? "bg-warning-50 text-warning-600"
                                  : n.tone === "success"
                                    ? "bg-success-50 text-success-600"
                                    : n.tone === "brand"
                                      ? "bg-brand-50 text-brand-600"
                                      : "bg-info-50 text-info-600"
                              )}
                            >
                              <Icon size={14} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  "block truncate text-base text-ink-800",
                                  n.read ? "font-normal" : "font-semibold"
                                )}
                              >
                                {n.title}
                              </span>
                              <span className="block truncate text-xs text-ink-500">{n.detail}</span>
                              <span className="mt-0.5 block text-xs text-ink-400">
                                {relativeTime(n.at)}
                              </span>
                            </span>
                            {!n.read && (
                              <span
                                aria-hidden="true"
                                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600"
                              />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {attention.length > 0 && (
                  <div className="border-t border-line bg-surface-muted/60 px-3.5 py-2.5">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                      Needs attention
                    </p>
                    <ul className="space-y-1">
                      {attention.map((a) => (
                        <li key={a.id}>
                          <Link
                            href={a.href}
                            onClick={() => setNotificationsOpen(false)}
                            className="flex items-center gap-1.5 text-xs text-ink-600 hover:text-brand-600"
                          >
                            <CalendarClock size={12} className="shrink-0" />
                            {a.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Link
                  href="/notifications"
                  onClick={() => setNotificationsOpen(false)}
                  className="block border-t border-line px-3.5 py-2.5 text-center text-xs font-medium text-brand-600 transition-colors hover:bg-surface-muted"
                >
                  See all notifications
                </Link>
              </div>
            )}
          </div>

          {/* Profile */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotificationsOpen(false);
              }}
              aria-label="Account menu"
              aria-expanded={profileOpen}
              className="ml-1 flex items-center gap-2 rounded-md py-1 pl-1 pr-1.5 transition-colors hover:bg-surface-muted"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                {initials(admin?.name)}
              </span>
              <span className="hidden min-w-0 text-left md:block">
                <span className="block max-w-[9rem] truncate text-sm font-medium text-ink-800">
                  {admin?.name || "Admin"}
                </span>
                <span className="block text-xs text-ink-500">
                  {admin ? humanise(admin.role) : ""}
                </span>
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 z-drawer mt-1.5 w-60 animate-scale-in overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg">
                <div className="border-b border-line px-3.5 py-2.5">
                  <p className="truncate text-base font-medium text-ink-800">
                    {admin?.name || "Admin"}
                  </p>
                  <p className="truncate text-xs text-ink-500">{admin?.email}</p>
                  <span className="badge-neutral mt-1.5">
                    {admin ? humanise(admin.role) : "—"}
                  </span>
                </div>
                <Link
                  href="/users"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-base text-ink-700 hover:bg-surface-muted"
                >
                  <UserRound size={15} />
                  Your profile
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-base text-ink-700 hover:bg-surface-muted"
                >
                  <Settings size={15} />
                  Settings
                </Link>
                <div className="my-1 h-px bg-line" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-base text-danger-600 hover:bg-danger-50"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
