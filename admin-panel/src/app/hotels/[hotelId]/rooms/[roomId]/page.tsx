"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import RequireAdmin from "@/components/RequireAdmin";
import { adminApi, formatApiError } from "@/lib/api";

interface AvailabilityOverride {
  _id: string;
  date: string;
  blockedCount: number;
  reason?: string;
}

interface RoomDetails {
  categoryName: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  maxOccupancy: number;
  totalRooms: number;
  amenities: string[];
  images: string[];
}

export default function ManageRoomPage() {
  const params = useParams();
  const hotelId = params.hotelId as string;
  const roomId = params.roomId as string;

  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: "", blockedCount: "0", reason: "" });

  // Edit Room Details — pre-filled from GET /admin/hotels/rooms/:roomId,
  // saved via the existing PUT /admin/hotels/rooms/:roomId (updateRoomSchema
  // is a partial of createRoomSchema, so any subset of fields can be sent).
  const [editForm, setEditForm] = useState({
    categoryName: "Deluxe",
    name: "",
    slug: "",
    description: "",
    basePrice: "",
    maxOccupancy: "",
    totalRooms: "",
    amenities: "",
  });

  const [roomEditImages, setRoomEditImages] = useState<string[]>([]);
  const [roomEditUploadMethod, setRoomEditUploadMethod] = useState<"file" | "camera" | "url">("file");
  const [roomEditImageUrlInput, setRoomEditImageUrlInput] = useState("");
  const [uploadingRoomEditImage, setUploadingRoomEditImage] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [savingRoom, setSavingRoom] = useState(false);

  async function loadRoom() {
    setLoadingRoom(true);
    const res = await adminApi.get<RoomDetails>(`/admin/hotels/rooms/${roomId}`);
    if (res.success && res.data) {
      const r = res.data;
      setEditForm({
        categoryName: r.categoryName,
        name: r.name,
        slug: r.slug,
        description: r.description,
        basePrice: String(r.basePrice),
        maxOccupancy: String(r.maxOccupancy),
        totalRooms: String(r.totalRooms),
        amenities: (r.amenities || []).join(", "),
      });
      setRoomEditImages(r.images || []);
    }
    setLoadingRoom(false);
  }

  async function handleRoomEditImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploadingRoomEditImage(true);
    for (const file of files) {
      const res = await adminApi.upload(file, "rooms");
      if (res.success && res.data) {
        setRoomEditImages((prev) => [...prev, res.data!.url]);
      } else {
        alert(formatApiError(res));
      }
    }
    setUploadingRoomEditImage(false);
  }

  function handleAddRoomEditImageUrl() {
    const url = roomEditImageUrlInput.trim();
    if (!url) return;
    setRoomEditImages((prev) => [...prev, url]);
    setRoomEditImageUrlInput("");
  }

  function removeRoomEditImage(url: string) {
    setRoomEditImages((prev) => prev.filter((u) => u !== url));
  }

  async function handleUpdateRoom(e: React.FormEvent) {
    e.preventDefault();
    setSavingRoom(true);
    const res = await adminApi.put(`/admin/hotels/rooms/${roomId}`, {
      categoryName: editForm.categoryName,
      name: editForm.name,
      slug: editForm.slug,
      description: editForm.description,
      basePrice: Number(editForm.basePrice),
      maxOccupancy: Number(editForm.maxOccupancy),
      totalRooms: Number(editForm.totalRooms),
      amenities: editForm.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      images: roomEditImages,
    });
    setSavingRoom(false);
    if (!res.success) {
      alert(formatApiError(res));
      return;
    }
    alert("Room updated successfully.");
  }

  async function loadOverrides() {
    setLoading(true);
    const res = await adminApi.get<AvailabilityOverride[]>(`/admin/hotels/rooms/${roomId}/availability`);
    if (res.success) setOverrides(res.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOverrides();
    loadRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  async function handleSetAvailability(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminApi.put(`/admin/hotels/rooms/${roomId}/availability`, {
      date: form.date,
      blockedCount: Number(form.blockedCount),
      reason: form.reason || undefined,
    });
    if (!res.success) {
      alert(formatApiError(res));
      return;
    }
    setForm({ date: "", blockedCount: "0", reason: "" });
    loadOverrides();
  }

  return (
    <RequireAdmin>
      <p>
        <Link href={`/hotels/${hotelId}`}>← Back to Hotel</Link>
      </p>
      <h1>Manage Room</h1>

      {/* EDIT ROOM DETAILS */}
      <h2>Room Details</h2>
      {loadingRoom ? (
        <p>Loading room...</p>
      ) : (
        <form
          onSubmit={handleUpdateRoom}
          style={{ border: "1px solid #e5e5e5", padding: 16, borderRadius: 8, maxWidth: 420, margin: "16px 0" }}
        >
          <label style={{ display: "block", marginBottom: 10 }}>
            Category
            <select
              value={editForm.categoryName}
              onChange={(e) => setEditForm({ ...editForm, categoryName: e.target.value })}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            >
              <option>Deluxe</option>
              <option>Executive</option>
              <option>Luxury</option>
              <option>Suite</option>
            </select>
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            Name
            <input
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            Slug
            <input
              required
              value={editForm.slug}
              onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
            <small style={{ color: "#888" }}>
              Changing this changes the room's public URL — existing links/bookmarks to the old
              URL will break. Leave as-is unless you specifically need to change it.
            </small>
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            Description
            <textarea
              required
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            Base Price (₹/night)
            <input
              required
              type="number"
              value={editForm.basePrice}
              onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            Max Occupancy
            <input
              required
              type="number"
              value={editForm.maxOccupancy}
              onChange={(e) => setEditForm({ ...editForm, maxOccupancy: e.target.value })}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            Total Rooms
            <input
              required
              type="number"
              value={editForm.totalRooms}
              onChange={(e) => setEditForm({ ...editForm, totalRooms: e.target.value })}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            Amenities
            <input
              value={editForm.amenities}
              onChange={(e) => setEditForm({ ...editForm, amenities: e.target.value })}
              placeholder="e.g. AC, Free WiFi, Mini Bar"
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
            <small style={{ color: "#888" }}>Comma-separated list.</small>
          </label>

          <label style={{ display: "block", marginBottom: 10 }}>
            Add Room Image Via
            <div style={{ display: "flex", gap: 16, marginTop: 4, marginBottom: 8 }}>
              <label style={{ fontWeight: "normal" }}>
                <input
                  type="radio"
                  name="roomEditUploadMethod"
                  checked={roomEditUploadMethod === "file"}
                  onChange={() => setRoomEditUploadMethod("file")}
                />{" "}
                Upload Files
              </label>
              <label style={{ fontWeight: "normal" }}>
                <input
                  type="radio"
                  name="roomEditUploadMethod"
                  checked={roomEditUploadMethod === "camera"}
                  onChange={() => setRoomEditUploadMethod("camera")}
                />{" "}
                Take Photo
              </label>
              <label style={{ fontWeight: "normal" }}>
                <input
                  type="radio"
                  name="roomEditUploadMethod"
                  checked={roomEditUploadMethod === "url"}
                  onChange={() => setRoomEditUploadMethod("url")}
                />{" "}
                Image URL
              </label>
            </div>
          </label>

          {roomEditUploadMethod === "url" ? (
            <label style={{ display: "block", marginBottom: 10 }}>
              Image URL
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={roomEditImageUrlInput}
                  onChange={(e) => setRoomEditImageUrlInput(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
                />
                <button
                  type="button"
                  onClick={handleAddRoomEditImageUrl}
                  disabled={!roomEditImageUrlInput.trim()}
                  style={{ background: "#111", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, whiteSpace: "nowrap" }}
                >
                  Add
                </button>
              </div>
            </label>
          ) : (
            <label style={{ display: "block", marginBottom: 10 }}>
              {roomEditUploadMethod === "camera" ? "Take Photo" : "Image Files (multiple allowed)"}
              <input
                key={roomEditUploadMethod}
                type="file"
                accept="image/*"
                multiple={roomEditUploadMethod === "file"}
                capture={roomEditUploadMethod === "camera" ? "environment" : undefined}
                onChange={handleRoomEditImageSelect}
                disabled={uploadingRoomEditImage}
                style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>
          )}

          {(roomEditImages.length > 0 || uploadingRoomEditImage) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {roomEditImages.map((url) => (
                <div key={url} style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 6 }} />
                  <button
                    type="button"
                    onClick={() => removeRoomEditImage(url)}
                    style={{ position: "absolute", top: 2, right: 2, background: "#c00", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {uploadingRoomEditImage && (
                <div style={{ width: 70, height: 70, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#888", border: "1px dashed #ccc", borderRadius: 6 }}>
                  Uploading...
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={savingRoom}
            style={{ background: "#111", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6 }}
          >
            {savingRoom ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}

      {/* AVAILABILITY */}
      <h2 style={{ marginTop: 32 }}>Room Availability</h2>
      <p style={{ color: "#666" }}>
        Block units of this room category for maintenance/hold on specific dates. Real-time
        bookable availability is automatically computed as: total rooms − blocked − overlapping
        bookings.
      </p>

      <form
        onSubmit={handleSetAvailability}
        style={{ border: "1px solid #e5e5e5", padding: 16, borderRadius: 8, maxWidth: 420, margin: "16px 0" }}
      >
        <label style={{ display: "block", marginBottom: 10 }}>
          Date
          <input
            required
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 10 }}>
          Blocked Count
          <input
            required
            type="number"
            min={0}
            value={form.blockedCount}
            onChange={(e) => setForm({ ...form, blockedCount: e.target.value })}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 10 }}>
          Reason (optional)
          <input
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <button
          type="submit"
          style={{ background: "#111", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6 }}
        >
          Set Availability Override
        </button>
      </form>

      <h3>Current Overrides</h3>
      {loading ? (
        <p>Loading...</p>
      ) : overrides.length === 0 ? (
        <p style={{ color: "#888" }}>No manual overrides set.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "2px solid #e5e5e5" }}>Date</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "2px solid #e5e5e5" }}>Blocked</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "2px solid #e5e5e5" }}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {overrides.map((o) => (
              <tr key={o._id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>{new Date(o.date).toDateString()}</td>
                <td style={{ padding: 8 }}>{o.blockedCount}</td>
                <td style={{ padding: 8 }}>{o.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </RequireAdmin>
  );
}
