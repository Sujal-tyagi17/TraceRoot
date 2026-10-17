"use client";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Search } from "lucide-react";
import { isConfigured } from "@/lib/config";
import { batchCount } from "@/lib/traceroot";
import { RootLoader } from "./Loader";

/** Batch search: validates, checks the batch exists on-chain, then opens its public page. No wallet needed. */
export function Lookup({ dark = false }: { dark?: boolean }) {
  const r = useRouter();
  const id = useId();
  const [v, setV] = useState("");
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const s = v.trim().replace(/^#/, "");
    if (!s) return setErr("Enter the batch number printed on the label.");
    if (!/^\d+$/.test(s) || s === "0") return setErr("Batch numbers are whole numbers, like 7.");
    if (!isConfigured) return setErr("This site isn't connected to a contract yet, so batches can't be looked up.");
    setErr(undefined);
    setBusy(true);
    try {
      const n = await batchCount();
      if (n === 0) return setErr("No batches have been created yet.");
      if (Number(s) > n) return setErr(`There's no batch #${s} yet. The newest is #${n}.`);
      r.push(`/batch/${s}`);
    } catch {
      setErr("Couldn't reach the blockchain. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={go} noValidate className="w-full max-w-md" role="search">
      <label htmlFor={id} className="sr-only">Batch number</label>
      <div className={`flex items-center gap-2 rounded-full border p-1.5 pl-3 transition focus-within:ring-4 ${err ? (dark ? "border-[#FF9A8B]" : "border-danger") : dark ? "border-forest-700" : "border-paper-300"} ${dark ? "bg-forest-900 focus-within:ring-lime/20" : "bg-surface shadow-lift focus-within:ring-lime/60"}`}>
        <Search size={17} className={dark ? "text-lime" : "text-slate-400"} aria-hidden />
        <input id={id} value={v} onChange={(e) => { setV(e.target.value); setErr(undefined); }} inputMode="numeric" autoComplete="off"
          placeholder="Batch number from a label, e.g. 7" aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined}
          className={`min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none ${dark ? "text-cream placeholder:text-cream/50" : ""}`} />
        <button disabled={busy} className={`press inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-70 ${dark ? "bg-lime text-forest hover:bg-lime-600" : "bg-primary text-on-primary hover:bg-primary-hover"}`}>
          {busy ? <><RootLoader size={16} label="Looking up batch" /> Checking</> : "Trace"}
        </button>
      </div>
      <p id={`${id}-err`} role="status" className={`mt-2 min-h-[1.25rem] pl-4 text-sm ${dark ? "text-[#FFB8AD]" : "text-danger"}`}>{err}</p>
    </form>
  );
}
