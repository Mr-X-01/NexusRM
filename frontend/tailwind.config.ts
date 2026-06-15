import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: "#050505",
          bg2: "#0B0B0F",
          card: "#111116",
          card2: "#17171F",
          red: "#FF2D2D",
          accent: "#E50914",
          border: "#2A2A32",
          muted: "#A1A1AA",
        },
      },
      boxShadow: {
        red: "0 0 40px rgba(255, 45, 45, 0.18)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
