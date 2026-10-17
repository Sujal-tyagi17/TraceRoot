"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Thin lime bar across the top while moving between pages. */
export function RouteProgress() {
  const path = usePathname();
  const [w, setW] = useState(0);
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      setOn(true); setW(12);
      clearInterval(timer.current);
      timer.current = setInterval(() => setW((x) => (x < 85 ? x + (90 - x) * 0.12 : x)), 160);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!on) return;
    clearInterval(timer.current);
    setW(100);
    const t = setTimeout(() => { setOn(false); setW(0); }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]">
      <div className="route-bar h-full bg-lime-600 shadow-[0_0_10px_#A9DB63]" style={{ width: `${w}%`, opacity: on ? 1 : 0 }} />
    </div>
  );
}
