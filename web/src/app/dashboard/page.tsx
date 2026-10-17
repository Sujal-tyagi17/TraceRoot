"use client";
import Link from "next/link";
import { useBatches } from "@/lib/hooks";
import { useDash } from "@/components/DashCtx";
import { BatchRow } from "@/components/BatchRow";
import { Card, Empty, ErrorBox } from "@/components/ui";
import { RowSkeleton, Skel } from "@/components/Loader";
import { CountUp } from "@/components/Reveal";
import { Action } from "@/components/Action";
import { inr, short } from "@/lib/format";

export default function Overview() {
  const { address } = useDash();
  const { data, isLoading, error } = useBatches(200);
  if (isLoading) return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="space-y-3 p-5"><Skel className="h-3 w-24" /><Skel className="h-9 w-12" /></Card>)}</div>
      <RowSkeleton rows={3} />
    </div>
  );
  if (error) return <ErrorBox message={String(error)} />;
  const all = data ?? [];
  const me = address?.toLowerCase();
  const mine = all.filter((b) => b.custodian.toLowerCase() === me && b.status === "Active");
  const incoming = all.filter((b) => b.pending?.to.toLowerCase() === me);
  const recalled = mine.filter((b) => b.inheritedRecall);
  const stats = [
    ["In your custody", mine.length], ["Incoming handoffs", incoming.length],
    ["Recalls affecting you", recalled.length], ["Batches on TraceRoot", all.length],
  ] as const;

  return (
    <div className="space-y-8">
      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([l, v]) => (
          <Card key={l} className="p-5">
            <p className="text-sm text-slate-600">{l}</p>
            <p className={`mt-2 font-display text-4xl font-[750] tracking-tight ${l.startsWith("Recalls") && v ? "text-alert" : "text-forest"}`}><CountUp value={v} /></p>
          </Card>
        ))}
      </div>

      {incoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-2xl font-[750] tracking-tight text-forest">Waiting for your acceptance</h2>
          {incoming.map((b) => (
            <Action key={b.id.toString()} title={`#${b.id} · ${b.product} — ${b.quantity} ${b.unit}`}
              desc={`From ${short(b.custodian)}${b.pending!.price > 0n ? ` · declared ${inr(b.pending!.price)}` : ""}. Accept only after you physically receive it.`}
              fn="acceptTransfer" build={() => [b.id]} cta="Confirm receipt" />
          ))}
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl font-[750] tracking-tight text-forest">Batches you hold</h2>
          <Link href="/dashboard/batches" className="text-sm font-medium text-forest underline decoration-forest/30 underline-offset-4">Manage batches</Link>
        </div>
        {mine.length ? <div className="stagger space-y-2">{mine.map((b) => <BatchRow key={b.id.toString()} b={b} />)}</div> : <Empty title="Nothing in your custody">Create a batch or accept a handoff to get started.</Empty>}
      </section>
    </div>
  );
}
