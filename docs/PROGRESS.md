# Progress

_Last updated 18 Oct 2026_

| Phase | Status | Evidence |
|---|---|---|
| 0 · Repo, architecture, docs | ✅ Done | README, docs/ARCHITECTURE.md, docs/SECURITY.md |
| 1 · Frontend foundation (all routes, branding, responsive) | ✅ Done | `npm run build` passes, 16 routes; screenshots in docs/screenshots |
| 2 · Smart contract | ✅ Done | contracts/contracts/TraceRoot.sol |
| 3 · Tests & security | ✅ Done | 51 tests passing, 100% line coverage, Slither triaged (earlier run) |
| 4 · Public testnet deployment | ✅ Done | Sepolia `0x0B90219475dDa20b61FD59E68d2110397BEb3831`, verified on Etherscan (exact match), tx `0x6651fca1c0…`, block 11,940,207 |
| 5 · Real Web3 frontend | ✅ Done locally | Batch created and confirmed through the UI against a local chain; contract errors shown in plain language |
| 6 · IPFS upload & DB indexer | ◐ Partial | CIDs supported; per-batch history works without an indexer; browser upload and Supabase indexer not built |
| 7+ · Hosting | ✅ Done | https://traceroot-chain.vercel.app (Vercel Hobby, `NEXT_PUBLIC_CHAIN=sepolia`) |

## Verified locally (Hardhat chain 31337)

- Seeded a realistic journey: 2 rice farmers → transporter → trader (merge 1000 + 400 kg, split into 600 + 800 kg) → retailer → sold; a coffee batch recalled after a grade-2 inspection.
- Public pages render real contract data: explorer, batch timeline, lineage, QR code, recall banner, analytics.
- Wallet write path: created batch #7 from the dashboard form and waited for confirmation; an invalid split (30 + 30 ≠ 75) surfaced "Split quantities must add up exactly to the batch quantity."
- Full journey through the website with one wallet per role (18 Oct 2026, `web/tests/e2e/workflow.spec.ts`): create → offer → accept → split 40 + 60 → transporter accepts, logs a reading, offers to retailer → retailer declines, then accepts → inspection → sale → recall of the origin → public pages show the inherited recall on the sold lot. Each step is checked against contract state over RPC.

## Next manual steps (owner)

1. Create a test-only MetaMask wallet and fund it from an Amoy faucet.
2. Put its private key in `contracts/.env` and run `npm run deploy:amoy`.
3. Import `web/` into Vercel with the two `NEXT_PUBLIC_*` variables.
4. On the deployed HTTPS site, test QR scanning with a real phone (Android Chrome and iOS Safari).
