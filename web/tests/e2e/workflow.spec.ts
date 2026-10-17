import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { createPublicClient, http, type Address } from "viem";
import { hardhat } from "viem/chains";
import abi from "../../src/lib/contract/abi.json";
import { ACCOUNTS, connect, injectWallet } from "./wallet";

/**
 * The whole supply chain through the real website, one wallet per role, on the seeded local chain.
 * Every step is checked against contract state read directly over RPC, not only against the UI.
 */
test.use({ contextOptions: { reducedMotion: "reduce" } });
test.describe.configure({ mode: "serial" });

const CONTRACT = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3") as Address;
const chain = createPublicClient({ chain: hardhat, transport: http("http://127.0.0.1:8545") });
const read = <T,>(functionName: string, args: unknown[] = []) => chain.readContract({ address: CONTRACT, abi, functionName, args } as never) as Promise<T>;
type OnChain = { custodian: Address; status: number; quantity: bigint; parents: bigint[]; children: bigint[] };
const batch = (id: bigint) => read<OnChain>("getBatch", [id]);

async function as(browser: Browser, account: string, path: string): Promise<Page> {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await injectWallet(page, account);
  await page.goto(path);
  await connect(page);
  return page;
}
/** Reloads to pick up other wallets' changes. The site reconnects the wallet itself, so Connect is only clicked if shown. */
async function refresh(page: Page) {
  await page.reload();
  await page.waitForLoadState("networkidle");
  const btn = page.getByRole("button", { name: /Connect/ });
  if (await btn.count()) await btn.first().click();
}
const form = (page: Page, title: string) => page.locator("form", { hasText: title });
const confirmed = (where: Locator) => expect(where.getByText("Confirmed on-chain")).toBeVisible({ timeout: 20_000 });
/** Settled offers leave the list, so their confirmation is shown at page level. */
const settled = (page: Page, text: RegExp) => expect(page.getByRole("status").filter({ hasText: "Confirmed on-chain:" })).toContainText(text, { timeout: 20_000 });

let origin: bigint; // created in step 1; #origin+1 and #origin+2 come from the split

test("1. producer creates the origin batch", async ({ browser }) => {
  const page = await as(browser, ACCOUNTS.producer, "/dashboard/batches");
  const f = form(page, "Create a batch");
  await f.getByLabel("Product").fill("E2E saffron");
  await f.getByLabel("Quantity").fill("100");
  await f.getByLabel("Unit", { exact: true }).fill("g");
  await f.getByLabel("Origin").fill("Pampore, Kashmir");
  await f.getByLabel("Produced / harvested on").fill("2026-10-02");
  await f.getByRole("button", { name: "Create batch" }).click();
  await confirmed(f);
  origin = await read<bigint>("batchCount");
  const b = await batch(origin);
  expect(b.custodian).toBe(ACCOUNTS.producer);
  expect(b.quantity).toBe(100n);
  await page.context().close();
});

test("2. producer offers it to the trader; custody stays put until accepted", async ({ browser }) => {
  const page = await as(browser, ACCOUNTS.producer, "/dashboard/transfers");
  const f = form(page, "Offer a handoff");
  await f.getByLabel("Batch #").fill(origin.toString());
  await f.getByLabel("Declared price (₹)").fill("25000");
  await f.getByLabel("Recipient wallet").fill(ACCOUNTS.trader);
  await expect(f.getByText(/Recipient holds: Trader/)).toBeVisible();
  await f.getByRole("button", { name: "Send offer" }).click();
  await confirmed(f);
  expect((await batch(origin)).custodian).toBe(ACCOUNTS.producer);
  // the outgoing list refreshes after confirmation
  await expect(page.getByRole("region", { name: `Outgoing offer for batch #${origin}` })).toBeVisible();

  // public page: no wallet, shows who must accept
  const pub = await (await browser.newContext({ reducedMotion: "reduce" })).newPage();
  await pub.goto(`/batch/${origin}`);
  await expect(pub.getByText("Waiting for")).toBeVisible();
  await page.context().close(); await pub.context().close();
});

