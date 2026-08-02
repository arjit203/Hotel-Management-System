"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowDown, Play } from "lucide-react";
import { EASE_LUXE } from "@/components/motion/variants";
import { cldImage, IMAGE_WIDTHS } from "@/lib/imageUrl";

interface HeroCta {
  label: string;
  href: string;
}

interface HeroProps {
  /** The property/venue name rendered as the masked headline. */
  title: string;
  images: string[]; // gallery images used as slider backdrops
  /** CTAs are required because their routes are vertical-specific. */
  primaryCta: HeroCta;
  secondaryCta: HeroCta;
  /** Brand-level copy — defaults suit any 7 Vachan vertical. */
  eyebrow?: string;
  tagline?: string;
}

const SLIDE_MS = 6500;

/**
 * Cinematic hero.
 *
 * Replaces the previous Swiper fade slider with a hand-built crossfade so each
 * slide can carry its own slow Ken Burns push — the single most effective
 * "expensive hotel" cue. A crossfade of two absolutely-positioned layers is also
 * lighter than Swiper's slider machinery for what is only a background.
 *
 * Layering (bottom → top): image, warm gradient scrim, vignette, content.
 * Everything animated is opacity/transform only.
 *
 * Supports a background video via NEXT_PUBLIC_HERO_VIDEO_URL — optional, and it
 * layers over the stills so the hero still works when it isn't set.
 */
export default function Hero({
  title,
  images,
  primaryCta,
  secondaryCta,
  eyebrow = "Welcome to",
  tagline = "Where quiet luxury meets the warmth of true hospitality.",
}: HeroProps) {
  const reduceMotion = useReducedMotion();
  const slides = images.length > 0 ? images : [];
  const [index, setIndex] = useState(0);
  const videoUrl = process.env.NEXT_PUBLIC_HERO_VIDEO_URL;

  useEffect(() => {
    if (slides.length <= 1 || reduceMotion) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [slides.length, reduceMotion]);

  return (
    <section className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-ink">
      {/* ── Backdrop: crossfading stills with a slow push ── */}
      <div className="absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: EASE_LUXE }}
            className="absolute inset-0"
          >
            {slides.length > 0 ? (
              <div
                className={`h-full w-full bg-cover bg-center ${reduceMotion ? "" : "animate-ken-burns"}`}
                // Hero-sized Cloudinary variant rather than the full original —
                // a 4000px camera file behind a 1920px viewport is several MB.
                style={{ backgroundImage: `url(${cldImage(slides[index], { width: IMAGE_WIDTHS.hero })})` }}
                role="img"
                aria-label={`${title} — property photography`}
              />
            ) : (
              // No imagery uploaded yet: a warm graded panel, never a broken image.
              <div className="h-full w-full bg-gradient-to-br from-ink-light via-ink to-black" />
            )}
          </motion.div>
        </AnimatePresence>

        {videoUrl && (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={slides[0]}
          >
            <source src={videoUrl} />
          </video>
        )}
      </div>

      {/* ── Scrims: bottom-weighted for legibility + a vignette for depth ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/35 to-ink/85"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(20,18,15,0.6)_100%)]"
      />

      {/* ── Content ── */}
      <div className="container-luxe relative z-10 flex h-full flex-col items-center justify-center pb-28 text-center">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_LUXE, delay: 0.2 }}
          className="section-eyebrow flex justify-center !text-gold-light"
        >
          {eyebrow}
        </motion.p>

        {/* Headline: each word rises out of its own mask. Rendered as a single
            <h1> with aria-label so SEO/AT still see one clean heading. */}
        <h1 className="hero-title max-w-5xl" aria-label={title}>
          {reduceMotion ? (
            title
          ) : (
            <motion.span
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.09, delayChildren: 0.35 } } }}
              className="inline-block"
            >
              {title.split(" ").map((word, i, arr) => (
                <span
                  key={`${word}-${i}`}
                  aria-hidden="true"
                  className={`inline-block overflow-hidden pb-[0.14em] align-bottom${
                    i < arr.length - 1 ? " mr-[0.24em]" : ""
                  }`}
                >
                  <motion.span
                    variants={{
                      hidden: { y: "110%" },
                      visible: { y: "0%", transition: { duration: 1.05, ease: EASE_LUXE } },
                    }}
                    className="inline-block will-change-transform"
                  >
                    {word}
                  </motion.span>
                </span>
              ))}
            </motion.span>
          )}
        </h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: EASE_LUXE, delay: 0.95 }}
          className="mt-7 flex flex-col items-center"
        >
          <span aria-hidden="true" className="mb-7 block h-10 w-px bg-gradient-to-b from-gold to-transparent" />
          <p className="max-w-xl text-base font-light leading-relaxed tracking-wide text-cream/75 sm:text-lg">
            {tagline}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_LUXE, delay: 1.15 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link href={primaryCta.href} className="btn-gold group">
            {primaryCta.label} <ArrowRight size={14} className="btn-arrow" />
          </Link>
          <Link href={secondaryCta.href} className="btn-ghost-light group">
            {secondaryCta.label} <ArrowRight size={14} className="btn-arrow" />
          </Link>
        </motion.div>
      </div>

      {/* ── Film cue ──
          The previous hero carried a "Watch Video" placeholder button (kept
          intentionally per the original brief), so it is preserved here rather
          than dropped — restyled as an understated play control. Still a
          placeholder: no video asset/player is wired in. */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: EASE_LUXE, delay: 1.35 }}
        className="absolute bottom-12 left-6 z-10 hidden sm:block lg:left-12"
      >
        <button type="button" className="group flex items-center gap-3.5 text-left" aria-label="Watch the film">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full border border-cream/30
                       text-cream transition-all duration-500 ease-luxe
                       group-hover:scale-105 group-hover:border-gold group-hover:bg-gold group-hover:text-ink"
          >
            <Play size={14} className="ml-0.5 fill-current" />
          </span>
          <span className="text-[10px] uppercase tracking-eyebrow text-cream/55 transition-colors duration-400 group-hover:text-gold">
            Watch
            <br />
            The Film
          </span>
        </button>
      </motion.div>

      {/* ── Slide indicators: thin rules, not dots ── */}
      {slides.length > 1 && (
        <div className="absolute bottom-32 left-1/2 z-10 flex -translate-x-1/2 gap-2.5 sm:bottom-36">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1} of ${slides.length}`}
              aria-current={i === index}
              className={`h-[2px] transition-all duration-600 ease-luxe ${
                i === index ? "w-10 bg-gold" : "w-5 bg-cream/35 hover:bg-cream/60"
              }`}
            />
          ))}
        </div>
      )}

      {/* ── Scroll cue ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 sm:bottom-12"
      >
        <span className="flex flex-col items-center gap-2 text-[9px] uppercase tracking-eyebrow text-cream/45">
          Scroll
          <ArrowDown size={13} className="animate-scroll-hint text-gold" />
        </span>
      </motion.div>
    </section>
  );
}
