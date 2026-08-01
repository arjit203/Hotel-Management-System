import { MapPin, ExternalLink } from "lucide-react";

export default function MapPlaceholder({ address }: { address: string }) {
  const mapsQuery = encodeURIComponent(address);

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-10 text-center shadow-luxury">
      <MapPin size={28} className="mx-auto text-gold mb-3" />
      <p className="text-ink/70">{address}</p>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-4 text-gold font-semibold text-sm hover:underline"
      >
        View on Google Maps <ExternalLink size={14} />
      </a>
      {/* NOTE: This is a link-based placeholder per current scope. A real
          embedded <iframe>/JS Maps widget requires GOOGLE_MAPS_API_KEY
          (already reserved in .env.example) — swap in once billing/key is
          set up, without changing this component's public props. */}
    </div>
  );
}
