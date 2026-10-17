"use client";
import { useState } from "react";
import { useBatches } from "@/lib/hooks";
import { useDash } from "@/components/DashCtx";
import { Action, parseAddr, parseId } from "@/components/Action";
import { Empty, Field, inputCls } from "@/components/ui";
import { dateTime, inr, short, toPaise } from "@/lib/format";

export default function Transfers() {
  const { address, has } = useDash();
  const { data } = useBatches(200);
  const [p, setP] = useState({ id: "", to: "", price: "" });
  const [cond, setCond] = useState({ id: "", t: "", h: "", note: "" });
  const me = address?.toLowerCase();
  const outgoing = (data ?? []).filter((b) => b.pending && b.custodian.toLowerCase() === me);
  const incoming = (data ?? []).filter((b) => b.pending?.to.toLowerCase() === me);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <Action title="Offer a handoff" desc="Step 1 of 2. Custody only moves when the recipient accepts (offers expire after 7 days)."
          fn="proposeTransfer" cta="Send offer" build={() => [parseId(p.id), parseAddr(p.to), toPaise(p.price || "0")]}>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field label="Batch #"><input className={inputCls} value={p.id} onChange={(e) => setP({ ...p, id: e.target.value })} /></Field>
            <Field label="Declared price (₹)" hint="Optional, whole batch"><input className={inputCls} inputMode="decimal" value={p.price} onChange={(e) => setP({ ...p, price: e.target.value })} /></Field>
          </div>
          <Field label="Recipient wallet" hint="Must already hold a TraceRoot role"><input className={`${inputCls} font-mono`} value={p.to} onChange={(e) => setP({ ...p, to: e.target.value })} placeholder="0x…" /></Field>
        </Action>

        <Action title="Log a condition reading" desc="Transporters in custody can record temperature and humidity." fn="recordCondition" cta="Record reading"
          allowed={has("TRANSPORTER")} deny="Only transporters can log condition readings."
          build={() => {
            const t = Math.round(Number(cond.t) * 10), h = Math.round(Number(cond.h) * 10);
            if (!Number.isFinite(t) || t < -32768 || t > 32767) throw new Error("Temperature looks invalid");
            if (!Number.isFinite(h) || h < 0 || h > 1000) throw new Error("Humidity must be 0–100%");
            return [parseId(cond.id), t, h, cond.note];
          }}>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Batch #"><input className={inputCls} value={cond.id} onChange={(e) => setCond({ ...cond, id: e.target.value })} /></Field>
            <Field label="Temp °C"><input className={inputCls} inputMode="decimal" value={cond.t} onChange={(e) => setCond({ ...cond, t: e.target.value })} /></Field>
            <Field label="Humidity %"><input className={inputCls} inputMode="decimal" value={cond.h} onChange={(e) => setCond({ ...cond, h: e.target.value })} /></Field>
          </div>
          <Field label="Note"><input className={inputCls} value={cond.note} onChange={(e) => setCond({ ...cond, note: e.target.value })} maxLength={280} /></Field>
        </Action>
      </div>

      <div className="space-y-5">
        <h2 className="font-display text-xl text-forest">Incoming</h2>
        {incoming.length ? incoming.map((b) => (
          <Action key={b.id.toString()} title={`#${b.id} · ${b.product}`} desc={`${b.quantity} ${b.unit} from ${short(b.custodian)}${b.pending!.price > 0n ? ` · ${inr(b.pending!.price)}` : ""} · expires ${dateTime(b.pending!.expiresAt)}`}
            fn="acceptTransfer" cta="Confirm receipt" build={() => [b.id]} />
        )) : <Empty title="No incoming offers" />}
        <h2 className="font-display text-xl text-forest">Outgoing</h2>
        {outgoing.length ? outgoing.map((b) => (
          <Action key={b.id.toString()} title={`#${b.id} · ${b.product}`} desc={`Offered to ${short(b.pending!.to)} · waiting for acceptance`}
            fn="cancelTransfer" cta="Withdraw offer" variant="danger" build={() => [b.id]} />
        )) : <Empty title="No outgoing offers" />}
      </div>
    </div>
  );
}
