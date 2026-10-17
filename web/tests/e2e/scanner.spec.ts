import { expect, test, type Page, type PlaywrightWorkerArgs } from "@playwright/test";
import path from "path";
import { makeQrVideo } from "./qr-video";

const dir = path.join(__dirname, "..", "..", "e2e-results", "qr");
const video = (name: string, text: string) => makeQrVideo(text, path.join(dir, `${name}.y4m`));
/** Opens a page in a Chromium whose camera plays `file`. Camera permission is granted unless `allow` is false. */
async function withCamera(playwright: PlaywrightWorkerArgs["playwright"], file: string, run: (page: Page) => Promise<void>, allow = true) {
  // The full Chromium build is needed: the default headless shell has no camera support.
  const browser = await playwright.chromium.launch({ channel: "chromium", args: ["--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${file}`] });
  const ctx = await browser.newContext({ baseURL: "http://localhost:3000", reducedMotion: "reduce", permissions: allow ? ["camera"] : [] });
  // Record every camera stream the page opens, so tests can prove each one was stopped.
  await ctx.addInitScript(() => {
    const w = window as unknown as { __streams: MediaStream[] };
    w.__streams = [];
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) return;
    const orig = md.getUserMedia.bind(md);
    md.getUserMedia = async (c) => { const st = await orig(c); w.__streams.push(st); return st; };
  });
  try { await run(await ctx.newPage()); } finally { await browser.close(); }
}

/** Every camera stream the page opened has ended (the light on the device is off). */
async function expectCameraOff(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const st = (window as unknown as { __streams: MediaStream[] }).__streams;
    return st.length > 0 && st.every((x) => x.getTracks().every((t) => t.readyState === "ended"));
  })).toBe(true);
}

test("scanning this site's label: opens the batch and turns the camera off", async ({ playwright }) => {
  await withCamera(playwright, video("own", "http://localhost:3000/batch/3"), async (page) => {
    await page.goto("/explorer", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Scan a QR code" }).click();
    await expect(page).toHaveURL(/\/batch\/3$/, { timeout: 15_000 });
    await expect(page.getByRole("dialog", { name: "Scan a product label" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Arabica coffee beans");
    await expectCameraOff(page);
  });
});

test("scanning a label from another host: asks before opening it here", async ({ playwright }) => {
  await withCamera(playwright, video("foreign", "https://other-traceroot.example/batch/2"), async (page) => {
    await page.goto("/explorer", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Scan a QR code" }).click();
    const dialog = page.getByRole("dialog", { name: "Scan a product label" });
    await expect(dialog.getByText(/links to batch #2 on/)).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole("button", { name: "Open batch #2 here" }).click();
    await expect(page).toHaveURL(/\/batch\/2$/);
  });
});

test("scanning something that isn't a TraceRoot label: stays put and explains", async ({ playwright }) => {
  await withCamera(playwright, video("junk", "https://example.com/login"), async (page) => {
    await page.goto("/explorer", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Scan a QR code" }).click();
    const dialog = page.getByRole("dialog", { name: "Scan a product label" });
    await expect(dialog.getByRole("status")).toContainText("doesn't point to a TraceRoot batch", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/explorer$/);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expectCameraOff(page);
  });
});

test("camera permission denied: falls back to typing the batch number", async ({ playwright }) => {
  await withCamera(playwright, video("own2", "http://localhost:3000/batch/1"), async (page) => {
    await page.goto("/explorer", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Scan a QR code" }).click();
    const dialog = page.getByRole("dialog", { name: "Scan a product label" });
    await expect(dialog.getByRole("alert")).toContainText(/blocked|couldn't start/, { timeout: 15_000 });
    await dialog.getByLabel("Batch number").fill("1");
    await dialog.getByRole("button", { name: "Open", exact: true }).click();
    await expect(page).toHaveURL(/\/batch\/1$/);
  }, false);
});

test("on a phone, the scanner covers the whole screen even when opened from the animated hero", async ({ playwright }) => {
  await withCamera(playwright, video("own3", "http://localhost:3000/batch/1"), async (page) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => sessionStorage.setItem("traceroot.intro.v2", "1"));
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Scan a QR code" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Scan a product label" });
    await expect(dialog).toBeVisible();
    const overlay = await dialog.evaluate((d) => d.parentElement!.getBoundingClientRect().toJSON());
    expect(overlay).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });
    const box = (await dialog.boundingBox())!;
    expect(Math.round(box.y + box.height)).toBe(844); // bottom sheet sits on the bottom edge
  }, false);
});
