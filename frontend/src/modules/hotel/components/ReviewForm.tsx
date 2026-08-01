"use client";

import { useEffect, useState } from "react";
import { getStoredUser, getUserToken, StoredUser } from "@/lib/userAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

// Reviews are open to both logged-in customers and guests (explicit owner
// decision) — the backend route uses optionalAuthenticate, so it accepts a
// request with or without a Bearer token. If a valid token is present, the
// backend uses the account's name and ignores any guestName sent; if not,
// guestName is required. This component reflects that: logged-in users skip
// the "Your Name" field entirely (shown as "Posting as {name}" instead).
export default function ReviewForm({ hotelId }: { hotelId: string }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Feature 5 (Phase 3.6): review images. Uploaded one at a time to Cloudinary
  // as soon as chosen (via the public /hotels/reviews/upload-image endpoint),
  // so `images` holds ready-to-submit URLs — the actual review POST just
  // sends the URL list, no file handling at submit time. Max 5 (enforced
  // both here and by the backend's createReviewSchema).
  const MAX_IMAGES = 5;
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file again later
    if (!file) return;
    if (images.length >= MAX_IMAGES) {
      setError(`You can attach up to ${MAX_IMAGES} images.`);
      return;
    }
    setUploadingImage(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${API_BASE_URL}/hotels/reviews/upload-image`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Image upload failed.");
      } else {
        setImages((prev) => [...prev, json.data.url]);
      }
    } catch {
      setError("Image upload failed. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const token = getUserToken();
      const res = await fetch(`${API_BASE_URL}/hotels/${hotelId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rating, comment, images, ...(user ? {} : { guestName }) }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p style={{ padding: 12, background: "#e6f7e6", borderRadius: 8, color: "#237804", margin: "16px 0" }}>
        Thanks! Your review has been submitted and will appear after admin approval.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ border: "1px solid #e5e5e5", padding: 16, borderRadius: 8, maxWidth: 480, margin: "16px 0" }}
    >
      <h4 style={{ marginTop: 0 }}>Write a Review</h4>

      {user ? (
        <p style={{ fontSize: 14, color: "#666" }}>
          Posting as <strong>{user.name}</strong>
        </p>
      ) : (
        <label style={{ display: "block", marginBottom: 10 }}>
          Your Name
          <input
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
      )}

      <label style={{ display: "block", marginBottom: 10 }}>
        Your Rating
        <div style={{ fontSize: 26, lineHeight: 1 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              style={{
                cursor: "pointer",
                color: star <= (hoverRating || rating) ? "#f5a623" : "#ddd",
              }}
            >
              ★
            </span>
          ))}
        </div>
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        Your Review
        <textarea
          required
          minLength={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        Photos (optional, up to {MAX_IMAGES})
        <input
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          disabled={uploadingImage || images.length >= MAX_IMAGES}
          style={{ display: "block", marginTop: 4 }}
        />
      </label>

      {(images.length > 0 || uploadingImage) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))",
            gap: 8,
            marginBottom: 10,
          }}
        >
          {images.map((url) => (
            <div key={url} style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Review photo"
                style={{ width: "100%", height: 70, objectFit: "cover", borderRadius: 6 }}
              />
              <button
                type="button"
                onClick={() => removeImage(url)}
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
          {uploadingImage && (
            <div
              style={{
                height: 70,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: "#888",
                border: "1px dashed #ccc",
                borderRadius: 6,
              }}
            >
              Uploading...
            </div>
          )}
        </div>
      )}

      {error && <p style={{ color: "#c00" }}>{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        style={{
          background: "#111",
          color: "#fff",
          border: "none",
          padding: "8px 16px",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
