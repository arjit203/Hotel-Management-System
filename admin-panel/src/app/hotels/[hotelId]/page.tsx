"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RequireAdmin from "@/components/RequireAdmin";
import { adminApi, formatApiError } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

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
interface ReviewData {
  _id: string;
  guestName?: string;
  rating: number;
  comment: string;
  images?: string[];
  isApproved: boolean;
  adminReply?: string;
  createdAt: string;
}

export default function ManageHotelPage() {
  const params = useParams();
  const hotelId = params.hotelId as string;

  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [faqs, setFaqs] = useState<FaqData[]>([]);
  const [gallery, setGallery] = useState<GalleryData[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
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
    amenities: "",
  });

  const [offerForm, setOfferForm] = useState({ title: "", description: "", validFrom: "", validTo: "" });
  const [faqForm, setFaqForm] = useState({ question: "", answer: "" });
  const [galleryForm, setGalleryForm] = useState({ imageUrl: "", category: "exterior" });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryUploadMethod, setGalleryUploadMethod] = useState<"file" | "camera" | "url">("file");

  async function loadAll() {
    setLoading(true);
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

    const reviewsRes = await adminApi.get<ReviewData[]>(`/admin/hotels/${hotelId}/reviews`);
    if (reviewsRes.success) setReviews(reviewsRes.data || []);

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
      amenities: roomForm.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    });
    if (!res.success) {
      alert(formatApiError(res));
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
      amenities: "",
    });
    loadAll();
  }

  async function handleDeleteRoom(roomId: string) {
    if (!confirm("Deactivate this room?")) return;
    const res = await adminApi.delete(`/admin/hotels/rooms/${roomId}`);
    if (res.success) loadAll();
    else alert(formatApiError(res));
  }

  async function handleCreateOffer(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminApi.post(`/admin/hotels/${hotelId}/offers`, offerForm);
    if (!res.success) {
      alert(formatApiError(res));
      return;
    }
    setOfferForm({ title: "", description: "", validFrom: "", validTo: "" });
    loadAll();
  }

  async function handleDeleteOffer(offerId: string) {
    const res = await adminApi.delete(`/admin/hotels/offers/${offerId}`);
    if (res.success) loadAll();
    else alert(formatApiError(res));
  }

  async function handleCreateFaq(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminApi.post(`/admin/hotels/${hotelId}/faqs`, faqForm);
    if (!res.success) {
      alert(formatApiError(res));
      return;
    }
    setFaqForm({ question: "", answer: "" });
    loadAll();
  }

  async function handleDeleteFaq(faqId: string) {
    const res = await adminApi.delete(`/admin/hotels/faqs/${faqId}`);
    if (res.success) loadAll();
    else alert(formatApiError(res));
  }
