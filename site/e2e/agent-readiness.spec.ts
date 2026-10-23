import { test, expect } from "@playwright/test";

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
