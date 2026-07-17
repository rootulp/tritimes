import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  // On CI the server is a freshly-started production process: the first hit to a
  // data-heavy dynamic route pays a one-time ~190MB corpus load, which under
  // parallel load can lose a race with the 5s expect timeout. Retries re-run the
  // failed test on a now-warm process; genuine failures still fail every attempt.
  // Local runs stay strict (0) so real flakes surface.
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    headless: true,
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        port: 3000,
        reuseExistingServer: true,
        timeout: 30_000,
      },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