test("3. trader confirms receipt from the overview", async ({ browser }) => {
  const page = await as(browser, ACCOUNTS.trader, "/dashboard");
  const offer = page.getByRole("region", { name: `Incoming offer for batch #${origin}` });
  await expect(offer).toContainText("₹25,000");
  await offer.getByRole("button", { name: "Confirm receipt" }).click();
  await settled(page, new RegExp(`Batch #${origin} is now in your custody`));
  await expect(offer).toHaveCount(0);
  expect((await batch(origin)).custodian).toBe(ACCOUNTS.trader);
  expect((await read<[Address]>("pendingTransfer", [origin]))[0]).toBe("0x0000000000000000000000000000000000000000");
  await page.context().close();
});

test("4. trader splits 100 g into 40 g + 60 g; quantity is conserved on-chain", async ({ browser }) => {
  const page = await as(browser, ACCOUNTS.trader, "/dashboard/batches");
  const f = form(page, "Split a batch");
  await f.getByLabel("Batch #").fill(origin.toString());
  await f.getByLabel("Parts").fill("40, 70");
  await expect(f.getByText(/10 g too many/)).toBeVisible();
  await expect(f.getByRole("button", { name: "Split" })).toBeDisabled();
  await f.getByLabel("Parts").fill("40, 60");
  await expect(f.getByText(/Quantity is conserved/)).toBeVisible();
  await f.getByRole("button", { name: "Split" }).click();
  await confirmed(f);
  const parent = await batch(origin);
  expect(parent.status).toBe(2); // Consumed
  expect(parent.children).toEqual([origin + 1n, origin + 2n]);
  const [a, b] = [await batch(origin + 1n), await batch(origin + 2n)];
  expect(a.quantity + b.quantity).toBe(parent.quantity);
  await page.context().close();
});

test("5. transporter receives the 40 g lot, logs a reading, and hands it to the retailer (who declines once)", async ({ browser }) => {
  const lot = origin + 1n;
  const trader = await as(browser, ACCOUNTS.trader, "/dashboard/transfers");
  let f = form(trader, "Offer a handoff");
  await f.getByLabel("Batch #").fill(lot.toString());
  await f.getByLabel("Recipient wallet").fill(ACCOUNTS.transporter);
  await expect(f.getByText(/Recipient holds: Transporter/)).toBeVisible();
  await f.getByRole("button", { name: "Send offer" }).click();
  await confirmed(f);

  const tp = await as(browser, ACCOUNTS.transporter, "/dashboard/transfers");
  const offer = tp.getByRole("region", { name: `Incoming offer for batch #${lot}` });
  await offer.getByRole("button", { name: "Confirm receipt" }).click();
  await settled(tp, /now in your custody/);
  const c = form(tp, "Log a condition reading");
  await c.getByLabel("Batch #").fill(lot.toString());
  await c.getByLabel("Temp °C").fill("18.5");
  await c.getByLabel("Humidity %").fill("40");
  await c.getByRole("button", { name: "Record reading" }).click();
  await confirmed(c);

  f = form(tp, "Offer a handoff");
  await f.getByLabel("Batch #").fill(lot.toString());
  await f.getByLabel("Recipient wallet").fill(ACCOUNTS.retailer);
  await expect(f.getByText(/Recipient holds: Retailer/)).toBeVisible();
  await f.getByRole("button", { name: "Send offer" }).click();
  await confirmed(f);

  // The retailer declines: custody stays with the transporter and the offer is cleared on-chain.
  const rt = await as(browser, ACCOUNTS.retailer, "/dashboard/transfers");
  let incoming = rt.getByRole("region", { name: `Incoming offer for batch #${lot}` });
  await incoming.getByRole("button", { name: "Decline" }).click();
  await settled(rt, /You declined the offer/);
  expect((await batch(lot)).custodian).toBe(ACCOUNTS.transporter);
  expect((await read<[Address]>("pendingTransfer", [lot]))[0]).toBe("0x0000000000000000000000000000000000000000");

  // Offered again, accepted this time.
  await refresh(tp);
  f = form(tp, "Offer a handoff");
  await f.getByLabel("Batch #").fill(lot.toString());
  await f.getByLabel("Recipient wallet").fill(ACCOUNTS.retailer);
  await expect(f.getByText(/Recipient holds: Retailer/)).toBeVisible();
  await f.getByRole("button", { name: "Send offer" }).click();
  await confirmed(f);
  await refresh(rt);
  incoming = rt.getByRole("region", { name: `Incoming offer for batch #${lot}` });
  await incoming.getByRole("button", { name: "Confirm receipt" }).click();
  await settled(rt, /now in your custody/);
  expect((await batch(lot)).custodian).toBe(ACCOUNTS.retailer);
  for (const p of [trader, tp, rt]) await p.context().close();
});

