"use client";
import { useState } from "react";
import { useBatches } from "@/lib/hooks";
import { useDash } from "@/components/DashCtx";
import { Action, parseId } from "@/components/Action";
import { BatchRow } from "@/components/BatchRow";
import { Empty, Field, inputCls } from "@/components/ui";
import { ScanNote } from "@/components/ScanNote";

export default function Recalls() {
  const { can } = useDash();
  const { data } = useBatches();
  const [r, setR] = useState({ id: "", reason: "" });
  const [c, setC] = useState({ id: "", reason: "" });
  const active = (data ?? []).filter((b) => b.inheritedRecall);
  const need = (s: string) => { if (!s.trim()) throw new Error("A reason is required"); return s.trim(); };

  return (
    <div className="space-y-8">
      <div className="stagger grid gap-5 lg:grid-cols-2">
        <Action title="Issue a recall" desc="Every batch split or merged from this one is flagged instantly, on-chain." fn="recallBatch" cta="Recall batch" variant="danger"
          allowed={can.recall}
          build={() => [parseId(r.id), need(r.reason)]}>
          <Field label="Batch #"><input className={inputCls} value={r.id} onChange={(e) => setR({ ...r, id: e.target.value })} /></Field>
          <Field label="Reason"><input className={inputCls} value={r.reason} onChange={(e) => setR({ ...r, reason: e.target.value })} maxLength={280} placeholder="Pesticide residue above limit" /></Field>
        </Action>
        <Action title="Clear a recall" desc="Only the administrator can clear a recall, and must give a reason." fn="clearRecall" cta="Clear recall"
          allowed={can.clearRecall}
          build={() => [parseId(c.id), need(c.reason)]}>
          <Field label="Batch #" hint="The batch that was recalled directly"><input className={inputCls} value={c.id} onChange={(e) => setC({ ...c, id: e.target.value })} /></Field>
          <Field label="Reason"><input className={inputCls} value={c.reason} onChange={(e) => setC({ ...c, reason: e.target.value })} maxLength={280} placeholder="Lab retest passed" /></Field>
        </Action>
      </div>
      <section>
        <h2 className="mb-3 font-display text-xl font-[650] tracking-tight text-ink">Batches currently under recall</h2>
        <ScanNote shown={data?.length} />
        {active.length ? <div className="space-y-2">{active.map((b) => <BatchRow key={b.id.toString()} b={b} />)}</div> : <Empty title="No active recalls" />}
      </section>
    </div>
  );
}
