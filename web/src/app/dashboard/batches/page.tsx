"use client";
import { useState } from "react";
import { useDash } from "@/components/DashCtx";
import { Action, parseId, parseQty } from "@/components/Action";
import { Field, inputCls } from "@/components/ui";
import { BatchCheck, Check, canAct, useBatchLookup } from "@/components/FormChecks";
import { useQueries } from "@tanstack/react-query";
import { getBatch } from "@/lib/traceroot";
import { isConfigured } from "@/lib/config";
import { toPaise } from "@/lib/format";

export default function Batches() {
  const { can, address } = useDash();
  const [c, setC] = useState({ product: "", qty: "", unit: "kg", origin: "", date: "", cid: "" });
  const [ev, setEv] = useState({ id: "", kind: "photo", cid: "" });
  const [sold, setSold] = useState({ id: "", price: "" });
  const soldLook = useBatchLookup(sold.id);

  return (
    <div className="stagger grid gap-5 lg:grid-cols-2">
      <Action title="Create a batch" desc="Register a new lot at its origin." fn="createBatch" cta="Create batch"
        allowed={can.createBatch} disabled={!c.product.trim() || !c.origin.trim() || !c.date || !/^[1-9]\d*$/.test(c.qty.trim())}
        build={() => {
          if (!c.product.trim() || !c.origin.trim()) throw new Error("Product and origin are required");
          if (!c.date) throw new Error("Pick the production or harvest date");
          const ts = Math.floor(new Date(c.date).getTime() / 1000);
          return [c.product.trim(), parseQty(c.qty), c.unit.trim(), c.origin.trim(), BigInt(ts), c.cid.trim()];
        }}>
        <Field label="Product"><input className={inputCls} value={c.product} onChange={(e) => setC({ ...c, product: e.target.value })} placeholder="Arabica coffee beans" maxLength={96} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity" hint={c.qty && !/^\d+$/.test(c.qty.trim()) ? "Use a whole number, like 100" : "Whole units"}><input className={inputCls} inputMode="numeric" aria-invalid={!!c.qty && !/^\d+$/.test(c.qty.trim())} value={c.qty} onChange={(e) => setC({ ...c, qty: e.target.value })} placeholder="100" /></Field>
          <Field label="Unit"><input className={inputCls} value={c.unit} onChange={(e) => setC({ ...c, unit: e.target.value })} maxLength={16} /></Field>
        </div>
        <Field label="Origin"><input className={inputCls} value={c.origin} onChange={(e) => setC({ ...c, origin: e.target.value })} placeholder="Chikmagalur, Karnataka" maxLength={96} /></Field>
        <Field label="Produced / harvested on"><input type="date" className={inputCls} value={c.date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setC({ ...c, date: e.target.value })} /></Field>
        <Field label="Evidence CID (optional)" hint="IPFS CID of a photo or certificate"><input className={inputCls} value={c.cid} onChange={(e) => setC({ ...c, cid: e.target.value })} placeholder="bafy…" /></Field>
      </Action>

      <div className="space-y-5">
        <SplitForm allowed={can.splitMerge} me={address} />
        <MergeForm allowed={can.splitMerge} me={address} />
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
        disabled={!soldLook.batch || canAct(soldLook.batch, address) !== true || (!!sold.price && !/^\d+(\.\d{1,2})?$/.test(sold.price))}
        footer={<div className="space-y-1"><BatchCheck raw={sold.id} me={address} look={soldLook} />
          {sold.price && !/^\d+(\.\d{1,2})?$/.test(sold.price) && <Check ok={false}>Enter a price in rupees, like 960 or 960.50.</Check>}</div>}
        build={() => [parseId(sold.id), toPaise(sold.price || "0")]}>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label="Batch #"><input className={inputCls} value={sold.id} onChange={(e) => setSold({ ...sold, id: e.target.value })} /></Field>
          <Field label="Declared retail price (₹)" hint="For the whole batch"><input className={inputCls} inputMode="decimal" value={sold.price} onChange={(e) => setSold({ ...sold, price: e.target.value })} /></Field>
        </div>
      </Action>
    </div>
  );
}

