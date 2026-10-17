"use client";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, PlugZap } from "lucide-react";
import type { ReactNode } from "react";
import type { TxState } from "@/lib/useTx";
import { txLink } from "@/lib/config";
import type { Batch } from "@/lib/traceroot";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-paper-300 bg-white/70 p-5 shadow-[0_1px_0_rgba(23,59,42,.04)] ${className}`}>{children}</div>;
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "bad" | "warn" | "dark" }) {
  const t = {
    neutral: "bg-paper-200 text-slate-600",
    good: "bg-lime text-forest",
    bad: "bg-alert-soft text-alert",
    warn: "bg-amber-soft text-amber",
    dark: "bg-forest text-lime",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}

export function StatusPill({ b }: { b: Batch }) {
  if (b.inheritedRecall) return <Pill tone="bad"><AlertTriangle size={12} /> {b.recalled ? "Recalled" : "Recall (inherited)"}</Pill>;
  if (b.pending) return <Pill tone="warn">In transfer</Pill>;
  if (b.status === "Active") return <Pill tone="good">Active</Pill>;
  if (b.status === "Sold") return <Pill tone="dark">Sold</Pill>;
  return <Pill>{b.status === "Consumed" ? "Split / merged" : b.status}</Pill>;
}

export function Button({ children, variant = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const v = {
    primary: "bg-forest text-paper hover:bg-forest-700",
    ghost: "border border-paper-300 bg-white text-forest hover:bg-paper-200",
    danger: "bg-alert text-white hover:opacity-90",
  }[variant];
  return (
    <button {...p} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 ${v} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-paper-300 bg-white px-3 py-2 text-sm text-slate placeholder:text-slate-400 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-lime";

export function Spinner({ label = "Loading from chain…" }: { label?: string }) {
  return <div className="flex items-center gap-2 py-8 text-sm text-slate-600"><Loader2 className="animate-spin" size={16} /> {label}</div>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-paper-300 px-6 py-10 text-center">
      <p className="font-display text-lg text-forest">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-600">{children}</div>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-lg bg-alert-soft px-4 py-3 text-sm text-alert">{message}</div>;
}

export function NotConfigured() {
  return (
    <Card className="flex gap-4">
      <PlugZap className="mt-1 shrink-0 text-forest" />
      <div className="text-sm text-slate-600">
        <p className="font-medium text-slate">Contract not connected yet</p>
        <p className="mt-1">
          Set <code className="font-mono">NEXT_PUBLIC_CONTRACT_ADDRESS</code> after deploying to the testnet. Nothing is shown here until then — TraceRoot never displays invented on-chain data.{" "}
          <Link href="/docs" className="underline">Setup guide</Link>
        </p>
      </div>
    </Card>
  );
}

export function TxStatus({ state }: { state: TxState }) {
  if (state.phase === "idle") return null;
  if (state.phase === "signing") return <p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 size={14} className="animate-spin" /> Check your wallet…</p>;
  if (state.phase === "pending")
    return <p className="flex items-center gap-2 text-sm text-amber"><Loader2 size={14} className="animate-spin" /> Waiting for confirmation… <TxLink hash={state.hash} /></p>;
  if (state.phase === "confirmed")
    return <p className="flex items-center gap-2 text-sm text-forest-500"><CheckCircle2 size={14} /> Confirmed on-chain. <TxLink hash={state.hash} /></p>;
  return <div className="space-y-1"><ErrorBox message={state.message} />{state.hash && <TxLink hash={state.hash} />}</div>;
}

export function TxLink({ hash }: { hash: string }) {
  return (
    <a href={txLink(hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs underline">
      {hash.slice(0, 10)}… <ExternalLink size={11} />
    </a>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8">
      {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-forest-500">{eyebrow}</p>}
      <h1 className="font-display text-3xl font-semibold text-forest md:text-4xl">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-slate-600">{children}</div>}
    </header>
  );
}
