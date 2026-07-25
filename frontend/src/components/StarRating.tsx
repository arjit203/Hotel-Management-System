export default function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  const fullStars = Math.round(rating);

  return (
    <span style={{ display: "inline-flex", gap: 2 }} aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            fontSize: size,
            color: i <= fullStars ? "#f5a623" : "#d9d9d9",
            lineHeight: 1,
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}
