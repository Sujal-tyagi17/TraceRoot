"use client";
import Link from "next/link";
import { use } from "react";
import { AlertOctagon, MapPin, Package, User } from "lucide-react";
import { useAncestors, useBatch, useHistory } from "@/lib/hooks";
import { addrLink, isConfigured } from "@/lib/config";
import { date, inr, short } from "@/lib/format";
import { Card, Empty, ErrorBox, NotConfigured, Spinner, StatusPill } from "@/components/ui";
import { Timeline } from "@/components/Timeline";
import { Qr } from "@/components/Qr";

export default function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = use(params);
  const valid = /^\d+$/.test(raw) && raw !== "0";
  const id = valid ? BigInt(raw) : undefined;
  const batch = useBatch(id);
  const hist = useHistory(id);
  const anc = useAncestors(batch.data);

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
        <div className="flex gap-3 rounded-xl border border-alert/30 bg-alert-soft p-4 text-alert">
          <AlertOctagon className="shrink-0" />
          <div>
            <p className="font-semibold">Do not consume — this batch is under recall</p>
            <p className="text-sm">
              {b.recalled ? "This batch was recalled directly." : recalledAncestor ? <>It descends from recalled batch <Link className="underline" href={`/batch/${recalledAncestor.id}`}>#{recalledAncestor.id.toString()}</Link>.</> : "One of its source batches was recalled."}{" "}
              This status is computed by the smart contract.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-mono text-sm text-forest-500">Batch #{b.id.toString()}</p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-forest">{b.product}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <StatusPill b={b} />
            <span className="inline-flex items-center gap-1"><Package size={14} /> {b.quantity.toString()} {b.unit}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={14} /> {b.origin}</span>
            <span>Produced {date(b.producedAt)}</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">{merged ? "Merged by" : "Original producer"}</p>
              <a href={addrLink(b.producer)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm text-forest underline"><User size={13} />{short(b.producer, 6)}</a>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Current custodian</p>
              <a href={addrLink(b.custodian)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm text-forest underline"><User size={13} />{short(b.custodian, 6)}</a>
              {b.pending && <p className="mt-1 text-xs text-amber">Offered to {short(b.pending.to)}{b.pending.price > 0n && ` for ${inr(b.pending.price)}`} · awaiting acceptance</p>}
            </Card>
          </div>
        </div>
        <Card className="self-start"><Qr id={b.id.toString()} /></Card>
      </div>

      {(b.parents.length > 0 || b.children.length > 0) && (
        <Card>
          <p className="mb-3 font-display text-lg text-forest">Lineage</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {anc.data?.map((gen, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="flex flex-wrap gap-1">
                  {gen.map((a) => (
                    <Link key={a.id.toString()} href={`/batch/${a.id}`} className={`rounded-lg border px-2.5 py-1 font-mono ${a.recalled ? "border-alert/40 bg-alert-soft text-alert" : "border-paper-300 bg-paper"}`}>#{a.id.toString()}</Link>
                  ))}
                </span>
                <span className="text-slate-400">→</span>
              </span>
            ))}
            <span className="rounded-lg bg-forest px-2.5 py-1 font-mono text-lime">#{b.id.toString()}</span>
            {b.children.length > 0 && <span className="text-slate-400">→</span>}
            {b.children.map((c) => <Link key={c.toString()} href={`/batch/${c}`} className="rounded-lg border border-paper-300 bg-paper px-2.5 py-1 font-mono">#{c.toString()}</Link>)}
          </div>
          {b.parents.length > 0 && <p className="mt-3 text-xs text-slate-400">Earlier handoffs happened on ancestor batches — open them to see the full journey from origin.</p>}
        </Card>
      )}

      <section>
        <h2 className="mb-5 font-display text-2xl font-semibold text-forest">Journey</h2>
        {hist.isLoading ? <Spinner label="Reconstructing history from events…" /> : hist.error ? <ErrorBox message={String(hist.error)} /> :
          <Timeline events={hist.data ?? []} self={b.id} />}
        <p className="mt-6 text-xs text-slate-400">Prices and inspection grades are declarations signed by the participant shown, not independent verification.</p>
      </section>
    </div>
  );
}