async function handleAddGalleryItem(e: React.FormEvent) {
  e.preventDefault();

  let finalImageUrl = "";

  if (galleryUploadMethod === "url") {
    if (!galleryForm.imageUrl.trim()) {
      alert("Please paste an image URL.");
      return;
    }
    finalImageUrl = galleryForm.imageUrl.trim();
  } else {
    if (!galleryFile) {
      alert(galleryUploadMethod === "camera" ? "Please take a photo." : "Please choose an image file.");
      return;
    }
    setUploadingGallery(true);
    const uploadRes = await adminApi.upload(galleryFile, "gallery");
    setUploadingGallery(false);
    if (!uploadRes.success || !uploadRes.data) {
      alert(formatApiError(uploadRes));
      return;
    }
    finalImageUrl = uploadRes.data.url;
  }

  const res = await adminApi.post(`/admin/hotels/${hotelId}/gallery`, {
    imageUrl: finalImageUrl,
    category: galleryForm.category,
  });
  if (!res.success) {
    alert(formatApiError(res));
    return;
  }
  setGalleryForm({ imageUrl: "", category: "exterior" });
  setGalleryFile(null);
  loadAll();
}
  async function handleDeleteGalleryItem(itemId: string) {
    const res = await adminApi.delete(`/admin/hotels/gallery/${itemId}`);
    if (res.success) loadAll();
    else alert(formatApiError(res));
  }

  async function handleApproveReview(reviewId: string) {
    const res = await adminApi.put(`/admin/hotels/reviews/${reviewId}/approve`, {});
    if (res.success) loadAll();
    else alert(formatApiError(res));
  }

  async function handleReplyToReview(reviewId: string) {
    const reply = (replyDrafts[reviewId] || "").trim();
    if (!reply) {
      alert("Please write a reply first.");
      return;
    }
    const res = await adminApi.put(`/admin/hotels/reviews/${reviewId}/reply`, { reply });
    if (!res.success) {
      alert(formatApiError(res));
      return;
    }
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: "" }));
    loadAll();
  }

  async function handleDeleteReview(reviewId: string) {
    if (!confirm("Delete this review permanently?")) return;
    const res = await adminApi.delete(`/admin/hotels/reviews/${reviewId}`);
    if (res.success) loadAll();
    else alert(formatApiError(res));
  }

  async function handleDeleteReviewImage(reviewId: string, imageUrl: string) {
    if (!confirm("Remove this image from the review?")) return;
    const res = await adminApi.delete(`/admin/hotels/reviews/${reviewId}/images`, { imageUrl });
    if (res.success) loadAll();
    else alert(formatApiError(res));
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
                onChange={(e) => {
                  const name = e.target.value;
                  setRoomForm((prev) => ({ ...prev, name, slug: slugify(name) }));
                }}
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
            <label style={labelStyle}>
              Amenities
              <input
                value={roomForm.amenities}
                onChange={(e) => setRoomForm({ ...roomForm, amenities: e.target.value })}
                placeholder="e.g. AC, Free WiFi, Mini Bar"
                style={inputStyle}
              />
              <small style={{ color: "#888" }}>Comma-separated list.</small>
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
  Add Image Via
  <div style={{ display: "flex", gap: 16, marginTop: 4, marginBottom: 8 }}>
    <label style={{ fontWeight: "normal" }}>
      <input
        type="radio"
        name="galleryUploadMethod"
        checked={galleryUploadMethod === "file"}
        onChange={() => setGalleryUploadMethod("file")}
      />{" "}
      Upload File
    </label>
    <label style={{ fontWeight: "normal" }}>
      <input
        type="radio"
        name="galleryUploadMethod"
        checked={galleryUploadMethod === "camera"}
        onChange={() => setGalleryUploadMethod("camera")}
      />{" "}
      Take Photo
    </label>
    <label style={{ fontWeight: "normal" }}>
      <input
        type="radio"
        name="galleryUploadMethod"
        checked={galleryUploadMethod === "url"}
        onChange={() => setGalleryUploadMethod("url")}
      />{" "}
      Image URL
    </label>
  </div>
</label>

{galleryUploadMethod === "url" ? (
  <label style={labelStyle}>
    Image URL
    <input
      value={galleryForm.imageUrl}
      onChange={(e) => setGalleryForm({ ...galleryForm, imageUrl: e.target.value })}
      placeholder="https://example.com/photo.jpg"
      style={inputStyle}
    />
  </label>
) : (
  <label style={labelStyle}>
    {galleryUploadMethod === "camera" ? "Take Photo" : "Image File"}
    <input
      key={galleryUploadMethod}
      type="file"
      accept="image/*"
      capture={galleryUploadMethod === "camera" ? "environment" : undefined}
      onChange={(e) => setGalleryFile(e.target.files?.[0] || null)}
      style={inputStyle}
    />
  </label>
)}
          <label style={labelStyle}>
            Category
            <select
              value={isCustomCategory ? "other" : galleryForm.category}
              onChange={(e) => {
                if (e.target.value === "other") {
                  setIsCustomCategory(true);
                  setGalleryForm({ ...galleryForm, category: "" });
                } else {
                  setIsCustomCategory(false);
                  setGalleryForm({ ...galleryForm, category: e.target.value });
                }
              }}
              style={inputStyle}
            >
              <option value="Exterior">Exterior</option>
              <option value="Interior">Interior</option>
              <option value="Food">Food</option>
              <option value="Building">Building</option>
              <option value="Rooms">Rooms</option>
              <option value="other">Other (custom)</option>
            </select>
          </label>
          {isCustomCategory && (
            <label style={labelStyle}>
              Custom Category
              <input
                required
                value={galleryForm.category}
                onChange={(e) => setGalleryForm({ ...galleryForm, category: e.target.value })}
                placeholder="Enter custom category name"
                style={inputStyle}
              />
            </label>
          )}
       <button type="submit" style={btnPrimary} disabled={uploadingGallery}>
              {uploadingGallery ? "Uploading..." : "Add Image"}
            </button>
        </form>

       {Object.entries(
  gallery.reduce((acc: Record<string, typeof gallery>, g) => {
    const key = g.category || "Other";
    acc[key] = acc[key] || [];
    acc[key].push(g);
    return acc;
  }, {})
).map(([category, items]) => (
  <div key={category} style={{ marginTop: 16 }}>
    <h4 style={{ textTransform: "capitalize", margin: "0 0 8px" }}>{category}</h4>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {items.map((g) => (
        <div key={g._id} style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={g.imageUrl}
            alt=""
            onClick={() => setEnlargedImage(g.imageUrl)}
            style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 6, cursor: "pointer" }}
          />
          <button
            onClick={() => handleDeleteGalleryItem(g._id)}
            style={{ position: "absolute", top: 2, right: 2, background: "#c00", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  </div>
))}
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

      {/* REVIEWS */}
      <section style={{ marginTop: 32 }}>
        <h2>Reviews</h2>
        {reviews.length === 0 ? (
          <p style={{ color: "#888" }}>No reviews yet.</p>
        ) : (
          reviews.map((r) => (
            <div key={r._id} style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{r.guestName || "Guest"}</strong>
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 8px",
                    borderRadius: 12,
                    background: r.isApproved ? "#e6f7e6" : "#fff3cd",
                    color: r.isApproved ? "#237804" : "#8a6d00",
                  }}
                >
                  {r.isApproved ? "Approved (public)" : "Pending approval"}
                </span>
              </div>
              <p style={{ margin: "6px 0" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
              <p style={{ margin: "6px 0" }}>{r.comment}</p>

              {r.images && r.images.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                    gap: 8,
                    maxWidth: 360,
                    margin: "8px 0",
                  }}
                >
                  {r.images.map((url) => (
                    <div key={url} style={{ position: "relative" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Review photo"
                        style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6 }}
                      />
                      <button
                        onClick={() => handleDeleteReviewImage(r._id, url)}
                        style={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          background: "#c00",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {r.adminReply && (
                <p style={{ margin: "6px 0", padding: 8, background: "#f5f5f5", borderRadius: 6 }}>
                  <strong>Your reply:</strong> {r.adminReply}
                </p>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {!r.isApproved && (
                  <button onClick={() => handleApproveReview(r._id)} style={btnPrimary}>
                    Approve
                  </button>
                )}
                <button onClick={() => handleDeleteReview(r._id)} style={linkDanger}>
                  Delete
                </button>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  value={replyDrafts[r._id] || ""}
                  onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [r._id]: e.target.value }))}
                  placeholder={r.adminReply ? "Update your reply..." : "Write a reply..."}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={() => handleReplyToReview(r._id)} style={btnPrimary}>
                  {r.adminReply ? "Update Reply" : "Reply"}
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {enlargedImage && (
  <div
    onClick={() => setEnlargedImage(null)}
    style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, cursor: "pointer",
    }}
  >
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={enlargedImage} alt="Enlarged" style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: 8 }} />
  </div>
)}
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
