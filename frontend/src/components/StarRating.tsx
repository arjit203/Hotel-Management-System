import { Star } from "lucide-react";

/**
 * Star rating.
 *
 * Renders true partial fills via a clipped overlay rather than rounding to the
 * nearest whole star — a 4.3 average showing as 4.0 quietly understates the
 * property, and rounding 4.6 up to 5 overstates it. The empty stars are outlines
 * at low opacity so the row reads as a rating, not as a row of grey blocks.
 */
export default function StarRating({
  rating,
  size = 16,
  className = "",
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, rating));
  const percent = (clamped / 5) * 100;

  return (
    <span
      className={`relative inline-flex ${className}`}
      role="img"
      aria-label={`Rated ${clamped.toFixed(1)} out of 5`}
    >
      {/* Base: outlined stars */}
      <span aria-hidden="true" className="inline-flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={size} strokeWidth={1.5} className="text-ink/15" />
        ))}
      </span>

      {/* Overlay: gold stars, clipped to the exact rating width */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 inline-flex gap-1 overflow-hidden"
        style={{ width: `${percent}%` }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={size} strokeWidth={1.5} className="shrink-0 fill-gold text-gold" />
        ))}
      </span>
    </span>
  );
}
