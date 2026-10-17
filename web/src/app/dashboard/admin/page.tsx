"use client";
import { useState } from "react";
import { useDash } from "@/components/DashCtx";
import { Action, parseAddr } from "@/components/Action";
import { Field, inputCls } from "@/components/ui";
import { ROLES, ROLE_LABEL, roleId, type RoleName } from "@/lib/traceroot";
import { addrLink, chain, contractAddress } from "@/lib/config";

export default function Admin() {
  const { has } = useDash();
  const [g, setG] = useState<{ role: RoleName; addr: string }>({ role: "PRODUCER", addr: "" });
  const [rv, setRv] = useState<{ role: RoleName; addr: string }>({ role: "PRODUCER", addr: "" });
  const isAdmin = has("ADMIN");
  const deny = "Only the administrator can manage roles.";
  const opts = ROLES.filter((r) => r !== "ADMIN").map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>);

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        Contract <a className="font-mono underline" href={addrLink(contractAddress!)} target="_blank" rel="noreferrer">{contractAddress}</a> on {chain.name}.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        <GrantForm title="Grant a role" fn="grantRole" cta="Grant role" state={g} set={setG} allowed={isAdmin} deny={deny} opts={opts} />
        <GrantForm title="Revoke a role" fn="revokeRole" cta="Revoke role" state={rv} set={setRv} allowed={isAdmin} deny={deny} opts={opts} danger />
      </div>
    </div>
  );
}

function GrantForm({ title, fn, cta, state, set, allowed, deny, opts, danger }: {
  title: string; fn: string; cta: string; state: { role: RoleName; addr: string }; set: (v: { role: RoleName; addr: string }) => void;
  allowed: boolean; deny: string; opts: React.ReactNode; danger?: boolean;
}) {
  return (
    <Action title={title} fn={fn} cta={cta} allowed={allowed} deny={deny} variant={danger ? "danger" : "primary"}
      build={() => [roleId(state.role), parseAddr(state.addr)]}>
      <Field label="Role">
        <select className={inputCls} value={state.role} onChange={(e) => set({ ...state, role: e.target.value as RoleName })}>{opts}</select>
      </Field>
      <Field label="Wallet address"><input className={`${inputCls} font-mono`} value={state.addr} onChange={(e) => set({ ...state, addr: e.target.value })} placeholder="0x…" /></Field>
    </Action>
  );
}
