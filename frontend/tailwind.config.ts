import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: "#FFFFFF",
          bg2: "#F6F7FB",
          card: "#FFFFFF",
          card2: "#F9FAFB",
          red: "#FF2D2D",
          accent: "#E50914",
          border: "#E5E7EB",
          muted: "#667085",
        },
      },
      boxShadow: {
        red: "0 18px 48px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
