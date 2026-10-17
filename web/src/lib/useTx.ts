"use client";
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { BaseError, ContractFunctionRevertedError, type Hex } from "viem";
import { abi, publicClient } from "./traceroot";
import { chain, contractAddress } from "./config";

export type TxState =
  | { phase: "idle" }
  | { phase: "signing" }
  | { phase: "pending"; hash: Hex }
  | { phase: "confirmed"; hash: Hex }
  | { phase: "error"; message: string; hash?: Hex };

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

export function explain(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && FRIENDLY[name]) return FRIENDLY[name];
      if (name) return `Contract rejected the action: ${name}`;
    }
    if (/User (rejected|denied)/i.test(e.message)) return "You rejected the transaction in your wallet.";
    if (/insufficient funds/i.test(e.message)) return `Not enough test ${chain.nativeCurrency.symbol} for gas. Use a faucet.`;
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : String(e);
}

/** Simulates first (surfacing contract errors before signing), then waits for confirmation. */
export function useTx(onConfirmed?: () => void) {
  const { address, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<TxState>({ phase: "idle" });

  async function send(functionName: string, args: unknown[]) {
    if (!contractAddress) return setState({ phase: "error", message: "Contract not configured." });
    if (!address) return setState({ phase: "error", message: "Connect your wallet first." });
    if (chainId !== chain.id) return setState({ phase: "error", message: `Switch your wallet to ${chain.name}.` });
    let hash: Hex | undefined;
    try {
      setState({ phase: "signing" });
      const { request } = await publicClient.simulateContract({ address: contractAddress, abi, functionName, args, account: address } as never);
      hash = await writeContractAsync(request as never);
      setState({ phase: "pending", hash });
      const rc = await publicClient.waitForTransactionReceipt({ hash });
      if (rc.status !== "success") throw new Error("Transaction reverted on-chain.");
      setState({ phase: "confirmed", hash });
      onConfirmed?.();
    } catch (e) {
      setState({ phase: "error", message: explain(e), hash });
    }
  }
  return { state, send, reset: () => setState({ phase: "idle" }) };
}
