/**
 * Design tokens for TypeScript consumers.
 *
 * ── Read this before editing ──
 *
 * There are two token surfaces in this project, on purpose:
 *
 *   1. `frontend/tailwind.config.js` — the source for everything CSS-side
 *      (utility classes: text-gold, bg-ink, rounded-luxe, ease-luxe …).
 *      Components should use those classes, NOT values from this file.
 *
 *   2. This file — the same vocabulary for code that needs a real JS value:
 *      Framer Motion transitions, matchMedia queries, inline SVG, canvas, etc.
 *
 * They MIRROR each other and must be kept in sync by hand. Tailwind's config is
 * CommonJS and `allowJs` is false in tsconfig, so this file cannot import from it
 * without a tsconfig change — which is out of scope for an architecture-only phase.
 * If you change a colour or duration, change it in BOTH places.
 *
 * Canonical reference for the whole system: `docs/DESIGN_SYSTEM.md`.
 */

// ── Colour ───────────────────────────────────────────────────────────────────
export const COLORS = {
  ink: {
    DEFAULT: "#14120f",
    light: "#211d18",
    soft: "#302a22",
  },
  gold: {
    DEFAULT: "#b08d57",
    light: "#d9be8e",
    dark: "#8a6a3d",
    pale: "#efe2cb",
  },
  cream: {
    DEFAULT: "#faf7f2",
    dark: "#f2ebe0",
    deep: "#e8dccb",
  },
  /**
   * Warm neutrals for text. `warm[400]` is the LIGHTEST value permitted for text
   * anywhere on the site — measured on the cream background it is 5.3:1, and
   * anything lighter fails WCAG AA. See docs/DESIGN_SYSTEM.md §3.
   */
  warm: {
    400: "#6f6558",
    500: "#5c5449",
    600: "#4a433a",
  },
} as const;

/** Lightest colour allowed for text, kept explicit so the rule is greppable. */
export const MIN_TEXT_COLOR = COLORS.warm[400];

// ── Typography ───────────────────────────────────────────────────────────────
export const FONTS = {
  /** Cormorant Garamond — headings. Injected as a CSS variable by next/font. */
  display: "var(--font-display)",
  /** Jost — body and UI. */
  sans: "var(--font-sans)",
} as const;

/**
 * Smallest permitted font size, in px. 12px is only ever used for uppercase
 * labels with wide tracking; running text stays at 15px or above.
 */
export const MIN_FONT_PX = 12;
export const MIN_BODY_FONT_PX = 15;

// ── Motion ───────────────────────────────────────────────────────────────────
/** The project's single easing curve. Mirrors `ease-luxe` in tailwind.config.js. */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const EASE_SOFT = [0.4, 0, 0.2, 1] as const;

/** Seconds. Slow deceleration reads as luxury; springy reads as "app". */
export const DURATIONS = {
  fast: 0.35,
  base: 0.7,
  slow: 0.95,
  cinematic: 1.4,
} as const;

/** Milliseconds, for setInterval-driven carousels. */
export const INTERVALS = {
  heroSlide: 6500,
  authSlide: 7000,
  roomCardSlide: 5000,
  testimonialSlide: 6000,
} as const;

// ── Layout ───────────────────────────────────────────────────────────────────
/** Matches Tailwind's default screens, which this project does not override. */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** `(min-width: …)` query for a breakpoint — for matchMedia in client code. */
export function mediaUp(bp: Breakpoint): string {
  return `(min-width: ${BREAKPOINTS[bp]}px)`;
}

export const LAYOUT = {
  /** `max-w-content` — the one page container width. */
  contentMaxWidth: "76rem",
  /** `max-w-prose` — comfortable reading measure. */
  proseMaxWidth: "44rem",
  /** Header height, used by scroll-padding and sticky offsets. */
  headerHeight: { base: "5rem", lg: "7rem" },
} as const;

export const RADII = {
  luxe: "1.5rem",
  airy: "2rem",
} as const;

export const SHADOWS = {
  luxury: "0 18px 50px -18px rgba(20, 18, 15, 0.18)",
  lift: "0 32px 70px -24px rgba(20, 18, 15, 0.32)",
  gold: "0 16px 40px -16px rgba(176, 141, 87, 0.45)",
} as const;

// ── Imagery ──────────────────────────────────────────────────────────────────
/** Re-exported from lib/imageUrl so token consumers have one import surface. */
export { IMAGE_WIDTHS } from "@/lib/imageUrl";
