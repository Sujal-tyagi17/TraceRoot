"use client";
import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useBatches } from "@/lib/hooks";
import { isConfigured } from "@/lib/config";
import { BatchRow } from "@/components/BatchRow";
import { Button, Empty, ErrorBox, NotConfigured, PageHeader, inputCls } from "@/components/ui";
import { RowSkeleton } from "@/components/Loader";
import { ScanButton } from "@/components/QrScanner";

const FILTERS = ["All", "Active", "In transfer", "Sold", "Split / merged", "Recalled"] as const;
const SORTS = { newest: "Newest first", oldest: "Oldest first", qty: "Largest quantity", produced: "Recently produced" } as const;
const PAGE = 20;

export default function Explorer() {
  const { data, isLoading, error, refetch, isRefetching } = useBatches(500);
  const [q, setQ] = useState("");
  const [f, setF] = useState<(typeof FILTERS)[number]>("All");
  const [product, setProduct] = useState("all");
  const [sort, setSort] = useState<keyof typeof SORTS>("newest");
  const [shown, setShown] = useState(PAGE);

  const products = useMemo(() => [...new Set((data ?? []).map((b) => b.product))].sort(), [data]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^#/, "");
    const out = (data ?? []).filter((b) => {
      if (f === "Recalled" && !b.inheritedRecall) return false;
      if (f === "Active" && (b.status !== "Active" || b.pending || b.inheritedRecall)) return false;
      if (f === "In transfer" && !b.pending) return false;
      if (f === "Sold" && b.status !== "Sold") return false;
      if (f === "Split / merged" && b.status !== "Consumed") return false;
      if (product !== "all" && b.product !== product) return false;
      return !s || b.product.toLowerCase().includes(s) || b.origin.toLowerCase().includes(s) || b.id.toString() === s;
    });
    const by = {
      newest: (a: typeof out[0], b: typeof out[0]) => Number(b.id - a.id),
      oldest: (a: typeof out[0], b: typeof out[0]) => Number(a.id - b.id),
      qty: (a: typeof out[0], b: typeof out[0]) => Number(b.quantity - a.quantity),
      produced: (a: typeof out[0], b: typeof out[0]) => Number(b.producedAt - a.producedAt),
    }[sort];
    return out.sort(by);
  }, [data, q, f, product, sort]);

  const reset = () => { setQ(""); setF("All"); setProduct("all"); setShown(PAGE); };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Every batch on TraceRoot">
          Read straight from the smart contract. No wallet needed.
        </PageHeader>
        <ScanButton className="press mb-10 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover" />
      </div>
      {!isConfigured ? <NotConfigured /> : (
        <>
          <div className="mb-6 space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <label className="md:max-w-xs md:flex-1">
                <span className="sr-only">Search batches</span>
                <input type="search" className={inputCls} placeholder="Search product, origin or #id" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Product
                <select className={`${inputCls} w-auto py-2`} value={product} onChange={(e) => { setProduct(e.target.value); setShown(PAGE); }}>
                  <option value="all">All products</option>
                  {products.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 md:ml-auto">
                Sort
                <select className={`${inputCls} w-auto py-2`} value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}>
                  {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
              {FILTERS.map((x) => (
                <button key={x} onClick={() => { setF(x); setShown(PAGE); }} aria-pressed={f === x}
                  className={`press rounded-full px-3.5 py-1.5 text-sm transition-colors ${f === x ? "bg-primary text-on-primary" : "bg-surface text-slate-600 ring-1 ring-paper-300 hover:text-ink"}`}>{x}</button>
              ))}
            </div>
          </div>

          {isLoading ? <RowSkeleton rows={6} /> : error ? (
            <div className="space-y-3">
              <ErrorBox message="Couldn't read batches from the blockchain. The network or RPC may be busy." />
              <Button variant="ghost" onClick={() => refetch()} disabled={isRefetching}><RefreshCw size={15} className={isRefetching ? "animate-spin" : ""} /> Try again</Button>
            </div>
          ) : rows.length === 0 ? (
            data?.length
              ? <Empty title="No batches match these filters"><button onClick={reset} className="font-medium text-ink underline underline-offset-4">Clear filters</button></Empty>
              : <Empty title="No batches yet">Producers create the first batch from the dashboard to start tracking its journey.</Empty>
          ) : (
            <>
              <p className="mb-3 text-sm text-slate-600" aria-live="polite">{rows.length} batch{rows.length === 1 ? "" : "es"}</p>
              <div className="stagger space-y-2">{rows.slice(0, shown).map((b) => <BatchRow key={b.id.toString()} b={b} />)}</div>
              {rows.length > shown && (
                <div className="mt-6 flex justify-center">
                  <Button variant="ghost" onClick={() => setShown(shown + PAGE)}>Show {Math.min(PAGE, rows.length - shown)} more</Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
