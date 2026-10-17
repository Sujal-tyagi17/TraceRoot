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
      className={`flex w-full max-w-md items-center gap-2 rounded-full border p-1.5 pl-3 transition focus-within:ring-4 ${dark ? "border-forest-700 bg-forest-900 focus-within:ring-lime/20" : "border-paper-300 bg-white shadow-lift focus-within:ring-lime/60"}`}
    >
      <Search size={17} className={dark ? "text-lime" : "text-slate-400"} />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        inputMode="numeric"
        placeholder="Batch number from a label, e.g. 7"
        aria-label="Batch number"
        className={`min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none ${dark ? "text-paper placeholder:text-paper/50" : ""}`}
      />
      <button className={`rounded-full px-5 py-2 text-sm font-semibold transition ${dark ? "bg-lime text-forest hover:bg-lime-600" : "bg-forest text-paper hover:bg-forest-700"}`}>Trace</button>
    </form>
  );
}
