"use client";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, PlugZap } from "lucide-react";
import type { ReactNode } from "react";
import type { TxState } from "@/lib/useTx";
import { explorerUrl } from "@/lib/config";
import { ExplorerLink } from "./ExplorerLink";
import type { Batch } from "@/lib/traceroot";
import { RootLoader } from "./Loader";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-paper-300/80 bg-surface p-6 shadow-lift ${className}`}>{children}</div>;
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "bad" | "warn" | "dark" }) {
  const t = {
    neutral: "bg-paper-200 text-slate-600",
    good: "bg-lime text-forest",
    bad: "bg-danger-soft text-danger",
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
    primary: "bg-primary text-on-primary hover:bg-primary-hover active:translate-y-px",
    ghost: "border border-paper-300 bg-surface text-ink hover:bg-paper-200",
    danger: "bg-alert text-white hover:bg-[#a83226] active:translate-y-px",
  }[variant];
  return (
    <button {...p} className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 ${v} ${className}`}>
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
  "w-full rounded-xl border border-paper-300 bg-paper/60 px-3.5 py-2.5 text-[15px] text-slate placeholder:text-slate-400 transition focus:border-forest-500 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-lime/60";

export function Spinner({ label = "Reading from the blockchain…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-sm text-slate-600">
      <RootLoader label={label || "Loading"} />
      {label && <span>{label}</span>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-paper-300 bg-surface/40 px-6 py-10 text-center">
      <p className="font-display text-lg font-[650] text-ink">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-600">{children}</div>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div role="alert" className="break-words rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger [overflow-wrap:anywhere]">{message}</div>;
}

export function NotConfigured() {
  return (
    <Card className="flex gap-4">
      <PlugZap className="mt-1 shrink-0 text-ink" />
      <div className="text-sm text-slate-600">
        <p className="font-semibold text-slate">Contract not connected yet</p>
        <p className="mt-1">
          Set <code className="font-mono">NEXT_PUBLIC_CONTRACT_ADDRESS</code> after deploying to the testnet. Nothing is shown here until then — TraceRoot never displays invented on-chain data.{" "}
          <Link href="/docs" className="underline">Setup guide</Link>
        </p>
      </div>
    </Card>
  );
}

const ERROR_TITLE = { rejected: "You cancelled it in your wallet", reverted: "The contract rejected it", network: "Network problem", setup: "Not ready yet" } as const;

/** Truthful transaction feedback. Success appears only after the receipt confirms it. */
export function TxStatus({ state }: { state: TxState }) {
  if (state.phase === "idle") return null;
  let body: ReactNode;
  if (state.phase === "signing") body = <p className="flex items-center gap-2 text-sm text-slate-600"><RootLoader size={18} label="Waiting for wallet" /> Approve it in your wallet…</p>;
  else if (state.phase === "pending")
    body = <p className="flex flex-wrap items-center gap-2 text-sm text-amber"><RootLoader size={18} label="Confirming" /> Submitted. Confirming on the blockchain… <TxLink hash={state.hash} /></p>;
  else if (state.phase === "confirmed")
    body = <p className="confirm-pop flex flex-wrap items-center gap-2 rounded-full bg-lime px-3 py-1 text-sm font-medium text-forest"><CheckCircle2 size={15} /> Confirmed on-chain <TxLink hash={state.hash} /></p>;
  else body = (
    <div className={`rounded-xl px-4 py-3 text-sm ${state.kind === "rejected" || state.kind === "setup" ? "bg-paper-200 text-slate" : "bg-danger-soft text-danger"}`}>
      <p className="font-semibold">{ERROR_TITLE[state.kind]}</p>
      <p className="mt-0.5">{state.message}</p>
      {state.hash && <p className="mt-1"><TxLink hash={state.hash} /></p>}
    </div>
  );
  return <div role="status" aria-live="polite" className="w-full sm:w-auto">{body}</div>;
}

export function TxLink({ hash }: { hash: string }) {
  return (
    <ExplorerLink kind="tx" value={hash} className="inline-flex items-center gap-1 font-mono text-xs underline">{hash.slice(0, 10)}…{explorerUrl && <ExternalLink size={11} />}</ExplorerLink>
  );
}

/** `eyebrow` is accepted for compatibility but intentionally not rendered. */
export function PageHeader({ title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-10">
      <h1 className="font-display text-4xl font-[750] leading-[1.02] tracking-[-0.035em] text-ink md:text-5xl">{title}</h1>
      {children && <div className="mt-3 max-w-xl text-[17px] text-slate-600">{children}</div>}
    </header>
  );
}
