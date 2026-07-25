export default function MapPlaceholder({ address }: { address: string }) {
  const mapsQuery = encodeURIComponent(address);

  return (
    <div
      style={{
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        padding: 24,
        textAlign: "center",
        background: "#fafafa",
      }}
    >
      <p style={{ margin: 0, color: "#666" }}>📍 {address}</p>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-block", marginTop: 8, color: "#0066cc" }}
      >
        View on Google Maps →
      </a>
      {/* NOTE: This is a link-based placeholder per current scope. A real
          embedded <iframe>/JS Maps widget requires GOOGLE_MAPS_API_KEY
          (already reserved in .env.example) — swap in once billing/key is
          set up, without changing this component's public props. */}
    </div>
  );
}
