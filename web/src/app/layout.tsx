import type { Metadata } from "next";
import "./globals.css";
import { display, mono, sans } from "./fonts";
import { INTRO_BOOT } from "@/components/intro/boot";
import { THEME_BOOT } from "@/lib/themeBoot";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { OriginSequence } from "@/components/intro/OriginSequence";
import { RouteProgress } from "@/components/RouteProgress";

export const metadata: Metadata = {
  title: { default: "TraceRoot — Every Product Has a Story.", template: "%s · TraceRoot" },
  description: "TraceRoot is a blockchain supply chain provenance platform. Trace every batch. Verify every handoff.",
  openGraph: { title: "TraceRoot", description: "Trace Every Batch. Verify Every Handoff." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        {/* Decides before first paint whether the Origin Sequence plays, so the page never flashes under it. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT + INTRO_BOOT }} />
      </head>
      <body className="min-h-screen">
        <OriginSequence />
        <RouteProgress />
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-primary">Skip to main content</a>
          <Nav />
          <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-5 pt-10 outline-none md:pt-14">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
