"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, Search, RotateCcw } from "lucide-react";
import RoomCard, { RoomSummary } from "@/modules/hotel/components/RoomCard";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";
const PAGE_SIZE = 6;

// Feature 3 (Phase 3.6), restyled + paginated for Phase 3.7's dedicated
// /hotel/rooms page. Renders the initial server-fetched `initialRooms` until
// the guest searches, then swaps to filtered/sorted results from the search
// endpoint. Pagination is client-side (the search API returns the full
// filtered set) — no backend change needed for this, per Phase 3.7 scope.
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
      const res = await fetch(`${API_BASE_URL}/hotels/${hotelSlug}/rooms/search?${params.toString()}`, {
        cache: "no-store",
      });
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

  // If the guest arrived from the Quick Booking Widget with dates/guests in
  // the URL, run the search automatically on first load.
  useEffect(() => {
    if (searchParams.get("checkInDate") || searchParams.get("guests")) {
      runSearch(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
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

  const inputClass =
    "w-full text-sm px-3 py-2.5 rounded-xl border border-ink/10 focus:outline-none focus:border-gold bg-white";

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-ink/60 text-sm">{rooms.length} room type(s) found</p>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="lg:hidden inline-flex items-center gap-1.5 text-sm text-ink border border-ink/15 rounded-full px-4 py-2"
        >
          <SlidersHorizontal size={15} /> Filters
        </button>
      </div>

      <form
        onSubmit={handleSearch}
        className={`${showFilters ? "grid" : "hidden"} lg:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 bg-white border border-ink/5 rounded-2xl p-5 mb-10 shadow-luxury items-end`}
      >
        <label className="text-xs text-ink/50">
          Check-in
          <input
            type="date"
            value={filters.checkInDate}
            onChange={(e) => setFilters({ ...filters, checkInDate: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="text-xs text-ink/50">
          Check-out
          <input
            type="date"
            value={filters.checkOutDate}
            onChange={(e) => setFilters({ ...filters, checkOutDate: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="text-xs text-ink/50">
          Guests
          <input
            type="number"
            min={1}
            value={filters.guests}
            onChange={(e) => setFilters({ ...filters, guests: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="text-xs text-ink/50">
          Min Price
          <input
            type="number"
            min={0}
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="text-xs text-ink/50">
          Max Price
          <input
            type="number"
            min={0}
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="text-xs text-ink/50">
          Room Type
          <select
            value={filters.roomType}
            onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}
            className={inputClass}
          >
            <option value="">Any</option>
            <option>Deluxe</option>
            <option>Executive</option>
            <option>Luxury</option>
            <option>Suite</option>
          </select>
        </label>
        <label className="text-xs text-ink/50">
          Sort By
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className={inputClass}
          >
            <option value="newest">Newest</option>
            <option value="price">Price</option>
            <option value="popularity">Popularity</option>
          </select>
        </label>

        <div className="col-span-2 sm:col-span-3 lg:col-span-7 flex gap-3 pt-1">
          <button type="submit" disabled={searching} className="btn-primary text-sm">
            <Search size={15} /> {searching ? "Searching..." : "Search"}
          </button>
          {hasSearched && (
            <button type="button" onClick={handleReset} className="btn-outline text-sm">
              <RotateCcw size={15} /> Reset
            </button>
          )}
        </div>
      </form>

      {pageRooms.length === 0 ? (
        <p className="text-center text-ink/50 py-16">No rooms match your search.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {pageRooms.map((room) => (
            <RoomCard key={room._id} room={room} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                p === page ? "bg-ink text-cream" : "bg-white text-ink/60 border border-ink/10 hover:border-gold"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
