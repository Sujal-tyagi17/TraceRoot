# TraceRoot architecture

```
 Consumer (no wallet)          Participant (MetaMask)
        │                              │
        ▼                              ▼
 ┌──────────────────────── Next.js app (Vercel) ────────────────────────┐
 │  /  /explorer  /batch/[id]  /analytics      /dashboard/* (writes)     │
 │  viem public client — reads              wagmi — simulate → sign → wait│
 └───────────────┬──────────────────────────────────────┬───────────────┘
                 │ eth_call / eth_getLogs (single block) │ eth_sendRawTransaction
                 ▼                                       ▼
        ┌──────────────────── TraceRoot.sol (Polygon Amoy) ────────────────┐
        │ AccessControl roles · batches · pending transfers · lineage      │
        │ events = history · _eventBlocks[id] = where to find them          │
        └──────────────────────────────────────────────────────────────────┘
                 ▲
                 │ CIDs only
           IPFS (photos, reports) — optional
```

## Source of truth

The contract is authoritative for every fact the UI shows. There is no database in the critical path. Reads go straight to the RPC, so the site keeps working if any optional service is down.

## Data model

| Storage | Why it is on-chain |
|---|---|
| `Batch` struct: product, unit, origin, quantity, dates, producer, custodian, status, recall flag, parents, children, lineage size | Needed for rule enforcement (custody, conservation, recall inheritance) |
| `pendingTransfer[id]` | Two-step handoff state |
| `_eventBlocks[id]` | Block numbers containing this batch's events, so history can be fetched with exact single-block log queries |

Everything else (prices, inspections, conditions, evidence CIDs, handoff history) lives only in **events**.

## Key design decisions

1. **Full-consumption splits.** A split always consumes the parent, so there is never ambiguity about "how much of #4 is left". A partial split is expressed as one part being the remainder.
2. **Recall inheritance by ancestry walk.** Setting a flag on every descendant would cost unbounded gas. Instead `isRecalled` walks parents. `lineageSize`, the size of the unfolded ancestry tree, is tracked and capped at 64, so the walk is bounded and the result is always current.
3. **Merged lots.** A merge creates a new batch whose `producer` is the merger and whose origin reads "Merged lot". The real origins remain one click away through `parents`.
4. **No full-range log scans.** Free RPCs limit `eth_getLogs` ranges. `_eventBlocks` costs about 22k gas per new block entry and removes the need for an indexer for per-batch pages.
5. **Prices are integers** in INR paise (`CURRENCY = "INR"`, `CURRENCY_DECIMALS = 2`), always labelled as declarations.

## Roles

| Role | Can |
|---|---|
| Administrator (`DEFAULT_ADMIN_ROLE`) | grant/revoke roles, pause, recall, clear recalls |
| Producer | create batches, split/merge, hand off |
| Trader | split/merge, hand off |
| Transporter | hand off, log condition readings while in custody |
| Inspector | record inspections, issue recalls |
| Retailer | split/merge, hand off, mark sold |

A participant whose role is revoked can no longer act on batches they hold.

## Not built yet (from the original plan)

- Off-chain Postgres indexer (Supabase). Not required for correctness thanks to `_eventBlocks`; it would help for global analytics at scale.
- Direct IPFS upload from the browser. The UI currently accepts CIDs that users pin themselves, for example with Pinata's free tier.
- Gasless meta-transactions for producers.

## Frontend notes

- **Origin Sequence** (`web/src/components/intro/`): a pre-paint script in `<head>` decides once per session whether the intro plays (landing page only, never with reduced motion) and marks the session as seen before React runs, so Strict Mode and refreshes can't replay it. All timing is CSS (`--at` per element); JavaScript only listens to the curtain's own `animationstart` / `animationend`. The landing entrance is delayed by a CSS variable, `--intro-offset`, so it begins exactly as the curtain lifts.
- **Example network** (`web/src/lib/demoNetwork.ts`): one illustrative dataset shared by the intro and the interactive hero. It is labelled as an example wherever it appears.
- **Motion tokens** live at the top of `web/src/app/globals.css`; reduced motion collapses every animation to its end state.
- **Theme** (`web/src/lib/themeBoot.ts`, `theme.ts`, `components/ThemeToggle.tsx`): colours are CSS variables holding RGB channels (`--c-paper`, `--c-ink`, `--c-primary`, …) with a light set on `:root` and a dark set on `html.dark`; Tailwind maps them to classes, so one class works in both themes. Brand colours (`forest`, `lime`, `cream`) stay fixed. A small inline script in `<head>` reads the saved choice (`localStorage["traceroot.theme"]`: `system`, `light` or `dark`) and sets the `dark` class before first paint. Charts pick a matching palette through `useTheme()`.
- **QR scanning** (`web/src/components/QrScanner.tsx`, `web/src/lib/scan.ts`): `@zxing/browser` is imported only when the dialog opens. The camera is requested with `facingMode: { ideal: "environment" }`, and stopped on close, Escape, unmount, `pagehide` and when the tab is hidden. `parseScan` accepts a bare batch number or a URL whose path is exactly `/batch/<n>`; links to another host need a confirmation, and anything else is rejected. The batch is checked against `batchCount()` before navigating. The dialog is portalled to `<body>` so animated ancestors can't trap the fixed overlay.
- **Fonts** (`web/src/app/fonts.ts`): `next/font/local` with the woff2 files and their OFL licences in `web/src/app/fonts/`. Fallbacks are system UI fonts with size-adjusted metrics generated by Next.js, which keeps layout shift minimal.
- **Missing batches**: `getBatch` throws `BatchNotFoundError` when the id is 0 or above `batchCount()`, decided from the count rather than error text (some RPCs don't decode custom errors). The batch page shows a plain "does not exist" message; other failures show a retry button.
