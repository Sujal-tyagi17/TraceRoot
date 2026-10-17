"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { setThemePref, useTheme, type ThemePref } from "@/lib/theme";

const NEXT: Record<ThemePref, ThemePref> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<ThemePref, string> = { system: "Theme: matches your device", light: "Theme: light", dark: "Theme: dark" };

/** Cycles device → light → dark. The choice is saved in this browser. */
export function ThemeToggle() {
  const { pref } = useTheme();
  const Icon = pref === "dark" ? Moon : pref === "light" ? Sun : Monitor;
  return (
    <button type="button" onClick={() => setThemePref(NEXT[pref])}
      aria-label={`${LABEL[pref]}. Switch to ${NEXT[pref] === "system" ? "device setting" : NEXT[pref]}`} title={LABEL[pref]}
      className="press grid h-9 w-9 place-items-center rounded-full border border-paper-300 bg-surface text-slate-600 transition hover:text-ink">
      <Icon size={16} aria-hidden />
    </button>
  );
}
