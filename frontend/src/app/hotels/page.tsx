import { Metadata } from "next";
import HotelCard, { HotelSummary } from "@/modules/hotel/components/HotelCard";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export const metadata: Metadata = {
  title: "Hotels — 7 Vachan",
  description: "Browse our hotel rooms — Deluxe, Executive, Luxury, and Suite options available.",
};

async function getHotels(): Promise<HotelSummary[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/hotels`, { cache: "no-store" });
    const json = await res.json();
    return json.success ? json.data : [];
  } catch {
    return [];
  }
}

export default async function HotelsPage() {
  const hotels = await getHotels();

  return (
    <main style={{ padding: "2rem", maxWidth: 1100, margin: "0 auto" }}>
      <h1>Our Hotels</h1>
      {hotels.length === 0 ? (
        <p>No hotels available right now. Please check back soon.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
            marginTop: 24,
          }}
        >
          {hotels.map((hotel) => (
            <HotelCard key={hotel._id} hotel={hotel} />
          ))}
        </div>
      )}
    </main>
  );
}
