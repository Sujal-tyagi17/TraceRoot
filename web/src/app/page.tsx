import Link from "next/link";
import { ArrowDown, BadgeCheck, Check, FileSearch, GitBranch, Handshake, KeyRound, Minus, PackagePlus, Scale, Siren, Store, Truck } from "lucide-react";
import { Lookup } from "@/components/Lookup";
import { HeroTitle, HeroTree } from "@/components/Hero";
import { Reveal } from "@/components/Reveal";
import { networkLabel } from "@/lib/config";

const STEPS = [
  { icon: PackagePlus, t: "Created at the source", d: "A producer registers the lot: what it is, how much, where and when it was harvested.", href: "/docs#participants", cta: "How producers start" },
  { icon: Truck, t: "Transferred to the next participant", d: "The holder offers the batch. Custody moves only when the receiver confirms they have it.", href: "/docs#handoffs", cta: "How handoffs work" },
  { icon: FileSearch, t: "Inspected and tracked", d: "Traders split lots for buyers, inspectors add grades, transporters log conditions.", href: "/docs#splits", cta: "How splits add up" },
  { icon: Store, t: "Received at its destination", d: "The retailer confirms receipt and prints a QR code anyone can scan.", href: "/explorer", cta: "Browse real batches" },
];

const GUARANTEES = [
  { icon: KeyRound, t: "Role-restricted actions", d: "Only producers create batches, only inspectors grade them, only retailers sell. The contract checks every call." },
  { icon: Handshake, t: "Two-step handoffs", d: "The sender offers, the receiver accepts. An offer nobody accepts never moves the goods, and it expires after 7 days." },
  { icon: Scale, t: "Quantity-conserving splits and merges", d: "Split 100 kg and the parts must total exactly 100 kg. Merges only combine the same product and unit." },
  { icon: BadgeCheck, t: "Recorded inspection evidence", d: "Inspectors sign a grade from 1 to 5 and can attach the report's IPFS reference." },
  { icon: Siren, t: "Traceable recall relationships", d: "Recall a lot and every batch made from it is flagged at once, even ones split off earlier." },
  { icon: GitBranch, t: "Verifiable transaction history", d: "Every step is a transaction you can open on the block explorer, from the batch's own page." },
];

const PROVES = [
  "A tamper-evident history of every recorded step, in order.",
  "Which authorised account signed each handoff, and that the receiver accepted it.",
];
const CANNOT = [
  "Inspection reports and photos live off-chain; only their reference is recorded.",
  "Whether the physical goods match the record. That still depends on honest participants.",
];

