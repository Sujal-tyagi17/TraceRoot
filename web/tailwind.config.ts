import type { Config } from "tailwindcss";

/**
 * TraceRoot tokens. Theme-aware colours are CSS variables (RGB channels, see globals.css) so one
 * class works in light and dark. Brand constants (forest, lime, cream) are fixed in both themes.
 * Red is reserved for recalls and genuine errors.
 */
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // fixed brand colours (deep-green surfaces, chips, intro)
        forest: { DEFAULT: "#173B2A", 900: "#0E2A1E", 700: "#22513A", 500: v("sprout"), 300: "#9CC3A8" },
        lime: { DEFAULT: "#D4F5A5", 300: "#EAFBD2", 600: "#A9DB63" },
        cream: "#F4F6F1",
        // theme-aware
        paper: { DEFAULT: v("paper"), 200: v("paper-200"), 300: v("paper-300") },
        surface: v("surface"),
        ink: v("ink"),
        slate: { DEFAULT: v("slate"), 600: v("slate-600"), 400: v("slate-400") },
        primary: { DEFAULT: v("primary"), hover: v("primary-hover") },
        "on-primary": v("on-primary"),
        danger: { DEFAULT: v("danger"), soft: v("danger-soft") },
        alert: { DEFAULT: "#C23B2E", soft: v("danger-soft") }, // solid recall red, same in both themes
        amber: { DEFAULT: v("amber"), soft: v("amber-soft") },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { xl: "16px", "2xl": "22px" },
      boxShadow: { lift: "var(--shadow-lift)" },
    },
  },
  plugins: [],
} satisfies Config;
