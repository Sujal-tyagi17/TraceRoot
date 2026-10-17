"use client";
import { useState } from "react";
import { useDash } from "@/components/DashCtx";
import { Action, parseId, parseQty } from "@/components/Action";
import { Field, inputCls } from "@/components/ui";
import { toPaise } from "@/lib/format";

export default function Batches() {
  const { can } = useDash();
  const [c, setC] = useState({ product: "", qty: "", unit: "kg", origin: "", date: "", cid: "" });
  const [split, setSplit] = useState({ id: "", parts: "" });
  const [merge, setMerge] = useState("");
  const [ev, setEv] = useState({ id: "", kind: "photo", cid: "" });
  const [sold, setSold] = useState({ id: "", price: "" });

  return (
    <div className="stagger grid gap-5 lg:grid-cols-2">
      <Action title="Create a batch" desc="Register a new lot at its origin." fn="createBatch" cta="Create batch"
        allowed={can.createBatch}
        build={() => {
          if (!c.product.trim() || !c.origin.trim()) throw new Error("Product and origin are required");
          if (!c.date) throw new Error("Pick the production or harvest date");
          const ts = Math.floor(new Date(c.date).getTime() / 1000);
          return [c.product.trim(), parseQty(c.qty), c.unit.trim(), c.origin.trim(), BigInt(ts), c.cid.trim()];
        }}>
        <Field label="Product"><input className={inputCls} value={c.product} onChange={(e) => setC({ ...c, product: e.target.value })} placeholder="Arabica coffee beans" maxLength={96} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity" hint="Whole units"><input className={inputCls} inputMode="numeric" value={c.qty} onChange={(e) => setC({ ...c, qty: e.target.value })} placeholder="100" /></Field>
          <Field label="Unit"><input className={inputCls} value={c.unit} onChange={(e) => setC({ ...c, unit: e.target.value })} maxLength={16} /></Field>
        </div>
        <Field label="Origin"><input className={inputCls} value={c.origin} onChange={(e) => setC({ ...c, origin: e.target.value })} placeholder="Chikmagalur, Karnataka" maxLength={96} /></Field>
        <Field label="Produced / harvested on"><input type="date" className={inputCls} value={c.date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setC({ ...c, date: e.target.value })} /></Field>
        <Field label="Evidence CID (optional)" hint="IPFS CID of a photo or certificate"><input className={inputCls} value={c.cid} onChange={(e) => setC({ ...c, cid: e.target.value })} placeholder="bafy…" /></Field>
      </Action>

      <div className="space-y-5">
        <Action title="Split a batch" desc="The parent is fully consumed. Parts must add up exactly to its quantity — include any remainder as a part."
          fn="splitBatch" cta="Split" allowed={can.splitMerge}
          build={() => {
            const parts = split.parts.split(/[,+\s]+/).filter(Boolean).map(parseQty);
            if (parts.length < 2) throw new Error("Enter at least two parts, e.g. 40, 60");
            return [parseId(split.id), parts];
          }}>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field label="Batch #"><input className={inputCls} value={split.id} onChange={(e) => setSplit({ ...split, id: e.target.value })} /></Field>
            <Field label="Parts" hint="e.g. 40, 60"><input className={inputCls} value={split.parts} onChange={(e) => setSplit({ ...split, parts: e.target.value })} /></Field>
          </div>
        </Action>

        <Action title="Merge batches" desc="Combine 2–8 batches of the same product and unit that you hold."
          fn="mergeBatches" cta="Merge" allowed={can.splitMerge}
          build={() => [merge.split(/[,\s]+/).filter(Boolean).map((x) => parseId(x))]}>
          <Field label="Batch numbers" hint="e.g. 4, 7, 9"><input className={inputCls} value={merge} onChange={(e) => setMerge(e.target.value)} /></Field>
        </Action>
      </div>

      <Action title="Attach evidence" allowed={can.addEvidence} desc="Add an IPFS CID (photo, invoice, transport doc) to a batch you hold." fn="addEvidence" cta="Attach"
        build={() => { if (!ev.cid.trim()) throw new Error("CID is required"); return [parseId(ev.id), ev.kind, ev.cid.trim()]; }}>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label="Batch #"><input className={inputCls} value={ev.id} onChange={(e) => setEv({ ...ev, id: e.target.value })} /></Field>
          <Field label="Kind">
            <select className={inputCls} value={ev.kind} onChange={(e) => setEv({ ...ev, kind: e.target.value })}>
              {["photo", "certificate", "invoice", "transport-doc", "lab-report"].map((k) => <option key={k}>{k}</option>)}
            </select>
          </Field>
        </div>
        <Field label="CID"><input className={inputCls} value={ev.cid} onChange={(e) => setEv({ ...ev, cid: e.target.value })} placeholder="bafy…" /></Field>
      </Action>

      <Action title="Mark as sold" desc="Final step for retailers. Sold batches cannot move again." fn="markSold" cta="Mark sold"
        allowed={can.markSold}
        build={() => [parseId(sold.id), toPaise(sold.price || "0")]}>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label="Batch #"><input className={inputCls} value={sold.id} onChange={(e) => setSold({ ...sold, id: e.target.value })} /></Field>
          <Field label="Declared retail price (₹)" hint="For the whole batch"><input className={inputCls} inputMode="decimal" value={sold.price} onChange={(e) => setSold({ ...sold, price: e.target.value })} /></Field>
        </div>
      </Action>
    </div>
  );
}
