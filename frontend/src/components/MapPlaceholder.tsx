import { MapPin, ArrowUpRight, Navigation } from "lucide-react";

export default function MapPlaceholder({ address }: { address: string }) {
  const mapsQuery = encodeURIComponent(address);

  return (
    <div className="group relative overflow-hidden rounded-airy border border-ink/[0.07] bg-ink text-cream shadow-luxury">
      {/* Abstract cartographic field — concentric gold rings suggesting a map
          without faking one. Purely decorative CSS, no image weight. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.55]">
        <div className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/20" />
        <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/12" />
        <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/[0.07]" />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.06] blur-[100px]" />
      </div>

      <div className="relative flex flex-col items-center px-8 py-16 text-center sm:py-20">
        <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
          <MapPin size={20} strokeWidth={1.5} className="text-gold" />
        </span>

        <p className="text-[10px] uppercase tracking-eyebrow text-cream/40">Our Location</p>
        <p className="mt-3 max-w-sm font-display text-xl font-light leading-relaxed text-cream sm:text-2xl">
          {address}
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold group"
          >
            <Navigation size={14} /> Get Directions
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="link-arrow !text-cream/60 hover:!text-gold"
          >
            View on Google Maps <ArrowUpRight size={14} />
          </a>
        </div>
      </div>

      {/* NOTE: Still a link-based placeholder, per the existing scope decision.
          A real embedded map widget requires GOOGLE_MAPS_API_KEY (reserved in
          .env.example) — swap it in without changing this component's props. */}
    </div>
  );
}
