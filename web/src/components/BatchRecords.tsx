import { BadgeCheck, ReceiptIndianRupee } from "lucide-react";
import type { TimelineEvent } from "@/lib/traceroot";
import { GRADE_LABEL, date, inr, short } from "@/lib/format";
import { Card, TxLink } from "./ui";

/** Inspections and declared prices for one batch, pulled from its on-chain events. */
export function BatchRecords({ events, unit, quantity }: { events: TimelineEvent[]; unit: string; quantity: bigint }) {
  const inspections = events.filter((e) => e.kind === "inspection");
  const prices = events.filter((e) => (e.kind === "accepted" || e.kind === "sold") && Number(e.data.price as bigint) > 0);
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card>
        <h2 className="flex items-center gap-2 font-display text-xl font-[650] tracking-tight text-forest"><BadgeCheck size={19} className="text-forest-500" aria-hidden /> Quality records</h2>
        {inspections.length === 0 ? <p className="mt-3 text-sm text-slate-600">No inspections recorded for this batch yet.</p> : (
          <ul className="mt-4 divide-y divide-paper-300">
            {inspections.map((e) => {
              const g = Number(e.data.grade);
              return (
                <li key={e.tx + e.logIndex} className="py-3 first:pt-0">
                  <p className="font-semibold text-slate">Grade {g} of 5 <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${g <= 2 ? "bg-amber-soft text-amber" : "bg-lime text-forest"}`}>{GRADE_LABEL[g]}</span></p>
                  {e.data.notes ? <p className="mt-0.5 text-sm text-slate-600">{String(e.data.notes)}</p> : null}
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-400">
                    <span>{date(e.timestamp)}</span><span>by <span className="font-mono">{short(e.actor)}</span></span><TxLink hash={e.tx} />
                    {e.data.reportCid ? <a className="underline" href={`https://ipfs.io/ipfs/${e.data.reportCid}`} target="_blank" rel="noreferrer">Report</a> : null}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-xs text-slate-400">Grades are signed declarations by the inspector, not lab results.</p>
      </Card>
      <Card>
        <h2 className="flex items-center gap-2 font-display text-xl font-[650] tracking-tight text-forest"><ReceiptIndianRupee size={19} className="text-forest-500" aria-hidden /> Declared prices</h2>
        {prices.length === 0 ? <p className="mt-3 text-sm text-slate-600">No prices were declared for this batch.</p> : (
          <table className="mt-4 w-full text-sm">
            <thead><tr className="text-left text-slate-400"><th className="pb-2 font-medium">Step</th><th className="pb-2 font-medium">Whole batch</th><th className="pb-2 font-medium">Per {unit}</th></tr></thead>
            <tbody className="divide-y divide-paper-300">
              {prices.map((e) => {
                const p = e.data.price as bigint;
                return (
                  <tr key={e.tx + e.logIndex}>
                    <td className="py-2.5 pr-3">{e.kind === "sold" ? "Retail sale" : <>Handoff to <span className="font-mono text-xs">{short(e.data.to as string)}</span></>}<div className="text-xs text-slate-400">{date(e.timestamp)}</div></td>
                    <td className="py-2.5 pr-3 font-medium tabular-nums">{inr(p)}</td>
                    <td className="py-2.5 tabular-nums text-slate-600">{inr(Number(p) / Number(quantity))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="mt-4 text-xs text-slate-400">Prices are what each seller declared on-chain, in rupees. They are not verified market prices.</p>
      </Card>
    </div>
  );
}
