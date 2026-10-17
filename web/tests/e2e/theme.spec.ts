import { expect, test } from "@playwright/test";

test.use({ contextOptions: { reducedMotion: "reduce" } });
const isDark = (p: import("@playwright/test").Page) => p.evaluate(() => document.documentElement.classList.contains("dark"));

test("follows the device setting by default", async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: "dark", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/explorer");
  expect(await isDark(page)).toBe(true);
  await ctx.close();
});

test("toggle cycles device → light → dark and the choice survives a reload", async ({ page }) => {
  await page.goto("/explorer", { waitUntil: "networkidle" });
  const toggle = page.getByRole("button", { name: /^Theme:/ });
  await expect(toggle).toHaveAttribute("title", "Theme: matches your device");
  await toggle.click();
  await expect(toggle).toHaveAttribute("title", "Theme: light");
  expect(await isDark(page)).toBe(false);
  await toggle.click();
  await expect(toggle).toHaveAttribute("title", "Theme: dark");
  expect(await isDark(page)).toBe(true);
  await page.reload();
  expect(await isDark(page)).toBe(true);
  await expect(page.getByRole("button", { name: /^Theme:/ })).toHaveAttribute("title", "Theme: dark");
});

test("no flash: the saved theme is applied before any app JavaScript runs", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("traceroot.theme", "dark"));
  await page.route("**/_next/static/chunks/**", (r) => r.abort()); // React never loads
  await page.goto("/batch/1");
  expect(await isDark(page)).toBe(true);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(11, 21, 16)");
});
