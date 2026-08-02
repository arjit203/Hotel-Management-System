"use client";

import { useCallback, useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";
import { cldImage, IMAGE_WIDTHS } from "@/lib/imageUrl";

/**
 * Draggable before/after comparison — the empty hall against the same hall
 * dressed for an event.
 *
 * This is the single most persuasive image pair a venue can show, because it
 * answers the question every family is actually asking: "what will *our*
 * function look like in *this* room?"
 *
 * Implemented as two stacked images with the top one clipped by `inset()`, so
 * dragging only changes a clip percentage — no re-layout, no re-decode, and it
 * stays on the compositor. Works with pointer, touch and keyboard.
 */
export default function BeforeAfter({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
  alt,
  className,
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  alt: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  return (
    <div
      ref={containerRef}
      className={`media group relative aspect-[4/3] select-none rounded-luxe sm:aspect-[16/10] ${className || ""}`}
      onPointerDown={(e) => {
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        updateFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging) updateFromClientX(e.clientX);
      }}
      onPointerUp={(e) => {
        setDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => setDragging(false)}
    >
      {/* Bottom layer: the finished result. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cldImage(afterSrc, { width: IMAGE_WIDTHS.hero })}
        alt={`${alt} — decorated`}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Top layer: the bare room, clipped to the handle position. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cldImage(beforeSrc, { width: IMAGE_WIDTHS.hero })}
        alt={`${alt} — before decoration`}
        loading="lazy"
        decoding="async"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Corner labels — each fades out as its side is squeezed away. */}
      <span
        style={{ opacity: position > 12 ? 1 : 0 }}
        className="pointer-events-none absolute left-4 top-4 rounded-full bg-ink/60 px-3 py-1.5
                   text-[10px] uppercase tracking-eyebrow text-cream backdrop-blur-sm transition-opacity duration-300"
      >
        {beforeLabel}
      </span>
      <span
        style={{ opacity: position < 88 ? 1 : 0 }}
        className="pointer-events-none absolute right-4 top-4 rounded-full bg-gold/85 px-3 py-1.5
                   text-[10px] uppercase tracking-eyebrow text-ink backdrop-blur-sm transition-opacity duration-300"
      >
        {afterLabel}
      </span>

      {/* Handle */}
      <div
        style={{ left: `${position}%` }}
        className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-cream/90"
      >
        <span
          className={`absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2
                      items-center justify-center rounded-full border border-cream/70 bg-ink/50
                      text-cream backdrop-blur-md transition-transform duration-300 ease-luxe
                      ${dragging ? "scale-110" : "group-hover:scale-105"}`}
        >
          <MoveHorizontal size={16} strokeWidth={1.5} />
        </span>
      </div>

      {/* Keyboard-accessible control layered over the whole comparison. */}
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-label={`${alt} — drag to compare before and after decoration`}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
