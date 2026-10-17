"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { getAddress } from "viem";
import { useTx } from "@/lib/useTx";
import { Button, Card, ErrorBox, TxStatus } from "./ui";

/** A form that builds contract args, sends the tx, and only reports success after confirmation. */
export function Action({
  title, desc, fn, build, children, cta, variant = "primary", allowed = true,
}: {
  title: string;
  desc?: string;
  fn: string;
  build: () => unknown[];
  children?: ReactNode;
  cta: string;
  variant?: "primary" | "danger";
  allowed?: boolean;
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
        {err && <ErrorBox message={err} />}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant={variant} disabled={busy}>{busy ? "Working…" : cta}</Button>
          <TxStatus state={state} />
        </div>
      </form>
    </Card>
  );
}

export const parseId = (v: string, label = "Batch number") => {
  const s = v.trim().replace(/^#/, "");
  if (!/^\d+$/.test(s) || s === "0") throw new Error(`${label} must be a positive whole number`);
  return BigInt(s);
};
export const parseAddr = (v: string) => {
  const s = v.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(s)) throw new Error("Enter a valid 0x… wallet address");
  // Normalise casing so a mistyped checksum never blocks a valid address.
  return getAddress(s.toLowerCase());
};
export const parseQty = (v: string) => {
  const s = v.trim();
  if (!/^\d+$/.test(s) || s === "0") throw new Error("Quantity must be a positive whole number");
  return BigInt(s);
};
