"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useTx } from "@/lib/useTx";
import { Button, Card, ErrorBox, TxStatus } from "./ui";

/** A form that builds contract args, sends the tx, and only reports success after confirmation. */
export function Action({
  title, desc, fn, build, children, cta, variant = "primary", allowed = true, deny,
}: {
  title: string;
  desc?: string;
  fn: string;
  build: () => unknown[];
  children?: ReactNode;
  cta: string;
  variant?: "primary" | "danger";
  allowed?: boolean;
  deny?: string;
}) {
  const qc = useQueryClient();
  const { state, send } = useTx(() => qc.invalidateQueries());
  const [err, setErr] = useState<string>();
  const busy = state.phase === "signing" || state.phase === "pending";
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
          <p className="font-display text-lg text-forest">{title}</p>
          {desc && <p className="text-sm text-slate-600">{desc}</p>}
        </div>
        {!allowed ? <p className="rounded-lg bg-paper-200 px-3 py-2 text-sm text-slate-600">{deny ?? "Your wallet does not have the role for this action."}</p> : (
          <>
            {children}
            {err && <ErrorBox message={err} />}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant={variant} disabled={busy}>{busy ? "Working…" : cta}</Button>
              <TxStatus state={state} />
            </div>
          </>
        )}
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
  return s as `0x${string}`;
};
export const parseQty = (v: string) => {
  const s = v.trim();
  if (!/^\d+$/.test(s) || s === "0") throw new Error("Quantity must be a positive whole number");
  return BigInt(s);
};
