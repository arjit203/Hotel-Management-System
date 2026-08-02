"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, Search, RotateCcw, X } from "lucide-react";
import RoomCard, { RoomSummary } from "@/modules/hotel/components/RoomCard";
import { SkeletonGrid } from "@/components/Skeleton";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { EASE_LUXE } from "@/components/motion/variants";
import Pagination from "@/components/ui/Pagination";
import { todayISO } from "@/lib/format";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";
const PAGE_SIZE = 6;

/**
 * Room search + filters + client-side pagination.
 *
 * Search behaviour, endpoint and query params are unchanged. Presentation
 * changes: the filter panel is a proper collapsible drawer on mobile (animated
 * height) and an always-open card on desktop, results fade out and shimmering
 * skeletons take their place while a search is in flight (rather than the grid
 * sitting stale under a "Searching…" label), and the result grid staggers in.
 */
export default function RoomSearch({
  hotelSlug,
  initialRooms,
}: {
  hotelSlug: string;
  initialRooms: RoomSummary[];
}) {
  const searchParams = useSearchParams();
  const [rooms, setRooms] = useState<RoomSummary[]>(initialRooms);
  const [filters, setFilters] = useState({
    checkInDate: searchParams.get("checkInDate") || "",
    checkOutDate: searchParams.get("checkOutDate") || "",
    guests: searchParams.get("guests") || "",
    minPrice: "",
    maxPrice: "",
    roomType: "",
    sortBy: "newest",
  });
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  async function runSearch(f: typeof filters) {
    setSearching(true);
    const params = new URLSearchParams();
    if (f.checkInDate) params.set("checkInDate", f.checkInDate);
    if (f.checkOutDate) params.set("checkOutDate", f.checkOutDate);
    if (f.guests) params.set("guests", f.guests);
    if (f.minPrice) params.set("minPrice", f.minPrice);
    if (f.maxPrice) params.set("maxPrice", f.maxPrice);
    if (f.roomType) params.set("roomType", f.roomType);
    if (f.sortBy) params.set("sortBy", f.sortBy);

    try {
      const res = await fetch(
        `${API_BASE_URL}/hotels/${hotelSlug}/rooms/search?${params.toString()}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (json.success) {
        setRooms(json.data);
        setHasSearched(true);
        setPage(1);
      }
    } finally {
      setSearching(false);
    }
  }

  // If the guest arrived from the Quick Booking Widget with dates/guests in the
  // URL, run the search automatically on first load.
  useEffect(() => {
    if (searchParams.get("checkInDate") || searchParams.get("guests")) {
      runSearch(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setShowFilters(false);
    runSearch(filters);
  }

  function handleReset() {
    const cleared = {
      checkInDate: "",
      checkOutDate: "",
      guests: "",
      minPrice: "",
      maxPrice: "",
      roomType: "",
      sortBy: "newest",
    };
    setFilters(cleared);
    setRooms(initialRooms);
    setHasSearched(false);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(rooms.length / PAGE_SIZE));
  const pageRooms = rooms.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const today = todayISO();

  // Was a local copy of the underline-input class string; now the shared
  // `.field-line-sm` component class (globals.css).
  const fieldClass = "field-line-sm";

  const filterFields = (
    <>
      <label className="block">
        <span className="field-label">Arrival</span>
        <input
          type="date"
          min={today}
          value={filters.checkInDate}
          onChange={(e) => setFilters({ ...filters, checkInDate: e.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="block">
        <span className="field-label">Departure</span>
        <input
          type="date"
          min={filters.checkInDate || today}
          value={filters.checkOutDate}
          onChange={(e) => setFilters({ ...filters, checkOutDate: e.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="block">
        <span className="field-label">Guests</span>
        <input
          type="number"
          min={1}
          placeholder="Any"
          value={filters.guests}
          onChange={(e) => setFilters({ ...filters, guests: e.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="block">
        <span className="field-label">Min Rate</span>
        <input
          type="number"
          min={0}
          placeholder="₹0"
          value={filters.minPrice}
          onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="block">
        <span className="field-label">Max Rate</span>
        <input
          type="number"
          min={0}
          placeholder="Any"
          value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="block">
        <span className="field-label">Category</span>
        <select
          value={filters.roomType}
          onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}
          className={fieldClass}
        >
          <option value="">Any</option>
          <option>Deluxe</option>
          <option>Executive</option>
          <option>Luxury</option>
          <option>Suite</option>
        </select>
      </label>
      <label className="block">
        <span className="field-label">Sort By</span>
        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          className={fieldClass}
        >
          <option value="newest">Newest</option>
          <option value="price">Rate</option>
          <option value="popularity">Popularity</option>
        </select>
      </label>
    </>
  );

  return (
    <div>
      {/* ── Result count + mobile filter toggle ── */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-[10px] uppercase tracking-luxe text-warm-500">
          {rooms.length} {rooms.length === 1 ? "Room Type" : "Room Types"}
          {hasSearched && " Matching"}
        </p>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border border-ink/12 px-5 py-2.5 text-[10px] uppercase tracking-luxe text-ink transition-colors duration-400 hover:border-gold hover:text-gold lg:hidden"
          aria-expanded={showFilters}
        >
          {showFilters ? <X size={13} /> : <SlidersHorizontal size={13} />}
          {showFilters ? "Close" : "Filters"}
        </button>
      </div>

      {/* ── Filters: animated drawer on mobile, static card on desktop ── */}
      <div className="mb-12">
        {/* Mobile */}
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE_LUXE }}
              className="overflow-hidden lg:hidden"
            >
              <form
                onSubmit={handleSearch}
                className="grid grid-cols-2 gap-x-5 gap-y-6 rounded-luxe border border-ink/[0.07] bg-white p-6 shadow-luxury"
              >
                {filterFields}
                <div className="col-span-2 flex flex-wrap gap-3 pt-2">
                  <button type="submit" disabled={searching} className="btn-primary group flex-1 disabled:opacity-60">
                    <Search size={14} /> {searching ? "Searching…" : "Search"}
                  </button>
                  {hasSearched && (
                    <button type="button" onClick={handleReset} className="btn-outline group">
                      <RotateCcw size={14} /> Reset
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop */}
        <form
          onSubmit={handleSearch}
          className="hidden items-end gap-6 rounded-luxe border border-ink/[0.07] bg-white p-7 shadow-luxury lg:grid lg:grid-cols-8"
        >
          {filterFields}
          <div className="flex flex-col gap-2">
            <button type="submit" disabled={searching} className="btn-primary group !px-5 disabled:opacity-60">
              <Search size={14} /> {searching ? "…" : "Search"}
            </button>
            {hasSearched && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-luxe text-warm-500 transition-colors hover:text-gold"
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── Results ── */}
      {searching ? (
        <SkeletonGrid count={3} />
      ) : pageRooms.length === 0 ? (
        <div className="py-20 text-center">
          <p className="section-title !text-2xl">No rooms match those dates</p>
          <p className="body-muted mx-auto mt-3 max-w-sm">
            Try widening your dates or clearing a filter — or call us and we&apos;ll find something.
          </p>
          {hasSearched && (
            <button onClick={handleReset} className="btn-outline group mt-8">
              <RotateCcw size={14} /> Clear Filters
            </button>
          )}
        </div>
      ) : (
        <Stagger key={`${page}-${rooms.length}`} className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {pageRooms.map((room, i) => (
            <StaggerItem key={room._id} className="flex">
              <RoomCard room={room} priority={i < 2} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* ── Pagination ── */}
      {!searching && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} label="Rooms pagination" />
      )}
    </div>
  );
}
