"use client";

import { useState } from "react";
import StarRating from "@/components/StarRating";

interface Review {
  _id: string;
  guestName?: string;
  rating: number;
  comment: string;
  images?: string[];
}

const PAGE_SIZE = 6;

export default function ReviewsList({ reviews }: { reviews: Review[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE));
  const pageReviews = reviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (reviews.length === 0) {
    return <p className="text-center text-ink/50 py-12">No reviews yet — be the first to share your experience.</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {pageReviews.map((r) => (
          <div key={r._id} className="bg-white rounded-2xl p-6 border border-ink/5 shadow-luxury">
            <StarRating rating={r.rating} size={15} />
            <p className="text-ink/70 text-sm mt-3 leading-relaxed">{r.comment}</p>
            {r.images && r.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {r.images.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="Review photo" className="w-full h-16 object-cover rounded-lg" />
                ))}
              </div>
            )}
            <p className="text-sm font-semibold text-ink mt-4">{r.guestName || "Guest"}</p>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                p === page ? "bg-ink text-cream" : "bg-white text-ink/60 border border-ink/10 hover:border-gold"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
