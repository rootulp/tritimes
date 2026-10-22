import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

const pages = [
  { name: "home", url: "/", ready: "#home-heading", full: true },
  { name: "result", url: "/race/im-arizona-2025/result/0", ready: ".finish-time", full: true },
  { name: "athlete", url: "/athlete/rootul-patel--us-m", ready: 'button[aria-label^="Hide "]', full: true },
  { name: "races", url: "/races?distance=140.6&year=2025&q=arizona", ready: "#race-grid > a:visible", full: true },
  { name: "race", url: "/race/im-arizona-2025", ready: "#race-dist-gender", full: false },
  { name: "courses", url: "/courses", ready: 'a[href="/courses/im703-oceanside"]', full: false },
  { name: "course", url: "/courses/im703-swansea", ready: "#race-dist-gender", full: false },
  { name: "stats", url: "/stats", ready: "main h1", full: true },
  { name: "article", url: "/stats/average-ironman-time", ready: "main h1", full: false },
  { name: "faq", url: "/faq", ready: "main h1", full: true },
];

for (const theme of ["light", "dark"] as const) {
  for (const route of pages) {
    test(`${route.name} / ${theme}: rendering, contrast and accessibility`, async ({ page, browser }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      expect((await page.goto(route.url))?.status()).toBe(200);
      await expect(page.locator(route.ready).first()).toBeVisible();
      if (theme === "dark") await page.getByRole("button", { name: "Switch to dark mode" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        background: getComputedStyle(document.body).backgroundColor,
        foreground: getComputedStyle(document.body).color,
      }));
      expect(geometry.document, "Page must not scroll horizontally").toBeLessThanOrEqual(geometry.viewport);
      expect(geometry.background).toBe(theme === "light" ? "rgb(245, 247, 251)" : "rgb(12, 20, 34)");
      const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      await testInfo.attach("accessibility.json", { body: JSON.stringify(audit, null, 2), contentType: "application/json" });
      await mkdir("artifacts/design/screenshots", { recursive: true });
      const screenshot = `artifacts/design/screenshots/${testInfo.project.name}--${route.name}--${theme}.png`;
      await page.screenshot({ path: screenshot, fullPage: route.full, animations: "disabled" });
      await testInfo.attach("rendered-page", { path: screenshot, contentType: "image/png" });
      await testInfo.attach("environment.json", { body: JSON.stringify({ browser: browser.version(), project: testInfo.project.name, viewport: page.viewportSize(), url: page.url(), theme, geometry }, null, 2), contentType: "application/json" });
      expect(audit.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) }))).toEqual([]);
      expect(errors, "Uncaught browser exceptions").toEqual([]);
    });
  }
}

test("light default, keyboard toggle, saved preference and cross-tab synchronization", async ({ page, context }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const toggle = page.getByRole("button", { name: "Switch to dark mode" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("tritimes-theme"))).toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/courses");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.locator("html")).toHaveAttribute("data-theme", "dark");
  await other.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await other.close();
});

test("theme works with blocked storage", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Blocked", "SecurityError"); };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("invalid stored preferences safely default to light", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("tritimes-theme", "invalid"));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("light content and navigation remain available without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your race.");
  await expect(page.locator("#theme-toggle")).toBeHidden();
  await page.getByRole("link", { name: "Browse races" }).click();
  await expect(page.getByRole("heading", { name: "All Races", exact: true })).toBeVisible();
  await context.close();
});

test("result comparison, expandable transitions, and PNG sharing work in both themes", async ({ page }) => {
  await page.goto("/race/im-arizona-2025/result/0");
  await expect(page.locator(".finish-time")).toHaveText("7:28:52");
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await page.getByRole("button", { name: "Overall Field", exact: true }).click();
    await expect(page.locator(".percentile-pill .sr-only").first()).toHaveText(/of overall field$/);
    await page.getByRole("button", { name: "Age Group", exact: true }).click();
    await expect(page.locator(".percentile-pill .sr-only").first()).toHaveText(/of age group$/);
    await page.locator(".transition-details summary").click();
    await expect(page.getByRole("region", { name: "T1 distribution" })).toBeVisible();
    await page.locator(".transition-details summary").click();
    await expect(page.getByRole("region", { name: "T1 distribution" })).toBeHidden();
    await page.getByRole("button", { name: "Share this result" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download image" }).click();
    const file = await download;
    const bytes = Buffer.concat(await (await file.createReadStream()).toArray());
    expect(bytes.subarray(1, 4).toString()).toBe("PNG");
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1200, 630]);
  }
});

test("narrow phones, mobile menu and 200% text zoom do not overflow", async ({ page }) => {
  for (const width of [320, 375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const url of ["/", "/race/im-arizona-2025/result/0"]) {
      await page.goto(url);
      await expect(page.locator(url === "/" ? "#home-heading" : ".finish-time")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(page.locator("#mobile-menu")).toBeVisible();
  await page.locator("#mobile-menu").getByRole("link", { name: "Courses" }).click();
  await expect(page).toHaveURL(/\/courses$/);
  await page.goto("/");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("search-to-athlete journey and race filters work in both themes", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await page.goto("/");
    if (theme === "dark") await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await page.getByPlaceholder("Search athlete name...").fill("Rootul Patel");
    const match = page.getByRole("option", { name: /Rootul Patel/ });
    await expect(match).toBeVisible();
    const searchAudit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(searchAudit.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) }))).toEqual([]);
    await match.click();
    await expect(page).toHaveURL(/\/athlete\/rootul-patel--us-m$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Rootul Patel");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.goto("/races");
    await page.getByRole("button", { name: "140.6", exact: true }).click();
    await page.getByLabel("Year", { exact: true }).selectOption("2024");
    await page.getByPlaceholder("Name or location").fill("wisconsin");
    await expect(page.locator("#race-count")).toHaveText("1");
    await page.locator("#race-grid > a:visible").click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Wisconsin");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  }
});
