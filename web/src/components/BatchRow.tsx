import Link from "next/link";
import type { Batch } from "@/lib/traceroot";
import { StatusPill } from "./ui";
import { date } from "@/lib/format";

export function BatchRow({ b }: { b: Batch }) {
  return (
    <Link href={`/batch/${b.id}`}
      className={`group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border bg-white px-5 py-4 transition hover:-translate-y-px hover:shadow-lift md:grid-cols-[64px_1.5fr_.8fr_.9fr_auto] ${b.inheritedRecall ? "border-alert/30" : "border-paper-300/80"}`}>
      <span className="font-display text-xl font-[750] tracking-tight text-forest-500">#{b.id.toString()}</span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-forest">{b.product}</span>
        <span className="block truncate text-sm text-slate-600">{b.origin}</span>
      </span>
      <span className="hidden font-medium tabular-nums md:block">{b.quantity.toString()} {b.unit}</span>
      <span className="hidden text-sm text-slate-600 md:block">Produced {date(b.producedAt)}</span>
      <StatusPill b={b} />
    </Link>
  );
}
