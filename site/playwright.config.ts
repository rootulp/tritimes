import { defineConfig, devices } from "@playwright/test";

// Runs against the built site served by `wrangler dev` (the same static-asset
// routing, _redirects, and 404 handling as Cloudflare), or against a deployed
// URL via BASE_URL.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:8787",
    headless: true,
    proxy: process.env.BROWSER_PROXY ? { server: process.env.BROWSER_PROXY, bypass: "localhost,127.0.0.1" } : undefined,
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : undefined,
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npx wrangler dev --port 8787 --ip 127.0.0.1",
        url: "http://127.0.0.1:8787/robots.txt",
        reuseExistingServer: true,
        timeout: 60_000,
      },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
