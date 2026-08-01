/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/modules/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── 7 Vachan brand palette (unchanged names, refined values) ──
        // The ink / gold / cream token names are kept exactly as-is because
        // every existing page references them (text-gold, bg-ink, bg-cream-dark,
        // etc.). Values are refined toward a warmer, deeper luxury range and new
        // shades are added ADDITIVELY, so no existing class changes meaning.
        ink: {
          DEFAULT: "#14120f", // deep charcoal — headings, dark sections
          light: "#211d18",
          soft: "#302a22", // raised surfaces on dark sections
        },
        gold: {
          DEFAULT: "#b08d57", // primary brand accent (unchanged)
          light: "#d9be8e",
          dark: "#8a6a3d",
          pale: "#efe2cb", // hairlines / subtle fills on cream
        },
        cream: {
          DEFAULT: "#faf7f2", // page background (unchanged)
          dark: "#f2ebe0", // alternating section background
          deep: "#e8dccb", // dividers on cream
        },
        // Warm neutral for body copy — warmer and calmer than ink/60, which
        // reads slightly cold at long paragraph lengths.
        //
        // Every step is deliberately dark enough to clear WCAG AA (4.5:1) for
        // NORMAL-size text on the cream background, measured against #faf7f2:
        //   warm-400 #6f6558 → 5.3:1 · warm-500 #5c5449 → 6.5:1 · warm-600 #4a433a → 8.1:1
        // The previous lighter values (#a1978b / #8a7f72) measured 2.4:1 and
        // 3.6:1 — they failed AA for body copy and read washed-out. Fixing this
        // at the token level upgrades contrast everywhere at once, with no
        // per-component edits.
        warm: {
          400: "#6f6558",
          500: "#5c5449",
          600: "#4a433a",
        },
      },
      fontFamily: {
        // Wired to next/font (self-hosted at build time — no runtime font CDN).
        // Cormorant Garamond: high-contrast luxury serif for display type.
        // Jost: geometric sans for body/UI — the classic hospitality pairing.
        display: ["var(--font-display)", "Cormorant Garamond", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Jost", "-apple-system", "Segoe UI", "sans-serif"],
      },
      fontSize: {
        // Display scale with tracking + leading baked in, so headings are
        // consistent everywhere instead of being re-tuned per page.
        "display-sm": ["clamp(1.75rem, 1.4rem + 1.6vw, 2.5rem)", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "display-md": ["clamp(2.25rem, 1.7rem + 2.6vw, 3.5rem)", { lineHeight: "1.1", letterSpacing: "-0.015em" }],
        "display-lg": ["clamp(2.75rem, 1.9rem + 4vw, 4.75rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-xl": ["clamp(3.25rem, 2rem + 6vw, 6.5rem)", { lineHeight: "1", letterSpacing: "-0.025em" }],
      },
      letterSpacing: {
        eyebrow: "0.32em",
        luxe: "0.18em",
      },
      maxWidth: {
        content: "76rem", // shared page container width — consistent rhythm
        prose: "44rem",
      },
      borderRadius: {
        luxe: "1.5rem",
        airy: "2rem",
      },
      boxShadow: {
        // `luxury` is kept (widely used) but softened; the rest are new.
        luxury: "0 18px 50px -18px rgba(20, 18, 15, 0.18)",
        lift: "0 32px 70px -24px rgba(20, 18, 15, 0.32)",
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
        gold: "0 16px 40px -16px rgba(176, 141, 87, 0.45)",
      },
      transitionTimingFunction: {
        // Single easing vocabulary for every hover/transition in the UI.
        luxe: "cubic-bezier(0.22, 1, 0.36, 1)", // decelerate — reveals, hovers
        soft: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        400: "400ms",
        600: "600ms",
        900: "900ms",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "ken-burns": {
          "0%": { transform: "scale(1) translate3d(0,0,0)" },
          "100%": { transform: "scale(1.12) translate3d(0, -1.5%, 0)" },
        },
        "scroll-hint": {
          "0%": { transform: "translateY(0)", opacity: "0" },
          "35%": { opacity: "1" },
          "100%": { transform: "translateY(14px)", opacity: "0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        "ken-burns": "ken-burns 14s ease-out forwards",
        "scroll-hint": "scroll-hint 2s cubic-bezier(0.22, 1, 0.36, 1) infinite",
      },
    },
  },
  plugins: [],
};
