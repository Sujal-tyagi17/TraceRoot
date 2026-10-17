import type { Batch } from "./traceroot";
import { dateTime } from "./format";

/** Why an offer can't be accepted right now, judged the same way the contract will judge it. */
export function offerProblem(b: Batch, now: number): string | undefined {
  if (!b.pending) return undefined;
  if (b.inheritedRecall) return "This batch is under recall, so the contract won't let it change hands. Decline the offer.";
  if (b.status !== "Active") return "This batch is no longer active.";
  if (now > Number(b.pending.expiresAt)) return `This offer expired on ${dateTime(b.pending.expiresAt)}. Decline it so the sender can offer it again.`;
  return undefined;
}
