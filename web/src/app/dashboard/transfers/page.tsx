"use client";
import { useState } from "react";
import { useBatches } from "@/lib/hooks";
import { useDash } from "@/components/DashCtx";
import { Action, parseAddr, parseId } from "@/components/Action";
import { Empty, Field, inputCls } from "@/components/ui";
import { BatchCheck, Check, canAct, rolesText, useBatchLookup, useRolesLookup } from "@/components/FormChecks";
import { dateTime, inr, short, toPaise } from "@/lib/format";

export default function Transfers() {
  const { address, can } = useDash();
  const { data } = useBatches(200);
  const [p, setP] = useState({ id: "", to: "", price: "" });
  const [cond, setCond] = useState({ id: "", t: "", h: "", note: "" });
  const look = useBatchLookup(p.id);
  const rec = useRolesLookup(p.to);
  const me = address?.toLowerCase();
  const outgoing = (data ?? []).filter((b) => b.pending && b.custodian.toLowerCase() === me);
  const incoming = (data ?? []).filter((b) => b.pending?.to.toLowerCase() === me);

  return (
    <div className="stagger grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <Action title="Offer a handoff" desc="Step 1 of 2. Custody moves only when the recipient accepts. Offers expire after 7 days."
          fn="proposeTransfer" cta="Send offer" build={() => [parseId(p.id), parseAddr(p.to), toPaise(p.price || "0")]}
          disabled={!look.batch || canAct(look.batch, address) !== true || !rec.valid || (!!rec.roles && rec.roles.filter((r) => r !== "ADMIN").length === 0) || rec.roles === undefined || p.to.trim().toLowerCase() === address?.toLowerCase() || (!!p.price && !/^\d+(\.\d{1,2})?$/.test(p.price))}
          footer={<div className="space-y-1">
            <BatchCheck raw={p.id} me={address} look={look} />
            {p.to.trim() && (!rec.valid ? <Check ok={false}>That isn&apos;t a valid wallet address. It should start with 0x and have 40 more characters.</Check>
              : p.to.trim().toLowerCase() === address?.toLowerCase() ? <Check ok={false}>You can&apos;t hand a batch to yourself.</Check>
              : rec.loading ? <Check ok={null}>Checking the recipient&apos;s role…</Check>
              : rec.roles && rec.roles.filter((r) => r !== "ADMIN").length ? <Check ok>Recipient holds: {rolesText(rec.roles)}.</Check>
              : <Check ok={false}>This wallet has no TraceRoot role yet, so the contract would reject it. Ask the administrator to grant one.</Check>)}
            {p.price && !/^\d+(\.\d{1,2})?$/.test(p.price) && <Check ok={false}>Enter a price in rupees, like 16000 or 16000.50.</Check>}
          </div>}>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field label="Batch #"><input className={inputCls} value={p.id} onChange={(e) => setP({ ...p, id: e.target.value })} /></Field>
            <Field label="Declared price (₹)" hint="Optional, whole batch"><input className={inputCls} inputMode="decimal" value={p.price} onChange={(e) => setP({ ...p, price: e.target.value })} /></Field>
          </div>
          <Field label="Recipient wallet" hint="Must already hold a TraceRoot role"><input className={`${inputCls} font-mono`} value={p.to} onChange={(e) => setP({ ...p, to: e.target.value })} placeholder="0x…" /></Field>
        </Action>

        <Action title="Log a condition reading" desc="Transporters in custody can record temperature and humidity." fn="recordCondition" cta="Record reading"
          allowed={can.logCondition}
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
        <h2 className="font-display text-xl font-[650] tracking-tight text-ink">Incoming</h2>
        {incoming.length ? incoming.map((b) => (
          <Action key={b.id.toString()} title={`#${b.id} · ${b.product}`} desc={`${b.quantity} ${b.unit} from ${short(b.custodian)}${b.pending!.price > 0n ? ` · ${inr(b.pending!.price)}` : ""} · expires ${dateTime(b.pending!.expiresAt)}`}
            fn="acceptTransfer" cta="Confirm receipt" build={() => [b.id]} />
        )) : <Empty title="No incoming offers" />}
        <h2 className="font-display text-xl font-[650] tracking-tight text-ink">Outgoing</h2>
        {outgoing.length ? outgoing.map((b) => (
          <Action key={b.id.toString()} title={`#${b.id} · ${b.product}`} desc={`Offered to ${short(b.pending!.to)} · waiting for acceptance`}
            fn="cancelTransfer" cta="Withdraw offer" variant="danger" build={() => [b.id]} />
        )) : <Empty title="No outgoing offers" />}
      </div>
    </div>
  );
}
