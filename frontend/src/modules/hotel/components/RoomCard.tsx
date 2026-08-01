"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";

export interface RoomSummary {
  _id: string;
  slug: string;
  categoryName: string;
  name: string;
  description: string;
  basePrice: number;
  maxOccupancy: number;
  images: string[];
}

export default function RoomCard({ room }: { room: RoomSummary }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const images = room.images || [];

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % images.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-luxury border border-ink/5 flex flex-col">
      <div className="relative h-56 overflow-hidden">
        {images.length > 0 ? (
          <div className="relative h-full w-full">
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={room.name}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                  i === activeIndex ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === activeIndex ? "bg-white" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-ink/5" />
        )}
        <span className="absolute top-4 left-4 bg-cream/95 text-ink text-xs uppercase tracking-wider px-3 py-1 rounded-full font-semibold">
          {room.categoryName}
        </span>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h4 className="font-display text-xl text-ink">{room.name}</h4>
        <p className="text-ink/60 text-sm mt-2 leading-relaxed flex-1">
          {room.description.length > 100 ? `${room.description.slice(0, 100)}...` : room.description}
        </p>
        <div className="flex items-center gap-1.5 text-ink/50 text-sm mt-3">
          <Users size={15} /> Up to {room.maxOccupancy} guests
        </div>
        <div className="flex items-center justify-between mt-5 pt-5 border-t border-ink/5">
          <div>
            <span className="font-display text-2xl text-ink">₹{room.basePrice}</span>
            <span className="text-ink/50 text-sm"> /night</span>
          </div>
          <Link
            href={`/hotel/rooms/${room.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:gap-2.5 transition-all"
          >
            View Details <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}