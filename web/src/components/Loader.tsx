/** Branded loader: the TraceRoot roots growing and pulsing. */
export function RootLoader({ size = 44, label = "Loading" }: { size?: number; label?: string }) {
  return (
    <span role="status" aria-label={label} className="inline-flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <path className="ld-root" style={{ ["--d" as string]: "0s" }} d="M16 5v9" stroke="#173B2A" strokeWidth="2.2" strokeLinecap="round" />
        <path className="ld-root" style={{ ["--d" as string]: ".15s" }} d="M16 14c0 3-6 3.5-6 8" stroke="#3E8A5C" strokeWidth="2" strokeLinecap="round" />
        <path className="ld-root" style={{ ["--d" as string]: ".25s" }} d="M16 14v10" stroke="#3E8A5C" strokeWidth="2" strokeLinecap="round" />
        <path className="ld-root" style={{ ["--d" as string]: ".35s" }} d="M16 14c0 3 6 3.5 6 8" stroke="#3E8A5C" strokeWidth="2" strokeLinecap="round" />
        <circle className="ld-dot" style={{ ["--d" as string]: "0s" }} cx="16" cy="5" r="2.6" fill="#173B2A" />
        <circle className="ld-dot" style={{ ["--d" as string]: ".45s" }} cx="10" cy="23" r="2.2" fill="#A9DB63" />
        <circle className="ld-dot" style={{ ["--d" as string]: ".55s" }} cx="16" cy="25.5" r="2.2" fill="#A9DB63" />
        <circle className="ld-dot" style={{ ["--d" as string]: ".65s" }} cx="22" cy="23" r="2.2" fill="#A9DB63" />
      </svg>
    </span>
  );
}

export function Skel({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skel rounded-lg bg-paper-300/70 ${className}`} />;
}

/** Placeholder shaped like an explorer / dashboard batch row. */
export function RowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading batches">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-paper-300/80 bg-white px-5 py-4 md:grid-cols-[64px_1.5fr_.8fr_.9fr_auto]">
          <Skel className="h-6 w-10" />
          <div className="space-y-2"><Skel className="h-4 w-40" /><Skel className="h-3 w-28" /></div>
          <Skel className="hidden h-4 w-16 md:block" />
          <Skel className="hidden h-3 w-24 md:block" />
          <Skel className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder shaped like the batch tag + timeline. */
export function BatchSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading batch">
      <div className="grid overflow-hidden rounded-2xl border border-paper-300/80 bg-white md:grid-cols-[1fr_auto]">
        <div className="space-y-6 p-6 md:p-9">
          <Skel className="h-7 w-28 rounded-full" />
          <Skel className="h-14 w-3/4" />
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="space-y-2"><Skel className="h-3 w-16" /><Skel className="h-4 w-24" /></div>)}
          </div>
        </div>
        <div className="flex items-center justify-center border-t-2 border-dashed border-paper-300 bg-paper/60 p-6 md:border-l-2 md:border-t-0 md:px-9"><Skel className="h-36 w-36 rounded-xl" /></div>
      </div>
      <div className="flex justify-center py-6"><RootLoader label="Reading the batch from the blockchain" /></div>
    </div>
  );
}
