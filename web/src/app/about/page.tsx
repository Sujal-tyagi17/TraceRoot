import { PageHeader } from "@/components/ui";
import { githubUrl } from "@/lib/config";

export const metadata = { title: "About" };

export default function About() {
  return (
    <article className="max-w-2xl space-y-5 text-slate-600">
      <PageHeader eyebrow="About" title="Why TraceRoot exists" />
      <p>TraceRoot is a portfolio project by Sujal Tyagi exploring how a public blockchain can make supply chains more accountable without pretending to solve problems it can&apos;t.</p>
      <p>The name says it: <b className="text-forest">Trace</b> for transparency, <b className="text-forest">Root</b> for origin. Branching roots stand for the way one lot of produce splits across many buyers — and why a recall must follow every branch.</p>
      <h2 className="pt-4 font-display text-2xl text-forest">Design choices</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li><b>Contract is the source of truth.</b> Every permission is enforced on-chain, never only in the UI.</li>
        <li><b>Recall status is computed on-chain</b> by walking a batch&apos;s ancestry, bounded to 64 ancestors, so no indexer lag can show a recalled product as safe.</li>
        <li><b>History lives in events.</b> Each batch stores only the block numbers of its events, so the site can rebuild a timeline with tiny, exact queries on free RPC tiers.</li>
        <li><b>Zero cost.</b> Testnet, free RPC, free hosting. No real money moves.</li>
      </ul>
      <h2 className="pt-4 font-display text-2xl text-forest">Limitations</h2>
      <p>A blockchain records who signed what and when. It cannot verify that a physical product matches its record (the &ldquo;oracle problem&rdquo;). TraceRoot raises the cost of fraud with two-party handoffs, quantity conservation and accountable inspector records — it does not eliminate it.</p>
      <p><a className="text-forest underline" href={githubUrl} target="_blank" rel="noreferrer">Source code on GitHub</a></p>
    </article>
  );
}
