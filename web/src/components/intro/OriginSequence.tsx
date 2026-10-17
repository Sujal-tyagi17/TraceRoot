"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { LIFT_AT_S } from "./boot";
import { CONSERVATION, DEMO_EDGES, DEMO_NODES, depthOf, type DemoNode } from "@/lib/demoNetwork";

/**
 * The TraceRoot Origin Sequence (≈3.5 s, landing page, first visit per session).
 *   A  0.0–1.4 s  origin point, glow, stem and three roots draw, tip nodes, network pulse, wordmark
 *   B  1.0–2.2 s  logo settles left; branches grow origin → producer → trader → … → retailer
 *   C  1.5–2.2 s  Lot A (100 kg) splits into 40 kg + 60 kg with a conservation badge
 *   D  1.95–2.7 s verification pulse runs downstream; each node gets a check as it passes
 *   E  2.6–3.5 s  curtain lifts; the landing page's own entrance starts underneath at 2.6 s
 * Timing lives in CSS (`--at` per element, keyframes in globals.css). JavaScript only reacts to
 * the curtain's animation events, so there are no timer chains to leak or replay.
 */

type Pt = { x: number; y: number };
type Layout = {
  view: [number, number];
  logo: { from: Pt & { s: number }; to: Pt & { s: number } };
  node: Record<string, Pt>;
  w: number;
  badge: Pt;
  /** where an edge leaves its parent: "side" (horizontal flow) or "bottom" (vertical flow) */
  flow: "side" | "bottom";
};

const H: Layout = {
  view: [960, 420],
  logo: { from: { x: 480, y: 170, s: 2.3 }, to: { x: 104, y: 205, s: 1 } },
  node: { origin: { x: 104, y: 205 }, producer: { x: 252, y: 210 }, trader: { x: 400, y: 210 }, lotB: { x: 550, y: 120 }, lotC: { x: 550, y: 300 },
    transporter: { x: 700, y: 120 }, inspector: { x: 700, y: 300 }, shopA: { x: 850, y: 120 }, shopB: { x: 850, y: 300 } },
  w: 122,
  badge: { x: 400, y: 272 },
  flow: "side",
};
const V: Layout = {
  view: [360, 560],
  logo: { from: { x: 180, y: 170, s: 2.1 }, to: { x: 180, y: 52, s: 0.9 } },
  node: { origin: { x: 180, y: 52 }, producer: { x: 180, y: 140 }, trader: { x: 180, y: 212 }, lotB: { x: 98, y: 312 }, lotC: { x: 262, y: 312 },
    transporter: { x: 98, y: 392 }, inspector: { x: 262, y: 392 }, shopA: { x: 98, y: 472 }, shopB: { x: 262, y: 472 } },
  w: 136,
  badge: { x: 180, y: 258 },
  flow: "bottom",
};

const NH = 50; // node height
const LIME = "#D4F5A5", PAPER = "#F4F6F1", DEEP = "#0E2A1E";
const edgeAt = (child: string) => 1.15 + (depthOf(child) - 1) * 0.2; // when the branch to `child` starts drawing
const nodeAt = (id: string) => (id === "origin" ? 1.35 : edgeAt(id) + 0.22); // when its node appears
const checkAt = (id: string) => 1.98 + (depthOf(id) - 1) * 0.16; // when the verification pulse reaches it

function edgePath(L: Layout, p: string, c: string) {
  const a = L.node[p], b = L.node[c];
  if (L.flow === "side") {
    const x0 = p === "origin" ? a.x + 34 : a.x + L.w / 2, x1 = b.x - L.w / 2, mx = (x0 + x1) / 2;
    return `M${x0},${a.y} C${mx},${a.y} ${mx},${b.y} ${x1},${b.y}`;
  }
  const y0 = p === "trader" ? L.badge.y + 12 : p === "origin" ? a.y + 34 : a.y + NH / 2, y1 = b.y - NH / 2, my = (y0 + y1) / 2;
  return `M${a.x},${y0} C${a.x},${my} ${b.x},${my} ${b.x},${y1}`;
}

/** Full downstream route through the network, for the verification pulse. */
function route(L: Layout, ids: string[]) {
  return ids.slice(1).map((c, i) => edgePath(L, ids.at(i)!, c)).map((d, i) => (i === 0 ? d : d.replace(/^M[^C]+/, "L" + d.slice(1).split(" C")[0]))).join(" ");
}

