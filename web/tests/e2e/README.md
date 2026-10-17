# End-to-end tests

They run against a production build and a freshly seeded local chain.

```bash
# terminal 1 (contracts/)
npx hardhat node
# terminal 2 (contracts/)
npm run deploy:local && npm run seed:local
# terminal 3 (web/)
printf "NEXT_PUBLIC_CHAIN=localhost\nNEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3\n" > .env.local
npm run build
npx playwright install chromium   # first time only
npm run test:e2e
```

Re-seed (restart the node) before re-running: one test creates a batch.
