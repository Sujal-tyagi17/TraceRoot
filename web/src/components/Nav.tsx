"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { Connect } from "./Connect";
import { chain } from "@/lib/config";

const LINKS = [
  { href: "/explorer", label: "Explorer" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/participants", label: "Participants" },
  { href: "/docs", label: "Docs" },
];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-paper-300/80 bg-paper/90 backdrop-blur">
      <div className="bg-forest py-1 text-center text-[11px] font-medium tracking-wide text-lime">
        Testnet demo on {chain.name} · no real money involved
      </div>
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="TraceRoot home"><Logo /></Link>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className={`rounded-lg px-3 py-2 text-sm transition ${path.startsWith(l.href) ? "bg-paper-200 font-medium text-forest" : "text-slate-600 hover:text-forest"}`}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Connect />
          <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </nav>
      {open && (
        <div className="border-t border-paper-300 px-4 pb-3 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-2 text-sm text-slate">{l.label}</Link>
          ))}
        </div>
      )}
    </header>
  );
}