test("6. inspector records a grade on the 60 g lot", async ({ browser }) => {
  const page = await as(browser, ACCOUNTS.inspector, "/dashboard/inspections");
  const f = form(page, "Record an inspection");
  await f.getByLabel("Batch #").fill((origin + 2n).toString());
  await f.getByLabel("Grade").selectOption("5");
  await f.getByLabel("Notes").fill("Crocin strength verified by sample");
  await f.getByRole("button", { name: "Record inspection" }).click();
  await confirmed(f);
  await page.context().close();
});

test("7. retailer sells the 40 g lot", async ({ browser }) => {
  const page = await as(browser, ACCOUNTS.retailer, "/dashboard/batches");
  const f = form(page, "Mark as sold");
  await f.getByLabel("Batch #").fill((origin + 1n).toString());
  await expect(f.getByText(/You hold it/)).toBeVisible();
  await f.getByLabel("Declared retail price (₹)").fill("14000");
  await f.getByRole("button", { name: "Mark sold" }).click();
  await confirmed(f);
  expect((await batch(origin + 1n)).status).toBe(3); // Sold
  await page.context().close();
});

test("8. admin recalls the origin; the sold child and its sibling inherit it", async ({ browser }) => {
  const page = await as(browser, ACCOUNTS.admin, "/dashboard/recalls");
  const f = form(page, "Issue a recall");
  await f.getByLabel("Batch #").fill(origin.toString());
  await f.getByLabel("Reason").fill("Adulteration found in retained sample");
  await f.getByRole("button", { name: "Recall batch" }).click();
  await confirmed(f);
  expect(await read<boolean>("isRecalled", [origin + 1n])).toBe(true);
  expect(await read<boolean>("isRecalled", [origin + 2n])).toBe(true);
  await page.context().close();
});

test("9. public pages (no wallet) show status, journey, inspection and inherited recall", async ({ page }) => {
  await page.goto(`/batch/${origin + 1n}`);
  const alert = page.getByRole("alert").first();
  await expect(alert).toContainText("Do not use this product. It is under recall.");
  await expect(alert).toContainText(`It descends from recalled batch #${origin}`);
  await expect(page.getByText("Recall (inherited)")).toBeVisible();
  await expect(page.getByText("Sold to consumers")).toBeVisible();
  await expect(page.getByText(/Condition reading/)).toBeVisible();
  await expect(page.getByText("Handoff cancelled")).toBeVisible(); // the decline stays in history

  await page.goto(`/batch/${origin + 2n}`);
  await expect(page.getByText(/Grade 5 of 5/)).toBeVisible();
  await page.reload(); // confirmed data survives a refresh
  await expect(page.getByRole("alert").first()).toContainText("under recall");

  await page.goto(`/batch/${origin}`);
  await expect(page.getByText("This batch was recalled directly.")).toBeVisible();
});

