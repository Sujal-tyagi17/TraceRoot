"use client";
import { useMemo, useState } from "react";
import { useBatches } from "@/lib/hooks";
import { isConfigured } from "@/lib/config";
import { BatchRow } from "@/components/BatchRow";
import { Empty, ErrorBox, NotConfigured, PageHeader, inputCls } from "@/components/ui";
import { RowSkeleton } from "@/components/Loader";

const FILTERS = ["All", "Active", "Sold", "Consumed", "Recalled"] as const;

export default function Explorer() {
  const { data, isLoading, error } = useBatches(200);
  const [q, setQ] = useState("");
  const [f, setF] = useState<(typeof FILTERS)[number]>("All");

  const rows = useMemo(
    () =>
      (data ?? []).filter((b) => {
        if (f === "Recalled" && !b.inheritedRecall) return false;
        if (f !== "All" && f !== "Recalled" && b.status !== f) return false;
        const s = q.toLowerCase();
        return !s || b.product.toLowerCase().includes(s) || b.origin.toLowerCase().includes(s) || b.id.toString() === s.replace("#", "");
      }),
    [data, q, f]
  );

  return (
    <div>
      <PageHeader eyebrow="Public explorer" title="Every batch on TraceRoot">
        Read directly from the smart contract. No wallet needed.
      </PageHeader>
      {!isConfigured ? <NotConfigured /> : (
        <>
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
            <input className={`${inputCls} md:max-w-xs`} placeholder="Search product, origin or #id" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((x) => (
                <button key={x} onClick={() => setF(x)} className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${f === x ? "bg-forest text-paper" : "bg-white text-slate-600 ring-1 ring-paper-300 hover:text-forest"}`}>{x}</button>
              ))}
            </div>
          </div>
          {isLoading ? <RowSkeleton rows={6} /> : error ? <ErrorBox message={`Could not read the chain: ${(error as Error).message}`} /> :
            rows.length === 0 ? <Empty title={data?.length ? "No batches match" : "No batches yet"}>{!data?.length && "Producers can create the first batch from the dashboard."}</Empty> :
            <div className="stagger space-y-2">{rows.map((b) => <BatchRow key={b.id.toString()} b={b} />)}</div>}
        </>
      )}
    </div>
  );
}
