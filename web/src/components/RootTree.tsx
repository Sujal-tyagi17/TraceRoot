"use client";
import { useMemo, useState } from "react";
import { AlertOctagon, RotateCcw, Siren } from "lucide-react";
import { CONSERVATION, DEMO_EDGES, DEMO_NODES, ancestorsOf, demoNode, depthOf, descendantsOf, type DemoNode } from "@/lib/demoNetwork";

/**
 * Landing hero: an interactive, illustrative root network.
 * - Click / Enter on a stage shows what happens there.
 * - Hover or focus highlights that stage's lineage (everything above and below it).
 * - "Recall the source" turns the source and every descendant recall-red, level by level.
 * Example data only (see lib/demoNetwork.ts); nothing here is sent to the blockchain.
 */
const W = 520, HGT = 510, NW = 170, NH = 46;
const POS: Record<string, { x: number; y: number }> = {
  origin: { x: 260, y: 34 }, producer: { x: 260, y: 110 }, trader: { x: 260, y: 186 },
  lotB: { x: 140, y: 308 }, lotC: { x: 380, y: 308 }, transporter: { x: 140, y: 386 }, inspector: { x: 380, y: 386 },
  shopA: { x: 140, y: 464 }, shopB: { x: 380, y: 464 },
};
const BADGE = { x: 260, y: 236 };
const LIME = "#D4F5A5", LIME2 = "#A9DB63", PAPER = "#F4F6F1", DEEP = "#0E2A1E";
const CORAL = "#FF9A8B", CORAL_DEEP = "#4A1F1A";

function edge(p: string, c: string) {
  const a = POS[p], b = POS[c];
  const y0 = p === "trader" ? BADGE.y + 13 : a.y + NH / 2, y1 = b.y - NH / 2, my = (y0 + y1) / 2;
  return `M${a.x},${y0} C${a.x},${my} ${b.x},${my} ${b.x},${y1}`;
}

const recallTargets = new Set(["origin", ...descendantsOf("origin")]);
const affected = DEMO_NODES.filter((n) => recallTargets.has(n.id));
const affectedBatches = affected.filter((n) => n.kind === "parent" || n.kind === "child").length;
const affectedShops = affected.filter((n) => n.kind === "shop").length;