function Logo({ L }: { L: Layout }) {
  const { from, to } = L.logo;
  return (
    <g className="i-move" style={{ transform: `translate(${from.x}px, ${from.y}px) scale(${from.s})`, ["--tx" as string]: `${to.x}px`, ["--ty" as string]: `${to.y}px`, ["--ts" as string]: to.s, ["--at" as string]: "1.0s" }}>
      <circle className="i-glow" style={{ ["--at" as string]: "0.05s" }} cx="0" cy="-34" r="22" fill={LIME} />
      <circle className="i-ring" style={{ ["--at" as string]: "0.95s" }} cx="0" cy="0" r="16" fill="none" stroke={LIME} strokeWidth="1.2" />
      <path className="i-draw" style={{ ["--at" as string]: "0.2s", ["--len" as string]: 30, ["--dur" as string]: "380ms" }} d="M0,-34 V-6" stroke={LIME} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path className="i-draw" style={{ ["--at" as string]: "0.48s", ["--len" as string]: 50 }} d="M0,-6 C0,6 -24,8 -24,24" stroke={LIME} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path className="i-draw" style={{ ["--at" as string]: "0.56s", ["--len" as string]: 40 }} d="M0,-6 V30" stroke={LIME} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path className="i-draw" style={{ ["--at" as string]: "0.64s", ["--len" as string]: 50 }} d="M0,-6 C0,6 24,8 24,24" stroke={LIME} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle className="i-pop" style={{ ["--at" as string]: "0s" }} cx="0" cy="-34" r="5" fill={LIME} />
      <circle className="i-pop" style={{ ["--at" as string]: "0.86s" }} cx="-24" cy="26" r="4.2" fill={PAPER} />
      <circle className="i-pop" style={{ ["--at" as string]: "0.92s" }} cx="0" cy="33" r="4.2" fill={PAPER} />
      <circle className="i-pop" style={{ ["--at" as string]: "0.98s" }} cx="24" cy="26" r="4.2" fill={PAPER} />
    </g>
  );
}

function Node({ n, L, compact }: { n: DemoNode; L: Layout; compact: boolean }) {
  const p = L.node[n.id];
  const child = n.kind === "child";
  return (
    <g className="i-pop" style={{ ["--at" as string]: `${nodeAt(n.id)}s` }}>
      <rect x={p.x - L.w / 2} y={p.y - NH / 2} width={L.w} height={NH} rx={NH / 2} fill={DEEP} stroke={LIME} strokeWidth={child ? 1.4 : 1.8} strokeDasharray={child ? "5 4" : undefined} />
      <text x={p.x} y={compact ? p.y - 3 : p.y - 4} textAnchor="middle" fontSize={compact ? 14 : 15} fontWeight={650} fill={LIME}>{n.label}</text>
      <text x={p.x} y={p.y + 14} textAnchor="middle" fontSize={compact ? 11.5 : 12} fill={PAPER} fillOpacity=".75">{n.sub}</text>
      {/* verification marker */}
      <g className="i-pop" style={{ ["--at" as string]: `${checkAt(n.id)}s` }}>
        <circle cx={p.x + L.w / 2 - 6} cy={p.y - NH / 2 + 4} r="9" fill={LIME} />
        <path d={`M${p.x + L.w / 2 - 10},${p.y - NH / 2 + 4} l3,3 l5,-6`} stroke={DEEP} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  );
}

function Network({ L, compact }: { L: Layout; compact: boolean }) {
  const top = route(L, ["origin", "producer", "trader", "lotB", "transporter", "shopA"]);
  const bottom = route(L, ["origin", "producer", "trader", "lotC", "inspector", "shopB"]);
  const [w, h] = L.view;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" aria-hidden style={{ fontFamily: "'Instrument Sans', sans-serif" }}>
      {DEMO_EDGES.map(([p, c]) => (
        <path key={p + c} d={edgePath(L, p, c)} fill="none" stroke={LIME} strokeWidth="2.5" strokeLinecap="round"
          className="i-draw" style={{ ["--at" as string]: `${edgeAt(c)}s`, ["--len" as string]: 220, ["--dur" as string]: "300ms" }} />
      ))}
      {/* edges flash as the pulse passes */}
      {DEMO_EDGES.map(([p, c]) => (
        <path key={"f" + p + c} d={edgePath(L, p, c)} fill="none" stroke={LIME} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0"
          className="i-flash" style={{ ["--at" as string]: `${checkAt(c) - 0.1}s` }} />
      ))}
      {/* Scene C: the conservation badge under the parent batch */}
      <g className="i-pop" style={{ ["--at" as string]: "1.78s" }}>
        <rect x={L.badge.x - 76} y={L.badge.y - 12} width="152" height="24" rx="12" fill={LIME} />
        <text x={L.badge.x} y={L.badge.y + 4.5} textAnchor="middle" fontSize="12.5" fontWeight={650} fill={DEEP}>{CONSERVATION}</text>
      </g>
      {DEMO_NODES.filter((n) => n.id !== "origin").map((n) => <Node key={n.id} n={n} L={L} compact={compact} />)}
      <text className="i-fade" style={{ ["--at" as string]: "1.4s" }} x={L.flow === "side" ? L.node.origin.x : L.node.origin.x + 44} y={L.flow === "side" ? L.node.origin.y + 62 : L.node.origin.y + 6}
        textAnchor={L.flow === "side" ? "middle" : "start"} fontSize="12.5" fill={PAPER} fillOpacity=".75">Origin farm</text>
      <Logo L={L} />
      {/* Scene D: verification pulses */}
      {[top, bottom].map((d, i) => (
        <circle key={i} r="6" fill={LIME} opacity="0" style={{ filter: "drop-shadow(0 0 6px #D4F5A5)" }}>
          <animateMotion dur="0.75s" begin="1.95s" fill="freeze" path={d} />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="0.8s" begin="1.95s" fill="freeze" />
        </circle>
      ))}
    </svg>
  );
}

