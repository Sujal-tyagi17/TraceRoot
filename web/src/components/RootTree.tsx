"use client";
import { useState } from "react";
import { RotateCcw, Siren } from "lucide-react";

/**
 * Landing-page illustration: one origin lot whose roots branch into the batches it became.
 * Pressing "Recall the source" shows the recall flowing down every branch, as the contract does.
 * Example data only; it is labelled as such in the caption.
 */
type Node = { id: string; x: number; y: number; qty: number; label?: string; depth: number };

const NODES: Node[] = [
  { id: "#1", x: 280, y: 62, qty: 1000, label: "Karnal farm", depth: 0 },
  { id: "#2", x: 150, y: 190, qty: 600, depth: 1 },
  { id: "#3", x: 410, y: 190, qty: 400, depth: 1 },
  { id: "#4", x: 66, y: 330, qty: 350, label: "Delhi", depth: 2 },
  { id: "#5", x: 214, y: 330, qty: 250, label: "Jaipur", depth: 2 },
  { id: "#6", x: 346, y: 330, qty: 150, label: "Pune", depth: 2 },
  { id: "#7", x: 494, y: 330, qty: 250, label: "Mumbai", depth: 2 },
];
const EDGES: [string, string][] = [["#1", "#2"], ["#1", "#3"], ["#2", "#4"], ["#2", "#5"], ["#3", "#6"], ["#3", "#7"]];
const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

const ROOT = "#D4F5A5";
const RECALL = "#FF9A8B"; // light coral: readable on forest, reserved for recall

function rootPath(a: Node, b: Node) {
  const my = (a.y + b.y) / 2;
  return `M${a.x},${a.y + 20} C${a.x},${my} ${b.x},${my - 10} ${b.x},${b.y - 20}`;
}

export function RootTree() {
  const [recalled, setRecalled] = useState(false);
  const leaves = NODES.filter((n) => n.depth === 2).length;

  return (
    <figure className="relative overflow-hidden rounded-2xl bg-forest p-5 text-paper shadow-lift md:p-7">
      <svg viewBox="0 0 560 400" className="w-full" role="img"
        aria-label={recalled ? "Example lot recalled: every downstream batch is flagged" : "Example lot of 1000 kg split into batches sent to four cities"}>
        {/* ground line the lot grows from */}
        <line x1="20" y1="62" x2="540" y2="62" stroke={ROOT} strokeOpacity=".18" strokeDasharray="2 6" />
        {EDGES.map(([f, t], i) => {
          const a = byId[f], b = byId[t];
          return (
            <path key={f + t} d={rootPath(a, b)} fill="none" strokeWidth={2.5} strokeLinecap="round"
              className="grow-path flow"
              stroke={recalled ? RECALL : ROOT}
              style={{ ["--len" as string]: 260, ["--d" as string]: `${0.15 + a.depth * 0.45 + i * 0.05}s`, ["--fd" as string]: `${a.depth * 0.28}s` }} />
          );
        })}
        {NODES.map((n) => {
          const hot = recalled;
          return (
            <g key={n.id} className="grow-node" style={{ ["--d" as string]: `${n.depth * 0.45}s`, transformOrigin: `${n.x}px ${n.y}px` }}>
              <rect x={n.x - 56} y={n.y - 20} width={112} height={40} rx={20}
                className="flow" style={{ ["--fd" as string]: `${n.depth * 0.28}s` }}
                fill={hot ? "#4A1F1A" : "#0E2A1E"} stroke={hot ? RECALL : ROOT} strokeWidth={1.5} />
              <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="17" fontWeight={600} fill={hot ? RECALL : ROOT}
                className="flow" style={{ ["--fd" as string]: `${n.depth * 0.28}s`, fontFamily: "'Instrument Sans', sans-serif" }}>
                {n.id}  {n.qty} kg
              </text>
              {n.label && (
                <text x={n.x} y={n.depth === 0 ? n.y - 31 : n.y + 42} textAnchor="middle" fontSize="15" fill="#F4F6F1" fillOpacity=".75"
                  style={{ fontFamily: "'Instrument Sans', sans-serif" }}>{n.label}</text>
              )}
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-2 flex flex-col gap-4 border-t border-paper/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-paper/75" aria-live="polite">
          {recalled
            ? <><span className="font-semibold text-[#FF9A8B]">All {leaves} shipments flagged.</span> They were split off before the recall, and are still caught.</>
            : <>An example lot. Every split adds up to the 1000 kg it started as.</>}
        </p>
        <button onClick={() => setRecalled(!recalled)}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${recalled ? "bg-paper/10 text-paper hover:bg-paper/20" : "bg-lime text-forest hover:bg-lime-600"}`}>
          {recalled ? <><RotateCcw size={15} /> Reset</> : <><Siren size={15} /> Recall the source</>}
        </button>
      </figcaption>
    </figure>
  );
}
