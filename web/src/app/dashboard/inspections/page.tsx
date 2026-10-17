"use client";
import { useState } from "react";
import { useDash } from "@/components/DashCtx";
import { Action, parseId } from "@/components/Action";
import { Field, inputCls } from "@/components/ui";
import { GRADE_LABEL } from "@/lib/format";

export default function Inspections() {
  const { has } = useDash();
  const [f, setF] = useState({ id: "", grade: "4", cid: "", notes: "" });
  return (
    <div className="max-w-xl">
      <Action title="Record an inspection" desc="Your wallet signs this record. It shows what you declared — it is not independent proof of physical quality."
        fn="recordInspection" cta="Record inspection" allowed={has("INSPECTOR")} deny="Only wallets with the Inspector role can record inspections."
        build={() => [parseId(f.id), Number(f.grade), f.cid.trim(), f.notes]}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Batch #"><input className={inputCls} value={f.id} onChange={(e) => setF({ ...f, id: e.target.value })} /></Field>
          <Field label="Grade">
            <select className={inputCls} value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}>
              {[5, 4, 3, 2, 1].map((g) => <option key={g} value={g}>{g} — {GRADE_LABEL[g]}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Report CID (optional)" hint="Upload the PDF to IPFS, paste the CID"><input className={inputCls} value={f.cid} onChange={(e) => setF({ ...f, cid: e.target.value })} placeholder="bafy…" /></Field>
        <Field label="Notes"><textarea className={inputCls} rows={3} maxLength={280} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Moisture 11.8%, no visible mould" /></Field>
      </Action>
    </div>
  );
}
