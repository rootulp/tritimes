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
const result = {
  checkedAt: new Date().toISOString(),
  assets: files.length,
  totalBytes: sizes.reduce((sum, file) => sum + file.bytes, 0),
  htmlPages: files.filter((file) => file.endsWith(".html")).length,
  largest,
  limits: { maxAssets: 20_000, maxFileBytes: 25 * 1024 * 1024 },
};
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync("artifacts/assets.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
