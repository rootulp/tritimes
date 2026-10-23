import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import worker, { wantsMarkdown, varyAccept } from "../worker/handler.ts";
import { organizationJsonLd } from "../src/lib/organization.ts";

for (const [accept, expected] of [
  ["text/markdown", true], ["text/html", false], ["*/*", false], ["", false],
  ["text/markdown;q=0", false], ["text/markdown;q=0, */*;q=1", false],
  ["text/markdown;q=0.5,text/html", false], ["text/html;q=0.5,TEXT/MARKDOWN", true],
  ["text/markdown;q=garbage", false], ["text/markdown;q=2", false], ["text/markdown ; q=1", true],
  ["text/markdown;q=.5", false], ["text/markdown;q=0.1234", false],
] as const) test(`Accept: ${accept}`, () => assert.equal(wantsMarkdown(accept), expected));

function assets(status = 200, body = "<!doctype html><h1>TriTimes</h1>") {
  return { ASSETS: { fetch: async (request: Request) => new Response(request.method === "HEAD" ? null : body, { status, headers: {
    "Content-Type": "text/html", "Vary": "Origin", "ETag": '"html"',
    "Content-Encoding": "gzip", "Content-Length": "100", "Cache-Control": "public,max-age=300",
  } }) } };
}

for (const method of ["GET", "HEAD"]) {
  for (const [path, status] of [["/", 200], ["/missing", 404], ["/race/no-such-race", 404]] as const) {
    test(`${method} ${path} negotiates Markdown with status ${status}`, async () => {
      const res = await worker.fetch(new Request(`https://tritimes.org${path}`, { method, headers: { Accept: "text/markdown" } }), assets(status));
      assert.equal(res.status, status);
      assert.equal(res.headers.get("Content-Type"), "text/markdown; charset=utf-8");
      assert.equal(res.headers.get("Vary"), "Origin, Accept");
      for (const header of ["ETag", "Content-Encoding", "Content-Length"]) assert.equal(res.headers.get(header), null);
      const body = await res.text();
      if (method === "HEAD") assert.equal(body, "");
      else { assert.ok(body.length > 20); assert.match(body, /\[.*\]\(https:\/\/tritimes.org\/(?:llms.txt|sitemap.xml)\)/); }
    });
    test(`${method} ${path} preserves HTML and status ${status}`, async () => {
      const res = await worker.fetch(new Request(`https://tritimes.org${path}`, { method, headers: { Accept: "text/html" } }), assets(status));
      assert.equal(res.status, status);
      assert.equal(res.headers.get("Content-Type"), "text/html");
      assert.equal(res.headers.get("Vary"), "Origin, Accept");
      if (method === "HEAD") assert.equal(await res.text(), "");
      else assert.match(await res.text(), /<h1>TriTimes<\/h1>/);
    });
  }
}

test("existing pages, shells, data, redirects, errors and non-GET requests pass through", async () => {
  for (const [path, status, method] of [
    ["/races", 200, "GET"], ["/athlete/example", 200, "GET"], ["/race/test/result/0", 200, "GET"],
    ["/data/races.json.gz", 200, "GET"], ["/llms.txt", 200, "GET"], ["/", 301, "GET"],
    ["/", 500, "GET"], ["/missing", 404, "POST"],
  ] as const) {
    const env = assets(status);
    const res = await worker.fetch(new Request(`https://tritimes.org${path}`, { method, headers: { Accept: "text/markdown" } }), env);
    assert.equal(res.status, status);
    assert.equal(res.headers.get("Content-Type"), "text/html");
  }
});

test("Vary is case insensitive, idempotent, and preserves wildcard", () => {
  for (const value of ["Origin, aCcEpT", "*"]) {
    const headers = new Headers({ Vary: value }); varyAccept(headers);
    assert.equal(headers.get("Vary"), value);
  }
});

test("Organization publishes the verified support email and feedback form without a postal address", () => {
  const schema = organizationJsonLd();
  assert.equal(schema["@type"], "Organization");
  assert.equal(schema.contactPoint["@type"], "ContactPoint");
  assert.ok(schema.contactPoint.contactType);
  assert.ok(schema.contactPoint.url.startsWith("https://docs.google.com/forms/"));
  assert.ok(!("address" in schema));
  assert.equal(schema.contactPoint.email, "support@tritimes.org");
  assert.equal(organizationJsonLd("other@tritimes.org").contactPoint.email, "other@tritimes.org");
  assert.throws(() => organizationJsonLd("not an email"));
});

test("llms.txt follows the H1, blockquote, H2 and Markdown link structure", () => {
  const text = fs.readFileSync(new URL("../public/llms.txt", import.meta.url), "utf8");
  assert.match(text, /^# TriTimes\n\n> /);
  assert.match(text, /## When to use this/);
  assert.match(text, /GET https:\/\/tritimes.org\/.*Accept: text\/markdown/);
  assert.match(text, /require a JavaScript-capable browser/);
  assert.match(text, /\[Sitemap\]\(https:\/\/tritimes.org\/sitemap.xml\)/);
});

test("Markdown requests do not reuse HTML conditional validators or byte ranges", async () => {
  const res = await worker.fetch(new Request("https://tritimes.org/", { headers: {
    Accept: "text/markdown", "If-None-Match": '"html"', "If-Modified-Since": "Wed, 21 Oct 2026 07:28:00 GMT",
    Range: "bytes=0-10", "If-Range": '"html"',
  } }), { ASSETS: { fetch: async (request) => {
    for (const name of ["If-None-Match", "If-Modified-Since", "Range", "If-Range"]) assert.equal(request.headers.get(name), null);
    return new Response("HTML", { headers: { "Content-Type": "text/html" } });
  } } });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /^# TriTimes/);
});

test("a missing asset gets the designed HTML error page with a true 404", async () => {
  const requests: string[] = [];
  const response = await worker.fetch(new Request("https://tritimes.org/missing", { headers: { Accept: "text/html" } }), {
    ASSETS: { fetch: async (request) => {
      const path = new URL(request.url).pathname;
      requests.push(path);
      return path === "/404" ? new Response("<h1>Page not found</h1>", { headers: { "Content-Type": "text/html" } }) : new Response(null, { status: 404 });
    } },
  });
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("Content-Type"), "text/html");
  assert.equal(response.headers.get("Vary"), "Accept");
  assert.match(await response.text(), /<h1>Page not found<\/h1>/);
  assert.deepEqual(requests, ["/missing", "/404"]);
});
