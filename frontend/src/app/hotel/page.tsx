import { Metadata } from "next";
import { notFound } from "next/navigation";
import StarRating from "@/components/StarRating";
import GalleryGrid from "@/components/GalleryGrid";
import FaqAccordion from "@/components/FaqAccordion";
import MapPlaceholder from "@/components/MapPlaceholder";
import RoomCard from "@/modules/hotel/components/RoomCard";
import ReviewForm from "@/modules/hotel/components/ReviewForm";
import { getTheHotel } from "@/lib/hotel";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTheHotel();
  if (!data) return {};

  return {
    title: data.hotel.metaTitle || `${data.hotel.name} — 7 Vachan`,
    description: data.hotel.metaDescription || data.hotel.description.slice(0, 155),
  };
}

export default async function HotelPage() {
  const data = await getTheHotel();
  if (!data) return notFound();

  const { hotel, rooms, gallery, faqs, offers, reviewSummary, reviews } = data;

  return (
    <main style={{ padding: "2rem", maxWidth: 1100, margin: "0 auto" }}>
      <h1>{hotel.name}</h1>
      <StarRating rating={hotel.starRating} />
      <p style={{ color: "#666" }}>{hotel.address}</p>
      <p>{hotel.description}</p>

      {offers.length > 0 && (
        <section style={{ background: "#fff7e6", padding: 16, borderRadius: 8, margin: "16px 0" }}>
          <h3>Current Offers</h3>
          {offers.map((o) => (
            <p key={o._id}>
              <strong>{o.title}</strong> — {o.description}
            </p>
          ))}
        </section>
      )}

      <section style={{ margin: "24px 0" }}>
        <h2>Amenities</h2>
        <ul style={{ display: "flex", flexWrap: "wrap", gap: 12, listStyle: "none", padding: 0 }}>
          {hotel.amenities.map((a) => (
            <li key={a.name} style={{ background: "#f2f2f2", padding: "6px 12px", borderRadius: 20 }}>
              {a.name}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ margin: "24px 0" }} id="rooms">
        <h2>Rooms</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {rooms.map((room) => (
            <RoomCard key={room._id} room={room} />
          ))}
        </div>
      </section>

      {gallery.length > 0 && (
        <section style={{ margin: "24px 0" }}>
          <h2>Gallery</h2>
          <GalleryGrid images={gallery} />
        </section>
      )}

      <section style={{ margin: "24px 0" }}>
        <h2>
          Reviews {reviewSummary.count > 0 && `(${reviewSummary.average} ★ · ${reviewSummary.count})`}
        </h2>
        {reviews.length === 0 ? (
          <p style={{ color: "#888" }}>No reviews yet.</p>
        ) : (
          reviews.map((r) => (
            <div key={r._id} style={{ borderBottom: "1px solid #eee", padding: "12px 0" }}>
              <StarRating rating={r.rating} />
              <p style={{ margin: "4px 0" }}>{r.comment}</p>
              <span style={{ fontSize: 13, color: "#888" }}>{r.guestName || "Guest"}</span>
            </div>
          ))
        )}
        <ReviewForm hotelId={hotel._id} />
      </section>

      {faqs.length > 0 && (
        <section style={{ margin: "24px 0" }}>
          <h2>FAQs</h2>
          <FaqAccordion faqs={faqs} />
        </section>
      )}

      <section style={{ margin: "24px 0" }}>
        <h2>Contact & Location</h2>
        <p>
          📞 {hotel.contactPhone} · ✉️ {hotel.contactEmail}
        </p>
        <MapPlaceholder address={hotel.address} />
      </section>
    </main>
  );
}
