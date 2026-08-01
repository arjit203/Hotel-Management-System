import { Star } from "lucide-react";

export default function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  const fullStars = Math.round(rating);

  return (
    <span className="inline-flex gap-0.5" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= fullStars ? "text-gold fill-gold" : "text-ink/20"}
        />
      ))}
    </span>
  );
}
