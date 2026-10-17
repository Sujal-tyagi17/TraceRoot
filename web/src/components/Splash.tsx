"use client";
import { useEffect, useState } from "react";

/**
 * Opening animation: roots grow out of the logo, the name rises letter by letter,
 * then the green curtain lifts to reveal the site. Plays once per browser session,
 * click to skip, and never runs for people who prefer reduced motion.
 */
const KEY = "traceroot.splash.seen";
const NAME = "TraceRoot";

export function Splash() {
  const [phase, setPhase] = useState<"hidden" | "show" | "exit">("hidden");

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(KEY) === "1"; } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) return;
    try { sessionStorage.setItem(KEY, "1"); } catch {}
    document.documentElement.dataset.splash = "on";
    setPhase("show");
    const t1 = setTimeout(() => { setPhase("exit"); window.dispatchEvent(new Event("splash:lifting")); }, 1850);
    const t2 = setTimeout(() => { setPhase("hidden"); delete document.documentElement.dataset.splash; }, 2650);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "hidden") return null;
  const skip = () => { setPhase("hidden"); delete document.documentElement.dataset.splash; window.dispatchEvent(new Event("splash:lifting")); };

  return (
    <div onClick={skip} role="presentation"
      className={`fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-forest ${phase === "exit" ? "splash-exit" : ""}`}>
      <svg width="132" height="132" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path className="splash-root" style={{ ["--d" as string]: ".05s" }} d="M16 4v10" stroke="#D4F5A5" strokeWidth="1.6" strokeLinecap="round" />
        <path className="splash-root" style={{ ["--d" as string]: ".35s" }} d="M16 14c0 3-6 3.5-6 8.5" stroke="#D4F5A5" strokeWidth="1.3" strokeLinecap="round" />
        <path className="splash-root" style={{ ["--d" as string]: ".45s" }} d="M16 14v11" stroke="#D4F5A5" strokeWidth="1.3" strokeLinecap="round" />
        <path className="splash-root" style={{ ["--d" as string]: ".55s" }} d="M16 14c0 3 6 3.5 6 8.5" stroke="#D4F5A5" strokeWidth="1.3" strokeLinecap="round" />
        <circle className="splash-dot" style={{ ["--d" as string]: "0s" }} cx="16" cy="4" r="2" fill="#D4F5A5" />
        <circle className="splash-dot" style={{ ["--d" as string]: ".85s" }} cx="10" cy="23" r="1.7" fill="#F4F6F1" />
        <circle className="splash-dot" style={{ ["--d" as string]: ".92s" }} cx="16" cy="25.5" r="1.7" fill="#F4F6F1" />
        <circle className="splash-dot" style={{ ["--d" as string]: "1s" }} cx="22" cy="23" r="1.7" fill="#F4F6F1" />
      </svg>
      <p className="mt-4 font-display text-5xl font-[750] tracking-[-0.04em] text-paper md:text-6xl" aria-label={NAME}>
        {NAME.split("").map((c, i) => <span key={i} className="splash-letter" style={{ ["--d" as string]: `${0.55 + i * 0.045}s` }}>{c}</span>)}
      </p>
      <p className="splash-letter mt-3 text-sm text-lime/80" style={{ ["--d" as string]: "1.05s" }}>Every product has a story.</p>
    </div>
  );
}

/** True once the intro has started lifting (or immediately when no intro plays). */
export function useIntroDone() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (document.documentElement.dataset.splash !== "on") return setDone(true);
    const on = () => setDone(true);
    window.addEventListener("splash:lifting", on);
    return () => window.removeEventListener("splash:lifting", on);
  }, []);
  return done;
}
