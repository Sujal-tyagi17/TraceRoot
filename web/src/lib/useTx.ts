"use client";
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { BaseError, ContractFunctionRevertedError, InsufficientFundsError, type Hex } from "viem";
import { abi, publicClient } from "./traceroot";
import { chain, contractAddress } from "./config";

export type TxState =
  | { phase: "idle" }
  | { phase: "signing" }
  | { phase: "pending"; hash: Hex }
  | { phase: "confirmed"; hash: Hex }
  | { phase: "error"; kind: ErrorKind; message: string; hash?: Hex };

/** `unconfirmed`: the transaction was broadcast but its receipt couldn't be read, so it may still succeed. */
export type ErrorKind = "rejected" | "reverted" | "network" | "setup" | "funds" | "unconfirmed";

const NO_FUNDS = /insufficient funds|exceeds the balance of the account/i;

const FRIENDLY: Record<string, string> = {
  NotCustodian: "You are not the current custodian of this batch.",
  NotActive: "This batch is not active (it may be consumed or sold).",
  BatchIsRecalled: "This batch (or one of its ancestors) is under recall.",
  TransferPending: "A transfer is already pending for this batch.",
  NoPendingTransfer: "There is no pending transfer for this batch.",
  TransferExpired: "This transfer offer has expired. Ask the sender to cancel and re-send.",
  NotRecipient: "This transfer is addressed to a different wallet.",
  RecipientNotParticipant: "The recipient has no TraceRoot role yet. An administrator must grant one.",
  InvalidRecipient: "Invalid recipient address.",
  NotParticipant: "Your wallet does not have the role needed for this action.",
  AccessControlUnauthorizedAccount: "Your wallet does not have the role needed for this action.",
  InvalidQuantity: "Quantities must be positive whole numbers.",
  InvalidPartCount: "Wrong number of parts (split: 2–20, merge: 2–8).",
  QuantityMismatch: "Split quantities must add up exactly to the batch quantity.",
  IncompatibleBatches: "Only batches with the same product and unit can be merged.",
  LineageTooLarge: "This batch's ancestry is too large to split or merge further.",
  TextTooLong: "One of the text fields is too long.",
  EmptyText: "A required field is empty.",
  InvalidGrade: "Grade must be between 1 and 5.",
  InvalidDate: "Production date must be in the past.",
  AlreadyRecalled: "This batch is already recalled.",
  NotRecalled: "This batch is not directly recalled.",
  BatchNotFound: "Batch not found.",
  EnforcedPause: "The contract is paused by the administrator.",
};

export function classify(e: unknown): ErrorKind {
  const msg = e instanceof Error ? e.message : String(e);
  if (/User (rejected|denied)|rejected the request/i.test(msg)) return "rejected";
  if (NO_FUNDS.test(msg) || (e instanceof BaseError && e.walk((x) => x instanceof InsufficientFundsError))) return "funds";
  if (e instanceof BaseError && e.walk((x) => x instanceof ContractFunctionRevertedError)) return "reverted";
  if (/revert/i.test(msg)) return "reverted";
  if (/fetch|network|timeout|HTTP request failed|ECONN|rate limit/i.test(msg)) return "network";
  return "reverted";
}

export function explain(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && FRIENDLY[name]) return FRIENDLY[name];
      if (name) return `Contract rejected the action: ${name}`;
    }
    if (/User (rejected|denied)/i.test(e.message)) return "Nothing was sent. You can try again whenever you're ready.";
    if (/fetch|network|timeout|HTTP request failed/i.test(e.message)) return "Couldn't reach the blockchain. Check your connection, then try again.";
    if (NO_FUNDS.test(e.message) || e.walk((x) => x instanceof InsufficientFundsError)) return `Not enough test ${chain.nativeCurrency.symbol} for gas, so nothing was sent. Get free test tokens from a faucet.`;
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : String(e);
}

/** Simulates first (surfacing contract errors before signing), then waits for confirmation. */
export function useTx(onConfirmed?: (hash: Hex) => void) {
  const { address, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<TxState>({ phase: "idle" });

  async function send(functionName: string, args: unknown[]) {
    if (!contractAddress) return setState({ phase: "error", kind: "setup", message: "This site isn't connected to a contract yet." });
    if (!address) return setState({ phase: "error", kind: "setup", message: "Connect your wallet first." });
    if (chainId !== chain.id) return setState({ phase: "error", kind: "setup", message: `Switch your wallet to ${chain.name}, then try again.` });
    let hash: Hex | undefined;
    try {
      setState({ phase: "signing" });
      const { request } = await publicClient.simulateContract({ address: contractAddress, abi, functionName, args, account: address } as never);
      hash = await writeContractAsync(request as never);
      setState({ phase: "pending", hash });
      let rc;
      try {
        rc = await publicClient.waitForTransactionReceipt({ hash });
      } catch {
        // Already broadcast: it may still be mined. Never invite a blind resubmit (that could do it twice).
        return setState({ phase: "error", kind: "unconfirmed", hash, message: "Your transaction was sent, but the site couldn't confirm it yet. Open the link to check it before trying again, so it isn't sent twice." });
      }
      if (rc.status !== "success") throw new Error("The transaction was included in a block but reverted on-chain, so nothing changed.");
      setState({ phase: "confirmed", hash });
      onConfirmed?.(hash);
    } catch (e) {
      setState({ phase: "error", kind: classify(e), message: explain(e), hash });
    }
  }
  return { state, send, reset: () => setState({ phase: "idle" }) };
}
