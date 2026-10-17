import { expect, test } from "@playwright/test";

const curtain = (p: import("@playwright/test").Page) => p.getByRole("dialog", { name: "TraceRoot opening animation" });

test("Origin Sequence plays once per session and reveals the landing page", async ({ page }) => {
  await page.goto("/");
  await expect(curtain(page)).toBeVisible();
  await expect(curtain(page)).toBeHidden({ timeout: 6000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Every product has a story\./);
  expect(await page.evaluate(() => document.documentElement.dataset.intro)).toBeUndefined();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe("visible");
  await page.reload();
  await expect(curtain(page)).toHaveCount(0);
});

test("Skip intro button ends it at once", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(curtain(page)).toBeHidden({ timeout: 1500 });
  await expect(page.getByRole("link", { name: "Explore batches" })).toBeVisible();
});

test("Escape skips the intro", async ({ page }) => {
  await page.goto("/");
  await expect(curtain(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(curtain(page)).toBeHidden({ timeout: 1500 });
});

test("No intro when entering on a batch page (QR scan)", async ({ page }) => {
  await page.goto("/batch/1");
  await expect(curtain(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Basmati rice");
});

test.describe("reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("skips the intro and shows the finished landing page", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(800); // long enough for the curtain to have mounted if it were going to
    await expect(curtain(page)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.dataset.intro)).toBeUndefined();
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    const opacity = await page.locator(".enter-word").first().evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe("1");
  });
});
