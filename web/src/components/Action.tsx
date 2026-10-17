"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useTx } from "@/lib/useTx";
import { Button, Card, ErrorBox, TxStatus } from "./ui";
import { RootLoader } from "./Loader";

/** A form that builds contract args, sends the tx, and only reports success after confirmation. */
export function Action({
  title, desc, fn, build, children, cta, variant = "primary", allowed = true, disabled = false, footer,
}: {
  title: string;
  desc?: string;
  fn: string;
  build: () => unknown[];
  children?: ReactNode;
  cta: string;
  variant?: "primary" | "danger";
  allowed?: boolean;
  /** Disable submit while the form is invalid (field hints explain why). */
  disabled?: boolean;
  footer?: ReactNode;
}) {
  const qc = useQueryClient();
  const { state, send } = useTx(() => qc.invalidateQueries());
  const [err, setErr] = useState<string>();
  const busy = state.phase === "signing" || state.phase === "pending";
  if (!allowed) return null; // role-aware: forms you can't use are not shown
  return (
    <Card>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErr(undefined);
          let args: unknown[];
          try { args = build(); } catch (x) { return setErr((x as Error).message); }
          send(fn, args);
        }}
      >
        <div>
          <p className="font-display text-xl font-[650] tracking-tight text-forest">{title}</p>
          {desc && <p className="mt-1 text-sm text-slate-600">{desc}</p>}
        </div>
        {children}
        {footer}
        {err && <ErrorBox message={err} />}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant={variant} disabled={busy || disabled} className="press">{busy ? <><RootLoader size={16} label="Working" /> Working…</> : cta}</Button>
          <TxStatus state={state} />
        </div>
      </form>
    </Card>
  );
}

export { parseAddr, parseId, parseQty } from "@/lib/parse";
