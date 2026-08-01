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
        // 7 Vachan brand palette — deep ink + warm gold, cream backgrounds.
        // Used consistently across Hotel (and, later, Restaurant/Hall) pages.
        ink: {
          DEFAULT: "#12110f",
          light: "#1f1d1a",
        },
        gold: {
          DEFAULT: "#b08d57",
          light: "#d4b483",
          dark: "#8a6a3d",
        },
        cream: {
          DEFAULT: "#faf7f2",
          dark: "#efe6d8",
        },
      },
      fontFamily: {
        // Premium system-font stacks — no external font CDN dependency
        // (more robust for production than relying on Google Fonts uptime).
        display: ["Georgia", "Cambria", "'Times New Roman'", "serif"],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "'Helvetica Neue'",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        luxury: "0 20px 60px -15px rgba(18, 17, 15, 0.25)",
      },
    },
  },
  plugins: [],
};
