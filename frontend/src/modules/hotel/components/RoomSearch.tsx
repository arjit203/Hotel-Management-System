"use client";

import { useState } from "react";
import RoomCard, { RoomSummary } from "@/modules/hotel/components/RoomCard";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

// Feature 3 (Phase 3.6): dynamic room search. Renders the initial
// server-fetched `initialRooms` until the guest actually searches, then
// swaps to the filtered/sorted results from the search endpoint — reuses
// RoomCard for rendering either way, no duplicate room-card markup.
export default function RoomSearch({
  hotelSlug,
  initialRooms,
}: {
  hotelSlug: string;
  initialRooms: RoomSummary[];
}) {
  const [rooms, setRooms] = useState<RoomSummary[]>(initialRooms);
  const [filters, setFilters] = useState({
    checkInDate: "",
    checkOutDate: "",
    guests: "",
    minPrice: "",
    maxPrice: "",
    roomType: "",
    sortBy: "newest",
  });
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    const params = new URLSearchParams();
    if (filters.checkInDate) params.set("checkInDate", filters.checkInDate);
    if (filters.checkOutDate) params.set("checkOutDate", filters.checkOutDate);
    if (filters.guests) params.set("guests", filters.guests);
    if (filters.minPrice) params.set("minPrice", filters.minPrice);
    if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
    if (filters.roomType) params.set("roomType", filters.roomType);
    if (filters.sortBy) params.set("sortBy", filters.sortBy);

    try {
      const res = await fetch(`${API_BASE_URL}/hotels/${hotelSlug}/rooms/search?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) {
        setRooms(json.data);
        setHasSearched(true);
      }
    } finally {
      setSearching(false);
    }
  }

  function handleReset() {
    setFilters({
      checkInDate: "",
      checkOutDate: "",
      guests: "",
      minPrice: "",
      maxPrice: "",
      roomType: "",
      sortBy: "newest",
    });
    setRooms(initialRooms);
    setHasSearched(false);
  }

  return (
    <div>
      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "flex-end",
          border: "1px solid #e5e5e5",
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <label style={{ fontSize: 13 }}>
          Check-in
          <input
            type="date"
            value={filters.checkInDate}
            onChange={(e) => setFilters({ ...filters, checkInDate: e.target.value })}
            style={{ display: "block", padding: 6 }}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Check-out
          <input
            type="date"
            value={filters.checkOutDate}
            onChange={(e) => setFilters({ ...filters, checkOutDate: e.target.value })}
            style={{ display: "block", padding: 6 }}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Guests
          <input
            type="number"
            min={1}
            value={filters.guests}
            onChange={(e) => setFilters({ ...filters, guests: e.target.value })}
            style={{ display: "block", padding: 6, width: 70 }}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Min Price
          <input
            type="number"
            min={0}
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            style={{ display: "block", padding: 6, width: 90 }}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Max Price
          <input
            type="number"
            min={0}
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            style={{ display: "block", padding: 6, width: 90 }}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Room Type
          <select
            value={filters.roomType}
            onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}
            style={{ display: "block", padding: 6 }}
          >
            <option value="">Any</option>
            <option value="Deluxe">Deluxe</option>
            <option value="Executive">Executive</option>
            <option value="Luxury">Luxury</option>
            <option value="Suite">Suite</option>
          </select>
        </label>
        <label style={{ fontSize: 13 }}>
          Sort By
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            style={{ display: "block", padding: 6 }}
          >
            <option value="newest">Newest</option>
            <option value="price">Price</option>
            <option value="popularity">Popularity</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={searching}
          style={{ background: "#111", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}
        >
          {searching ? "Searching..." : "Search"}
        </button>
        {hasSearched && (
          <button
            type="button"
            onClick={handleReset}
            style={{ background: "none", border: "1px solid #ccc", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}
          >
            Reset
          </button>
        )}
      </form>

      {rooms.length === 0 ? (
        <p style={{ color: "#888" }}>No rooms match your search.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {rooms.map((room) => (
            <RoomCard key={room._id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}
