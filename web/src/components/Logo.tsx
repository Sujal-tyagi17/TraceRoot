export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  // A stem rising from the ground line, with roots branching down into verified nodes.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#173B2A" />
      <path d="M16 6v8" stroke="#D4F5A5" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 14c0 3-6 3.5-6 8M16 14c0 3 6 3.5 6 8M16 14v10" stroke="#D4F5A5" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.5 14h17" stroke="#D4F5A5" strokeOpacity=".35" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="16" cy="6" r="2.4" fill="#D4F5A5" />
      <circle cx="10" cy="23" r="2" fill="#F4F1E8" />
      <circle cx="22" cy="23" r="2" fill="#F4F1E8" />
      <circle cx="16" cy="25.5" r="2" fill="#F4F1E8" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-[1.35rem] font-[750] tracking-[-0.03em] text-ink">TraceRoot</span>
    </span>
  );
}
