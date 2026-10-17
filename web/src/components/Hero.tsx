import { RootTree } from "./RootTree";

const WORDS = ["Every", "product", "has", "a", "story."];

/** Headline rises word by word once the intro curtain lifts (CSS: --intro-offset). Server-rendered. */
export function HeroTitle() {
  return (
    <h1 className="font-display text-[3.3rem] font-[750] leading-[.95] tracking-[-0.045em] text-forest sm:text-[4.2rem] lg:text-[5.2rem]">
      {WORDS.map((w, i) => (
        <span key={w}><span className="enter-word" style={{ ["--d" as string]: `${0.1 + i * 0.09}s` }}>{w}</span>{i < WORDS.length - 1 ? " " : ""}</span>
      ))}
    </h1>
  );
}

export function HeroTree() {
  return <div className="enter" style={{ ["--d" as string]: "0.15s" }}><RootTree /></div>;
}
