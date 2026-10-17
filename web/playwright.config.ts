import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build on :3000 and a seeded local chain on :8545.
 * See tests/e2e/README.md for the one-time setup.
 */
export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "e2e-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000", trace: "off" },
  webServer: { command: "npm run start", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
