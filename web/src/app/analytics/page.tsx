"use client";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useBatches } from "@/lib/hooks";
import { useState } from "react";
import { useTheme } from "@/lib/theme";
import { getHistory, rolesOf, type Batch, type RoleName } from "@/lib/traceroot";
import { isConfigured } from "@/lib/config";
import { inr } from "@/lib/format";
import { Card, Empty, ErrorBox, NotConfigured, PageHeader, Spinner, inputCls } from "@/components/ui";
import { Skel } from "@/components/Loader";

/** Chart colours per theme (Recharts sets SVG attributes, which can't read CSS variables). */
const CHART = {
  light: { bar: "#173B2A", grid: "#D9E1D5", tick: "#4E5F56", axis: "#708077", tipBg: "#FFFFFF", tipText: "#1E2A24", cursor: "rgba(23,59,42,.06)" },
  dark: { bar: "#A9DB63", grid: "#283C31", tick: "#AABBB2", axis: "#889B91", tipBg: "#111E17", tipText: "#E2EAE4", cursor: "rgba(212,245,165,.08)" },
};

function Chart({ data, x, y, fmt }: { data: Record<string, unknown>[]; x: string; y: string; fmt?: (v: number) => string }) {
  const { dark } = useTheme();
  const c = dark ? CHART.dark : CHART.light;
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="2 4" />
          <XAxis dataKey={x} tickLine={false} axisLine={{ stroke: c.grid }} tick={{ fill: c.tick, fontSize: 12 }} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 11 }} width={56} tickFormatter={fmt as never} />
          <Tooltip cursor={{ fill: c.cursor }} formatter={(v) => [fmt ? fmt(Number(v)) : String(v), y === "n" ? "Batches" : y === "q" ? "Quantity" : "Per unit"]}
            contentStyle={{ borderRadius: 10, border: `1px solid ${c.grid}`, fontSize: 12, background: c.tipBg, color: c.tipText }} itemStyle={{ color: c.tipText }} labelStyle={{ color: c.tipText }} />
          <Bar dataKey={y} fill={c.bar} radius={[4, 4, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const STAGES = ["Transporter", "Trader", "Retailer", "Retail sale"] as const;

/**
 * Declared price per unit, grouped by who received the goods (their role), for one product.
 * Uses every batch's own quantity, so splits and merges are priced correctly.
 */
async function priceByStage(batches: Batch[]) {
  const sample = batches.slice(0, 40);
  const roleCache = new Map<string, Promise<RoleName[]>>();
  const roleOf = (a: string) => { if (!roleCache.has(a)) roleCache.set(a, rolesOf(a as `0x${string}`)); return roleCache.get(a)!; };
  const points: { product: string; stage: string; perUnit: number }[] = [];
  const transit: number[] = [];
  for (const b of sample) {
    const h = await getHistory(b.id);
    let proposedAt: number | undefined;
    const product = `${b.product} (${b.unit})`;
    for (const e of h) {
      if (e.kind === "proposed") proposedAt = e.timestamp;
      const price = Number((e.data.price as bigint | undefined) ?? 0n);
      if (e.kind === "accepted") {
        if (proposedAt && e.timestamp) transit.push((e.timestamp - proposedAt) / 3600);
        if (price > 0) {
          const r = await roleOf(e.data.to as string);
          const stage = r.includes("RETAILER") ? "Retailer" : r.includes("TRADER") ? "Trader" : r.includes("TRANSPORTER") ? "Transporter" : undefined;
          if (stage) points.push({ product, stage, perUnit: price / Number(b.quantity) });
        }
      }
      if (e.kind === "sold" && price > 0) points.push({ product, stage: "Retail sale", perUnit: price / Number(b.quantity) });
    }
  }
  const avgTransit = transit.length ? transit.reduce((x, y) => x + y, 0) / transit.length : undefined;
  return { points, avgTransit, sampled: sample.length };
}

function stageRows(points: { product: string; stage: string; perUnit: number }[], product: string) {
  return STAGES.map((stage) => {
    const v = points.filter((p) => p.product === product && p.stage === stage).map((p) => p.perUnit);
    return v.length ? { stage, perUnit: Math.round(v.reduce((x, y) => x + y, 0) / v.length), n: v.length } : null;
  }).filter(Boolean) as { stage: string; perUnit: number; n: number }[];
}

export default function Analytics() {
  const { data, isLoading, error } = useBatches(200);
  const prices = useQuery({ queryKey: ["priceByStage", data?.length], queryFn: () => priceByStage(data!), enabled: !!data?.length });
  const products = [...new Set((prices.data?.points ?? []).map((p) => p.product))];
  const [picked, setPicked] = useState<string>();
  const product = picked && products.includes(picked) ? picked : products[0];

  if (!isConfigured) return <><PageHeader eyebrow="Analytics" title="Supply chain analytics" /><NotConfigured /></>;
  if (isLoading) return (
    <div>
      <PageHeader eyebrow="Analytics" title="Supply chain analytics" />
      <div className="grid gap-5 md:grid-cols-2">
        {[0, 1].map((i) => <Card key={i} className="space-y-4"><Skel className="h-4 w-40" /><div className="flex h-48 items-end gap-4">{["h-[55%]", "h-[90%]", "h-[35%]", "h-[70%]"].map((h) => <Skel key={h} className={`flex-1 rounded-b-none rounded-t-md ${h}`} />)}</div></Card>)}
      </div>
    </div>
  );
  if (error) return <ErrorBox message="Couldn't read batches from the blockchain. The network may be busy, so reload to try again." />;
  const all = data ?? [];

  const statusRows = [
    { s: "Active", n: all.filter((b) => b.status === "Active" && !b.inheritedRecall).length },
    { s: "Split / merged", n: all.filter((b) => b.status === "Consumed").length },
    { s: "Sold", n: all.filter((b) => b.status === "Sold").length },
    { s: "Recalled", n: all.filter((b) => b.inheritedRecall).length },
  ];
  const byProduct = new Map<string, number>();
  // count only root batches so split children don't double-count quantity
  for (const b of all.filter((b) => b.parents.length === 0)) byProduct.set(`${b.product} (${b.unit})`, (byProduct.get(`${b.product} (${b.unit})`) ?? 0) + Number(b.quantity));
  const productRows = [...byProduct].map(([p, q]) => ({ p: p.length > 22 ? p.slice(0, 21) + "…" : p, q })).sort((a, b) => b.q - a.q).slice(0, 8);

  return (
    <div>
      <PageHeader eyebrow="Analytics" title="Supply chain analytics">
        Worked out in your browser from on-chain records. Nothing here is estimated or invented.
      </PageHeader>
      {all.length === 0 ? <Empty title="No batches yet — analytics appear once activity starts" /> : (
        <div className="stagger grid gap-5 md:grid-cols-2">
          <Card><p className="mb-1 font-medium text-ink">Batches by status</p><p className="mb-3 text-xs text-slate-600">{all.length} batches</p><Chart data={statusRows} x="s" y="n" /><p className="mt-3 text-xs text-slate-400">Source: the current state of every batch in the contract.</p></Card>
          <Card><p className="mb-1 font-medium text-ink">Quantity registered at origin</p><p className="mb-3 text-xs text-slate-600">Root batches only, so splits are not double-counted</p><Chart data={productRows} x="p" y="q" /><p className="mt-3 text-xs text-slate-400">Source: quantities producers registered when creating each batch.</p></Card>
          <Card className="md:col-span-2">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="mb-1 font-medium text-ink">Declared price per unit at each stage</p>
                <p className="text-xs text-slate-600">
                  Average price paid to each kind of participant, from the {prices.data?.sampled ?? "…"} most recent batches. Shows how value grows from producer to shelf.
                  {prices.data?.avgTransit !== undefined && <> Average time from offer to acceptance: <b>{prices.data.avgTransit.toFixed(1)} h</b>.</>}
                </p>
              </div>
              {products.length > 1 && (
                <select aria-label="Product" className={`${inputCls} md:w-56`} value={product} onChange={(e) => setPicked(e.target.value)}>
                  {products.map((p) => <option key={p}>{p}</option>)}
                </select>
              )}
            </div>
            {prices.isLoading ? <Spinner label="Reading handoff events…" /> : product ? <Chart data={stageRows(prices.data!.points, product)} x="stage" y="perUnit" fmt={(v) => inr(v)} /> :
              <Empty title="No priced handoffs yet">Prices appear here once participants declare them on handoffs or sales.</Empty>}
            <p className="mt-3 text-xs text-slate-400">Source: prices declared in handoff and sale events. Transit time is measured from each offer to its acceptance.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
