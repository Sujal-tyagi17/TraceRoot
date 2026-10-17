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
    <header className="sticky top-0 z-30 border-b border-paper-300/70 bg-paper/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" aria-label="TraceRoot home"><Logo /></Link>
        <div className="hidden items-center gap-0.5 rounded-full border border-paper-300 bg-white/70 p-1 lg:flex">
          {LINKS.map((l) => {
            const on = path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${on ? "bg-forest text-paper" : "text-slate-600 hover:text-forest"}`}>
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span title="TraceRoot runs on a public test network. No real money is used."
            className="hidden items-center gap-1.5 rounded-full bg-lime/70 px-2.5 py-1 text-xs font-medium text-forest sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-forest-500" /> {chain.name}
          </span>
          <Connect />
          <button className="rounded-full p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </nav>
      {open && (
        <div className="border-t border-paper-300 px-5 pb-3 lg:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-2.5 text-[15px] text-slate">{l.label}</Link>
          ))}
        </div>
      )}
    </header>
  );
}
