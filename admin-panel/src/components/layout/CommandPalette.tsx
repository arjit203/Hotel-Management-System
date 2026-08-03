"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { useBusiness } from "@/lib/businessContext";
import { useSummary } from "@/lib/summary";
import { consoleApi } from "@/lib/console";
import { buildNavSections } from "./navigation";

interface Entry {
  id: string;
  label: string;
  sublabel?: string;
  group: string;
  href: string;
  badge?: string;
}

/** How long to wait after the last keystroke before asking the server. */
const SEARCH_DEBOUNCE_MS = 220;

/**
 * ⌘K / Ctrl-K global search.
 *
 * ── Two tiers, deliberately ──
 * Navigation and the property list are filtered in memory and appear on the
 * first keystroke, because "take me to Offers" should never wait on a network
 * round trip. Everything else — customers, bookings, rooms, reservations, hall
 * enquiries, reviews, offers, FAQs — comes from `/admin/console/search`, which
 * queries the database and groups results by module.
 *
 * The earlier version filtered only what `SummaryProvider` happened to be
 * holding, which meant a booking outside the loaded window was simply
 * unfindable, and rooms, enquiries, reviews, offers and FAQs were not searchable
 * at all. Local results now render immediately and server groups slot in
 * underneath when they arrive.
 *
 * ── RBAC ──
 * The server decides which groups exist based on the caller's role, so a
 * restaurant manager's search never returns hotel bookings. Nothing is filtered
 * client-side; there is nothing to filter, because it never arrives.
 */
export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { business, hotels, restaurants } = useBusiness();
  const { bookings, reservations } = useSummary();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [remote, setRemote] = useState<Entry[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Discards a slow response whose query the user has already moved on from.
  const searchId = useRef(0);

  const entries = useMemo<Entry[]>(() => {
    const nav: Entry[] = buildNavSections(business)
      .flatMap((s) => s.items)
      .filter((i) => !i.disabled)
      .map((i) => ({ id: `nav-${i.href}`, label: i.label, group: "Navigate", href: i.href }));

    const properties: Entry[] = [
      ...hotels.map((h) => ({
        id: `hotel-${h._id}`,
        label: h.name,
        sublabel: "Hotel",
        group: "Properties",
        href: `/hotels/${h._id}`,
      })),
      ...restaurants.map((r) => ({
        id: `restaurant-${r._id}`,
        label: r.name,
        sublabel: "Restaurant",
        group: "Properties",
        href: `/restaurants/${r._id}`,
      })),
    ];

    const bookingEntries: Entry[] = bookings.slice(0, 200).map((b) => ({
      id: `booking-${b._id}`,
      label: b.bookingReference,
      sublabel: `${b.guestName} · ${b.status.replace(/_/g, " ")}`,
      group: "Bookings",
      href: `/bookings?ref=${encodeURIComponent(b.bookingReference)}`,
    }));

    const reservationEntries: Entry[] = reservations.slice(0, 200).map((r) => ({
      id: `reservation-${r._id}`,
      label: r.reservationReference,
      sublabel: `${r.guestName} · ${r.diningAreaName}`,
      group: "Reservations",
      href: `/reservations?ref=${encodeURIComponent(r.reservationReference)}`,
    }));

    return [...nav, ...properties, ...bookingEntries, ...reservationEntries];
  }, [business, hotels, restaurants, bookings, reservations]);

  const runSearch = useCallback(async (term: string) => {
    const id = ++searchId.current;
    setSearching(true);

    const res = await consoleApi.search(term);

    if (id !== searchId.current) return;
    setSearching(false);

    if (res.success && res.data) {
      setRemote(
        res.data.groups.flatMap((group) =>
          group.results.map((r) => ({
            id: `${group.key}-${r.id}`,
            label: r.title,
            sublabel: r.subtitle,
            group: group.label,
            href: r.href,
            badge: r.badge,
          }))
        )
      );
    } else {
      // A failed search should not blank the local results that already work.
      setRemote([]);
    }
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setRemote([]);
      setSearching(false);
      searchId.current++;
      return;
    }

    const timer = setTimeout(() => void runSearch(term), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      return entries.filter((e) => e.group === "Navigate" || e.group === "Properties").slice(0, 25);
    }

    const local = entries.filter(
      (e) => e.label.toLowerCase().includes(q) || (e.sublabel?.toLowerCase().includes(q) ?? false)
    );

    // Local bookings and reservations also come back from the server; dedupe on
    // the destination so the same record is not listed twice under two headings.
    const seen = new Set(local.map((e) => e.href));
    const merged = [...local, ...remote.filter((e) => !seen.has(e.href))];

    return merged.slice(0, 40);
  }, [entries, query, remote]);

  useEffect(() => setCursor(0), [query, remote]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    // Autofocus after the dialog paints.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === "Enter") {
        const picked = results[cursor];
        if (picked) {
          e.preventDefault();
          onClose();
          router.push(picked.href);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, results, cursor, onClose, router]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-modal flex animate-fade-in items-start justify-center bg-ink-900/40 p-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="w-full max-w-xl animate-scale-in overflow-hidden rounded-xl border border-line bg-white shadow-xl"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search size={16} className="shrink-0 text-ink-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guests, bookings, rooms, enquiries, reviews, pages…"
            aria-label="Search the admin console"
            className="w-full bg-transparent py-3.5 text-md text-ink-800 placeholder:text-ink-400 focus:outline-none"
          />
          {searching && <Loader2 size={14} className="shrink-0 animate-spin text-ink-400" />}
          <kbd className="kbd">Esc</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-base text-ink-500">
              {searching
                ? "Searching…"
                : query.trim().length === 1
                  ? "Type one more character to search records."
                  : `No matches for “${query}”.`}
            </p>
          ) : (
            results.map((entry, index) => {
              const showGroup = entry.group !== lastGroup;
              lastGroup = entry.group;
              return (
                <div key={entry.id}>
                  {showGroup && (
                    <p className="px-4 pb-1 pt-2.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                      {entry.group}
                    </p>
                  )}
                  <button
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => {
                      onClose();
                      router.push(entry.href);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
                      index === cursor ? "bg-brand-50" : "hover:bg-surface-muted"
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-medium text-ink-800">
                        {entry.label}
                      </span>
                      {entry.sublabel && (
                        <span className="block truncate text-xs text-ink-500">
                          {entry.sublabel}
                        </span>
                      )}
                    </span>
                    {entry.badge && <span className="badge-neutral shrink-0">{entry.badge}</span>}
                    {index === cursor && (
                      <CornerDownLeft size={13} className="shrink-0 text-ink-400" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
