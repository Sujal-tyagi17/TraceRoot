import Link from "next/link";
import { Handshake, Scale, Siren, ReceiptIndianRupee, GitBranch, ScanLine } from "lucide-react";
import { Lookup } from "@/components/Lookup";
import { RootTree } from "@/components/RootTree";
import { githubUrl } from "@/lib/config";

const STEPS = [
  ["Register at the source", "A producer records the lot: what it is, how much, where and when it was harvested."],
  ["Hand it over in two steps", "The sender offers the batch. Custody moves only when the receiver confirms they have it."],
  ["Split, merge, inspect", "Traders split lots for different buyers. Inspectors add grades and reports along the way."],
  ["Scan on the shelf", "The retailer prints a QR code. Anyone can scan it and read the whole journey."],
];

const GUARANTEES = [
  { icon: Handshake, t: "Nobody fakes a handoff alone", d: "Both sides sign. An offer that is never accepted never moves the goods." },
  { icon: Scale, t: "Quantity can't appear from nowhere", d: "Split 100 kg and the parts must total exactly 100 kg. The contract rejects anything else." },
  { icon: Siren, t: "Recalls reach every branch", d: "Recall a lot and every batch made from it is flagged at once, even ones split off earlier." },
  { icon: ReceiptIndianRupee, t: "Prices are on the record", d: "Each handoff can declare a price, so you can see how value is shared from farm to shelf." },
  { icon: GitBranch, t: "Ancestry stays connected", d: "Follow any batch back to the farms it came from, or forward to where it ended up." },
  { icon: ScanLine, t: "Checking needs no account", d: "Consumers scan and read. No wallet, app or sign-up." },
];

export default function Home() {
  return (
    <div className="space-y-28 md:space-y-36">
      <section className="grid items-center gap-10 md:grid-cols-[1fr_1.05fr] md:gap-14 [&>*]:min-w-0">
        <div>
          <h1 className="font-display text-[3.4rem] font-[750] leading-[.95] tracking-[-0.045em] text-forest md:text-[5.2rem]">
            Every product has a story.
          </h1>
          <p className="mt-6 max-w-md text-lg text-slate-600">
            TraceRoot follows a batch from the farm to the shelf. Every handoff is signed by both sides, every split must add up, and a recall reaches every branch.
          </p>
          <div className="mt-8"><Lookup /></div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
            <Link href="/explorer" className="text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest">Browse all batches</Link>
            <a href={githubUrl} target="_blank" rel="noreferrer" className="text-slate-600 underline decoration-transparent underline-offset-4 hover:text-forest hover:decoration-forest/30">Read the source</a>
          </div>
        </div>
        <RootTree />
      </section>

      <section>
        <h2 className="max-w-lg font-display text-4xl font-[750] leading-[1.05] tracking-[-0.035em] text-forest">How a batch moves</h2>
        <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="relative pt-12">
              <span className="absolute left-0 top-0 font-display text-4xl font-[750] leading-none text-lime-600" aria-hidden>{i + 1}</span>
              <p className="font-semibold text-forest">{t}</p>
              <p className="mt-1.5 text-[15px] text-slate-600">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <h2 className="font-display text-4xl font-[750] leading-[1.05] tracking-[-0.035em] text-forest">The rules live in the contract</h2>
          <p className="mt-4 max-w-sm text-slate-600">
            The website can&apos;t bend them. Every permission and every quantity check runs on the blockchain, so a modified app gets rejected too.
          </p>
        </div>
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {GUARANTEES.map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex gap-4 border-t border-paper-300 py-6">
              <Icon size={22} strokeWidth={1.8} className="mt-0.5 shrink-0 text-forest-500" />
              <div>
                <p className="font-semibold text-forest">{t}</p>
                <p className="mt-1 text-[15px] text-slate-600">{d}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-8 rounded-2xl border border-paper-300 bg-white p-6 shadow-lift md:grid-cols-[1.2fr_1fr] md:items-center md:p-12 [&>*]:min-w-0">
        <div>
          <h2 className="font-display text-3xl font-[750] tracking-[-0.03em] text-forest">What it can and can&apos;t prove</h2>
          <p className="mt-3 text-slate-600">
            A blockchain proves who signed what, and when. It can&apos;t look inside a sack of rice. TraceRoot makes fraud harder and recalls faster, but inspections and prices are declarations by named participants, not lab results.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-medium text-slate">Have a label in your hand?</p>
          <Lookup />
        </div>
      </section>
    </div>
  );
}
