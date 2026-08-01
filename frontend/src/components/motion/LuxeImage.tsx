"use client";

import { useState } from "react";
import { cldImage, cldSrcSet, IMAGE_WIDTHS } from "@/lib/imageUrl";

interface LuxeImageProps {
  src: string;
  alt: string;
  /** Extra classes for the <img> itself (object-fit, sizing). */
  className?: string;
  /** Classes for the clipping wrapper (aspect ratio, radius). */
  wrapperClassName?: string;
  /** Zoom on hover — requires an ancestor with the `group` class. */
  zoom?: boolean;
  /** Skip lazy-loading for above-the-fold imagery (hero, first card). */
  priority?: boolean;
  /** Darkening gradient that fades in on hover — for cards with overlaid text. */
  hoverScrim?: boolean;
  /** Rendered width in px, used to request a right-sized Cloudinary variant. */
  width?: number;
  /** CSS `sizes` describing the slot, so the browser picks from the srcset. */
  sizes?: string;
}

/**
 * Image presentation primitive: shimmering skeleton while loading, soft fade +
 * de-scale once decoded, optional hover zoom and scrim.
 *
 * Deliberately a plain <img>, not next/image. Sources are arbitrary Cloudinary
 * `secure_url` strings and next/image would require whitelisting remote hosts in
 * next.config.js — a config change outside this phase's brief. Cloudinary
 * already applies `quality:auto:good, fetch_format:auto` server-side (see
 * backend/src/utils/cloudinary.util.ts), so the bytes are already optimised.
 */
export default function LuxeImage({
  src,
  alt,
  className = "",
  wrapperClassName = "",
  zoom = false,
  priority = false,
  hoverScrim = false,
  width = IMAGE_WIDTHS.card,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
}: LuxeImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`media ${wrapperClassName}`}>
      {!loaded && <div className="skeleton absolute inset-0" aria-hidden="true" />}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cldImage(src, { width })}
        srcSet={cldSrcSet(src, [Math.round(width / 2), width, width * 2])}
        sizes={sizes}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        onLoad={() => setLoaded(true)}
        // If a URL 404s we still clear the skeleton, so a broken image never
        // leaves a shimmer looping forever.
        onError={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-[opacity,transform] duration-900 ease-luxe ${
          loaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.04]"
        } ${zoom ? "group-hover:scale-[1.06] will-change-transform" : ""} ${className}`}
      />

      {hoverScrim && <span className="scrim-soft" />}
    </div>
  );
}
