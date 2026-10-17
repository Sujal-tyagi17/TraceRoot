# Security notes

This is automated testing and static analysis, **not a formal audit**.

## Tests

- 51 Hardhat tests: 100% line and function coverage, 84.8% branch coverage (`npm run coverage`).
- `test/Workflow.test.js` runs a full journey (create → handoff → split → transporter → inspection → retail sale → recall → clear) and checks state and events at each step.
- `test/Adversarial.test.js` covers repeated operations, unauthorized callers, boundaries (20/21 split parts, 8/9 merge sources, uint128 overflow on merge, byte-length text limits, grades 0/6, humidity 1001, future dates) and recall inheritance through split → merge → split.
- A randomized invariant test applies 40 random splits and merges and checks that the total active quantity never changes.

## Contract review (October 2026)

Manual review of `TraceRoot.sol` plus the tests above. No change to the contract was needed, so **no redeployment is required**.

| Severity | Finding | Status |
|---|---|---|
| Medium (risk) | **Single administrator key.** `DEFAULT_ADMIN_ROLE` can grant any role, pause, and clear recalls. A lost or compromised key, or an accidental `renounceRole`, has no recovery path. | Accepted for a testnet demo. For production use a multisig, or OpenZeppelin `AccessControlDefaultAdminRules` for delayed admin transfer. |
| Low (design) | **Expired offers keep the batch locked** until the sender or recipient calls `cancelTransfer`; nothing clears them automatically. | Tested. The website now flags expired offers and offers **Decline** / **Withdraw**. |
| Low (design) | **Revoking a role strands that wallet's batches**, because custodian actions require a current role. The administrator must re-grant to recover them. | Tested; documented. |
| Low (design) | **`addEvidence` still works on consumed or sold batches** for their last custodian. Useful for late invoices; it can't change quantity, custody or status. | Accepted. |
| Low (risk) | **Per-batch event index can grow** if a custodian repeatedly proposes and cancels, or an inspector records many inspections. Only role holders can do this, and only the affected batch's history gets slower to load. | Accepted. |
| Info | Recalls, recall clearing and offer cancellation work while paused, deliberately: safety actions should never be blocked. | Tested. |
| Info | No external calls or Ether transfers, so no reentrancy surface. Recall checks recurse at most `MAX_LINEAGE = 64` times. | Reviewed. |
| Info | `NotParticipant` is reused for "not allowed to recall" and "not allowed to split/merge". Clear enough for the UI's messages. | Accepted. |

## Website review (October 2026)

| Severity | Finding | Fix |
|---|---|---|
| Medium | Recipients had no way to **decline** an offer, and expired or recalled offers showed a *Confirm receipt* button that would always fail. | Offer cards check expiry against chain time and recall status, hide the doomed button, and add *Decline*. |
| Medium | A transaction sent while the RPC then failed to return its receipt was shown as a plain network error, inviting a **duplicate submission**. | New "Sent, but not confirmed yet" state with the transaction link; covered by a browser test that blocks receipt lookups. |
| Medium | List pages read only the newest 200 batches but labelled counts as totals; **incoming offers on older batches could be missed**. | Lists read up to 500 and say so when there are more; the dashboard total comes from `batchCount()`. |
| Low | After accepting, declining or withdrawing, the offer card disappeared on refresh and took its confirmation with it. | Confirmation now stays at page level. |
| Low | Analytics "Batches by status" counted recalled consumed or sold batches twice. | Categories are exclusive and add up to the total. |
| Low | "Not enough gas" was labelled as a contract rejection. | Own state and message. |
| Low | WCAG AA contrast failures for small grey, red and green text in light mode; diagram nodes' accessible names didn't match their visible text; no skip link. | Tokens darkened, names fixed, skip link added. axe-core reports no WCAG A/AA violations on the main pages in either theme. |

## Dependencies

`npm audit --omit=dev` in `web/` reports 25 advisories (2 high, 23 moderate). All are in transitive dependencies of wallet SDKs that wagmi installs but this site does not use (it only uses the injected connector, so WalletConnect and the MetaMask SDK never load), or in Next.js's build-time PostCSS. The fixes require major-version upgrades (`npm audit fix --force`), so they are deferred rather than forced. `contracts/` reports none.

## Slither (0.11.x) triage

Slither was not re-run in the October 2026 review (it isn't installed in the review environment); the triage below is from the earlier run.

| Finding | Assessment |
|---|---|
| `incorrect-equality` on `status == Status.None/Consumed` | False positive. These compare enums, not balances. |
| `uninitialized-local` (`sum`, `total`, `lineage`, hashes) | Intentional. Zero is the correct starting value. |
| `timestamp` comparisons | Accepted. Used only for the 7-day transfer expiry and to reject future production dates; miner drift of seconds is irrelevant. |
| `costly-loop` (`++batchCount` in split) | Accepted. Bounded by `MAX_SPLIT_PARTS = 20`. |
| `cyclomatic-complexity` in `mergeBatches` | Accepted. Each branch is a validation; covered by tests. |

## Threat model highlights

- **Fake handoffs:** prevented by the two-step propose/accept flow. The sender alone cannot move custody.
- **Quantity inflation:** split sums are checked exactly; merges are summed from consumed sources; duplicate source IDs fail because the first occurrence is already consumed.
- **Hiding a recall by splitting:** impossible, because recall status is inherited from ancestors on-chain.
- **Unbounded gas in recall checks:** lineage size is capped at 64.
- **Revoked participants:** lose the ability to act on batches they hold.
- **Emergency:** the administrator can `pause()` all state-changing operations except cancellation and recalls.

## Known limitations

- Physical truth (the oracle problem): the contract cannot know whether goods match their record.
- A single administrator key. For production this should be a multisig.
- Text fields are public on-chain. Do not store personal data in product or origin fields.
