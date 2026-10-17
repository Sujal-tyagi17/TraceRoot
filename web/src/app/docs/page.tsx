import { PageHeader } from "@/components/ui";

export const metadata = { title: "Docs" };

const S = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <section className="space-y-2"><h2 className="font-display text-2xl font-[650] tracking-tight text-forest">{t}</h2><div className="space-y-2 text-slate-600">{children}</div></section>
);
const C = ({ children }: { children: React.ReactNode }) => <code className="rounded bg-paper-200 px-1.5 py-0.5 font-mono text-sm">{children}</code>;

export default function Docs() {
  return (
    <article className="max-w-3xl space-y-10">
      <PageHeader eyebrow="Documentation" title="Using TraceRoot" />
      <S t="For consumers">
        <p>Scan the QR code on a product, or enter its batch number on the home page. You will see its origin, every handoff, inspections, declared prices and any recall. No wallet needed.</p>
      </S>
      <S t="For participants">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Install MetaMask and add the testnet (the site prompts you to switch).</li>
          <li>Get free test tokens from a faucet for gas.</li>
          <li>Ask the administrator to grant your wallet a role (Producer, Trader, Transporter, Inspector or Retailer).</li>
          <li>Open the Dashboard. Producers create batches; anyone holding a batch can offer it to another participant, who confirms receipt.</li>
        </ol>
      </S>
      <S t="Rules the contract enforces">
        <ul className="list-disc space-y-1 pl-5">
          <li>Custody changes only when the recipient accepts. Offers expire after 7 days; sender or recipient can cancel.</li>
          <li>A split consumes the parent entirely; part quantities must sum exactly to it (include remainders as a part). 2–20 parts.</li>
          <li>A merge needs 2–8 active batches of the same product and unit held by you.</li>
          <li>Recalls can be issued by the administrator or an inspector and are inherited by all descendants. Only the administrator can clear one.</li>
          <li>Prices are integers in INR paise (₹1 = 100). They are declarations, not verified market prices.</li>
          <li>Inspection grades run 1 (rejected) to 5 (excellent).</li>
        </ul>
      </S>
      <S t="Self-hosting">
        <p>Deploy the contract with <C>npm run deploy:amoy</C> in <C>contracts/</C>, then set <C>NEXT_PUBLIC_CONTRACT_ADDRESS</C> and <C>NEXT_PUBLIC_CHAIN</C> on your host. Full steps are in the repository README.</p>
      </S>
    </article>
  );
}