const NAME = "TraceRoot";

export function OriginSequence() {
  const [state, setState] = useState<"off" | "play" | "done">("off");
  const [skipping, setSkipping] = useState(false);
  const lifted = useRef(false);

  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.intro !== "play") return;
    html.classList.add("intro-mounted");
    // Align the landing entrance with this curtain's lift (2.6 s after it mounts).
    const now = (document.timeline?.currentTime as number | null) ?? performance.now();
    html.style.setProperty("--intro-offset", `${(now / 1000 + LIFT_AT_S).toFixed(2)}s`);
    setState("play");
  }, []);

  const announceLift = useCallback(() => {
    if (lifted.current) return;
    lifted.current = true;
    window.dispatchEvent(new Event("traceroot:intro-lifting"));
  }, []);

  const skip = useCallback(() => {
    if (skipping) return;
    // Start the landing entrance now instead of at the scheduled lift time.
    const now = (document.timeline?.currentTime as number | null) ?? performance.now();
    document.documentElement.style.setProperty("--intro-offset", `${(now / 1000).toFixed(2)}s`);
    setSkipping(true);
    announceLift();
  }, [skipping, announceLift]);

  useEffect(() => {
    if (state !== "play") return;
    const onKey = (e: KeyboardEvent) => { if (["Escape", "Enter", " "].includes(e.key)) { e.preventDefault(); skip(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, skip]);

  if (state !== "play") return null;

  const finish = () => {
    const html = document.documentElement;
    delete html.dataset.intro;
    html.classList.remove("intro-mounted");
    setState("done");
  };

  return (
    <div
      className={`intro-curtain fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-forest px-5 ${skipping ? "skip" : ""}`}
      onAnimationStart={(e) => { if (e.target === e.currentTarget && e.animationName.startsWith("intro-lift")) announceLift(); }}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget && e.animationName.startsWith("intro-lift")) finish(); }}
      onClick={skip}
      role="dialog" aria-modal="true" aria-label="TraceRoot opening animation"
    >
      <p className="sr-only">An illustrated journey of one product from its origin farm to two shops, with a batch split and a verification pass. Press Escape to skip.</p>
      <div className="w-full max-w-[1000px]">
        <div className="hidden md:block"><Network L={H} compact={false} /></div>
        <div className="mx-auto max-w-[380px] md:hidden"><Network L={V} compact /></div>
      </div>
      <p className="mt-2 font-display text-5xl font-[750] tracking-[-0.04em] text-paper md:text-6xl" aria-hidden>
        {NAME.split("").map((c, i) => <span key={i} className="i-rise" style={{ ["--at" as string]: `${0.5 + i * 0.05}s` }}>{c}</span>)}
      </p>
      <p className="i-rise mt-2 text-sm text-lime/85 md:text-base" style={{ ["--at" as string]: "1.15s" }} aria-hidden>Every product has a story.</p>
      <p className="i-fade absolute bottom-7 left-5 max-w-[50%] text-xs text-paper/50 md:left-6" style={{ ["--at" as string]: "1.9s" }} aria-hidden><span className="md:hidden">Illustration, not live data.</span><span className="hidden md:inline">An illustrated journey, not live blockchain data.</span></p>
      <button type="button" onClick={(e) => { e.stopPropagation(); skip(); }} autoFocus
        className="absolute bottom-5 right-5 rounded-full border border-paper/25 px-4 py-2 text-sm font-medium text-paper/85 transition hover:bg-paper/10 focus-visible:outline-lime">
        Skip intro
      </button>
    </div>
  );
}

/** True once the intro curtain starts lifting, or right away when no intro plays. */
export function useIntroLifted() {
  const [lifted, setLifted] = useState(false);
  useEffect(() => {
    if (document.documentElement.dataset.intro !== "play") return setLifted(true);
    const on = () => setLifted(true);
    window.addEventListener("traceroot:intro-lifting", on);
    return () => window.removeEventListener("traceroot:intro-lifting", on);
  }, []);
  return lifted;
}
