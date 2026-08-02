"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Full-screen image preview. Kept from the original gallery behaviour (click a
 * thumbnail to enlarge) but with Escape-to-close and a real close button.
 */
export default function Lightbox({
  src,
  alt = "Enlarged image",
  onClose,
}: {
  src: string | null;
  alt?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!src) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-modal flex animate-fade-in cursor-zoom-out items-center justify-center bg-ink-900/85 p-6"
    >
      <button onClick={onClose} aria-label="Close preview" className="absolute right-4 top-4 btn-icon text-white hover:bg-white/15 hover:text-white">
        <X size={20} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full cursor-default rounded-lg object-contain shadow-xl"
      />
    </div>
  );
}