test("10. a recalled lot can't change hands: the form explains and stays disabled", async ({ browser }) => {
  const page = await as(browser, ACCOUNTS.trader, "/dashboard/transfers");
  const f = form(page, "Offer a handoff");
  await f.getByLabel("Batch #").fill((origin + 2n).toString());
  await expect(f.getByText(/under recall, so it can't move/)).toBeVisible();
  await expect(f.getByRole("button", { name: "Send offer" })).toBeDisabled();
  await page.context().close();
});

test("11. an expired offer can't be accepted; the recipient is told to decline", async ({ browser }) => {
  const producer = await as(browser, ACCOUNTS.producer, "/dashboard/batches");
  const c = form(producer, "Create a batch");
  await c.getByLabel("Product").fill("E2E cardamom");
  await c.getByLabel("Quantity").fill("5");
  await c.getByLabel("Origin").fill("Idukki, Kerala");
  await c.getByLabel("Produced / harvested on").fill("2026-10-02");
  await c.getByRole("button", { name: "Create batch" }).click();
  await confirmed(c);
  const id = await read<bigint>("batchCount");
  await producer.goto("/dashboard/transfers"); await producer.waitForLoadState("networkidle"); if (await producer.getByRole("button", { name: /Connect/ }).count()) await connect(producer);
  const f = form(producer, "Offer a handoff");
  await f.getByLabel("Batch #").fill(id.toString());
  await f.getByLabel("Recipient wallet").fill(ACCOUNTS.trader);
  await expect(f.getByText(/Recipient holds: Trader/)).toBeVisible();
  await f.getByRole("button", { name: "Send offer" }).click();
  await confirmed(f);

  // Move the local chain 8 days ahead (offers last 7).
  const rpc = (method: string, params: unknown[] = []) => fetch("http://127.0.0.1:8545", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  await rpc("evm_increaseTime", [8 * 86400]); await rpc("evm_mine");

  const trader = await as(browser, ACCOUNTS.trader, "/dashboard/transfers");
  const offer = trader.getByRole("region", { name: `Incoming offer for batch #${id}` });
  await expect(offer).toContainText("This offer expired");
  await expect(offer.getByRole("button", { name: "Confirm receipt" })).toHaveCount(0);
  await offer.getByRole("button", { name: "Decline" }).click();
  await settled(trader, /You declined the offer/);
  expect((await read<[Address]>("pendingTransfer", [id]))[0]).toBe("0x0000000000000000000000000000000000000000");
  await producer.context().close(); await trader.context().close();
});

test("12. a wallet on the wrong network is asked to switch, and nothing is sent", async ({ page }) => {
  await injectWallet(page, ACCOUNTS.producer, "0x1"); // Ethereum mainnet
  await page.goto("/dashboard");
  await connect(page);
  await expect(page.getByRole("button", { name: /Switch to Hardhat/ }).first()).toBeVisible();
});

test("13. if the receipt can't be read after sending, the site says so instead of inviting a duplicate", async ({ browser }) => {
  const page = await as(browser, ACCOUNTS.producer, "/dashboard/batches");
  const before = await read<bigint>("batchCount");
  // Let the transaction through, but make every receipt lookup fail (a flaky RPC right after broadcast).
  await page.route("http://127.0.0.1:8545/**", (r) => (r.request().postData() ?? "").includes("eth_getTransactionReceipt") ? r.abort() : r.continue());
  const f = form(page, "Create a batch");
  await f.getByLabel("Product").fill("E2E pepper");
  await f.getByLabel("Quantity").fill("9");
  await f.getByLabel("Origin").fill("Wayanad, Kerala");
  await f.getByLabel("Produced / harvested on").fill("2026-10-02");
  await f.getByRole("button", { name: "Create batch" }).click();
  await expect(f.getByText("Sent, but not confirmed yet")).toBeVisible({ timeout: 45_000 });
  await expect(f.getByText(/check it before trying again, so it isn't sent twice/)).toBeVisible();
  await expect(f.getByText("Confirmed on-chain")).toHaveCount(0); // never a false success
  expect(await read<bigint>("batchCount")).toBe(before + 1n); // it really was sent, exactly once
  await page.context().close();
});
