import type { Config } from "tailwindcss";

// TraceRoot tokens. Brand: forest + lime. Base: cool field-white (not cream).
// Red is reserved for recalls; never decorative.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: "#173B2A", 900: "#0E2A1E", 700: "#22513A", 500: "#3E8A5C", 300: "#9CC3A8" },
        lime: { DEFAULT: "#D4F5A5", 300: "#EAFBD2", 600: "#A9DB63" },
        paper: { DEFAULT: "#F4F6F1", 200: "#E9EEE6", 300: "#D9E1D5" },
        slate: { DEFAULT: "#1E2A24", 600: "#4E5F56", 400: "#7F8E86" },
        alert: { DEFAULT: "#C23B2E", soft: "#FBE3DF" },
        amber: { DEFAULT: "#8A5A0B", soft: "#FAEBC8" },
      },
      fontFamily: {
        display: ["'Bricolage Grotesque Variable'", "'Bricolage Grotesque'", "system-ui", "sans-serif"],
        sans: ["'Instrument Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: { xl: "16px", "2xl": "22px" },
      boxShadow: {
        lift: "0 1px 0 rgba(14,42,30,.04), 0 10px 30px -18px rgba(14,42,30,.28)",
      },
    },
  },
  plugins: [],
} satisfies Config;
