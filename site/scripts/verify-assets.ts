/** Gate the complete output against the Workers Free static asset limits. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

export function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

const files = walk("dist");
const sizes = files.map((file) => ({ file, bytes: fs.statSync(file).size }));
const largest = sizes.sort((a, b) => b.bytes - a.bytes)[0];
assert(files.length <= 20_000, `${files.length} assets exceed the Workers Free limit of 20,000`);
assert(largest.bytes <= 25 * 1024 * 1024, `${largest.file} exceeds the 25 MiB per-file limit`);
assert(!files.some((file) => file.endsWith("_worker.js")), "Expected an assets-only deployment");
const published = new Set(files.map((file) => file.replace(/^dist\//, "")));
const links = new Set<string>();
for (const file of files.filter((file) => file.endsWith(".html"))) {
  const html = fs.readFileSync(file, "utf8");
  for (const match of html.matchAll(/\b(?:href|src)="([^"<>]+)"/g)) {
    const url = match[1].replace(/&amp;/g, "&");
    if (url.startsWith("/") && !url.startsWith("//")) links.add(url.split(/[?#]/)[0]);
  }
}
for (const url of links) {
  const file = decodeURIComponent(url).replace(/^\//, "");
  const shell = /^athlete\/[^/]+\/?$/.test(file) || /^race\/[^/]+\/result\/\d+\/?$/.test(file);
  assert(shell || published.has(file) || published.has(`${file}.html`) || published.has(`${file}/index.html`)
    || (file === "" && published.has("index.html")), `Broken internal link: ${url}`);
}
const result = {
  checkedAt: new Date().toISOString(),
  assets: files.length,
  totalBytes: sizes.reduce((sum, file) => sum + file.bytes, 0),
  htmlPages: files.filter((file) => file.endsWith(".html")).length,
  internalUrlsChecked: links.size,
  largest,
  limits: { maxAssets: 20_000, maxFileBytes: 25 * 1024 * 1024 },
};
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync("artifacts/assets.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
