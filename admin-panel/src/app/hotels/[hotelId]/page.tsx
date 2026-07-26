"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RequireAdmin from "@/components/RequireAdmin";
import { adminApi } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

interface HotelData {
  _id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
}
interface RoomData {
  _id: string;
  name: string;
  slug: string;
  categoryName: string;
  basePrice: number;
  totalRooms: number;
}
interface OfferData {
  _id: string;
  title: string;
  description?: string;
  validFrom: string;
  validTo: string;
}
interface FaqData {
  _id: string;
  question: string;
  answer: string;
}
interface GalleryData {
  _id: string;
  imageUrl: string;
  category: string;
}

export default function ManageHotelPage() {
  const params = useParams();
  const hotelId = params.hotelId as string;

  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [faqs, setFaqs] = useState<FaqData[]>([]);
  const [gallery, setGallery] = useState<GalleryData[]>([]);
  const [loading, setLoading] = useState(true);

  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState({
    categoryName: "Deluxe",
    name: "",
    slug: "",
    description: "",
    basePrice: "",
    maxOccupancy: "2",
    totalRooms: "1",
  });

  const [offerForm, setOfferForm] = useState({ title: "", description: "", validFrom: "", validTo: "" });
  const [faqForm, setFaqForm] = useState({ question: "", answer: "" });
  const [galleryForm, setGalleryForm] = useState({ imageUrl: "", category: "exterior" });

  async function loadAll() {
    setLoading(true);
    // Hotel details (public endpoint returns rooms/offers/gallery/faqs too, but we
    // need this hotel's slug first — fetch by iterating admin's own list once,
    // simplest reliable path given no admin-only "get by id" public route).
    const listRes = await fetch(`${API_BASE_URL}/hotels`, { cache: "no-store" });
    const listJson = await listRes.json();
    const found = (listJson.data || []).find((h: any) => h._id === hotelId);
    if (!found) {
      setLoading(false);
      return;
    }

    const detailsRes = await fetch(`${API_BASE_URL}/hotels/${found.slug}`, { cache: "no-store" });
    const detailsJson = await detailsRes.json();
    if (detailsJson.success) {
      setHotel(detailsJson.data.hotel);
      setRooms(detailsJson.data.rooms);
      setOffers(detailsJson.data.offers);
      setFaqs(detailsJson.data.faqs);
      setGallery(detailsJson.data.gallery);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminApi.post(`/admin/hotels/${hotelId}/rooms`, {
      ...roomForm,
      basePrice: Number(roomForm.basePrice),
      maxOccupancy: Number(roomForm.maxOccupancy),
      totalRooms: Number(roomForm.totalRooms),
    });
    if (!res.success) {
      alert(res.message);
      return;
    }
    setShowRoomForm(false);
    setRoomForm({
      categoryName: "Deluxe",
      name: "",
      slug: "",
      description: "",
      basePrice: "",
      maxOccupancy: "2",
      totalRooms: "1",
    });
    loadAll();
  }

  async function handleDeleteRoom(roomId: string) {
    if (!confirm("Deactivate this room?")) return;
    const res = await adminApi.delete(`/admin/hotels/rooms/${roomId}`);
    if (res.success) loadAll();
    else alert(res.message);
  }

  async function handleCreateOffer(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminApi.post(`/admin/hotels/${hotelId}/offers`, offerForm);
    if (!res.success) {
      alert(res.message);
      return;
    }
    setOfferForm({ title: "", description: "", validFrom: "", validTo: "" });
    loadAll();
  }

  async function handleDeleteOffer(offerId: string) {
    const res = await adminApi.delete(`/admin/hotels/offers/${offerId}`);
    if (res.success) loadAll();
    else alert(res.message);
  }

  async function handleCreateFaq(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminApi.post(`/admin/hotels/${hotelId}/faqs`, faqForm);
    if (!res.success) {
      alert(res.message);
      return;
    }
    setFaqForm({ question: "", answer: "" });
    loadAll();
  }

  async function handleDeleteFaq(faqId: string) {
    const res = await adminApi.delete(`/admin/hotels/faqs/${faqId}`);
    if (res.success) loadAll();
    else alert(res.message);
  }

  async function handleAddGalleryItem(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminApi.post(`/admin/hotels/${hotelId}/gallery`, galleryForm);
    if (!res.success) {
      alert(res.message);
      return;
    }
    setGalleryForm({ imageUrl: "", category: "exterior" });
    loadAll();
  }

  async function handleDeleteGalleryItem(itemId: string) {
    const res = await adminApi.delete(`/admin/hotels/gallery/${itemId}`);
    if (res.success) loadAll();
    else alert(res.message);
  }

  if (loading) {
    return (
      <RequireAdmin>
        <p>Loading...</p>
      </RequireAdmin>
    );
  }

  if (!hotel) {
    return (
      <RequireAdmin>
        <p>Hotel not found.</p>
      </RequireAdmin>
    );
  }

  return (
    <RequireAdmin>
      <p>
        <Link href="/hotels">← Back to Hotels</Link>
      </p>
      <h1>{hotel.name}</h1>
      <p style={{ color: "#666" }}>{hotel.address}</p>

      {/* ROOMS */}
      <section style={{ marginTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Rooms</h2>
          <button onClick={() => setShowRoomForm(!showRoomForm)} style={btnPrimary}>
            {showRoomForm ? "Cancel" : "+ New Room"}
          </button>
        </div>

        {showRoomForm && (
          <form onSubmit={handleCreateRoom} style={formBox}>
            <label style={labelStyle}>
              Category
              <select
                value={roomForm.categoryName}
                onChange={(e) => setRoomForm({ ...roomForm, categoryName: e.target.value })}
                style={inputStyle}
              >
                <option>Deluxe</option>
                <option>Executive</option>
                <option>Luxury</option>
                <option>Suite</option>
              </select>
            </label>
            <label style={labelStyle}>
              Name
              <input
                required
                value={roomForm.name}
                onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Slug
              <input
                required
                value={roomForm.slug}
                onChange={(e) => setRoomForm({ ...roomForm, slug: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Description
              <textarea
                required
                value={roomForm.description}
                onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Base Price (₹/night)
              <input
                required
                type="number"
                value={roomForm.basePrice}
                onChange={(e) => setRoomForm({ ...roomForm, basePrice: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Max Occupancy
              <input
                required
                type="number"
                value={roomForm.maxOccupancy}
                onChange={(e) => setRoomForm({ ...roomForm, maxOccupancy: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Total Rooms
              <input
                required
                type="number"
                value={roomForm.totalRooms}
                onChange={(e) => setRoomForm({ ...roomForm, totalRooms: e.target.value })}
                style={inputStyle}
              />
            </label>
            <button type="submit" style={btnPrimary}>
              Create Room
            </button>
          </form>
        )}

        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Price</th>
              <th style={thStyle}>Total</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room._id} style={trStyle}>
                <td style={tdStyle}>{room.name}</td>
                <td style={tdStyle}>{room.categoryName}</td>
                <td style={tdStyle}>₹{room.basePrice}</td>
                <td style={tdStyle}>{room.totalRooms}</td>
                <td style={tdStyle}>
                  <Link href={`/hotels/${hotelId}/rooms/${room._id}`} style={{ marginRight: 12 }}>
                    Manage
                  </Link>
                  <button onClick={() => handleDeleteRoom(room._id)} style={linkDanger}>
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* OFFERS */}
      <section style={{ marginTop: 32 }}>
        <h2>Offers</h2>
        <form onSubmit={handleCreateOffer} style={formBox}>
          <label style={labelStyle}>
            Title
            <input
              required
              value={offerForm.title}
              onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Description
            <input
              value={offerForm.description}
              onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Valid From
            <input
              required
              type="date"
              value={offerForm.validFrom}
              onChange={(e) => setOfferForm({ ...offerForm, validFrom: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Valid To
            <input
              required
              type="date"
              value={offerForm.validTo}
              onChange={(e) => setOfferForm({ ...offerForm, validTo: e.target.value })}
              style={inputStyle}
            />
          </label>
          <button type="submit" style={btnPrimary}>
            Add Offer
          </button>
        </form>
        {offers.map((o) => (
          <div key={o._id} style={rowBox}>
            <span>
              <strong>{o.title}</strong> — {o.description}
            </span>
            <button onClick={() => handleDeleteOffer(o._id)} style={linkDanger}>
              Delete
            </button>
          </div>
        ))}
      </section>

      {/* GALLERY */}
      <section style={{ marginTop: 32 }}>
        <h2>Gallery</h2>
        <form onSubmit={handleAddGalleryItem} style={formBox}>
          <label style={labelStyle}>
            Image URL
            <input
              required
              value={galleryForm.imageUrl}
              onChange={(e) => setGalleryForm({ ...galleryForm, imageUrl: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Category
            <input
              required
              value={galleryForm.category}
              onChange={(e) => setGalleryForm({ ...galleryForm, category: e.target.value })}
              style={inputStyle}
            />
          </label>
          <button type="submit" style={btnPrimary}>
            Add Image
          </button>
        </form>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
          {gallery.map((g) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div key={g._id} style={{ position: "relative" }}>
              <img src={g.imageUrl} alt="" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 6 }} />
              <button
                onClick={() => handleDeleteGalleryItem(g._id)}
                style={{ position: "absolute", top: 2, right: 2, background: "#c00", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQS */}
      <section style={{ marginTop: 32 }}>
        <h2>FAQs</h2>
        <form onSubmit={handleCreateFaq} style={formBox}>
          <label style={labelStyle}>
            Question
            <input
              required
              value={faqForm.question}
              onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Answer
            <textarea
              required
              value={faqForm.answer}
              onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
              style={inputStyle}
            />
          </label>
          <button type="submit" style={btnPrimary}>
            Add FAQ
          </button>
        </form>
        {faqs.map((f) => (
          <div key={f._id} style={rowBox}>
            <span>
              <strong>{f.question}</strong>
            </span>
            <button onClick={() => handleDeleteFaq(f._id)} style={linkDanger}>
              Delete
            </button>
          </div>
        ))}
      </section>
    </RequireAdmin>
  );
}

const btnPrimary: React.CSSProperties = {
  background: "#111",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: 6,
  cursor: "pointer",
};
const formBox: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  padding: 16,
  borderRadius: 8,
  margin: "12px 0",
  maxWidth: 480,
};
const labelStyle: React.CSSProperties = { display: "block", marginBottom: 10 };
const inputStyle: React.CSSProperties = { display: "block", width: "100%", padding: 8, marginTop: 4 };
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", marginTop: 12 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: 8, borderBottom: "2px solid #e5e5e5" };
const trStyle: React.CSSProperties = { borderBottom: "1px solid #eee" };
const tdStyle: React.CSSProperties = { padding: 8 };
const rowBox: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "1px solid #eee",
  padding: "8px 0",
};
const linkDanger: React.CSSProperties = { background: "none", border: "none", color: "#c00", cursor: "pointer" };
