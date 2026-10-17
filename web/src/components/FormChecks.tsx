"use client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { isAddress, getAddress, type Address } from "viem";
import { getBatch, rolesOf, ROLE_LABEL, type Batch } from "@/lib/traceroot";
import { isConfigured } from "@/lib/config";

function useDebounced<T>(v: T, ms = 350) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

const toId = (s: string) => { const x = s.trim().replace(/^#/, ""); return /^\d+$/.test(x) && x !== "0" ? BigInt(x) : undefined; };

/** Looks a batch up as the user types its number. */
export function useBatchLookup(raw: string) {
  const id = toId(useDebounced(raw));
  const q = useQuery({ queryKey: ["batch", id?.toString()], queryFn: () => getBatch(id!), enabled: isConfigured && id !== undefined, retry: false });
  return { id, batch: q.data, loading: q.isFetching, missing: !!q.error && /BatchNotFound/.test(String(q.error)), error: q.error };
}

export function useRolesLookup(raw: string) {
  const v = useDebounced(raw.trim());
  const ok = isAddress(v.toLowerCase());
  const q = useQuery({ queryKey: ["roles", v.toLowerCase()], queryFn: () => rolesOf(getAddress(v.toLowerCase()) as Address), enabled: isConfigured && ok });
  return { valid: ok, roles: q.data, loading: q.isFetching };
}

export function Check({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  if (ok === null) return <p className="text-sm text-slate-400">{children}</p>;
  return (
    <p className={`flex items-start gap-1.5 text-sm ${ok ? "text-forest-500" : "text-alert"}`}>
      {ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden /> : <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}

/** One-line summary of a looked-up batch, with whether the connected wallet can act on it. */
export function BatchCheck({ raw, me, look }: { raw: string; me?: string; look: ReturnType<typeof useBatchLookup> }) {
  if (!raw.trim()) return null;
  if (look.id === undefined) return <Check ok={false}>Batch numbers are whole numbers, like 7.</Check>;
  if (look.loading && !look.batch) return <Check ok={null}>Looking up batch #{look.id.toString()}…</Check>;
  if (look.missing) return <Check ok={false}>There&apos;s no batch #{look.id.toString()}.</Check>;
  const b = look.batch;
  if (!b) return null;
  return <Check ok={canAct(b, me) === true}>{describe(b, me)}</Check>;
}

export function canAct(b: Batch, me?: string): true | string {
  if (b.inheritedRecall) return "It's under recall, so it can't move.";
  if (b.status !== "Active") return b.status === "Sold" ? "It has been sold." : "It was already split or merged.";
  if (me && b.custodian.toLowerCase() !== me.toLowerCase()) return "Another wallet holds it.";
  if (b.pending) return "A handoff is already pending.";
  return true;
}

function describe(b: Batch, me?: string) {
  const base = `#${b.id} ${b.product}, ${b.quantity} ${b.unit}.`;
  const c = canAct(b, me);
  return c === true ? `${base} You hold it.` : `${base} ${c}`;
}

export const rolesText = (r?: string[]) => (r && r.length ? r.map((x) => ROLE_LABEL[x as keyof typeof ROLE_LABEL]).join(", ") : "");
