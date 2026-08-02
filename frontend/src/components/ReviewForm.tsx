"use client";

import { useEffect, useState } from "react";
import { Star, X, ImagePlus, Check, Loader2, ArrowRight } from "lucide-react";
import Alert from "@/components/ui/Alert";
import { getStoredUser, getUserToken, StoredUser } from "@/lib/userAuth";
import { cldImage, IMAGE_WIDTHS } from "@/lib/imageUrl";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

// Reviews are open to both logged-in customers and guests (explicit owner
// decision) — the backend route uses optionalAuthenticate, so it accepts a
// request with or without a Bearer token. If a valid token is present, the
// backend uses the account's name and ignores any guestName sent; if not,
// guestName is required. This component reflects that: logged-in users skip
// the "Your Name" field entirely (shown as "Posting as {name}" instead).
export default function ReviewForm({
  reviewEndpoint,
  uploadEndpoint,
}: {
  /** POST target for the review, e.g. `/hotels/<id>/reviews`. Path only — the
   *  API base URL is prepended here. Vertical-specific, hence required. */
  reviewEndpoint: string;
  /** POST target for a review photo, e.g. `/hotels/reviews/upload-image`. */
  uploadEndpoint: string;
}) {
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
      const res = await fetch(`${API_BASE_URL}${uploadEndpoint}`, {
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

  // Shared `.field-line` component class (globals.css) — was a local copy.
  const fieldClass = "field-line";

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
      const res = await fetch(`${API_BASE_URL}${reviewEndpoint}`, {
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
      <div className="py-6 text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold/12">
          <Check size={22} strokeWidth={1.5} className="text-gold" />
        </span>
        <p className="card-title">Thank you</p>
        <p className="body-muted mx-auto mt-3 max-w-sm">
          Your review has been submitted and will appear once approved.
        </p>
      </div>
    );
  }

  // No card wrapper here on purpose — the Reviews page already places this
  // inside a card, and nesting two would produce a double frame.
  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {user ? (
        <p className="text-sm font-light text-warm-600">
          Posting as <span className="text-ink">{user.name}</span>
        </p>
      ) : (
        <label className="block">
          <span className="field-label">Your Name</span>
          <input
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            autoComplete="name"
            className={fieldClass}
          />
        </label>
      )}

      <div>
        <span className="field-label">Your Rating</span>
        <div className="flex gap-1.5" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
              aria-pressed={rating === star}
              className="p-0.5 transition-transform duration-300 ease-luxe hover:scale-110"
            >
              <Star
                size={28}
                strokeWidth={1.5}
                className={
                  star <= (hoverRating || rating)
                    ? "fill-gold text-gold transition-colors"
                    : "text-ink/20 transition-colors"
                }
              />
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="field-label">Your Review</span>
        <textarea
          required
          minLength={3}
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What made your stay memorable?"
          className={`${fieldClass} resize-none placeholder:text-warm-400`}
        />
      </label>

      <div>
        <span className="field-label">Photos (optional, up to {MAX_IMAGES})</span>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gold/40 px-5 py-2.5 text-xs uppercase tracking-luxe text-gold-dark transition-colors duration-400 hover:border-gold hover:bg-gold/[0.07]">
          <ImagePlus size={15} />
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

      {(images.length > 0 || uploadingImage) && (
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
          {images.map((url) => (
            <div key={url} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cldImage(url, { width: IMAGE_WIDTHS.thumb })}
                alt="Review photo"
                loading="lazy"
                decoding="async"
                className="h-20 w-full rounded-xl object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(url)}
                aria-label="Remove photo"
                className="absolute -right-2 -top-2 rounded-full bg-ink p-1 text-cream transition-colors hover:bg-red-600"
              >
                <X size={11} />
              </button>
            </div>
          ))}
          {uploadingImage && (
            <div className="skeleton flex h-20 items-center justify-center rounded-xl" aria-label="Uploading" />
          )}
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      <button type="submit" disabled={submitting} className="btn-primary group w-full disabled:opacity-60">
        {submitting ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Submitting
          </>
        ) : (
          <>
            Submit Review <ArrowRight size={14} className="btn-arrow" />
          </>
        )}
      </button>
    </form>
  );
}
