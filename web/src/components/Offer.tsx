"use client";
import { useQueryClient } from "@tanstack/react-query";
import type { Batch } from "@/lib/traceroot";
import { useTx } from "@/lib/useTx";
import { useChainNow } from "@/lib/hooks";
import { dateTime, inr, short } from "@/lib/format";
import { offerProblem } from "@/lib/offers";
import { Button, Card, TxLink, TxStatus } from "./ui";
import { CheckCircle2 } from "lucide-react";
import type { Hex } from "viem";
import { useState } from "react";
import { RootLoader } from "./Loader";

type Done = (text: string, hash: Hex) => void;

/**
 * Offer cards disappear once the offer is settled (the list refreshes), so the page keeps the
 * confirmation here instead of losing it with the card.
 */
export function useOfferNotice() {
  const [n, setN] = useState<{ text: string; hash: Hex }>();
  const notice = n ? (
    <p role="status" className="confirm-pop flex flex-wrap items-center gap-2 rounded-xl bg-lime px-4 py-2.5 text-sm font-medium text-forest">
      <CheckCircle2 size={15} aria-hidden /> Confirmed on-chain: {n.text} <TxLink hash={n.hash} />
    </p>
  ) : null;
  return { notice, onDone: ((text, hash) => setN({ text, hash })) as Done };
}

/** An offer addressed to the connected wallet: confirm receipt, or decline. */
export function IncomingOffer({ b, onDone }: { b: Batch; onDone?: Done }) {
  const qc = useQueryClient();
  const now = useChainNow();
  const accept = useTx((h) => { onDone?.(`Batch #${b.id} is now in your custody.`, h); qc.invalidateQueries(); });
  const decline = useTx((h) => { onDone?.(`You declined the offer for batch #${b.id}. Custody didn't change.`, h); qc.invalidateQueries(); });
  const busy = [accept, decline].some((t) => t.state.phase === "signing" || t.state.phase === "pending");
  const problem = offerProblem(b, now);
  const p = b.pending!;
  return (
    <section aria-label={`Incoming offer for batch #${b.id}`}>
    <Card>
      <p className="font-display text-xl font-[650] tracking-tight text-ink">#{b.id.toString()} · {b.product}, {b.quantity.toString()} {b.unit}</p>
      <p className="mt-1 text-sm text-slate-600">
        From <span className="font-mono">{short(b.custodian)}</span>{p.price > 0n ? <> · declared {inr(p.price)}</> : null} · offer expires {dateTime(p.expiresAt)}
      </p>
      <p className={`mt-2 text-sm ${problem ? "text-danger" : "text-slate-600"}`}>{problem ?? "Confirm only after you have physically received the goods. Custody moves when you confirm."}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!problem && (
          <Button onClick={() => accept.send("acceptTransfer", [b.id])} disabled={busy} className="press">
            {accept.state.phase === "signing" || accept.state.phase === "pending" ? <><RootLoader size={16} label="Working" /> Working…</> : "Confirm receipt"}
          </Button>
        )}
        <Button variant="ghost" onClick={() => decline.send("cancelTransfer", [b.id])} disabled={busy} className="press">
          {decline.state.phase === "signing" || decline.state.phase === "pending" ? <><RootLoader size={16} label="Working" /> Working…</> : "Decline"}
        </Button>
        <TxStatus state={accept.state.phase !== "idle" ? accept.state : decline.state} />
      </div>
    </Card>
    </section>
  );
}

/** An offer the connected wallet sent: withdraw it at any time. */
export function OutgoingOffer({ b, onDone }: { b: Batch; onDone?: Done }) {
  const qc = useQueryClient();
  const now = useChainNow();
  const withdraw = useTx((h) => { onDone?.(`Offer for batch #${b.id} withdrawn. You still hold it.`, h); qc.invalidateQueries(); });
  const busy = withdraw.state.phase === "signing" || withdraw.state.phase === "pending";
  const p = b.pending!;
  const expired = now > Number(p.expiresAt);
  return (
    <section aria-label={`Outgoing offer for batch #${b.id}`}>
    <Card>
      <p className="font-display text-xl font-[650] tracking-tight text-ink">#{b.id.toString()} · {b.product}</p>
      <p className="mt-1 text-sm text-slate-600">
        Offered to <span className="font-mono">{short(p.to)}</span>{p.price > 0n ? <> · declared {inr(p.price)}</> : null}
      </p>
      <p className={`mt-2 text-sm ${expired || b.inheritedRecall ? "text-danger" : "text-slate-600"}`}>
        {b.inheritedRecall ? "This batch is under recall, so the offer can't be accepted. Withdraw it."
          : expired ? `Expired on ${dateTime(p.expiresAt)}. The batch stays locked until you withdraw the offer.`
          : `Waiting for acceptance until ${dateTime(p.expiresAt)}.`}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="danger" onClick={() => withdraw.send("cancelTransfer", [b.id])} disabled={busy} className="press">
          {busy ? <><RootLoader size={16} label="Working" /> Working…</> : "Withdraw offer"}
        </Button>
        <TxStatus state={withdraw.state} />
      </div>
    </Card>
    </section>
  );
}