export function RootTree() {
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [recalled, setRecalled] = useState(false);

  const focus = hover ?? selected;
  const lineage = useMemo(() => (focus ? new Set([focus, ...ancestorsOf(focus), ...descendantsOf(focus)]) : null), [focus]);
  const lit = (id: string) => !lineage || lineage.has(id);
  const sel = selected ? demoNode(selected) : null;

  const description = recalled
    ? `Example network under recall: the origin farm and all ${affected.length - 1} stages downstream are flagged, including ${affectedShops} shop deliveries.`
    : "Example network: an origin farm's 100 kg lot passes through a producer to a trader, who splits it into a 40 kg lot (transported to a Delhi shop) and a 60 kg lot (inspected, then sold in Mumbai).";

  const nodeEl = (n: DemoNode) => {
    const p = POS[n.id], d = depthOf(n.id);
    const red = recalled && recallTargets.has(n.id);
    const parent = n.kind === "parent", child = n.kind === "child";
    const fill = red ? CORAL_DEEP : parent ? LIME : DEEP;
    const ink = red ? CORAL : parent ? DEEP : LIME;
    const isSel = selected === n.id;
    return (
      <g key={n.id} role="button" tabIndex={0} aria-pressed={isSel}
        aria-label={`${n.label}, ${n.sub}${red ? ", under recall" : ""}. Show details`}
        onClick={() => setSelected(isSel ? null : n.id)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(isSel ? null : n.id); } }}
        onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
        onFocus={() => setHover(n.id)} onBlur={() => setHover(null)}
        className="grow-node cursor-pointer outline-none [&:focus-visible>rect.ring]:opacity-100"
        style={{ ["--d" as string]: `${0.1 + d * 0.18}s`, transformOrigin: `${p.x}px ${p.y}px`, transformBox: "view-box" }}>
        <g className="flow" style={{ opacity: lit(n.id) ? 1 : 0.32, ["--fd" as string]: recalled ? `${d * 0.18}s` : "0s" }}>
          <rect className="ring opacity-0 transition-opacity" x={p.x - NW / 2 - 5} y={p.y - NH / 2 - 5} width={NW + 10} height={NH + 10} rx={(NH + 10) / 2} fill="none" stroke={PAPER} strokeWidth="2" />
          <rect className="flow" x={p.x - NW / 2} y={p.y - NH / 2} width={NW} height={NH} rx={NH / 2}
            fill={fill} stroke={red ? CORAL : LIME} strokeWidth={isSel ? 3 : child ? 1.5 : 1.8} strokeDasharray={child ? "6 4" : undefined}
            style={{ ["--fd" as string]: recalled ? `${d * 0.18}s` : "0s" }} />
          <text className="flow" x={p.x} y={p.y - 2} textAnchor="middle" fontSize="17" fontWeight={650} fill={ink} style={{ ["--fd" as string]: recalled ? `${d * 0.18}s` : "0s" }}>{n.label}</text>
          <text x={p.x} y={p.y + 15} textAnchor="middle" fontSize="12.5" fill={parent && !red ? DEEP : PAPER} fillOpacity={parent && !red ? 0.8 : 0.72} className="max-sm:hidden">{n.sub}</text>
        </g>
      </g>
    );
  };

  return (
    <figure className="relative overflow-hidden rounded-2xl bg-forest p-4 text-paper shadow-lift sm:p-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-paper/70">
        <span>Example network, not live data. Select a stage.</span>
        <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Legend">
          <li className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-full border-[1.5px] border-lime bg-forest-900" />Stage</li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-full bg-lime" />Parent batch</li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-full border-[1.5px] border-dashed border-lime" />Child batch</li>
          {recalled && <li className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-full border-[1.5px] border-[#FF9A8B] bg-[#4A1F1A]" />Recalled</li>}
        </ul>
      </div>

      <svg viewBox={`0 0 ${W} ${HGT}`} className="w-full" role="group" aria-describedby="rt-desc" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>
        {DEMO_EDGES.map(([p, c]) => {
          const red = recalled && recallTargets.has(c);
          const on = !lineage || (lineage.has(p) && lineage.has(c));
          return (
            <path key={p + c} d={edge(p, c)} fill="none" strokeWidth={on && lineage ? 3 : 2.4} strokeLinecap="round"
              className="grow-path flow" stroke={red ? CORAL : on && lineage ? LIME : LIME2} strokeOpacity={on ? 1 : 0.25}
              style={{ ["--len" as string]: 160, ["--d" as string]: `${depthOf(p) * 0.18}s`, ["--fd" as string]: recalled ? `${depthOf(p) * 0.18}s` : "0s" }} />
          );
        })}
        <path d={`M${POS.trader.x},${POS.trader.y + NH / 2} V${BADGE.y - 13}`} stroke={recalled ? CORAL : LIME2} strokeWidth="2.4" className="grow-path flow" style={{ ["--len" as string]: 30, ["--d" as string]: "0.36s" }} />
        <g className="grow-node" style={{ ["--d" as string]: "0.5s" }}>
          <rect x={BADGE.x - 82} y={BADGE.y - 13} width="164" height="26" rx="13" fill={recalled ? CORAL_DEEP : PAPER} stroke={recalled ? CORAL : "none"} className="flow" />
          <text x={BADGE.x} y={BADGE.y + 4.5} textAnchor="middle" fontSize="13" fontWeight={650} fill={recalled ? CORAL : DEEP} className="flow">{CONSERVATION}</text>
        </g>
        {DEMO_NODES.map(nodeEl)}
      </svg>

      <p id="rt-desc" className="sr-only" aria-live="polite">{description}</p>

      {recalled ? (
        <div role="alert" className="mt-3 flex gap-3 rounded-xl bg-[#4A1F1A] p-3.5 text-sm text-[#FFD9D2] ring-1 ring-[#FF9A8B]/40">
          <AlertOctagon size={18} className="mt-0.5 shrink-0 text-[#FF9A8B]" />
          <div>
            <p className="font-semibold text-white">Do not use this product. It is under recall.</p>
            <p className="mt-0.5">Illustrative example: {affectedBatches} batches and {affectedShops} shop deliveries flagged, including lots split off before the recall. Nothing was sent to the blockchain.</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 min-h-[68px] rounded-xl bg-forest-900/70 p-3.5 text-sm" aria-live="polite">
          {sel ? (<><p className="font-semibold text-lime">{sel.label} <span className="font-normal text-paper/70">{sel.sub}</span></p><p className="mt-0.5 text-paper/80">{sel.desc}</p></>)
            : <p className="text-paper/70">Select any stage to see what is recorded there. Hover or focus one to trace its lineage.</p>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-paper/60">Every split adds up: {CONSERVATION}.</p>
        <button type="button" onClick={() => { setRecalled(!recalled); setSelected(null); }}
          className={`press inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${recalled ? "bg-paper/10 text-paper hover:bg-paper/20" : "bg-lime text-forest hover:bg-lime-600"}`}>
          {recalled ? <><RotateCcw size={15} /> Reset the example</> : <><Siren size={15} /> Recall the source</>}
        </button>
      </div>
    </figure>
  );
}