export default function Home() {
  return (
    <div className="space-y-28 md:space-y-36">
      <section className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14 [&>*]:min-w-0">
        <div>
          <p className="enter mb-5 inline-flex items-center gap-2 rounded-full bg-lime/70 px-3 py-1 text-sm font-medium text-forest" style={{ ["--d" as string]: "0s" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-forest-500" aria-hidden /> Running on {networkLabel}
          </p>
          <HeroTitle />
          <p className="enter mt-6 max-w-[34rem] text-lg text-slate-600" style={{ ["--d" as string]: "0.5s" }}>
            Trace a product from its origin to its destination. Follow every handoff, inspect its history, and see how each batch moves through the supply chain.
          </p>
          <div className="enter mt-7 flex flex-wrap gap-3" style={{ ["--d" as string]: "0.62s" }}>
            <Link href="/explorer" className="press inline-flex items-center rounded-full bg-forest px-6 py-3 text-[15px] font-semibold text-paper hover:bg-forest-700">Explore batches</Link>
            <a href="#how" className="press inline-flex items-center gap-2 rounded-full border border-paper-300 bg-white px-6 py-3 text-[15px] font-semibold text-forest hover:bg-paper-200">See how it works <ArrowDown size={16} aria-hidden /></a>
          </div>
          <div className="enter mt-8" style={{ ["--d" as string]: "0.72s" }}>
            <p className="mb-2 text-sm font-medium text-slate">Have a product label? Trace it.</p>
            <Lookup />
          </div>
          <p className="enter mt-1 max-w-md text-sm text-slate-600" style={{ ["--d" as string]: "0.8s" }}>
            Recorded on-chain: who created the batch, every handoff and declared price, splits, inspections and recalls.
          </p>
        </div>
        <HeroTree />
      </section>

      <section id="how" className="scroll-mt-24">
        <Reveal><h2 className="max-w-lg font-display text-4xl font-[750] leading-[1.05] tracking-[-0.035em] text-forest">How a batch moves</h2></Reveal>
        <ol className="relative mt-10 grid gap-8 lg:grid-cols-4 lg:gap-6">
          <span aria-hidden className="absolute left-[19px] top-2 h-[calc(100%-1rem)] w-px bg-paper-300 lg:left-0 lg:top-[19px] lg:h-px lg:w-full" />
          {STEPS.map(({ icon: Icon, t, d, href, cta }, i) => (
            <Reveal as="li" key={t} delay={i * 0.1} className="relative grid grid-cols-[40px_1fr] gap-4 lg:block">
              <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full bg-forest font-display text-lg font-[750] text-lime ring-4 ring-paper">{i + 1}</span>
              <div className="lg:mt-5">
                <p className="flex items-center gap-2 font-semibold text-forest"><Icon size={17} className="text-forest-500" aria-hidden />{t}</p>
                <p className="mt-1.5 text-[15px] text-slate-600">{d}</p>
                <Link href={href} className="mt-2 inline-block text-sm font-medium text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest">{cta}</Link>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <Reveal>
          <h2 className="font-display text-4xl font-[750] leading-[1.05] tracking-[-0.035em] text-forest">The rules live in the contract</h2>
          <p className="mt-4 max-w-sm text-slate-600">
            The website can&apos;t bend them. Every permission and every quantity check runs on the blockchain, so even a modified app gets rejected.
          </p>
        </Reveal>
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {GUARANTEES.map(({ icon: Icon, t, d }, i) => (
            <Reveal as="li" key={t} delay={(i % 2) * 0.08 + Math.floor(i / 2) * 0.06} className="flex gap-4 border-t border-paper-300 py-6">
              <Icon size={22} strokeWidth={1.8} className="mt-0.5 shrink-0 text-forest-500" aria-hidden />
              <div>
                <p className="font-semibold text-forest">{t}</p>
                <p className="mt-1 text-[15px] text-slate-600">{d}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      <Reveal as="section" className="rounded-2xl border border-paper-300 bg-white p-6 shadow-lift md:p-12">
        <h2 className="font-display text-3xl font-[750] tracking-[-0.03em] text-forest">What a blockchain can and can&apos;t prove</h2>
        <p className="mt-3 max-w-2xl text-slate-600">TraceRoot raises the cost of fraud and speeds up recalls. Being clear about its limits is part of the design.</p>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <p className="font-semibold text-forest">It proves</p>
            <ul className="mt-3 space-y-3">{PROVES.map((x) => <li key={x} className="flex gap-3 text-[15px] text-slate-600"><Check size={18} className="mt-0.5 shrink-0 text-forest-500" aria-hidden />{x}</li>)}</ul>
          </div>
          <div>
            <p className="font-semibold text-forest">It can&apos;t prove on its own</p>
            <ul className="mt-3 space-y-3">{CANNOT.map((x) => <li key={x} className="flex gap-3 text-[15px] text-slate-600"><Minus size={18} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />{x}</li>)}</ul>
          </div>
        </div>
        <div className="mt-10 grid gap-4 border-t border-paper-300 pt-8 md:grid-cols-[1fr_auto] md:items-center">
          <p className="font-medium text-slate">Holding a product? Check its story.</p>
          <Lookup />
        </div>
      </Reveal>
    </div>
  );
}
