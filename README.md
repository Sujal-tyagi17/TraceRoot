# TraceRoot — Every Product Has a Story.

**Trace Every Batch. Verify Every Handoff.**

TraceRoot is a blockchain supply chain provenance platform. It records every batch of a product from its origin to the consumer: who produced it, every handoff (signed by both sides), every split and merge (with quantities that must add up), inspections, declared prices and recalls. Anyone can scan a QR code and see the full story without a wallet.

> Runs on a public **testnet** with free tools only. No real money is involved.

| | |
|---|---|
| Live site | _add your Vercel URL after deploying_ |
| Contract | _add the explorer link from `contracts/deployments/amoy.json`_ |
| Network | Polygon Amoy (chain 80002), configurable to Sepolia |

| Light | Dark |
|---|---|
| ![TraceRoot home page, light theme](docs/screenshots/home.png) | ![TraceRoot home page, dark theme](docs/screenshots/home-dark.png) |

| The Origin Sequence (opening animation) | Recall demo on the landing page |
|---|---|
| ![Origin Sequence](docs/screenshots/origin-sequence.png) | ![Recall demo](docs/screenshots/recall-demo.png) |

| Recalled batch on a phone | In-site QR scanner |
|---|---|
| ![Mobile batch page](docs/screenshots/mobile.png) | ![QR scanner dialog](docs/screenshots/scanner.png) |

_Screenshots are from a local Hardhat chain seeded with `npm run seed:local`. The scanner shot uses Chromium's built-in test camera pattern, not a real product label._

### On the website

- **Scan a label in the browser.** "Scan a QR code" opens the rear camera only when pressed, validates what it reads, asks before following a link to another site, and stops the camera on close or when you leave the page. Typing the batch number always works, including when camera access is denied. The camera needs HTTPS (or localhost).
- **Light and dark themes.** Follows the device by default; the header toggle cycles device → light → dark and remembers the choice. The theme is applied before the first paint, so there is no flash.
- **Self-hosted fonts** (Bricolage Grotesque, Instrument Sans, JetBrains Mono, all SIL OFL 1.1) loaded with `next/font/local`. No requests to font CDNs.
- **Reduced motion respected.** The opening animation is skipped, and every other animation jumps to its end state.

## What the contract guarantees

- **Two-step handoffs.** Custody moves only when the recipient accepts. Offers expire after 7 days; either side can cancel.
- **Quantity conservation.** A split consumes the parent and its parts must sum exactly to it. A merge sums compatible batches (same product and unit). Quantity can never be created.
- **Inherited recalls, computed on-chain.** `isRecalled(id)` walks the batch's ancestry, so a child created *before* a recall is flagged instantly. No indexer delay can show a recalled product as safe. Ancestry is capped at 64 nodes to keep this cheap.
- **Role-based access.** Administrator, Producer, Trader, Transporter, Inspector, Retailer, all enforced in Solidity with OpenZeppelin `AccessControl`.
- **Declared prices** in INR paise, recorded at each handoff and at sale.
- **History from events.** Each batch stores only the block numbers of its events, so the site rebuilds a timeline with exact single-block log queries that work on free RPC tiers.

### Honest limitations

A blockchain proves *who signed what, and when*. It cannot verify that a physical product matches its record (the oracle problem). Inspections and prices are declarations by accountable participants, not physical proof.

## Repository layout

```
contracts/   Solidity contract, Hardhat tests, deploy scripts
web/         Next.js 15 app (TypeScript, Tailwind, wagmi + viem, Recharts)
docs/        Architecture, security notes, progress log
```

## Run it locally

```bash
# 1. Contracts
cd contracts
npm install
npx hardhat test                # 30 tests
npx hardhat coverage

# 2. Local chain with demo data (three terminals)
npx hardhat node
npm run deploy:local && npm run seed:local

# 3. Web app
cd ../web
npm install
printf "NEXT_PUBLIC_CHAIN=localhost\nNEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3\n" > .env.local
npm run dev                     # http://localhost:3000
```

To act as a participant locally, import one of Hardhat's printed test private keys into MetaMask and add the network `http://127.0.0.1:8545`, chain ID 31337.

## Deploy for free (testnet)

1. **Make a dedicated test wallet** in MetaMask. Never use a wallet that holds real funds.
2. **Get free test POL** for Polygon Amoy from a faucet (for example the official Polygon faucet or a provider faucet).
3. **Configure**: copy `contracts/.env.example` to `contracts/.env` and paste the test wallet's private key. `.env` is git-ignored.
4. **Deploy**:
   ```bash
   cd contracts
   npm run deploy:amoy
   ```
   This writes `deployments/amoy.json` (address, tx hash, block) and copies the ABI into the web app.
5. **Verify source** (optional, free API key): `npx hardhat verify --network amoy <address> <adminAddress>`
6. **Grant roles** to participant wallets from the site's *Dashboard → Admin* tab, or:
   `ROLE=PRODUCER ACCOUNT=0x... npx hardhat run scripts/grant-roles.js --network amoy`
7. **Host the site on Vercel** (free): import the GitHub repo, set *Root Directory* to `web`, and add the environment variables `NEXT_PUBLIC_CHAIN=amoy` and `NEXT_PUBLIC_CONTRACT_ADDRESS=<address>`.

The deploy script refuses to run on any chain except Amoy, Sepolia and local Hardhat. There is no mainnet configuration.

## Testing

| Command | What it does |
|---|---|
| `web: npm run lint` | ESLint (Next.js core web vitals + TypeScript rules) |
| `web: npm test` | 15 unit tests: example network lineage, role permissions, form parsers, error classification, QR content validation |
| `web: npm run test:e2e` | 27 Playwright browser tests against a seeded local chain: dashboard roles, real transactions, intro, theme, and QR scanning with a simulated camera (see `web/tests/e2e/README.md`) |
| `contracts: npm test` | 30 contract tests: roles, handoffs, expiry, split/merge conservation, recalls, lineage cap, event index |
| `contracts: npm run coverage` | ≈99% line coverage |
| `contracts: npm run slither` | Static analysis; see `docs/SECURITY.md` for triage |

The test suite includes a randomized split/merge invariant test showing total active quantity never changes. This is automated testing, not a formal audit.

## Tech stack

Solidity 0.8.24 · OpenZeppelin 5 · Hardhat · Next.js 15 · TypeScript · Tailwind CSS · wagmi 2 · viem · Recharts · qrcode · @zxing/browser · GitHub Actions

---

Built by **Sujal Tyagi** · [GitHub](https://github.com/Sujal-tyagi17)
