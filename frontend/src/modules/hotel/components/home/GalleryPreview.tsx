"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, X, ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryImage {
  _id: string;
  imageUrl: string;
  title?: string;
}

export default function GalleryPreview({ images }: { images: GalleryImage[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const shown = images.slice(0, 8);

  if (images.length === 0) return null;

  function showNext() {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % shown.length));
  }
  function showPrev() {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + shown.length) % shown.length));
  }

  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="section-eyebrow justify-center flex">Moments</p>
        <h2 className="section-title">Gallery</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {shown.map((img, i) => (
          <button
            key={img._id}
            onClick={() => setLightboxIndex(i)}
            className="group relative overflow-hidden rounded-xl h-40 sm:h-48"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.imageUrl}
              alt={img.title || "7 Vachan"}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </button>
        ))}
      </div>

      <div className="text-center mt-12">
        <Link href="/hotel/gallery" className="btn-outline">
          View Full Gallery <ArrowRight size={16} />
        </Link>
      </div>

      {lightboxIndex !== null && (
        <div
          onClick={() => setLightboxIndex(null)}
          className="fixed inset-0 z-[100] bg-ink/90 flex items-center justify-center p-6"
        >
          <button onClick={() => setLightboxIndex(null)} className="absolute top-6 right-6 text-cream hover:text-gold" aria-label="Close">
            <X size={28} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); showPrev(); }}
            className="absolute left-4 sm:left-8 text-cream hover:text-gold"
            aria-label="Previous"
          >
            <ChevronLeft size={32} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shown[lightboxIndex].imageUrl}
            alt={shown[lightboxIndex].title || "Gallery image"}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90%] max-h-[85vh] rounded-lg object-contain"
          />
          <button
            onClick={(e) => { e.stopPropagation(); showNext(); }}
            className="absolute right-4 sm:right-8 text-cream hover:text-gold"
            aria-label="Next"
          >
            <ChevronRight size={32} />
          </button>
        </div>
      )}
    </section>
  );
}