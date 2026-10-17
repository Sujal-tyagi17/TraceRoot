"use client";
import { useIntroDone } from "./Splash";
import { RootTree } from "./RootTree";

const WORDS = ["Every", "product", "has", "a", "story."];

/** Headline rises word by word, then the root diagram grows — both wait for the intro to lift. */
export function HeroTitle() {
  const ready = useIntroDone();
  return (
    <h1 className="font-display text-[3.4rem] font-[750] leading-[.95] tracking-[-0.045em] text-forest md:text-[5.2rem]">
      {WORDS.map((w, i) => (
        <span key={w} className={ready ? "word" : "opacity-0"} style={{ ["--d" as string]: `${0.15 + i * 0.09}s` }}>{w}{i < WORDS.length - 1 ? " " : ""}</span>
      ))}
    </h1>
  );
}

export function HeroTree() {
  const ready = useIntroDone();
  return ready ? <div className="rise-in" style={{ ["--d" as string]: ".25s" }}><RootTree /></div> : <div className="aspect-[560/470] rounded-2xl bg-forest" />;
}
