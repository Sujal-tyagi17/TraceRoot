"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function Lookup({ dark = false }: { dark?: boolean }) {
  const r = useRouter();
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const id = v.trim().replace(/^#/, "");
        if (/^\d+$/.test(id)) r.push(`/batch/${id}`);
      }}
      className={`flex w-full max-w-md items-center gap-2 rounded-xl border p-1.5 ${dark ? "border-forest-700 bg-forest-900" : "border-paper-300 bg-white"}`}
    >
      <Search size={16} className={`ml-2 ${dark ? "text-lime" : "text-slate-400"}`} />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        inputMode="numeric"
        placeholder="Enter a batch number, e.g. 12"
        aria-label="Batch number"
        className={`flex-1 bg-transparent py-1.5 text-sm outline-none ${dark ? "text-paper placeholder:text-paper/50" : ""}`}
      />
      <button className="rounded-lg bg-lime px-3.5 py-1.5 text-sm font-medium text-forest hover:bg-lime-600">Trace</button>
    </form>
  );
}
