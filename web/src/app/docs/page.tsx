import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Docs" };

const S = ({ id, t, children }: { id: string; t: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24 space-y-3 border-t border-paper-300 pt-8">
    <h2 className="font-display text-2xl font-[750] tracking-tight text-ink">{t}</h2>
    <div className="space-y-3 text-[16px] leading-relaxed text-slate-600">{children}</div>
  </section>
);

const TOC = [
  ["how", "How TraceRoot works"], ["scan", "Checking a product"], ["onchain", "What is on-chain and off-chain"],
  ["participants", "Taking part"], ["handoffs", "How handoffs work"], ["splits", "Splitting and merging"],
  ["recalls", "What recall propagation means"], ["limits", "What it can't verify"],
] as const;

export default function Docs() {
  return (
    <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
      <nav aria-label="On this page" className="hidden lg:block">
        <ul className="sticky top-24 space-y-2 text-sm">
          {TOC.map(([id, t]) => <li key={id}><a href={`#${id}`} className="text-slate-600 hover:text-ink">{t}</a></li>)}
        </ul>
      </nav>
      <article className="max-w-2xl space-y-10">
        <PageHeader title="How to use TraceRoot">Everything a shopper, a supplier or a curious engineer needs, in plain words.</PageHeader>

        <S id="how" t="How TraceRoot works">
          <p>Each lot of goods gets a batch number on a public blockchain. Whenever the batch changes hands, is split, inspected or recalled, that step is recorded as a transaction signed by the person doing it.</p>
          <p>The rules for who can do what live in a smart contract, so the website can&apos;t bend them. Anyone can read the record; only people with the right role can add to it.</p>
        </S>

        <S id="scan" t="Checking a product">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Scan the QR code on the label with your phone camera, or type the batch number into the search on the <Link href="/" className="text-ink underline underline-offset-4">home page</Link>.</li>
            <li>You&apos;ll see where it came from, who handled it, any inspections and declared prices, and whether it&apos;s under recall.</li>
            <li>A red banner saying &ldquo;Do not use this product&rdquo; means it, or a batch it came from, has been recalled.</li>
          </ol>
          <p>No wallet, app or account is needed to check a product.</p>
        </S>

        <S id="onchain" t="What is on-chain and what is off-chain">
          <ul className="list-disc space-y-1 pl-5">
            <li><b className="text-slate">On-chain:</b> the batch&apos;s product, quantity, origin and dates; every handoff and its declared price; splits and merges; inspection grades and notes; recalls; and who signed each step.</li>
            <li><b className="text-slate">Off-chain:</b> photos and full inspection reports, stored on IPFS. Only their reference (a CID) is recorded, so the files themselves may not always stay online.</li>
          </ul>
        </S>

        <S id="participants" t="Taking part">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Install MetaMask and connect it from the top right of the site. It will ask you to switch to the test network.</li>
            <li>Get free test tokens from a faucet to pay for transactions. No real money is involved.</li>
            <li>Ask the administrator to give your wallet a role: Producer, Trader, Transporter, Inspector or Retailer.</li>
            <li>Open the <Link href="/dashboard" className="text-ink underline underline-offset-4">Dashboard</Link>. You&apos;ll only see the actions your role allows.</li>
          </ol>
        </S>

        <S id="handoffs" t="How handoffs work">
          <p>A handoff takes two steps. The person holding a batch offers it to another participant, optionally with a price. Custody only changes when the receiver confirms they have the goods.</p>
          <p>Offers expire after 7 days. Either side can cancel before then. A batch that&apos;s waiting on an offer can&apos;t be split, merged or offered to someone else.</p>
        </S>

        <S id="splits" t="Splitting and merging">
          <p>Splitting divides one batch into 2 to 20 smaller ones, for example 100 kg into 40 kg and 60 kg. The parts must add up exactly to the original, and the original batch is used up. To keep some back, include it as one of the parts.</p>
          <p>Merging combines 2 to 8 batches you hold of the same product and unit into one. Every new batch keeps a link to the batches it came from.</p>
          <p>Prices are recorded in whole paise (₹1 = 100 paise) and inspection grades run from 1 (rejected) to 5 (excellent).</p>
        </S>

        <S id="recalls" t="What recall propagation means">
          <p>An administrator or inspector can recall any batch. Every batch made from it by splitting or merging is flagged too, including ones split off before the recall was issued.</p>
          <p>The smart contract works this out by checking each batch&apos;s ancestors, so the warning can&apos;t be delayed or missed. Only the administrator can clear a recall, and must give a reason.</p>
        </S>

        <S id="limits" t="What TraceRoot can't verify on its own">
          <p>A blockchain proves who signed what, and when. It can&apos;t see inside a sack of rice. Two-step handoffs, quantity checks and named inspectors make fraud harder, but grades and prices are declarations by accountable people, not lab results or market data.</p>
        </S>

        <S id="selfhost" t="Running your own copy">
          <p>Deploy the contract with <code className="rounded bg-paper-200 px-1.5 py-0.5 font-mono text-sm">npm run deploy:amoy</code> in the <code className="rounded bg-paper-200 px-1.5 py-0.5 font-mono text-sm">contracts</code> folder, then set <code className="rounded bg-paper-200 px-1.5 py-0.5 font-mono text-sm">NEXT_PUBLIC_CONTRACT_ADDRESS</code> and <code className="rounded bg-paper-200 px-1.5 py-0.5 font-mono text-sm">NEXT_PUBLIC_CHAIN</code> on your host. Full steps are in the repository README.</p>
        </S>
      </article>
    </div>
  );
}
