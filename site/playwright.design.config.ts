import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

// Separate from the corpus/parity suite: this records rendered evidence and
// gates the redesign across three engines, both themes, and phone viewports.
export default defineConfig({
  testDir: "./visual",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  outputDir: "./artifacts/design/test-results",
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/design/results.json" }],
    ["html", { outputFolder: "artifacts/design/report", open: "never" }],
  ],
  webServer: base.webServer,
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:8787",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } } },
    { name: "desktop-firefox", use: { browserName: "firefox", viewport: { width: 1440, height: 1000 } } },
    { name: "desktop-webkit", use: { browserName: "webkit", viewport: { width: 1440, height: 1000 } } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
});
