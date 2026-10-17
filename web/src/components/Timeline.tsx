import Link from "next/link";
import { ArrowRightLeft, CheckCheck, CircleSlash, GitMerge, Leaf, Paperclip, ShieldCheck, ShoppingBag, Siren, Split, Thermometer, Undo2 } from "lucide-react";
import type { TimelineEvent } from "@/lib/traceroot";
import { GRADE_LABEL, dateTime, inr, short } from "@/lib/format";
import { TxLink } from "./ui";

const ICON = {
  created: Leaf, proposed: ArrowRightLeft, accepted: CheckCheck, cancelled: CircleSlash, split: Split, merged: GitMerge,
  inspection: ShieldCheck, condition: Thermometer, evidence: Paperclip, sold: ShoppingBag, recalled: Siren, cleared: Undo2,
};

const ipfs = (cid: string) => `https://ipfs.io/ipfs/${cid}`;

function describe(e: TimelineEvent, self: bigint) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- decoded event args are untyped at the ABI boundary
  const d = e.data as Record<string, any>;
  switch (e.kind) {
    case "created": return { t: "Batch created at origin", s: `${d.quantity} ${d.unit} of ${d.product}, ${d.origin}`, cid: d.evidenceCid };
    case "proposed": return { t: "Handoff offered", s: `From ${short(d.from)} to ${short(d.to)}${d.price > 0n ? ` for ${inr(d.price)}` : ""}` };
    case "accepted": return { t: "Handoff accepted", s: `Custody moved to ${short(d.to)}${d.price > 0n ? `, ${inr(d.price)}` : ""}` };
    case "cancelled": return { t: "Handoff cancelled", s: `by ${short(d.by)}` };
    case "split": {
      const kids = d.childIds as bigint[];
      if (d.parentId === self) return { t: `Split into ${kids.length} batches`, s: (d.quantities as bigint[]).map(String).join(" + "), links: kids };
      return { t: `Split from batch #${d.parentId}`, s: "Inherits origin and history of its parent", links: [d.parentId] };
    }
    case "merged": {
      const src = d.sourceIds as bigint[];
      if (d.newBatchId === self) return { t: `Merged from ${src.length} batches`, s: `Total ${d.totalQuantity}`, links: src };
      return { t: `Merged into batch #${d.newBatchId}`, s: "", links: [d.newBatchId] };
    }
    case "inspection": return { t: `Inspected: grade ${d.grade} of 5 (${GRADE_LABEL[Number(d.grade)]})`, s: d.notes || "Declared by inspector", cid: d.reportCid };
    case "condition": return { t: "Condition reading", s: `${(Number(d.temperatureDeciC) / 10).toFixed(1)} °C and ${(Number(d.humidityPermille) / 10).toFixed(1)}% humidity${d.note ? `. ${d.note}` : ""}` };
    case "evidence": return { t: `Evidence added: ${d.kind}`, s: "", cid: d.cid };
    case "sold": return { t: "Sold to consumers", s: d.price > 0n ? `Declared retail price ${inr(d.price)}` : "" };
    case "recalled": return { t: "Recall issued", s: d.reason };
    case "cleared": return { t: "Recall cleared", s: d.reason };
  }
}

export function Timeline({ events, self }: { events: TimelineEvent[]; self: bigint }) {
  return (
    <ol className="stagger relative space-y-7 border-l-2 border-paper-300 pl-8">
      {events.map((e) => {
        const Icon = ICON[e.kind];
        const x = describe(e, self)!;
        const bad = e.kind === "recalled";
        return (
          <li key={`${e.tx}-${e.logIndex}`} className="relative">
            <span className={`absolute -left-[49px] grid h-8 w-8 place-items-center rounded-full ring-4 ring-paper ${bad ? "bg-alert text-white" : "bg-forest text-lime"}`}>
              <Icon size={14} />
            </span>
            <p className={`font-semibold ${bad ? "text-danger" : "text-ink"}`}>{x.t}</p>
            {x.s && <p className="mt-0.5 text-[15px] text-slate-600">{x.s}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span>{dateTime(e.timestamp)}</span>
              {e.actor && <span className="font-mono">{short(e.actor)}</span>}
              <TxLink hash={e.tx} />
              {"cid" in x && x.cid && <a className="underline" href={ipfs(x.cid)} target="_blank" rel="noreferrer">View file</a>}
              {"links" in x && x.links?.map((l: bigint) => <Link key={l.toString()} href={`/batch/${l}`} className="font-mono text-forest-500 underline">#{l.toString()}</Link>)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
