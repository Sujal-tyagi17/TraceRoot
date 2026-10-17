"use client";
import { useBatchCount } from "@/lib/hooks";

/** Says plainly when a page only read the newest batches, so totals are never overstated. */
export function ScanNote({ shown }: { shown?: number }) {
  const { data: total } = useBatchCount();
  if (shown === undefined || total === undefined || total <= shown) return null;
  return (
    <p role="note" className="mb-4 rounded-xl bg-amber-soft px-4 py-2.5 text-sm text-amber">
      Showing the newest {shown.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")} batches. Older batches can still be opened by number.
    </p>
  );
}
