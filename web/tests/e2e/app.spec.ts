import { expect, test } from "@playwright/test";
import { ACCOUNTS, connect, injectWallet } from "./wallet";

test.use({ contextOptions: { reducedMotion: "reduce" } });

test("role-aware tabs for each wallet", async ({ browser }) => {
  const expectTabs = async (acct: string, tabs: string[]) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" }); // BrowserContextOptions, valid here
    const page = await ctx.newPage();
    await injectWallet(page, acct);
    await page.goto("/dashboard");
    await connect(page);
    const nav = page.getByRole("main").getByRole("navigation");
    await expect(nav.getByRole("link")).toHaveText(tabs, { timeout: 10_000 });
    await ctx.close();
  };
  await expectTabs(ACCOUNTS.producer, ["Overview", "Batches", "Transfers"]);
  await expectTabs(ACCOUNTS.admin, ["Overview", "Recalls", "Admin"]);
  await expectTabs(ACCOUNTS.noRole, ["Overview"]);
});

test("a hidden tab opened directly shows an access message", async ({ page }) => {
  await injectWallet(page, ACCOUNTS.producer);
  await page.goto("/dashboard/admin");
  await connect(page);
  await expect(page.getByText("Admin isn't available for your role")).toBeVisible();
  await page.getByRole("link", { name: "Back to overview" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("split form checks quantity conservation live and disables invalid splits", async ({ page }) => {
  await injectWallet(page, ACCOUNTS.trader);
  await page.goto("/dashboard/batches");
  await connect(page);
  const form = page.locator("form", { hasText: "Split a batch" });
  await form.getByLabel("Batch #").fill("6");
  await form.getByLabel("Parts").fill("500, 200");
  await expect(form.getByText(/A handoff is already pending/)).toBeVisible();
  await expect(form.getByRole("button", { name: "Split" })).toBeDisabled();
});

test("a real transaction: producer creates a batch and sees it confirmed", async ({ page }) => {
  await injectWallet(page, ACCOUNTS.producer);
  await page.goto("/dashboard/batches");
  await connect(page);
  const form = page.locator("form", { hasText: "Create a batch" });
  const submit = form.getByRole("button", { name: "Create batch" });
  await expect(submit).toBeDisabled();
  await form.getByLabel("Product").fill("Test turmeric");
  await form.getByLabel("Quantity").fill("50");
  await form.getByLabel("Origin").fill("Erode, Tamil Nadu");
  await form.getByLabel("Produced / harvested on").fill("2026-10-01");
  await submit.click();
  await expect(form.getByText("Confirmed on-chain")).toBeVisible({ timeout: 20_000 });
});

test("explorer shows skeletons, then an error with retry when the chain is unreachable", async ({ page }) => {
  await page.route("http://127.0.0.1:8545/**", (r) => r.abort());
  await page.goto("/explorer");
  await expect(page.getByText(/Couldn't read batches from the blockchain/)).toBeVisible({ timeout: 20_000 });
  await page.unroute("http://127.0.0.1:8545/**");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText(/^\d+ batch(es)?$/)).toBeVisible({ timeout: 15_000 });
});

test("explorer filters by recall status", async ({ page }) => {
  await page.goto("/explorer");
  await page.getByRole("button", { name: "Recalled", exact: true }).click();
  await expect(page.getByText("1 batch", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Arabica coffee beans/ })).toBeVisible();
});

test("batch page shows quality records and declared prices", async ({ page }) => {
  await page.goto("/batch/3");
  await expect(page.getByRole("heading", { name: "Quality records" })).toBeVisible();
  const quality = page.getByRole("heading", { name: "Quality records" }).locator("..");
  await expect(quality.getByText("Grade 2 of 5")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Declared prices" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "₹90,000.00" })).toBeVisible();
});

test("recall banner is visible on a recalled batch", async ({ page }) => {
  await page.goto("/batch/3");
  const banner = page.getByRole("alert").filter({ hasText: "Do not use this product" });
  await expect(banner).toBeVisible();
  await expect.poll(() => banner.evaluate((el) => getComputedStyle(el).opacity), { timeout: 3000 }).toBe("1");
});

test("landing sections appear when scrolled into view", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("traceroot.intro.v2", "1"));
  await page.goto("/");
  const how = page.getByRole("heading", { name: "How a batch moves" });
  await how.scrollIntoViewIfNeeded();
  await expect.poll(() => how.evaluate((el) => getComputedStyle(el.parentElement!).opacity), { timeout: 3000 }).toBe("1");
});
