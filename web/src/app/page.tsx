import Link from "next/link";
import { ArrowRight, GitMerge, Handshake, Scale, Siren, ScanLine, ReceiptIndianRupee } from "lucide-react";
import { Lookup } from "@/components/Lookup";
import { Journey } from "@/components/Journey";
import { chain, githubUrl } from "@/lib/config";

const FEATURES = [
  { icon: Handshake, t: "Two-step handoffs", d: "Custody only changes when the receiver accepts. Neither party can fake a transfer alone." },
  { icon: Scale, t: "Quantity conservation", d: "Splits and merges must add up exactly. The contract rejects any batch that would create quantity from nothing." },
  { icon: Siren, t: "Inherited recalls", d: "Recall a source batch and every descendant is flagged instantly — computed on-chain, never waiting on an indexer." },
  { icon: ReceiptIndianRupee, t: "Price transparency", d: "Each handoff can declare a price, so you can see how value is shared along the chain." },
  { icon: GitMerge, t: "Full ancestry", d: "Navigate parent and child batches to see exactly which lots ended up on the shelf." },
  { icon: ScanLine, t: "QR for consumers", d: "Every batch gets a public page and QR code. No wallet, no sign-up needed to verify a product." },
];

export default function Home() {
  return (
    <div className="space-y-24">
      <section className="grid items-center gap-12 pt-6 md:grid-cols-[1.1fr_.9fr]">
        <div className="rise">
          <p className="mb-4 inline-flex rounded-full bg-lime px-3 py-1 text-xs font-medium text-forest">Live on {chain.name} testnet</p>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-forest md:text-6xl">
            Every product<br />has a story.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600">
            TraceRoot records each batch from its origin to the shelf — every handoff signed by both sides, every split accounted for, every recall impossible to hide.
          </p>
          <div className="mt-8"><Lookup /></div>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <Link href="/explorer" className="inline-flex items-center gap-1.5 font-medium text-forest underline-offset-4 hover:underline">Browse all batches <ArrowRight size={14} /></Link>
            <span className="text-paper-300">|</span>
            <a href={githubUrl} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-forest">View source</a>
          </div>
        </div>
        <div className="grain relative rounded-2xl border border-paper-300 bg-paper-200/60 p-6">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[.2em] text-forest-500">Trace every batch · verify every handoff</p>
          <Journey />
        </div>
      </section>

      <section>
        <h2 className="font-display text-3xl font-semibold text-forest">The problem with paper trails</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            ["Origin claims are easy to fake", "A label can say anything. Without a shared record, buyers just have to trust the last seller."],
            ["Recalls are slow and partial", "When a batch is split across distributors, finding every affected lot can take days."],
            ["Value is invisible", "Producers rarely see what their goods sell for downstream, so the chain stays opaque."],
          ].map(([t, d]) => (
            <div key={t} className="border-l-2 border-lime-600 pl-4">
              <p className="font-medium text-forest">{t}</p>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-3xl font-semibold text-forest">What the contract guarantees</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-paper-300 bg-white/60 p-5">
              <Icon size={20} className="text-forest-500" />
              <p className="mt-3 font-medium text-forest">{t}</p>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-forest p-8 text-paper md:p-12">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold">Honest about its limits</h2>
            <p className="mt-3 text-paper/80">
              A blockchain proves <em>who signed what, and when</em>. It cannot see inside a sack of rice. TraceRoot makes fraud harder — two-party handoffs, quantity conservation, inspector records — but inspections and prices are declarations by accountable participants, not physical proof.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <p className="text-sm text-paper/70">Have a batch number from a label?</p>
            <Lookup dark />
          </div>
        </div>
      </section>
    </div>
  );
}
