import { expect, test } from "@playwright/test";

test.use({ contextOptions: { reducedMotion: "reduce" } });

test("root diagram: selecting a stage shows its description", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Inspector, grade 4 of 5/ }).click();
  await expect(page.getByText(/An inspector records a grade for Lot C/)).toBeVisible();
  await page.getByRole("button", { name: /^Trader, Lot A/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/splits Lot A for two buyers/)).toBeVisible();
});

test("recall demo flags the network and resets", async ({ page }) => {
  await page.goto("/");
  const fig = page.locator("figure");
  await page.getByRole("button", { name: "Recall the source" }).click();
  await expect(fig.getByRole("alert")).toContainText("Do not use this product. It is under recall.");
  await expect(fig.getByRole("alert")).toContainText("Illustrative example: 3 batches and 2 shop deliveries flagged");
  await expect(page.getByRole("button", { name: /^Retailer, Mumbai, under recall/ })).toBeVisible();
  await expect(page.locator("#rt-desc")).toContainText("under recall");
  await page.getByRole("button", { name: "Reset the example" }).click();
  await expect(fig.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Retailer, Mumbai\. Show details/ })).toBeVisible();
});

test("search validates input and checks the batch exists", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const box = page.getByRole("search").first();
  const input = box.getByLabel("Batch number");
  await box.getByRole("button", { name: "Trace" }).click();
  await expect(box.locator("p[role=status]")).toHaveText(/Enter the batch number/);
  await input.fill("abc");
  await input.press("Enter");
  await expect(box.locator("p[role=status]")).toHaveText(/whole numbers/);
  await input.fill("999");
  await input.press("Enter");
  await expect(box.locator("p[role=status]")).toHaveText(/There's no batch #999 yet\. The newest is #\d+\./);
  await input.fill("#3");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/batch\/3$/);
  await expect(page.getByText("Do not use this product. It is under recall.")).toBeVisible();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("menu opens and navigates", async ({ page }) => {
    await page.goto("/");
    const menu = page.getByRole("button", { name: "Menu" });
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("banner").getByRole("link", { name: "Explorer" }).last().click();
    await expect(page).toHaveURL(/\/explorer$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Every batch on TraceRoot");
  });
});

test("keyboard users can skip straight to the main content", async ({ page }) => {
  await page.goto("/explorer");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});
