/** @type {import('tailwindcss').Config} */

/**
 * Admin Design System — deliberately NOT the public site's palette.
 *
 * The public site (frontend/) uses a warm luxury-hospitality theme
 * (ink / gold / cream, display serif). The admin panel is a productivity tool,
 * so it uses a neutral SaaS surface system (white cards on light grey, a single
 * indigo accent, semantic status colours) closer to Stripe / Linear / Vercel.
 *
 * Never import these tokens into frontend/, and never pull `gold`/`cream` in
 * here — the two systems are intentionally separate.
 *
 * Type stack is system-font only (no external font CDN), matching the
 * project-wide convention.
 */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/modules/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral ramp — every surface, border and text colour comes from here.
        surface: {
          DEFAULT: "#ffffff",
          sunken: "#f6f7f9", // app background
          raised: "#ffffff", // cards
          muted: "#f2f4f7", // table headers, inert chips
          hover: "#f9fafb",
        },
        line: {
          DEFAULT: "#e4e7ec", // default border
          strong: "#d0d5dd", // inputs, dividers that need to read
          subtle: "#eef0f3",
        },
        ink: {
          // A cool neutral ramp. Unrelated to the frontend's warm `ink` —
          // admin pages never import the public site's styles.
          900: "#0c111d",
          800: "#101828",
          700: "#344054",
          600: "#475467",
          500: "#667085",
          400: "#98a2b3",
          300: "#d0d5dd",
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
        },
        success: { 50: "#ecfdf3", 100: "#d1fadf", 500: "#12b76a", 600: "#039855", 700: "#027a48" },
        warning: { 50: "#fffaeb", 100: "#fef0c7", 500: "#f79009", 600: "#dc6803", 700: "#b54708" },
        danger: { 50: "#fef3f2", 100: "#fee4e2", 500: "#f04438", 600: "#d92d20", 700: "#b42318" },
        info: { 50: "#eff8ff", 100: "#d1e9ff", 500: "#2e90fa", 600: "#175cd3", 700: "#1849a9" },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        // Nothing below 12px — same accessibility floor the public design system uses.
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.375rem" }],
        md: ["0.9375rem", { lineHeight: "1.5rem" }],
        lg: ["1.0625rem", { lineHeight: "1.625rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
      },
      borderRadius: {
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.5rem",
        lg: "0.625rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(16 24 40 / 0.05)",
        sm: "0 1px 3px 0 rgb(16 24 40 / 0.08), 0 1px 2px -1px rgb(16 24 40 / 0.04)",
        md: "0 4px 8px -2px rgb(16 24 40 / 0.08), 0 2px 4px -2px rgb(16 24 40 / 0.04)",
        lg: "0 12px 16px -4px rgb(16 24 40 / 0.08), 0 4px 6px -2px rgb(16 24 40 / 0.03)",
        xl: "0 20px 24px -4px rgb(16 24 40 / 0.10), 0 8px 8px -4px rgb(16 24 40 / 0.04)",
        ring: "0 0 0 4px rgb(99 102 241 / 0.14)",
      },
      zIndex: {
        sidebar: "40",
        topbar: "45",
        drawer: "60",
        modal: "80",
        toast: "100",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 140ms ease-out",
        "scale-in": "scale-in 140ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slide-up 160ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slide-in-right 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-left": "slide-in-left 180ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
