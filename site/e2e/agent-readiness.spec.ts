import { test, expect } from "@playwright/test";
import { SITE_URL, FEEDBACK_URL, SITE_DESCRIPTION } from "../src/lib/site";

for (const [route, title] of [["/about", "About TriTimes"], ["/contact", "Contact TriTimes"], ["/privacy", "TriTimes Privacy"]]) {
  test(`${route} is a substantive, linked trust page without JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page).toHaveTitle(`${title} | TriTimes`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    expect((await page.locator("main").innerText()).length).toBeGreaterThanOrEqual(500);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE_URL}${route}`);
    for (const [label, href] of [["About", "/about"], ["Contact", "/contact"], ["Privacy", "/privacy"]]) {
      await expect(page.getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: label, exact: true })).toHaveAttribute("href", href);
    }
    const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').first().innerText());
    const organization = schema.find((item: { "@type": string }) => item["@type"] === "Organization");
    expect(organization.description).toBe(SITE_DESCRIPTION);
    expect(organization.url).toBe(SITE_URL);
    expect(organization).not.toHaveProperty("address");
    expect(organization.contactPoint).not.toHaveProperty("telephone");
    expect(organization.contactPoint).toMatchObject({ "@type": "ContactPoint", contactType: "customer support", url: FEEDBACK_URL });
    if (route === "/contact") await expect(page.getByRole("link", { name: "TriTimes feedback form", exact: true })).toHaveAttribute("href", FEEDBACK_URL);
    // Footer links must wrap at mobile widths rather than overflow.
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  });
}

test("homepage connects the brand to triathlon results and its publisher", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/TriTimes.*Triathlon Results/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("TriTimes triathlon results");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE_URL}/`);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", `${SITE_URL}/`);
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').first().innerText());
  const website = schema.find((item: { "@type": string }) => item["@type"] === "WebSite");
  const organization = schema.find((item: { "@type": string }) => item["@type"] === "Organization");
  expect(website.url).toBe(SITE_URL);
  expect(website.publisher["@id"]).toBe(organization["@id"]);
});

test("robots and XML sitemap advertise canonical trust URLs", async ({ request, page }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(robots.headers()["content-type"]).toContain("text/plain");
  expect(await robots.text()).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  // Preserve the existing distinction between inference and training crawlers.
  expect(await robots.text()).toContain("User-Agent: *\nAllow: /");
  expect(await robots.text()).toContain("User-Agent: GPTBot\nDisallow: /");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("xml");
  const xml = await sitemap.text();
  const locations = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("Invalid XML sitemap");
    if (doc.documentElement.namespaceURI !== "http://www.sitemaps.org/schemas/sitemap/0.9") throw new Error("Wrong sitemap namespace");
    return Array.from(doc.querySelectorAll("loc"), (node) => node.textContent);
  }, xml);
  for (const route of ["/", "/about", "/contact", "/privacy", "/faq"]) expect(locations).toContain(`${SITE_URL}${route}`);
  expect(locations.every((loc) => loc?.startsWith(`${SITE_URL}/`))).toBe(true);
});

test("result and athlete metadata use the canonical production hostname", async ({ page }) => {
  for (const [route, name] of [["/athlete/rootul-patel--us-m", /Rootul Patel/], ["/race/im-arizona-2025/result/0", /Menno Koolhaas/]] as const) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE_URL}${route}`);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", `${SITE_URL}${route}`);
  }
});


test("race structured data identifies its canonical URL", async ({ page }) => {
  await page.goto("/race/im-arizona-2025");
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').first().innerText());
  const race = schema.find((item: { "@type": string }) => item["@type"] === "SportsEvent");
  expect(race.url).toBe(`${SITE_URL}/race/im-arizona-2025`);
});


test("homepage content and heading hierarchy remain available without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    expect((await page.goto("/"))?.status()).toBe(200);
    const main = page.locator("main");
    expect((await main.innerText()).replace(/\s+/g, " ").trim().length).toBeGreaterThanOrEqual(500);
    await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1);
    const levels = await main.locator("h1,h2,h3,h4,h5,h6").evaluateAll((headings) => headings.map((h) => Number(h.tagName[1])));
    expect(levels[0]).toBe(1);
    levels.forEach((level, i) => { if (i) expect(level).toBeLessThanOrEqual(levels[i - 1] + 1); });
    await expect(page.getByRole("link", { name: /Browse races/ })).toBeVisible();
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const organization = schemas.flatMap((text) => JSON.parse(text)).find((s) => s["@type"] === "Organization");
    expect(organization.contactPoint.contactType).toBe("customer support");
    expect(organization.address).toBeUndefined();
  } finally { await context.close(); }
});

for (const route of ["/", "/__agent-readiness-missing", "/race/__agent-readiness-missing"]) {
  test(`content negotiation preserves status and both representations: ${route}`, async ({ request }) => {
    for (const accept of ["text/markdown", "text/html"]) {
      const response = await request.get(route, { headers: { Accept: accept } });
      expect(response.status()).toBe(route === "/" ? 200 : 404);
      expect(response.headers()["content-type"]).toContain(accept);
      expect(response.headers()["vary"].toLowerCase().split(",").map((v) => v.trim())).toContain("accept");
      const body = await response.text();
      if (accept === "text/markdown") {
        expect(body.length).toBeGreaterThan(20);
        expect(body).toMatch(/^# /);
        expect(body).toMatch(/\[.*\]\(https:\/\/tritimes.org\/(?:llms.txt|sitemap.xml)\)/);
      } else expect(body).toMatch(/<!doctype html>/i);
    }
    const head = await request.head(route, { headers: { Accept: "text/markdown" } });
    expect(head.status()).toBe(route === "/" ? 200 : 404);
    expect(head.headers()["content-type"]).toContain("text/markdown");
    expect(await head.body()).toHaveLength(0);
  });
}

test("llms.txt serves actionable guidance and all linked pages resolve", async ({ request }) => {
  const response = await request.get("/llms.txt");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  const body = await response.text();
  expect(body).toMatch(/^# TriTimes\n\n> /);
  expect(body).toContain("## When to use this");
  expect(body).toContain("Accept: text/markdown");
  for (const match of body.matchAll(/\]\(https:\/\/tritimes.org([^)]*)\)/g)) {
    expect((await request.get(match[1] || "/")).status()).toBe(200);
  }
});
