"use client";
import { useEffect, useState } from "react";

/** Theme preference: "system" follows the device; stored in localStorage. */
export type ThemePref = "system" | "light" | "dark";
import { THEME_KEY } from "./themeBoot";
export { THEME_KEY };

const EVT = "traceroot:theme";

function readPref(): ThemePref {
  try { const p = localStorage.getItem(THEME_KEY); return p === "light" || p === "dark" ? p : "system"; } catch { return "system"; }
}

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const h = document.documentElement;
  h.classList.add("theme-switching"); // no colour transitions mid-swap
  h.classList.toggle("dark", dark);
  h.style.colorScheme = dark ? "dark" : "light";
  requestAnimationFrame(() => requestAnimationFrame(() => h.classList.remove("theme-switching")));
}

export function setThemePref(pref: ThemePref) {
  try { if (pref === "system") localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, pref); } catch {}
  apply(pref);
  window.dispatchEvent(new Event(EVT));
}

/** Current preference and resolved theme; re-renders on toggle and on OS theme changes. */
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>("system");
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => { const p = readPref(); setPref(p); setDark(document.documentElement.classList.contains("dark")); };
    const onOs = () => { if (readPref() === "system") { apply("system"); sync(); } };
    sync();
    window.addEventListener(EVT, sync);
    mq.addEventListener("change", onOs);
    return () => { window.removeEventListener(EVT, sync); mq.removeEventListener("change", onOs); };
  }, []);
  return { pref, dark };
}
