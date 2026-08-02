"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  CheckCheck,
  ExternalLink,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  Star,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { clearToken } from "@/lib/api";
import { initials, humanise } from "@/lib/format";
import { useSummary } from "@/lib/summary";
import CommandPalette from "./CommandPalette";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

interface Props {
  admin: { name: string; email: string; role: string } | null;
  onOpenMobileNav: () => void;
}

interface NotificationEntry {
  id: string;
  title: string;
  detail: string;
  href: string;
  icon: typeof Bell;
  tone: "warning" | "info" | "brand";
}

/**
 * Sticky application header: mobile nav trigger, global search, notifications
 * and the profile menu.
 *
 * The notification tray is derived from data SummaryProvider already holds —
 * there is no notifications endpoint in the backend, and this redesign does not
 * invent one. Each entry links to the filtered list that resolves it.
 */
export default function Topbar({ admin, onOpenMobileNav }: Props) {
  const router = useRouter();
  const { stats, loading, reload } = useSummary();
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

  const notifications: NotificationEntry[] = [];
  if (stats.pendingBookings > 0) {
    notifications.push({
      id: "pending-bookings",
      title: `${stats.pendingBookings} booking${stats.pendingBookings === 1 ? "" : "s"} awaiting payment`,
      detail: "Created but not yet paid — the room is not held.",
      href: "/bookings?status=pending",
      icon: CalendarClock,
      tone: "warning",
    });
  }
  if (stats.pendingReviews > 0) {
    notifications.push({
      id: "pending-reviews",
      title: `${stats.pendingReviews} review${stats.pendingReviews === 1 ? "" : "s"} to moderate`,
      detail: "Not visible on the public site until approved.",
      href: "/reviews?status=pending",
      icon: Star,
      tone: "brand",
    });
  }
  if (stats.todaysCheckIns > 0) {
    notifications.push({
      id: "todays-checkins",
      title: `${stats.todaysCheckIns} check-in${stats.todaysCheckIns === 1 ? "" : "s"} today`,
      detail: "Hotel arrivals scheduled for today.",
      href: "/bookings?window=today",
      icon: CalendarClock,
      tone: "info",
    });
  }
  if (stats.todaysReservations > 0) {
    notifications.push({
      id: "todays-reservations",
      title: `${stats.todaysReservations} table reservation${stats.todaysReservations === 1 ? "" : "s"} today`,
      detail: "Restaurant covers booked for today.",
      href: "/reservations?window=today",
      icon: CalendarClock,
      tone: "info",
    });
  }

  function handleLogout() {
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
              aria-label={`Notifications${notifications.length ? ` (${notifications.length})` : ""}`}
              aria-expanded={notificationsOpen}
              className="btn-icon relative"
            >
              <Bell size={16} />
              {notifications.length > 0 && (
                <span className="absolute right-1 top-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-danger-500 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-danger-500" />
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 z-drawer mt-1.5 w-[20rem] animate-scale-in overflow-hidden rounded-lg border border-line bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
                  <p className="text-sm font-semibold text-ink-800">Needs attention</p>
                  {notifications.length > 0 && (
                    <span className="badge-brand">{notifications.length}</span>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-3.5 py-8 text-center">
                    <CheckCheck size={18} className="mx-auto text-success-600" />
                    <p className="mt-2 text-base text-ink-600">You&apos;re all caught up.</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      Nothing is pending across Hotel and Restaurant.
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto py-1">
                    {notifications.map((n) => {
                      const Icon = n.icon;
                      return (
                        <li key={n.id}>
                          <Link
                            href={n.href}
                            onClick={() => setNotificationsOpen(false)}
                            className="flex gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-surface-muted"
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                                n.tone === "warning"
                                  ? "bg-warning-50 text-warning-600"
                                  : n.tone === "brand"
                                    ? "bg-brand-50 text-brand-600"
                                    : "bg-info-50 text-info-600"
                              )}
                            >
                              <Icon size={14} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-base font-medium text-ink-800">
                                {n.title}
                              </span>
                              <span className="block text-xs text-ink-500">{n.detail}</span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
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
