import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>7 Vachan</h1>
      <p>Hotel, Marriage Hall & Restaurant.</p>
      <p>
        <Link href="/hotel" style={{ color: "#0066cc" }}>
          View Hotel →
        </Link>
      </p>
    </main>
  );
}
