import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: "#173B2A", 900: "#0F2A1D", 700: "#22513A", 500: "#3C7A57" },
        lime: { DEFAULT: "#D4F5A5", 300: "#E6FACB", 600: "#A9DB63" },
        paper: { DEFAULT: "#F4F1E8", 200: "#ECE7D9", 300: "#DED7C4" },
        slate: { DEFAULT: "#202B38", 600: "#4A5664", 400: "#7D8794" },
        alert: { DEFAULT: "#B4382A", soft: "#F6DCD6" },
        amber: { DEFAULT: "#9A6B12", soft: "#F5E6C4" },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: { xl: "14px" },
    },
  },
  plugins: [],
} satisfies Config;
