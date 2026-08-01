"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface GalleryImage {
  _id: string;
  imageUrl: string;
  title?: string;
  category: string;
}

// Category tabs + responsive grid + lightbox (prev/next navigation). Used on
// the dedicated /hotel/gallery page. `category` is captured in the admin
// panel's Gallery form; this is the only place it's actually used/displayed.
export default function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const categories = ["All", ...Array.from(new Set(images.map((img) => img.category || "Other")))];
  const filtered = activeCategory === "All" ? images : images.filter((img) => (img.category || "Other") === activeCategory);

  function showNext() {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % filtered.length));
  }
  function showPrev() {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + filtered.length) % filtered.length));
  }

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm capitalize transition-colors ${
              activeCategory === cat ? "bg-ink text-cream" : "bg-white text-ink/60 border border-ink/10 hover:border-gold"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((img, i) => (
          <button
            key={img._id}
            onClick={() => setLightboxIndex(i)}
            className="group relative overflow-hidden rounded-xl h-40 sm:h-52"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.imageUrl}
              alt={img.title || `${img.category} photo`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          onClick={() => setLightboxIndex(null)}
          className="fixed inset-0 z-[100] bg-ink/90 flex items-center justify-center p-6"
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 right-6 text-cream hover:text-gold"
            aria-label="Close"
          >
            <X size={28} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              showPrev();
            }}
            className="absolute left-4 sm:left-8 text-cream hover:text-gold"
            aria-label="Previous"
          >
            <ChevronLeft size={32} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={filtered[lightboxIndex].imageUrl}
            alt={filtered[lightboxIndex].title || "Gallery image"}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90%] max-h-[85vh] rounded-lg object-contain"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              showNext();
            }}
            className="absolute right-4 sm:right-8 text-cream hover:text-gold"
            aria-label="Next"
          >
            <ChevronRight size={32} />
          </button>
        </div>
      )}
    </div>
  );
}
