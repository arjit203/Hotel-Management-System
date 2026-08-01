"use client";

import { useState } from "react";

export default function RoomImageGallery({ images, roomName }: { images: string[]; roomName: string }) {
  const [activeImage, setActiveImage] = useState(0);

  return (
    <div>
      <div className="rounded-2xl overflow-hidden h-80 sm:h-96 bg-ink/5">
        {images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[activeImage]} alt={roomName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink/30">No image available</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mt-3">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(i)}
              className={`h-16 sm:h-20 rounded-lg overflow-hidden border-2 ${
                i === activeImage ? "border-gold" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
