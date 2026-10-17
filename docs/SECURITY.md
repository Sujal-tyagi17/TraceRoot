# Security notes

This is automated testing and static analysis, **not a formal audit**.

## Tests

- 30 Hardhat tests, about 99% line coverage and 81% branch coverage (`npm run coverage`).
- A randomized invariant test applies 40 random splits and merges and checks that the total active quantity never changes.

## Slither (0.11.x) triage

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
