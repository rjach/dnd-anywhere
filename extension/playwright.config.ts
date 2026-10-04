import { defineConfig } from "@playwright/test";

const FIXTURE_PORT = 4321;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${FIXTURE_PORT}`,
    trace: "retain-on-failure",
  },
  // Pixel baselines differ per OS; missing ones are written on first run instead of failing.
  updateSnapshots: "missing",
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
  webServer: {
    command: "node tests/e2e/server.mjs",
    url: `http://127.0.0.1:${FIXTURE_PORT}/plain.html`,
    reuseExistingServer: !process.env.CI,
    env: { FIXTURE_PORT: String(FIXTURE_PORT) },
  },
});
