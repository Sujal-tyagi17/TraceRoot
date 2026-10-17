import Link from "next/link";
import type { Batch } from "@/lib/traceroot";
import { StatusPill } from "./ui";
import { date, short } from "@/lib/format";

export function BatchRow({ b }: { b: Batch }) {
  return (
    <Link href={`/batch/${b.id}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl border border-paper-300 bg-white/70 px-4 py-3 transition hover:border-forest-500/40 hover:bg-white md:grid-cols-[70px_1.4fr_1fr_1fr_auto]">
      <span className="font-mono text-sm text-forest-500">#{b.id.toString()}</span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-forest">{b.product}</span>
        <span className="block truncate text-xs text-slate-600">{b.origin}</span>
      </span>
      <span className="hidden text-sm md:block">{b.quantity.toString()} {b.unit}</span>
      <span className="hidden text-xs text-slate-600 md:block">{date(b.producedAt)} · {short(b.custodian)}</span>
      <StatusPill b={b} />
    </Link>
  );
}
