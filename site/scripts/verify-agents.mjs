// GET final headers AND bodies through curl's configured proxy and CA trust.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
const exec = promisify(execFile);
const base = process.env.DEPLOYMENT_URL ?? process.env.BASE_URL ?? "http://127.0.0.1:8787";
const directory = await mkdtemp(path.join(tmpdir(), "tritimes-agents-"));
let index = 0;
async function get(route, accept) {
  const prefix = path.join(directory, String(index++));
  const { stdout } = await exec("curl", ["--silent", "--show-error", "--location", "--max-time", "30",
    "--header", `Accept: ${accept}`, "--dump-header", `${prefix}.headers`, "--output", `${prefix}.body`,
    "--write-out", "%{http_code}", new URL(route, base).href]);
  const blocks = (await readFile(`${prefix}.headers`, "utf8")).trim().split(/\r?\n\r?\n/);
  const headers = new Headers();
  for (const line of blocks.at(-1).split(/\r?\n/).slice(1)) {
    const colon = line.indexOf(":");
    if (colon > 0) headers.append(line.slice(0, colon), line.slice(colon + 1).trim());
  }
  return { status: Number(stdout), headers, body: await readFile(`${prefix}.body`, "utf8") };
}
try {
  const html = await get("/", "text/html");
  assert.equal(html.status, 200);
  assert.match(html.headers.get("Content-Type") ?? "", /^text\/html\b/);
  assert.match(html.headers.get("Vary") ?? "", /\bAccept\b/i);
  const content = html.body.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const main = content.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? "";
  const text = main.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  assert.ok(text.length >= 500, `Homepage has only ${text.length} meaningful raw HTML characters`);
  const headings = [...main.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  assert.equal(headings.filter((n) => n === 1).length, 1);
  assert.equal(headings[0], 1);
  headings.forEach((level, i) => { if (i) assert.ok(level <= headings[i - 1] + 1, "Skipped heading level"); });
  const schemas = [...html.body.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((m) => { const schema = JSON.parse(m[1]); return Array.isArray(schema) ? schema : schema["@graph"] ?? [schema]; });
  const organization = schemas.find((s) => s["@type"] === "Organization");
  assert.ok(organization, "Missing Organization JSON-LD");
  assert.ok(organization.contactPoint.contactType);
  assert.equal(organization.address, undefined, "Postal address must remain private");

  for (const route of ["/", "/__agent-readiness-nonexistent", "/race/__agent-readiness-nonexistent"]) {
    const markdown = await get(route, "text/markdown");
    assert.equal(markdown.status, route === "/" ? 200 : 404);
    assert.match(markdown.headers.get("Content-Type") ?? "", /^text\/markdown\b/);
    assert.match(markdown.headers.get("Vary") ?? "", /\bAccept\b/i);
    assert.ok(markdown.body.trim().length >= 20);
    assert.match(markdown.body, /^# /);
    assert.match(markdown.body, /\[.*\]\(https:\/\/tritimes.org\/(?:llms.txt|sitemap.xml)\)/);
    if (route !== "/") {
      const error = await get(route, "text/html");
      assert.equal(error.status, 404);
      assert.match(error.headers.get("Content-Type") ?? "", /^text\/html\b/);
    }
  }
  const instructions = await get("/llms.txt", "text/plain");
  assert.equal(instructions.status, 200);
  assert.match(instructions.headers.get("Content-Type") ?? "", /^text\/plain\b/);
  assert.match(instructions.body, /^# TriTimes\n/);
  assert.match(instructions.body, /## When to use this/);
  assert.match(instructions.body, /Accept: text\/markdown/);
  for (const route of ["/robots.txt", "/sitemap.xml"]) {
    const file = await get(route, "*/*");
    assert.equal(file.status, 200);
    assert.match(file.headers.get("Content-Type") ?? "", route.endsWith(".xml") ? /xml/ : /text\/plain/);
    assert.match(file.body, route.endsWith(".xml") ? /<urlset\b/ : /Sitemap:/);
  }
  const links = [...instructions.body.matchAll(/\]\((https:\/\/tritimes.org[^)]+)\)/g)].map((m) => m[1]);
  for (const link of new Set(links)) assert.equal((await get(link, "text/html")).status, 200, link);
  console.log(JSON.stringify({ base, passed: true, homepageTextCharacters: text.length,
    checks: "HTML without JS; sequential headings; homepage Markdown and HTML; Markdown and HTML 404s; llms.txt and its links; robots.txt; sitemap.xml; Organization JSON-LD (postal address intentionally omitted)" }, null, 2));
} finally { await rm(directory, { recursive: true, force: true }); }
