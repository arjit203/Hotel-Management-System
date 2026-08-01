"use client";

import { useEffect, useState } from "react";
import { Star, X, ImagePlus } from "lucide-react";
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
      <p className="p-4 bg-green-50 rounded-xl text-green-700 my-4 text-sm">
        Thanks! Your review has been submitted and will appear after admin approval.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-ink/5 shadow-luxury rounded-2xl p-6 sm:p-8">
      <h4 className="font-display text-xl text-ink mb-5">Write a Review</h4>

      {user ? (
        <p className="text-sm text-ink/60 mb-4">
          Posting as <strong className="text-ink">{user.name}</strong>
        </p>
      ) : (
        <label className="block mb-4 text-sm text-ink/60">
          Your Name
          <input
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="block w-full mt-1 px-3 py-2.5 rounded-xl border border-ink/10 focus:outline-none focus:border-gold text-ink"
          />
        </label>
      )}

      <label className="block mb-4 text-sm text-ink/60">
        Your Rating
        <div className="flex gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
            >
              <Star
                size={26}
                className={star <= (hoverRating || rating) ? "text-gold fill-gold" : "text-ink/15"}
              />
            </button>
          ))}
        </div>
      </label>

      <label className="block mb-4 text-sm text-ink/60">
        Your Review
        <textarea
          required
          minLength={3}
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="block w-full mt-1 px-3 py-2.5 rounded-xl border border-ink/10 focus:outline-none focus:border-gold text-ink"
        />
      </label>

      <label className="block mb-4 text-sm text-ink/60">
        Photos (optional, up to {MAX_IMAGES})
        <div className="mt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gold border border-gold/40 rounded-full px-4 py-2 hover:bg-gold/5">
            <ImagePlus size={16} />
            Add Photo
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              disabled={uploadingImage || images.length >= MAX_IMAGES}
              className="hidden"
            />
          </label>
        </div>
      </label>

      {(images.length > 0 || uploadingImage) && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-4">
          {images.map((url) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Review photo" className="w-full h-16 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute -top-1.5 -right-1.5 bg-ink text-cream rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {uploadingImage && (
            <div className="h-16 flex items-center justify-center text-xs text-ink/40 border border-dashed border-ink/20 rounded-lg">
              Uploading...
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary text-sm">
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
