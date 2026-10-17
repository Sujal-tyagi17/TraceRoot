"use client";
import Link from "next/link";
import { use } from "react";
import { AlertOctagon, ArrowRightLeft, CalendarDays, MapPin, Package, User } from "lucide-react";
import type { ReactNode } from "react";
import { useAncestors, useBatch, useChildren, useHistory } from "@/lib/hooks";
import { addrLink, isConfigured } from "@/lib/config";
import { date, inr, short } from "@/lib/format";
import { Card, Empty, ErrorBox, NotConfigured, Spinner, StatusPill } from "@/components/ui";

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[13px] text-slate-400">{icon}{label}</dt>
      <dd className="mt-1 text-[15px] font-medium text-slate">{value}</dd>
    </div>
  );
}
import { Timeline } from "@/components/Timeline";
import { Qr } from "@/components/Qr";

const chip = (recalled: boolean) =>
  `rounded-lg border px-2.5 py-1 font-mono ${recalled ? "border-alert/40 bg-alert-soft text-alert" : "border-paper-300 bg-paper"}`;

export default function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = use(params);
  const valid = /^\d+$/.test(raw) && raw !== "0";
  const id = valid ? BigInt(raw) : undefined;
  const batch = useBatch(id);
  const hist = useHistory(id);
  const anc = useAncestors(batch.data);
  const kids = useChildren(batch.data);

  if (!isConfigured) return <NotConfigured />;
  if (!valid) return <Empty title="That is not a batch number" />;
  if (batch.isLoading) return <Spinner />;
  if (batch.error) {
    const nf = /BatchNotFound/.test(String(batch.error));
    return nf ? <Empty title={`Batch #${raw} does not exist`}><Link href="/explorer" className="underline">Browse batches</Link></Empty> : <ErrorBox message={String(batch.error)} />;
  }
  const b = batch.data!;
  const recalledAncestor = anc.data?.flat().find((a) => a.recalled);
  const merged = b.parents.length > 1 || b.origin.startsWith("Merged lot");

  return (
    <div className="space-y-8">
      {b.inheritedRecall && (
        <div role="alert" className="flex gap-4 rounded-2xl bg-alert p-5 text-white shadow-lift">
          <AlertOctagon className="mt-0.5 shrink-0" />
          <div>
            <p className="font-display text-xl font-[650] tracking-tight">Do not use this product. It is under recall.</p>
            <p className="mt-1 text-sm text-white/90">
              {b.recalled ? "This batch was recalled directly." : recalledAncestor ? <>It descends from recalled batch <Link className="font-semibold underline" href={`/batch/${recalledAncestor.id}`}>#{recalledAncestor.id.toString()}</Link>.</> : "One of its source batches was recalled."}{" "}
              The smart contract sets this status, not the website.
            </p>
          </div>
        </div>
      )}

      {/* The batch as a produce tag: facts on the left, a perforated QR stub on the right. */}
      <article className={`relative grid overflow-hidden rounded-2xl border bg-white shadow-lift md:grid-cols-[1fr_auto] ${b.inheritedRecall ? "border-alert/40" : "border-paper-300/80"}`}>
        <div className="p-6 md:p-9">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${b.inheritedRecall ? "bg-alert text-white" : "bg-forest text-lime"}`}>Batch #{b.id.toString()}</span>
            <StatusPill b={b} />
          </div>
          <h1 className="mt-5 font-display text-[2.6rem] font-[750] leading-[1] tracking-[-0.04em] text-forest md:text-6xl">{b.product}</h1>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            <Fact icon={<Package size={15} />} label="Quantity" value={`${b.quantity.toString()} ${b.unit}`} />
            <Fact icon={<MapPin size={15} />} label="Origin" value={b.origin} />
            <Fact icon={<CalendarDays size={15} />} label="Produced" value={date(b.producedAt)} />
            <Fact icon={<User size={15} />} label={merged ? "Merged by" : "Original producer"}
              value={<a href={addrLink(b.producer)} target="_blank" rel="noreferrer" className="font-mono text-[14px] underline decoration-forest/30 underline-offset-4 hover:decoration-forest">{short(b.producer, 5)}</a>} />
            <Fact icon={<User size={15} />} label="Held by"
              value={<a href={addrLink(b.custodian)} target="_blank" rel="noreferrer" className="font-mono text-[14px] underline decoration-forest/30 underline-offset-4 hover:decoration-forest">{short(b.custodian, 5)}</a>} />
            {b.pending && <Fact icon={<ArrowRightLeft size={15} />} label="Waiting for" value={<span className="text-amber">{short(b.pending.to)} to accept{b.pending.price > 0n && `, ${inr(b.pending.price)}`}</span>} />}
          </dl>
        </div>
        <div className="relative flex flex-col items-center justify-center gap-2 border-t-2 border-dashed border-paper-300 bg-paper/60 p-6 md:border-l-2 md:border-t-0 md:px-9">
          {/* punched notches where the stub tears off */}
          <span aria-hidden className="absolute -left-3 -top-3 hidden h-6 w-6 rounded-full bg-paper md:block" />
          <span aria-hidden className="absolute -bottom-3 -left-3 hidden h-6 w-6 rounded-full bg-paper md:block" />
          <Qr id={b.id.toString()} />
          <p className="text-xs text-slate-600">Scan to verify this batch</p>
        </div>
      </article>

      {(b.parents.length > 0 || b.children.length > 0) && (
        <Card>
          <p className="mb-4 font-display text-xl font-[650] tracking-tight text-forest">Where it came from and where it went</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {anc.data?.map((gen, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="flex flex-wrap gap-1">
                  {gen.map((a) => (
                    <Link key={a.id.toString()} href={`/batch/${a.id}`} title={a.inheritedRecall ? "Under recall" : undefined} className={chip(a.inheritedRecall)}>#{a.id.toString()}</Link>
                  ))}
                </span>
                <span className="text-slate-400">→</span>
              </span>
            ))}
            <span aria-current="page" className={`rounded-lg px-2.5 py-1 font-mono ${b.inheritedRecall ? "bg-alert text-white" : "bg-forest text-lime"}`}>#{b.id.toString()}</span>
            {b.children.length > 0 && <span className="text-slate-400">→</span>}
            {b.children.map((c) => {
              const k = kids.data?.find((x) => x.id === c);
              const r = k?.inheritedRecall ?? false;
              return <Link key={c.toString()} href={`/batch/${c}`} title={r ? "Under recall" : undefined} className={chip(r)}>#{c.toString()}</Link>;
            })}
          </div>
          {b.parents.length > 0 && <p className="mt-3 text-xs text-slate-400">Earlier handoffs happened on ancestor batches — open them to see the full journey from origin.</p>}
        </Card>
      )}

      <section>
        <h2 className="mb-6 font-display text-3xl font-[750] tracking-[-0.03em] text-forest">Journey</h2>
        {hist.isLoading ? <Spinner label="Reconstructing history from events…" /> : hist.error ? <ErrorBox message={String(hist.error)} /> :
          <Timeline events={hist.data ?? []} self={b.id} />}
        <p className="mt-6 text-xs text-slate-400">Prices and inspection grades are declarations signed by the participant shown, not independent verification.</p>
      </section>
    </div>
  );
}
