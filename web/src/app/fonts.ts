import localFont from "next/font/local";

/**
 * Self-hosted fonts, served from this app (no external requests). All three are licensed under the
 * SIL Open Font License 1.1, which permits bundling them; the licence texts sit beside the files.
 * next/font preloads them and generates size-adjusted fallbacks, so text doesn't shift when they load.
 */
export const display = localFont({
  src: "./fonts/bricolage-grotesque-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-display",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

export const sans = localFont({
  src: [
    { path: "./fonts/instrument-sans-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/instrument-sans-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/instrument-sans-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

export const mono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/jetbrains-mono-latin-500-normal.woff2", weight: "500" },
  ],
  variable: "--font-mono",
  display: "swap",
  preload: false, // only used for addresses and hashes
  fallback: ["ui-monospace", "Consolas", "monospace"],
});
