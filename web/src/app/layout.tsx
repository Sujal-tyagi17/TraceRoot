import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque/index.css";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";
import { INTRO_BOOT } from "@/components/intro/boot";
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Decides before first paint whether the Origin Sequence plays, so the page never flashes under it. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT }} />
      </head>
      <body className="min-h-screen">
        <OriginSequence />
        <RouteProgress />
        <Providers>
          <Nav />
          <main className="mx-auto max-w-6xl px-5 pt-10 md:pt-14">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
