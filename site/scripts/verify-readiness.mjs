// Verify every published file through the static runtime, including decoded
// machine-readable files and JSON-LD. Run after build with READINESS_URL set.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const base = new URL(process.env.READINESS_URL || "http://127.0.0.1:8787");
assert(base.protocol === "https:" || ["localhost", "127.0.0.1"].includes(base.hostname), "Use HTTPS except for local verification");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
const files = walk("dist").filter((file) => !["_headers", "_redirects"].includes(path.basename(file)) && file !== "dist/404.html");
let next = 0;
let checked = 0;
let jsonLdEntities = 0;
let gzipFiles = 0;
const startedAt = new Date().toISOString();
await Promise.all(Array.from({ length: 8 }, async () => {
  while (next < files.length) {
    const file = files[next++];
    const relative = file.slice(5);
    const route = "/" + (relative === "index.html" ? "" : relative.replace(/\.html$/, ""));
    const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, route);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.deepEqual(bytes, fs.readFileSync(file), `${route}: served bytes differ from the build`);
    const type = response.headers.get("content-type") || "";
    if (file.endsWith(".html")) {
      assert.match(type, /text\/html/, route);
      const html = bytes.toString();
      const entities = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
        .flatMap((match) => JSON.parse(match[1]));
      const organization = entities.filter((entity) => entity["@type"] === "Organization");
      assert.equal(organization.length, 1, `${route}: one Organization per page`);
      assert(organization[0].description.length > 50, `${route}: Organization description`);
      assert.equal(organization[0].url, "https://www.tritimes.org", `${route}: canonical organization URL`);
      jsonLdEntities += entities.length;
    } else if (file.endsWith(".gz")) {
      assert.match(type, /application\/gzip/, route);
      const decoded = gunzipSync(bytes).toString();
      if (file.endsWith(".json.gz")) JSON.parse(decoded);
      else if (file.endsWith(".tsv.gz")) {
        for (const line of decoded.trimEnd().split("\n")) assert(!line || line.includes("\t"), `${route}: invalid TSV row`);
      }
      gzipFiles++;
    } else if (file.endsWith(".json")) JSON.parse(bytes.toString());
    else if (file.endsWith(".xml")) assert.match(type, /xml/, route);
    else if (file.endsWith(".txt")) assert.match(type, /text\/plain/, route);
    if (++checked % 2000 === 0) console.log(`Verified ${checked}/${files.length} endpoints`);
  }
}));
for (const route of ["/athlete/rootul-patel--us-m", "/race/im-arizona-2025/result/0"]) {
  const response = await fetch(new URL(route, base));
  assert.equal(response.status, 200, route);
  assert.match(response.headers.get("content-type") || "", /text\/html/, route);
}
for (const route of ["/no-such-page", "/race/no-such-race", "/courses/no-such-course"]) {
  assert.equal((await fetch(new URL(route, base))).status, 404, route);
}
const summary = { base: base.href, startedAt, finishedAt: new Date().toISOString(), endpoints: checked + 5, gzipFiles, jsonLdEntities, allPassed: true };
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync("artifacts/agent-readiness.json", JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