function SplitForm({ allowed, me }: { allowed: boolean; me?: string }) {
  const [id, setId] = useState("");
  const [parts, setParts] = useState("");
  const look = useBatchLookup(id);
  const nums = parts.split(/[,+\s]+/).filter(Boolean);
  const bad = nums.find((x) => !/^[1-9]\d*$/.test(x));
  const sum = nums.reduce((a, x) => a + (/^\d+$/.test(x) ? Number(x) : 0), 0);
  const total = look.batch ? Number(look.batch.quantity) : undefined;
  const ready = !!look.batch && canAct(look.batch, me) === true && !bad && nums.length >= 2 && nums.length <= 20 && sum === total;
  return (
    <Action title="Split a batch" desc="The parent is used up by the split. The parts must add up exactly to its quantity, so include any remainder as a part."
      fn="splitBatch" cta="Split" allowed={allowed} disabled={!ready}
      build={() => [parseId(id), nums.map(parseQty)]}>
      <div className="grid grid-cols-[110px_1fr] gap-3">
        <Field label="Batch #"><input className={inputCls} inputMode="numeric" value={id} onChange={(e) => setId(e.target.value)} /></Field>
        <Field label="Parts" hint="Separate with commas, e.g. 40, 60"><input className={inputCls} value={parts} onChange={(e) => setParts(e.target.value)} /></Field>
      </div>
      <div className="space-y-1">
        <BatchCheck raw={id} me={me} look={look} />
        {parts.trim() && (bad ? <Check ok={false}>&quot;{bad}&quot; isn&apos;t a positive whole number.</Check>
          : nums.length < 2 ? <Check ok={false}>Add at least two parts.</Check>
          : nums.length > 20 ? <Check ok={false}>A split can have at most 20 parts.</Check>
          : total === undefined ? <Check ok={null}>Parts add up to {sum}.</Check>
          : <Check ok={sum === total}>{nums.join(" + ")} = {sum} of {total} {look.batch!.unit}{sum === total ? ". Quantity is conserved." : sum < total ? `. ${total - sum} ${look.batch!.unit} unaccounted for.` : `. ${sum - total} ${look.batch!.unit} too many.`}</Check>)}
      </div>
    </Action>
  );
}

function MergeForm({ allowed, me }: { allowed: boolean; me?: string }) {
  const [raw, setRaw] = useState("");
  const ids = [...new Set(raw.split(/[,\s]+/).filter(Boolean))];
  const badId = ids.find((x) => !/^[1-9]\d*$/.test(x.replace(/^#/, "")));
  const qs = useQueries({ queries: ids.filter(() => !badId).map((x) => ({ queryKey: ["batch", x.replace(/^#/, "")], queryFn: () => getBatch(BigInt(x.replace(/^#/, ""))), enabled: isConfigured, retry: false })) });
  const loading = qs.some((q) => q.isFetching && !q.data);
  const missing = qs.findIndex((q) => q.error);
  const bs = qs.map((q) => q.data).filter(Boolean) as NonNullable<(typeof qs)[number]["data"]>[];
  const blocked = bs.find((b) => canAct(b, me) !== true);
  const mixed = bs.some((b) => b.product !== bs[0].product || b.unit !== bs[0].unit);
  const total = bs.reduce((a, b) => a + Number(b.quantity), 0);
  const ready = !badId && ids.length >= 2 && ids.length <= 8 && bs.length === ids.length && !blocked && !mixed;
  return (
    <Action title="Merge batches" desc="Combine 2 to 8 batches you hold. They must be the same product, measured in the same unit."
      fn="mergeBatches" cta="Merge" allowed={allowed} disabled={!ready}
      build={() => [ids.map((x) => parseId(x))]}>
      <Field label="Batch numbers" hint="Separate with commas, e.g. 4, 7, 9"><input className={inputCls} value={raw} onChange={(e) => setRaw(e.target.value)} /></Field>
      {raw.trim() && (
        <div className="space-y-1">
          {badId ? <Check ok={false}>&quot;{badId}&quot; isn&apos;t a batch number.</Check>
            : ids.length < 2 ? <Check ok={false}>Add at least two batches.</Check>
            : ids.length > 8 ? <Check ok={false}>You can merge at most 8 batches at once.</Check>
            : loading ? <Check ok={null}>Looking up batches…</Check>
            : missing >= 0 ? <Check ok={false}>There&apos;s no batch #{ids.at(missing)}.</Check>
            : blocked ? <Check ok={false}>#{blocked.id.toString()} can&apos;t be merged: {String(canAct(blocked, me)).toLowerCase()}</Check>
            : mixed ? <Check ok={false}>These batches aren&apos;t all the same product and unit.</Check>
            : <Check ok>{ids.length} batches of {bs[0].product} become one batch of {total} {bs[0].unit}.</Check>}
        </div>
      )}
    </Action>
  );
}
