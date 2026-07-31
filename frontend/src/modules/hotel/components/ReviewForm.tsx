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

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

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
      body: JSON.stringify({ rating, comment, ...(user ? {} : { guestName }) }),      });
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
